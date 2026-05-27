#!/bin/bash

# Script de instalação do Code Review Bot em outro projeto

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(pwd)"

echo "🤖 Code Review Bot - Setup"
echo "=========================="
echo ""

# Verifica se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script no diretório raiz do seu projeto"
    exit 1
fi

# Pergunta o caminho do bot
echo "📂 Onde está o bot-code-review?"
read -p "   Caminho (padrão: $SCRIPT_DIR): " BOT_PATH
BOT_PATH=${BOT_PATH:-$SCRIPT_DIR}

if [ ! -d "$BOT_PATH" ]; then
    echo "❌ Diretório não encontrado: $BOT_PATH"
    exit 1
fi

BOT_PATH="$(cd "$BOT_PATH" && pwd)"

if [ ! -f "$BOT_PATH/.env.example" ]; then
    echo "❌ Arquivo .env.example não encontrado em: $BOT_PATH"
    exit 1
fi

# Instalação no próprio repositório do bot
if [ "$PROJECT_ROOT" = "$BOT_PATH" ]; then
    echo ""
    echo "📍 Você está no repositório do bot."
    echo "📝 Configurando ambiente local..."

    if [ ! -f ".env" ]; then
        cp ".env.example" ".env"
        echo "✅ Arquivo .env criado a partir de .env.example"
    else
        echo "ℹ️  .env já existe — mantido sem alterações"
    fi

    echo ""
    echo "✅ Setup concluído!"
    echo ""
    echo "📋 Próximos passos:"
    echo "   1. Configure credenciais: nano .env"
    echo "   2. Instale dependências: npm install"
    echo "   3. Teste o bot: npm run help"
    echo "   4. Analise uma PR: npm run review -- <pr-number>"
    echo ""
    echo "📚 Documentação: README.md"
    echo ""
    exit 0
fi

# Cria diretório para scripts se não existir
mkdir -p scripts

# Cria link simbólico com caminho absoluto
echo ""
echo "🔗 Criando link simbólico..."
rm -f scripts/code-review-bot
ln -sf "$BOT_PATH" scripts/code-review-bot

if [ ! -e "scripts/code-review-bot/.env.example" ]; then
    echo "❌ Link simbólico inválido. Verifique o caminho: $BOT_PATH"
    rm -f scripts/code-review-bot
    exit 1
fi

# Copia .env para o projeto (não através do symlink, para não alterar o repositório do bot)
ENV_FILE="scripts/.env.code-review-bot"
echo "📝 Copiando arquivo de configuração..."
if [ ! -f "$ENV_FILE" ]; then
    cp "$BOT_PATH/.env.example" "$ENV_FILE"
    echo "✅ Arquivo criado: $ENV_FILE"
else
    echo "ℹ️  $ENV_FILE já existe — mantido sem alterações"
fi

# Adiciona scripts ao package.json
echo ""
echo "📦 Adicionando scripts ao package.json..."

# Verifica se jq está instalado
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq não instalado. Adicione manualmente ao package.json:"
    echo '  "code-review": "CODE_REVIEW_ENV_FILE=scripts/.env.code-review-bot node scripts/code-review-bot/index.js",'
    echo '  "code-review:help": "CODE_REVIEW_ENV_FILE=scripts/.env.code-review-bot node scripts/code-review-bot/index.js --help"'
else
    # Adiciona scripts usando jq
    jq '.scripts += {
        "code-review": "CODE_REVIEW_ENV_FILE=scripts/.env.code-review-bot node scripts/code-review-bot/index.js",
        "code-review:help": "CODE_REVIEW_ENV_FILE=scripts/.env.code-review-bot node scripts/code-review-bot/index.js --help"
    }' package.json > package.json.tmp && mv package.json.tmp package.json
    
    echo "✅ Scripts adicionados!"
fi

echo ""
echo "✅ Setup concluído!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Configure credenciais: nano scripts/.env.code-review-bot"
echo "   2. Teste o bot: npm run code-review -- --help"
echo "   3. Analise uma PR: npm run code-review -- <pr-number>"
echo ""
echo "📚 Documentação: $BOT_PATH/README.md"
echo ""
