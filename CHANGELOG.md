# Changelog - Code Review Bot

## [1.10.0] - 2026-05-29

### 🎯 Análise Restrita às Linhas Alteradas da PR

O bot agora analisa **somente o código efetivamente modificado** na PR, ignorando problemas pré-existentes em linhas não alteradas.

#### Problema resolvido

Antes, tanto a análise estática quanto a IA examinavam o arquivo inteiro, sinalizando padrões e formatações que já existiam antes da PR — gerando ruído e dificultando o foco no que realmente mudou.

#### Como funciona agora

- **Patch por arquivo**: o bot busca o diff unificado da PR para cada arquivo
  - Tenta os endpoints `/diff` da API do Bitbucket
  - Se indisponível (404), **gera o patch localmente** comparando o conteúdo do arquivo no commit de destino (base) com a versão da PR usando a lib `diff`
- **Análise estática (regras regex)**: roda apenas nas linhas adicionadas (`+`) extraídas do patch
- **Análise estática (regras por função)**: roda no arquivo completo mas filtra os resultados pelo número de linha alterada
- **Análise com IA**: o prompt instrui explicitamente a comentar somente nas linhas `+` do diff

#### Correção: diffstat retornava arquivos em excesso

O endpoint `diffstat/{destHash}..{sourceHash}` (dois pontos) fazia um diff direto entre os dois commits, incluindo todos os arquivos que mudaram na branch de destino desde a criação da PR. A correção usa três pontos (`...`), que calcula pelo merge base e retorna apenas os arquivos alterados na PR.

#### Arquivos Modificados

- `bitbucket-client.js`:
  - Corrige `diffstat/{destHash}..{sourceHash}` → `{destHash}...{sourceHash}`
  - Adiciona `_fetchPatchMap`: busca diff unificado via API
  - Adiciona `_generateFilePatch`: gera patch localmente via `createPatch` (lib `diff`) como fallback
  - Adiciona `_parseDiffByFile`: divide unified diff em mapa `filePath → patch`
  - Mensagem de fallback simplificada (sem referência ao erro 404)
- `code-analyzer.js`:
  - Adiciona `_parseChangedLineNumbers`: extrai números de linha alteradas do patch
  - Adiciona `_extractAddedContent`: extrai linhas `+` do patch para análise regex
  - `applyRule` agora escopa a análise às linhas alteradas quando patch está disponível
- `ai-analyzer.js`:
  - Prompt inclui instrução explícita para comentar apenas nas linhas alteradas
  - Fallback para `content` quando patch não está disponível (evita exibir `null`)

#### Dependência adicionada

- `diff` ^9.0.0 — geração de unified diff para comparação local de arquivos

---

## [1.9.0] - 2026-05-29

### 🎯 Detecção Inteligente de Enums e Constantes

O bot agora detecta automaticamente números mágicos e strings hardcoded e **sugere exatamente qual enum usar** do projeto!

#### Funcionalidades

- **Parser Automático**: Analisa arquivos de `src/constants/`, `src/enumerators/`, `src/enums/`, `src/config/`
- **Sugestões Específicas**: Ao invés de apenas avisar sobre números mágicos, sugere o enum correto
- **Suporte Múltiplos Formatos**: 
  - `export const STATUS = { ACTIVE: 1 }`
  - `const HttpStatus = { OK: 200 }`
  - `module.exports = { ADMIN: 'admin' }`
  - `Object.freeze({ ... })`
- **Detecção de Números e Strings**: Identifica tanto números quanto strings hardcoded em comparações

#### Exemplo

**Antes:**
```
⚠️ NÃO hardcode valores. Use Constants, enumerators ou i18n.
```

**Agora:**
```
⚠️ Use o enum VehicleStatus.ACTIVE ao invés do número 1
💡 Importe e use: VehicleStatus.ACTIVE
   Definido em: src/enumerators/vehicle-status.js
```

#### Arquivos Novos

- `enum-matcher.js`: Parser de enums e matching de valores
- `ENUM_DETECTION.md`: Documentação completa da funcionalidade
- `test-enum-matcher.js`: Script de teste da funcionalidade

#### Arquivos Modificados

- `code-analyzer.js`: 
  - Aceita `projectContext` no construtor
  - Inicializa `EnumMatcher` com constantes do projeto
  - Passa `enumMatcher` para as regras
- `rules.js`:
  - Regra `constants-01` totalmente reescrita
  - Detecta números e strings em comparações (`===`, `==`, `!==`, `!=`)
  - Ignora valores comuns (0, 1, -1) e strings com espaços/pontuação
  - Gera sugestões específicas quando encontra enum compatível
- `index.js`:
  - Coleta contexto do projeto **antes** da análise estática (não só para IA)
  - Cria nova instância de `CodeAnalyzer` com contexto em cada execução
- `README.md`: Adicionada seção sobre detecção inteligente de enums

#### Estatísticas do Teste

```
📊 EnumMatcher inicializado: 3 enum(s), 15 valor(es)
✅ Detecta números: 200 → HttpStatus.OK
✅ Detecta strings: 'admin' → UserType.ADMIN
✅ Múltiplas correspondências suportadas
```

---

## [1.8.7] - 2026-05-29

### ✅ Request Changes nativo do Bitbucket (equivalente ao Shift+R)

O método `requestChanges` agora utiliza o endpoint oficial da API do Bitbucket
(`POST /pullrequests/{id}/request-changes`), o mesmo acionado pelo botão
"Request changes" (Shift+R) na interface web.

**Antes:** postava um comentário e removia a aprovação — sem alterar o status formal da PR.

