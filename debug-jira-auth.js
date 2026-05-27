/**
 * Debug detalhado da autenticação Jira
 */

import axios from 'axios';
import 'dotenv/config';

async function debugAuth() {
  const token = process.env.JIRA_TOKEN || process.env.BITBUCKET_TOKEN;
  const email = process.env.JIRA_USERNAME || process.env.BITBUCKET_USERNAME;
  const siteUrl = process.env.JIRA_SITE_URL;

  console.log('🔍 Debug de Autenticação Jira\n');
  console.log('Configurações:');
  console.log(`  Email: "${email}"`);
  console.log(`  Token (primeiros 20 chars): ${token ? token.substring(0, 20) + '...' : 'VAZIO'}`);
  console.log(`  Token (comprimento): ${token ? token.length : 0} caracteres`);
  console.log(`  Site URL: "${siteUrl}"\n`);

  // Validações básicas
  const issues = [];

  if (!email || email.trim() === '') {
    issues.push('❌ Email está vazio ou não configurado');
  } else if (!email.includes('@')) {
    issues.push('⚠️  Email não parece válido (não contém @)');
  }

  if (!token || token.trim() === '') {
    issues.push('❌ Token está vazio ou não configurado');
  } else if (!token.startsWith('ATATT')) {
    issues.push('⚠️  Token não parece ser um Atlassian API Token (não começa com ATATT)');
  }

  if (!siteUrl || siteUrl.trim() === '') {
    issues.push('⚠️  JIRA_SITE_URL não configurado');
  }

  if (issues.length > 0) {
    console.log('⚠️  Problemas encontrados:\n');
    issues.forEach(issue => console.log(`   ${issue}`));
    console.log();
  } else {
    console.log('✅ Configurações básicas parecem corretas\n');
  }

  // Teste 1: Verificar se o endpoint está acessível
  console.log('📡 Teste 1: Verificando se o endpoint Jira está acessível...');
  const baseUrl = `https://${siteUrl}`;
  try {
    await axios.get(baseUrl, { timeout: 5000 });
    console.log(`✅ Site ${baseUrl} está acessível\n`);
  } catch (err) {
    console.log(`⚠️  Site ${baseUrl} pode não estar acessível: ${err.message}\n`);
  }

  // Teste 2: Autenticação no endpoint /myself
  console.log('🔐 Teste 2: Testando autenticação no endpoint /myself...');
  const authUrl = `${baseUrl}/rest/api/3/myself`;

  try {
    // Cria credenciais Basic Auth manualmente
    const credentials = Buffer.from(`${email}:${token}`).toString('base64');

    console.log(`   URL: ${authUrl}`);
    console.log(`   Email: ${email}`);
    console.log(`   Auth Header: Basic ${credentials.substring(0, 30)}...`);

    const response = await axios.get(authUrl, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log(`✅ Autenticação bem-sucedida!`);
    console.log(`   Usuário: ${response.data.displayName}`);
    console.log(`   Email verificado: ${response.data.emailAddress}`);
    console.log(`   Account ID: ${response.data.accountId}\n`);

  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;

    console.log(`❌ Falha na autenticação!`);
    console.log(`   Status: ${status || 'N/A'}`);
    console.log(`   Mensagem: ${data?.errorMessages?.[0] || error.message}`);

    if (status === 401) {
      console.log(`\n💡 Possíveis causas do erro 401:`);
      console.log(`   1. O email está incorreto`);
      console.log(`   2. O token está incorreto ou expirado`);
      console.log(`   3. O token foi revogado`);
      console.log(`   4. O email e token não correspondem (token criado com outro email)`);
      console.log(`\n🔧 Soluções:`);
      console.log(`   • Verifique se o email "${email}" está correto`);
      console.log(`   • Acesse: https://id.atlassian.com/manage-profile/security/api-tokens`);
      console.log(`   • Revogue o token antigo e crie um novo`);
      console.log(`   • Certifique-se de estar logado com o email: ${email}`);
      console.log(`   • Copie o novo token e atualize JIRA_TOKEN no .env\n`);
    }
  }

  // Teste 3: Tentar acessar a issue
  console.log('🎫 Teste 3: Tentando acessar a issue NOVA-5187...');
  const issueUrl = `${baseUrl}/rest/api/3/issue/NOVA-5187`;

  try {
    const credentials = Buffer.from(`${email}:${token}`).toString('base64');

    const response = await axios.get(issueUrl, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    console.log(`✅ Issue encontrada!`);
    console.log(`   ${response.data.key}: ${response.data.fields.summary}`);
    console.log(`   Status: ${response.data.fields.status.name}`);
    console.log(`   Tipo: ${response.data.fields.issuetype.name}\n`);

    console.log('🎉 SUCESSO! A integração com o Jira está funcionando corretamente!\n');

  } catch (error) {
    const status = error.response?.status;

    if (status === 404) {
      console.log(`⚠️  Issue não encontrada (404)`);
      console.log(`   Isso pode significar:`);
      console.log(`   1. A issue NOVA-5187 não existe`);
      console.log(`   2. Você não tem permissão para ver essa issue`);
      console.log(`   3. O projeto NOVA não está acessível com esse token\n`);
      console.log(`💡 Verifique:`);
      console.log(`   • Acesse: https://autoavaliar.atlassian.net/browse/NOVA-5187`);
      console.log(`   • Confirme que você consegue ver a issue no navegador`);
      console.log(`   • Verifique se está logado com o email: ${email}\n`);
    } else {
      console.log(`❌ Erro ao acessar a issue: ${status || 'N/A'} - ${error.message}\n`);
    }
  }
}

debugAuth().catch(console.error);
