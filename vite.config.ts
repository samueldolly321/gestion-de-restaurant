import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
      // Dossiers/fichiers hors du code ignorés : un fichier verrouillé (générateur de clés en cours
      // d'exécution, fichier temporaire « ~$… » de Word) faisait planter le serveur (EBUSY).
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          '**/licence-privee/**', '**/fichier exe application/**', '**/release/**', '**/dist/**',
          '**/*.docx', '**/~$*', '**/*.exe', '**/image/**', '**/drizzle/**',
        ],
      },
    },
  };
});
