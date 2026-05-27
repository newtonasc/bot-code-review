/**
 * Cliente Bitbucket para interação com PRs e Reviews
 * Usa a API REST do Bitbucket Cloud v2.0
 * Suporta dois métodos de autenticação:
 * - Bearer Token: Repository Access Tokens
 * - Basic Auth: Atlassian API Tokens (ATATT*) com username
 */

import axios from 'axios';

export default class BitbucketClient {
  constructor(token, workspace, repoSlug, username = null) {
    this.token = token;
    this.workspace = workspace;
    this.repoSlug = repoSlug;
    this.username = username;
    this.baseUrl = 'https://api.bitbucket.org/2.0';

    // Detecta o tipo de autenticação baseado no token
    // Tokens Atlassian (ATATT*) requerem Basic Auth
    const isAtlassianToken = token && token.startsWith('ATATT');

    console.log(`🔍 Token type: ${isAtlassianToken ? 'Atlassian API Token (Basic Auth)' : 'Repository Access Token (Bearer)'}`);
    console.log(`🔍 Username: ${username || 'não fornecido'}`);

    if (isAtlassianToken && username) {
      // Basic Authentication para tokens Atlassian
      this.auth = {
        username: this.username,
        password: this.token,
      };
      this.headers = {
        'Accept': 'application/json',
      };
      console.log(`✅ Usando Basic Auth com username: ${username}`);
    } else {
      // Bearer Token para Repository Access Tokens
      this.auth = null;
      this.headers = {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      };
      console.log(`✅ Usando Bearer Token`);
    }
  }

  /**
   * Cria configuração axios com auth apropriada
   * @param {Object} extraConfig - Configurações adicionais
   * @returns {Object} Configuração completa para axios
   */
  _getAxiosConfig(extraConfig = {}) {
    const config = {
      headers: this.headers,
      ...extraConfig,
    };

    if (this.auth) {
      config.auth = this.auth;
    }

    return config;
  }

