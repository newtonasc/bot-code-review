/**
 * CLI Interativa para seleção de correções de code review
 * Permite visualizar e selecionar quais issues reportar
 */

import readline from 'readline';

export default class InteractiveCLI {
  constructor() {
    this.rl = null;
  }

  /**
   * Inicia interface readline
   */
  initReadline() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Fecha interface readline
   */
  closeReadline() {
    if (this.rl) {
      this.rl.close();
    }
  }

  /**
   * Faz uma pergunta ao usuário
   * @param {string} question - Pergunta a ser feita
   * @returns {Promise<string>} Resposta do usuário
   */
  question(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Exibe relatório de análise
   * @param {Object} report - Relatório gerado pelo CodeAnalyzer
   */
  displayReport(report) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RELATÓRIO DE CODE REVIEW');
    console.log('='.repeat(80) + '\n');

    console.log(`📁 Arquivos analisados: ${report.totalFiles}`);
    console.log(`🔍 Issues encontradas: ${report.totalIssues}`);
    console.log(`   🚨 Erros: ${report.issuesBySeverity.error}`);
    console.log(`   ⚠️  Avisos: ${report.issuesBySeverity.warning}\n`);

    if (report.totalIssues === 0) {
      console.log('✅ Nenhuma issue encontrada! Código está seguindo os padrões.\n');
      return;
    }

    console.log('-'.repeat(80));
    console.log('ISSUES POR ARQUIVO');
    console.log('-'.repeat(80) + '\n');

    Object.keys(report.files).forEach((file, fileIndex) => {
      const fileData = report.files[file];
      console.log(`\n📄 ${file}`);
      console.log(`   ${fileData.issuesCount} issue(s) encontrada(s)\n`);

      fileData.issues.forEach((issue, issueIndex) => {
        const emoji = issue.severity === 'error' ? '🚨' : '⚠️';
        const index = `[${fileIndex + 1}.${issueIndex + 1}]`;

        console.log(`   ${emoji} ${index} ${issue.ruleId} (${issue.severity})`);
        console.log(`      ${issue.message}`);

        if (issue.suggestion) {
          console.log(`      💡 ${issue.suggestion}`);
        }

        if (issue.line) {
          console.log(`      📍 Linha: ${issue.line}`);
        }

        console.log('');
      });
    });

    console.log('-'.repeat(80) + '\n');
  }

