import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'serve-and-copy-date-a-and-se',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url) {
              const decodedUrl = decodeURIComponent(req.url);
              if (
                decodedUrl.startsWith('/dateA/') || decodedUrl.startsWith('dateA/') ||
                decodedUrl.startsWith('/SE/') || decodedUrl.startsWith('SE/') ||
                decodedUrl.startsWith('/BGM/') || decodedUrl.startsWith('BGM/') ||
                decodedUrl.startsWith('/card/') || decodedUrl.startsWith('card/') ||
                decodedUrl.startsWith('/Pluscard/') || decodedUrl.startsWith('Pluscard/')
              ) {
                const cleanUrl = decodedUrl.startsWith('/') ? decodedUrl : '/' + decodedUrl;
                const filePath = path.join(process.cwd(), cleanUrl);
                if (fs.existsSync(filePath)) {
                  if (cleanUrl.toLowerCase().endsWith('.mp3')) {
                    res.setHeader('Content-Type', 'audio/mpeg');
                  } else if (cleanUrl.toLowerCase().endsWith('.wav')) {
                    res.setHeader('Content-Type', 'audio/wav');
                  } else {
                    res.setHeader('Content-Type', cleanUrl.endsWith('.png') ? 'image/png' : 'image/jpeg');
                  }
                  res.end(fs.readFileSync(filePath));
                  return;
                }
              }
            }
            next();
          });
        },
        closeBundle() {
          try {
            // Copy dateA
            const srcDir = path.resolve(process.cwd(), 'dateA');
            const destDir = path.resolve(process.cwd(), 'dist/dateA');
            if (fs.existsSync(srcDir)) {
              if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
              }
              const files = fs.readdirSync(srcDir);
              for (const file of files) {
                fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
              }
            }
            
            // Copy card
            const cardSrcDir = path.resolve(process.cwd(), 'card');
            const cardDestDir = path.resolve(process.cwd(), 'dist/card');
            if (fs.existsSync(cardSrcDir)) {
              if (!fs.existsSync(cardDestDir)) {
                fs.mkdirSync(cardDestDir, { recursive: true });
              }
              const files = fs.readdirSync(cardSrcDir);
              for (const file of files) {
                fs.copyFileSync(path.join(cardSrcDir, file), path.join(cardDestDir, file));
              }
            }

            // Copy Pluscard
            const pluscardSrcDir = path.resolve(process.cwd(), 'Pluscard');
            const pluscardDestDir = path.resolve(process.cwd(), 'dist/Pluscard');
            if (fs.existsSync(pluscardSrcDir)) {
              if (!fs.existsSync(pluscardDestDir)) {
                fs.mkdirSync(pluscardDestDir, { recursive: true });
              }
              const files = fs.readdirSync(pluscardSrcDir);
              for (const file of files) {
                fs.copyFileSync(path.join(pluscardSrcDir, file), path.join(pluscardDestDir, file));
              }
            }
            
            // Copy SE
            const seSrcDir = path.resolve(process.cwd(), 'SE');
            const seDestDir = path.resolve(process.cwd(), 'dist/SE');
            if (fs.existsSync(seSrcDir)) {
              if (!fs.existsSync(seDestDir)) {
                fs.mkdirSync(seDestDir, { recursive: true });
              }
              const seFiles = fs.readdirSync(seSrcDir);
              for (const file of seFiles) {
                fs.copyFileSync(path.join(seSrcDir, file), path.join(seDestDir, file));
              }
            }

            // Copy BGM
            const bgmSrcDir = path.resolve(process.cwd(), 'BGM');
            const bgmDestDir = path.resolve(process.cwd(), 'dist/BGM');
            if (fs.existsSync(bgmSrcDir)) {
              if (!fs.existsSync(bgmDestDir)) {
                fs.mkdirSync(bgmDestDir, { recursive: true });
              }
              const bgmFiles = fs.readdirSync(bgmSrcDir);
              for (const file of bgmFiles) {
                fs.copyFileSync(path.join(bgmSrcDir, file), path.join(bgmDestDir, file));
              }
            }
          } catch (err) {
            console.error('Error copying assets:', err);
          }
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
