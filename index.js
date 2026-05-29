#!/usr/bin/env node

/**
 * Bot de Code Review para Pull Requests
 * Analisa PRs seguindo padrões de código configuráveis
 * 
 * Uso:
 *   node index.js <pr-number> [options]
 *   
 * Variáveis de ambiente necessárias:
 *   BITBUCKET_TOKEN - Repository Access Token do Bitbucket
 *   BITBUCKET_WORKSPACE - Workspace do repositório
 *   BITBUCKET_REPO_SLUG - Slug do repositório (obrigatório)
 */

// Carrega variáveis de ambiente do arquivo .env
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = process.env.CODE_REVIEW_ENV_FILE
  ? (process.env.CODE_REVIEW_ENV_FILE.startsWith('/')
    ? process.env.CODE_REVIEW_ENV_FILE
    : join(process.cwd(), process.env.CODE_REVIEW_ENV_FILE))
  : join(__dirname, '.env');
dotenv.config({ path: envPath });

import BitbucketClient from './bitbucket-client.js';
import CodeAnalyzer from './code-analyzer.js';
import InteractiveCLI from './interactive-cli.js';
import JiraClient from './jira-client.js';
import AIAnalyzer from './ai-analyzer.js';
import ProjectContextCollector from './project-context.js';
import { createRequire } from 'module';

const { version: BOT_VERSION } = createRequire(import.meta.url)('./package.json');

// Ordem de risco crescente para comparação de threshold
const RISK_ORDER = { low: 0, medium: 1, high: 2 };

function isRiskWithinThreshold(riskLevel, maxRisk) {
  const level = RISK_ORDER[riskLevel?.toLowerCase()] ?? Infinity;
  const max = RISK_ORDER[maxRisk?.toLowerCase()] ?? -1;
  return level <= max;
}

class CodeReviewBot {
  constructor(token, workspace, repoSlug, username = null, jiraConfig = {}, aiConfig = {}) {
    this.bitbucket = new BitbucketClient(token, workspace, repoSlug, username);
    this.cli = new InteractiveCLI();
    this.projectContext = new ProjectContextCollector(this.bitbucket);
    this.jira = new JiraClient(
      jiraConfig.cloudId,
      jiraConfig.projectKey,
      jiraConfig.mcpEnabled || false,
      jiraConfig.apiToken,
      jiraConfig.email,
      jiraConfig.siteUrl,
    );
    this.jiraSiteUrl = jiraConfig.siteUrl || null;
    this.ai = new AIAnalyzer(
      aiConfig.provider || 'claude',
      aiConfig.apiKey || null
    );
  }

