// 위클리 글쓰기에서 노션 사진 가져오기: 노션이 복사해 준 사진 주소는 브라우저에서 바로 못 받아(CORS) 여기서 대신 받아 준다.
// 운용팀 계정(amt@caurfs.kr)으로 로그인한 사람만, 노션·S3 사진 주소만, 이미지 15MB까지.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const WRITERS = ['amt@caurfs.kr'];
const HOST = /(^|\.)(notion\.so|notion\.site|notionusercontent\.com|amazonaws\.com)$/;
const MAX = 15 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method' });

  const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
  const { data: u } = await asUser.auth.getUser();
  if (!u?.user || !WRITERS.includes(String(u.user.email || '').toLowerCase())) return json(403, { error: 'writer' });

  let src = '';
  try { src = String((await req.json()).url || ''); } catch { return json(400, { error: 'body' }); }
  // 노션의 /image/<원래 주소> 꼴은 안쪽 원래 주소를 꺼낸다
  const inner = /^https:\/\/(www\.)?notion\.so\/image\/([^?]+)/.exec(src);
  if (inner) { try { src = decodeURIComponent(inner[2]); } catch { /* 그대로 */ } }
  let url: URL;
  try { url = new URL(src); } catch { return json(400, { error: 'url' }); }
  if (url.protocol !== 'https:' || !HOST.test(url.hostname)) return json(400, { error: 'host' });

  const r = await fetch(url, { redirect: 'follow' }).catch(() => null);
  if (!r || !r.ok) return json(502, { error: 'fetch', status: r ? r.status : 0 });
  const type = r.headers.get('content-type') || '';
  if (!/^image\//.test(type)) return json(415, { error: 'type' });
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf.length > MAX) return json(413, { error: 'size' });
  return new Response(buf, { status: 200, headers: { ...CORS, 'Content-Type': type, 'Cache-Control': 'no-store' } });
});
