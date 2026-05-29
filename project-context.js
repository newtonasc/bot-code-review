/**
 * ProjectContextCollector - Coleta contexto semântico do repositório alvo
 * para enriquecer a análise da IA na revisão de PRs.
 *
 * Realiza 4 buscas semânticas via API do Bitbucket:
 *  1. Documentação e diretrizes (README, DEVELOPMENT, CONTRIBUTING, docs/, .github/)
 *  2. Arquitetura e configuração (package.json, tsconfig, eslint)
 *  3. Constantes e enumeradores de domínio (src/constants/, src/enumerators/)
 *  4. Configurações de ambiente e build (*config.js, .*rc)
 */

import axios from 'axios';

const MAX_DOC_LINES = 80;
const MAX_CONSTANTS_LINES = 120;
const MAX_CONFIG_LINES = 60;

const ROOT_DOCS = [
  'README.md', 'DEVELOPMENT.md', 'CONTRIBUTING.md',
  'ARCHITECTURE.md', 'CODING_STANDARDS.md', 'CONVENTIONS.md',
];

const ROOT_CONFIGS = [
  'package.json', 'tsconfig.json', 'tsconfig.base.json',
  '.eslintrc.js', '.eslintrc.json', '.eslintrc.cjs',
  'jest.config.js', 'jest.config.cjs',
  '.babelrc', '.babelrc.js',
];

const DOCS_DIRS = ['docs', '.github'];

const CONSTANTS_DIR_NAMES = /^(constants|enumerators?|enums?|config|shared|domain)$/i;
const CONSTANTS_FILE_NAMES = /(constants|enumerators?|enums?|config)\.(js|ts|cjs|mjs)$/i;

function truncate(text, maxLines) {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join('\n') + `\n[... truncado após ${maxLines} linhas]`;
}

export default class ProjectContextCollector {
  constructor(bitbucketClient) {
    this.client = bitbucketClient;
    this._cache = null;
  }

  /**
   * Coleta contexto do repositório a partir do commit da PR.
   * Resultado é cacheado — seguro chamar múltiplas vezes.
   * @param {string} commitHash - Hash do commit source da PR
   * @returns {Promise<Object>} Contexto estruturado
   */
  async collect(commitHash) {
    if (this._cache) return this._cache;

    console.log('\n📚 Coletando contexto semântico do repositório...');

    const context = {
      documentation: {},
      guidelines: {},
      constants: {},
      architecture: {},
    };

    // 1. Lista diretório raiz
    let root = { files: [], dirs: [] };
    try {
      root = await this._listDir('', commitHash);
    } catch {
      console.warn('   ⚠️  Não foi possível listar o diretório raiz');
    }

    // 2. Documentação na raiz (README, DEVELOPMENT, CONTRIBUTING…)
    for (const file of ROOT_DOCS) {
      if (root.files.includes(file)) {
        const content = await this._fetchSafe(file, commitHash);
        if (content) context.documentation[file] = truncate(content, MAX_DOC_LINES);
      }
    }

    // 3. Configuração/arquitetura na raiz
    for (const file of ROOT_CONFIGS) {
      if (root.files.includes(file)) {
        const content = await this._fetchSafe(file, commitHash);
        if (content) context.architecture[file] = truncate(content, MAX_CONFIG_LINES);
      }
    }

    // 4. Busca .md em docs/ e .github/
    for (const dir of DOCS_DIRS) {
      if (root.dirs.includes(dir)) {
        const dirEntries = await this._listDir(dir, commitHash);
        const mdFiles = dirEntries.files.filter(f => f.endsWith('.md')).slice(0, 2);
        for (const file of mdFiles) {
          const path = `${dir}/${file}`;
          const content = await this._fetchSafe(path, commitHash);
          if (content) context.guidelines[path] = truncate(content, MAX_DOC_LINES);
        }
      }
    }

    // 5. Constantes e enumeradores em src/ (ou app/, lib/)
    const srcDir = ['src', 'app', 'lib'].find(d => root.dirs.includes(d));
    if (srcDir) {
      await this._collectConstants(srcDir, commitHash, context.constants);
    }

    const total = Object.values(context).reduce((n, cat) => n + Object.keys(cat).length, 0);
    if (total > 0) {
      const labels = Object.entries(context)
        .filter(([, cat]) => Object.keys(cat).length > 0)
        .map(([name, cat]) => `${Object.keys(cat).length} ${name}`)
        .join(', ');
      console.log(`✅ Contexto coletado: ${total} arquivo(s) — ${labels}\n`);
    } else {
      console.log('ℹ️  Nenhum arquivo de contexto encontrado no repositório\n');
    }

    this._cache = context;
    return context;
  }

