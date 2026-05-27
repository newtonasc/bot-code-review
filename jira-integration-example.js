#!/usr/bin/env node

/**
 * Exemplo de uso do Code Review Bot com integração completa ao Jira
 * 
 * Este script demonstra como integrar o bot com dados do Jira
 * obtidos através do MCP da Atlassian ou API REST
 * 
 * Uso:
 *   node jira-integration-example.js <pr-number> <jira-key>
 */

import CodeReviewBot from './index.js';

/**
 * Simula busca de dados da issue do Jira
 * Na prática, isso seria feito via MCP da Atlassian ou Jira API
 * 
 * @param {string} jiraKey - Chave da issue (ex: B2B-123)
 * @returns {Promise<Object>} Dados da issue
 */
async function fetchJiraIssue(jiraKey) {
  // EXEMPLO: Na prática, você usaria:
  // - MCP da Atlassian: getJiraIssue(cloudId, issueKey)
  // - Jira REST API: GET /rest/api/3/issue/{issueKey}

  console.log(`🔍 Buscando dados da issue ${jiraKey}...`);

  // Dados de exemplo (substitua por busca real)
  const mockIssue = {
    key: jiraKey,
    fields: {
      issuetype: {
        name: 'Task',
      },
      status: {
        name: 'In Progress',
      },
      priority: {
        name: 'High',
      },
      summary: 'Implementar endpoint de autenticação',
      description: `## Context
Este endpoint permitirá autenticação de usuários via JWT.

## Objective
Implementar autenticação segura usando JWT tokens.

## Technical Requirements
- [ ] Criar middleware de autenticação
- [ ] Implementar geração de JWT
- [ ] Adicionar validação de tokens
- [ ] Proteger endpoints existentes

## Acceptance Criteria
- [ ] Usuários podem fazer login com credenciais
- [ ] Tokens JWT são gerados corretamente
- [ ] Endpoints protegidos validam tokens
- [ ] Tokens inválidos retornam 401

## Technical Notes
Usar bcrypt para hashing de senhas e jsonwebtoken para geração de tokens.

## Estimate
5 story points`,
      assignee: {
        displayName: 'João Silva',
      },
      reporter: {
        displayName: 'Maria Santos',
      },
      labels: ['backend', 'security', 'authentication'],
      components: [
        { name: 'API' },
        { name: 'Authentication' },
      ],
      fixVersions: [
        { name: 'v1.5.0' },
      ],
    },
  };

  // Simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`✅ Issue ${jiraKey} encontrada\n`);

  return mockIssue;
}

/**
 * Exemplo de integração com MCP da Atlassian
 * 
 * Se você tiver o MCP configurado, pode usar algo assim:
 * 
 * import { searchJiraIssuesUsingJql, getJiraIssue } from '@atlassian/mcp-client';
 * 
 * async function fetchJiraIssueViaMCP(cloudId, issueKey) {
 *   try {
 *     const issue = await getJiraIssue(cloudId, issueKey);
 *     return issue;
 *   } catch (error) {
 *     console.error('Erro ao buscar issue:', error);
 *     return null;
 *   }
 * }
 */

/**
 * Função principal
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Uso: node jira-integration-example.js <pr-number> <jira-key>

Exemplo:
  node jira-integration-example.js 123 B2B-456

Este script demonstra como integrar o bot com dados do Jira.
    `);
    process.exit(1);
  }

  const prNumber = parseInt(args[0], 10);
  const jiraKey = args[1];

  if (isNaN(prNumber)) {
    console.error('❌ Erro: Número de PR inválido\n');
    process.exit(1);
  }

  // Configuração
  const token = process.env.BITBUCKET_TOKEN;
  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO_SLUG;
  const jiraConfig = {
    cloudId: process.env.JIRA_CLOUD_ID || null,
    projectKey: process.env.JIRA_PROJECT_KEY || null,
  };

  if (!token || !workspace) {
    console.error('❌ Erro: Variáveis do Bitbucket não definidas\n');
    console.log('Configure: BITBUCKET_TOKEN, BITBUCKET_WORKSPACE\n');
    process.exit(1);
  }

  try {
    // Busca dados da issue do Jira
    const jiraIssue = await fetchJiraIssue(jiraKey);

    // Cria instância do bot
    const bot = new CodeReviewBot(token, workspace, repoSlug, jiraConfig);

    // Executa análise com dados do Jira
    await bot.run(prNumber, {
      dryRun: false,
      jiraIssue, // Fornece dados da issue
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Executa apenas se for o módulo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  });
}

export { fetchJiraIssue };
