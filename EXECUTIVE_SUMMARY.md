# Code Review Bot - Resumo Executivo

## 🤖 O que é?

Bot automatizado que analisa Pull Requests do projeto **seu projeto** no **Bitbucket**, identificando violações dos padrões de código e sugerindo correções.

> **Plataforma**: Bitbucket Cloud + Jira (ecossistema Atlassian)

## ✨ Principais Benefícios

- **Economiza Tempo**: Identifica problemas antes do review humano
- **Consistência**: Garante que todos sigam os mesmos padrões
- **Educacional**: Ensina boas práticas através das sugestões
- **Interativo**: Permite escolher quais issues reportar
- **Integrado com Jira**: Detecta automaticamente issues do Jira e enriquece análise

## 🎯 O que ele detecta?

- ❌ Imports incorretos (assumir que existe `index.js`)
- ❌ Falta de `ErrorHandler` em controllers
- ❌ Acesso direto a `req.permissions.accessProfile`
- ❌ Números mágicos ao invés de `httpStatus`
- ⚠️ Linhas em branco desnecessárias
- ⚠️ Violações de padrões de Services, Repositories e Models
- ⚠️ Falta de testes para novos serviços
- 🎯 **Novo!** Detecta números/strings hardcoded e sugere **enums específicos** do projeto
- E muito mais... (30+ regras)

## 🚀 Como usar?

### Setup (apenas uma vez)

```bash
# 1. Configurar Repository Access Token do Bitbucket
cd scripts/code-review-bot
cp .env.example .env
nano .env  # adicione BITBUCKET_TOKEN, BITBUCKET_WORKSPACE, etc.

# 2. Instalar dependências
npm install
```

### Uso Diário

```bash
# A partir da raiz do projeto
npm run code-review 123  # substitua 123 pelo número da PR

# Ou diretamente:
./scripts/run-code-review.sh 123
```

### Modo Dry Run (apenas visualizar)

```bash
npm run code-review 123 -- --dry-run
```

## 📊 Exemplo de Saída

```
================================================================================
📊 RELATÓRIO DE CODE REVIEW
================================================================================

📁 Arquivos analisados: 5
🔍 Issues encontradas: 8
   🚨 Erros: 3
   ⚠️  Avisos: 5

--------------------------------------------------------------------------------

📄 src/routes/controllers/ad.js
   3 issue(s) encontrada(s)

   🚨 [1.1] controller-01 (error)
      SEMPRE use ErrorHandler no bloco catch dos controllers.
      💡 Adicione: return ErrorHandler(err, req, res);

   🚨 [1.2] permission-01 (error)
      NUNCA acesse req.permissions.accessProfile diretamente.
      💡 Use: GetPermission(req.permissions, 'nome-permissao', 'R')

   ⚠️ [1.3] format-01 (warning)
      NÃO deixe linhas em branco desnecessárias dentro de métodos.
      💡 Remova as linhas em branco dentro do método.

...
```

## 📚 Documentação

- **Quick Start**: [`scripts/code-review-bot/QUICK_START.md`](scripts/code-review-bot/QUICK_START.md)
- **Guia Bitbucket**: [`scripts/code-review-bot/BITBUCKET.md`](scripts/code-review-bot/BITBUCKET.md)
- **Documentação Completa**: [`scripts/code-review-bot/README.md`](scripts/code-review-bot/README.md)
- **Guia de Desenvolvimento**: [`scripts/code-review-bot/DEVELOPMENT.md`](scripts/code-review-bot/DEVELOPMENT.md)

## 🎓 Referências

O bot segue as diretrizes definidas em:
- `.github/copilot-instructions.md` - Padrões do projeto
- `.eslintrc` - Regras de linting (max-len 120)
- Boas práticas da newtonasc

## 🤝 Quando usar?

### ✅ Use quando:
- Revisar PRs grandes (economiza tempo)
- Ensinar padrões a novos desenvolvedores
- Garantir consistência em múltiplas PRs
- Antes de solicitar review de outro dev

### ⚠️ Considere:
- Selecionar apenas issues relevantes (não reporte todos os avisos)
- Focar em erros críticos primeiro
- Usar como complemento ao review humano, não substituto

## 💡 Dica Rápida

```bash
# Workflow recomendado:
# 1. Visualize primeiro
npm run code-review 123 -- --dry-run

# 2. Se houver issues importantes, crie o review
npm run code-review 123
# Selecione [e] para reportar apenas erros

# 3. Desenvolvedor corrige e atualiza a PR

# 4. Re-execute para validar
npm run code-review 123 -- --dry-run
```

## 🛠️ Suporte

**Issues ou dúvidas?**
- Consulte a [documentação completa](scripts/code-review-bot/README.md)
- Ou entre em contato com a newtonasc

---

**Desenvolvido com ❤️ pela newtonasc**
