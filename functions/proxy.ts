// ==================== 大陆免翻墙高可用节点池 ====================
const API_ENDPOINTS: string[] = [
  'https://music.gdstudio.org/api.php',     // 1. 官方国内直连专线（优先级最高，国内免翻墙）
  'https://music-api.gdstudio.xyz/api.php', // 2. Cloudflare 云端代抓主通道
  'https://music.gdstudio.xyz/api.php',     // 3. 官方备用通道
];

export async function onRequest(context: { request: Request }): Promise<Response> {
  const { request } = context;
  const originalUrl = new URL(request.url);
  const searchParams = new URLSearchParams(originalUrl.search);

  // 【强制修正】：如果误选了海外被墙源，自动转为国内可直连的网易云
  const currentSource = searchParams.get('source');
  if (currentSource === 'joox' || currentSource === 'spotify' || currentSource === 'tidal') {
    searchParams.set('source', 'netease');
  }

  // 依次轮询每一个节点，成功即止
  for (let i = 0; i < API_ENDPOINTS.length; i++) {
    const endpoint = API_ENDPOINTS[i];
    try {
      const targetUrl = new URL(endpoint);
      targetUrl.search = searchParams.toString();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5秒超时自动切换

      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://music.gdstudio.org/',
          'Accept': 'application/json, text/plain, */*'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

        return new Response(response.body, {
          status: response.status,
          headers: responseHeaders
        });
      }
    } catch (err) {
      // 当前节点超时或网络异常，自动切下一个
      continue;
    }
  }

  return new Response(JSON.stringify({ code: 500, error: '所有国内音乐接口暂时无响应，请稍后再试' }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
