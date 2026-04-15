const fs = require('fs');
const path = require('path');

const navbarPath = path.join(__dirname, 'components', 'Navbar.js');
let content = fs.readFileSync(navbarPath, 'utf8');

// Modificadores de classes globais
content = content.replace(/bg-blue-600/g, 'bg-neutral-950/80 backdrop-blur-xl border-b border-white/10 shadow-2xl');
content = content.replace(/bg-blue-700/g, 'bg-neutral-900/90 backdrop-blur-xl border border-white/10 ring-1 ring-white/5');
content = content.replace(/bg-blue-800/g, 'bg-neutral-900');
content = content.replace(/text-yellow-300/g, 'text-cyan-400');
content = content.replace(/hover:bg-yellow-400 hover:text-black/g, 'hover:bg-white/10 hover:text-white');
content = content.replace(/bg-yellow-400 text-black/g, 'bg-white/5 text-cyan-400 border-l-2 border-cyan-400');
content = content.replace(/text-blue-600/g, 'text-cyan-500');
content = content.replace(/border-blue-600/g, 'border-white/10');

// Substituir as funções de classe para um visual "tecnológico"
content = content.replace(
  /const navLinkClass = \(active = false\) =>[\s\S]*?;/,
  \`const navLinkClass = (active = false) =>
    \\\`hover:text-cyan-400 transition-colors duration-300 text-sm font-medium uppercase tracking-wider \${active ? "text-cyan-400 font-semibold drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" : "text-neutral-400"}\\\`;\`
);

content = content.replace(
  /const dropItemClass = \(active = false\) =>[\s\S]*?;/,
  \`const dropItemClass = (active = false) =>
    \\\`block px-5 py-3 text-sm transition-all duration-200 hover:bg-white/5 hover:text-white whitespace-nowrap \${
      active ? "bg-white/5 text-cyan-400 font-semibold border-l-2 border-cyan-400" : "text-neutral-300"
    }\\\`;\`
);

content = content.replace(
  /const mobileItemClass = \(active = false\) =>[\s\S]*?;/,
  \`const mobileItemClass = (active = false) =>
    \\\`block px-8 py-3 border-b border-white/5 hover:bg-white/5 hover:text-white transition-all whitespace-nowrap text-sm \${
      active ? "bg-white/5 text-cyan-400 font-semibold border-l-2 border-cyan-400" : "text-neutral-300"
    }\\\`;\`
);

// Injetar a exibição do Plano e usuário na Desktop Navbar (antes do menu mobile button)
const desktopMenuEndIndex = content.indexOf('{session && !expirado && acessos && (\\n        <button\\n          className="md:hidden');

if (desktopMenuEndIndex !== -1) {
  const injection = \`
      {session && !expirado && (
        <div className="hidden md:flex items-center gap-5 ml-auto pl-4 border-l border-white/10">
          <Link href="/admin/planos" className="group flex items-center gap-2 bg-gradient-to-r from-neutral-900 to-neutral-800 px-4 py-1.5 rounded-full border border-cyan-500/30 hover:border-cyan-400 transition-all cursor-pointer shadow-[0_0_15px_rgba(8,145,178,0.15)] hover:shadow-[0_0_20px_rgba(8,145,178,0.4)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 group-hover:animate-ping"></span>
            <span className="text-xs font-bold text-cyan-300 tracking-wider">
              {session?.user?.plano || 'Bronze'}
            </span>
          </Link>
          <div className="text-right">
            <p className="text-sm font-bold text-white leading-tight">{session.user?.name?.split(' ')[0]}</p>
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest">{session.user?.empresa_nome}</p>
          </div>
          <button onClick={() => signOut()} className="p-2 ml-1 text-neutral-500 hover:text-red-400 transition bg-neutral-900/50 rounded-full hover:bg-red-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      \`;
      
  content = content.slice(0, desktopMenuEndIndex) + injection + content.slice(desktopMenuEndIndex);
}

// Melhorar o design do menu mobile tbm
content = content.replace(
  /<div className="px-6 py-4 text-sm border-t border-white\\/10">\\s*👤 {session\.user\?\.name} <br \\/>\\s*🏢 {session\.user\?\.empresa_nome}\\s*<\\/div>/,
  \`<div className="px-6 py-5 text-sm border-t border-white/10 mt-auto bg-neutral-900/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-cyan-900/50 flex items-center justify-center text-cyan-400 font-bold border border-cyan-500/30">
                {session?.user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-bold text-white">{session.user?.name}</p>
                <p className="text-xs text-neutral-400">{session.user?.empresa_nome}</p>
              </div>
            </div>
            
            <Link href="/admin/planos" className="flex items-center justify-between bg-neutral-800 rounded-lg p-3 border border-white/5 hover:border-cyan-500/50 transition">
               <span className="text-xs text-neutral-400 uppercase tracking-widest">Plano Atual</span>
               <span className="text-xs font-bold text-cyan-400">{session?.user?.plano || 'Bronze'} ↗</span>
            </Link>
          </div>\`
);

// Mudar o botão Sair vermelho gigante do mobile para algo mais dark
content = content.replace(
  /className="mx-6 mt-4 mb-6 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded"/,
  'className="mx-6 mt-4 mb-6 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/20 rounded-xl transition"'
);

fs.writeFileSync(navbarPath, content);
console.log('Navbar customizada com sucesso!');
