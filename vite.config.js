import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function bundleStatsPlugin() {
  return {
    name: 'bundle-stats',
    generateBundle(_, bundle) {
      const chunks = []
      const modules = []

      for (const [fileName, item] of Object.entries(bundle)) {
        if (item.type !== 'chunk') continue

        chunks.push({
          fileName,
          size: item.code.length,
          modules: Object.keys(item.modules).length,
          isEntry: item.isEntry,
          imports: item.imports,
        })

        for (const [id, info] of Object.entries(item.modules)) {
          modules.push({
            fileName,
            id,
            renderedLength: info.renderedLength || 0,
          })
        }
      }

      const report = {
        generatedAt: new Date().toISOString(),
        chunks: chunks.sort((a, b) => b.size - a.size),
        topModules: modules.sort((a, b) => b.renderedLength - a.renderedLength).slice(0, 100),
      }

      this.emitFile({
        type: 'asset',
        fileName: 'bundle-stats.json',
        source: JSON.stringify(report, null, 2),
      })
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'analyze' ? [bundleStatsPlugin()] : [])],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three-vendor'
          if (id.includes('node_modules/react')) return 'react-vendor'
          if (id.includes('node_modules')) return 'vendor'
          return undefined
        },
      },
    },
  },
}))
