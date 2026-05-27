# 🤖 Executar Bot com MCP da Atlassian

Este guia mostra como usar o Claude/Cursor com MCP para enriquecer a análise do bot com dados do Jira.

## 🎯 Visão Geral

O bot pode ser executado de três formas:

### 1️⃣ Modo Standalone (Atual)
```bash
npm run code-review 1912
```
- ✅ Detecta issue do Jira (ex: PROJ-123)
- ⚠️ Não busca dados automaticamente
- ℹ️ Sugere consultar manualmente

### 2️⃣ Modo Assistido via Claude (Com MCP)
```
Olá Claude, por favor:
1. Busque a issue PROJ-123 do Jira
2. Execute o bot de code review na PR 1912 com esses dados
```

Claude responde:
```javascript
// Busca via MCP
const issue = await getJiraIssue("your-cloud-id", "PROJ-123");

// Executa bot com dados
await bot.run(1912, { jiraIssue: issue });
```

### 3️⃣ Modo Automático (Futuro)
Com MCP habilitado no código:
```javascript
const jiraConfig = {
  cloudId: 'your-cloud-id',
  projectKey: 'PROJ',
  mcpEnabled: true  // ← Habilita busca automática
};
```

## 📋 Como Usar via Claude (Recomendado)

### Passo 1: Solicitar ao Claude

```
Claude, por favor analise a PR 1912 do Bitbucket:

1. Busque os dados da issue do Jira associada (se houver)
2. Execute o bot de code review
3. Enriqueça a análise com o contexto da issue
```

### Passo 2: Claude Executará

```javascript
// 1. Busca PR para detectar issue
const pr = await bitbucket.getPullRequest(1912);
const jiraKey = extractJiraKey(pr.title); // Ex: PROJ-123

// 2. Busca issue do Jira via MCP
const jiraIssue = await getJiraIssue(cloudId, jiraKey);

// 3. Analisa issue
const analysis = analyzeJiraIssue(jiraIssue);
// - Requisitos técnicos
// - Critérios de aceite
// - Prioridade
// - Tipo (Bug, Task, etc)

// 4. Executa bot com contexto completo
await bot.run(1912, { jiraIssue });

// 5. Gera recomendações baseadas na issue
const recommendations = generateRecommendations(analysis, files);
```

## 🔧 Configuração do MCP

O MCP da Atlassian já está configurado via skill `jira-assistant`.

**Variáveis necessárias** (já no .env):
```bash
JIRA_CLOUD_ID=your-cloud-id
JIRA_PROJECT_KEY=PROJ
```

## 📊 Análise Enriquecida

Com dados do Jira, o bot verifica:

### ✅ Alinhamento com Requisitos
```
Issue: PROJ-123
Requisitos Técnicos:
  - Implementar exportação de veículos
  - Adicionar filtro de dias em estoque
  - Validar permissões do usuário

Arquivos modificados:
  ✅ src/services/components/vehicle/export/VehicleExport.js
  ✅ src/services/components/vehicle/util/vehicleExportDataPrepare.js
  ⚠️  Faltam testes para dias em estoque
```

### ✅ Critérios de Aceite
```
Critérios de Aceite:
  [ ] Exportar somente veículos com dias em estoque >= X
  [ ] Validar permissão do usuário antes de exportar
  [ ] Retornar erro amigável se não houver veículos

Recomendação: Verifique se todos os critérios foram implementados
```

### ✅ Verificações por Tipo
```
Tipo: Bug
Prioridade: High

⚠️ Issue do tipo Bug mas não há testes adicionados
💡 Adicione testes para garantir que o bug não ocorra novamente
```

## 🚀 Exemplo Completo

### Solicitação ao Claude
```
Claude, analise a PR 1912:
- Busque a issue do Jira associada
- Execute code review considerando os requisitos da issue
- Verifique alinhamento entre código e critérios de aceite
```

### Resposta do Claude
```
🔍 Analisando PR #1912...

📋 Issue do Jira: PROJ-123
- Tipo: Task
- Status: In Progress
- Prioridade: Medium
- Resumo: Implementar exportação de veículos com filtro de dias em estoque

📊 Requisitos Técnicos:
1. ✅ Implementar serviço de exportação
2. ✅ Adicionar filtro de dias em estoque
3. ⚠️  Adicionar testes unitários (PENDENTE)

📄 Arquivos Analisados: 5
🔍 Issues Encontradas: 10 (2 erros, 8 avisos)

🚨 Erros Críticos:
1. [imports-02] Use ES6 import ao invés de require()
   📍 __tests__/integration/vehicle-export.integration.spec.js

⚠️ Recomendações baseadas na Issue:
- Adicionar testes para filtro de dias em estoque
- Validar critério de aceite: erro amigável sem veículos
- Issue tem prioridade Medium, revisar cuidadosamente

✅ Recomendação: REQUEST_CHANGES
```

## 💡 Dicas

1. **Sempre mencione a PR**: "Analise a PR 1912"
2. **Solicite contexto do Jira**: "Busque a issue associada"
3. **Peça análise completa**: "Verifique alinhamento com requisitos"
4. **Use iterativamente**: Claude pode buscar dados adicionais conforme necessário

## 🔗 Links Úteis

- Jira Project: https://your-org.atlassian.net/browse/PROJ
- Bitbucket: https://bitbucket.org/your-workspace/your-repo
- MCP Atlassian Docs: (skill jira-assistant)
