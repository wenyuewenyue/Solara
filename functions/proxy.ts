const API_BASE_URL = 'https://music-api.gdstudio.xyz/api.php';

export async function onRequest(context: { request: Request }): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);

  const targetUrl = `${API_BASE_URL}${url.search}`;

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: {
      'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://music.gdstudio.xyz/'
    }
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders
  });
}