  /**
   * Executa o bot de code review
   * @param {number} prNumber - Número da PR
   * @param {Object} options - Opções de execução
   */
  async run(prNumber, options = {}) {
    try {
      // Valida acesso ao Bitbucket
      this.cli.displayProgress('Validando acesso ao Bitbucket');
      await this.bitbucket.validateAccess();

      // Tenta buscar informações do usuário autenticado (opcional, pode falhar com alguns tokens)
      let currentUser = null;
      try {
        currentUser = await this.bitbucket.getAuthenticatedUser();
        console.log(`✅ Autenticado como: ${currentUser.username || currentUser.display_name}\n`);
      } catch (err) {
        // Ignora erro 403 (token pode não ter permissão para /user)
        if (err.message.includes('403')) {
          const fallbackAccountId = process.env.BITBUCKET_ACCOUNT_ID;
          if (fallbackAccountId) {
            currentUser = { account_id: fallbackAccountId };
            console.log(`⚠️  Não foi possível buscar informações do usuário via API. Usando BITBUCKET_ACCOUNT_ID do .env\n`);
          } else {
            console.log(`⚠️  Não foi possível buscar informações do usuário (permissão não concedida). Configure BITBUCKET_ACCOUNT_ID no .env para detecção precisa de reviews anteriores.\n`);
          }
        } else {
          throw err;
        }
      }

      // Busca informações da PR
      this.cli.displayProgress(`Buscando informações da PR #${prNumber}`);
      const pr = await this.bitbucket.getPullRequest(prNumber);
      console.log(`✅ PR encontrada: ${pr.title}\n`);

      // Verifica se o bot já realizou um review nesta PR
      this.cli.displayProgress('Verificando reviews anteriores');
      const existingReview = await this.bitbucket.getExistingBotReview(prNumber, pr, currentUser);
      if (existingReview.status === 'approved') {
        console.log('ℹ️  O bot já aprovou esta PR. Para criar um novo review, remova a aprovação primeiro.\n');
        return;
      }
      if (existingReview.status === 'request_changes') {
        console.log('ℹ️  O bot já realizou um code review com REQUEST_CHANGES nesta PR e ele ainda está em aberto.\n');
        return;
      }
      console.log('✅ Nenhum review anterior encontrado\n');

      // Busca issue relacionada (Bitbucket/Jira)
      let issue = null;
      let jiraIssue = options.jiraIssue || null; // Pode ser passado via options
      let jiraAnalysis = null;

      // Tenta extrair chave do Jira
      const jiraKey = this.jira.extractJiraKeyFromPR(pr);

      if (jiraKey) {
        console.log(`✅ Issue do Jira detectada: ${jiraKey}\n`);

        if (jiraIssue) {
          // Dados passados manualmente via options
          jiraAnalysis = this.jira.analyzeJiraIssue(jiraIssue);
          console.log(`✅ Dados da issue carregados\n`);
        } else {
          // Busca automática via API REST ou MCP
          jiraAnalysis = await this.jira.fetchAndAnalyzeIssue(jiraKey);
          if (jiraAnalysis && jiraAnalysis.found) {
            console.log(this.jira.formatIssueInfo(jiraAnalysis));
          } else if (!this.jira.apiEnabled && !this.jira.mcpEnabled) {
            console.log(`ℹ️  Configure JIRA_SITE_URL (ou JIRA_CLOUD_ID) no .env para busca automática de issues.\n`);
          }
        }
      }

      // Também busca issue do Jira (não há sistema de issues no Bitbucket)
      const issueNumber = this.bitbucket.extractIssueNumber(pr);

      if (issueNumber && !jiraKey) {
        console.log(`ℹ️  Bitbucket não possui sistema de issues próprias. Use Jira para rastreamento.\n`);
      } else if (!jiraKey && !issueNumber) {
        console.log('ℹ️  Nenhuma issue referenciada na PR\n');
      }

      // Busca arquivos modificados
      this.cli.displayProgress('Buscando arquivos modificados');
      const files = await this.bitbucket.getPullRequestFiles(prNumber);
      console.log(`✅ ${files.length} arquivo(s) modificado(s)\n`);

      // Coleta contexto semântico do repositório (documentação, constantes, configuração)
      // Necessário tanto para IA quanto para análise estática de enums
      const commitHash = pr.source?.commit?.hash;
      let projectContextData = null;
      if (commitHash) {
        projectContextData = await this.projectContext.collect(commitHash);
      }

      // Analisa arquivos com contexto do projeto
      this.cli.displayProgress('Analisando código');
      const analyzer = new CodeAnalyzer(projectContextData);
      const issuesByFile = analyzer.analyzeFiles(files);
      const report = analyzer.generateReport(issuesByFile);
      console.log('✅ Análise concluída\n');

      // Análise com IA (se habilitada)
      let aiAnalyses = [];
      let aiSummary = null;
      if (this.ai.enabled) {
        // Prepara dados para IA
        const filesForAI = files.map(f => ({
          filePath: f.filename,
          content: f.content || '',
          patch: f.patch || '',
          staticIssues: issuesByFile[f.filename] || [],
        }));

        // Analisa com IA (passando contexto do projeto)
        aiAnalyses = await this.ai.analyzeFiles(filesForAI, jiraAnalysis, this.projectContext);

        // Gera resumo da PR (passando contexto do projeto)
        aiSummary = await this.ai.generatePRSummary(pr, files, report, jiraAnalysis, this.projectContext);

        // Exibe resumo da IA
        if (aiSummary) {
          this.cli.displayAISummary(aiSummary);
        }
      }

      // Exibe relatório
      this.cli.displayReport(report);

      // Exibe informações da issue do Jira (se houver)
      if (jiraAnalysis && jiraAnalysis.found) {
        console.log(this.jira.formatIssueInfo(jiraAnalysis));
      }

      // Analisa conformidade com a issue
      let compliance = null;

      if (jiraAnalysis && jiraAnalysis.found) {
        // Usa análise do Jira (prioritária)
        compliance = this.analyzeJiraCompliance(jiraAnalysis, files);
        this.cli.displayCompliance(compliance);
      } else if (issue) {
        // Fallback para issue do GitHub
        compliance = analyzer.analyzeIssueCompliance(issue, files);
        this.cli.displayCompliance(compliance);
      }

      // Formata comentários para Bitbucket
      const staticComments = analyzer.formatForBitbucket(issuesByFile);
      let aiComments = [];

      if (aiAnalyses.length > 0) {
        aiComments = this.ai.formatAIComments(aiAnalyses);
        this.cli.displayAISuggestions(aiComments);
      }

      let comments = [...staticComments, ...aiComments];

      // Se modo dry-run, apenas exibe relatório
      if (options.dryRun) {
        console.log('ℹ️  Modo dry-run: review não será criado\n');
        return;
      }

      // Aprovação automática
      if (options.autoApprove && aiSummary) {
        const riskLevel = aiSummary.risks?.level;
        if (isRiskWithinThreshold(riskLevel, options.autoApproveMaxRisk)) {
          console.log(`🤖 Auto-aprovação: risco "${riskLevel}" dentro do limite configurado ("${options.autoApproveMaxRisk}")\n`);
          const review = await this.createReview(prNumber, 'APPROVE', [], report, jiraAnalysis);
          this.cli.displaySuccess(review.html_url);
          return;
        }
        console.log(`⚠️  Auto-aprovação ignorada: risco "${riskLevel}" excede o limite "${options.autoApproveMaxRisk}"\n`);
      }

      // Request changes automático
      if (options.autoRequestChanges && aiSummary?.recommendation === 'REQUEST_CHANGES') {
        console.log(`🤖 Auto-request-changes: IA recomenda mudanças (${comments.length} comentário(s))\n`);
        const review = await this.createReview(prNumber, 'REQUEST_CHANGES', comments, report, jiraAnalysis);
        this.cli.displaySuccess(review.html_url);
        return;
      }

      // Se não houver issues, finaliza (apenas no fluxo interativo)
      if (report.totalIssues === 0) {
        console.log('✨ Nada a reportar. O código está seguindo os padrões!\n');
        return;
      }

      // Seleção interativa de issues
      const selectedComments = await this.cli.selectIssues(comments);

      if (selectedComments.length === 0) {
        console.log('ℹ️  Nenhuma issue selecionada. Operação cancelada.\n');
        return;
      }

      // Seleciona tipo de review
      const hasErrors = selectedComments.some(c => c.severity === 'error');
      const suggestedReviewType = aiSummary && aiSummary.recommendation ?
        aiSummary.recommendation : (hasErrors ? 'REQUEST_CHANGES' : 'COMMENT');
      const reviewType = await this.cli.selectReviewType(hasErrors, suggestedReviewType);

      // Confirma criação do review
      const selectedStatic = selectedComments.filter(c => !c.isAI).length;
      const selectedAI = selectedComments.filter(c => c.isAI).length;
      const confirmed = await this.cli.confirmReview(selectedComments.length, reviewType, selectedStatic, selectedAI);

      if (!confirmed) {
        console.log('❌ Operação cancelada pelo usuário.\n');
        return;
      }

      // Cria review
      this.cli.displayProgress('Criando review');
      const review = await this.createReview(prNumber, reviewType, selectedComments, report, jiraAnalysis);

      this.cli.displaySuccess(review.html_url);

      // Posta comentário de status no Jira (se houver issue vinculada)
      if (jiraAnalysis?.found && jiraAnalysis?.key) {
        const selectedAICount = selectedComments.filter(c => c.isAI).length;
        await this.jira.addReviewComment(jiraAnalysis.key, reviewType, pr, report, selectedAICount);
      }

    } catch (error) {
      this.cli.displayError(error);
      process.exit(1);
    }
  }

