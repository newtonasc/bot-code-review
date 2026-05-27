# 🤝 Contribuindo com o Code Review Bot

Obrigado por considerar contribuir com o Code Review Bot! Este guia ajudará você a começar.

## 📋 Código de Conduta

Este projeto segue um Código de Conduta. Ao participar, você concorda em manter um ambiente respeitoso e inclusivo.

## 🚀 Como Contribuir

### 1. Reportar Bugs

Se encontrou um bug:

1. Verifique se já não existe uma issue aberta
2. Crie uma nova issue com:
   - Título descritivo
   - Passos para reproduzir
   - Comportamento esperado vs atual
   - Screenshots/logs se aplicável
   - Versão do Node.js e do bot

### 2. Sugerir Melhorias

Para novas funcionalidades:

1. Abra uma issue descrevendo:
   - O problema que resolve
   - Proposta de solução
   - Exemplos de uso
2. Aguarde feedback antes de começar a implementação

### 3. Pull Requests

#### Setup do Ambiente

```bash
# Clone o repositório
git clone https://github.com/newtonasc/bot-code-review.git
cd bot-code-review

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais de teste

# Teste o bot
node index.js --help
```

#### Workflow

1. **Fork** o repositório
2. **Crie uma branch** com nome descritivo:
   ```bash
   git checkout -b feature/nova-funcionalidade
   # ou
   git checkout -b fix/correcao-bug
   ```
3. **Implemente** suas mudanças
4. **Teste** localmente
5. **Commit** com mensagens claras:
   ```bash
   git commit -m "feat: adiciona suporte para GitLab"
   # ou
   git commit -m "fix: corrige erro ao buscar diff"
   ```
6. **Push** para seu fork
7. **Abra um Pull Request**

#### Padrões de Código

- **ESLint**: Siga as regras do Airbnb (max-len: 120)
- **Imports**: Use ES6 modules
- **Nomenclatura**: camelCase para variáveis/funções, PascalCase para classes
- **Comentários**: JSDoc para funções públicas
- **Formatação**: Sem linhas em branco desnecessárias dentro de métodos

#### Checklist do PR

- [ ] Código segue os padrões do projeto
- [ ] Testes foram adicionados/atualizados
- [ ] Documentação foi atualizada
- [ ] CHANGELOG.md foi atualizado
- [ ] README.md foi atualizado se necessário
- [ ] Sem credenciais ou dados sensíveis no código

### 4. Adicionar Novas Regras

Para adicionar regras de análise estática:

1. Edite `rules.js`
2. Adicione a regra na categoria apropriada
3. Documente: ID, tipo, severidade, mensagem, sugestão
4. Teste com arquivos reais

Exemplo:

```javascript
{
  id: 'nova-regra-01',
  type: 'pattern',
  category: 'categoria',
  severity: 'error',
  message: 'Descrição do problema',
  suggestion: 'Como corrigir',
  pattern: /regex-ou-string/,
}
```

### 5. Melhorar Análise com IA

Para melhorar prompts da IA:

1. Edite `ai-analyzer.js`
2. Atualize métodos `buildPrompt()` ou `buildPRSummaryPrompt()`
3. Teste com PRs reais
4. Documente mudanças no CHANGELOG.md

## 📝 Documentação

Mantenha a documentação atualizada:

- **README.md**: Visão geral e quick start
- **DEVELOPMENT.md**: Detalhes técnicos
- **AI_INTEGRATION.md**: Configuração de IA
- **BITBUCKET.md**: Integração com Bitbucket
- **JIRA_INTEGRATION.md**: Integração com Jira
- **CHANGELOG.md**: Histórico de mudanças

## 🧪 Testes

Atualmente não há testes automatizados. Contribuições para adicionar testes são bem-vindas!

### Teste Manual

```bash
# Teste com PR real
node index.js <pr-number> --dry-run

# Teste com diferentes providers de IA
AI_PROVIDER=claude node index.js <pr-number> --dry-run
AI_PROVIDER=openai node index.js <pr-number> --dry-run
```

## 🏗️ Arquitetura

```
index.js                # Orquestrador principal
├── bitbucket-client.js # Cliente Bitbucket REST API
├── github-client.js    # Cliente GitHub REST API (legacy)
├── jira-client.js      # Cliente Jira + MCP
├── ai-analyzer.js      # Integração Claude/GPT
├── code-analyzer.js    # Motor de análise estática
├── rules.js            # Regras de análise
└── interactive-cli.js  # Interface CLI
```

## 🎯 Prioridades

Contribuições são especialmente bem-vindas para:

- [ ] Testes automatizados (Jest)
- [ ] Suporte para GitLab
- [ ] Suporte para Azure DevOps
- [ ] Mais regras de análise para padrões comuns
- [ ] Integração com GitHub Actions
- [ ] Dashboard web (opcional)
- [ ] Análise de métricas (complexidade ciclomática, etc.)

## 📞 Contato

- **Issues**: https://github.com/newtonasc/bot-code-review/issues
- **Discussões**: https://github.com/newtonasc/bot-code-review/discussions

## 🙏 Agradecimentos

Obrigado por contribuir! Cada contribuição, por menor que seja, faz diferença.