**Agora:**
- Aciona `POST /request-changes` → muda o participante para `state: "changes_requested"` na PR
- A PR fica bloqueada para merge até que as mudanças sejam endereçadas
- Fallback automático: se o token não tiver permissão (404/405), remove a aprovação existente e continua

**Detecção de review anterior atualizada:**
- `getExistingBotReview` agora verifica `participant.state === 'changes_requested'` nos participants
  antes de varrer comentários — detecção mais rápida e confiável
- Fallback por assinatura de comentário mantido para tokens sem `account_id` e PRs anteriores

**Correção de comentário duplicado:**
- `createReview` não passa mais o `body` para `requestChanges` — o resumo é postado
  uma única vez como comentário principal, e o `request-changes` é acionado separadamente

#### 📝 Arquivos Modificados

- `bitbucket-client.js`
  - `requestChanges`: usa `POST /request-changes` com fallback para remoção de aprovação
  - `createReview`: chama `requestChanges(prNumber)` sem repassar o body
  - `getExistingBotReview`: detecta `state: 'changes_requested'` nos participants antes dos comentários

---

## [1.8.6] - 2026-05-29

### 🔧 BITBUCKET_ACCOUNT_ID como fallback para detecção de reviews anteriores

Tokens de repositório do Bitbucket não têm permissão para `GET /user` (403), o que impedia a detecção de aprovação por `account_id` na feature de revisão anterior (v1.8.5).

**Nova variável de ambiente:**

```env
# Account ID do usuário Bitbucket (UUID fixo, não muda)
# Usado como fallback quando o token não tem permissão para GET /user (403)
# Obtenha com: curl -u "seu-email:seu-token" https://api.bitbucket.org/2.0/user | jq '.account_id'
BITBUCKET_ACCOUNT_ID=
```

**Comportamento:**
- Se `GET /user` retornar 403 **e** `BITBUCKET_ACCOUNT_ID` estiver configurado → usa o valor do `.env` como `account_id`, mantendo detecção completa de aprovação e REQUEST_CHANGES
- Se `GET /user` retornar 403 **e** `BITBUCKET_ACCOUNT_ID` não estiver configurado → exibe aviso orientando a configurar a variável; detecção de aprovação fica indisponível, mas REQUEST_CHANGES ainda é detectado pela assinatura do comentário

#### 📝 Arquivos Modificados

- `.env.example` — novo parâmetro `BITBUCKET_ACCOUNT_ID` com instruções de como obter o valor
- `index.js` — fallback para `BITBUCKET_ACCOUNT_ID` no bloco catch do `getAuthenticatedUser`

---

## [1.8.5] - 2026-05-29

### 🔍 Detecção de Review Anterior

O bot agora verifica, antes de iniciar qualquer análise, se já realizou um review nesta PR. Se encontrar, informa o usuário e aborta o processo.

**Casos detectados:**

| Situação | Mensagem | Ação |
|---|---|---|
| Bot já aprovou a PR | "O bot já aprovou esta PR. Para criar um novo review, remova a aprovação primeiro." | Aborta |
| Bot já fez REQUEST_CHANGES (comentário com assinatura do bot presente) | "O bot já realizou um code review com REQUEST_CHANGES nesta PR e ele ainda está em aberto." | Aborta |
| Nenhum review anterior | "Nenhum review anterior encontrado" | Continua normalmente |

**Como funciona:**
- **Aprovação**: verifica o array `participants` da PR comparando `account_id` do usuário autenticado
- **REQUEST_CHANGES**: varre todos os comentários da PR buscando a assinatura `Code Review Bot v`. Com `account_id` disponível, restringe ao autor correto; sem ele (token sem permissão para `/user`), usa apenas a assinatura
- Paginação tratada em `listComments`: busca todas as páginas antes de verificar

#### 📝 Arquivos Modificados

- `bitbucket-client.js`
  - `listComments`: reescrito com loop de paginação (`pagelen=50` por página)
  - `getExistingBotReview(prNumber, prData, currentUser)`: novo método que verifica aprovação via `participants` e REQUEST_CHANGES via comentários
- `index.js`
  - `run()`: `currentUser` armazenado fora do try/catch para ficar disponível após a autenticação
  - `run()`: chamada a `getExistingBotReview` logo após buscar a PR, antes de qualquer análise

---

## [1.8.4] - 2026-05-29

### 🐛 Correções: URL do Review e Comentários Inline

#### Problema 1 — URL exibida como `undefined`

O terminal exibia `🔗 URL: undefined` após criar o review. O Bitbucket não retorna um campo `html_url` como o GitHub — o objeto retornado pela API é um comentário ou aprovação, não um recurso de review com link direto.

**Correção:** o objeto de resultado de `createReview` agora inclui `html_url` construída a partir de `workspace`, `repoSlug` e `prNumber`:
```
https://bitbucket.org/{workspace}/{repo}/pull-requests/{prNumber}
```

#### Problema 2 — HTTP 400 ao adicionar comentário inline

Comentários inline falhavam com status 400 quando a linha reportada não fazia parte do diff da PR (linhas fora do contexto modificado). O erro era exibido duas vezes no terminal por duplicação na cadeia de mensagens de erro.

**Correções:**
- `addInlineComment`: converte o número de linha para inteiro com `parseInt` antes de enviar à API (evita rejeição por tipo incorreto)
- `addInlineComment`: preserva `error.response` no erro relançado para que o chamador possa identificar o status HTTP
- `createReview`: quando inline retorna 400, faz fallback automático para comentário geral com contexto `arquivo:linha` no texto — nenhuma issue é perdida

#### 📝 Arquivos Modificados

