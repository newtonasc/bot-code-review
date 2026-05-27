# 📝 Como Customizar Regras para Seu Projeto

O Code Review Bot vem com 30+ regras padrão, mas você pode facilmente customizá-las para seu projeto.

## 🎯 Arquivo de Regras

As regras ficam em `rules.js`. Cada regra tem:

```javascript
{
  id: 'nome-regra-01',           // ID único
  type: 'pattern',                // 'pattern' ou 'check'
  category: 'categoria',          // Agrupa regras relacionadas
  severity: 'error',              // 'error' ou 'warning'
  message: 'Descrição clara',     // O que está errado
  suggestion: 'Como corrigir',    // Sugestão de correção
  pattern: /regex/,               // Para type='pattern'
  check: (file, content) => {},   // Para type='check'
}
```

## 🔧 Tipos de Regras

### 1. Pattern (Regex)

Detecta padrões no código:

```javascript
{
  id: 'imports-01',
  type: 'pattern',
  category: 'imports',
  severity: 'error',
  message: 'Não assuma que diretório tem index.js',
  suggestion: 'Importe o arquivo específico',
  pattern: /import\s+.*\s+from\s+['"].*\/controllers['"]/,
}
```

### 2. Check (Função)

Lógica customizada:

```javascript
{
  id: 'format-02',
  type: 'check',
  category: 'formatting',
  severity: 'warning',
  message: 'Linha excede limite de caracteres',
  suggestion: 'Quebre em múltiplas linhas',
  check: (filePath, content, patch) => {
    const lines = content.split('\n');
    return lines
      .map((line, idx) => line.length > 120 ? idx + 1 : null)
      .filter(Boolean);
  },
}
```

## 📁 Criar Arquivo de Regras Customizado

### 1. Crie seu arquivo de regras

```bash
cp rules.js rules.custom.js
```

### 2. Edite `rules.custom.js`

Adicione/remova/modifique regras:

```javascript
export default [
  // Suas regras específicas
  {
    id: 'my-project-01',
    type: 'pattern',
    category: 'custom',
    severity: 'error',
    message: 'Use nossa lib customizada',
    suggestion: 'Importe de @mylib ao invés de lib-externa',
    pattern: /import.*from ['"]lib-externa['"]/,
  },
  
  // Importe regras padrão se quiser
  ...defaultRules,
];
```

### 3. Use seu arquivo customizado

Em `config.json`:

```json
{
  "rulesFile": "./rules.custom.js"
}
```

Ou via linha de comando:

```bash
node index.js 123 --rules ./rules.custom.js
```

## 🎨 Exemplos de Regras Customizadas

### Proibir Imports Específicos

```javascript
{
  id: 'imports-forbidden-01',
  type: 'pattern',
  category: 'imports',
  severity: 'error',
  message: 'Não use lodash, preferir utils nativo',
  suggestion: 'Use Array.prototype methods ou nossa lib de utils',
  pattern: /import.*from ['"]lodash['"]/,
}
```

### Forçar Nomenclatura

```javascript
{
  id: 'naming-01',
  type: 'check',
  category: 'naming',
  severity: 'warning',
  message: 'Componentes React devem começar com letra maiúscula',
  suggestion: 'Renomeie para PascalCase',
  check: (filePath, content) => {
    if (!filePath.includes('components/')) return [];
    const fileName = filePath.split('/').pop().replace('.jsx', '');
    return fileName[0] !== fileName[0].toUpperCase() ? [1] : [];
  },
}
```

### Verificar Tratamento de Erros

```javascript
{
  id: 'error-handling-01',
  type: 'check',
  category: 'errors',
  severity: 'error',
  message: 'Falta tratamento de erro em async/await',
  suggestion: 'Adicione try/catch ou .catch()',
  check: (filePath, content) => {
    const asyncMatches = content.match(/async\s+function/g);
    const tryCatchMatches = content.match(/try\s*{/g);
    
    if (asyncMatches && (!tryCatchMatches || asyncMatches.length > tryCatchMatches.length)) {
      return [1]; // Linha 1 como placeholder
    }
    return [];
  },
}
```

### Forçar Documentação

```javascript
{
  id: 'docs-01',
  type: 'check',
  category: 'documentation',
  severity: 'warning',
  message: 'Funções públicas devem ter JSDoc',
  suggestion: 'Adicione comentário JSDoc antes da função',
  check: (filePath, content) => {
    if (!filePath.match(/\.(js|ts)$/)) return [];
    
    const functions = content.match(/export\s+(async\s+)?function\s+\w+/g);
    if (!functions) return [];
    
    const jsdocs = content.match(/\/\*\*[\s\S]*?\*\//g);
    
    if (functions.length > (jsdocs?.length || 0)) {
      return [1];
    }
    return [];
  },
}
```

## 🔄 Workflow

1. **Clone regras padrão**: `cp rules.js rules.custom.js`
2. **Customize**: Edite conforme necessidades do projeto
3. **Teste**: Execute bot em PRs reais
4. **Itere**: Ajuste baseado em feedback
5. **Compartilhe**: Commite rules.custom.js no projeto

## 🎯 Categorias Sugeridas

Organize regras em categorias:

- `imports` - Validação de imports
- `formatting` - Formatação de código
- `controllers` - Padrões de controllers
- `services` - Lógica de negócio
- `repositories` - Acesso a dados
- `models` - Definição de modelos
- `permissions` - Controle de acesso
- `errors` - Tratamento de erros
- `tests` - Padrões de teste
- `security` - Segurança
- `performance` - Performance
- `custom` - Específico do projeto

## 💡 Dicas

1. **Comece simples**: Adicione poucas regras específicas
2. **Teste bem**: Valide em PRs reais antes de ativar
3. **Documente**: Explique "por quê" nas mensagens
4. **Seja consistente**: Use severities coerentemente
5. **Evolua**: Adicione regras conforme padrões emergem

## 📚 Recursos

- [rules.js](rules.js) - Regras padrão como referência
- [code-analyzer.js](code-analyzer.js) - Motor de análise
- [Regex101](https://regex101.com/) - Teste regexes online

---

**Dúvidas?** Abra uma [issue](https://github.com/newtonasc/bot-code-review/issues) ou veja [CONTRIBUTING.md](CONTRIBUTING.md)
