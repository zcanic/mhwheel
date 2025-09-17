// Minimal static server for Playwright tests
import http from 'http';
import { readFileSync, createReadStream, statSync, existsSync } from 'fs';
import { extname, join } from 'path';

const PORT = 4173;
const ROOT = process.cwd();

const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.ico':'image/x-icon'
};

function send(res, code, headers, body){ res.writeHead(code, headers); res.end(body); }

const server = http.createServer((req,res)=>{
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  // 支持 base href /mhwheel/ 前缀访问
  if (urlPath.startsWith('/mhwheel/')) urlPath = urlPath.replace('/mhwheel','');
  if (urlPath === '/' ) urlPath = '/index.html';
  const filePath = join(ROOT, urlPath);
  if (!existsSync(filePath)) { send(res,404,{ 'content-type':'text/plain' }, 'Not found'); return; }
  const ext = extname(filePath);
  res.writeHead(200,{ 'content-type': MIME[ext] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
});

server.listen(PORT, ()=> console.log(`Static server running at http://localhost:${PORT}`));
