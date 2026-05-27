# 🤖 GitHub Models - Guia de Configuração

## 📋 Visão Geral

GitHub Models permite usar vários modelos de IA (GPT-4o, Phi-3, Llama, etc.) através da infraestrutura Azure, com possível tier gratuito para testes e uso pessoal.

## ⚙️ Configuração

### 1. Obter Acesso ao GitHub Models

1. Acesse: https://github.com/marketplace/models
2. Escolha um modelo (recomendado: **GPT-4o**)
3. Clique em **"Get started"**
4. Siga as instruções para habilitar o acesso

### 2. Criar Personal Access Token

1. Acesse: https://github.com/settings/tokens
2. Clique em **"Generate new token"** → **"Generate new token (classic)"**
3. Configure:
   - **Note**: `Code Review Bot - GitHub Models`
   - **Expiration**: 90 days (ou conforme preferir)
   - **Scopes**: Marque **`repo`** (necessário para acessar Models)
4. Clique em **"Generate token"**
5. **Copie o token** (começa com `ghp_...`)

### 3. Configurar o Bot

Edite `.env`:

```bash
# ===== Configuração de IA =====
AI_PROVIDER=github-models
AI_API_KEY=ghp_your_github_token_here
```

### 4. Testar a Integração

```bash
node index.js 1912 --dry-run
```

Se configurado corretamente, você verá:

```
🤖 Análise com IA habilitada (github-models)
```

## 🎯 Modelos Disponíveis

Atualmente, o bot usa **GPT-4o** por padrão. Você pode alterar em [ai-analyzer.js](ai-analyzer.js):

```javascript
'github-models': {
  baseURL: 'https://models.inference.ai.azure.com/chat/completions',
  model: 'gpt-4o', // Altere aqui se quiser outro modelo
  headers: {
    'Authorization': `Bearer ${this.apiKey}`,
    'content-type': 'application/json',
  },
},
```

**Modelos suportados:**
- `gpt-4o` - Recomendado para análise de código
- `gpt-4o-mini` - Versão mais leve e econômica
- `gpt-4` - Modelo anterior, ainda poderoso
- Outros modelos disponíveis no GitHub Models

## 💰 Custos

GitHub Models pode oferecer:
- **Tier Gratuito**: Para uso pessoal e testes (limitações de rate)
- **Tier Pago**: Baseado em uso (similar aos preços do Azure OpenAI)

Consulte: https://github.com/marketplace/models para detalhes atualizados de preços.

## 🔍 Troubleshooting

### Erro 401 (Unauthorized)

```
❌ Erro: 401 Unauthorized
```

**Causa**: Token inválido ou sem permissões

**Solução**:
1. Verifique se o token está correto no `.env`
2. Certifique-se de que marcou o scope `repo` ao criar o token
3. Tente criar um novo token

### Erro 403 (Forbidden)

```
❌ Erro: 403 Forbidden
```

**Causa**: Sem acesso ao GitHub Models

**Solução**:
1. Acesse https://github.com/marketplace/models
2. Habilite o acesso ao modelo desejado
3. Aguarde alguns minutos para a ativação

### Erro 429 (Rate Limit)

```
⚠️  Cota da IA excedida
```

**Causa**: Limite de requisições atingido

**Solução**:
1. Se estiver no tier gratuito, aguarde o reset (geralmente horário)
2. Considere upgrade para tier pago
3. Use o provider OpenAI ou Claude como alternativa

## 🆚 Comparação com Outros Providers

| Característica | GitHub Models | OpenAI | Claude |
|----------------|--------------|--------|--------|
| Tier Gratuito | ✅ Sim | ❌ Não | ❌ Não |
| Modelos Disponíveis | Vários | GPT-4o, GPT-4 | Claude 3.5 Sonnet |
| Infraestrutura | Azure | OpenAI | Anthropic |
| Rate Limits | Moderado | Alto | Alto |
| Melhor Para | Testes, uso pessoal | Produção | Análise de código |

## 🚀 Próximos Passos

Após configurar:

1. Execute o bot em uma PR de teste
2. Avalie a qualidade das análises
3. Ajuste o modelo se necessário
4. Configure alertas de rate limit

## 📚 Recursos

- [GitHub Models Marketplace](https://github.com/marketplace/models)
- [Documentação Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [AI_INTEGRATION.md](AI_INTEGRATION.md) - Guia geral de integração com IA

---

**Dica**: Se você tem créditos do GitHub Copilot, pode ter acesso gratuito a alguns modelos através do GitHub Models! 🎉
