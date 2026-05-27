/**
 * Regras de Code Review customizáveis para projetos Node.js
 * Seguem as diretrizes definidas em .github/copilot-instructions.md
 */

const rules = {
  imports: [
    {
      id: 'imports-01',
      severity: 'error',
      pattern: /import\s+.*\s+from\s+['"]\.\.\/[^'"]*\/['"]/,
      check: (line, filePath) => {
        // Verifica se está importando de diretório sem especificar arquivo
        const match = line.match(/import\s+.*\s+from\s+['"](\.\.\/.*)['"]/);
        if (match && !match[1].includes('.js') && !match[1].includes('/')) {
          const importPath = match[1];
          // Verifica se pode ser um index.js
          if (importPath.endsWith('/controllers/auth') ||
            importPath.endsWith('/middlewares') ||
            importPath.endsWith('/services')) {
            return {
              message: `SEMPRE especifique o arquivo ao importar. Não assuma que existe index.js em '${importPath}'. Verifique a estrutura real do diretório.`,
              suggestion: `Altere para: import ... from '${importPath}/<nome-do-arquivo>';`,
            };
          }
        }
        return null;
      },
    },
    {
      id: 'imports-02',
      severity: 'error',
      check: (line) => {
        // Verifica uso de require ao invés de import
        if (line.includes('require(') && !line.includes('// eslint-disable')) {
          return {
            message: 'Use ES6 import ao invés de require().',
            suggestion: 'Converta para: import ... from \'...\';',
          };
        }
        return null;
      },
    },
  ],

  formatting: [
    {
      id: 'format-01',
      severity: 'warning',
      check: (content, filePath) => {
        const issues = [];
        const lines = content.split('\n');

        // Verifica linhas em branco desnecessárias dentro de métodos
        let insideMethod = false;
        let blankLineCount = 0;
        let methodStartLine = 0;

        lines.forEach((line, index) => {
          const trimmed = line.trim();

          // Detecta início de método
          if (trimmed.match(/^(async\s+)?(\w+)\s*\([^)]*\)\s*\{/) ||
            trimmed.match(/^(async\s+)?(handle|constructor)\s*\(/)) {
            insideMethod = true;
            methodStartLine = index;
            blankLineCount = 0;
          }

          // Detecta fim de método
          if (insideMethod && trimmed === '}' && blankLineCount > 0) {
            insideMethod = false;
          }

          // Conta linhas em branco dentro de métodos
          if (insideMethod && trimmed === '') {
            blankLineCount++;
            if (blankLineCount > 0 && index > methodStartLine + 1) {
              issues.push({
                line: index + 1,
                message: 'NÃO deixe linhas em branco desnecessárias dentro de métodos/funções. Mantenha o bloco compacto.',
                suggestion: 'Remova as linhas em branco dentro do método.',
              });
            }
          } else if (insideMethod && trimmed !== '') {
            blankLineCount = 0;
          }
        });

        return issues.length > 0 ? issues : null;
      },
    },
    {
      id: 'format-02',
      severity: 'warning',
      check: (line) => {
        // Verifica linhas muito longas (max 120)
        if (line.length > 120 && !line.includes('http://') && !line.includes('https://')) {
          return {
            message: 'Linha excede o limite de 120 caracteres.',
            suggestion: 'Quebre a linha em múltiplas linhas mantendo a legibilidade.',
          };
        }
        return null;
      },
    },
  ],

  controllers: [
    {
      id: 'controller-01',
      severity: 'error',
      check: (content, filePath) => {
        if (!filePath.includes('/controllers/')) return null;

        const issues = [];

        // Verifica se usa ErrorHandler no catch
        if (content.includes('catch') && !content.includes('ErrorHandler')) {
          issues.push({
            message: 'SEMPRE use ErrorHandler no bloco catch dos controllers.',
            suggestion: 'Adicione: return ErrorHandler(err, req, res);',
          });
        }

        // Verifica se chama ThrowErrors quando há middleware de validação
        if (content.includes('req.errorList') && !content.includes('ThrowErrors(req)')) {
          issues.push({
            message: 'SEMPRE chame ThrowErrors(req) após middlewares de validação.',
            suggestion: 'Adicione ThrowErrors(req); antes da lógica de negócio.',
          });
        }

        // Verifica uso de números mágicos ao invés de httpStatus
        const statusMatch = content.match(/res\.status\((\d+)\)/g);
        if (statusMatch) {
          statusMatch.forEach((match) => {
            const num = match.match(/\d+/)[0];
            issues.push({
              message: `Use httpStatus ao invés de número mágico ${num}.`,
              suggestion: `Altere para: res.status(httpStatus.OK) ou httpStatus.${getStatusName(num)}`,
            });
          });
        }

        return issues.length > 0 ? issues : null;
      },
    },
    {
      id: 'controller-02',
      severity: 'error',
      check: (content, filePath) => {
        if (!filePath.includes('/controllers/')) return null;

        // Verifica se exporta default routes
        if (!content.includes('export default routes')) {
          return {
            message: 'Controllers devem exportar default routes.',
            suggestion: 'Adicione: export default routes;',
          };
        }
        return null;
      },
    },
  ],

  services: [
    {
      id: 'service-01',
      severity: 'error',
      check: (content, filePath) => {
        if (!filePath.includes('/services/components/')) return null;

        const issues = [];

        // Verifica se a classe tem método handle()
        if (content.includes('class ') && !content.includes('handle()') && !content.includes('static handle')) {
          issues.push({
            message: 'Services devem ter um método handle() ou static handle().',
            suggestion: 'Adicione: async handle() { ... } ou static handle() { ... }',
          });
        }

        return issues.length > 0 ? issues : null;
      },
    },
    {
      id: 'service-02',
      severity: 'warning',
      check: (content, filePath) => {
        if (!filePath.includes('/services/components/')) return null;

        // Verifica instanciação incorreta de services
        const wrongPattern = /new\s+\w+\([^)]*\)\.handle\(\)/;
        if (!wrongPattern.test(content)) {
          // Está correto
          return null;
        }

        return {
          message: 'Instanciação de services deve ser inline: await (new Service(params)).handle()',
          suggestion: 'Use parênteses ao redor da instanciação.',
        };
      },
    },
  ],

  repositories: [
    {
      id: 'repository-01',
      severity: 'error',
      check: (content, filePath) => {
        if (!filePath.includes('/repositories/')) return null;

        // Verifica se estende AbstractRepository
        if (content.includes('class ') && !content.includes('extends AbstractRepository')) {
          return {
            message: 'Repositories devem estender AbstractRepository.',
            suggestion: 'Adicione: class XRepository extends AbstractRepository { ... }',
          };
        }
        return null;
      },
    },
    {
      id: 'repository-02',
      severity: 'error',
      check: (content, filePath) => {
        if (!filePath.includes('/repositories/')) return null;

        // Verifica se implementa getEntity()
        if (content.includes('class ') && !content.includes('getEntity()')) {
          return {
            message: 'Repositories devem implementar static getEntity().',
            suggestion: 'Adicione: static getEntity() { return db.models.NomeDoModel; }',
          };
        }
        return null;
      },
    },
  ],

  permissions: [
    {
      id: 'permission-01',
      severity: 'error',
      check: (content) => {
        // Verifica acesso direto a req.permissions.accessProfile
        const directAccessPattern = /req\.permissions\.accessProfile\[\w+\]|req\.permissions\.accessProfile\.\w+/;
        if (directAccessPattern.test(content)) {
          return {
            message: 'NUNCA acesse req.permissions.accessProfile diretamente. Use GetPermission ou CheckPermission.',
            suggestion: 'Use: GetPermission(req.permissions, \'nome-permissao\', \'R\') ou CheckPermission(req.permissions, \'nome-permissao\')',
          };
        }
        return null;
      },
    },
  ],

  errors: [
    {
      id: 'error-01',
      severity: 'warning',
      check: (content) => {
        // Verifica criação de novos códigos de erro
        if (content.includes('new BusinessError(') && content.includes('\'') && !content.includes('CodeError') && !content.includes('ValidationCodeError')) {
          return {
            message: 'SEMPRE verifique se já existe um código de erro em src/utilities/errors/business.js antes de criar string literal.',
            suggestion: 'Use códigos existentes: ValidationCodeError.INVALID_PARAMS, CodeError.MISSING_REQ, etc.',
          };
        }
        return null;
      },
    },
  ],

  models: [
    {
      id: 'model-01',
      severity: 'error',
      check: (content, filePath) => {
        if (!filePath.includes('/models/')) return null;

        const issues = [];

        // Verifica se usa timestamps: false
        if (content.includes('sequelize.define') && !content.includes('timestamps: false')) {
          issues.push({
            message: 'Models devem usar timestamps: false.',
            suggestion: 'Adicione timestamps: false nas options do model.',
          });
        }

        // Verifica se usa freezeTableName: true
        if (content.includes('sequelize.define') && !content.includes('freezeTableName: true')) {
          issues.push({
            message: 'Models devem usar freezeTableName: true.',
            suggestion: 'Adicione freezeTableName: true nas options do model.',
          });
        }

        return issues.length > 0 ? issues : null;
      },
    },
  ],

  typescript: [
    {
      id: 'typescript-01',
      severity: 'error',
      check: (content, filePath) => {
        // Verifica uso de TypeScript
        if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
          return {
            message: 'NÃO use TypeScript. O projeto usa Babel.',
            suggestion: 'Converta para .js e use sintaxe ES6 com Babel.',
          };
        }

        // Verifica tipos TypeScript em arquivos .js
        if (content.includes(': string') || content.includes(': number') || content.includes('interface ')) {
          return {
            message: 'NÃO use sintaxe TypeScript. O projeto usa Babel sem TypeScript.',
            suggestion: 'Remova as anotações de tipo.',
          };
        }

        return null;
      },
    },
  ],

  constants: [
    {
      id: 'constants-01',
      severity: 'warning',
      check: (content) => {
        // Verifica hardcoded de valores que deveriam estar em Constants ou enumerators
        const magicNumbers = content.match(/===\s*\d+\s*[^\.]/g);
        const magicStrings = content.match(/===\s*['"][^'"]+['"]/g);

        if (magicNumbers || magicStrings) {
          return {
            message: 'NÃO hardcode valores. Use Constants, enumerators ou i18n.',
            suggestion: 'Verifique src/enumerators/ e src/utilities/constants.js para constantes existentes.',
          };
        }
        return null;
      },
    },
  ],

  tests: [
    {
      id: 'test-01',
      severity: 'warning',
      check: (content, filePath) => {
        if (!filePath.includes('__tests__/') && !filePath.includes('.spec.js') && !filePath.includes('.test.js')) {
          return null;
        }

        const issues = [];

        // Verifica estrutura de teste
        if (!content.includes('describe(')) {
          issues.push({
            message: 'Testes devem usar describe() para organização.',
            suggestion: 'Adicione: describe(\'NomeDaClasse\', () => { ... });',
          });
        }

        // Verifica beforeEach para limpar mocks
        if (content.includes('jest.mock') && !content.includes('beforeEach')) {
          issues.push({
            message: 'Use beforeEach(() => { jest.clearAllMocks(); }) quando usar mocks.',
            suggestion: 'Adicione beforeEach para garantir isolamento entre testes.',
          });
        }

        return issues.length > 0 ? issues : null;
      },
    },
  ],
};

function getStatusName(code) {
  const statusMap = {
    200: 'OK',
    201: 'CREATED',
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    500: 'INTERNAL_SERVER_ERROR',
  };
  return statusMap[code] || code;
}

export default rules;
