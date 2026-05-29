# 🤖 Guia de Integração com IA (Claude/GPT)

## 📋 Visão Geral

O Code Review Bot agora suporta análise inteligente usando LLMs (Claude ou GPT), enriquecendo a análise de regras estáticas com insights de inteligência artificial.

## 🎯 Benefícios da Análise com IA

### Além das Regras Estáticas

**Regras Estáticas (30+ regras):**
- ✅ Detecta padrões específicos do projeto
- ✅ Valida conformidade com style guide
- ✅ Identifica violações de padrões (imports, formatação, etc.)
- ⚠️ Limitado a padrões predefinidos

**Análise com IA:**
- ✅ Avalia qualidade geral do código
- ✅ Detecta bugs sutis e problemas de lógica
- ✅ Identifica problemas de segurança (SQL injection, XSS, etc.)
- ✅ Sugere melhorias de performance
- ✅ Valida alinhamento inteligente com requisitos do Jira
- ✅ Compreende contexto e intenção do código
- ✅ Fornece sugestões acionáveis e personalizadas

### Análise Híbrida = Melhor dos Dois Mundos

```
Regras Estáticas (precisão) + IA (inteligência) = Code Review Completo
```

## ⚙️ Configuração

### 1. Escolha o Provider

**Claude (Anthropic)** - Recomendado
- Modelo: `claude-3-5-sonnet-20241022`
- Excelente em análise de código
- API Key: https://console.anthropic.com/

**GPT (OpenAI)**
- Modelo: `gpt-4o`
- Boa alternativa
- API Key: https://platform.openai.com/api-keys

**GitHub Models** - Alternativa com infraestrutura Azure
- Modelo: `gpt-4o` (e outros disponíveis)
- Usa infraestrutura Azure via GitHub
- API Key: GitHub Personal Access Token com acesso a Models
- Configuração: https://github.com/marketplace/models

### 2. Configure Variáveis de Ambiente

Edite `.env`:

```bash
# ===== Configuração de IA =====
AI_PROVIDER=claude          # ou 'openai' ou 'github-models'
AI_API_KEY=sk-ant-...      # Sua API key
```

**Custos Estimados (por PR típica com 5 arquivos):**

| Provider | Custo/PR | Custo/mês (50 PRs) | Notas |
|----------|----------|-------------------|-------|
| Claude   | ~$0.10   | ~$5.00            | Melhor para análise de código |
| OpenAI   | ~$0.15   | ~$7.50            | Boa alternativa |
| GitHub Models | Variável | Depende do plano | Pode ter tier gratuito |

### 3. Execute o Bot

```bash
cd scripts/code-review-bot
node index.js 1912
```

O bot automaticamente detecta se a API key está configurada e habilita análise com IA.

## 📊 Exemplo de Análise

### Saída do Terminal

```
🤖 Análise com IA habilitada (claude)

⏳ Buscando informações da PR #1912...
✅ PR encontrada: PROJ-123

⏳ Analisando código...
✅ Análise concluída

📊 RELATÓRIO DE CODE REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 Arquivos analisados: 5
🔍 Issues encontradas: 10
   🚨 Erros: 2
   ⚠️  Avisos: 8

🤖 Analisando 5 arquivo(s) com IA (claude)...
✅ Análise com IA concluída: 5 arquivo(s)

🤖 ANÁLISE COM INTELIGÊNCIA ARTIFICIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Qualidade Geral: 8/10

📝 Resumo: PR implementa exportação de veículos corretamente, mas há problemas
de imports e falta validação de permissões mencionada nos requisitos.

✅ PONTOS FORTES:

   ✓ Boa cobertura de testes (unitários + integração)
   ✓ Código bem estruturado seguindo padrões do projeto
   ✓ Tratamento de erros adequado
   ✓ Service reutilizável e bem isolado

⚠️  PREOCUPAÇÕES:

   • Uso de require() ao invés de import ES6 em testes
   • Falta validação de permissões (requisito #4 do Jira)
   • Linha 45 pode causar SQL injection se não houver validação
   • Loop na linha 62 poderia ser otimizado com .find()

🟡 RISCOS (MEDIUM):

   ⚠️  Performance pode degradar com grandes volumes de dados
   ⚠️  Falta rate limiting na exportação

📋 ALINHAMENTO COM JIRA:

   ⚠️ Completude: Incompleto
   
   Requisitos faltantes:
   - Validação de permissões não detectada no código

🔴 RECOMENDAÇÃO DA IA: REQUEST_CHANGES

🤖 +3 sugestão(ões) da IA adicionada(s)
```

## 💬 Comentários da IA no Review

### Exemplo de Comentário Inline