  /**
   * Busca informações de uma Pull Request
   * @param {number} prNumber - Número da PR
   * @returns {Object} Dados da PR
   */
  async getPullRequest(prNumber) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prNumber}`,
        this._getAxiosConfig()
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        console.error(`\n❌ Erro 403 (Forbidden) ao acessar PR #${prNumber}`);
        console.error(`\n💡 O token não tem permissões suficientes. Verifique:`);
        console.error(`   1. Acesse: https://id.atlassian.com/manage-profile/security/api-tokens`);
        console.error(`   2. Revogue o token atual e crie um novo`);
        console.error(`   3. Ao criar, certifique-se de conceder acesso ao workspace: ${this.workspace}`);
        console.error(`   4. Permissões necessárias:`);
        console.error(`      - Pull requests: Read e Write`);
        console.error(`      - Repositories: Read`);
        console.error(`\n🔐 Ou tente gerar um HTTP Access Token em:`);
        console.error(`   https://bitbucket.org/account/settings/access-tokens/\n`);
      }
      throw new Error(`Erro ao buscar PR #${prNumber}: ${error.message}`);
    }
  }

  /**
   * Busca arquivos modificados em uma PR (diffstat)
   * @param {number} prNumber - Número da PR
   * @returns {Array} Lista de arquivos modificados
   */
  async getPullRequestFiles(prNumber) {
    try {
      // Primeiro busca a PR para pegar os commits
      const pr = await this.getPullRequest(prNumber);

      // Tenta buscar commits da PR
      console.log(`🔍 Buscando commits da PR...`);
      let commits = [];
      try {
        const commitsResponse = await axios.get(
          `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prNumber}/commits`,
          this._getAxiosConfig()
        );
        commits = commitsResponse.data.values || [];
        console.log(`✅ ${commits.length} commit(s) encontrado(s)`);
      } catch (commitsError) {
        console.warn(`⚠️  Não foi possível buscar commits: ${commitsError.message}`);
      }

      // Busca diffstat (estatísticas dos arquivos modificados)
      let diffstat = [];
      console.log(`🔍 Buscando diffstat...`);
      try {
        const response = await axios.get(
          `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prNumber}/diffstat`,
          this._getAxiosConfig()
        );
        diffstat = response.data.values || [];
        console.log(`✅ ${diffstat.length} arquivo(s) modificado(s) no diffstat`);
      } catch (diffError) {
        console.warn(`⚠️  Endpoint /diffstat não disponível: ${diffError.response?.status} ${diffError.message}`);

        // Se diffstat não funcionar, tenta buscar cada commit
        if (commits.length > 0) {
          console.log(`🔍 Tentando buscar diff de cada commit...`);
          const allFiles = new Map();

          for (const commit of commits.slice(0, 10)) { // Limita a 10 commits
            try {
              const commitDiffResponse = await axios.get(
                `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/diffstat/${commit.hash}`,
                this._getAxiosConfig()
              );

              const commitFiles = commitDiffResponse.data.values || [];
              commitFiles.forEach(file => {
                const path = file.new?.path || file.old?.path;
                if (!allFiles.has(path)) {
                  allFiles.set(path, file);
                }
              });
            } catch (commitDiffError) {
              console.warn(`⚠️  Erro ao buscar diff do commit ${commit.hash.substring(0, 7)}`);
            }
          }

          diffstat = Array.from(allFiles.values());
          console.log(`✅ ${diffstat.length} arquivo(s) únicos encontrados nos commits`);
        } else {
          console.warn(`❌ Não foi possível obter lista de arquivos modificados`);
          return [];
        }
      }

      if (diffstat.length === 0) {
        console.warn(`⚠️  Nenhum arquivo modificado encontrado na PR #${prNumber}`);
        return [];
      }

      // Busca conteúdo de cada arquivo
      console.log(`🔍 Buscando conteúdo dos arquivos...`);
      const filesWithContent = await Promise.all(
        diffstat.map(async (file) => {
          try {
            const filePath = file.new?.path || file.old?.path;
            const commitHash = pr.source.commit.hash; // Usa commit source da PR

            let content = null;
            try {
              content = await this.getFileContent(filePath, commitHash);
            } catch (contentError) {
              console.warn(`⚠️  Conteúdo não disponível para: ${filePath}`);
            }

            return {
              filename: filePath,
              status: file.status,
              additions: file.lines_added || 0,
              deletions: file.lines_removed || 0,
              changes: (file.lines_added || 0) + (file.lines_removed || 0),
              sha: commitHash,
              patch: null,
              content,
            };
          } catch (err) {
            console.warn(`⚠️  Erro ao processar arquivo ${file.new?.path || file.old?.path}: ${err.message}`);
            return null;
          }
        })
      );

      const validFiles = filesWithContent.filter(f => f !== null);
      console.log(`✅ ${validFiles.length} arquivo(s) processado(s) com sucesso`);

      return validFiles;
    } catch (error) {
      console.error(`❌ Erro detalhado: ${error.response?.data?.error?.message || error.message}`);
      console.error(`   Status: ${error.response?.status}`);
      throw new Error(`Erro ao buscar arquivos da PR #${prNumber}: ${error.message}`);
    }
  }

  /**
   * Busca conteúdo de um arquivo específico
   * @param {string} path - Caminho do arquivo
   * @param {string} commitHash - Hash do commit
   * @returns {string} Conteúdo do arquivo
   */
  async getFileContent(path, commitHash) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/src/${commitHash}/${path}`,
        this._getAxiosConfig({ responseType: 'text' })
      );

      return response.data;
    } catch (error) {
      throw new Error(`Erro ao buscar conteúdo do arquivo ${path}: ${error.message}`);
    }
  }

  /**
   * Busca informações de uma Issue do Jira (via PR)
   * Bitbucket integra com Jira, extrai da PR
   * @param {number} issueNumber - Número da issue
   * @returns {Object} Dados da issue
   */
  async getIssue(issueNumber) {
    // Bitbucket não tem issues próprias, usa Jira
    // Retorna null, deixando para o JiraClient buscar
    console.log(`ℹ️  Bitbucket usa Jira para issues. Use JiraClient para buscar detalhes da issue.`);
    return null;
  }

  /**
   * Extrai número da issue do título ou descrição da PR
   * @param {Object} pr - Dados da PR
   * @returns {number|null} Número da issue ou null
   */
  extractIssueNumber(pr) {
    // No Bitbucket com Jira, buscamos chave do Jira ao invés de número
    const patterns = [
      /#(\d+)/,
      /issue[:\s]+(\d+)/i,
      /closes[:\s]+#?(\d+)/i,
      /fixes[:\s]+#?(\d+)/i,
    ];

    const text = `${pr.title} ${pr.description || ''}`;

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }

    return null;
  }

  /**
   * Cria um comentário em uma PR
   * @param {number} prNumber - Número da PR
   * @param {string} content - Conteúdo do comentário
   * @returns {Object} Dados do comentário criado
   */
  async addComment(prNumber, content) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prNumber}/comments`,
        { content: { raw: content } },
        this._getAxiosConfig()
      );

      return response.data;
    } catch (error) {
      throw new Error(`Erro ao adicionar comentário na PR #${prNumber}: ${error.message}`);
    }
  }

  /**
   * Adiciona comentário inline em arquivo específico
   * @param {number} prNumber - Número da PR
   * @param {string} path - Caminho do arquivo
   * @param {number} line - Linha do comentário
   * @param {string} content - Conteúdo do comentário
   * @returns {Object} Dados do comentário criado
   */
  async addInlineComment(prNumber, path, line, content) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prNumber}/comments`,
        {
          content: { raw: content },
          inline: {
            path,
            to: line,
          },
        },
        this._getAxiosConfig()
      );

      return response.data;
    } catch (error) {
      throw new Error(`Erro ao adicionar comentário inline: ${error.message}`);
    }
  }

  /**
   * Aprova uma Pull Request
   * @param {number} prNumber - Número da PR
   * @returns {Object} Dados da aprovação
   */
  async approvePullRequest(prNumber) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prNumber}/approve`,
        {},
        this._getAxiosConfig()
      );

      return response.data;
    } catch (error) {
      throw new Error(`Erro ao aprovar PR #${prNumber}: ${error.message}`);
    }
  }

  /**
   * Remove aprovação de uma Pull Request
   * @param {number} prNumber - Número da PR
   * @returns {void}
   */
  async unapprovePullRequest(prNumber) {
    try {
      await axios.delete(
        `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prNumber}/approve`,
        this._getAxiosConfig()
      );
    } catch (error) {
      throw new Error(`Erro ao remover aprovação da PR #${prNumber}: ${error.message}`);
    }
  }

  /**
   * Solicita mudanças em uma PR (via comentário)
   * Bitbucket não tem "Request Changes" formal como GitHub
   * @param {number} prNumber - Número da PR
   * @param {string} body - Corpo da solicitação
   * @returns {Object} Dados do comentário
   */
  async requestChanges(prNumber, body) {
    try {
      // Adiciona comentário solicitando mudanças
      const comment = await this.addComment(prNumber, body);

      // Remove aprovação se existir
      try {
        await this.unapprovePullRequest(prNumber);
      } catch (err) {
        // Ignora erro se não havia aprovação
      }

      return comment;
    } catch (error) {
      throw new Error(`Erro ao solicitar mudanças na PR #${prNumber}: ${error.message}`);
    }
  }

  /**
   * Lista comentários de uma PR
   * @param {number} prNumber - Número da PR
   * @returns {Array} Lista de comentários
   */
  async listComments(prNumber) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prNumber}/comments`,
        this._getAxiosConfig()
      );

      return response.data.values || [];
    } catch (error) {
      throw new Error(`Erro ao listar comentários da PR #${prNumber}: ${error.message}`);
    }
  }

  /**
   * Valida credenciais e acesso ao repositório
   * @returns {boolean} true se válido
   */
  async validateAccess() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}`,
        this._getAxiosConfig()
      );
      console.log(`✅ Acesso validado com sucesso!`);
      return true;
    } catch (error) {
      console.error(`\n❌ Erro detalhado ao validar acesso:`);
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Message: ${error.response?.data?.error?.message || error.message}`);
      console.error(`   URL: ${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}`);

      if (error.response?.status === 401) {
        console.error(`\n💡 Dica: Erro 401 (Unauthorized) pode significar:`);
        console.error(`   - Token inválido ou expirado`);
        console.error(`   - Username incorreto (certifique-se de usar o email completo)`);
        console.error(`   - Token sem permissões necessárias`);
        console.error(`\n🔐 Para Atlassian API Token, verifique:`);
        console.error(`   1. Token foi gerado em: https://id.atlassian.com/manage-profile/security/api-tokens`);
        console.error(`   2. BITBUCKET_USERNAME está configurado com seu email completo`);
        console.error(`   3. Seu usuário tem acesso ao repositório: ${this.workspace}/${this.repoSlug}\n`);
      }

      throw new Error(`Erro ao validar acesso ao repositório: ${error.message}`);
    }
  }

  /**
   * Busca informações do usuário autenticado
   * @returns {Object} Dados do usuário
   */
  async getAuthenticatedUser() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/user`,
        this._getAxiosConfig()
      );
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao buscar usuário autenticado: ${error.message}`);
    }
  }

  /**
   * Cria um "review" completo na PR
   * Bitbucket não tem conceito de Review como GitHub
   * Esta função cria comentários e aprova/solicita mudanças
   * @param {number} prNumber - Número da PR
   * @param {string} action - Ação: APPROVE, REQUEST_CHANGES, COMMENT
   * @param {string} body - Corpo do review
   * @param {Array} comments - Comentários inline
   * @returns {Object} Resultado da operação
   */
  async createReview(prNumber, action, body, comments = []) {
    try {
      const result = {
        action,
        mainComment: null,
        inlineComments: [],
        approval: null,
      };

      // Adiciona comentário principal
      if (body) {
        result.mainComment = await this.addComment(prNumber, body);
      }

      // Adiciona comentários inline
      for (const comment of comments) {
        try {
          const inlineComment = await this.addInlineComment(
            prNumber,
            comment.path,
            comment.line,
            comment.body
          );
          result.inlineComments.push(inlineComment);
        } catch (err) {
          console.warn(`Erro ao adicionar comentário inline: ${err.message}`);
        }
      }

      // Executa ação apropriada
      if (action === 'APPROVE') {
        result.approval = await this.approvePullRequest(prNumber);
      } else if (action === 'REQUEST_CHANGES') {
        await this.requestChanges(prNumber, body || 'Mudanças solicitadas');
      }

      return result;
    } catch (error) {
      throw new Error(`Erro ao criar review na PR #${prNumber}: ${error.message}`);
    }
  }
}
