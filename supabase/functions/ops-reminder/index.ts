// 결제·만료 알림: GitHub Actions(.github/workflows/ops-reminder.yml)가 매주 월요일 아침에 부른다.
// 운영 대시보드 '유지비 · 계정' 표(ops_state의 costs)에서 다음 결제일·만료일(next)이 다가오거나 지난 항목을 골라
// 대시보드 '알림 메일'에 적은 주소(settings.notify_email)로 보낸다. 고를 것이 없으면 보내지 않는다.
// - 매월 항목: 14일 안, 매년·한 번 항목(도메인·크레딧 만료 등): 45일 안
// - 매월·매년 항목의 날짜가 지났으면 같은 날짜로 다음 달·내년을 본다 (표를 매달 고치지 않아도 된다). '한 번' 항목만 지났다고 알린다
// - 알림 메일 설정에서 '결제·만료 알림'을 끄면(settings.notify.due === false) 보내지 않는다
// 부르는 쪽 확인: 헤더 x-cron-secret = Secret OPS_CRON_SECRET (GitHub Secret과 같은 값). 로그인은 필요 없다.
// 필요한 Secrets: OPS_CRON_SECRET, RESEND_API_KEY (member-admin과 같은 것), 선택 MAIL_FROM·NOTIFY_EMAIL
// 배포: supabase functions deploy ops-reminder (main에 올리면 deploy-functions.yml이 한다)
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function same(a: string, b: string) {   // 비밀값 비교 (내용에 따라 걸리는 시간이 달라지지 않게)
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method' });
  const secret = Deno.env.get('OPS_CRON_SECRET') || '';
  if (secret.length < 16 || !same(req.headers.get('x-cron-secret') || '', secret)) return json(403, { error: 'secret' });
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return json(200, { ok: true, sent: false, reason: 'no_resend' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: rows } = await admin.from('ops_state').select('key, value').in('key', ['costs', 'settings']);
  // deno-lint-ignore no-explicit-any
  const by: Record<string, any> = {};
  for (const r of rows || []) by[r.key] = r.value || {};
  const s = by.settings || {};
  const to = String(s.notify_email || Deno.env.get('NOTIFY_EMAIL') || '').trim();
  if (!to) return json(200, { ok: true, sent: false, reason: 'no_email' });
  if (s.notify && s.notify.due === false) return json(200, { ok: true, sent: false, reason: 'off' });

  // 한국 날짜 기준 오늘
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const days = (d: string) => Math.round((Date.parse(d) - Date.parse(today)) / 86400e3);
  // deno-lint-ignore no-explicit-any
  const costs: any[] = Array.isArray(by.costs?.rows) ? by.costs.rows : [];
  // deno-lint-ignore no-explicit-any
  const money = (c: any) => c.auto ? '사용량만큼' : c.cur === 'USD' ? `$${+c.amount || 0}` : `${(+c.amount || 0).toLocaleString('ko-KR')}원`;
  const soon: string[] = [], past: string[] = [];
  for (const c of costs) {
    if (!c || typeof c.next !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.next)) continue;
    let next = c.next;
    const step = c.cycle === 'month' ? 1 : c.cycle === 'year' ? 12 : 0;
    for (let k = 1; step && days(next) < 0 && k < 600; k++) {   // 같은 날짜로 한 달·한 해씩 (31일 → 그 달 말일)
      const [y, m, d] = c.next.split('-').map(Number), t = new Date(Date.UTC(y, m - 1 + step * k, 1));
      const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
      next = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), Math.min(d, last))).toISOString().slice(0, 10);
    }
    const n = days(next), win = c.cycle === 'month' ? 14 : 45;
    const line = `- ${c.name} · ${next} · ${money(c)}${c.note ? ` · ${c.note}` : ''}`;
    if (n < 0) past.push(`${line} (${-n}일 지남)`);
    else if (n <= win) soon.push(`${line} (${n === 0 ? '오늘' : n + '일 남음'})`);
  }
  if (!costs.length) past.push('- 유지비 표가 아직 저장되지 않았어요. 운영 대시보드 → 유지비 · 계정에서 한 번 저장해 주세요.');
  if (!soon.length && !past.length) return json(200, { ok: true, sent: false, reason: 'nothing' });

  const text = [
    soon.length ? `다가오는 결제·만료\n${soon.join('\n')}` : '',
    past.length ? `날짜가 지난 항목 (끝났으면 대시보드 표에서 지우거나 날짜를 고쳐 주세요)\n${past.join('\n')}` : '',
    '운영 대시보드: caurfs.kr → AGORA 로그인 → 위쪽 바 ‘운영’ → 유지비 · 계정',
    '이 알림은 매주 월요일에 와요. 끄려면 대시보드 → 알림 메일 → 결제·만료 알림.',
  ].filter(Boolean).join('\n\n');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: Deno.env.get('MAIL_FROM') || 'R.F.S. 알림 <onboarding@resend.dev>', to: [to], subject: `[RFS] 결제·만료 알림 ${soon.length + past.length}건`, text }),
  });
  return json(r.ok ? 200 : 502, { ok: r.ok, sent: r.ok, soon: soon.length, past: past.length });
});
