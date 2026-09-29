import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api/moviebox': {
        target: 'https://h5-api.aoneroom.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/moviebox/, ''),
        headers: {
          Origin: 'https://h5.aoneroom.com',
          Referer: 'https://h5.aoneroom.com/',
        },
      },
      '/api/mzfi': {
        target: 'https://mzfi.me',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mzfi/, ''),
        headers: {
          Origin: 'https://mzfi.me',
          Referer: 'https://mzfi.me/',
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'video-proxy-plugin',
      configureServer(server) {
        server.middlewares.use('/api/proxy_video', async (req, res) => {
          try {
            const host = req.headers.host || '127.0.0.1:5173';
            const reqUrl = new URL(req.url || '', `http://${host}`);
            const target = reqUrl.searchParams.get('url');
            if (!target) {
              res.statusCode = 400;
              res.end('Missing target url');
              return;
            }

            const https = await import('node:https');
            const http = await import('node:http');

            const forwardHeaders: Record<string, string> = {
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'referer': 'https://mzfi.me/',
              'origin': 'https://mzfi.me',
              'accept-encoding': 'identity',
            };
            if (req.headers.range) {
              forwardHeaders['range'] = req.headers.range as string;
            }

            const doRequest = (currentUrl: string, redirectCount = 0) => {
              if (redirectCount > 5) {
                res.statusCode = 502;
                res.end('Too many redirects');
                return;
              }

              const parsedUrl = new URL(currentUrl);
              const client = parsedUrl.protocol === 'https:' ? https : http;

              const proxyReq = client.request(currentUrl, {
                method: req.method || 'GET',
                headers: forwardHeaders,
              }, (proxyRes) => {
                if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                  const redirectUrl = new URL(proxyRes.headers.location, currentUrl).toString();
                  doRequest(redirectUrl, redirectCount + 1);
                  return;
                }

                res.statusCode = proxyRes.statusCode || 200;
                const h: Record<string, any> = { ...proxyRes.headers };
                h['access-control-allow-origin'] = '*';
                h['access-control-allow-methods'] = 'GET, HEAD, OPTIONS';
                h['access-control-allow-headers'] = '*';
                h['access-control-expose-headers'] = 'Content-Range, Content-Length, Accept-Ranges';
                h['accept-ranges'] = 'bytes';
                h['content-type'] = 'video/mp4';

                res.writeHead(res.statusCode, h);
                proxyRes.pipe(res);

                req.on('close', () => {
                  proxyReq.destroy();
                });
              });

              proxyReq.on('error', (err) => {
                if (!res.headersSent) {
                  res.statusCode = 502;
                  res.end(err.message);
                }
              });

              proxyReq.end();
            };

            doRequest(target);
          } catch (e: any) {
            if (!res.headersSent) {
              res.statusCode = 500;
              res.end(e?.message || 'Proxy error');
            }
          }
        });
      },
    },
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/hls.js')) {
            return 'vendor-hls';
          }
          if (id.includes('services/liveTvService')) {
            return 'data-livetv';
          }
        },
      },
    },
  },
});
