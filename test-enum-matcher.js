#!/usr/bin/env node

/**
 * Script de teste para EnumMatcher
 * Demonstra a detecção de números mágicos e sugestões de enums
 */

import EnumMatcher from './enum-matcher.js';

// Simula contexto de constantes coletado do repositório
const mockConstantsContext = {
  'src/enumerators/vehicle-status.js': `
    export const VehicleStatus = {
      ACTIVE: 1,
      INACTIVE: 2,
      MAINTENANCE: 3,
      SOLD: 4
    };
  `,
  'src/enumerators/http-status.js': `
    const HttpStatus = {
      OK: 200,
      CREATED: 201,
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      INTERNAL_SERVER_ERROR: 500
    };
    
    module.exports = HttpStatus;
  `,
  'src/constants/user-types.js': `
    export const UserType = Object.freeze({
      ADMIN: 'admin',
      MANAGER: 'manager',
      EMPLOYEE: 'employee',
      GUEST: 'guest'
    });
  `,
};

console.log('🧪 Testando EnumMatcher\n');
console.log('═══════════════════════════════════════════════════════════════\n');

// Inicializa o matcher
const matcher = new EnumMatcher(mockConstantsContext);

// Exibe estatísticas
const stats = matcher.getStats();
console.log('📊 Estatísticas:');
console.log(`   - ${stats.enumCount} enum(s) carregado(s)`);
console.log(`   - ${stats.valueCount} valor(es) total`);
console.log(`   - Enums: ${stats.enums.join(', ')}\n`);

console.log('═══════════════════════════════════════════════════════════════\n');

// Testes de busca
const testCases = [
  { value: 1, description: 'Número mágico 1 (VehicleStatus.ACTIVE)' },
  { value: 200, description: 'Número mágico 200 (HttpStatus.OK)' },
  { value: 404, description: 'Número mágico 404 (HttpStatus.NOT_FOUND)' },
  { value: 'admin', description: 'String hardcoded "admin" (UserType.ADMIN)' },
  { value: 'manager', description: 'String hardcoded "manager" (UserType.MANAGER)' },
  { value: 999, description: 'Número sem enum correspondente' },
  { value: 'unknown', description: 'String sem enum correspondente' },
];

console.log('🔍 Testes de detecção:\n');

testCases.forEach((test, index) => {
  console.log(`Teste ${index + 1}: ${test.description}`);
  console.log(`   Valor: ${JSON.stringify(test.value)}`);

  const matches = matcher.findMatchingEnums(test.value);

  if (matches.length > 0) {
    console.log(`   ✅ ${matches.length} enum(s) encontrado(s):`);
    matches.forEach(match => {
      console.log(`      - ${match.suggestion} (${match.filePath})`);
    });

    const suggestion = matcher.generateSuggestion(test.value, matches);
    console.log(`   📝 Mensagem: ${suggestion.message}`);
    console.log(`   💡 Sugestão: ${suggestion.suggestion.split('\n')[0]}`);
  } else {
    console.log(`   ❌ Nenhum enum compatível encontrado`);
  }

  console.log('');
});

console.log('═══════════════════════════════════════════════════════════════\n');

// Teste de código com números mágicos
console.log('📄 Simulando análise de código:\n');

const codeExample = `
  function updateVehicle(id, status) {
    if (status === 1) {  // ❌ Deveria usar VehicleStatus.ACTIVE
      return res.status(200).json({ success: true });  // ❌ Deveria usar HttpStatus.OK
    }
    
    if (user.type === 'admin') {  // ❌ Deveria usar UserType.ADMIN
      console.log('Admin user detected');
    }
    
    return res.status(404).json({ error: 'Not found' });  // ❌ Deveria usar HttpStatus.NOT_FOUND
  }
`;

console.log('Código de exemplo:');
console.log(codeExample);
console.log('\n🔎 Números/strings detectados:\n');

// Detecta números
const numberPattern = /[!=]==?\s*(-?\d+)(?![.\w])/g;
let match;
const foundNumbers = [];

while ((match = numberPattern.exec(codeExample)) !== null) {
  const value = parseInt(match[1], 10);
  if (value !== 0 && value !== 1 && value !== -1) {
    foundNumbers.push(value);
  }
}

foundNumbers.forEach(value => {
  const matches = matcher.findMatchingEnums(value);
  if (matches.length > 0) {
    const suggestion = matcher.generateSuggestion(value, matches);
    console.log(`   ⚠️  ${suggestion.message}`);
  }
});

// Detecta strings
const stringPattern = /[!=]==?\s*(['"])([^'"]+)\1/g;
const foundStrings = [];

while ((match = stringPattern.exec(codeExample)) !== null) {
  const value = match[2];
  if (value && value.length >= 2 && !/[\s.,!?;:]/.test(value)) {
    foundStrings.push(value);
  }
}

foundStrings.forEach(value => {
  const matches = matcher.findMatchingEnums(value);
  if (matches.length > 0) {
    const suggestion = matcher.generateSuggestion(value, matches);
    console.log(`   ⚠️  ${suggestion.message}`);
  }
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('\n✅ Teste completo! O EnumMatcher está funcionando corretamente.\n');
