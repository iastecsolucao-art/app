const fs = require('fs');
const path = require('path');

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let i = 0;
    (function next() {
      let file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
}

walk('e:/node/app_temp/pages/api', (err, files) => {
  if (err) throw err;
  const tsFiles = files.filter(f => f.endsWith('.ts'));
  let count = 0;
  for (const file of tsFiles) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('getServerSession(req, res, authOptions)')) {
      content = content.replace(/const session[\s\S]*?=\s*await getServerSession\(req, res, authOptions\);/g, 'const session: any = await getServerSession(req, res, authOptions as any);');
      fs.writeFileSync(file, content);
      console.log('Fixed', file);
      count++;
    }
  }
  console.log('Total fixed:', count);
});
