# 🛠️ Desenvolvimento e Customização

Guia para desenvolvedores que desejam adicionar novas regras ou customizar o bot.

## 📁 Estrutura do Código

```
scripts/code-review-bot/
├── index.js              # Script principal e orquestração
├── github-client.js      # Cliente para API do GitHub
├── code-analyzer.js      # Motor de análise de código
├── rules.js              # Definição de regras de análise
├── interactive-cli.js    # Interface interativa CLI
├── package.json          # Dependências do bot
├── README.md             # Documentação completa
├── QUICK_START.md        # Guia rápido
└── DEVELOPMENT.md        # Este arquivo
```

## 🎯 Adicionando Novas Regras

### 1. Estrutura de uma Regra

As regras são definidas em `rules.js` e seguem este formato:

```javascript
{
  id: 'categoria-numero',        // Identificador único (ex: 'controller-01')
  severity: 'error' | 'warning', // Severidade da issue
  pattern: /regex/,              // Opcional: regex para detecção rápida
  check: (content, filePath) => { // Função de verificação
    // Lógica de análise
    // Retorna null se OK, ou objeto com message/suggestion se issue
    if (hasIssue) {
      return {
        message: 'Descrição do problema',
        suggestion: 'Como corrigir',
        line: 42, // opcional
      };
    }
    return null;
  },
}
```

### 2. Exemplo: Adicionar Regra para Async/Await

Vamos adicionar uma regra que detecta uso de `.then()` ao invés de `async/await`:

```javascript
// Em rules.js, adicione na categoria apropriada (ex: formatting)

{
  id: 'async-01',
  severity: 'warning',
  check: (content, filePath) => {
    // Ignora arquivos de teste
    if (filePath.includes('__tests__/')) return null;
    
    // Detecta uso de .then()
    const thenPattern = /\.\s*then\s*\(/g;
    const matches = content.match(thenPattern);
    
    if (matches && matches.length > 0) {
      return {
        message: 'Prefira async/await ao invés de .then() para melhor legibilidade.',
        suggestion: 'Converta para async/await: const result = await promise();',
      };
    }
    
    return null;
  },
}
```

### 3. Exemplo: Regra com Análise de Linha

Detectar uso de `console.log` em código de produção:

```javascript
{
  id: 'debug-01',
  severity: 'warning',
  check: (content, filePath) => {
    // Ignora testes e scripts
    if (filePath.includes('__tests__/') || filePath.includes('scripts/')) {
      return null;
    }
    
    const issues = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.includes('console.log') && !line.includes('// eslint-disable')) {
        issues.push({
          message: 'console.log detectado em código de produção.',
          suggestion: 'Use o logger do projeto ou remova antes do commit.',
          line: index + 1,
        });
      }
    });
    
    return issues.length > 0 ? issues : null;
  },
}
```

### 4. Exemplo: Regra Específica por Tipo de Arquivo

Validar que controllers sempre exportam Router:

```javascript
{
  id: 'controller-03',
  severity: 'error',
  check: (content, filePath) => {
    // Aplica apenas a controllers
    if (!filePath.includes('/controllers/')) return null;
    
    // Verifica se usa express.Router()
    if (!content.includes('express.Router()')) {
      return {
        message: 'Controllers devem usar express.Router().',
        suggestion: 'Adicione: const routes = express.Router();',
      };
    }
    
    // Verifica se exporta routes
    if (!content.includes('export default routes')) {
      return {
        message: 'Controllers devem exportar default routes.',
        suggestion: 'Adicione: export default routes;',
      };
    }
    
    return null;
  },
}
```

## 🧪 Testando Regras Localmente

### 1. Criar Arquivo de Teste

Crie um arquivo de teste em `test-files/`:

```javascript
// test-files/test-controller.js
import express from 'express';

const routes = express.Router();

routes.get('/', async (req, res) => {
  try {
    console.log('Debug aqui'); // Deve ser detectado
    return res.status(200).json({ ok: true }); // Deve sugerir httpStatus
  } catch (err) {
    return res.status(500).json({ error: err }); // Deve sugerir ErrorHandler
  }
});

export default routes;
```

### 2. Criar Script de Teste

```javascript
// test-rules.js
import CodeAnalyzer from './code-analyzer.js';
import fs from 'fs';

const analyzer = new CodeAnalyzer();

// Lê arquivo de teste
const content = fs.readFileSync('./test-files/test-controller.js', 'utf-8');

// Analisa
const issues = analyzer.analyzeFile('test-controller.js', content);

// Exibe resultados
console.log('Issues encontradas:', issues.length);
issues.forEach(issue => {
  console.log(`\n[${issue.severity}] ${issue.ruleId}`);
  console.log(`  ${issue.message}`);
  if (issue.suggestion) {
    console.log(`  Sugestão: ${issue.suggestion}`);
  }
});
```

Execute:
```bash
node test-rules.js
```

