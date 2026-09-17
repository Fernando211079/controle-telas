import { build } from 'esbuild';
import { cpSync, mkdirSync } from 'fs';

mkdirSync('dist/assets', { recursive: true });

await build({
  entryPoints: ['src/auth-init.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  outfile: 'dist/assets/vendor.js',
  define: {
    'process.env.SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '')
  }
});

cpSync('index.html', 'dist/index.html');
cpSync('assets', 'dist/assets', { recursive: true });
console.log('build ok -> dist/');
