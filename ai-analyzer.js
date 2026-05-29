/**
 * AI Analyzer - Análise de código usando LLMs (Claude/GPT)
 * Enriquece a análise de regras estáticas com inteligência artificial
 */

import axios from 'axios';

export default class AIAnalyzer {
  constructor(provider = 'claude', apiKey = null) {
    this.provider = provider.toLowerCase();
    this.apiKey = apiKey;
    this.enabled = !!apiKey;

    // Controle de rate limiting
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.rateLimitWindow = 60000; // 60 segundos

    // Rate limits por provider (requisições por minuto)
    this.rateLimits = {
      'claude': 50,
      'openai': 60,
      'github-models': 10,
    };

    // Configurações por provider
    this.config = {
      claude: {
        baseURL: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-5-sonnet-20241022',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2024-06-01',
          'content-type': 'application/json',
        },
      },
      openai: {
        baseURL: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
      },
      'github-models': {
        baseURL: 'https://models.inference.ai.azure.com/chat/completions',
        model: 'gpt-4o',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
      },
    };
  }

  /**
   * Analisa um arquivo usando IA
   * @param {string} filePath - Caminho do arquivo
   * @param {string} content - Conteúdo do arquivo
   * @param {string} patch - Diff do arquivo
   * @param {Object} staticIssues - Issues detectadas pelas regras estáticas
   * @param {Object} jiraContext - Contexto da issue do Jira (opcional)
   * @returns {Promise<Object>} Análise da IA
   */
  async analyzeFile(filePath, content, patch, staticIssues = [], jiraContext = null) {
    if (!this.enabled) {
      return null;
    }

    try {
      const prompt = this.buildPrompt(filePath, content, patch, staticIssues, jiraContext);
      const response = await this.callLLM(prompt);
      return this.parseResponse(response);
    } catch (error) {
      if (this._isQuotaError(error)) {
        throw error;
      }
      console.warn(`⚠️  Erro na análise com IA (${filePath}): ${error.message}`);
      if (error.response && error.response.data) {
        console.warn(`   Detalhes: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  _isQuotaError(error) {
    if (error.response?.status !== 429) return false;
    const code = error.response?.data?.error?.code;
    const type = error.response?.data?.error?.type;
    return code === 'insufficient_quota' || type === 'insufficient_quota';
  }

  /**
   * Verifica se é um erro de rate limit (não quota)
   * @private
   */
  _isRateLimitError(error) {
    if (error.response?.status !== 429) return false;
    const code = error.response?.data?.error?.code;
    const message = error.response?.data?.error?.message || '';
    // Rate limit é diferente de insufficient_quota
    return code === 'RateLimitReached' || message.includes('Rate limit');
  }

  /**
   * Extrai o tempo de espera sugerido do erro 429
   * @private
   */
  _getRetryAfter(error) {
    // Tenta header Retry-After
    const retryAfter = error.response?.headers['retry-after'];
    if (retryAfter) {
      return parseInt(retryAfter) * 1000; // Converte para ms
    }

    // Tenta extrair da mensagem de erro
    const message = error.response?.data?.error?.message || '';
    const match = message.match(/wait (\d+) seconds?/i);
    if (match) {
      return parseInt(match[1]) * 1000; // Converte para ms
    }

    // Fallback: backoff exponencial baseado na tentativa
    return null;
  }

  /**
   * Aguarda antes da próxima requisição (rate limiting)
   * @private
   */
  async _waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Limpa contador se passou a janela de tempo
    if (timeSinceLastRequest > this.rateLimitWindow) {
      this.requestCount = 0;
    }

    // Se atingiu o limite, aguarda
    const limit = this.rateLimits[this.provider] || 50;
    if (this.requestCount >= limit) {
      const waitTime = this.rateLimitWindow - timeSinceLastRequest;
      if (waitTime > 0) {
        const waitSeconds = Math.ceil(waitTime / 1000);
        process.stdout.write(`\n   ⏳ Rate limit atingido (${this.requestCount}/${limit}). Aguardando ${waitSeconds}s...\n`);
        await this._sleep(waitTime, true);
        this.requestCount = 0;
      }
    }

    // Delay mínimo entre requisições (evita burst)
    const minDelay = this.provider === 'github-models' ? 6500 : 1000; // ~9 req/min para GitHub
    if (timeSinceLastRequest < minDelay) {
      await this._sleep(minDelay - timeSinceLastRequest);
    }

    this.requestCount++;
    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep helper com contador dinâmico
   * @private
   */
  async _sleep(ms, showProgress = false) {
    if (!showProgress || ms < 1000) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    const startTime = Date.now();
    const endTime = startTime + ms;

    return new Promise((resolve) => {
      const updateInterval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.ceil((endTime - now) / 1000);

        if (remaining <= 0) {
          clearInterval(updateInterval);
          // Limpa a linha e move o cursor para o início
          process.stdout.write('\r\x1b[K');
          resolve();
        } else {
          // Atualiza na mesma linha
          process.stdout.write(`\r   ⏳ Aguardando rate limit: ${remaining}s restantes...`);
        }
      }, 1000);

      // Cleanup final após o tempo total
      setTimeout(() => {
        clearInterval(updateInterval);
        process.stdout.write('\r\x1b[K');
        resolve();
      }, ms);
    });
  }

  /**
   * Analisa múltiplos arquivos em lote
   * @param {Array} files - Array de objetos {filePath, content, patch, staticIssues}
   * @param {Object} jiraContext - Contexto da issue do Jira (opcional)
   * @returns {Promise<Array>} Análises da IA
   */
  async analyzeFiles(files, jiraContext = null) {
    if (!this.enabled || files.length === 0) {
      return [];
    }

    const rateLimit = this.rateLimits[this.provider] || 50;
    console.log(`\n🤖 Analisando ${files.length} arquivo(s) com IA (${this.provider})...`);
    console.log(`   Rate limit: ${rateLimit} requisições/minuto`);

    const results = [];
    let fileIndex = 0;

    for (const file of files) {
      fileIndex++;
      try {
        console.log(`   [${fileIndex}/${files.length}] Analisando ${file.filePath}...`);
        const analysis = await this.analyzeFile(
          file.filePath,
          file.content,
          file.patch,
          file.staticIssues,
          jiraContext
        );
        if (analysis) {
          results.push({ filePath: file.filePath, analysis });
          console.log(`   ✅ [${fileIndex}/${files.length}] Análise completa`);
        }
      } catch (error) {
        if (this._isQuotaError(error)) {
          console.warn(`\n⚠️  Cota da IA excedida. Análise com IA desabilitada para esta execução.`);
          console.warn(`   Verifique o plano e créditos do provider: ${this.provider}\n`);
          this.enabled = false;
          break;
        }
        console.warn(`   ⚠️  [${fileIndex}/${files.length}] Erro na análise: ${error.message}`);
      }
    }

    console.log(`✅ Análise com IA concluída: ${results.length}/${files.length} arquivo(s)`);
    return results;
  }

  /**
   * Gera um resumo geral da PR usando IA
   * @param {Object} prData - Dados da PR
   * @param {Array} files - Arquivos modificados
   * @param {Object} staticAnalysis - Análise estática completa
   * @param {Object} jiraContext - Contexto da issue do Jira (opcional)
   * @returns {Promise<Object>} Resumo inteligente
   */
  async generatePRSummary(prData, files, staticAnalysis, jiraContext = null) {
    if (!this.enabled) {
      return null;
    }

    try {
      const prompt = this.buildPRSummaryPrompt(prData, files, staticAnalysis, jiraContext);
      const response = await this.callLLM(prompt);
      return this.parseSummaryResponse(response);
    } catch (error) {
      if (this._isQuotaError(error)) {
        console.warn(`\n⚠️  Cota da IA excedida. Resumo da PR ignorado.\n`);
        this.enabled = false;
        return null;
      }
      console.warn(`⚠️  Erro ao gerar resumo com IA: ${error.message}`);
      if (error.response && error.response.data) {
        console.warn(`   Detalhes: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  /**
   * Constrói o prompt para análise de arquivo
   * @private
   */
  buildPrompt(filePath, content, patch, staticIssues, jiraContext) {
    let prompt = `Você é um especialista em code review para projetos Node.js (Express, Sequelize e similares).

**Tarefa:** Analise o código modificado e forneça feedback construtivo.

**Arquivo:** ${filePath}

**Mudanças (diff):**
\`\`\`diff
${patch}
\`\`\`

**Issues detectadas por regras estáticas (${staticIssues.length}):**
${staticIssues.map((issue, i) => `${i + 1}. [${issue.severity}] ${issue.rule}: ${issue.message}`).join('\n') || 'Nenhuma'}
`;

    if (jiraContext && jiraContext.found) {
      prompt += `\n**Contexto da Issue (${jiraContext.key}):**
- Tipo: ${jiraContext.type}
- Prioridade: ${jiraContext.priority}
- Resumo: ${jiraContext.summary}
- Requisitos Técnicos: ${jiraContext.technicalRequirements.join(', ') || 'N/A'}
- Critérios de Aceite: ${jiraContext.acceptanceCriteria.join(', ') || 'N/A'}
`;
    }

    prompt += `\n**Instruções:**
1. Analise a qualidade do código (legibilidade, manutenibilidade, performance)
2. Identifique problemas de segurança ou bugs potenciais
3. Verifique se o código segue boas práticas de Node.js/Express
4. Se houver contexto do Jira, valide alinhamento com requisitos
5. Sugira melhorias específicas e acionáveis

**Formato de resposta (JSON):**
\`\`\`json
{
  "quality": {
    "score": 7,
    "comment": "Código bem estruturado, mas pode melhorar tratamento de erros"
  },
  "security": {
    "issues": ["SQL injection potencial na linha 45"],
    "severity": "high"
  },
  "performance": {
    "concerns": ["Loop desnecessário poderia ser otimizado"],
    "suggestions": ["Use find() ao invés de filter()[0]"]
  },
  "alignment": {
    "withJira": true,
    "concerns": ["Falta validação de permissões mencionada nos requisitos"]
  },
  "suggestions": [
    {
      "line": 45,
      "severity": "error",
      "message": "Adicione validação de entrada para prevenir SQL injection",
      "suggestion": "Use parâmetros preparados ou valide com Joi/Yup"
    }
  ]
}
\`\`\`

Responda APENAS com o JSON, sem texto adicional.`;

    return prompt;
  }

  /**
   * Constrói o prompt para resumo da PR
   * @private
   */
  buildPRSummaryPrompt(prData, files, staticAnalysis, jiraContext) {
    let prompt = `Você é um especialista em code review. Analise esta Pull Request e forneça um resumo executivo.

**PR:** #${prData.id} - ${prData.title}
**Autor:** ${prData.author.display_name}
**Arquivos modificados:** ${files.length}
**Issues estáticas encontradas:** ${staticAnalysis.totalIssues} (${staticAnalysis.issuesBySeverity.error} erros, ${staticAnalysis.issuesBySeverity.warning} avisos)
`;

    if (jiraContext && jiraContext.found) {
      prompt += `\n**Issue relacionada:** ${jiraContext.key} - ${jiraContext.summary}
**Tipo:** ${jiraContext.type} | **Prioridade:** ${jiraContext.priority}
**Requisitos:** ${jiraContext.technicalRequirements.length} requisito(s) técnico(s)
**Critérios:** ${jiraContext.acceptanceCriteria.length} critério(s) de aceite
`;
    }

    prompt += `\n**Arquivos modificados:**
${files.map(f => `- ${f.filename} (+${f.additions || 0}/-${f.deletions || 0})`).join('\n')}

**Análise:**
1. Avalie a qualidade geral da PR (scope, coesão, clareza)
2. Identifique riscos ou problemas críticos
3. Valide completude em relação aos requisitos (se houver issue)
4. Recomende: APPROVE, REQUEST_CHANGES ou COMMENT

**Formato de resposta (JSON):**
\`\`\`json
{
  "overallQuality": 8,
  "recommendation": "REQUEST_CHANGES",
  "summary": "PR implementa exportação de veículos corretamente, mas há 2 erros críticos de imports",
  "strengths": [
    "Boa cobertura de testes",
    "Código bem estruturado"
  ],
  "concerns": [
    "Uso de require() ao invés de import ES6",
    "Falta validação de permissões (requisito #4)"
  ],
  "risks": {
    "level": "medium",
    "items": ["Performance pode ser impactada com grandes volumes"]
  },
  "jiraAlignment": {
    "complete": false,
    "missingRequirements": ["Validação de permissões não detectada"]
  }
}
\`\`\`

Responda APENAS com o JSON, sem texto adicional.`;

    return prompt;
  }

  /**
   * Chama o LLM (Claude ou OpenAI) com retry e rate limiting
   * @private
   */
  async callLLM(prompt, retryCount = 0, maxRetries = 3) {
    const cfg = this.config[this.provider];
    if (!cfg) {
      throw new Error(`Provider não suportado: ${this.provider}. Use 'claude', 'openai' ou 'github-models'.`);
    }

    // Aguarda rate limit antes de fazer a requisição
    await this._waitForRateLimit();

    let requestBody;

    if (this.provider === 'claude') {
      requestBody = {
        model: cfg.model,
        max_tokens: 4096,
        messages: [
          { role: 'user', content: prompt },
        ],
      };
    } else if (this.provider === 'openai' || this.provider === 'github-models') {
      requestBody = {
        model: cfg.model,
        messages: [
          { role: 'system', content: 'Você é um especialista em code review para Node.js/Express.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      };
    }

    try {
      const response = await axios.post(cfg.baseURL, requestBody, {
        headers: cfg.headers,
        timeout: 60000,
      });

      // Extrai conteúdo da resposta
      if (this.provider === 'claude') {
        return response.data.content[0].text;
      } else if (this.provider === 'openai' || this.provider === 'github-models') {
        return response.data.choices[0].message.content;
      }
    } catch (error) {
      // Se for erro de quota, propaga sem retry
      if (this._isQuotaError(error)) {
        throw error;
      }

      // Se for rate limit e ainda tem retries, tenta novamente
      if (this._isRateLimitError(error) && retryCount < maxRetries) {
        // Tenta extrair tempo de espera do erro
        let waitTime = this._getRetryAfter(error);

        // Se não conseguiu extrair, usa backoff exponencial
        if (!waitTime) {
          waitTime = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30s
        }

        const waitSeconds = Math.ceil(waitTime / 1000);
        process.stdout.write(`\n   ⏳ Rate limit atingido. Tentativa ${retryCount + 1}/${maxRetries}. Aguardando ${waitSeconds}s...\n`);
        await this._sleep(waitTime, true);

        // Retry recursivo
        return this.callLLM(prompt, retryCount + 1, maxRetries);
      }

      // Qualquer outro erro ou sem mais retries, propaga
      throw error;
    }
  }

  /**
   * Parse da resposta da IA (análise de arquivo)
   * @private
   */
  parseResponse(responseText) {
    try {
      // Extrai JSON do texto (pode vir com markdown)
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
        responseText.match(/({[\s\S]*})/);

      if (!jsonMatch) {
        throw new Error('Resposta não contém JSON válido');
      }

      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (error) {
      console.warn('⚠️  Erro ao fazer parse da resposta da IA:', error.message);
      return null;
    }
  }

  /**
   * Parse da resposta da IA (resumo da PR)
   * @private
   */
  parseSummaryResponse(responseText) {
    return this.parseResponse(responseText);
  }

  /**
   * Formata análise da IA para comentários do Bitbucket
   * @param {Array} aiAnalyses - Análises da IA por arquivo
   * @returns {Array} Comentários formatados
   */
  formatAIComments(aiAnalyses) {
    const comments = [];

    for (const { filePath, analysis } of aiAnalyses) {
      if (!analysis || !analysis.suggestions) continue;

      for (const suggestion of analysis.suggestions) {
        comments.push({
          file: filePath,
          line: suggestion.line || null,
          severity: suggestion.severity || 'info',
          body: `🤖 **AI Review**\n\n${suggestion.message}\n\n💡 **Sugestão:** ${suggestion.suggestion}`,
        });
      }

      // Adiciona comentários gerais de qualidade/segurança
      if (analysis.security && analysis.security.issues.length > 0) {
        comments.push({
          file: filePath,
          line: null,
          severity: 'error',
          body: `🔒 **Problemas de Segurança Detectados**\n\n${analysis.security.issues.map(i => `- ${i}`).join('\n')}`,
        });
      }
    }

    return comments;
  }
}