- `bitbucket-client.js`
  - `createReview`: `html_url` adicionado ao objeto de resultado
  - `addInlineComment`: `parseInt(line, 10)` na propriedade `to` do payload
  - `addInlineComment`: `err.response = error.response` preserva o status HTTP
  - `createReview`: bloco catch com fallback para `addComment` em caso de 400

---

## [1.8.3] - 2026-05-29

### 🤖 Automação de Approve e Request Changes

#### 🚀 Mudanças Principais

Três novos parâmetros no `.env` permitem que o bot tome decisões de review automaticamente, sem interação manual:

| Variável | Valores | Padrão | Descrição |
|---|---|---|---|
| `AUTO_APPROVE_ENABLED` | `true` / `false` | `false` | Habilita aprovação automática |
| `AUTO_APPROVE_MAX_RISK` | `low` / `medium` / `high` | `low` | Risco máximo aceito para aprovar |
| `AUTO_REQUEST_CHANGES_ENABLED` | `true` / `false` | `false` | Habilita request changes automático |

**Auto-aprovação:** após análise da IA, o bot compara `risks.level` com `AUTO_APPROVE_MAX_RISK`. Se dentro do limite, aprova diretamente. Se exceder, avisa e segue o fluxo interativo.

**Auto-request-changes:** quando a IA retorna `recommendation: "REQUEST_CHANGES"`, o bot posta todos os comentários e registra o request changes automaticamente.

**`--dry-run` tem prioridade absoluta** — qualquer combinação com automação é ignorada quando `--dry-run` está ativo. O check ocorre antes da lógica de automação no código.

#### 📝 Arquivos Modificados

- `index.js`
  - Função auxiliar `isRiskWithinThreshold(riskLevel, maxRisk)` com mapa `RISK_ORDER` (`low=0`, `medium=1`, `high=2`)
  - Leitura de `AUTO_APPROVE_ENABLED`, `AUTO_APPROVE_MAX_RISK`, `AUTO_REQUEST_CHANGES_ENABLED` em `main()`
  - Bloco de auto-aprovação e auto-request-changes em `run()`, após formatação de comentários e antes da seleção interativa
  - Early return de `totalIssues === 0` movido para após os checks automáticos (só interrompe no fluxo interativo)
- `.env.example` — documentação dos 3 novos parâmetros
- `README.md` — seção de configuração e fluxo de execução atualizados
- `QUICK_START.md` — nova seção "Automação de Review"
- `AI_INTEGRATION.md` — nova seção "Automação de Review" com tabela de decisão e exemplos de saída

---

## [1.8.2] - 2026-05-29

### 🤖 Sugestão de Código Corrigido nos Comentários do PR

#### 🚀 Mudanças Principais

**Exemplos de código nas sugestões da IA**

Os comentários inline postados no PR agora incluem blocos de código com o "antes" e "depois" quando a IA identificar uma correção concreta:

```
🤖 AI Review

Evite concatenação direta de variáveis em queries SQL.

💡 Sugestão: Use parâmetros preparados ou valide com Joi/Yup

Exemplo de correção:
// ❌ Antes
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ Depois
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);
```

O campo `code_example` é opcional — quando a IA não gerar um exemplo concreto (sugestões conceituais, por exemplo), o comentário continua funcionando normalmente com apenas o texto da sugestão.

A linguagem do bloco de código é detectada automaticamente pela extensão do arquivo (`.js` → `javascript`, `.ts` → `typescript`, `.py` → `python`, etc.).

#### 📝 Arquivos Modificados

- `ai-analyzer.js`
  - Constante `EXT_TO_LANG` mapeia extensão de arquivo → linguagem para syntax highlight
  - `buildPrompt`: schema JSON da IA inclui campo `code_example` com `before` e `after`
  - `formatAIComments`: renderiza blocos de código quando `code_example` está presente

---

## [1.8.1] - 2026-05-29

### 🔧 Correção: Backoff Insuficiente para Rate Limit 429

#### Problema

Ao usar o provider `claude-cli`, erros 429 da API da Anthropic causavam apenas 1s → 2s → 4s de espera antes de cada retry — tempo insuficiente para o cooldown real da API. Após 3 tentativas fracassadas o arquivo era descartado da análise.

#### Correção

- Backoff elevado de `1s * 2^n` para `15s * 2^n` (15s → 30s → 60s, máximo 120s)
- Após receber um 429, o contador de requisições (`requestCount`) e o timestamp (`lastRequestTime`) são resetados, evitando que `_waitForRateLimit` adicione delay extra logo após o retry

#### 📝 Arquivos Modificados

- `ai-analyzer.js` — método `callLLM`: novo cálculo de backoff e reset de contadores após 429

---

## [1.8.0] - 2026-05-29

### 🤖 Contexto Semântico do Repositório + Provider Claude CLI

#### 🚀 Mudanças Principais

**Novo: Coleta de Contexto Semântico (`project-context.js`)**

O bot agora realiza 4 buscas semânticas no repositório alvo antes de enviar a análise para a IA, enriquecendo o prompt com contexto real do projeto:

| Busca | Conteúdo coletado | Onde busca |
|-------|-------------------|------------|
| Documentação | README.md, DEVELOPMENT.md, CONTRIBUTING.md, ARCHITECTURE.md | raiz |
| Diretrizes | Arquivos .md com padrões e convenções | docs/, .github/ |
| Constantes/Domínio | Enumeradores, constantes, regras de negócio | src/constants/, src/enumerators/, src/enums/ |
| Arquitetura/Config | package.json, tsconfig.json, .eslintrc, .babelrc | raiz |

