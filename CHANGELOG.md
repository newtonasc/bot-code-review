# Changelog - Code Review Bot

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
