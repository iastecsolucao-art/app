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

async function testKey() {
  const key = getEnvKey();
  if (!key) {
    console.log("❌ ERRO: GEMINI_API_KEY não encontrada no arquivo .env");
    return;
  }

  console.log(`🔍 Verificando chave encontrada: ${key.substring(0, 7)}...${key.substring(key.length - 4)}`);
  console.log(`📏 Tamanho da chave: ${key.length} caracteres`);

  const data = JSON.stringify({
    contents: [{ parts: [{ text: "Oi" }] }]
  });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1/models/gemini-1.5-flash:generateContent?key=${key}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    let responseBody = '';
    res.on('data', (d) => { responseBody += d; });
    res.on('end', () => {
      console.log(`\n📡 Status da Resposta: ${res.statusCode} ${res.statusMessage}`);
      try {
        const result = JSON.parse(responseBody);
        if (res.statusCode === 200) {
          console.log("✅ SUCESSO! A chave está funcionando perfeitamente.");
        } else {
          console.log("❌ ERRO DA API GOOGLE:");
          console.log(JSON.stringify(result, null, 2));
        }
      } catch (e) {
        console.log("❌ Erro ao processar resposta JSON. Raw:");
        console.log(responseBody);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Erro na conexão: ${e.message}`);
  });

  req.write(data);
  req.end();
}

testKey();