```markdown
📍 src/services/components/vehicle/export/VehicleExport.js (linha 45)

🤖 **AI Review**

SQL injection potencial: A query usa concatenação de strings com dados de entrada.

💡 **Sugestão:** Use parâmetros preparados do Sequelize ou valide 
rigorosamente a entrada com Joi/Yup antes de usar em queries.

Exemplo seguro:
```js
const results = await Vehicle.findAll({
  where: {
    daysInStock: { [Op.gte]: searchParameter.minDays }
  }
});
```
```

### Exemplo de Comentário de Segurança

```markdown
🔒 **Problemas de Segurança Detectados**

- Linha 45: SQL injection potencial via concatenação de strings
- Linha 78: Dados sensíveis podem vazar em logs de erro
- Falta validação de origem CORS para endpoints de exportação
```

## 🎯 Casos de Uso

### 1. Code Review Completo

```bash
# Análise estática + IA + Jira
AI_API_KEY=sk-ant-... node index.js 1912
```

**Resultado:**
- 30+ regras estáticas verificadas
- Análise de qualidade, segurança e performance pela IA
- Validação inteligente com requisitos do Jira
- Sugestões acionáveis

### 2. Apenas Regras Estáticas (sem custo)

```bash
# Remove AI_API_KEY do .env ou deixe vazio
node index.js 1912
```

### 3. Review Crítico (Bugs de Produção)

```bash
# Use análise com IA para bugs complexos
AI_PROVIDER=claude node index.js 1912
```

A IA pode detectar problemas sutis que regras estáticas não capturam.

## 🔧 Configuração Avançada

### Customizar Modelo

Edite `ai-analyzer.js`:

```js
this.config = {
  claude: {
    model: 'claude-3-5-sonnet-20241022', // Altere aqui
    // ...
  },
  openai: {
    model: 'gpt-4o', // ou 'gpt-4-turbo'
    // ...
  },
};
```

### Ajustar Temperatura (OpenAI)

```js
requestBody = {
  model: cfg.model,
  temperature: 0.3, // 0.0 = determinístico, 1.0 = criativo
  // ...
};
```

### Timeout da Requisição

```js
const response = await axios.post(cfg.baseURL, requestBody, {
  headers: cfg.headers,
  timeout: 60000, // 60 segundos (altere aqui)
});
```

## 📈 Métricas e Monitoramento

### Logs de Execução

O bot exibe:
- ✅ Número de arquivos analisados com IA
- ✅ Número de sugestões geradas
- ⚠️ Erros de API (com fallback para análise estática)

### Exemplo de Log

```
🤖 Analisando 5 arquivo(s) com IA (claude)...
✅ Análise com IA concluída: 5 arquivo(s)
⚠️  Erro na análise com IA: Rate limit exceeded
   (Continuando com análise estática)
```

## 🛡️ Segurança

### Proteção de API Keys

- ✅ API keys nunca são commitadas (`.env` no `.gitignore`)
- ✅ Nenhum dado sensível enviado para a IA
- ✅ Apenas código e diffs são enviados

### Dados Enviados para a IA

```json
{
  "conteúdo": "Código do arquivo",
  "diff": "Mudanças (+/-)",
  "issues_estáticas": "Problemas detectados localmente",
  "contexto_jira": "Requisitos e critérios (sem dados sensíveis)"
}
```

**NÃO enviado:**
- Credenciais
- Tokens de acesso
- Dados de banco de dados
- Informações de infraestrutura

## 🚨 Troubleshooting

### Erro: "API key inválida"

```bash
⚠️  Erro na análise com IA: Invalid API key
```

**Solução:**
1. Verifique se a API key está correta no `.env`
2. Confirme que a key tem créditos disponíveis
3. Valide o formato: Claude (`sk-ant-...`), OpenAI (`sk-...`)

### Erro: "Rate limit exceeded"

```bash
⚠️  Erro na análise com IA: Rate limit exceeded
⏳ Rate limit atingido. Tentativa 1/3. Aguardando 17s...
⏳ Aguardando rate limit: 16s restantes...  # Contador em tempo real
⏳ Aguardando rate limit: 15s restantes...
⏳ Aguardando rate limit: 14s restantes...
...
```

**O que acontece:**
- O bot **automaticamente detecta** erros 429 (Rate Limit)
- **Extrai o tempo de espera** sugerido pela API (ex: 17 segundos)
- **Mostra contador dinâmico** atualizando em tempo real a cada segundo
- **Tenta novamente** até 3 vezes com backoff exponencial
- **Controla a taxa** de requisições para evitar atingir o limite

**Rate limits por provider:**
- GitHub Models: 10 requisições/minuto (~6.5s entre requisições)
- Claude: 50 requisições/minuto
- OpenAI: 60 requisições/minuto

