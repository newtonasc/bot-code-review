/**
 * Cliente GitHub para interação com PRs, Issues e Reviews
 * Usa a API REST do GitHub via Octokit
 */

import { Octokit } from '@octokit/rest';
import axios from 'axios';

export default class GitHubClient {
  constructor(token, owner, repo) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Busca informações de uma Pull Request
   * @param {number} prNumber - Número da PR
   * @returns {Object} Dados da PR
   */
  async getPullRequest(prNumber) {
    try {
      const { data } = await this.octokit.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
      });

      return data;
    } catch (error) {
      throw new Error(`Erro ao buscar PR #${prNumber}: ${error.message}`);
    }
  }

  /**
   * Busca arquivos modificados em uma PR
   * @param {number} prNumber - Número da PR
   * @returns {Array} Lista de arquivos modificados
   */
  async getPullRequestFiles(prNumber) {
    try {
      const { data } = await this.octokit.pulls.listFiles({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        per_page: 100,
      });

      // Busca conteúdo de cada arquivo
      const filesWithContent = await Promise.all(
        data.map(async (file) => {
          try {
            const content = await this.getFileContent(file.filename, file.sha);
            return {
              ...file,
              content,
            };
          } catch (err) {
            console.warn(`Não foi possível obter conteúdo de ${file.filename}: ${err.message}`);
            return {
              ...file,
              content: null,
            };
          }
        })
      );

      return filesWithContent;
    } catch (error) {
      throw new Error(`Erro ao buscar arquivos da PR #${prNumber}: ${error.message}`);
    }
  }

  /**
   * Busca conteúdo de um arquivo específico
   * @param {string} path - Caminho do arquivo
   * @param {string} ref - SHA ou branch
   * @returns {string} Conteúdo do arquivo
   */
  async getFileContent(path, ref) {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref,
      });

      if (data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }

      return null;
    } catch (error) {
      throw new Error(`Erro ao buscar conteúdo do arquivo ${path}: ${error.message}`);
    }
  }

  /**
   * Busca informações de uma Issue
   * @param {number} issueNumber - Número da issue
   * @returns {Object} Dados da issue
   */
  async getIssue(issueNumber) {
    try {
      const { data } = await this.octokit.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
      });

      return data;
    } catch (error) {
      throw new Error(`Erro ao buscar issue #${issueNumber}: ${error.message}`);
    }
  }

  /**
   * Extrai número da issue do título ou corpo da PR
   * @param {Object} pr - Dados da PR
   * @returns {number|null} Número da issue ou null
   */
  extractIssueNumber(pr) {
    const patterns = [
      /#(\d+)/,           // #123
      /issue[:\s]+(\d+)/i, // issue: 123 ou issue 123
      /closes[:\s]+#?(\d+)/i, // closes #123
      /fixes[:\s]+#?(\d+)/i,  // fixes #123
    ];

    const text = `${pr.title} ${pr.body || ''}`;

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }

    return null;
  }

  /**
   * Cria um review na PR
   * @param {number} prNumber - Número da PR
   * @param {string} event - Tipo de review: COMMENT, APPROVE, REQUEST_CHANGES
   * @param {string} body - Corpo do review
   * @param {Array} comments - Comentários inline (opcional)
   * @returns {Object} Dados do review criado
   */
  async createReview(prNumber, event, body, comments = []) {
    try {
      const reviewData = {
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        event,
        body,
      };

      // Adiciona comentários inline se fornecidos
      if (comments.length > 0) {
        reviewData.comments = comments.map(comment => ({
          path: comment.file,
          position: comment.position || undefined,
          line: comment.line || undefined,
          body: comment.body,
        }));
      }

      const { data } = await this.octokit.pulls.createReview(reviewData);

      return data;
    } catch (error) {
      throw new Error(`Erro ao criar review na PR #${prNumber}: ${error.message}`);
    }
  }

  /**
   * Adiciona comentário em uma PR
   * @param {number} prNumber - Número da PR
   * @param {string} body - Corpo do comentário
   * @returns {Object} Dados do comentário criado
   */
  async addComment(prNumber, body) {
    try {
      const { data } = await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        body,
      });

      return data;
    } catch (error) {
      throw new Error(`Erro ao adicionar comentário na PR #${prNumber}: ${error.message}`);
    }
  }

  /**
   * Adiciona comentário inline em arquivo específico
   * @param {number} prNumber - Número da PR
   * @param {string} commitId - SHA do commit
   * @param {string} path - Caminho do arquivo
   * @param {number} line - Linha do comentário
   * @param {string} body - Corpo do comentário
   * @returns {Object} Dados do comentário criado
   */
  async addInlineComment(prNumber, commitId, path, line, body) {
    try {
      const { data } = await this.octokit.pulls.createReviewComment({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        commit_id: commitId,
        path,
        line,
        body,
      });

      return data;
    } catch (error) {
      throw new Error(`Erro ao adicionar comentário inline: ${error.message}`);
    }
  }

  /**
   * Lista reviews existentes em uma PR
   * @param {number} prNumber - Número da PR
   * @returns {Array} Lista de reviews
   */
  async listReviews(prNumber) {
    try {
      const { data } = await this.octokit.pulls.listReviews({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
      });

      return data;
    } catch (error) {
      throw new Error(`Erro ao listar reviews da PR #${prNumber}: ${error.message}`);
    }
  }

  /**
   * Busca comentários de review de uma PR
   * @param {number} prNumber - Número da PR
   * @returns {Array} Lista de comentários
   */
  async listReviewComments(prNumber) {
    try {
      const { data } = await this.octokit.pulls.listReviewComments({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
      });

      return data;
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
      await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo,
      });
      return true;
    } catch (error) {
      throw new Error(`Erro ao validar acesso ao repositório: ${error.message}`);
    }
  }

  /**
   * Busca informações do usuário autenticado
   * @returns {Object} Dados do usuário
   */
  async getAuthenticatedUser() {
    try {
      const { data } = await this.octokit.users.getAuthenticated();
      return data;
    } catch (error) {
      throw new Error(`Erro ao buscar usuário autenticado: ${error.message}`);
    }
  }
}
