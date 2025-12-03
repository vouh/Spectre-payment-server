import ngrok from 'ngrok';

let tunnelUrl = null;
let connectingPromise = null;

export async function ensureNgrok() {
  // If a DOMAIN is provided, assume an external/public URL is already in use
  if (process.env.DOMAIN) {
    if (!tunnelUrl) {
      tunnelUrl = process.env.DOMAIN;
      console.log('Using existing DOMAIN for callbacks:', tunnelUrl);
    }
    return tunnelUrl;
  }
  if (tunnelUrl) return tunnelUrl;
  if (!process.env.NGROK_AUTHTOKEN) {
    console.log('Ngrok error:', new Error('Missing NGROK_AUTHTOKEN in environment'));
    return null;
  }
  if (!connectingPromise) {
    connectingPromise = (async () => {
      try {
        // ensure clean state: disconnect any existing tunnels from a previous run
        await ngrok.disconnect();
      } catch (_) {}
      return ngrok.connect({
        addr: process.env.PORT || 8080,
        authtoken: process.env.NGROK_AUTHTOKEN,
      });
    })()
      .then((url) => {
        tunnelUrl = url;
        console.log('Ngrok URL:', url);
        return url;
      })
      .catch((error) => {
        console.log('Ngrok error:', error);
        return null;
      })
      .finally(() => {
        connectingPromise = null;
      });
  }
  return await connectingPromise;
}

export async function stopNgrok() {
  try {
    await ngrok.disconnect();
    await ngrok.kill();
  } catch (e) {
    // ignore errors on shutdown
  } finally {
    tunnelUrl = null;
  }
}