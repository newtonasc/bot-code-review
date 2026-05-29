/**
 * Cliente Bitbucket para interação com PRs e Reviews
 * Usa a API REST do Bitbucket Cloud v2.0
 * Suporta dois métodos de autenticação:
 * - Bearer Token: Repository Access Tokens
 * - Basic Auth: Atlassian API Tokens (ATATT*) com username
 */

import axios from 'axios';
import { createPatch } from 'diff';

export default class BitbucketClient {
  constructor(token, workspace, repoSlug, username = null) {
    this.token = token;
    this.workspace = workspace;
    this.repoSlug = repoSlug;
    this.username = username;
    this.baseUrl = 'https://api.bitbucket.org/2.0';

    // Cache para endpoints que não funcionam (evita tentativas repetidas)
    this.unavailableEndpoints = new Set();

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

      const sourceHash = pr.source?.commit?.hash;
      const destHash = pr.destination?.commit?.hash;

      // Busca diffstat comparando commits source e destination da PR
      let diffstat = [];
      const method1Key = 'diffstat-compare';

      // Método 1: Comparação de commits
      if (sourceHash && destHash && !this.unavailableEndpoints.has(method1Key)) {
        console.log(`🔍 Método 1: Comparação de commits (${destHash.substring(0, 7)}...${sourceHash.substring(0, 7)})...`);
        try {
          const allFiles = new Map();
          let nextUrl = `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/diffstat/${destHash}...${sourceHash}`;

          while (nextUrl) {
            const response = await axios.get(nextUrl, this._getAxiosConfig());
            const values = response.data.values || [];
            values.forEach(file => {
              const path = file.new?.path || file.old?.path;
              if (path && !allFiles.has(path)) {
                allFiles.set(path, file);
              }
            });
            nextUrl = response.data.next || null;
          }

          diffstat = Array.from(allFiles.values());
          console.log(`✅ Método 1 bem-sucedido: ${diffstat.length} arquivo(s) encontrado(s)`);
        } catch (diffError) {
          if (diffError.response?.status === 404) {
            this.unavailableEndpoints.add(method1Key);
            console.log(`ℹ️  Método 1 não disponível neste repositório (será ignorado nas próximas execuções)`);
          } else {
            console.log(`ℹ️  Método 1 falhou (${diffError.response?.status}), tentando próximo método...`);
          }
        }
      } else if (this.unavailableEndpoints.has(method1Key)) {
        console.log(`⏭️  Método 1 pulado (não disponível neste repositório)`);
      }

      // Método 2: Endpoint direto da PR
      const method2Key = 'pr-diffstat';
      if (diffstat.length === 0 && !this.unavailableEndpoints.has(method2Key)) {
        console.log(`🔍 Método 2: Endpoint direto da PR #${prNumber}...`);
        try {
          const allFiles = new Map();
          let nextUrl = `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prNumber}/diffstat`;

          while (nextUrl) {
            const response = await axios.get(nextUrl, this._getAxiosConfig());
            const values = response.data.values || [];
            values.forEach(file => {
              const path = file.new?.path || file.old?.path;
              if (path && !allFiles.has(path)) {
                allFiles.set(path, file);
              }
            });
            nextUrl = response.data.next || null;
          }

          diffstat = Array.from(allFiles.values());
          console.log(`✅ Método 2 bem-sucedido: ${diffstat.length} arquivo(s) encontrado(s)`);
        } catch (prDiffError) {
          if (prDiffError.response?.status === 404) {
            this.unavailableEndpoints.add(method2Key);
            console.log(`ℹ️  Método 2 não disponível neste repositório (será ignorado nas próximas execuções)`);
          } else {
            console.log(`ℹ️  Método 2 falhou (${prDiffError.response?.status}), tentando próximo método...`);
          }
        }
      } else if (diffstat.length === 0 && this.unavailableEndpoints.has(method2Key)) {
        console.log(`⏭️  Método 2 pulado (não disponível neste repositório)`);
      }

      // Último fallback: busca commits e diffstat por commit
      if (diffstat.length === 0) {
        console.log(`🔍 Método 3: Buscando arquivos através dos commits da PR...`);
        try {
          const commitsResponse = await axios.get(
            `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prNumber}/commits`,
            this._getAxiosConfig()
          );
          const commits = commitsResponse.data.values || [];
          console.log(`   ${commits.length} commit(s) encontrado(s) na PR`);

          const allFiles = new Map();
          for (const commit of commits.slice(0, 10)) {
            try {
              const commitDiffResponse = await axios.get(
                `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/diffstat/${commit.hash}`,
                this._getAxiosConfig()
              );
              const commitFiles = commitDiffResponse.data.values || [];
              commitFiles.forEach(file => {
                const path = file.new?.path || file.old?.path;
                if (path && !allFiles.has(path)) {
                  allFiles.set(path, file);
                }
              });
            } catch (commitDiffError) {
              // Silenciosamente ignora erros de commits individuais
            }
          }

          diffstat = Array.from(allFiles.values());
          console.log(`✅ Método 3 bem-sucedido: ${diffstat.length} arquivo(s) únicos encontrados`);
        } catch (commitsError) {
          console.log(`ℹ️  Método 3 não disponível: ${commitsError.message}`);
        }
      }

      if (diffstat.length === 0) {
        console.warn(`⚠️  Nenhum arquivo modificado encontrado na PR #${prNumber}`);
        return [];
      }

      // Busca diff unificado para popular o patch de cada arquivo
      console.log(`🔍 Buscando diff unificado da PR...`);
      const patchMap = await this._fetchPatchMap(destHash, sourceHash, prNumber);
      const apiPatchAvailable = Object.keys(patchMap).length > 0;

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

            // Determina o patch: API > gerado localmente via diff de conteúdo
            let patch = patchMap[filePath] || null;
            if (!patch && content !== null) {
              patch = await this._generateFilePatch(filePath, file.status, content, destHash);
            }

            return {
              filename: filePath,
              status: file.status,
              additions: file.lines_added || 0,
              deletions: file.lines_removed || 0,
              changes: (file.lines_added || 0) + (file.lines_removed || 0),
              sha: commitHash,
              patch,
              content,
            };
          } catch (err) {
            console.warn(`⚠️  Erro ao processar arquivo ${file.new?.path || file.old?.path}: ${err.message}`);
            return null;
          }
        })
      );

      if (!apiPatchAvailable) {
        const withPatch = filesWithContent.filter(f => f?.patch).length;
        console.log(`✅ Patch gerado localmente para ${withPatch} arquivo(s)`);
      }

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
   * Busca o diff unificado da PR e retorna um mapa filePath -> patch.
   * Tenta primeiro a comparação de commits (três pontos) e cai para
   * o endpoint /pullrequests/{id}/diff como fallback.
   */
  async _fetchPatchMap(destHash, sourceHash, prNumber) {
    const tryFetch = async (url) => {
      const response = await axios.get(url, this._getAxiosConfig({ responseType: 'text' }));
      return response.data;
    };

    let diffText = null;
    try {
      diffText = await tryFetch(
        `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/diff/${destHash}...${sourceHash}`
      );
    } catch {
      try {
        diffText = await tryFetch(
          `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prNumber}/diff`
        );
      } catch (err) {
        console.warn(`⚠️  Diff não disponível, análise usará arquivo completo: ${err.message}`);
        return {};
      }
    }

    return this._parseDiffByFile(diffText);
  }

  /**
   * Gera um patch unificado para um arquivo comparando versão base (destHash)
   * com a versão da PR (sourceHash). Usado quando os endpoints de diff retornam 404.
   */
  async _generateFilePatch(filePath, status, newContent, destHash) {
    let oldContent = '';
    if (status !== 'added') {
      try {
        oldContent = await this.getFileContent(filePath, destHash);
      } catch {
        // Arquivo não existe na base — trata como novo
      }
    }
    return createPatch(filePath, oldContent, newContent, destHash, 'HEAD');
  }

  /**
   * Divide o texto de um diff unificado em um mapa filePath -> patchString.
   */
  _parseDiffByFile(diffText) {
    const patchMap = {};
    if (!diffText) return patchMap;

    const blocks = diffText.split(/^diff --git /m).filter(Boolean);
    for (const block of blocks) {
      // "+++ b/path/to/file.js" contém o caminho do arquivo novo
      const match = block.match(/^\+{3} b\/(.+)$/m);
      if (match) {
        patchMap[match[1]] = block;
      }
    }
    return patchMap;
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
            to: parseInt(line, 10),
          },
        },
        this._getAxiosConfig()
      );

      return response.data;
    } catch (error) {
      // Preserva o status HTTP para o chamador poder identificar 400 vs outros erros
      const err = new Error(`Erro ao adicionar comentário inline: ${error.message}`);
      err.response = error.response;
      throw err;
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
   * Aciona o "Request Changes" nativo do Bitbucket (equivalente ao Shift+R na UI)
   * Fallback para remoção de aprovação se o token não tiver permissão
   * @param {number} prNumber - Número da PR
   * @returns {Object|null} Dados do participante ou null no fallback
   */
  async requestChanges(prNumber) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prNumber}/request-changes`,
        {},
        this._getAxiosConfig()
      );
      return response.data;
    } catch (error) {
      // Fallback: remove aprovação existente se o endpoint não estiver disponível
      if (error.response?.status === 404 || error.response?.status === 405) {
        try {
          await this.unapprovePullRequest(prNumber);
        } catch (err) {
          // Ignora se não havia aprovação
        }
        return null;
      }
      throw new Error(`Erro ao solicitar mudanças na PR #${prNumber}: ${error.message}`);
    }
  }

  /**
   * Lista comentários de uma PR (todas as páginas)
   * @param {number} prNumber - Número da PR
   * @returns {Array} Lista de comentários
   */
  async listComments(prNumber) {
    try {
      const comments = [];
      let url = `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prNumber}/comments?pagelen=50`;

      while (url) {
        const response = await axios.get(url, this._getAxiosConfig());
        comments.push(...(response.data.values || []));
        url = response.data.next || null;
      }

      return comments;
    } catch (error) {
      throw new Error(`Erro ao listar comentários da PR #${prNumber}: ${error.message}`);
    }
  }

  /**
   * Verifica se o bot já realizou um review nesta PR
   * @param {number} prNumber - Número da PR
   * @param {Object} prData - Dados da PR já buscados
   * @param {Object|null} currentUser - Usuário autenticado (pode ser null)
   * @returns {{ status: 'approved'|'request_changes'|'none' }}
   */
  async getExistingBotReview(prNumber, prData, currentUser = null) {
    const accountId = currentUser?.account_id;

    // Verifica status do participante (aprovação ou request changes nativo)
    if (accountId) {
      const participant = (prData.participants || []).find(
        p => p.user?.account_id === accountId
      );
      if (participant?.approved) {
        return { status: 'approved' };
      }
      if (participant?.state === 'changes_requested') {
        return { status: 'request_changes' };
      }
    }

    // Fallback: verifica comentário com assinatura do bot (tokens sem account_id
    // ou PRs criadas antes da migração para o endpoint nativo)
    const comments = await this.listComments(prNumber);
    const BOT_SIGNATURE = 'Code Review Bot v';
    const botComment = comments.find(c => {
      const text = c.content?.raw || '';
      if (!text.includes(BOT_SIGNATURE)) return false;
      if (accountId) return c.user?.account_id === accountId;
      return true;
    });

    if (botComment) {
      return { status: 'request_changes' };
    }

    return { status: 'none' };
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
        html_url: `https://bitbucket.org/${this.workspace}/${this.repoSlug}/pull-requests/${prNumber}`,
      };

      // Adiciona comentário principal
      if (body) {
        result.mainComment = await this.addComment(prNumber, body);
      }

      // Adiciona comentários inline, com fallback para comentário geral se a linha for inválida
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
          // 400 indica linha/path fora do diff — posta como comentário geral com contexto
          if (err.response?.status === 400 || err.message.includes('400')) {
            try {
              const fallbackBody = `**${comment.path}** (linha ${comment.line}):\n\n${comment.body}`;
              const fallback = await this.addComment(prNumber, fallbackBody);
              result.inlineComments.push(fallback);
            } catch (fallbackErr) {
              console.warn(`⚠️  Não foi possível adicionar comentário em ${comment.path}:${comment.line}`);
            }
          } else {
            console.warn(`⚠️  Erro ao adicionar comentário inline em ${comment.path}:${comment.line}: ${err.message}`);
          }
        }
      }

      // Executa ação apropriada
      if (action === 'APPROVE') {
        result.approval = await this.approvePullRequest(prNumber);
      } else if (action === 'REQUEST_CHANGES') {
        await this.requestChanges(prNumber);
      }

      return result;
    } catch (error) {
      throw new Error(`Erro ao criar review na PR #${prNumber}: ${error.message}`);
    }
  }
}
