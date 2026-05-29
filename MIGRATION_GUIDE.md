# 🔄 Guia de Migração: GitHub → Bitbucket

Guia rápido para migrar do GitHub para Bitbucket.

## ⚡ Mudanças Rápidas

### 1. Variáveis de Ambiente

```bash
# ❌ REMOVER (GitHub)
GITHUB_TOKEN=ghp_xxx
GITHUB_OWNER=your-org
GITHUB_REPO=your-repo

# ✅ ADICIONAR (Bitbucket)
BITBUCKET_TOKEN=seu-token
BITBUCKET_WORKSPACE=seu-workspace
BITBUCKET_REPO_SLUG=your-repo
```

### 2. Gerar Token de Acesso

**Antes:** GitHub Personal Access Token
- https://github.com/settings/tokens
- Escopos: `repo`, `write:discussion`

**Agora:** Bitbucket Repository Access Token
- https://bitbucket.org/{workspace}/{repo}/admin/access-tokens/
- Escopos: `Pull requests` (Read, Write)

### 3. Reinstalar Dependências

```bash
cd scripts/code-review-bot
npm install  # Remove @octokit/rest automaticamente
```

## 📝 Checklist de Migração

- [ ] Gerar Repository Access Token do Bitbucket
- [ ] Atualizar `.env` com credenciais do Bitbucket
- [ ] Remover variáveis antigas do GitHub
- [ ] Executar `npm install`
- [ ] Testar com `npm run code-review <pr-number> -- --dry-run`
- [ ] Verificar se comentários aparecem corretamente
- [ ] Configurar variáveis do Jira (opcional)

## 🎯 Diferenças Principais

### Autenticação

| Aspecto | GitHub | Bitbucket |
|---------|--------|-----------|
| Método | Token | Repository Access Token |
| Formato | `ghp_xxxxx` | Token gerado no repositório |
| Escopo | Conta completa | Por repositório |

### Pull Requests

| Aspecto | GitHub | Bitbucket |
|---------|--------|-----------|
| ID | Número sequencial | Número sequencial |
| Review | REQUEST_CHANGES formal | Comentário + remove aprovação |
| Approve | Via review | Endpoint separado |
| Inline comments | ✅ | ✅ |

### Issues

| Aspecto | GitHub | Bitbucket |
|---------|--------|-----------|
| Sistema | Nativo do GitHub | Jira (integrado) |
| Detecção | `#123` ou issue key | Jira key apenas |
| API | Issues API | N/A (usa Jira) |

## 🚀 Comandos Iguais

Boa notícia: **os comandos não mudaram!**

```bash
# Continua igual
npm run code-review 123
npm run code-review 123 -- --dry-run
npm run code-review:help
```

## 🔍 Verificação Pós-Migração

### 1. Teste de Autenticação

```bash
# Deve mostrar seu usuário do Bitbucket
npm run code-review 123 -- --dry-run
# Saída esperada:
# ✅ Autenticado como: seu-usuario
```

### 2. Teste de PR

```bash
# Escolha uma PR existente
npm run code-review <numero-da-pr> -- --dry-run
# Verifique se:
# - PR é encontrada
# - Arquivos são listados
# - Análise é executada
```

### 3. Teste de Review

```bash
# Execute sem --dry-run para criar review de verdade
npm run code-review <numero-da-pr>
# Selecione algumas issues
# Confirme criação
# Verifique no Bitbucket se comentários apareceram
```

## 🐛 Problemas Comuns

### Erro: "Unauthorized"

**Causa:** Credenciais incorretas

**Solução:**
```bash
# Verifique o .env
cat .env | grep BITBUCKET

# Regenere o Repository Access Token se necessário
# https://bitbucket.org/{workspace}/{repo}/admin/access-tokens/
```

### Erro: "Repository not found"

**Causa:** Workspace ou repo slug incorreto

**Solução:**
```bash
# Verifique a URL do seu repositório:
# https://bitbucket.org/{WORKSPACE}/{REPO_SLUG}

# Atualize o .env
export BITBUCKET_WORKSPACE=workspace-da-url
export BITBUCKET_REPO_SLUG=repo-da-url
```

### Erro: Module '@octokit/rest' not found

**Causa:** Dependência antiga não removida

**Solução:**
```bash
cd scripts/code-review-bot
rm -rf node_modules
rm package-lock.json
npm install
```

### Comentários não aparecem inline

**Problema:** Comentários aparecem como gerais, não inline

**Causa:** A linha reportada não faz parte do diff da PR.

**Comportamento atual:** O bot tenta postar inline e, se a API rejeitar (HTTP 400), faz fallback automático para comentário geral incluindo o contexto `arquivo:linha` — nenhuma issue é silenciada.

## 📚 Documentação Atualizada

Toda a documentação foi atualizada:

- ✅ [README.md](README.md) - Guia principal
- ✅ [BITBUCKET.md](BITBUCKET.md) - Guia específico do Bitbucket
- ✅ [QUICK_START.md](QUICK_START.md) - Início rápido
- ✅ [.env.example](.env.example) - Template de variáveis
- ✅ [CHANGELOG.md](CHANGELOG.md) - Histórico de mudanças

## 💡 Dicas

1. **Mantenha o Jira configurado**
   - A integração com Jira ficou ainda mais importante
   - Configure `JIRA_CLOUD_ID` e `JIRA_PROJECT_KEY`

2. **Use branches com chave do Jira**
   ```bash
   feature/B2B-123-nova-funcionalidade
   bugfix/B2B-456-correcao
   ```

3. **Referencie a issue no título da PR**
   ```
   feat: Nova funcionalidade [B2B-123]
   fix: Corrige bug de validação [B2B-456]
   ```

4. **Configure Pipelines (opcional)**
   - Integre o bot nos Bitbucket Pipelines
   - Veja exemplo em [BITBUCKET.md](BITBUCKET.md)

## ✅ Vantagens da Migração

- ✅ **Integração nativa** com ecossistema Atlassian
- ✅ **Jira como fonte única** de verdade para issues
- ✅ **Repository Access Tokens** mais seguros e específicos
- ✅ **Menos dependências** (sem Octokit)
- ✅ **Comentários inline** nativos

## 🆘 Precisa de Ajuda?

1. Consulte [BITBUCKET.md](BITBUCKET.md) para guia detalhado
2. Veja [QUICK_START.md](QUICK_START.md) para início rápido
3. Execute `npm run code-review:help` para ajuda inline
4. Entre em contato com a newtonasc

---

**Migração completa em ~5 minutos!** 🚀