  /**
   * Cria review no Bitbucket
   * @param {number} prNumber - Número da PR
   * @param {string} reviewType - Tipo de review
   * @param {Array} comments - Comentários selecionados
   * @param {Object} report - Relatório de análise
   * @returns {Object} Review criado
   */
  async createReview(prNumber, reviewType, comments, report, jiraAnalysis = null) {
    // Monta corpo do review com dados do Jira (se houver)
    const body = this.buildReviewBody(report, comments.length, jiraAnalysis);

    // Mapeia tipo de review para ação do Bitbucket
    const action = reviewType === 'REQUEST_CHANGES' ? 'REQUEST_CHANGES' :
      reviewType === 'APPROVE' ? 'APPROVE' : 'COMMENT';

    // Prepara comentários inline para Bitbucket
    const inlineComments = comments
      .filter(c => c.line && c.file)
      .map(c => ({
        path: c.file,
        line: c.line,
        body: c.body,
      }));

    // Cria review no Bitbucket
    const review = await this.bitbucket.createReview(
      prNumber,
      action,
      body,
      inlineComments
    );

    // Adiciona comentários gerais restantes
    for (const comment of comments) {
      if (!comment.line || !comment.file) {
        try {
          await this.bitbucket.addComment(prNumber, comment.body);
        } catch (err) {
          console.warn(`⚠️  Erro ao adicionar comentário: ${err.message}`);
        }
      }
    }

    return review;
  }

