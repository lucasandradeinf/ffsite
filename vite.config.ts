import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Lê /public/products e expõe a lista de arquivos como `virtual:product-files`.
 * Basta soltar um PNG (ou WebP) na pasta: ele aparece no site automaticamente,
 * e os dados editoriais (nome, descrição...) ficam em src/content/products.ts.
 */
function productFiles(): Plugin {
  const id = 'virtual:product-files';
  const resolved = '\0' + id;
  const dir = path.resolve(__dirname, 'public/products');
  const IMG = /\.(png|webp|avif|jpe?g)$/i;

  const scan = () => {
    const groups = new Map<string, string[]>();
    if (!fs.existsSync(dir)) return [];
    for (const f of fs.readdirSync(dir).sort()) {
      if (!IMG.test(f)) continue;
      const base = f.replace(IMG, '');
      const ext = path.extname(f).slice(1).toLowerCase();
      groups.set(base, [...(groups.get(base) ?? []), ext]);
    }
    return [...groups].map(([base, exts]) => ({ base, exts }));
  };

  return {
    name: 'product-files',
    resolveId: (s) => (s === id ? resolved : undefined),
    load: (s) => (s === resolved ? `export default ${JSON.stringify(scan())};` : undefined),
    configureServer(server) {
      server.watcher.add(dir);
      const reload = (file: string) => {
        if (!path.resolve(file).startsWith(dir)) return;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', reload);
      server.watcher.on('unlink', reload);
    },
  };
}

export default defineConfig({
  // No GitHub Pages o site fica em /<repositório>/ — o workflow define BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), productFiles()],
  build: {
    rollupOptions: {
      input: {
        // página inicial: vitrine 360°
        main: path.resolve(__dirname, 'index.html'),
        // versão alternativa: órbita de produtos
        orbita: path.resolve(__dirname, 'orbita/index.html'),
      },
    },
  },
});