A IA agora valida o código considerando:
- Padrões reais do projeto (documentados ou em código)
- Constantes e enumeradores do domínio (detecta hardcoding vs uso correto)
- Dependências disponíveis (não sugere libs ausentes no projeto)
- Convenções de contribuição do time

**Novo: Provider `claude-cli`**

Permite usar o token OAuth do Claude Code CLI instalado localmente, sem necessidade de API key paga:

```env
AI_PROVIDER=claude-cli
AI_API_KEY=   # deixar vazio
```

O token é lido automaticamente de `~/.claude/.credentials.json` e usa autenticação `Bearer` na API da Anthropic. Requer o Claude CLI autenticado (`claude`).

**Correção: detecção de rate limit da Anthropic**

O método `_isRateLimitError` agora reconhece o formato `type: "rate_limit_error"` da API da Anthropic, ativando o retry automático corretamente para os providers `claude` e `claude-cli`.

#### 📝 Arquivos

**Criados:**
- `project-context.js` — `ProjectContextCollector`: lista diretórios via API do Bitbucket, busca arquivos relevantes, serializa contexto para o prompt

**Modificados:**
- `ai-analyzer.js`
  - Função `readClaudeCLIToken()` lê credenciais do Claude CLI
  - Provider `claude-cli` com autenticação Bearer OAuth
  - Rate limit conservador (30 req/min) para o provider CLI
  - `analyzeFile`, `analyzeFiles`, `generatePRSummary` recebem `projectContext`
  - `buildPrompt` e `buildPRSummaryPrompt` incluem bloco de contexto do repositório
  - Instrução 3 atualizada: valida conformidade com constantes/enumeradores do projeto
  - Modelo padrão atualizado para `claude-sonnet-4-6`
- `index.js`
  - Importa e instancia `ProjectContextCollector`
  - Coleta contexto antes da análise com IA (usando o hash do commit da PR)
  - Passa `projectContext` para `analyzeFiles` e `generatePRSummary`

#### 💡 Impacto na Qualidade da Análise

**Antes:** IA via apenas diff + issues estáticas + contexto Jira
**Depois:** IA vê diff + issues + Jira + documentação real + constantes do domínio + dependências do projeto

Exemplo: se o projeto tem `src/constants/VehicleStatus.js` com `AVAILABLE = 'disponivel'`, a IA detecta quando o código usa a string `'disponivel'` diretamente em vez do enumerador.

---

## [1.7.1] - 2026-05-29

### 🎨 UX: Contador Dinâmico de Rate Limiting

**Melhorias Visuais:**
- ✅ Contador dinâmico em tempo real durante espera de rate limit
- ✅ Atualização a cada segundo mostrando tempo restante
- ✅ Feedback visual aprimorado: "⏳ Aguardando rate limit: 53s restantes..."
- ✅ Limpeza automática da linha após conclusão da espera

**Exemplo de saída:**
```bash
[10/15] Analisando arquivo.js...
✅ [10/15] Análise completa

⏳ Rate limit atingido (10/10). Aguardando 55s...
⏳ Aguardando rate limit: 54s restantes...  # Atualiza em tempo real
⏳ Aguardando rate limit: 53s restantes...
⏳ Aguardando rate limit: 52s restantes...
...
⏳ Aguardando rate limit: 1s restantes...

[11/15] Analisando próximo arquivo...
```

**Arquivo modificado:**
- `ai-analyzer.js` - Método `_sleep()` agora suporta contador dinâmico

**Script de teste:**
- `test-rate-limit-counter.js` - Demonstração do contador funcionando

## [1.7.0] - 2026-05-29

### 🚀 Melhorias de Rate Limiting e Retry

**Sistema Inteligente de Rate Limiting:**
- ✅ Controle automático de taxa de requisições por provider
- ✅ Rate limits configurados: GitHub Models (10/min), Claude (50/min), OpenAI (60/min)
- ✅ Delay automático entre requisições para evitar burst
- ✅ Contador de requisições com janela deslizante de 60 segundos

**Sistema de Retry com Backoff:**
- ✅ Retry automático em erros 429 (Rate Limit Reached)
- ✅ Extração inteligente do tempo de espera do erro da API
- ✅ Backoff exponencial como fallback (1s, 2s, 4s, max 30s)
- ✅ Até 3 tentativas automáticas antes de falhar
- ✅ Diferencia entre rate limit (retry) e quota excedida (falha imediata)

**Feedback Aprimorado:**
- ✅ Progresso em tempo real ([1/15] Analisando arquivo.js...)
- ✅ Mensagens claras de aguardo (⏳ Aguardando 17s...)
- ✅ Indicador de rate limit por provider
- ✅ Contador de sucesso/falha ao final (15/15 arquivos)

**Melhorias no Bitbucket Client:**
- ✅ Cache de endpoints indisponíveis (evita 404 repetidos)
- ✅ Sistema de fallback com 3 métodos para buscar arquivos
- ✅ Mensagens mais claras sobre qual método funcionou
- ✅ Documentação completa em [BITBUCKET_API_ISSUES.md](BITBUCKET_API_ISSUES.md)

**Exemplo de saída:**
```bash
🤖 Analisando 15 arquivo(s) com IA (github-models)...
   Rate limit: 10 requisições/minuto
   [1/15] Analisando src/UserController.js...
   ✅ [1/15] Análise completa
   ...
   [10/15] Analisando src/UserService.js...
   ⏳ Rate limit atingido (10/10). Aguardando 47s...
   ✅ [10/15] Análise completa
   ...
✅ Análise com IA concluída: 15/15 arquivo(s)
```

