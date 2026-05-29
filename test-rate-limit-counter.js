/**
 * 🧪 Teste do Contador Dinâmico de Rate Limiting
 * 
 * Este script demonstra o novo contador em tempo real implementado
 * no bot de code review para melhorar a experiência do usuário durante
 * esperas de rate limiting.
 * 
 * Execute: node test-rate-limit-counter.js
 * 
 * O que você verá:
 * - Simulação de análise de arquivos com IA
 * - Contador dinâmico mostrando tempo restante a cada segundo
 * - Limpeza automática da linha após conclusão
 * 
 * Duração do teste: 15 segundos
 */

// Simula o método _sleep com contador dinâmico
async function sleepWithProgress(ms) {
  if (ms < 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const startTime = Date.now();
  const endTime = startTime + ms;

  return new Promise((resolve) => {
    const updateInterval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((endTime - now) / 1000);

      if (remaining <= 0) {
        clearInterval(updateInterval);
        process.stdout.write('\r\x1b[K');
        resolve();
      } else {
        process.stdout.write(`\r   ⏳ Aguardando rate limit: ${remaining}s restantes...`);
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(updateInterval);
      process.stdout.write('\r\x1b[K');
      resolve();
    }, ms);
  });
}

async function demo() {
  console.log('🧪 Testando contador dinâmico de rate limiting\n');

  console.log('📋 Simulação de análise com rate limit:');
  console.log('   [1/15] Analisando arquivo1.js...');
  console.log('   ✅ [1/15] Análise completa');
  console.log('   [2/15] Analisando arquivo2.js...');
  console.log('   ✅ [2/15] Análise completa');
  console.log('   ...');
  console.log('   [10/15] Analisando arquivo10.js...');
  console.log('   ✅ [10/15] Análise completa');

  process.stdout.write('\n   ⏳ Rate limit atingido (10/10). Aguardando 15s...\n');
  await sleepWithProgress(15000); // 15 segundos

  console.log('   ✅ Rate limit resetado!');
  console.log('   [11/15] Analisando arquivo11.js...');
  console.log('   ✅ [11/15] Análise completa');
  console.log('\n✅ Teste concluído!\n');
}

demo().catch(console.error);
