/**
 * Analisador de Código para Code Review
 * Analisa arquivos modificados em PRs seguindo os padrões do projeto
 */

import rules from './rules.js';
import EnumMatcher from './enum-matcher.js';

export default class CodeAnalyzer {
  constructor(projectContext = null) {
    this.issues = [];
    this.projectContext = projectContext;

    // Inicializa EnumMatcher com as constantes do projeto
    this.enumMatcher = null;
    if (projectContext && projectContext.constants) {
      this.enumMatcher = new EnumMatcher(projectContext.constants);

      if (this.enumMatcher.hasEnums()) {
        const stats = this.enumMatcher.getStats();
        console.log(`📊 EnumMatcher inicializado: ${stats.enumCount} enum(s), ${stats.valueCount} valor(es)`);
      }
    }
  }

  /**
   * Analisa um arquivo e retorna issues encontradas
   * @param {string} filePath - Caminho do arquivo
   * @param {string} content - Conteúdo do arquivo
   * @param {string} patch - Diff do arquivo (opcional)
   * @returns {Array} Lista de issues
   */
  analyzeFile(filePath, content, patch = null) {
    this.issues = [];

    // Ignora arquivos de configuração, mocks e arquivos gerados
    if (this.shouldIgnoreFile(filePath)) {
      return this.issues;
    }

    // Aplica todas as categorias de regras
    Object.keys(rules).forEach((category) => {
      const categoryRules = rules[category];
      categoryRules.forEach((rule) => {
        this.applyRule(rule, filePath, content, patch);
      });
    });

    return this.issues;
  }

  /**
   * Aplica uma regra específica ao arquivo.
   * Quando patch está disponível, a análise é restrita às linhas alteradas
   * para não sinalizar problemas pré-existentes.
   */
  applyRule(rule, filePath, content, patch) {
    const changedLines = this._parseChangedLineNumbers(patch);

    if (rule.pattern) {
      // Regex: analisa apenas as linhas adicionadas do diff (ou arquivo completo sem patch)
      const analyzeContent = patch ? this._extractAddedContent(patch) : content;
      if (!analyzeContent) return;

      const matches = analyzeContent.match(new RegExp(rule.pattern, 'g'));
      if (matches) {
        matches.forEach((match) => {
          const result = rule.check ? rule.check(match, filePath, this.enumMatcher) : {
            message: `Padrão detectado: ${match}`,
          };
          if (result) {
            this.addIssue(filePath, rule.id, rule.severity, result, match);
          }
        });
      }
    } else if (rule.check) {
      if (!content) return;
      // Função: roda no arquivo completo mas filtra pelo número de linha alterada
      const result = rule.check(content, filePath, this.enumMatcher);

      if (result) {
        if (Array.isArray(result)) {
          result
            .filter(issue => !changedLines || issue.line == null || changedLines.has(issue.line))
            .forEach((issue) => {
              this.addIssue(filePath, rule.id, rule.severity, issue, null, issue.line);
            });
        } else {
          if (!changedLines || result.line == null || changedLines.has(result.line)) {
            this.addIssue(filePath, rule.id, rule.severity, result);
          }
        }
      }
    }
  }

