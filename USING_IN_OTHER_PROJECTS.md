# 🔗 Usando o Bot em Outro Projeto

Guia para integrar o Code Review Bot em qualquer projeto Node.js.

## 🚀 Instalação Rápida (Recomendada)

### 1. Execute o script de instalação

```bash
cd /seu/projeto
bash /caminho/para/bot-code-review/install.sh
```

O script detecta automaticamente o caminho do bot (padrão: diretório onde está o `install.sh`). Pressione Enter para aceitar.

O script irá:
- ✅ Criar link simbólico em `scripts/code-review-bot` (caminho absoluto)
- ✅ Copiar `.env.example` para `scripts/.env.code-review-bot` no seu projeto
- ✅ Adicionar scripts npm ao `package.json` (com `CODE_REVIEW_ENV_FILE`)

> **Nota:** Se você executar o script **dentro do repositório do bot**, ele configura o `.env` localmente (sem criar symlink) e encerra com instruções para uso direto.

### 2. Configure credenciais

```bash
nano scripts/.env.code-review-bot
```

Adicione pelo menos:
```bash
BITBUCKET_TOKEN=seu-token
BITBUCKET_USERNAME=seu-email
BITBUCKET_WORKSPACE=workspace
BITBUCKET_REPO_SLUG=repo
```

### 3. Use o bot

```bash
npm run code-review -- 123
```

## 📦 Instalação Manual

### 1. Clone ou Link

**Opção A: Clone no projeto**
```bash
cd seu-projeto
git clone https://github.com/newtonasc/bot-code-review.git scripts/code-review-bot
cd scripts/code-review-bot
npm install
```

**Opção B: Link simbólico (recomendado)**
```bash
cd seu-projeto
mkdir -p scripts
ln -s /caminho/absoluto/para/bot-code-review scripts/code-review-bot
```

> Use sempre **caminho absoluto** no link simbólico. Caminhos relativos quebrados causam erros como `cp: cannot create regular file 'scripts/code-review-bot/.env'`.

### 2. Configure .env

**Com clone (Opção A)** — o bot é uma cópia local; use `.env` dentro dele:
```bash
cd scripts/code-review-bot
cp .env.example .env
nano .env
```

**Com link simbólico (Opção B)** — mantenha o `.env` no seu projeto, não no repositório do bot:
```bash
cp /caminho/para/bot-code-review/.env.example scripts/.env.code-review-bot
nano scripts/.env.code-review-bot
```

### 3. Adicione scripts ao package.json

**Com clone (Opção A):**
```json
{
  "scripts": {
    "code-review": "node scripts/code-review-bot/index.js",
    "code-review:help": "node scripts/code-review-bot/index.js --help",
    "code-review:dry": "node scripts/code-review-bot/index.js --dry-run"
  }
}
```

**Com link simbólico (Opção B):**
```json
{
  "scripts": {
    "code-review": "CODE_REVIEW_ENV_FILE=scripts/.env.code-review-bot node scripts/code-review-bot/index.js",
    "code-review:help": "CODE_REVIEW_ENV_FILE=scripts/.env.code-review-bot node scripts/code-review-bot/index.js --help",
    "code-review:dry": "CODE_REVIEW_ENV_FILE=scripts/.env.code-review-bot node scripts/code-review-bot/index.js --dry-run"
  }
}
```

## 🎯 Customizar para Seu Projeto

### 1. Crie regras customizadas

```bash
cd scripts/code-review-bot
cp rules.js rules.custom.js
```

Edite `rules.custom.js` com regras específicas do seu projeto.

Veja [CUSTOMIZING_RULES.md](CUSTOMIZING_RULES.md) para exemplos.

### 2. Configure config.json

```json
{
  "rulesFile": "./rules.custom.js",
  "maxLineLength": 100,
  "ignorePatterns": [
    "**/dist/**",
    "**/build/**"
  ]
}
```

### 3. (Opcional) Customize mensagens

Edite `rules.custom.js` com mensagens específicas:

```javascript
{
  id: 'imports-01',
  message: 'Use nossos padrões de import do projeto XYZ',
  suggestion: 'Veja docs/imports.md para detalhes',
}
```

## 🔄 Manter Atualizado

### Com git clone

```bash
cd scripts/code-review-bot
git pull origin master
npm install
```

### Com link simbólico

```bash
cd /caminho/para/bot-code-review
git pull origin master
npm install

# Projetos linkados são atualizados automaticamente
# O arquivo scripts/.env.code-review-bot do seu projeto não é alterado
```

## 🎨 Integrar com CI/CD

### GitHub Actions