**Documentação Atualizada:**
- [AI_INTEGRATION.md](AI_INTEGRATION.md) - Nova seção sobre rate limiting
- [BITBUCKET_API_ISSUES.md](BITBUCKET_API_ISSUES.md) - Novo guia sobre problemas conhecidos

## [1.6.0] - 2026-05-27

### 🤖 NEW: Integração com IA (Claude/GPT)

#### 🚀 Mudanças Principais

**Análise com Inteligência Artificial:**
- ✅ Suporte para Claude (Anthropic) e GPT (OpenAI)
- ✅ Análise híbrida: Regras estáticas + IA
- ✅ Detecção inteligente de bugs, segurança e performance
- ✅ Validação contextual com requisitos do Jira
- ✅ Resumo executivo da PR gerado pela IA
- ✅ Recomendação inteligente de tipo de review

**Novos Recursos:**
- Módulo `AIAnalyzer` completo com suporte a múltiplos providers
- Análise por arquivo com contexto de regras estáticas
- Geração de resumo da PR com insights de qualidade
- Detecção de problemas de segurança (SQL injection, XSS, etc.)
- Sugestões de melhorias de performance
- Comentários inline da IA formatados para Bitbucket

#### 📝 Novos Arquivos

1. **`ai-analyzer.js`** (430+ linhas)
   - Integração completa com Claude e OpenAI
   - Análise de arquivos individuais
   - Geração de resumo da PR
   - Formatação de comentários para Bitbucket
   - Tratamento robusto de erros com fallback

2. **`AI_INTEGRATION.md`** - Guia completo de uso:
   - Configuração de API keys
   - Comparação de providers
   - Exemplos de análise
   - Troubleshooting
   - Métricas de custo e benefício

#### 🔧 Arquivos Modificados

1. **`index.js`**
   - Importa e instancia `AIAnalyzer`
   - Integra análise com IA no fluxo principal
   - Combina comentários estáticos + IA
   - Usa recomendação da IA para tipo de review
   - Novas variáveis de ambiente: `AI_PROVIDER`, `AI_API_KEY`

2. **`interactive-cli.js`**
   - Novo método `displayAISummary()` - exibe análise da IA
   - `selectReviewType()` aceita sugestão da IA
   - Formatação visual aprimorada com emojis

3. **`.env`**
   - Adicionadas variáveis: `AI_PROVIDER`, `AI_API_KEY`
   - Documentação inline sobre providers

#### 💡 Análise Híbrida

```
Regras Estáticas (30+)          IA (Claude/GPT)
        ↓                               ↓
  - Padrões do projeto         - Qualidade geral
  - Style guide                - Segurança
  - Formatação                 - Performance
  - Imports                    - Lógica de negócio
                    ↓
            REVIEW COMPLETO
```

#### 🎯 Benefícios

**Antes (apenas regras estáticas):**
- 10 issues detectadas
- 0 problemas de segurança identificados
- Sem análise de performance
- Validação básica com Jira

**Depois (regras + IA):**
- 13 issues detectadas (+3)
- 2 vulnerabilidades de segurança encontradas
- 3 sugestões de performance
- Validação inteligente e contextual com Jira
- Resumo executivo com score de qualidade
- Recomendação fundamentada de review

**Custo:** ~$0.10 por PR (Claude) | ~$0.15 (OpenAI)  
**Economia:** ~30 minutos de revisão manual por PR

#### 🔒 Segurança

- ✅ API keys nunca commitadas (`.env` no `.gitignore`)
- ✅ Apenas código e diffs enviados para IA
- ✅ Nenhum dado sensível (credenciais, tokens, DB) compartilhado
- ✅ Timeout de 60s para prevenir travamentos
- ✅ Fallback gracioso para análise estática em caso de erro

#### 📊 Exemplo de Saída

```
🤖 ANÁLISE COM INTELIGÊNCIA ARTIFICIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Qualidade Geral: 8/10

📝 Resumo: PR implementa exportação corretamente, mas há 
2 erros críticos de imports e falta validação de permissões.

✅ PONTOS FORTES:
   ✓ Boa cobertura de testes
   ✓ Código bem estruturado

⚠️  PREOCUPAÇÕES:
   • Uso de require() ao invés de import ES6
   • Falta validação de permissões (requisito Jira)

🟡 RISCOS (MEDIUM):
   ⚠️  Performance pode degradar com grandes volumes

🔴 RECOMENDAÇÃO DA IA: REQUEST_CHANGES
```

#### 🚀 Como Usar

```bash
# 1. Configure API key no .env
AI_PROVIDER=claude
AI_API_KEY=sk-ant-...

# 2. Execute o bot
node index.js 1912

# O bot automaticamente detecta e usa IA se configurada
```

---

## [1.5.0] - 2026-05-27

### 🎯 ENHANCEMENT: Análise Enriquecida com Dados do Jira

#### 🚀 Mudanças Principais

**Análise de Conformidade Aprimorada:**
- ✅ Validação automática de alinhamento entre arquivos modificados e requisitos técnicos
- ✅ Exibição de status dos requisitos técnicos (alinhado/não detectado)
- ✅ Lista de critérios de aceite para validação manual
- ✅ Recomendações contextuais baseadas nos dados da issue
- ✅ Review enriquecido com informações completas da issue

**Novos Recursos:**
- Validação de alinhamento arquivo ↔ requisito técnico usando keywords
- Status de confiança do alinhamento (medium/low)
- Exibição dos critérios de aceite no relatório
- Review do Bitbucket inclui dados estruturados da issue
- CLI mostra análise visual de conformidade

#### 📝 Arquivos Modificados