  /**
   * Constrói corpo do review
   * @param {Object} report - Relatório de análise
   * @param {number} selectedCount - Número de issues selecionadas
   * @param {Object} jiraAnalysis - Análise da issue do Jira (opcional)
   * @returns {string} Corpo do review
   */
  buildReviewBody(report, selectedCount, jiraAnalysis = null) {
    let body = '## 🤖 Code Review Automatizado\n\n';
    body += '**Análise baseada nos padrões configurados do projeto**\n\n';

    // Se houver dados do Jira, adiciona contexto da issue
    if (jiraAnalysis && jiraAnalysis.found) {
      body += '### 📋 Issue do Jira\n\n';
      const jiraUrl = this.getJiraBrowseUrl(jiraAnalysis.key);
      if (jiraUrl) {
        body += `**[${jiraAnalysis.key}](${jiraUrl})** - ${jiraAnalysis.summary}\n\n`;
      } else {
        body += `**${jiraAnalysis.key}** - ${jiraAnalysis.summary}\n\n`;
      }
      body += `- **Tipo:** ${jiraAnalysis.type}\n`;
      body += `- **Status:** ${jiraAnalysis.status}\n`;
      body += `- **Prioridade:** ${jiraAnalysis.priority}\n`;

      if (jiraAnalysis.technicalRequirements.length > 0) {
        body += `\n**Requisitos Técnicos (${jiraAnalysis.technicalRequirements.length}):**\n`;
        jiraAnalysis.technicalRequirements.forEach((req, idx) => {
          body += `${idx + 1}. ${req}\n`;
        });
      }

      if (jiraAnalysis.acceptanceCriteria.length > 0) {
        body += `\n**Critérios de Aceite (${jiraAnalysis.acceptanceCriteria.length}):**\n`;
        jiraAnalysis.acceptanceCriteria.forEach((criteria, idx) => {
          body += `- [ ] ${criteria}\n`;
        });
      }

      body += '\n';
    }

    body += '### 📊 Resumo da Análise\n\n';
    body += `- **Arquivos analisados:** ${report.totalFiles}\n`;
    body += `- **Issues encontradas:** ${report.totalIssues}\n`;
    body += `- **Erros:** ${report.issuesBySeverity.error} 🚨\n`;
    body += `- **Avisos:** ${report.issuesBySeverity.warning} ⚠️\n`;
    body += `- **Issues reportadas:** ${selectedCount}\n\n`;

    body += '### 📚 Referências\n\n';
    body += 'Este review segue as diretrizes definidas em:\n';
    body += '- `.github/copilot-instructions.md`\n';
    body += '- Padrões de código do projeto\n';
    body += '- ESLint Airbnb (max-len 120)\n\n';

    body += '### 💡 Próximos Passos\n\n';
    body += '1. Revisar os comentários inline\n';
    body += '2. Aplicar as correções sugeridas\n';
    body += '3. Executar `npm run lint` para validar\n';
    body += '4. Executar `npm run test` para garantir que não há regressões\n';

    if (jiraAnalysis && jiraAnalysis.found) {
      body += '5. Validar que todos os requisitos técnicos foram implementados\n';
      body += '6. Verificar que os critérios de aceite estão atendidos\n';
    }

    body += '\n---\n';
    body += `*Review gerado automaticamente pelo Code Review Bot v${BOT_VERSION}*`;

    return body;
  }

