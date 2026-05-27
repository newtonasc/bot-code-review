# 🔄 Bitbucket Code Review Bot

Bot de code review automatizado para **Bitbucket** com integração ao **Jira**.

## 🎯 Visão Geral

Este bot foi especialmente adaptado para trabalhar com o ecossistema Atlassian:
- ✅ **Bitbucket Cloud**: Pull Requests e comentários
- ✅ **Jira**: Issues e rastreamento de tarefas
- ✅ **MCP Atlassian**: Integração avançada (opcional)

## 🚀 Configuração Rápida

### 1. Gerar Repository Access Token do Bitbucket

1. Acesse: `https://bitbucket.org/{workspace}/{repo}/admin/access-tokens/`
2. Clique em "Create Repository Access Token"
3. Nome: "Code Review Bot"
4. Permissões necessárias:
   - **Pull requests**: Read e Write
5. Clique em "Create"
6. Copie o token gerado (você não poderá vê-lo novamente)

### 2. Configurar Variáveis de Ambiente

```bash
# Copie o template
cd scripts/code-review-bot
cp .env.example .env

# Edite com suas credenciais
nano .env
```

Configure as seguintes variáveis:

```bash
# Bitbucket (Obrigatório)
BITBUCKET_TOKEN=seu-token
BITBUCKET_WORKSPACE=seu-workspace
BITBUCKET_REPO_SLUG=your-repo

# Jira (Opcional, mas recomendado)
JIRA_CLOUD_ID=your-cloud-id
JIRA_PROJECT_KEY=B2B
```

**Como encontrar seu workspace:**
- Acesse seu repositório no Bitbucket
- URL será: `https://bitbucket.org/{workspace}/{repo}`
- O `{workspace}` é o seu workspace

**Como encontrar o Cloud ID do Jira:**
- Acesse: `https://{yoursite}.atlassian.net/_edge/tenant_info`
- Copie o valor de `cloudId`

### 3. Instalar Dependências

```bash
npm install
```

### 4. Executar o Bot

```bash
# Analisar PR #123
node index.js 123

# Ou a partir da raiz do projeto
npm run code-review 123

# Dry-run (apenas visualizar)
npm run code-review 123 -- --dry-run
```

## 📊 Diferenças do GitHub para Bitbucket

### Ações de Review

| GitHub | Bitbucket | Comportamento |
|--------|-----------|---------------|
| REQUEST_CHANGES | Comentário + Remove aprovação | Solicita mudanças via comentário |
| APPROVE | Approve PR | Aprova a Pull Request |
| COMMENT | Comentário | Apenas adiciona comentário |

**Nota:** Bitbucket não tem conceito formal de "Request Changes" como o GitHub. O bot:
1. Adiciona comentário detalhando as mudanças necessárias
2. Remove aprovação existente (se houver)

### Comentários Inline

O Bitbucket suporta comentários inline nativamente. O bot:
- ✅ Adiciona comentários inline em linhas específicas
- ✅ Agrupa comentários relacionados
- ✅ Usa Markdown para formatação

### Issues

- **GitHub**: Tem sistema de issues próprio
- **Bitbucket**: Usa Jira para issues

O bot automaticamente:
- Detecta chaves do Jira (B2B-123, PROJ-456)
- Enriquece análise com dados da issue do Jira
- Não tenta buscar issues do Bitbucket (não existem)

## 🎯 Uso Típico

### Exemplo 1: PR com Issue do Jira

```bash
# PR com título: "fix: Corrige validação [B2B-567]"
npm run code-review 234
```

**Saída:**
```
✅ Autenticado como: João Silva
✅ PR encontrada: fix: Corrige validação [B2B-567]
✅ Issue do Jira detectada: B2B-567

📋 Issue do Jira: B2B-567
- Tipo: Bug
- Status: In Progress
- Prioridade: High

⚠️  RECOMENDAÇÕES:
🚨 Issue do tipo Bug mas não há testes adicionados
💡 Adicione testes para garantir que o bug não ocorra novamente

📊 RELATÓRIO DE CODE REVIEW
Issues encontradas: 5
  🚨 Erros: 2
  ⚠️  Avisos: 3
```

### Exemplo 2: Criar Review com Solicitação de Mudanças

```bash
npm run code-review 345

# Fluxo interativo:
# 1. Visualize o relatório
# 2. Selecione: [e] Apenas erros
# 3. Tipo: [1] REQUEST_CHANGES
# 4. Confirme: s
```

**Resultado no Bitbucket:**
- ✅ Comentário principal com resumo
- ✅ Comentários inline nas linhas com problemas
- ✅ Aprovação removida (se existia)

### Exemplo 3: Aprovar com Sugestões

```bash
npm run code-review 456

# Selecione: [w] Apenas avisos
# Tipo: [3] APPROVE
```

**Resultado:**
- ✅ PR aprovada
- ✅ Comentários com sugestões de melhoria

## 🔧 API do Bitbucket

