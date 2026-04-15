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

async function listModels() {
  const apiKey = getEnvKey();
  if (!apiKey) {
    console.error("ERRO: GEMINI_API_KEY não encontrada no .env.");
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  https.get(url, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      try {
        const data = JSON.parse(rawData);
        if (data.models) {
          console.log("Modelos disponíveis para esta chave:");
          data.models.forEach(m => console.log(" -", m.name));
        } else {
          console.log("Resposta da API:", JSON.stringify(data, null, 2));
        }
      } catch (e) {
        console.error("Erro ao processar JSON:", e.message);
      }
    });
  }).on('error', (e) => {
    console.error(`Erro na requisição: ${e.message}`);
  });
}

listModels();