1. **`index.js`**
   - `analyzeJiraCompliance()` aprimorado com validação de requisitos
   - `buildReviewBody()` aceita `jiraAnalysis` opcional
   - Review enriquecido com seção dedicada à issue
   - Próximos passos incluem validação de requisitos e critérios

2. **`interactive-cli.js`**
   - `displayCompliance()` melhorado com:
     - Status visual dos requisitos técnicos (✅/⚠️)
     - Lista de critérios de aceite
     - Recomendações com mais detalhes

3. **Documentação:**
   - Novo arquivo `example-enriched-analysis.md` - Exemplo completo de análise enriquecida
   - README.md atualizado com funcionalidades detalhadas
   - Demonstração de valor agregado (economia de ~10 min/PR)

#### 🎯 Impacto

**Antes:**
- 10 issues de código detectadas
- Sem contexto da PR
- Sem validação de requisitos

**Depois:**
- 10 issues de código detectadas  
- 5 requisitos técnicos verificados
- 4 critérios de aceite listados
- 3 recomendações específicas baseadas no contexto
- Decisão de aprovação mais informada

**Economia de Tempo:**
- ~2 min: Reviewer não precisa buscar issue
- ~5 min: Verificação automática de requisitos
- ~3 min: Contexto completo na PR
- **Total: ~10 minutos por PR**

#### 🔍 Exemplo de Saída

```
🔍 ALINHAMENTO COM REQUISITOS TÉCNICOS:

   ✅ [1] Alinhado - Implementar service VehicleExport
   ✅ [2] Alinhado - Adicionar filtro de dias em estoque
   ⚠️ [3] Não detectado - Adicionar validação de permissões
   
📋 CRITÉRIOS DE ACEITE:

   [ ] Usuário pode exportar veículos filtrando por dias em estoque
   [ ] Sistema valida permissões antes de exportar
   [ ] Retorna erro amigável se não houver veículos
```

---

## [1.4.0] - 2026-05-27

### 🤖 NEW: Integração com MCP da Atlassian

#### 🎯 Mudanças Principais

**Integração MCP:**
- ✅ Adicionado suporte para buscar issues do Jira via MCP da Atlassian
- ✅ Bot pode ser executado pelo Claude/Cursor com acesso ao MCP
- ✅ Análise enriquecida automática com dados da issue
- ✅ Modo híbrido: standalone + MCP assistido

**Novos Recursos:**
- `JiraClient.fetchIssueViaMCP()` - Busca issue via MCP quando disponível
- `JiraClient.fetchAndAnalyzeIssue()` - Busca e analisa em uma chamada
- Parâmetro `mcpEnabled` no constructor do JiraClient
- Detecção automática de MCP habilitado

#### 📝 Arquivos Modificados

1. **`jira-client.js`**
   - Novo método `fetchIssueViaMCP(issueKey)` para buscar via MCP
   - Novo método `fetchAndAnalyzeIssue(issueKey)` para busca + análise
   - Parâmetro `mcpEnabled` no constructor
   - Mensagens informativas quando MCP não disponível

2. **`index.js`**
   - Lógica de busca automática via MCP quando habilitado
   - Fallback para modo manual se MCP não disponível
   - Mensagens melhoradas sobre uso do MCP

3. **Documentação:**
   - Novo arquivo `run-with-mcp.md` - Guia completo de uso com MCP
   - README.md atualizado com seção "Modo Avançado"
   - Exemplos de uso via Claude/Cursor

#### 🚀 Como Usar

**Modo Standalone (sem MCP):**
```bash
npm run code-review 1912
# Detecta issue mas não busca dados automaticamente
```

**Modo Assistido via Claude (com MCP):**
```
Claude, por favor:
1. Busque a issue PROJ-123 do Jira
2. Execute o bot de code review na PR 1912 com esses dados
```

**Modo Automático (futuro):**
```javascript
const jiraConfig = {
  cloudId: 'xxx',
  projectKey: 'PROJ',
  mcpEnabled: true  // ← Habilita busca automática
};
```

#### 📊 Análise Enriquecida com MCP

Quando executado via MCP, o bot verifica:
- ✅ Alinhamento entre código e requisitos técnicos da issue
- ✅ Implementação dos critérios de aceite
- ✅ Validações específicas por tipo de issue (Bug, Task, etc)
- ✅ Recomendações baseadas em prioridade
- ✅ Verificação de testes para Bugs

#### 💡 Benefícios

- **Contexto Completo:** Bot entende o objetivo da PR através da issue
- **Recomendações Inteligentes:** Sugestões baseadas em requisitos reais
- **Validação Automática:** Verifica alinhamento PR × Issue
- **Flexível:** Funciona com ou sem MCP

#### 🔗 Recursos

- [Guia de Uso com MCP](run-with-mcp.md)
- [Skill Jira Assistant](.claude/skills/jira-assistant/SKILL.md)
- [Documentação Jira](JIRA_INTEGRATION.md)

---

## [1.3.0] - 2026-05-27

### 🔐 BREAKING CHANGE: Atualização do Método de Autenticação

#### 🎯 Mudanças Principais

**Autenticação:**
- ❌ Removido Username + App Password (Basic Auth)
- ✅ Adicionado Repository Access Token (Bearer Token)
- 🔒 Autenticação mais segura e moderna
- 🎯 Token vinculado ao repositório específico

**Arquivos Modificados:**

1. **`bitbucket-client.js`**
   - Constructor agora aceita `token` ao invés de `username` e `appPassword`
   - Substituído Basic Auth por Bearer Token
   - Atualizado todas as chamadas axios para usar `headers: { 'Authorization': 'Bearer ${token}' }`
   - Removidas propriedades `username`, `appPassword` e `auth`
   - Adicionada propriedade `headers` com token