**Comportamento esperado:**
```bash
🤖 Analisando 15 arquivo(s) com IA (github-models)...
   Rate limit: 10 requisições/minuto
   [1/15] Analisando src/controllers/UserController.js...
   ✅ [1/15] Análise completa
   [2/15] Analisando src/services/UserService.js...
   ✅ [2/15] Análise completa
   ...
   [10/15] Analisando src/models/User.js...
   
   ⏳ Rate limit atingido (10/10). Aguardando 47s...
   ⏳ Aguardando rate limit: 46s restantes...
   ⏳ Aguardando rate limit: 45s restantes...
   ...
   ⏳ Aguardando rate limit: 1s restantes...
   
   [11/15] Analisando src/repositories/UserRepository.js...
   ✅ [11/15] Análise completa
   ...
✅ Análise com IA concluída: 15/15 arquivo(s)
```

**Recursos do contador:**
- ⏱️ Atualização em tempo real (a cada segundo)
- 🎯 Mostra tempo restante preciso
- 🧹 Limpeza automática da linha após conclusão
- 👁️ Feedback visual contínuo para o usuário

**Solução manual (apenas se necessário):**
1. Aguarde alguns minutos para o limite resetar
2. Aumente o tier da sua conta na plataforma
3. Use modo de análise estática (`--dry-run` sem IA)
4. Reduza número de arquivos analisados por PR

### IA não está sendo usada

```bash
# Bot executa mas não mostra "Análise com IA habilitada"
```

**Verificar:**
```bash
# 1. Confirme que AI_API_KEY está definida
echo $AI_API_KEY

# 2. Verifique se está no .env (ajuste o caminho conforme sua instalação)
cat scripts/.env.code-review-bot | grep AI_API_KEY   # link simbólico / install.sh
# ou: cat .env | grep AI_API_KEY                      # repositório do bot ou clone local

# 3. Recarregue variáveis de ambiente
source .env
```

## 💡 Dicas

### 1. Use IA para PRs Complexas

Análise estática é suficiente para PRs simples. Reserve a IA para:
- Mudanças críticas de segurança
- Refatorações grandes
- Bugs complexos de produção
- Validação de lógica de negócio

### 2. Combine com Jira

A IA é mais eficaz quando tem contexto do Jira:

```bash
# Análise enriquecida: Regras + IA + Jira
node index.js 1912
```

### 3. Otimize para Rate Limits

O bot implementa controle automático de rate limiting, mas você pode otimizar:

**GitHub Models (10 req/min):**
- ✅ PRs com até 10 arquivos: ~1 minuto
- ⚠️ PRs com 20 arquivos: ~2 minutos (aguarda automaticamente)
- 💡 Para PRs muito grandes, considere analisar apenas arquivos críticos

**Tempo estimado por arquivo:**
- GitHub Models: ~6-7 segundos/arquivo
- Claude/OpenAI: ~2-3 segundos/arquivo

**Demonstração do contador:**
```bash
# Execute o script de teste para ver o contador em ação
node test-rate-limit-counter.js
```

**Exemplo:**
```bash
# PR com 15 arquivos usando GitHub Models
🤖 Analisando 15 arquivo(s) com IA (github-models)...
   Rate limit: 10 requisições/minuto
   [1-10] ~1 minuto (primeira leva)
   ⏳ Aguardando 47s... (rate limit)
   [11-15] ~30 segundos (segunda leva)
✅ Total: ~2:17 minutos
```

### 4. Revise Sugestões da IA

A IA pode ocasionalmente:
- Fazer sugestões genéricas demais
- Não entender contexto específico do projeto
- Gerar falsos positivos

**Sempre valide** as sugestões antes de aplicar.

## 📊 Comparação: Com vs Sem IA

### PR #1912 - Exportação de Veículos

| Métrica | Sem IA | Com IA |
|---------|--------|--------|
| Issues detectadas | 10 | 13 |
| Problemas de segurança | 0 | 2 |
| Sugestões de performance | 0 | 3 |
| Tempo de análise | 15s | 45s |
| Alinhamento com Jira | Manual | Automático |
| Qualidade do review | 7/10 | 9/10 |

### Valor Agregado

- ✅ **+3 issues críticas** detectadas pela IA
- ✅ **2 vulnerabilidades de segurança** identificadas
- ✅ **Validação inteligente** com requisitos do Jira
- ✅ **Recomendação fundamentada** (REQUEST_CHANGES)

**Custo:** ~$0.10 por PR  
**Economia de tempo:** ~30 minutos de revisão manual

## 🎓 Próximos Passos

1. **Configure sua API key** no `.env`
2. **Execute em uma PR de teste** para ver os resultados
3. **Ajuste os prompts** em `ai-analyzer.js` conforme necessário
4. **Monitore custos** através do dashboard do provider
5. **Compare resultados** com e sem IA

---

**Dúvidas?** Consulte a [documentação completa](README.md) ou abra uma issue.
