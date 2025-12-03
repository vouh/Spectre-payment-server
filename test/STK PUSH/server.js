import express from 'express';
import axios from 'axios';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import router from './controllers/lipaNaMpesa.js'
import {callback} from './controllers/callback.js';
import ngrok from 'ngrok';

// Production: no ngrok middleware

 
// Explicitly load .env from CWD with debug and encoding, and handle UTF-16 if necessary
import fs from 'fs';
const cwdEnvPath = path.join(process.cwd(), '.env');
if (fs.existsSync(cwdEnvPath)) {
  try {
    const buf = fs.readFileSync(cwdEnvPath);
    const first = Array.from(buf.slice(0, 16));
    const isUtf16LE = first[0] === 0xff && first[1] === 0xfe;
    const isUtf16BE = first[0] === 0xfe && first[1] === 0xff;
    if (isUtf16LE || isUtf16BE) {
      console.warn('[Env] WARNING: .env appears to be UTF-16. Please re-save as UTF-8 (no BOM).');
      try {
        const text = buf.toString(isUtf16LE ? 'utf16le' : 'utf16be');
        const lines = text.split(/\r?\n/);
        const envObj = {};
        for (const line of lines) {
          if (!line || /^\s*#/.test(line)) continue;
          const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
          if (m) envObj[m[1]] = m[2];
        }
        Object.assign(process.env, envObj);
        console.log('[Env] Applied manual UTF-16 .env parser');
      } catch (e) {
        console.warn('[Env] Manual UTF-16 .env parse failed:', e?.message || e);
      }
    }
  } catch {}
  dotenv.config({ path: cwdEnvPath, override: false, debug: true, encoding: 'utf8' });
} else {
  dotenv.config();
}
const app = express();
const port = process.env.PORT || 8080;





const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Optionally overlay env from credentials.env if present
(() => {
  const cred = path.join(__dirname, 'credentials.env');
  const hasDotEnv = fs.existsSync(path.join(process.cwd(), '.env'));
  console.log(`[Env] .env present in CWD (${process.cwd()}):`, hasDotEnv);
  console.log(`[Env] credentials.env path:`, cred, 'exists:', fs.existsSync(cred));
  if (fs.existsSync(cred)) {
    try {
      const buf = fs.readFileSync(cred);
      const first = Array.from(buf.slice(0, 16));
      console.log('[Env] credentials.env size(bytes):', buf.length, 'first bytes:', first.map(b=>b.toString(16).padStart(2,'0')).join(' '));
      const isUtf16LE = first[0] === 0xff && first[1] === 0xfe;
      const isUtf16BE = first[0] === 0xfe && first[1] === 0xff;
      if (isUtf16LE || isUtf16BE) {
        console.warn('[Env] WARNING: credentials.env appears to be UTF-16. Please re-save as UTF-8 (no BOM).');
        // Fallback: attempt manual parse for UTF-16 encoded file
        let text;
        try {
          text = buf.toString(isUtf16LE ? 'utf16le' : 'utf16be');
          const lines = text.split(/\r?\n/);
          const envObj = {};
          for (const line of lines) {
            if (!line || /^\s*#/.test(line)) continue;
            const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
            if (m) {
              const key = m[1];
              const val = m[2];
              envObj[key] = val;
            }
          }
          Object.assign(process.env, envObj);
          console.log('[Env] Applied manual UTF-16 credentials.env parser');
        } catch (e) {
          console.warn('[Env] Manual UTF-16 parse failed:', e?.message || e);
        }
      }
    } catch {}

    dotenv.config({ path: cred, override: true, debug: true, encoding: 'utf8' });
    console.log('[Env] Loaded credentials.env with override=true, encoding=utf8, debug on');
    // Generic fallback parser (UTF-8) to ensure envs are populated
    try {
      const text = fs.readFileSync(cred, 'utf8');
      const lines = text.split(/\r?\n/);
      let count = 0;
      for (const line of lines) {
        if (!line || /^\s*#/.test(line)) continue;
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (m) {
          const key = m[1].trim();
          const val = m[2].trim();
          if (key) { process.env[key] = val; count++; }
        }
      }
      console.log(`[Env] Fallback parsed credentials.env entries: ${count}`);
    } catch (e) {
      console.warn('[Env] Fallback UTF-8 parse failed:', e?.message || e);
    }
  }
  // Quick presence snapshot (masked)
  const snapshot = (k) => (process.env[k] ? '[set]' : '[missing]');
  console.log('[Env] Snapshot =>', {
    CONSUMER_KEY: snapshot('CONSUMER_KEY'),
    CONSUMER_SECRET: snapshot('CONSUMER_SECRET'),
    BusinessShortCode: snapshot('BusinessShortCode'),
    MPESA_PASSKEY: snapshot('MPESA_PASSKEY'),
    TILL_NUMBER: snapshot('TILL_NUMBER'),
  });
})();

// Validate required environment variables early
(() => {
  const required = ['CONSUMER_KEY', 'CONSUMER_SECRET', 'BusinessShortCode', 'MPESA_PASSKEY', 'TILL_NUMBER'];
  const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
  if (missing.length) {
    console.error('\n[Startup Error] Missing required environment variables:', missing.join(', '));
    console.error('Please set them in your .env or hosting environment and restart the server.');
    process.exit(1);
  }
})();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());

app.use(router);
app.use(callback);


app.use('/static', express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



app.get("/", async(req, res) => {
  res.render('payment', {failedMessage: null, successMessage: null});
  });


  app.get("/dashboard", async(req, res) => {
    res.render('dashboard');
    });

app.listen(port,  () => {

  console.log(`Server running on port ${port}`);
  (async () => {
    try {
      if (process.env.DOMAIN) {
        console.log(`Public URL (DOMAIN): ${process.env.DOMAIN}`);
        return;
      }
      if (process.env.NGROK_AUTHTOKEN) {
        await ngrok.authtoken(process.env.NGROK_AUTHTOKEN);
      }
      const url = await ngrok.connect({
        addr: port,
        proto: 'http',
        region: process.env.NGROK_REGION || 'eu'
      });
      process.env.DOMAIN = url;
      console.log(`Public URL (ngrok): ${url}`);
    } catch (e) {
      console.log('Ngrok error:', e?.message || e);
      console.log('Tip 1: verify NGROK_AUTHTOKEN is valid for your account and not revoked.');
      console.log('Tip 2: try setting NGROK_REGION=eu (or ap) in .env.');
      console.log('Tip 3: you can alternatively run: ngrok http ' + port + ' and set DOMAIN to the printed https URL.');
    }
  })();

  });
  
