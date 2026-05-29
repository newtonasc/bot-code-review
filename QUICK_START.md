# 🚀 Quick Start - Code Review Bot

Guia rápido para começar a usar o bot no **Bitbucket** em 3 minutos.

## 1. Configuração Inicial (uma vez)

### Gerar Repository Access Token do Bitbucket

```bash
# 1. Acesse: https://bitbucket.org/{workspace}/{repo}/admin/access-tokens/
# 2. Clique em "Create Repository Access Token"
# 3. Selecione os escopos: Pull requests (Read, Write)
# 4. Copie o token gerado
```

### Configurar o Bot

```bash
# Navegue até o diretório do bot
cd scripts/code-review-bot

# Copie o arquivo de exemplo
cp .env.example .env

# Edite o .env e adicione seu token
nano .env  # ou use seu editor preferido
```

No arquivo `.env`:
```bash
BITBUCKET_TOKEN=seu-token
BITBUCKET_WORKSPACE=seu-workspace
BITBUCKET_REPO_SLUG=your-repo

# Opcional: Integração com Jira
JIRA_CLOUD_ID=your-cloud-id
JIRA_PROJECT_KEY=B2B
```

### Instalar Dependências

```bash
npm install
```

## 2. Uso Básico

### Analisar uma PR

```bash
# A partir do diretório do bot
node index.js 123  # substitua 123 pelo número da PR
```

### Ou use o script wrapper (a partir da raiz do projeto)

```bash
# A partir da raiz do projeto your-repo
./scripts/run-code-review.sh 123
```

## 3. Fluxo Interativo

Quando executar o bot, você verá:

1. **Relatório de Análise** 
   - Visualize todas as issues encontradas
   - Erros e avisos separados por arquivo

2. **Seleção de Issues**
   ```
   [a] Selecionar todas
   [e] Apenas erros
   [w] Apenas avisos
   [c] Seleção customizada
   [n] Cancelar
   ```

3. **Tipo de Review**
   ```
   [1] REQUEST_CHANGES (recomendado para erros)
   [2] COMMENT
   [3] APPROVE
   ```

4. **Confirmação**
   - Revise e confirme antes de criar o review

## 4. Modo Dry Run (Recomendado para Primeira Vez)

Apenas veja o relatório sem criar review:

```bash
node index.js 123 --dry-run
```

> `--dry-run` sempre tem prioridade: nenhuma ação é executada no PR, mesmo que a automação esteja habilitada.

## 5. Automação de Review (Opcional)

Com IA configurada, o bot pode aprovar ou solicitar mudanças automaticamente. Adicione ao `.env`:

```bash
# Aprova automaticamente PRs com risco "low" avaliado pela IA
AUTO_APPROVE_ENABLED=true
AUTO_APPROVE_MAX_RISK=low          # low | medium | high

# Solicita mudanças automaticamente quando a IA recomendar REQUEST_CHANGES
AUTO_REQUEST_CHANGES_ENABLED=true
```

**Comportamento:**
- `AUTO_APPROVE_ENABLED`: Se o risco avaliado estiver dentro do limite, a PR é aprovada sem interação. Se exceder o limite, cai no fluxo interativo normal.
- `AUTO_REQUEST_CHANGES_ENABLED`: Quando a IA recomenda `REQUEST_CHANGES`, posta todos os comentários e registra o request changes automaticamente.
- Ambos ignorados se `--dry-run` for usado.

## 6. Dicas Rápidas

✅ **DO:**
- Use `--dry-run` primeiro para ver o que será reportado
- Selecione apenas issues relevantes (use `[e]` para focar em erros)
- Execute `npm run lint` após corrigir issues

❌ **DON'T:**
- Não reporte todos os avisos em PRs grandes (use seleção customizada)
- Não crie múltiplos reviews para a mesma PR (use o modo dry-run para testar)

## 6. Troubleshooting Rápido

**Erro: Credenciais inválidas**
```bash
# Verifique se o .env existe e está correto
cat .env

# Se não existir, crie:
cp .env.example .env
nano .env
```

**Erro: Permission denied ao executar script**
```bash
chmod +x scripts/run-code-review.sh
```

**Dependências não instaladas**
```bash
cd scripts/code-review-bot
npm install
```

**Erro: Workspace não encontrado**
```bash
# Verifique a URL do seu repositório:
# https://bitbucket.org/{workspace}/{repo}
# Use o {workspace} da URL
export BITBUCKET_WORKSPACE=workspace-correto
```

## 7. Exemplos de Uso Real

### Revisar PR antes de aprovar
```bash
./scripts/run-code-review.sh 234 --dry-run
# Analise o relatório, depois execute sem --dry-run
./scripts/run-code-review.sh 234
# Selecione [e] para reportar apenas erros
```

### Revisar PR rápida (apenas erros críticos)
```bash
./scripts/run-code-review.sh 345
# Selecione [e] (apenas erros)
# Escolha [1] (REQUEST_CHANGES)
```

### Analisar conformidade com issue
```bash
./scripts/run-code-review.sh 456
# O bot automaticamente busca a issue referenciada
# Exibe análise de conformidade
```

## 📚 Documentação Completa

Para mais detalhes, consulte o [README completo](README.md).

---

**Pronto para começar!** Execute `node index.js --help` para ver todas as opções.
