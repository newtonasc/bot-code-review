/**
 * EnumMatcher - Analisa arquivos de constantes/enums e sugere valores compatíveis
 * Detecta números mágicos e strings hardcoded que poderiam usar enums do projeto
 */

export default class EnumMatcher {
  constructor(constantsContext = {}) {
    this.enums = {};
    this.parseConstants(constantsContext);
  }

  /**
   * Faz parse dos arquivos de constantes para extrair enums
   * @param {Object} constantsContext - Objeto com caminhos e conteúdos dos arquivos
   */
  parseConstants(constantsContext) {
    if (!constantsContext || Object.keys(constantsContext).length === 0) {
      return;
    }

    for (const [filePath, content] of Object.entries(constantsContext)) {
      this.parseFile(filePath, content);
    }
  }

  /**
   * Parse de um arquivo de constantes
   * @param {string} filePath - Caminho do arquivo
   * @param {string} content - Conteúdo do arquivo
   */
  parseFile(filePath, content) {
    // Extrai nome do arquivo para usar como contexto
    const fileName = filePath.split('/').pop().replace(/\.(js|ts|cjs|mjs)$/, '');

    // Padrões para detectar diferentes formatos de enums/constantes
    const patterns = [
      // Formato: export const STATUS = { ACTIVE: 1, INACTIVE: 2 }
      /export\s+const\s+(\w+)\s*=\s*\{([^}]+)\}/g,

      // Formato: const HttpStatus = { OK: 200, NOT_FOUND: 404 }
      /const\s+(\w+)\s*=\s*\{([^}]+)\}/g,

      // Formato: module.exports = { ACTIVE: 1, INACTIVE: 2 }
      /module\.exports\s*=\s*\{([^}]+)\}/g,

      // Formato Object.freeze: const STATUS = Object.freeze({ ACTIVE: 1 })
      /const\s+(\w+)\s*=\s*Object\.freeze\(\{([^}]+)\}\)/g,
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const enumName = match[1] || fileName;
        const enumBody = match[match.length - 1]; // Último grupo de captura

        this.parseEnumBody(enumName, enumBody, filePath);
      }
    });
  }

  /**
   * Parse do corpo de um enum/objeto de constantes
   * @param {string} enumName - Nome do enum
   * @param {string} body - Corpo do objeto
   * @param {string} filePath - Caminho do arquivo original
   */
  parseEnumBody(enumName, body, filePath) {
    // Remove comentários
    const cleanBody = body.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

    // Extrai pares chave-valor
    // Suporta: KEY: value, KEY = value, 'KEY': value
    const keyValuePattern = /['"]?(\w+)['"]?\s*[:=]\s*(['"]?)([^,}\n]+)\2/g;

    let match;
    while ((match = keyValuePattern.exec(cleanBody)) !== null) {
      const key = match[1];
      const value = match[3].trim();

      // Converte o valor para número se possível
      let parsedValue = value;
      if (/^-?\d+$/.test(value)) {
        parsedValue = parseInt(value, 10);
      } else if (/^-?\d+\.\d+$/.test(value)) {
        parsedValue = parseFloat(value);
      } else if (value.startsWith("'") || value.startsWith('"')) {
        // Remove aspas de strings
        parsedValue = value.slice(1, -1);
      }

      // Armazena a referência do enum
      if (!this.enums[enumName]) {
        this.enums[enumName] = {
          filePath,
          values: {},
        };
      }

      this.enums[enumName].values[key] = parsedValue;
    }
  }

  /**
   * Busca enums compatíveis com um valor específico
   * @param {number|string} value - Valor a ser procurado
   * @returns {Array} Lista de sugestões { enumName, key, filePath }
   */
  findMatchingEnums(value) {
    const matches = [];

    for (const [enumName, enumData] of Object.entries(this.enums)) {
      for (const [key, enumValue] of Object.entries(enumData.values)) {
        // Comparação exata de valores
        if (enumValue === value) {
          matches.push({
            enumName,
            key,
            value: enumValue,
            filePath: enumData.filePath,
            suggestion: `${enumName}.${key}`,
          });
        }
      }
    }

    return matches;
  }

  /**
   * Gera mensagem de sugestão formatada
   * @param {number|string} value - Valor hardcoded detectado
   * @param {Array} matches - Lista de matches encontrados
   * @returns {Object|null} Objeto com message e suggestion
   */
  generateSuggestion(value, matches) {
    if (matches.length === 0) {
      return null;
    }

    const valueType = typeof value === 'number' ? 'número' : 'string';

    if (matches.length === 1) {
      const match = matches[0];
      const filePath = match.filePath.replace(/^.*\/(src|app|lib)\//, '');

      return {
        message: `Use o enum ${match.suggestion} ao invés do ${valueType} ${JSON.stringify(value)}`,
        suggestion: `Importe e use: ${match.suggestion}\nDefinido em: ${filePath}`,
        enumInfo: match,
      };
    }

    // Múltiplos matches - lista todos
    const suggestions = matches.map(m => {
      const filePath = m.filePath.replace(/^.*\/(src|app|lib)\//, '');
      return `  - ${m.suggestion} (${filePath})`;
    }).join('\n');

    return {
      message: `O ${valueType} ${JSON.stringify(value)} pode ser substituído por enum. ${matches.length} opções encontradas:`,
      suggestion: `Use um dos enums disponíveis:\n${suggestions}`,
      enumInfo: matches,
    };
  }

  /**
   * Verifica se há enums carregados
   * @returns {boolean}
   */
  hasEnums() {
    return Object.keys(this.enums).length > 0;
  }

  /**
   * Retorna estatísticas dos enums carregados
   * @returns {Object}
   */
  getStats() {
    const totalEnums = Object.keys(this.enums).length;
    const totalValues = Object.values(this.enums).reduce((sum, e) => sum + Object.keys(e.values).length, 0);

    return {
      enumCount: totalEnums,
      valueCount: totalValues,
      enums: Object.keys(this.enums),
    };
  }
}