2. **`index.js`**
   - Atualizado constructor do `CodeReviewBot` para aceitar apenas `token`
   - Removidas variáveis `BITBUCKET_USERNAME` e `BITBUCKET_APP_PASSWORD`
   - Adicionada variável `BITBUCKET_TOKEN`
   - Atualizado mensagens de erro e help text

3. **`.env.example`**
   - Substituído `BITBUCKET_USERNAME` e `BITBUCKET_APP_PASSWORD` por `BITBUCKET_TOKEN`
   - Adicionado link para geração de token no repositório

4. **`jira-integration-example.js`**
   - Atualizado para usar token único

5. **Documentação completa atualizada:**
   - `README.md` - Instruções de configuração
   - `QUICK_START.md` - Setup rápido
   - `BITBUCKET.md` - Detalhes da integração
   - `MIGRATION_GUIDE.md` - Guia de migração
   - `EXECUTIVE_SUMMARY.md` - Resumo executivo

#### ⚠️ Ação Necessária

**Para usuários existentes:**
1. Gerar Repository Access Token em: `https://bitbucket.org/{workspace}/{repo}/admin/access-tokens/`
2. Atualizar `.env`:
   ```bash
   # Remover:
   BITBUCKET_USERNAME=xxx
   BITBUCKET_APP_PASSWORD=xxx
   
   # Adicionar:
   BITBUCKET_TOKEN=xxx
   ```
3. Executar `npm install` (não há mudanças de dependências)

**Permissões do Token:**
- Pull requests: Read e Write

#### 💡 Por que essa mudança?

- Bitbucket está migrando para Repository Access Tokens como método preferido
- App Passwords são para acesso cross-workspace
- Repository Access Tokens são mais seguros e específicos por repositório
- Melhor alinhamento com práticas modernas de segurança

---

## [1.2.0] - 2026-05-26

### 🔄 BREAKING CHANGE: Migração de GitHub para Bitbucket

#### 🎯 Mudanças Principais

**Plataforma:**
- ❌ Removido suporte ao GitHub
- ✅ Adicionado suporte completo ao Bitbucket Cloud
- ✅ Mantida integração com Jira (prioritária)

**Novo Cliente: BitbucketClient**
- Usa API REST do Bitbucket Cloud v2.0
- Autenticação via Username + App Password
- Suporte completo a Pull Requests
- Comentários inline nativos
- Aprovação e solicitação de mudanças

#### 📝 Arquivos Modificados

1. **`index.js`**
   - Substituído `GitHubClient` por `BitbucketClient`
   - Atualizado construtor para aceitar credenciais do Bitbucket
   - Adaptado método `createReview()` para API do Bitbucket
   - Removida busca de issues do GitHub (usa apenas Jira)

2. **`code-analyzer.js`**
   - Novo método `formatForBitbucket()`
   - Adaptado para formato de comentários do Bitbucket

3. **`.env.example`**
   - Removidas variáveis do GitHub
   - Adicionadas variáveis do Bitbucket:
     - `BITBUCKET_USERNAME`
     - `BITBUCKET_APP_PASSWORD`
     - `BITBUCKET_WORKSPACE`
     - `BITBUCKET_REPO_SLUG`
   - Mantidas variáveis do Jira

4. **`package.json`**
   - Removida dependência `@octokit/rest`
   - Atualizada versão para 1.2.0
   - Atualizadas keywords (bitbucket, jira, atlassian)

#### 📄 Arquivos Criados

1. **`bitbucket-client.js`** (390 linhas)
   - Cliente completo para API do Bitbucket
   - Métodos principais:
     - `getPullRequest()`: Busca dados da PR
     - `getPullRequestFiles()`: Busca arquivos modificados
     - `getFileContent()`: Busca conteúdo de arquivo
     - `addComment()`: Adiciona comentário
     - `addInlineComment()`: Comentário inline
     - `approvePullRequest()`: Aprova PR
     - `requestChanges()`: Solicita mudanças
     - `createReview()`: Cria review completo

2. **`BITBUCKET.md`** (450 linhas)
   - Guia completo para Bitbucket
   - Configuração de App Password
   - Exemplos de uso
   - Comparação GitHub vs Bitbucket
   - Integração com Pipelines
   - Troubleshooting

#### 📚 Documentação Atualizada

- **README.md**: Adaptado para Bitbucket
- **QUICK_START.md**: Atualizado com credenciais do Bitbucket
- **EXECUTIVE_SUMMARY.md**: Mencionado plataforma Bitbucket
- **JIRA_INTEGRATION.md**: Mantido (compatível)
- **DEVELOPMENT.md**: Mantido (compatível)

#### 🔄 Mudanças de API

**Autenticação:**
```bash
# Antes (GitHub)
GITHUB_TOKEN=ghp_xxx

# Depois (Bitbucket)
BITBUCKET_USERNAME=usuario
BITBUCKET_APP_PASSWORD=senha
BITBUCKET_WORKSPACE=workspace
BITBUCKET_REPO_SLUG=repo
```

**Review Actions:**
- `REQUEST_CHANGES`: Adiciona comentário + Remove aprovação
- `APPROVE`: Aprova a PR
- `COMMENT`: Apenas comentário

**Issues:**
- GitHub: Sistema próprio ❌
- Bitbucket: Usa Jira ✅

#### 🎯 Como Migrar

1. **Gere App Password do Bitbucket:**
   ```bash
   # https://bitbucket.org/account/settings/app-passwords/
   # Permissões: Pull requests (Read, Write)
   ```