  /**
   * Monta URL de browse do Jira para uma issue
   * @param {string} issueKey - Chave da issue (ex: PROJ-123)
   * @returns {string|null} URL ou null se JIRA_SITE_URL não configurado
   */
  getJiraBrowseUrl(issueKey) {
    if (!this.jiraSiteUrl || !issueKey) return null;

    const base = this.jiraSiteUrl.replace(/\/$/, '');
    const url = base.startsWith('http') ? base : `https://${base}`;
    return `${url}/browse/${issueKey}`;
  }

  /**
   * Analisa conformidade da PR com a issue do Jira
   * @param {Object} jiraAnalysis - Análise da issue do Jira
   * @param {Array} files - Arquivos modificados
   * @returns {Object} Análise de conformidade
   */
  analyzeJiraCompliance(jiraAnalysis, files) {
    const modifiedFiles = files.map(f => f.filename);

    const compliance = {
      hasTests: false,
      hasDocumentation: false,
      modifiedFiles,
      recommendations: [],
      technicalRequirementsStatus: [],
      acceptanceCriteriaStatus: [],
    };

    // Verifica se há testes
    const testFiles = files.filter(f =>
      f.filename.includes('__tests__/') ||
      f.filename.includes('.spec.js') ||
      f.filename.includes('.test.js')
    );
    compliance.hasTests = testFiles.length > 0;

    // Verifica alinhamento com requisitos técnicos
    if (jiraAnalysis.technicalRequirements.length > 0) {
      const keywords = this.jira.extractKeywords(jiraAnalysis.technicalRequirements.join(' '));

      jiraAnalysis.technicalRequirements.forEach(req => {
        const reqKeywords = this.jira.extractKeywords(req);
        const hasAlignment = reqKeywords.some(kw =>
          modifiedFiles.some(file => {
            const fileKeywords = this.jira.extractKeywords(file);
            return fileKeywords.some(fkw => fkw.includes(kw) || kw.includes(fkw));
          })
        );

        compliance.technicalRequirementsStatus.push({
          requirement: req,
          aligned: hasAlignment,
          confidence: hasAlignment ? 'medium' : 'low',
        });
      });
    }

    // Adiciona status dos critérios de aceite (sempre pendentes até validação manual)
    if (jiraAnalysis.acceptanceCriteria.length > 0) {
      jiraAnalysis.acceptanceCriteria.forEach(criteria => {
        compliance.acceptanceCriteriaStatus.push({
          criteria,
          status: 'pending',
          note: 'Validar manualmente após merge',
        });
      });
    }

    // Adiciona recomendações do JiraClient
    const jiraRecommendations = this.jira.generateRecommendations(jiraAnalysis, modifiedFiles);
    compliance.recommendations.push(...jiraRecommendations);

    // Verifica documentação para novos endpoints
    const controllerFiles = files.filter(f => f.filename.includes('/controllers/'));
    if (controllerFiles.length > 0) {
      compliance.recommendations.push({
        severity: 'info',
        message: 'Foram modificados controllers. Certifique-se de que o Swagger foi atualizado.',
        suggestion: 'Execute `npm run swagger` para regenerar a documentação.',
      });
    }

    return compliance;
  }
}

/**
 * Função principal
 */