## 📊 Categorias de Regras

### Categorias Existentes

- `imports` - Validação de imports
- `formatting` - Formatação e estilo
- `controllers` - Padrões de controllers
- `services` - Padrões de services
- `repositories` - Padrões de repositories
- `permissions` - Verificação de permissões
- `errors` - Tratamento de erros
- `models` - Padrões de models Sequelize
- `typescript` - Detecção de TypeScript
- `constants` - Uso de constantes
- `tests` - Padrões de testes

### Adicionando Nova Categoria

```javascript
// Em rules.js
export default {
  // ... categorias existentes
  
  myNewCategory: [
    {
      id: 'mynew-01',
      severity: 'warning',
      check: (content, filePath) => {
        // Sua lógica aqui
      },
    },
  ],
};
```

## 🔍 Debugging

### Habilitar Logs Detalhados

Adicione logs no `code-analyzer.js`:

```javascript
applyRule(rule, filePath, content, patch) {
  console.log(`Aplicando regra ${rule.id} em ${filePath}`);
  
  // ... lógica existente
  
  if (result) {
    console.log(`  ✅ Issue detectada:`, result);
  }
}
```

### Testar uma Regra Específica

Modifique temporariamente `analyzeFile()`:

```javascript
analyzeFile(filePath, content, patch = null) {
  // Testa apenas uma categoria
  const categoryRules = rules.controllers; // ou outra categoria
  categoryRules.forEach((rule) => {
    this.applyRule(rule, filePath, content, patch);
  });
  
  return this.issues;
}
```

## 🎨 Customizando Mensagens

### Mensagens com Contexto

```javascript
check: (content, filePath) => {
  const fileName = filePath.split('/').pop();
  return {
    message: `Em ${fileName}: encontrado padrão não recomendado.`,
    suggestion: 'Aplique o padrão X conforme documentado em Y.',
  };
}
```

### Sugestões com Código

```javascript
suggestion: `
Altere de:
  const x = require('y');
  
Para:
  import x from 'y';
`
```

## 🚀 Performance

### Otimizando Regras

1. **Use `pattern` para filtro rápido**:
```javascript
{
  pattern: /console\.log/,
  check: (line) => {
    // Só executa se pattern encontrar algo
  }
}
```

2. **Retorne cedo**:
```javascript
check: (content, filePath) => {
  // Ignora arquivos irrelevantes rapidamente
  if (!filePath.includes('/src/')) return null;
  
  // Lógica complexa apenas se necessário
}
```

3. **Cache resultados se possível**:
```javascript
const cache = new Map();

check: (content, filePath) => {
  const hash = getHash(content);
  if (cache.has(hash)) {
    return cache.get(hash);
  }
  
  const result = expensiveCheck(content);
  cache.set(hash, result);
  return result;
}
```

## 📚 Referências de API

### CodeAnalyzer

```javascript
analyzer.analyzeFile(filePath, content, patch)
// Retorna: Array de issues

analyzer.analyzeFiles(files)
// Retorna: Object { filename: [issues] }

analyzer.generateReport(issuesByFile)
// Retorna: Object com estatísticas

analyzer.formatForGitHub(issuesByFile)
// Retorna: Array de comentários formatados
```

### GitHubClient

```javascript
github.getPullRequest(prNumber)
// Retorna: Promise<Object> dados da PR

github.getPullRequestFiles(prNumber)
// Retorna: Promise<Array> arquivos modificados

github.createReview(prNumber, event, body, comments)
// Retorna: Promise<Object> review criado
```

### InteractiveCLI

```javascript
cli.displayReport(report)
// Exibe relatório formatado

cli.selectIssues(comments)
// Retorna: Promise<Array> issues selecionadas

cli.confirmReview(issuesCount, reviewType)
// Retorna: Promise<boolean>
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-regra`)
3. Adicione sua regra em `rules.js`
4. Teste localmente
5. Documente a nova regra no README.md
6. Commit suas mudanças (`git commit -m 'Adiciona regra para X'`)
7. Push para a branch (`git push origin feature/nova-regra`)
8. Abra um Pull Request

## 📝 Checklist para Nova Regra

- [ ] Regra adicionada em `rules.js`
- [ ] ID único e descritivo
- [ ] Severidade apropriada (error/warning)
- [ ] Mensagem clara e objetiva
- [ ] Sugestão de correção incluída
- [ ] Testada com arquivo real
- [ ] Documentada no README.md
- [ ] Exemplos de código (errado/correto) adicionados
- [ ] Não causa falsos positivos
- [ ] Performance aceitável

## 🐛 Reportando Bugs

Encontrou um bug ou falso positivo? Abra uma issue com:

1. **Descrição do problema**
2. **Regra afetada** (ID da regra)
3. **Exemplo de código** que causou o problema
4. **Comportamento esperado**
5. **Comportamento observado**

---

**Happy coding!** 🚀