  /**
   * Exibe análise de conformidade com a issue
   * @param {Object} compliance - Análise de conformidade
   */
  displayCompliance(compliance) {
    console.log('\n' + '='.repeat(80));
    console.log('📋 ANÁLISE DE CONFORMIDADE COM A ISSUE');
    console.log('='.repeat(80) + '\n');

    console.log(`✅ Testes incluídos: ${compliance.hasTests ? 'Sim' : 'Não'}`);
    console.log(`📚 Documentação atualizada: ${compliance.hasDocumentation ? 'Sim' : 'Não'}\n`);

    // Exibe status dos requisitos técnicos
    if (compliance.technicalRequirementsStatus && compliance.technicalRequirementsStatus.length > 0) {
      console.log('🔍 ALINHAMENTO COM REQUISITOS TÉCNICOS:\n');

      compliance.technicalRequirementsStatus.forEach((req, index) => {
        const emoji = req.aligned ? '✅' : '⚠️';
        const status = req.aligned ? 'Alinhado' : 'Não detectado';
        console.log(`   ${emoji} [${index + 1}] ${status} - ${req.requirement}`);
      });
      console.log('');
    }

    // Exibe critérios de aceite
    if (compliance.acceptanceCriteriaStatus && compliance.acceptanceCriteriaStatus.length > 0) {
      console.log('📋 CRITÉRIOS DE ACEITE:\n');

      compliance.acceptanceCriteriaStatus.forEach((criteria, index) => {
        console.log(`   [ ] ${criteria.criteria}`);
        if (criteria.note) {
          console.log(`       ℹ️  ${criteria.note}`);
        }
      });
      console.log('');
    }

    // Exibe recomendações
    if (compliance.recommendations.length > 0) {
      console.log('💡 RECOMENDAÇÕES BASEADAS NA ISSUE:\n');

      compliance.recommendations.forEach((rec, index) => {
        const emoji = rec.severity === 'error' ? '🚨' :
          rec.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${emoji} ${rec.message}`);
        if (rec.suggestion) {
          console.log(`      💡 ${rec.suggestion}`);
        }
        if (rec.details && rec.details.length > 0) {
          rec.details.forEach(detail => {
            console.log(`      - ${detail}`);
          });
        }
        console.log('');
      });
    }

    console.log('-'.repeat(80) + '\n');
  }

  /**
   * Exibe resumo da análise com IA
   * @param {Object} aiSummary - Resumo gerado pela IA
   */
  displayAISummary(aiSummary) {
    if (!aiSummary) return;

    console.log('\n' + '='.repeat(80));
    console.log('🤖 ANÁLISE COM INTELIGÊNCIA ARTIFICIAL');
    console.log('='.repeat(80) + '\n');

    // Qualidade geral
    console.log(`📊 Qualidade Geral: ${aiSummary.overallQuality}/10\n`);

    // Resumo
    if (aiSummary.summary) {
      console.log(`📝 Resumo: ${aiSummary.summary}\n`);
    }

    // Pontos fortes
    if (aiSummary.strengths && aiSummary.strengths.length > 0) {
      console.log('✅ PONTOS FORTES:\n');
      aiSummary.strengths.forEach(strength => {
        console.log(`   ✓ ${strength}`);
      });
      console.log('');
    }

    // Preocupações
    if (aiSummary.concerns && aiSummary.concerns.length > 0) {
      console.log('⚠️  PREOCUPAÇÕES:\n');
      aiSummary.concerns.forEach(concern => {
        console.log(`   • ${concern}`);
      });
      console.log('');
    }

    // Riscos
    if (aiSummary.risks && aiSummary.risks.items && aiSummary.risks.items.length > 0) {
      const riskEmoji = aiSummary.risks.level === 'high' ? '🔴' :
        aiSummary.risks.level === 'medium' ? '🟡' : '🟢';
      console.log(`${riskEmoji} RISCOS (${aiSummary.risks.level.toUpperCase()}):\n`);
      aiSummary.risks.items.forEach(risk => {
        console.log(`   ⚠️  ${risk}`);
      });
      console.log('');
    }

    // Alinhamento com Jira
    if (aiSummary.jiraAlignment) {
      console.log('📋 ALINHAMENTO COM JIRA:\n');
      console.log(`   ${aiSummary.jiraAlignment.complete ? '✅' : '⚠️'} Completude: ${aiSummary.jiraAlignment.complete ? 'Completo' : 'Incompleto'}`);
      if (aiSummary.jiraAlignment.missingRequirements && aiSummary.jiraAlignment.missingRequirements.length > 0) {
        console.log('   \n   Requisitos faltantes:');
        aiSummary.jiraAlignment.missingRequirements.forEach(req => {
          console.log(`   - ${req}`);
        });
      }
      console.log('');
    }

    // Recomendação
    if (aiSummary.recommendation) {
      const recEmoji = aiSummary.recommendation === 'APPROVE' ? '✅' :
        aiSummary.recommendation === 'REQUEST_CHANGES' ? '🔴' : '💬';
      console.log(`${recEmoji} RECOMENDAÇÃO DA IA: ${aiSummary.recommendation}\n`);
    }

    console.log('-'.repeat(80) + '\n');
  }

  /**
   * Permite seleção interativa de issues para reportar
   * @param {Array} comments - Lista de comentários formatados
   * @returns {Promise<Array>} Issues selecionadas
   */
  async selectIssues(comments) {
    this.initReadline();

    console.log('\n' + '='.repeat(80));
    console.log('🎯 SELEÇÃO DE ISSUES PARA REVIEW');
    console.log('='.repeat(80) + '\n');

    console.log('Selecione quais issues deseja incluir no review:\n');
    console.log('  [a] Selecionar todas');
    console.log('  [e] Apenas erros');
    console.log('  [w] Apenas avisos');
    console.log('  [n] Nenhuma (cancelar)');
    console.log('  [c] Seleção customizada (por número)\n');

    const choice = await this.question('Escolha uma opção: ');

    let selectedComments = [];

    switch (choice.toLowerCase()) {
      case 'a':
        selectedComments = comments;
        console.log(`\n✅ Todas as ${comments.length} issues selecionadas.\n`);
        break;

      case 'e':
        selectedComments = comments.filter(c => c.severity === 'error');
        console.log(`\n✅ ${selectedComments.length} erro(s) selecionado(s).\n`);
        break;

      case 'w':
        selectedComments = comments.filter(c => c.severity === 'warning');
        console.log(`\n✅ ${selectedComments.length} aviso(s) selecionado(s).\n`);
        break;

      case 'n':
        console.log('\n❌ Operação cancelada.\n');
        break;

      case 'c':
        selectedComments = await this.customSelection(comments);
        break;

      default:
        console.log('\n❌ Opção inválida. Operação cancelada.\n');
        break;
    }

    this.closeReadline();
    return selectedComments;
  }

  /**
   * Seleção customizada de issues
   * @param {Array} comments - Lista de comentários
   * @returns {Promise<Array>} Issues selecionadas
   */
  async customSelection(comments) {
    console.log('\n' + '-'.repeat(80));
    console.log('LISTA DE ISSUES');
    console.log('-'.repeat(80) + '\n');

    comments.forEach((comment, index) => {
      const emoji = comment.severity === 'error' ? '🚨' : '⚠️';
      const lines = comment.body.split('\n');
      const summary = lines.find(l => l.includes('**Problema:**'));

      console.log(`[${index + 1}] ${emoji} ${comment.ruleId} - ${comment.file}`);
      if (summary) {
        const problemText = lines[lines.indexOf(summary) + 1];
        console.log(`    ${problemText || ''}`);
      }
    });

    console.log('\n' + '-'.repeat(80) + '\n');
    console.log('Digite os números das issues separados por vírgula (ex: 1,3,5)');
    console.log('Ou digite "all" para selecionar todas, "cancel" para cancelar\n');

    const input = await this.question('Issues: ');

    if (input.toLowerCase() === 'cancel') {
      console.log('\n❌ Operação cancelada.\n');
      return [];
    }

    if (input.toLowerCase() === 'all') {
      console.log(`\n✅ Todas as ${comments.length} issues selecionadas.\n`);
      return comments;
    }

    const indices = input.split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0 && n <= comments.length);

    const selected = indices.map(i => comments[i - 1]);

    console.log(`\n✅ ${selected.length} issue(s) selecionada(s).\n`);

    return selected;
  }

  /**
   * Confirma ação de criar review
   * @param {number} issuesCount - Número de issues a serem reportadas
   * @param {string} reviewType - Tipo de review (COMMENT, REQUEST_CHANGES, APPROVE)
   * @returns {Promise<boolean>} true se confirmado
   */
  async confirmReview(issuesCount, reviewType) {
    this.initReadline();

    const typeLabels = {
      COMMENT: 'comentário',
      REQUEST_CHANGES: 'solicitação de mudanças',
      APPROVE: 'aprovação',
    };

    console.log('\n' + '='.repeat(80));
    console.log('⚠️  CONFIRMAÇÃO');
    console.log('='.repeat(80) + '\n');

    console.log(`Você está prestes a criar um review do tipo: ${typeLabels[reviewType]}`);
    console.log(`Número de issues a serem reportadas: ${issuesCount}\n`);

    const answer = await this.question('Deseja continuar? (s/n): ');

    this.closeReadline();

    return answer.toLowerCase() === 's' || answer.toLowerCase() === 'sim';
  }

  /**
   * Seleciona tipo de review
   * @param {boolean} hasErrors - Se há erros críticos
   * @param {string} aiSuggestion - Sugestão da IA (opcional)
   * @returns {Promise<string>} Tipo de review selecionado
   */
  async selectReviewType(hasErrors, aiSuggestion = null) {
    this.initReadline();

    console.log('\n' + '='.repeat(80));
    console.log('📝 TIPO DE REVIEW');
    console.log('='.repeat(80) + '\n');

    if (aiSuggestion) {
      const emoji = aiSuggestion === 'APPROVE' ? '✅' :
        aiSuggestion === 'REQUEST_CHANGES' ? '🔴' : '💬';
      console.log(`${emoji} Sugestão da IA: ${aiSuggestion}\n`);
    }

    console.log('Selecione o tipo de review:\n');
    console.log('  [1] REQUEST_CHANGES - Solicitar mudanças (recomendado se há erros)');
    console.log('  [2] COMMENT - Apenas comentar');
    console.log('  [3] APPROVE - Aprovar com comentários\n');

    const choice = await this.question('Escolha uma opção (1-3): ');

    this.closeReadline();

    switch (choice) {
      case '1':
        return 'REQUEST_CHANGES';
      case '2':
        return 'COMMENT';
      case '3':
        return 'APPROVE';
      default:
        console.log('\n⚠️  Opção inválida. Usando sugestão padrão.\n');
        return aiSuggestion || (hasErrors ? 'REQUEST_CHANGES' : 'COMMENT');
    }
  }

  /**
   * Exibe mensagem de sucesso
   * @param {string} reviewUrl - URL do review criado
   */
  displaySuccess(reviewUrl) {
    console.log('\n' + '='.repeat(80));
    console.log('✅ REVIEW CRIADO COM SUCESSO');
    console.log('='.repeat(80) + '\n');
    console.log(`🔗 URL: ${reviewUrl}\n`);
  }

  /**
   * Exibe mensagem de erro
   * @param {Error} error - Erro ocorrido
   */
  displayError(error) {
    console.log('\n' + '='.repeat(80));
    console.log('❌ ERRO');
    console.log('='.repeat(80) + '\n');
    console.log(`${error.message}\n`);
    if (error.stack) {
      console.log('Stack trace:');
      console.log(error.stack);
    }
    console.log('');
  }

  /**
   * Exibe progresso
   * @param {string} message - Mensagem de progresso
   */
  displayProgress(message) {
    console.log(`⏳ ${message}...`);
  }
}
