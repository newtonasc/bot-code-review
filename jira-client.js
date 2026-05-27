/**
 * Cliente Jira para integração com MCP da Atlassian
 * Fornece interface para buscar e validar issues do Jira
 */

import axios from 'axios';

export default class JiraClient {
  constructor(cloudId = null, projectKey = null, mcpEnabled = false, apiToken = null, email = null, siteUrl = null) {
    this.cloudId = cloudId;
    this.projectKey = projectKey;
    this.mcpEnabled = mcpEnabled;
    this.apiToken = apiToken;
    this.email = email;
    this.siteUrl = siteUrl;
    this.apiEnabled = !!(apiToken && email && (siteUrl || cloudId));
  }

  /**
   * Busca issue do Jira via API REST do Jira Cloud
   * Usa Basic Auth com email + Atlassian API Token
   * @param {string} issueKey - Chave da issue (ex: PROJ-123)
   * @returns {Object|null} Dados da issue ou null
   */
  async fetchIssueViaAPI(issueKey) {
    if (!this.apiEnabled) return null;

    const rawSite = this.siteUrl ? this.siteUrl.replace(/\/$/, '') : null;
    const site = rawSite ? (rawSite.startsWith('http') ? rawSite : `https://${rawSite}`) : null;
    const base = site
      ? `${site}/rest/api/3`
      : `https://api.atlassian.com/ex/jira/${this.cloudId}/rest/api/3`;

    try {
      const response = await axios.get(`${base}/issue/${issueKey}`, {
        auth: { username: this.email, password: this.apiToken },
        headers: { Accept: 'application/json' },
        timeout: 15000,
      });
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        console.warn(`⚠️  Sem acesso à API do Jira (${status}). O token Bitbucket não tem escopo Jira.`);
        console.warn(`   Crie um Atlassian API Token em: https://id.atlassian.com/manage-profile/security/api-tokens`);
        console.warn(`   E configure JIRA_TOKEN=<token> no .env\n`);
        this.apiEnabled = false;
      } else if (status === 404) {
        console.warn(`⚠️  Issue ${issueKey} não encontrada no Jira.`);
        console.warn(`   Possível causa: o token Bitbucket não tem acesso ao Jira.`);
        console.warn(`   Para habilitar: crie um token em https://id.atlassian.com/manage-profile/security/api-tokens`);
        console.warn(`   e adicione JIRA_TOKEN=<token> no .env\n`);
      } else {
        console.warn(`⚠️  Erro ao buscar ${issueKey} via API Jira: ${status || ''} ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Extrai texto plano de uma descrição Jira (ADF ou string)
   * @param {Object|string} description - Descrição em ADF ou texto
   * @returns {string}
   */
  _extractText(description) {
    if (!description) return '';
    if (typeof description === 'string') return description;

    const extract = (node) => {
      if (!node) return '';
      let text = node.text || '';
      if (node.content) text += node.content.map(extract).join('');
      if (['paragraph', 'heading', 'listItem', 'bulletList', 'orderedList'].includes(node.type)) text += '\n';
      return text;
    };

    return extract(description);
  }

  /**
   * Busca issue do Jira via MCP da Atlassian
   * Este método deve ser chamado apenas quando rodando no contexto do Claude/Cursor
   * que tem acesso aos servidores MCP
   * @param {string} issueKey - Chave da issue (ex: PROJ-123)
   * @returns {Object|null} Dados da issue ou null
   */
  async fetchIssueViaMCP(issueKey) {
    if (!this.mcpEnabled) {
      console.warn('⚠️  MCP não está habilitado. Configure mcpEnabled=true no constructor.');
      return null;
    }

    if (!this.cloudId) {
      console.warn('⚠️  Cloud ID não configurado. Necessário para buscar via MCP.');
      return null;
    }

    try {
      // Nota: Este método só funciona quando executado pelo Claude/Cursor
      // Em execução standalone, retorna null e sugere uso manual
      console.log(`🔍 Tentando buscar ${issueKey} via MCP da Atlassian...`);

      // Aqui seria a chamada MCP real quando disponível
      // const issue = await getJiraIssue(this.cloudId, issueKey);

      console.log('ℹ️  MCP não disponível em execução standalone.');
      console.log('💡 Para buscar automaticamente, execute via Claude/Cursor com MCP habilitado.');

      return null;
    } catch (error) {
      console.error(`❌ Erro ao buscar issue via MCP: ${error.message}`);
      return null;
    }
  }

  /**
   * Busca issue e analisa — tenta API REST primeiro, depois MCP
   * @param {string} issueKey - Chave da issue
   * @returns {Object} Análise da issue
   */
  async fetchAndAnalyzeIssue(issueKey) {
    if (this.apiEnabled) {
      console.log(`🔍 Buscando ${issueKey} via API do Jira...`);
      const issue = await this.fetchIssueViaAPI(issueKey);
      if (issue) {
        console.log(`✅ Issue ${issueKey} carregada\n`);
        return this.analyzeJiraIssue(issue);
      }
    }

    if (this.mcpEnabled) {
      const issue = await this.fetchIssueViaMCP(issueKey);
      if (issue) return this.analyzeJiraIssue(issue);
    }

    return { found: false, key: issueKey };
  }

  /**
   * Extrai chave da issue do Jira do texto
   * Suporta formatos: PROJ-123, [PROJ-123], etc.
   * @param {string} text - Texto contendo referência à issue
   * @returns {string|null} Chave da issue ou null
   */
  extractJiraKey(text) {
    if (!text) return null;

    // Padrões comuns: PROJ-123, [PROJ-123], fixes PROJ-123, etc.
    const patterns = [
      /\b([A-Z]{2,10}-\d+)\b/g, // PROJ-123
      /\[([A-Z]{2,10}-\d+)\]/g, // [PROJ-123]
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Retorna a primeira ocorrência limpa
        return matches[0].replace(/[\[\]]/g, '');
      }
    }

    return null;
  }

  /**
   * Valida se uma string é uma chave válida do Jira
   * @param {string} key - Chave a validar
   * @returns {boolean}
   */
  isValidJiraKey(key) {
    if (!key) return false;
    const pattern = /^[A-Z]{2,10}-\d+$/;
    return pattern.test(key);
  }

  /**
   * Extrai chave da issue da PR do GitHub
   * @param {Object} pr - Dados da PR
   * @returns {string|null} Chave da issue ou null
   */
  extractJiraKeyFromPR(pr) {
    if (!pr) return null;

    // Busca no título
    const titleKey = this.extractJiraKey(pr.title);
    if (titleKey) return titleKey;

    // Busca no corpo
    const bodyKey = this.extractJiraKey(pr.body || '');
    if (bodyKey) return bodyKey;

    // Busca no branch (Bitbucket: pr.source.branch.name, GitHub: pr.head.ref)
    const branchName = pr.source?.branch?.name || pr.head?.ref || null;
    if (branchName) {
      const branchKey = this.extractJiraKey(branchName);
      if (branchKey) return branchKey;
    }

    return null;
  }

  /**
   * Analisa informações da issue do Jira
   * @param {Object} jiraIssue - Dados da issue (formato MCP Atlassian)
   * @returns {Object} Análise estruturada
   */
  analyzeJiraIssue(jiraIssue) {
    if (!jiraIssue) {
      return {
        found: false,
        message: 'Issue do Jira não encontrada',
      };
    }

    const analysis = {
      found: true,
      key: jiraIssue.key,
      type: jiraIssue.fields?.issuetype?.name || 'Unknown',
      status: jiraIssue.fields?.status?.name || 'Unknown',
      priority: jiraIssue.fields?.priority?.name || 'Unknown',
      summary: jiraIssue.fields?.summary || '',
      description: this._extractText(jiraIssue.fields?.description) || '',
      assignee: jiraIssue.fields?.assignee?.displayName || 'Unassigned',
      reporter: jiraIssue.fields?.reporter?.displayName || 'Unknown',
      labels: jiraIssue.fields?.labels || [],
      components: (jiraIssue.fields?.components || []).map(c => c.name),
      fixVersions: (jiraIssue.fields?.fixVersions || []).map(v => v.name),
      technicalRequirements: [],
      acceptanceCriteria: [],
    };

    // Extrai requisitos técnicos e critérios de aceite da descrição
    if (analysis.description) {
      analysis.technicalRequirements = this.extractSection(
        analysis.description,
        'Technical Requirements'
      );
      analysis.acceptanceCriteria = this.extractSection(
        analysis.description,
        'Acceptance Criteria'
      );
    }

    return analysis;
  }

  /**
   * Extrai seção específica da descrição da issue
   * @param {string} description - Descrição da issue
   * @param {string} sectionName - Nome da seção
   * @returns {Array} Itens da seção
   */
  extractSection(description, sectionName) {
    if (!description) return [];

    const sectionPattern = new RegExp(
      `##\\s*${sectionName}\\s*([\\s\\S]*?)(?=##|$)`,
      'i'
    );
    const match = description.match(sectionPattern);

    if (!match) return [];

    // Extrai itens marcados com checkbox ou bullet
    const items = match[1]
      .split('\n')
      .filter(line => line.trim().startsWith('- [') || line.trim().startsWith('- '))
      .map(line => line.replace(/^-\s*\[[x\s]\]\s*/, '').replace(/^-\s*/, '').trim())
      .filter(item => item.length > 0);

    return items;
  }

  /**
   * Gera recomendações baseadas na issue do Jira
   * @param {Object} jiraAnalysis - Análise da issue
   * @param {Array} modifiedFiles - Arquivos modificados na PR
   * @returns {Array} Recomendações
   */
  generateRecommendations(jiraAnalysis, modifiedFiles) {
    const recommendations = [];

    if (!jiraAnalysis.found) {
      recommendations.push({
        severity: 'info',
        message: 'Nenhuma issue do Jira vinculada à PR.',
        suggestion: 'Referencie a issue do Jira no título ou descrição da PR (ex: [PROJ-123]).',
      });
      return recommendations;
    }

    // Verifica se é Bug mas não tem testes
    if (jiraAnalysis.type === 'Bug') {
      const hasTests = modifiedFiles.some(f => f.includes('__tests__/') || f.includes('.spec.js') || f.includes('.test.js'));

      if (!hasTests) {
        recommendations.push({
          severity: 'warning',
          message: 'Issue do tipo Bug mas não há testes adicionados.',
          suggestion: 'Adicione testes para garantir que o bug não ocorra novamente.',
        });
      }
    }

    // Verifica requisitos técnicos vs arquivos modificados
    if (jiraAnalysis.technicalRequirements.length > 0) {
      const keywords = this.extractKeywords(jiraAnalysis.technicalRequirements.join(' '));
      const fileKeywords = modifiedFiles.map(f => this.extractKeywords(f)).flat();

      const hasAlignment = keywords.some(kw =>
        fileKeywords.some(fkw => fkw.includes(kw) || kw.includes(fkw))
      );

      if (!hasAlignment) {
        recommendations.push({
          severity: 'info',
          message: 'Arquivos modificados podem não estar alinhados com os requisitos técnicos da issue.',
          suggestion: 'Verifique se todos os requisitos técnicos estão sendo atendidos.',
        });
      }
    }

    // Verifica critérios de aceite
    if (jiraAnalysis.acceptanceCriteria.length > 0) {
      recommendations.push({
        severity: 'info',
        message: `Issue tem ${jiraAnalysis.acceptanceCriteria.length} critério(s) de aceite definido(s).`,
        suggestion: 'Certifique-se de que todos os critérios de aceite foram implementados e testados.',
        details: jiraAnalysis.acceptanceCriteria,
      });
    }

    // Verifica prioridade alta
    if (jiraAnalysis.priority === 'High' || jiraAnalysis.priority === 'Highest') {
      recommendations.push({
        severity: 'info',
        message: `Issue com prioridade ${jiraAnalysis.priority}.`,
        suggestion: 'Revise cuidadosamente todas as mudanças antes de aprovar.',
      });
    }

    return recommendations;
  }

  /**
   * Extrai palavras-chave de um texto
   * @param {string} text - Texto
   * @returns {Array} Palavras-chave
   */
  extractKeywords(text) {
    if (!text) return [];

    const normalized = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    return [...new Set(normalized)];
  }

  /**
   * Formata informações da issue para exibição
   * @param {Object} jiraAnalysis - Análise da issue
   * @returns {string} Texto formatado
   */
  formatIssueInfo(jiraAnalysis) {
    if (!jiraAnalysis.found) {
      return 'ℹ️  Nenhuma issue do Jira vinculada';
    }

    let info = `\n📋 **Issue do Jira: ${jiraAnalysis.key}**\n\n`;
    info += `- **Tipo:** ${jiraAnalysis.type}\n`;
    info += `- **Status:** ${jiraAnalysis.status}\n`;
    info += `- **Prioridade:** ${jiraAnalysis.priority}\n`;
    info += `- **Resumo:** ${jiraAnalysis.summary}\n`;
    info += `- **Responsável:** ${jiraAnalysis.assignee}\n`;

    if (jiraAnalysis.labels.length > 0) {
      info += `- **Labels:** ${jiraAnalysis.labels.join(', ')}\n`;
    }

    if (jiraAnalysis.components.length > 0) {
      info += `- **Componentes:** ${jiraAnalysis.components.join(', ')}\n`;
    }

    if (jiraAnalysis.technicalRequirements.length > 0) {
      info += `\n**Requisitos Técnicos:**\n`;
      jiraAnalysis.technicalRequirements.forEach(req => {
        info += `- ${req}\n`;
      });
    }

    if (jiraAnalysis.acceptanceCriteria.length > 0) {
      info += `\n**Critérios de Aceite:**\n`;
      jiraAnalysis.acceptanceCriteria.forEach(criteria => {
        info += `- ${criteria}\n`;
      });
    }

    return info;
  }

  /**
   * Cria link para a issue no Jira
   * @param {string} jiraKey - Chave da issue
   * @param {string} baseUrl - URL base do Jira (opcional)
   * @returns {string} URL da issue
   */
  createIssueLink(jiraKey, baseUrl = null) {
    if (!this.isValidJiraKey(jiraKey)) {
      return null;
    }

    if (baseUrl) {
      return `${baseUrl}/browse/${jiraKey}`;
    }

    // Se cloudId estiver disponível, pode usar o formato padrão
    if (this.cloudId) {
      return `https://${this.cloudId}.atlassian.net/browse/${jiraKey}`;
    }

    return jiraKey; // Retorna apenas a chave se não tiver URL
  }
}