  /**
   * Serializa o contexto em blocos de texto para inclusão no prompt.
   * @returns {string}
   */
  formatForPrompt() {
    if (!this._cache || this.isEmpty()) return '';

    const sections = [];
    const { documentation, guidelines, constants, architecture } = this._cache;

    if (Object.keys(documentation).length > 0) {
      sections.push('### 📄 Documentação do Projeto');
      for (const [file, content] of Object.entries(documentation)) {
        sections.push(`**${file}:**\n\`\`\`\n${content}\n\`\`\``);
      }
    }

    if (Object.keys(guidelines).length > 0) {
      sections.push('### 📋 Diretrizes e Padrões de Código');
      for (const [file, content] of Object.entries(guidelines)) {
        sections.push(`**${file}:**\n\`\`\`\n${content}\n\`\`\``);
      }
    }

    if (Object.keys(constants).length > 0) {
      sections.push('### 🔢 Constantes e Enumeradores do Domínio');
      for (const [file, content] of Object.entries(constants)) {
        sections.push(`**${file}:**\n\`\`\`javascript\n${content}\n\`\`\``);
      }
    }

    if (architecture['package.json']) {
      try {
        const pkg = JSON.parse(architecture['package.json']);
        const summary = {
          name: pkg.name,
          version: pkg.version,
          type: pkg.type,
          dependencies: Object.keys(pkg.dependencies || {}),
          devDependencies: Object.keys(pkg.devDependencies || {}),
        };
        sections.push(`### 📦 Dependências do Projeto\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\``);
      } catch {
        sections.push(`### 📦 package.json\n\`\`\`json\n${architecture['package.json']}\n\`\`\``);
      }
    }

    return sections.join('\n\n');
  }

  isEmpty() {
    if (!this._cache) return true;
    return Object.values(this._cache).every(cat => Object.keys(cat).length === 0);
  }

  // ─── Privados ─────────────────────────────────────────────────────────────

  async _listDir(path, commitHash) {
    const base = `${this.client.baseUrl}/repositories/${this.client.workspace}/${this.client.repoSlug}/src/${commitHash}`;
    const url = path ? `${base}/${path}/` : `${base}/`;

    try {
      const res = await axios.get(url, this.client._getAxiosConfig({ timeout: 10000 }));
      const values = res.data.values || [];
      return {
        files: values.filter(v => v.type === 'commit_file').map(v => v.path.split('/').pop()),
        dirs: values.filter(v => v.type === 'commit_directory').map(v => v.path.split('/').pop()),
      };
    } catch {
      return { files: [], dirs: [] };
    }
  }

  async _fetchSafe(path, commitHash) {
    try {
      return await this.client.getFileContent(path, commitHash);
    } catch {
      return null;
    }
  }

  async _collectConstants(srcDir, commitHash, target) {
    const srcEntries = await this._listDir(srcDir, commitHash);

    // Busca em subdiretórios com nome de constantes (constants/, enumerators/, enums/, config/)
    const constDirs = srcEntries.dirs.filter(d => CONSTANTS_DIR_NAMES.test(d));
    for (const dir of constDirs.slice(0, 3)) {
      const path = `${srcDir}/${dir}`;
      const entries = await this._listDir(path, commitHash);
      const jsFiles = entries.files.filter(f => /\.(js|ts|cjs|mjs)$/.test(f)).slice(0, 4);
      for (const file of jsFiles) {
        const filePath = `${path}/${file}`;
        const content = await this._fetchSafe(filePath, commitHash);
        if (content) target[filePath] = truncate(content, MAX_CONSTANTS_LINES);
      }
    }

    // Busca arquivos de constantes diretamente em src/
    const constFiles = srcEntries.files.filter(f => CONSTANTS_FILE_NAMES.test(f));
    for (const file of constFiles.slice(0, 3)) {
      const filePath = `${srcDir}/${file}`;
      const content = await this._fetchSafe(filePath, commitHash);
      if (content) target[filePath] = truncate(content, MAX_CONSTANTS_LINES);
    }
  }
}
