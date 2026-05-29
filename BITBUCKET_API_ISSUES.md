# 🔍 Problemas Conhecidos da API do Bitbucket

## ❌ Endpoints `/diffstat` e `/diff` não disponíveis (404)

### **Problema**
```
ℹ️  Método 1 não disponível neste repositório (será ignorado nas próximas execuções)
ℹ️  Método 2 não disponível neste repositório (será ignorado nas próximas execuções)
ℹ️  Endpoint de diff não disponível neste repositório, patch será gerado localmente.
```

### **Por que isso acontece?**

O erro 404 nos endpoints de diff/diffstat ocorre por **limitações da API do Bitbucket Cloud** que variam dependendo de:

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

O bot tenta 3 métodos para buscar os **arquivos modificados**:

| Método | Endpoint | Status |
|--------|----------|--------|
| 1 | `/diffstat/{destHash}...{sourceHash}` | ⚠️ Pode retornar 404 |
| 2 | `/pullrequests/{pr_id}/diffstat` | ⚠️ Pode retornar 404 |
| 3 | `/pullrequests/{pr_id}/commits` + `/diffstat/{hash}` | ✅ Geralmente funciona |

Para buscar o **diff (patch) de cada arquivo**, o bot tenta:

| Método | Endpoint | Status |
|--------|----------|--------|
| 1 | `/diff/{destHash}...{sourceHash}` | ⚠️ Pode retornar 404 |
| 2 | `/pullrequests/{pr_id}/diff` | ⚠️ Pode retornar 404 |
| Fallback | Geração local via lib `diff` | ✅ Sempre funciona |

### **Solução Implementada**

#### Busca de arquivos modificados — sistema de fallback em 3 métodos

```javascript
// 1ª tentativa: Comparação de commits via merge base
GET /diffstat/{destHash}...{sourceHash}

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

#### Busca do patch por arquivo — fallback para geração local

Quando os endpoints de diff da API retornam 404, o bot **gera o patch localmente**:

1. Busca o conteúdo do arquivo no commit de destino (base da PR)
2. Compara com a versão atual (commit source da PR)
3. Gera um unified diff no formato padrão usando a lib `diff`

Isso garante que a análise seja sempre **restrita às linhas efetivamente alteradas na PR**, sem depender da disponibilidade dos endpoints de diff da API.

### **Comportamento Esperado**

```bash
🔍 Método 1: Comparação de commits (abc1234...def5678)...
ℹ️  Método 1 não disponível neste repositório (será ignorado nas próximas execuções)
🔍 Método 2: Endpoint direto da PR #123...
ℹ️  Método 2 não disponível neste repositório (será ignorado nas próximas execuções)
🔍 Método 3: Buscando arquivos através dos commits da PR...
✅ Método 3 bem-sucedido: 5 arquivo(s) únicos encontrados
🔍 Buscando diff unificado da PR...
ℹ️  Endpoint de diff não disponível neste repositório, patch será gerado localmente.
🔍 Buscando conteúdo dos arquivos...
✅ Patch gerado localmente para 5 arquivo(s)
✅ 5 arquivo(s) processado(s) com sucesso
```

#### Execuções seguintes (cache ativo):
```bash
⏭️  Método 1 pulado (não disponível neste repositório)
⏭️  Método 2 pulado (não disponível neste repositório)
🔍 Método 3: Buscando arquivos através dos commits da PR...
✅ Método 3 bem-sucedido: 3 arquivo(s) encontrados
🔍 Buscando diff unificado da PR...
ℹ️  Endpoint de diff não disponível neste repositório, patch será gerado localmente.
✅ Patch gerado localmente para 3 arquivo(s)
```

### **Não é um erro crítico!**

✅ O bot **funciona normalmente** — os avisos são informativos  
✅ O patch é sempre gerado (via API ou localmente)  
✅ A análise é sempre restrita às linhas alteradas na PR  
✅ Após a primeira execução, os métodos 1 e 2 são pulados automaticamente

### **Quando se preocupar**

⚠️ **Preocupe-se apenas se:**
- TODOS os 3 métodos de diffstat falharem
- Nenhum arquivo for encontrado
- A PR realmente tem arquivos modificados mas o bot não os detecta

### **Como Verificar Manualmente**

```bash
# Teste o endpoint direto de diffstat
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
| v1.0 | Mai 2026 | Sistema básico de fallback para diffstat |
| v2.0 | Mai 2026 | Cache inteligente de endpoints indisponíveis |
| v1.10.0 | Mai 2026 | Geração local de patch quando `/diff` retorna 404; análise restrita às linhas alteradas |

---

💡 **Resumo**: Estas não são limitações do bot, mas restrições conhecidas da API do Bitbucket. O bot lida automaticamente com todos os casos usando métodos alternativos.