O bot usa a API REST do Bitbucket Cloud v2.0:

### Endpoints Principais

```
GET  /repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}
GET  /repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/diffstat
GET  /repositories/{workspace}/{repo_slug}/src/{commit_hash}/{path}
POST /repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/comments
POST /repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/approve
```

### Autenticação

O bot usa **Bearer Token** com:
- Repository Access Token gerado no repositório
- Header: `Authorization: Bearer {token}`

## 🔍 Detecção de Issues do Jira

O bot detecta automaticamente issues do Jira em:

### 1. Título da PR
```
fix: Corrige bug de autenticação [B2B-123]
feat(api): Implementa endpoint B2B-456
```

### 2. Descrição da PR
```
Este PR implementa autenticação JWT.

Closes B2B-789
Resolves B2B-790
```

### 3. Nome do Branch
```
feature/B2B-123-autenticacao
bugfix/B2B-456-validacao
hotfix/B2B-789-correcao-critica
```

## ⚙️ Configuração Avançada

### Pipelines do Bitbucket

Você pode integrar o bot nos Pipelines:

```yaml
# bitbucket-pipelines.yml
pipelines:
  pull-requests:
    '**':
      - step:
          name: Code Review Bot
          image: node:22
          script:
            - cd scripts/code-review-bot
            - npm install
            - export BITBUCKET_TOKEN=$BITBUCKET_REPO_TOKEN
            - export BITBUCKET_WORKSPACE=$BITBUCKET_WORKSPACE
            - export BITBUCKET_REPO_SLUG=$BITBUCKET_REPO_SLUG
            - node index.js $BITBUCKET_PR_ID --dry-run
```

**Variáveis do Pipeline:**
- `$BITBUCKET_PR_ID`: ID da PR automaticamente
- Configure `BITBUCKET_REPO_TOKEN` nas Repository Variables

### Cache de Aprovações

Se você quiser cache de decisões:

```javascript
// config.json
{
  "cache": {
    "enabled": true,
    "ttl": 3600
  }
}
```

## 🐛 Troubleshooting

### Erro: "Unauthorized"

**Causa:** Credenciais inválidas ou App Password sem permissões

**Solução:**
1. Verifique username e app password no .env
2. Regenere o App Password com permissões corretas:
   - Pull requests: Read, Write

### Erro: "Repository not found"

**Causa:** Workspace ou repo slug incorretos

**Solução:**
```bash
# Verifique a URL do seu repositório
# https://bitbucket.org/{workspace}/{repo_slug}

export BITBUCKET_WORKSPACE=seu-workspace-correto
export BITBUCKET_REPO_SLUG=nome-correto-do-repo
```

### Erro: "Cannot read property 'title'"

**Causa:** PR não encontrada ou ID inválido

**Solução:**
1. Verifique se o número da PR está correto
2. Certifique-se de que a PR existe no repositório
3. Use o ID numérico (ex: 123, não #123)

### Comentários não aparecem inline

**Causa:** Número de linha inválido ou arquivo não existe no diff

**Solução:**
- Comentários inline só funcionam em linhas modificadas
- Se a linha não estiver no diff, o comentário será geral

## 📚 Documentação Adicional

- [README Principal](README.md) - Funcionalidades e regras
- [JIRA_INTEGRATION.md](JIRA_INTEGRATION.md) - Integração com Jira
- [DEVELOPMENT.md](DEVELOPMENT.md) - Adicionar novas regras
- [QUICK_START.md](QUICK_START.md) - Guia rápido

## 🆚 Comparação GitHub vs Bitbucket

| Recurso | GitHub | Bitbucket |
|---------|--------|-----------|
| **Autenticação** | Token | Username + App Password |
| **Reviews** | Request Changes, Approve, Comment | Approve, Comment |
| **Issues** | Nativo | Jira |
| **API** | Octokit | Axios + REST |
| **Comentários Inline** | ✅ | ✅ |
| **Aprovação** | Via Review | Endpoint separado |

## 💡 Dicas Bitbucket

1. **Use branches descritivos** com a chave do Jira
   ```
   feature/B2B-123-nova-funcionalidade
   ```

2. **Referencie a issue** no título da PR
   ```
   feat: Nova funcionalidade [B2B-123]
   ```

3. **Configure merge checks** no Bitbucket:
   - Require approvals before merging
   - Require passing builds
   - Check that all tasks are resolved

4. **Integre com Jira** para rastreamento automático
   - Smart Commits: `B2B-123 #time 2h #comment Fixed bug`
   - Transições automáticas de status

## 🎓 Referências

- [Bitbucket API Documentation](https://developer.atlassian.com/cloud/bitbucket/rest/)
- [Bitbucket App Passwords](https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/)
- [Jira REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Bitbucket Pipelines](https://support.atlassian.com/bitbucket-cloud/docs/get-started-with-bitbucket-pipelines/)

---

**Desenvolvido pela newtonasc para o ecossistema Atlassian** 🚀