```yaml
name: Code Review Bot
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install bot
        run: |
          git clone https://github.com/newtonasc/bot-code-review.git scripts/code-review-bot
          cd scripts/code-review-bot
          npm install
      
      - name: Run review
        env:
          BITBUCKET_TOKEN: ${{ secrets.BITBUCKET_TOKEN }}
          BITBUCKET_WORKSPACE: ${{ secrets.BITBUCKET_WORKSPACE }}
          BITBUCKET_REPO_SLUG: ${{ github.event.repository.name }}
        run: npm run code-review -- ${{ github.event.pull_request.number }}
```

### Bitbucket Pipelines

```yaml
pipelines:
  pull-requests:
    '**':
      - step:
          name: Code Review Bot
          image: node:18
          script:
            - git clone https://github.com/newtonasc/bot-code-review.git scripts/code-review-bot
            - cd scripts/code-review-bot
            - npm install
            - node index.js $BITBUCKET_PR_ID
```

## 📂 Estrutura Recomendada

**Com link simbólico (via `install.sh`):**
```
seu-projeto/
├── scripts/
│   ├── code-review-bot/        # Link simbólico → repositório do bot
│   └── .env.code-review-bot    # Configuração local do projeto
├── package.json                # Scripts npm com CODE_REVIEW_ENV_FILE
└── .github/                    # CI/CD configs
    └── workflows/
        └── code-review.yml
```

**Com clone:**
```
seu-projeto/
├── scripts/
│   └── code-review-bot/        # Clone do bot
│       ├── .env                # Configuração local
│       └── rules.custom.js     # Regras customizadas (opcional)
├── package.json
└── .github/
    └── workflows/
        └── code-review.yml
```

## 🔒 Segurança

### .gitignore

Adicione ao `.gitignore` do seu projeto:

```bash
# Code Review Bot
scripts/.env.code-review-bot
scripts/code-review-bot/.env
scripts/code-review-bot/node_modules/
```

### Secrets em CI/CD

Nunca commite credenciais. Use secrets:

- GitHub: Settings → Secrets and variables → Actions
- Bitbucket: Repository settings → Pipelines → Repository variables

## 💡 Exemplos de Uso

### Análise simples

```bash
npm run code-review -- 123
```

### Apenas visualizar (dry-run)

```bash
npm run code-review -- 123 --dry-run
```

### Com regras customizadas

```bash
CODE_REVIEW_ENV_FILE=scripts/.env.code-review-bot node scripts/code-review-bot/index.js 123 --rules ./custom-rules.js
```

### Via CLI global

```bash
# Instale globalmente
cd /caminho/para/bot-code-review
npm link

# Use de qualquer lugar
cd /outro/projeto
code-review 456
```

## 🆘 Troubleshooting

### Erro: `cp: cannot create regular file 'scripts/code-review-bot/.env'`

**Causa:** Link simbólico quebrado — geralmente ao rodar `install.sh` com caminho padrão antigo (`../bot-code-review`) ou link relativo inválido.

**Solução:**
```bash
# Reexecute o script (versão atualizada detecta o caminho automaticamente)
bash /caminho/para/bot-code-review/install.sh

# Ou recrie o link manualmente com caminho absoluto
rm -f scripts/code-review-bot
ln -s /caminho/absoluto/para/bot-code-review scripts/code-review-bot
cp /caminho/para/bot-code-review/.env.example scripts/.env.code-review-bot
```

### Bot não encontrado

```bash
# Verifique o link
ls -la scripts/code-review-bot

# Recrie se necessário
rm -f scripts/code-review-bot
ln -s /caminho/correto/bot-code-review scripts/code-review-bot
```

### Erro de permissão

```bash
chmod +x scripts/code-review-bot/index.js
```

### Dependências faltando

```bash
cd scripts/code-review-bot
npm install
```

### Token não carregado (link simbólico)

Confirme que os scripts npm usam `CODE_REVIEW_ENV_FILE=scripts/.env.code-review-bot` e que o arquivo existe:

```bash
cat scripts/.env.code-review-bot | grep BITBUCKET_TOKEN
```

## 📚 Documentação

- [README.md](README.md) - Visão geral
- [QUICK_START.md](QUICK_START.md) - Início rápido
- [CUSTOMIZING_RULES.md](CUSTOMIZING_RULES.md) - Customizar regras
- [AI_INTEGRATION.md](AI_INTEGRATION.md) - Análise com IA
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribuir

## 💬 Suporte

- Issues: https://github.com/newtonasc/bot-code-review/issues
- Discussões: https://github.com/newtonasc/bot-code-review/discussions

---

**Pronto para começar?** Execute `bash install.sh` e configure `scripts/.env.code-review-bot`! 🚀
