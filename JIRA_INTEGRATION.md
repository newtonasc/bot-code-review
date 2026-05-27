# 🔗 Integração com Jira via MCP Atlassian

Guia de integração do Code Review Bot com o Jira usando o MCP (Model Context Protocol) da Atlassian.

## 📋 Visão Geral

O bot pode detectar automaticamente issues do Jira referenciadas em Pull Requests e enriquecer a análise de code review com:

- ✅ Requisitos técnicos da issue
- ✅ Critérios de aceite
- ✅ Tipo e prioridade da issue
- ✅ Validação de alinhamento entre PR e issue
- ✅ Recomendações específicas baseadas no contexto

## 🎯 Detecção Automática de Issues

O bot detecta automaticamente chaves do Jira nos seguintes locais:

### 1. Título da PR
```
fix: Corrige bug de autenticação [B2B-123]
feat(api): Implementa novo endpoint B2B-456
```

### 2. Descrição da PR
```
Este PR implementa o endpoint de autenticação conforme solicitado na issue B2B-789.

Closes B2B-789
Fixes B2B-790
```

### 3. Nome do Branch
```
feature/B2B-123-implementar-autenticacao
bugfix/B2B-456-corrigir-validacao
```

## 🚀 Configuração Básica

### 1. Configurar Variáveis de Ambiente

```bash
# .env
GITHUB_TOKEN=ghp_your_token_here
JIRA_CLOUD_ID=your-cloud-id
JIRA_PROJECT_KEY=B2B
```

**Como encontrar o Cloud ID:**
1. Acesse: `https://YOURSITE.atlassian.net/_edge/tenant_info`
2. Copie o valor de `cloudId`

### 2. Executar o Bot

```bash
# O bot detecta automaticamente a issue do Jira
npm run code-review 123

# Ou
./scripts/run-code-review.sh 123
```

## 📊 Análise Enriquecida

Quando uma issue do Jira é detectada, o bot fornece:

### Informações Exibidas

```
📋 Issue do Jira: B2B-123

- Tipo: Task
- Status: In Progress
- Prioridade: High
- Resumo: Implementar endpoint de autenticação
- Responsável: João Silva
- Labels: backend, authentication

Requisitos Técnicos:
- Criar middleware de autenticação
- Implementar JWT token generation
- Adicionar validação de credenciais

Critérios de Aceite:
- Usuários podem fazer login com email e senha
- Tokens JWT são gerados corretamente
- Endpoints protegidos validam tokens
```

### Recomendações Adicionais

O bot gera recomendações específicas:

- ⚠️ **Bug sem testes**: Issue do tipo Bug mas não há testes adicionados
- ℹ️ **Alinhamento**: Verifica se arquivos modificados estão alinhados com requisitos
- ✅ **Critérios de aceite**: Lista critérios para validação manual
- 🚨 **Alta prioridade**: Alerta sobre issues críticas

## 🔧 Integração Avançada com MCP

### Opção 1: Uso Manual via Skill

Se você tem o MCP da Atlassian configurado, pode buscar dados da issue manualmente:

```bash
# 1. No seu terminal/chat, use o jira-assistant skill
search("issue B2B-123")

# 2. Copie os dados da issue

# 3. Execute o bot normalmente
npm run code-review 456
```

O bot detecta automaticamente a chave e exibe informações básicas.

### Opção 2: Wrapper Script (Futuro)

Estamos desenvolvendo um wrapper que integra diretamente com o MCP:

```bash
# Futuro: busca automática via MCP
npm run code-review:with-jira 123

# Internamente:
# 1. Detecta chave da issue na PR
# 2. Usa MCP para buscar dados completos
# 3. Enriquece análise automaticamente
```

## 📝 Formato da Issue no Jira

Para melhor análise, siga o template padrão do projeto:

```markdown
## Context
[Breve explicação do problema ou necessidade]

## Objective
[O que precisa ser realizado]

## Technical Requirements
- [ ] Requisito 1
- [ ] Requisito 2
- [ ] Requisito 3

## Acceptance Criteria
- [ ] Critério 1
- [ ] Critério 2
- [ ] Critério 3

## Technical Notes
[Considerações técnicas, dependências, links relevantes]

## Estimate
[Estimativa de tempo ou story points]
```