  /**
   * Retorna um Set com os números de linha (lado novo) alterados no patch.
   * Retorna null quando não há patch disponível (sem filtragem).
   */
  _parseChangedLineNumbers(patch) {
    if (!patch) return null;
    const changedLines = new Set();
    let currentLine = 0;
    for (const line of patch.split('\n')) {
      const hunk = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunk) {
        currentLine = parseInt(hunk[1], 10) - 1;
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        changedLines.add(++currentLine);
      } else if (!line.startsWith('-')) {
        currentLine++;
      }
    }
    return changedLines;
  }

  /**
   * Extrai somente as linhas adicionadas (+) do patch para análise por regex.
   */
  _extractAddedContent(patch) {
    return patch.split('\n')
      .filter(line => line.startsWith('+') && !line.startsWith('+++'))
      .map(line => line.substring(1))
      .join('\n');
  }

  /**
   * Adiciona uma issue à lista
   */
  addIssue(filePath, ruleId, severity, result, matchedText = null, lineNumber = null) {
    const issue = {
      file: filePath,
      ruleId,
      severity,
      message: result.message,
      suggestion: result.suggestion || null,
      matchedText,
      line: lineNumber || this.findLineNumber(matchedText, filePath),
    };

    this.issues.push(issue);
  }

  /**
   * Encontra o número da linha onde ocorreu o match
   */
  findLineNumber(matchedText, filePath) {
    // Implementação simplificada - pode ser melhorada
    return null;
  }

  /**
   * Verifica se o arquivo deve ser ignorado na análise
   */
  shouldIgnoreFile(filePath) {
    const ignoredPatterns = [
      'swagger_output.json',
      'package.json',
      'package-lock.json',
      'yarn.lock',
      '.eslintrc',
      '.babelrc',
      'node_modules/',
      'coverage/',
      'logs/',
      '.git/',
      '__mocks__/',
      'keyfile.',
      '.yaml',
      '.yml',
      '.md',
      '.sh',
    ];

    return ignoredPatterns.some((pattern) => filePath.includes(pattern));
  }

  /**
   * Analisa múltiplos arquivos de uma PR
   * @param {Array} files - Lista de arquivos modificados
   * @returns {Object} Mapa de issues por arquivo
   */
  analyzeFiles(files) {
    const issuesByFile = {};

    files.forEach((file) => {
      const fileIssues = this.analyzeFile(file.filename, file.content, file.patch);

      if (fileIssues.length > 0) {
        issuesByFile[file.filename] = fileIssues;
      }
    });

    return issuesByFile;
  }

  /**
   * Gera relatório de análise
   */
  generateReport(issuesByFile) {
    const report = {
      totalFiles: Object.keys(issuesByFile).length,
      totalIssues: 0,
      issuesBySeverity: {
        error: 0,
        warning: 0,
      },
      files: {},
    };

    Object.keys(issuesByFile).forEach((file) => {
      const issues = issuesByFile[file];
      report.totalIssues += issues.length;

      issues.forEach((issue) => {
        if (issue.severity === 'error') {
          report.issuesBySeverity.error++;
        } else {
          report.issuesBySeverity.warning++;
        }
      });

      report.files[file] = {
        issuesCount: issues.length,
        issues,
      };
    });

    return report;
  }

  /**
   * Formata issues para comentários do GitHub
   */
  formatForGitHub(issuesByFile) {
    const comments = [];

    Object.keys(issuesByFile).forEach((file) => {
      issuesByFile[file].forEach((issue) => {
        const emoji = issue.severity === 'error' ? '🚨' : '⚠️';
        const severityLabel = issue.severity === 'error' ? '**ERRO**' : '**ATENÇÃO**';

        let comment = `${emoji} ${severityLabel} - \`${issue.ruleId}\`\n\n`;
        comment += `**Arquivo:** \`${file}\`\n\n`;

        if (issue.line) {
          comment += `**Linha:** ${issue.line}\n\n`;
        }

        comment += `**Problema:**\n${issue.message}\n\n`;

        if (issue.suggestion) {
          comment += `**Sugestão:**\n${issue.suggestion}\n\n`;
        }

        if (issue.matchedText) {
          comment += `**Código:**\n\`\`\`js\n${issue.matchedText}\n\`\`\`\n`;
        }

        comments.push({
          file: file,
          line: issue.line,
          body: comment,
          severity: issue.severity,
          ruleId: issue.ruleId,
        });
      });
    });

    return comments;
  }

  /**
   * Formata issues para comentários do Bitbucket
   * Similar ao GitHub, mas com adaptações para a API do Bitbucket
   */
  formatForBitbucket(issuesByFile) {
    const comments = [];

    Object.keys(issuesByFile).forEach((file) => {
      issuesByFile[file].forEach((issue) => {
        const emoji = issue.severity === 'error' ? '🚨' : '⚠️';
        const severityLabel = issue.severity === 'error' ? '**ERRO**' : '**ATENÇÃO**';

        let comment = `${emoji} ${severityLabel} - \`${issue.ruleId}\`\n\n`;
        comment += `**Arquivo:** \`${file}\`\n\n`;

        if (issue.line) {
          comment += `**Linha:** ${issue.line}\n\n`;
        }

        comment += `**Problema:**\n${issue.message}\n\n`;

        if (issue.suggestion) {
          comment += `**Sugestão:**\n${issue.suggestion}\n\n`;
        }

        if (issue.matchedText) {
          comment += `**Código:**\n\`\`\`javascript\n${issue.matchedText}\n\`\`\`\n`;
        }

        comments.push({
          file: file,
          path: file, // Bitbucket usa 'path' ao invés de 'file'
          line: issue.line,
          body: comment,
          severity: issue.severity,
          ruleId: issue.ruleId,
        });
      });
    });

    return comments;
  }

  /**
   * Analisa conformidade com issue/tarefa
   * @param {Object} issue - Dados da issue do GitHub/Jira
   * @param {Array} files - Arquivos modificados na PR
   * @returns {Object} Análise de conformidade
   */
  analyzeIssueCompliance(issue, files) {
    const compliance = {
      hasTests: false,
      hasDocumentation: false,
      modifiedFiles: files.map(f => f.filename),
      recommendations: [],
    };

    // Verifica se há testes para novos arquivos de serviço
    const serviceFiles = files.filter(f => f.filename.includes('/services/components/'));
    const testFiles = files.filter(f => f.filename.includes('__tests__/'));

    if (serviceFiles.length > 0 && testFiles.length === 0) {
      compliance.recommendations.push({
        severity: 'warning',
        message: 'Foram modificados/criados arquivos de serviço mas não foram adicionados testes correspondentes.',
        suggestion: 'Adicione testes em __tests__/services/components/ seguindo o padrão do projeto.',
      });
    } else if (testFiles.length > 0) {
      compliance.hasTests = true;
    }

    // Verifica documentação para novos endpoints
    const controllerFiles = files.filter(f => f.filename.includes('/controllers/'));
    if (controllerFiles.length > 0) {
      // Verifica se swagger foi atualizado (em prod seria verificado no commit)
      compliance.recommendations.push({
        severity: 'info',
        message: 'Foram modificados controllers. Certifique-se de que o Swagger foi atualizado.',
        suggestion: 'Execute `npm run swagger` para regenerar a documentação.',
      });
    }

    // Analisa título e descrição da issue em relação aos arquivos
    if (issue && issue.title) {
      const issueKeywords = this.extractKeywords(issue.title + ' ' + (issue.body || ''));
      const fileKeywords = files.map(f => this.extractKeywords(f.filename)).flat();

      const hasAlignment = issueKeywords.some(keyword =>
        fileKeywords.some(fk => fk.includes(keyword) || keyword.includes(fk))
      );

      if (!hasAlignment) {
        compliance.recommendations.push({
          severity: 'info',
          message: 'Os arquivos modificados podem não estar alinhados com o escopo da issue.',
          suggestion: 'Verifique se todas as mudanças são relevantes para a issue referenciada.',
        });
      }
    }

    return compliance;
  }

  /**
   * Extrai palavras-chave de um texto
   */
  extractKeywords(text) {
    if (!text) return [];

    const normalized = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    return [...new Set(normalized)];
  }
}
