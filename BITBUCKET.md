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

| Tipo | Endpoint Bitbucket | Comportamento |
|------|--------------------|---------------|
| REQUEST_CHANGES | `POST /request-changes` | Aciona o "Request Changes" nativo (equivalente ao Shift+R na UI). Bloqueia o merge até as mudanças serem endereçadas. Fallback para remoção de aprovação se o token não tiver permissão. |
| APPROVE | `POST /approve` | Aprova a Pull Request |
| COMMENT | `POST /comments` | Apenas adiciona comentário, sem alterar o status da PR |

**Nota:** O Bitbucket possui endpoint nativo de "Request Changes" (`POST /pullrequests/{id}/request-changes`), o mesmo acionado pelo botão na interface web (Shift+R). O bot o utiliza diretamente, alterando o estado do participante para `changes_requested` e bloqueando o merge.

### Comentários Inline

O Bitbucket suporta comentários inline nativamente. O bot:
- ✅ Adiciona comentários inline em linhas específicas
- ✅ Fallback automático para comentário geral quando a linha não está no diff
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

### Erro 404: "Endpoint /diffstat da PR não disponível"

**Causa:** Limitações conhecidas da API do Bitbucket Cloud

**Solução:** Isso é **normal e esperado**! O bot automaticamente usa métodos alternativos.

📖 **Leia mais**: [BITBUCKET_API_ISSUES.md](BITBUCKET_API_ISSUES.md) - Explicação completa

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

**Causa:** A linha reportada não faz parte do diff da PR (linhas fora do contexto modificado).

**Comportamento atual:** O bot tenta postar o comentário inline. Se a API retornar 400, faz fallback automático para comentário geral com o contexto `arquivo:linha` no texto — nenhuma issue é perdida.

## 📚 Documentação Adicional

- [README Principal](README.md) - Funcionalidades e regras
- [JIRA_INTEGRATION.md](JIRA_INTEGRATION.md) - Integração com Jira
- [DEVELOPMENT.md](DEVELOPMENT.md) - Adicionar novas regras
- [QUICK_START.md](QUICK_START.md) - Guia rápido

## 🆚 Comparação GitHub vs Bitbucket

| Recurso | GitHub | Bitbucket |
|---------|--------|-----------|
| **Autenticação** | Token | Username + App Password |
| **Reviews** | Request Changes, Approve, Comment | Request Changes, Approve, Comment |
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
