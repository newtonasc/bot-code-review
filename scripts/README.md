# 🛠️ Scripts de Utilidades

Scripts auxiliares para diagnóstico e troubleshooting do Code Review Bot.

## 📋 Scripts Disponíveis

### 🔍 test-jira-connection.js

Testa a conexão com a API do Jira e valida as credenciais configuradas.

**Uso:**
```bash
node scripts/test-jira-connection.js
```

**O que testa:**
- ✅ Conectividade com o Jira
- ✅ Autenticação via API Token
- ✅ Acesso a issues do projeto

**Quando usar:**
- Configuração inicial do bot
- Problemas de autenticação com Jira
- Validação após rotação de tokens

---

### 🐛 debug-jira-auth.js

Debug detalhado da autenticação com o Jira, com análise passo a passo.

**Uso:**
```bash
node scripts/debug-jira-auth.js
```

**O que faz:**
- 🔍 Valida formato do token e email
- 🔍 Testa endpoint de autenticação
- 🔍 Tenta acessar uma issue de teste
- 💡 Fornece sugestões específicas para cada erro

**Quando usar:**
- Erros 401/403/404 ao buscar issues do Jira
- Validação de configuração do `.env`
- Troubleshooting de problemas de permissão

---

## 📚 Recursos

Para mais informações sobre integração com Jira:
- [JIRA_INTEGRATION.md](../JIRA_INTEGRATION.md) - Guia completo de integração
- [.env.example](../.env.example) - Exemplo de configuração

## ⚙️ Configuração Necessária

Antes de executar os scripts, configure as variáveis no `.env`:

```bash
JIRA_SITE_URL=sua-org.atlassian.net
JIRA_TOKEN=seu_token_aqui
JIRA_USERNAME=seu_email@empresa.com
JIRA_PROJECT_KEY=PROJ
```

## 🆘 Problemas Comuns

### Erro 401 (Unauthorized)
- Token inválido ou expirado
- Email não corresponde ao token
- Solução: Crie um novo token em https://id.atlassian.com/manage-profile/security/api-tokens

### Erro 404 (Not Found)
- Issue não existe ou sem permissão de acesso
- Projeto não acessível com o token
- Solução: Verifique se você tem acesso ao projeto no Jira web

### Erro 403 (Forbidden)
- Token sem escopo para acessar Jira
- Solução: Use Atlassian API Token ao invés de Repository Access Token
