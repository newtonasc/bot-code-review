# 🤖 Code Review Bot

Bot automatizado de code review para Pull Requests com suporte para **Bitbucket** e **GitHub**.

Analisa PRs seguindo padrões customizáveis, integra com **Jira** e **MCP da Atlassian**, e oferece análise avançada com **IA (Claude/GPT)**.

> 🎯 **Projeto independente e reutilizável** - Configure para qualquer repositório em minutos!

## 📋 Índice

- [Funcionalidades](#funcionalidades)
- [Instalação](#instalação)
- [Configuração Rápida](#configuração-rápida)
- [Uso](#uso)
- [Documentação](#documentação)
- [Contribuindo](#contribuindo)

## ✨ Funcionalidades

### 🔍 Análise de Código
- **Análise Automática**: Analisa arquivos modificados em PRs seguindo os padrões do projeto
- **30+ Regras**: Detecta problemas comuns como:
  - Imports incorretos (assumir que existe `index.js`)
  - Falta de `ErrorHandler` em controllers
  - Acesso direto a `req.permissions.accessProfile`
  - Uso de números mágicos ao invés de `httpStatus`
  - Linhas em branco desnecessárias dentro de métodos
  - Violações de padrões de repositories, services e models
  - E muito mais...

### 🤖 Análise com IA (Novo!)
- **Claude ou GPT**: Integração opcional com LLMs para análise avançada
- **Análise Híbrida**: Combina regras estáticas com inteligência artificial
- **Detecção Inteligente**:
  - 🔒 Problemas de segurança (SQL injection, XSS, etc.)
  - ⚡ Otimizações de performance
  - 🐛 Bugs sutis e problemas de lógica
  - 📊 Score de qualidade geral do código
- **Resumo Executivo**: IA gera resumo da PR com recomendação fundamentada
- **Custo**: ~$0.10 por PR (opcional, configurável via API key)
- **Mais detalhes**: [AI_INTEGRATION.md](AI_INTEGRATION.md)

### 📋 Integração com Jira
- **Detecção Automática**: Identifica issues do Jira mencionadas na PR (formato PROJ-123)
- **MCP Support**: Integração completa com MCP da Atlassian via Claude/Cursor
- **Análise Enriquecida**: 
  - ✅ Valida alinhamento entre arquivos modificados e requisitos técnicos
  - ✅ Lista critérios de aceite para validação manual
  - ✅ Gera recomendações específicas baseadas no contexto da issue
  - ✅ Exibe informações completas da issue no review (tipo, status, prioridade)
- **Verificação de Conformidade**:
  - Presença de testes
  - Alinhamento com requisitos técnicos
  - Status dos critérios de aceite

### 🎯 Workflow Interativo
- **Seleção Interativa**: Permite escolher quais issues reportar
- **Tipos de Review**: Suporta `COMMENT`, `REQUEST_CHANGES` e `APPROVE`
- **Relatórios Detalhados**: Gera relatórios completos com:
  - Issues de código categorizadas por severidade
  - Status de conformidade com a issue do Jira
  - Recomendações baseadas no contexto
  - Sugestões de correção

## ⚡ Instalação

### Opção 1: Clone do Repositório (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/newtonasc/bot-code-review.git
cd bot-code-review

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
nano .env  # Adicione suas credenciais
```

### Opção 2: Instalação Global (via npm link)

```bash
# Clone e instale
git clone https://github.com/newtonasc/bot-code-review.git
cd bot-code-review
npm install
npm link

# Agora você pode usar de qualquer lugar:
cd /seu/projeto
code-review 123
```

### Opção 3: Usar em Outro Projeto

```bash
# No seu projeto (recomendado)
bash /caminho/para/bot-code-review/install.sh
nano scripts/.env.code-review-bot

# Guia completo: USING_IN_OTHER_PROJECTS.md
```

## 🚀 Configuração Rápida

### 1. Crie arquivo .env

```bash
cp .env.example .env
```

### 2. Configure Credenciais Mínimas

Para **Bitbucket**:

```bash
BITBUCKET_TOKEN=seu-token        # Repository Access Token
BITBUCKET_USERNAME=seu-email      # Para Atlassian API Tokens
BITBUCKET_WORKSPACE=seu-workspace
BITBUCKET_REPO_SLUG=seu-repo
```

Para **GitHub** (legacy):

```bash
GITHUB_TOKEN=seu-token
GITHUB_OWNER=usuario-ou-org
GITHUB_REPO=nome-do-repo
```

### 3. (Opcional) Jira + IA

```bash
# Jira
JIRA_CLOUD_ID=seu-cloud-id
JIRA_PROJECT_KEY=PROJ

# IA (Claude ou OpenAI)
AI_PROVIDER=claude               # ou 'openai'
AI_API_KEY=sk-ant-...           # ou sk-...
```

### 4. Teste

```bash
node index.js --help
node index.js <pr-number> --dry-run
```

## ⚙️ Configuração

### 1. Gerar Repository Access Token do Bitbucket

1. Acesse: `https://bitbucket.org/{workspace}/{repo}/admin/access-tokens/`
2. Clique em "Create Repository Access Token"
3. Dê um nome descritivo (ex: "Code Review Bot")
4. Selecione os seguintes escopos:
   - `Pull requests` (Read e Write)
5. Clique em "Create"
6. **Copie o token gerado** (você não poderá vê-lo novamente)

### 2. Configurar Variáveis de Ambiente

#### Opção 1: Exportar no terminal (temporário)

```bash
export BITBUCKET_TOKEN=seu-token
export BITBUCKET_WORKSPACE=seu-workspace
export BITBUCKET_REPO_SLUG=your-repo  # opcional

# Opcional: Integração com Jira
export JIRA_CLOUD_ID=your-cloud-id  # opcional, para links da issue
export JIRA_PROJECT_KEY=B2B  # opcional, chave do projeto
```

#### Opção 2: Criar arquivo .env (permanente)

```bash
# Criar arquivo .env no diretório do bot
cat > .env << EOF
BITBUCKET_TOKEN=seu-token
BITBUCKET_WORKSPACE=seu-workspace
BITBUCKET_REPO_SLUG=your-repo
JIRA_CLOUD_ID=your-cloud-id
JIRA_PROJECT_KEY=B2B
EOF
```

Depois, antes de executar o bot:

```bash
source .env
```

## � Integração com Jira

O bot detecta automaticamente issues do Jira referenciadas em Pull Requests e enriquece a análise com:

- ✅ **Requisitos técnicos** da issue
- ✅ **Critérios de aceite**
- ✅ **Tipo e prioridade** da issue
- ✅ **Validação de alinhamento** entre PR e issue
- ✅ **Recomendações específicas** baseadas no contexto

### Detecção Automática

O bot detecta chaves do Jira em:
- **Título da PR**: `fix: Corrige bug [B2B-123]`
- **Descrição da PR**: `Closes B2B-456`
- **Nome do branch**: `feature/B2B-789-nova-funcionalidade`

### Configuração Opcional

```bash
# Adicione ao .env para links e metadados
JIRA_CLOUD_ID=your-cloud-id
JIRA_PROJECT_KEY=B2B
```

**Exemplo de análise enriquecida:**

```
✅ Issue do Jira detectada: B2B-123

📋 Issue do Jira: B2B-123
- Tipo: Task
- Status: In Progress
- Prioridade: High
- Resumo: Implementar autenticação

Requisitos Técnicos:
- Criar middleware de autenticação
- Implementar JWT
- Adicionar validação

💡 RECOMENDAÇÕES:
✅ Arquivos modificados alinham com requisitos
⚠️  Certifique-se de que todos os critérios de aceite foram implementados
```

📚 **[Guia Completo de Integração com Jira](JIRA_INTEGRATION.md)**
### 🤖 Modo Avançado: Análise com MCP da Atlassian

Para análise ainda mais rica, você pode executar o bot **via Claude** com acesso ao MCP:

```
Claude, por favor analise a PR 1912:
1. Busque a issue do Jira associada (PROJ-123)
2. Execute o bot de code review com esses dados
3. Enriquecça a análise com os requisitos técnicos e critérios de aceite
```

**O que Claude fará:**
- 🔍 Busca automaticamente dados da issue via MCP
- 📊 Analisa requisitos técnicos vs arquivos modificados
- ✅ Verifica critérios de aceite
- 💡 Gera recomendações específicas baseadas no contexto

📚 **[Guia de Uso com MCP](run-with-mcp.md)** - Como executar via Claude/Cursor
## �📖 Uso

### Sintaxe Básica

```bash
node index.js <pr-number> [options]
```

### Opções

- `<pr-number>`: Número da Pull Request a ser analisada (obrigatório)
- `--dry-run`: Apenas analisa e exibe relatório, sem criar review
- `--help`, `-h`: Exibe ajuda

### Fluxo de Execução

1. **Análise Automática**: O bot analisa todos os arquivos modificados na PR
2. **Relatório**: Exibe um relatório completo com todas as issues encontradas
3. **Conformidade**: Analisa se a PR está alinhada com a issue referenciada (se houver)
4. **Seleção**: Permite escolher quais issues reportar:
   - `[a]` Todas
   - `[e]` Apenas erros
   - `[w]` Apenas avisos
   - `[c]` Seleção customizada
   - `[n]` Nenhuma (cancelar)
5. **Tipo de Review**: Escolhe o tipo de review:
   - `REQUEST_CHANGES`: Solicita mudanças (recomendado para erros)
   - `COMMENT`: Apenas comenta
   - `APPROVE`: Aprova com comentários
6. **Confirmação**: Confirma antes de criar o review
7. **Criação**: Cria o review no GitHub

## 📚 Documentação Completa

- **[QUICK_START.md](QUICK_START.md)** - Comece em 5 minutos
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Arquitetura e detalhes técnicos
- **[BITBUCKET.md](BITBUCKET.md)** - Integração com Bitbucket
- **[JIRA_INTEGRATION.md](JIRA_INTEGRATION.md)** - Integração com Jira
- **[AI_INTEGRATION.md](AI_INTEGRATION.md)** - Análise com IA (Claude/GPT)
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Como contribuir
- **[CHANGELOG.md](CHANGELOG.md)** - Histórico de versões

## 🤝 Contribuindo

Contribuições são bem-vindas! Veja [CONTRIBUTING.md](CONTRIBUTING.md) para guidelines.

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

## 🙏 Agradecimentos

- Projeto open source mantido por [newtonasc](https://github.com/newtonasc)
- Separado como ferramenta independente e reutilizável

## 📞 Suporte

- **Issues**: https://github.com/newtonasc/bot-code-review/issues
- **Discussões**: https://github.com/newtonasc/bot-code-review/discussions
- **Documentação**: [README.md](README.md)

---

**Feito com ❤️ por [newtonasc](https://github.com/newtonasc)**

O bot analisa o código seguindo as diretrizes do projeto definidas em `.github/copilot-instructions.md`.

### Categorias de Regras

#### 1. **Imports** (`imports-*`)

- ❌ Importar de diretórios sem especificar arquivo
- ❌ Usar `require()` ao invés de `import`

**Exemplo de erro:**
```js
// ❌ Errado
import auth from './controllers/auth';

// ✅ Correto
import auth from './controllers/auth/auth';
```

#### 2. **Formatação** (`format-*`)

- ⚠️ Linhas em branco desnecessárias dentro de métodos
- ⚠️ Linhas com mais de 120 caracteres

**Exemplo de erro:**
```js
// ❌ Errado - linhas em branco desnecessárias
async handle() {
  const options = this.buildOptions();

  const result = await Repository.selectOne(options);

  return result;
}

// ✅ Correto - bloco compacto
async handle() {
  const options = this.buildOptions();
  const result = await Repository.selectOne(options);
  return result;
}
```

#### 3. **Controllers** (`controller-*`)

- ❌ Não usar `ErrorHandler` no catch
- ❌ Não chamar `ThrowErrors(req)` após middlewares
- ❌ Usar números mágicos ao invés de `httpStatus`

**Exemplo de erro:**
```js
// ❌ Errado
routes.get('/', async (req, res) => {
  try {
    const data = await service();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ✅ Correto
routes.get('/', async (req, res) => {
  try {
    ThrowErrors(req);
    const data = await service();
    return res.status(httpStatus.OK).json(data);
  } catch (err) {
    return ErrorHandler(err, req, res);
  }
});
```

#### 4. **Services** (`service-*`)

- ❌ Service sem método `handle()`
- ⚠️ Instanciação incorreta de services

**Exemplo de erro:**
```js
// ❌ Errado
const service = new MyService(params);
const result = await service.handle();

// ✅ Correto
const result = await (new MyService(params)).handle();
```

#### 5. **Repositories** (`repository-*`)

- ❌ Repository não estende `AbstractRepository`
- ❌ Repository sem método `getEntity()`

#### 6. **Permissões** (`permission-*`)

- ❌ Acesso direto a `req.permissions.accessProfile`

**Exemplo de erro:**
```js
// ❌ Errado - pode causar TypeError
const advertisers = req.permissions.accessProfile.cadastros02.R;

// ✅ Correto - seguro
const advertisers = GetPermission(req.permissions, 'cadastros02', 'R');
```

#### 7. **Erros** (`error-*`)

- ⚠️ Criar novos códigos de erro sem verificar se já existem

#### 8. **Models** (`model-*`)

- ❌ Model sem `timestamps: false`
- ❌ Model sem `freezeTableName: true`

#### 9. **TypeScript** (`typescript-*`)

- ❌ Usar TypeScript (o projeto usa Babel)

#### 10. **Constants** (`constants-*`)

- ⚠️ Hardcoded de valores que deveriam estar em Constants ou enumerators

#### 11. **Testes** (`test-*`)

- ⚠️ Testes sem estrutura `describe()`
- ⚠️ Mocks sem `beforeEach` para limpeza

## 📝 Exemplos

### Exemplo 1: Análise Completa com Review

```bash
# Analisar PR #123 e criar review interativamente
node index.js 123
```

Saída:
```
⏳ Validando acesso ao GitHub...
✅ Autenticado como: seu-usuario

⏳ Buscando informações da PR #123...
✅ PR encontrada: Fix: Correção de bug no módulo de avaliação

⏳ Buscando issue #45...
✅ Issue encontrada: Bug ao criar avaliação

⏳ Buscando arquivos modificados...
✅ 5 arquivo(s) modificado(s)

⏳ Analisando código...
✅ Análise concluída

================================================================================
📊 RELATÓRIO DE CODE REVIEW
================================================================================

📁 Arquivos analisados: 5
🔍 Issues encontradas: 8
   🚨 Erros: 3
   ⚠️  Avisos: 5

--------------------------------------------------------------------------------
ISSUES POR ARQUIVO
--------------------------------------------------------------------------------

📄 src/routes/controllers/ad.js
   3 issue(s) encontrada(s)

   🚨 [1.1] controller-01 (error)
      SEMPRE use ErrorHandler no bloco catch dos controllers.
      💡 Adicione: return ErrorHandler(err, req, res);

   🚨 [1.2] controller-01 (error)
      Use httpStatus ao invés de número mágico 200.
      💡 Altere para: res.status(httpStatus.OK)

   ⚠️ [1.3] format-01 (warning)
      NÃO deixe linhas em branco desnecessárias dentro de métodos/funções.
      💡 Remova as linhas em branco dentro do método.
      📍 Linha: 45

...

🎯 SELEÇÃO DE ISSUES PARA REVIEW
================================================================================

Selecione quais issues deseja incluir no review:

  [a] Selecionar todas
  [e] Apenas erros
  [w] Apenas avisos
  [n] Nenhuma (cancelar)
  [c] Seleção customizada (por número)

Escolha uma opção: e

✅ 3 erro(s) selecionado(s).

📝 TIPO DE REVIEW
================================================================================

Selecione o tipo de review:

  [1] REQUEST_CHANGES - Solicitar mudanças (recomendado se há erros)
  [2] COMMENT - Apenas comentar
  [3] APPROVE - Aprovar com comentários

Escolha uma opção (1-3): 1

⚠️  CONFIRMAÇÃO
================================================================================

Você está prestes a criar um review do tipo: solicitação de mudanças
Número de issues a serem reportadas: 3

Deseja continuar? (s/n): s

⏳ Criando review...

✅ REVIEW CRIADO COM SUCESSO
================================================================================

🔗 URL: https://github.com/your-org/your-repo/pull/123#pullrequestreview-123456789
```

### Exemplo 2: Dry Run (Apenas Análise)

```bash
# Apenas analisar sem criar review
node index.js 123 --dry-run
```

### Exemplo 3: Repositório Customizado

```bash
# Usar outro repositório
GITHUB_OWNER=myorg GITHUB_REPO=myrepo node index.js 45
```

### Exemplo 4: Seleção Customizada

Quando escolher `[c]` para seleção customizada:

```
--------------------------------------------------------------------------------
LISTA DE ISSUES
--------------------------------------------------------------------------------

[1] 🚨 controller-01 - src/routes/controllers/ad.js
    SEMPRE use ErrorHandler no bloco catch dos controllers.
[2] 🚨 permission-01 - src/services/components/ad/find/adFind.js
    NUNCA acesse req.permissions.accessProfile diretamente.
[3] ⚠️ format-01 - src/routes/controllers/ad.js
    NÃO deixe linhas em branco desnecessárias dentro de métodos/funções.
[4] ⚠️ constants-01 - src/services/components/ad/validate/adValidate.js
    NÃO hardcode valores. Use Constants, enumerators ou i18n.

--------------------------------------------------------------------------------

Digite os números das issues separados por vírgula (ex: 1,3,5)
Ou digite "all" para selecionar todas, "cancel" para cancelar

Issues: 1,2

✅ 2 issue(s) selecionada(s).
```

## 🔧 Troubleshooting

### Erro: "BITBUCKET_TOKEN não definido"

**Causa**: Variável de ambiente não configurada.

**Solução**:
```bash
export BITBUCKET_TOKEN=seu-token-aqui
```

Ou crie o arquivo `.env`:

**No repositório do bot:**
```bash
cp .env.example .env
nano .env  # configure BITBUCKET_TOKEN, BITBUCKET_WORKSPACE, etc.
```

**Em outro projeto (via `install.sh` ou link simbólico):**
```bash
nano scripts/.env.code-review-bot  # configure BITBUCKET_TOKEN, BITBUCKET_WORKSPACE, etc.
```

### Erro: "Erro ao validar acesso ao repositório"

**Causa**: Token inválido ou sem permissões necessárias.

**Solução**:
1. Verifique se o token está correto
2. Certifique-se de que o token tem escopo `repo`
3. Verifique se você tem acesso ao repositório

### Erro: "Erro ao buscar PR #123"

**Causa**: PR não existe ou você não tem acesso.

**Solução**:
1. Verifique se o número da PR está correto
2. Verifique se a PR existe no repositório
3. Certifique-se de que você tem acesso ao repositório

### Aviso: "Não foi possível obter conteúdo de arquivo"

**Causa**: Arquivo foi deletado ou renomeado.

**Solução**: Isso é normal para arquivos deletados. O bot continuará analisando os demais.

### Review criado mas comentários não aparecem

**Causa**: Limitação da API do GitHub para comentários inline.

**Solução**: Os comentários são criados como comentários gerais da PR. Isso é o comportamento esperado.

## 🎯 Boas Práticas

1. **Execute o bot antes de solicitar review de PRs grandes**
   - Identifica problemas antes do review humano
   - Economiza tempo dos revisores

2. **Use `--dry-run` primeiro**
   - Veja o que será reportado antes de criar o review
   - Ajuste sua seleção se necessário

3. **Reporte apenas issues relevantes**
   - Use seleção customizada para filtrar
   - Foque nos erros críticos primeiro

4. **Corrija os problemas localmente**
   - Execute `npm run lint` após correções
   - Execute `npm run test` para garantir que não há regressões

5. **Documente mudanças significativas**
   - Atualize Swagger se modificou controllers
   - Adicione testes para novos services

## 📚 Referências

- [Copilot Instructions](.github/copilot-instructions.md) - Padrões e boas práticas do projeto
- [ESLint Config](.eslintrc) - Regras de linting
- [Guia Bitbucket](BITBUCKET.md) - Guia específico para Bitbucket Cloud
- [Integração com Jira](JIRA_INTEGRATION.md) - Guia completo de integração com Jira
- [Documentação Bitbucket API](https://developer.atlassian.com/cloud/bitbucket/rest/) - API do Bitbucket

## 🤝 Contribuindo

Para adicionar novas regras de análise:

1. Edite `rules.js` e adicione sua regra na categoria apropriada
2. Teste com `--dry-run`
3. Documente a nova regra neste README

## 📄 Licença

MIT

---

**Desenvolvido pela newtonasc** 🚀