async function main() {
  const args = process.argv.slice(2);

  // Validações
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    🤖 CODE REVIEW BOT                                      ║
║            Análise automatizada de Pull Requests                           ║
╚════════════════════════════════════════════════════════════════════════════╝

Uso:
  node index.js <pr-number> [options]

Argumentos:
  pr-number           Número da Pull Request a ser analisada

Options:
  --dry-run          Apenas analisa e exibe relatório, sem criar review
  --help, -h         Exibe esta mensagem de ajuda

Variáveis de Ambiente:
  BITBUCKET_TOKEN          Repository Access Token do Bitbucket (obrigatório)
  BITBUCKET_WORKSPACE      Workspace do repositório (obrigatório)
  BITBUCKET_REPO_SLUG      Slug do repositório (obrigatório)
  JIRA_SITE_URL            URL do site Jira (opcional, para links da issue)
  BITBUCKET_USERNAME       Email do usuário (obrigatório para Atlassian API Tokens)
  JIRA_CLOUD_ID            Cloud ID do Jira (opcional, para links da issue)
  JIRA_PROJECT_KEY         Chave do projeto no Jira (opcional, ex: B2B, PROJ)
  JIRA_TOKEN               Atlassian API Token para Jira (opcional, se diferente do BITBUCKET_TOKEN)
  AI_PROVIDER              Provider de IA: 'claude', 'openai' ou 'github-models' (opcional)
  AI_API_KEY               API Key do provider de IA (opcional, habilita análise com IA)

Exemplos:
  # Analisar PR #123 e criar review interativamente
  node index.js 123

  # Apenas visualizar análise sem criar review
  node index.js 123 --dry-run

  # Com variáveis de ambiente customizadas
  BITBUCKET_TOKEN=xxx BITBUCKET_WORKSPACE=myworkspace node index.js 123

Documentação completa: README.md
    `);
    process.exit(0);
  }

  const prNumber = parseInt(args[0], 10);

  if (isNaN(prNumber) || prNumber <= 0) {
    console.error('❌ Erro: Número de PR inválido\n');
    console.log('Use --help para ver instruções de uso\n');
    process.exit(1);
  }

  // Carrega variáveis de ambiente
  const token = process.env.BITBUCKET_TOKEN;
  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO_SLUG;
  const username = process.env.BITBUCKET_USERNAME || null; // Opcional, necessário para tokens Atlassian (ATATT*)

  // Configuração do Jira (opcional)
  // JIRA_TOKEN e JIRA_USERNAME podem ser omitidos se forem iguais ao Bitbucket
  const jiraConfig = {
    cloudId: process.env.JIRA_CLOUD_ID || null,
    projectKey: process.env.JIRA_PROJECT_KEY || null,
    siteUrl: process.env.JIRA_SITE_URL || null,
    apiToken: process.env.JIRA_TOKEN || process.env.BITBUCKET_TOKEN || null,
    email: process.env.JIRA_USERNAME || process.env.BITBUCKET_USERNAME || null,
  };

  // Configuração de IA (opcional)
  const aiConfig = {
    provider: process.env.AI_PROVIDER || 'claude',
    apiKey: process.env.AI_API_KEY || null,
  };

  // claude-cli não precisa de API key — o AIAnalyzer lê o token do Claude CLI
  const aiEnabled = aiConfig.apiKey || aiConfig.provider === 'claude-cli';
  if (aiEnabled) {
    console.log(`🤖 Análise com IA habilitada (${aiConfig.provider})\n`);
  }

  if (!token || !workspace || !repoSlug) {
    console.error('❌ Erro: Variáveis de ambiente do Bitbucket não definidas\n');
    console.log('Defina as variáveis necessárias:\n');
    console.log('  export BITBUCKET_TOKEN=seu-token');
    console.log('  export BITBUCKET_WORKSPACE=seu-workspace');
    console.log('  export BITBUCKET_REPO_SLUG=seu-repositorio');
    console.log('  export BITBUCKET_USERNAME=seu-email  # Opcional, apenas para tokens Atlassian\n');
    console.log('Para gerar um Repository Access Token:');
    console.log('  1. Acesse: https://bitbucket.org/{workspace}/{repo}/admin/access-tokens/');
    console.log('  2. Clique em "Create Repository Access Token"');
    console.log('  3. Permissões: Pull requests (Read, Write)\n');
    console.log('Ou use seu Atlassian API Token:');
    console.log('  1. Acesse: https://id.atlassian.com/manage-profile/security/api-tokens');
    console.log('  2. Clique em "Create API token"');
    console.log('  3. Configure BITBUCKET_USERNAME com seu email do Atlassian\n');
    process.exit(1);
  }

  // Configuração de automação de review
  const autoApprove = process.env.AUTO_APPROVE_ENABLED === 'true';
  const autoApproveMaxRisk = (process.env.AUTO_APPROVE_MAX_RISK || 'low').toLowerCase();
  const autoRequestChanges = process.env.AUTO_REQUEST_CHANGES_ENABLED === 'true';

  if (autoApprove) {
    console.log(`🤖 Auto-aprovação habilitada (risco máximo: "${autoApproveMaxRisk}")\n`);
  }
  if (autoRequestChanges) {
    console.log(`🤖 Auto-request-changes habilitado\n`);
  }

  // Opções
  const options = {
    dryRun: args.includes('--dry-run'),
    jiraIssue: null,
    autoApprove,
    autoApproveMaxRisk,
    autoRequestChanges,
  };

  // Executa bot
  const bot = new CodeReviewBot(token, workspace, repoSlug, username, jiraConfig, aiConfig);
  await bot.run(prNumber, options);
}

// Executa apenas se for o módulo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Erro fatal:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

export default CodeReviewBot;