## 🎓 Exemplos de Uso

### Exemplo 1: Bug com Issue do Jira

```bash
# PR #234 com título: "fix: Corrige validação [B2B-567]"
npm run code-review 234
```

**Análise do Bot:**
```
✅ Issue do Jira detectada: B2B-567
📋 Issue do Jira: B2B-567
- Tipo: Bug
- Prioridade: High

⚠️  RECOMENDAÇÕES:
- Issue do tipo Bug mas não há testes adicionados.
  💡 Adicione testes para garantir que o bug não ocorra novamente.
```

### Exemplo 2: Feature com Requisitos Técnicos

```bash
# PR #345 com branch: feature/B2B-890-novo-endpoint
npm run code-review 345
```

**Análise do Bot:**
```
✅ Issue do Jira detectada: B2B-890
📋 Issue do Jira: B2B-890
- Tipo: Task
- Resumo: Implementar novo endpoint de relatórios

Requisitos Técnicos:
- Criar controller para relatórios
- Implementar serviço de geração
- Adicionar validação de permissões

Critérios de Aceite:
- Endpoint retorna dados corretos
- Permissões são validadas
- Documentação Swagger atualizada

✅ 3 arquivos modificados alinham com requisitos técnicos
ℹ️  Certifique-se de que todos os critérios de aceite foram implementados
```

### Exemplo 3: PR sem Issue Vinculada

```bash
npm run code-review 456
```

**Análise do Bot:**
```
ℹ️  Nenhuma issue do Jira vinculada à PR

💡 RECOMENDAÇÕES:
- Nenhuma issue do Jira vinculada à PR.
  💡 Referencie a issue do Jira no título ou descrição da PR (ex: [B2B-123])
```

## 🔍 Detecção e Validação

### O que o Bot Detecta

✅ Chaves válidas do Jira:
- `B2B-123`
- `PROJ-456`
- `[B2B-789]`
- `fixes B2B-101`

❌ NÃO detecta:
- `issue-123` (sem prefixo do projeto)
- `B2B123` (sem hífen)
- `b2b-456` (minúscula)

### Validação de Formato

O bot valida que a chave segue o padrão:
- 2-10 letras maiúsculas
- Hífen
- 1 ou mais dígitos
- Exemplo: `^[A-Z]{2,10}-\d+$`

## 🛠️ Troubleshooting

### Issue não detectada

**Problema:** Bot não detecta a issue do Jira

**Soluções:**
1. Verifique o formato da chave (ex: B2B-123)
2. Adicione a chave no título da PR entre colchetes: `[B2B-123]`
3. Mencione no corpo da PR: `Closes B2B-123`
4. Use no nome do branch: `feature/B2B-123-descricao`

### Links não funcionam

**Problema:** Links para issues não são gerados

**Solução:**
Configure `JIRA_CLOUD_ID` no `.env`:
```bash
JIRA_CLOUD_ID=your-cloud-id
```

### Dados incompletos

**Problema:** Bot mostra apenas chave da issue

**Explicação:**
O bot detecta a chave mas não busca dados completos automaticamente.

**Soluções:**
1. Configure MCP (futuro) para busca automática
2. Use o jira-assistant skill manualmente
3. Forneça dados via opções programáticas (avançado)

## 🚀 Roadmap

Funcionalidades planejadas:

- [ ] Busca automática via MCP da Atlassian
- [ ] Cache de dados de issues
- [ ] Verificação automática de critérios de aceite
- [ ] Integração com Confluence para docs
- [ ] Comentários automáticos na issue do Jira
- [ ] Transição automática de status (opcional)

## 📚 Referências

- [Jira Assistant Skill](.claude/skills/jira-assistant/SKILL.md)
- [MCP Atlassian Documentation](https://developer.atlassian.com/)
- [Jira REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)

## 💡 Dicas

1. **Use títulos descritivos** com a chave da issue
2. **Siga o template padrão** nas issues do Jira
3. **Liste requisitos técnicos** claramente
4. **Defina critérios de aceite** mensuráveis
5. **Mantenha branches nomeados** com a chave da issue

---

**Desenvolvido pela newtonasc** 🚀
