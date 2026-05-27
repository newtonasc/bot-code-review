/**
 * Script de teste para verificar conexão com o Jira
 */

import axios from 'axios';
import 'dotenv/config';

async function testJiraConnection() {
  const token = process.env.JIRA_TOKEN || process.env.BITBUCKET_TOKEN;
  const email = process.env.JIRA_USERNAME || process.env.BITBUCKET_USERNAME;
  const siteUrl = process.env.JIRA_SITE_URL;
  const cloudId = process.env.JIRA_CLOUD_ID;
  const projectKey = process.env.JIRA_PROJECT_KEY || 'PROJ';
  const issueKey = `${projectKey}-1`; // Teste com a primeira issue do projeto

  console.log('🔍 Testando conexão com o Jira...\n');
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Token: ${token ? token.substring(0, 15) + '...' : 'não configurado'}`);
  console.log(`🌐 Site URL: ${siteUrl}`);
  console.log(`☁️  Cloud ID: ${cloudId}`);
  console.log(`🎫 Issue: ${issueKey}\n`);

  if (!token || !email) {
    console.error('❌ Token ou email não configurados!\n');
    return;
  }

  // Testa diferentes endpoints
  const endpoints = [
    {
      name: 'API Jira via Site URL',
      url: `https://${siteUrl}/rest/api/3/issue/${issueKey}`,
      enabled: !!siteUrl,
    },
    {
      name: 'API Jira via Cloud ID',
      url: `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}`,
      enabled: !!cloudId,
    },
    {
      name: 'Myself endpoint (teste de autenticação)',
      url: `https://${siteUrl}/rest/api/3/myself`,
      enabled: !!siteUrl,
    },
  ];

  for (const endpoint of endpoints) {
    if (!endpoint.enabled) {
      console.log(`⏭️  Pulando: ${endpoint.name} (não configurado)\n`);
      continue;
    }

    console.log(`🔗 Testando: ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);

    try {
      const response = await axios.get(endpoint.url, {
        auth: { username: email, password: token },
        headers: { Accept: 'application/json' },
        timeout: 10000,
      });

      console.log(`✅ Sucesso! Status: ${response.status}`);

      if (endpoint.name.includes('Myself')) {
        console.log(`   Usuário: ${response.data.displayName || response.data.emailAddress}`);
      } else if (response.data.key) {
        console.log(`   Issue: ${response.data.key} - ${response.data.fields.summary}`);
        console.log(`   Status: ${response.data.fields.status.name}`);
      }
      console.log();

    } catch (error) {
      const status = error.response?.status;
      const statusText = error.response?.statusText;
      const message = error.response?.data?.errorMessages?.[0] || error.message;

      console.log(`❌ Erro! Status: ${status || 'N/A'}`);
      console.log(`   Status Text: ${statusText || 'N/A'}`);
      console.log(`   Mensagem: ${message}`);

      if (status === 401) {
        console.log(`   💡 Token inválido ou expirado`);
      } else if (status === 403) {
        console.log(`   💡 Token sem permissão para acessar o Jira`);
        console.log(`   💡 O token precisa ter escopo "read:jira-work"`);
      } else if (status === 404) {
        console.log(`   💡 Issue não encontrada OU token sem acesso ao projeto`);
      }
      console.log();
    }
  }

  // Sugestões finais
  console.log('📋 Próximos passos:\n');
  console.log('1️⃣  Se todos os testes falharam com 403/401:');
  console.log('   • Crie um novo Atlassian API Token em:');
  console.log('   • https://id.atlassian.com/manage-profile/security/api-tokens');
  console.log('   • Use o email: ' + email);
  console.log('   • Adicione o token no .env como JIRA_TOKEN=<token>\n');

  console.log('2️⃣  Se o teste "Myself" funcionou mas a issue não:');
  console.log(`   • Verifique se você tem acesso ao projeto ${projectKey} no Jira`);
  console.log(`   • Tente acessar: https://${siteUrl}/browse/${issueKey}\n`);

  console.log('3️⃣  Se a issue foi encontrada:');
  console.log('   • Parabéns! A integração está funcionando! 🎉\n');
}

testJiraConnection().catch(console.error);
