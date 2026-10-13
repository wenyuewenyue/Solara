export async function onRequest(context) {
  const { request } = context;
  const originalUrl = new URL(request.url);

  // 目标 API 地址
  const rawApiUrl = `https://music-api.gdstudio.xyz/api.php${originalUrl.search}`;

  // 穿透通道池：第一条直接连，第二、三条走非CF中转隧道（彻底绕过上游对Cloudflare的屏蔽）
  const fetchTargets = [
    rawApiUrl,
    `https://corsproxy.io/?${encodeURIComponent(rawApiUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(rawApiUrl)}`
  ];

  for (let i = 0; i < fetchTargets.length; i++) {
    const target = fetchTargets[i];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6秒超时

      const response = await fetch(target, {
        method: request.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 只要拿到了有效数据
      if (response.ok) {
        const text = await response.text();
        // 验证返回的是否为合法的歌曲数据或非空结果
        if (text && text.trim().startsWith('[') || text.trim().startsWith('{')) {
          return new Response(text, {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Cache-Control': 'public, max-age=1800'
            }
          });
        }
      }
    } catch (e) {
      // 当前通道被阻断，自动切下一个中转通道
      continue;
    }
  }

  return new Response(JSON.stringify({ code: 500, error: '所有代理通道均无响应' }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
