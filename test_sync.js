require('dotenv').config({ path: 'e:/node/app_temp/.env' });
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_ShNT20JigrOY@ep-nameless-wave-adf8hxr7.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const handler = require('./pages/api/totvs/sync-vendas.js').default;

const req = {
  query: {
    start: '2026-07-02T00:00:00Z',
    end: '2026-07-02T23:59:59Z'
  },
  method: 'GET'
};

const res = {
  status: function(s) {
    this.statusCode = s;
    return this;
  },
  json: function(data) {
    console.log("RESPONSE:", this.statusCode, data);
  }
};

handler(req, res).then(() => {
  console.log("Done");
}).catch(console.error);
