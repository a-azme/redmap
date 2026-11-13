import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CESIUM_SRC = path.resolve(__dirname, 'node_modules/cesium/Build/Cesium')
const CESIUM_DIRS = ['Workers', 'Assets', 'ThirdParty', 'Widgets']

const MIME_TYPES = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.glb': 'model/gltf-binary',
  '.ktx2': 'image/ktx2',
  '.xml': 'application/xml',
}

function cesiumStaticPlugin() {
  return {
    name: 'cesium-static-from-node-modules',
    configureServer(server) {
      server.middlewares.use('/cesium', (req, res, next) => {
        const cleanUrl = (req.url || '/').split('?')[0]
        const target = path.resolve(CESIUM_SRC, '.' + cleanUrl)
        if (!target.startsWith(CESIUM_SRC)) return next()
        fs.stat(target, (err, stat) => {
          if (err || !stat.isFile()) return next()
          const ext = path.extname(target).toLowerCase()
          if (MIME_TYPES[ext]) res.setHeader('Content-Type', MIME_TYPES[ext])
          res.setHeader('Cache-Control', 'public, max-age=3600')
          fs.createReadStream(target).pipe(res)
        })
      })
    },
    writeBundle(options) {
      const outDir = options.dir || path.resolve(__dirname, 'dist')
      const destBase = path.join(outDir, 'cesium')
      for (const dir of CESIUM_DIRS) {
        const srcDir = path.join(CESIUM_SRC, dir)
        const destDir = path.join(destBase, dir)
        if (fs.existsSync(srcDir)) {
          fs.cpSync(srcDir, destDir, { recursive: true })
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cesiumStaticPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
})