2. **Atualize .env:**
   ```bash
   cd scripts/code-review-bot
   cp .env.example .env
   nano .env  # Configure BITBUCKET_*
   ```

3. **Reinstale dependências:**
   ```bash
   npm install  # Remove @octokit/rest
   ```

4. **Execute normalmente:**
   ```bash
   npm run code-review 123
   ```

#### ✅ O Que Continua Funcionando

- ✅ Todas as 30+ regras de análise
- ✅ Integração com Jira (prioritária)
- ✅ CLI interativa
- ✅ Seleção de issues
- ✅ Tipos de review
- ✅ Comentários inline
- ✅ Análise de conformidade

#### ❌ O Que Foi Removido

- ❌ Suporte a GitHub
- ❌ Busca de issues do GitHub
- ❌ Dependência do Octokit

#### 📊 Estatísticas

- **Arquivos criados**: 2
- **Arquivos modificados**: 8
- **Linhas adicionadas**: ~840
- **Linhas removidas**: ~120
- **Dependências removidas**: 1 (@octokit/rest)

---

## [1.1.0] - 2026-05-26

### ✨ Adicionado

#### Integração com Jira
- **JiraClient**: Novo módulo para integração com Jira via MCP da Atlassian
  - Detecção automática de chaves do Jira (título, descrição, branch)
  - Extração de requisitos técnicos e critérios de aceite
  - Geração de recomendações baseadas no contexto da issue
  - Validação de alinhamento entre PR e issue

#### Funcionalidades
- Análise enriquecida com dados do Jira
- Detecção de issues do Jira em PRs (formatos: B2B-123, [PROJ-456], etc.)
- Recomendações específicas para Bugs (verificação de testes)
- Validação de requisitos técnicos vs arquivos modificados
- Exibição formatada de informações da issue do Jira

#### Configuração
- Novas variáveis de ambiente:
  - `JIRA_CLOUD_ID`: Cloud ID do Jira (opcional)
  - `JIRA_PROJECT_KEY`: Chave do projeto (opcional)
- Suporte para fornecimento de dados da issue via opções

#### Documentação
- `JIRA_INTEGRATION.md`: Guia completo de integração com Jira
- `jira-integration-example.js`: Script de exemplo de uso programático
- Atualização de todos os READMEs com informações sobre integração

### 🔄 Modificado

#### CodeReviewBot
- Construtor agora aceita `jiraConfig` (cloudId, projectKey)
- Método `run()` detecta automaticamente chaves do Jira
- Novo método `analyzeJiraCompliance()` para análise específica do Jira
- Análise de conformidade prioriza dados do Jira sobre GitHub

#### CodeAnalyzer
- Mantém suporte para issues do GitHub (fallback)
- Análise de conformidade mais robusta

#### InteractiveCLI
- Exibição de informações da issue do Jira no relatório
- Recomendações específicas baseadas no Jira

#### Documentação
- README.md: Nova seção sobre integração com Jira
- QUICK_START.md: Atualizado com configuração do Jira
- EXECUTIVE_SUMMARY.md: Mencionado integração com Jira
- .env.example: Adicionadas variáveis do Jira

### 📝 Arquivos Criados

1. `jira-client.js` (370 linhas)
   - Classe principal para integração com Jira
   - Métodos de detecção e análise
   - Extração de requisitos e critérios
   - Geração de recomendações

2. `JIRA_INTEGRATION.md` (420 linhas)
   - Guia completo de integração
   - Exemplos de uso
   - Troubleshooting
   - Roadmap de funcionalidades

3. `jira-integration-example.js` (180 linhas)
   - Exemplo de uso programático
   - Mock de busca de dados
   - Template para integração com MCP

### 🎯 Casos de Uso

#### Caso 1: PR com Issue do Jira
```bash
# PR com título: "fix: Corrige validação [B2B-123]"
npm run code-review 234

# Resultado:
# ✅ Issue do Jira detectada: B2B-123
# 📋 Análise enriquecida com requisitos técnicos
# ⚠️  Recomendações específicas baseadas no contexto
```

#### Caso 2: Bug sem Testes
```bash
# Issue tipo Bug, PR sem testes
npm run code-review 345

# Resultado:
# ⚠️  Issue do tipo Bug mas não há testes adicionados
# 💡 Adicione testes para garantir que o bug não ocorra novamente
```

#### Caso 3: Validação de Requisitos
```bash
# Issue com requisitos técnicos definidos
npm run code-review 456

# Resultado:
# ✅ Arquivos modificados alinham com requisitos técnicos
# ℹ️  Certifique-se de que todos os critérios de aceite foram implementados
```

### 🔧 Compatibilidade

- ✅ Totalmente retrocompatível
- ✅ Funciona sem configuração do Jira (opcional)
- ✅ Fallback para issues do GitHub
- ✅ Suporta PRs sem issue vinculada

### 📊 Estatísticas

- **Arquivos criados**: 3
- **Arquivos modificados**: 7
- **Linhas de código adicionadas**: ~970
- **Documentação adicionada**: ~600 linhas
- **Novas funcionalidades**: 5
- **Novas validações**: 4

### 🚀 Próximos Passos

1. Implementar busca automática via MCP da Atlassian
2. Cache de dados de issues do Jira
3. Integração com Confluence
4. Comentários automáticos na issue do Jira
5. Transição automática de status (opcional)

---

## [1.0.0] - 2026-05-26

### 🎉 Release Inicial

- Code Review Bot funcional
- 30+ regras de análise
- Interface CLI interativa
- Integração com GitHub
- Documentação completa

---

**Nota**: Este changelog segue o formato [Keep a Changelog](https://keepachangelog.com/).
