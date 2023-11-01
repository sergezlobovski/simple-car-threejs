import { defineConfig } from 'vite'

export default defineConfig({
    root: 'src/',
    build: {
        rollupOptions: {
            input: 'src/init.js' // Specifies the input point if it differs from ./index.html
        }
    }
})