import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

// Ejecutar con npm run vercel -- <comando>. La CLI se obtiene del registro npm
// y se conserva en su caché, sin añadirla al bundle ni instalarla globalmente.
const npmCli = process.env.npm_execpath;
if (!npmCli || !existsSync(npmCli)) {
  console.error('Ejecuta este asistente con npm run vercel -- <comando>.');
  process.exitCode = 1;
} else {
  const taskNodeOptions = `${process.env.NODE_OPTIONS ?? ''} --use-system-ca`.trim();
  const child = spawn(process.execPath, [npmCli, 'exec', '--yes', '--package=vercel', '--', 'vercel', ...process.argv.slice(2)], {
    stdio: 'inherit',
    windowsHide: true,
    env: { ...process.env, NODE_OPTIONS: taskNodeOptions },
  });
  child.on('error', () => { console.error('No se pudo iniciar Vercel CLI.'); process.exitCode = 1; });
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
}
