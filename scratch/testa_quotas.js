const https = require('https');
const fs = require('fs');
const path = require('path');

function getEnvKey() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/GEMINI_API_KEY\s*=\s*([^\s]+)/);
  return match ? match[1] : null;
}

async function testModel(modelName) {
  const key = getEnvKey();
  if (!key) return console.log("Sem a chave");

  console.log(`\n======================================`);
  console.log(`🚀 TESTANDO MODELO: ${modelName}`);
  
  const data = JSON.stringify({ contents: [{ parts: [{ text: "Oi" }] }] });
  const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models/${modelName}:generateContent?key=${key}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode === 200) {
            console.log("✅ SUCESSO! A requisição passou.");
          } else {
            console.log(`❌ FALHOU: Código ${res.statusCode} | Erro: ${json.error?.message.split('.')[0]}`);
          }
        } catch(e) {
             console.log(`❌ FALHOU: Falha ao fazer parse JSON`);
        }
        resolve();
      });
    });
    req.on('error', resolve);
    req.write(data);
    req.end();
  });
}

async function runAll() {
    await testModel("gemini-2.0-flash");
    await testModel("gemini-flash-latest"); // Equivalente ao 1.5 mais estavel
    await testModel("gemini-2.5-flash");
}

runAll();
