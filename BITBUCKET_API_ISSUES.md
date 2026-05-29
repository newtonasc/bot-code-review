# 🔍 Problemas Conhecidos da API do Bitbucket

## ❌ Erro 404: Endpoint `/diffstat` não disponível

### **Problema**
```
⚠️ Endpoint /diffstat da PR não disponível: 404 Request failed with status code 404
```

### **Por que isso acontece?**

O erro 404 no endpoint `/pullrequests/{pr_id}/diffstat` ocorre por **limitações da API do Bitbucket Cloud** que variam dependendo de:

#### 1. **Tipo de Repositório**
- **Repositórios públicos**: Algumas APIs podem estar restritas
- **Repositórios privados**: Dependem das permissões do workspace
- **Repositórios antigos**: Podem não ter todos os endpoints disponíveis

#### 2. **Tipo de Autenticação**
- **Repository Access Token**: Pode ter limitações de endpoints
- **App Password (Basic Auth)**: Acesso diferente a alguns recursos
- **OAuth Apps**: Endpoints podem variar conforme scopes

#### 3. **Configuração do Workspace**
- Workspaces com configurações de segurança restritivas
- Workspaces em planos gratuitos vs pagos
- Limitações de API por workspace

#### 4. **Estado da PR**
- PRs muito antigas (antes de mudanças na API)
- PRs com muitos commits (timeouts)
- PRs com arquivos deletados ou movidos complexamente

### **Endpoints Afetados**

O bot tenta 3 métodos para buscar arquivos modificados:

| Método | Endpoint | Status |
|--------|----------|--------|
| 1 | `/diffstat/{destHash}..{sourceHash}` | ⚠️ Pode retornar 404 |
| 2 | `/pullrequests/{pr_id}/diffstat` | ⚠️ Pode retornar 404 |
| 3 | `/pullrequests/{pr_id}/commits` + `/diffstat/{hash}` | ✅ Geralmente funciona |

### **Solução Implementada**

O bot implementa **sistema inteligente de fallback** com cache:

```javascript
// 1ª tentativa: Comparação direta de commits
GET /diffstat/{destHash}..{sourceHash}

// 2ª tentativa: Endpoint direto da PR
GET /pullrequests/{pr_id}/diffstat

// 3ª tentativa: Busca commits individuais
GET /pullrequests/{pr_id}/commits
GET /diffstat/{commit_hash}
```

**Recursos do sistema:**
- ✅ **Cache inteligente**: Memoriza endpoints que retornam 404
- ✅ **Pula tentativas**: Não tenta endpoints já conhecidos como indisponíveis
- ✅ **Fallback automático**: Sempre encontra os arquivos por um dos métodos
- ✅ **Zero interrupção**: O usuário não precisa fazer nada

### **Comportamento Esperado**

#### Primeira execução:
```bash
🔍 Método 1: Comparação de commits...
ℹ️  Método 1 não disponível neste repositório (será ignorado nas próximas execuções)
🔍 Método 2: Endpoint direto da PR #123...
ℹ️  Método 2 não disponível neste repositório (será ignorado nas próximas execuções)
🔍 Método 3: Buscando arquivos através dos commits da PR...
✅ Método 3 bem-sucedido: 5 arquivo(s) encontrados
```

#### Execuções seguintes:
```bash
⏭️  Método 1 pulado (não disponível neste repositório)
⏭️  Método 2 pulado (não disponível neste repositório)
🔍 Método 3: Buscando arquivos através dos commits da PR...
✅ Método 3 bem-sucedido: 3 arquivo(s) encontrados
```

### **Não é um erro crítico!**

✅ O bot **funciona normalmente** mesmo com esse "erro"  
✅ É apenas um aviso de que um método específico não está disponível  
✅ O sistema automaticamente usa outro método que funciona  
✅ Após a primeira execução, o erro não aparece mais

### **Quando se preocupar**

⚠️ **Preocupe-se apenas se:**
- TODOS os 3 métodos falharem
- Nenhum arquivo for encontrado
- A PR realmente tem arquivos modificados mas o bot não os detecta

### **Como Verificar Manualmente**

```bash
# Teste o endpoint direto
curl -H "Authorization: Bearer $TOKEN" \
  https://api.bitbucket.org/2.0/repositories/{workspace}/{repo}/pullrequests/{pr_id}/diffstat

# Teste via commits
curl -H "Authorization: Bearer $TOKEN" \
  https://api.bitbucket.org/2.0/repositories/{workspace}/{repo}/pullrequests/{pr_id}/commits
```

### **Referências**

- [Bitbucket Cloud REST API](https://developer.atlassian.com/cloud/bitbucket/rest/)
- [Pull Requests API](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/)
- [Diff API](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-commits/)

### **Histórico de Mudanças**

| Versão | Data | Mudança |
|--------|------|---------|
| v1.0 | Mai 2026 | Sistema básico de fallback |
| v2.0 | Mai 2026 | Cache inteligente de endpoints indisponíveis |

---

💡 **Resumo**: Este não é um bug do bot, mas uma limitação conhecida da API do Bitbucket. O bot lida automaticamente com isso usando métodos alternativos.
