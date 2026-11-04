// R.F.S. 홈페이지 앱 로직 (index.html의 <script type="text/x-dc" data-dc-script>에 들어가던 내용).
// 홈 HTML을 가볍게 하려고 따로 뺐다. 페이지가 읽히는 동안 이 파일이 원래 자리(data-dc-script)에 원문을 다시 넣고,
// dc 런타임(support.js)은 예전처럼 그 원문을 읽어 실행한다. 아래 함수는 호출하지 않고 원문을 꺼내는 데만 쓴다.
// 고친 뒤에는 node tools/build-site.js 로 index.html의 ?v= 를 새로 매긴다 (/assets/는 브라우저에 하루 남는다).
(function () {
  // Ctrl/⌘/Shift+클릭은 앱이 화면만 바꾸지 않고 브라우저가 링크 주소(/research/<id>/ 등)를 새 탭·창으로 열게 둔다
  document.addEventListener('click', function (e) {
    var a = (e.ctrlKey || e.metaKey || e.shiftKey) && e.target.closest && e.target.closest('a[href^="/"]');
    if (a) e.stopPropagation();
  }, true);
  var el = document.querySelector('script[data-dc-script]');
  var src = function () {
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
// ── 리크루팅 설정: 매 학기 이 블록과 Tweaks(모집 상태·기수·학기·마감·지원 링크)만 바꾸면 됩니다 ──
const RECRUIT = {
  eligibility: '1년 이상 활동 가능한 중앙인',
  schedule: [
    { step:'설명회',   date:'7.27 (월)',   note:'18:30 · 310관 502호' },
    { step:'서류 접수', date:'7.13 – 7.31', note:'7월 31일 (금) 23:59 마감', key:true },
    { step:'서류 발표', date:'8.2 (일)',    note:'개별 통보' },
    { step:'면접',     date:'8.8 (토)',    note:'대면 면접' },
    { step:'최종 발표', date:'8.9 (일)',    note:'정오' }]
};
// 주소(해시·정적 경로) → 화면. 첫 화면도 이걸로 정해서, 리포트 주소로 들어왔을 때 홈이 잠깐 보였다가 넘어가지 않게 한다
function routeFromLocation() {
  const pm = location.pathname.match(/^\/research\/([^/]+)\/?$/);
  const pp = { '/research/': 'research', '/about/': 'about', '/recruiting/': 'recruit', '/fund/': 'fund', '/people/': 'people' }[location.pathname.replace(/\/?$/, '/')];
  const h = (location.hash || (pm ? '#research/' + pm[1] : pp ? '#' + pp : '#home')).slice(1);
  if (h.startsWith('research/')) return { page: 'report', reportId: h.split('/')[1] };
  if (h.startsWith('intranet')) return { page: 'intranet', intraTab: h.split('/')[1] || 'dashboard' };
  if (h === 'fund/strategy') return { page: 'strategy' };
  if (['home','research','about','people','activity','recruit','rfm','fund'].includes(h)) return { page: h };
  return { page: 'home' };
}
// 리포트 데이터(page1·glossary·full) 판. /assets/는 하루 동안 브라우저에 남으므로, 파일을 바꾸면 이 값을 올려 새로 받게 한다
const DATA_VER = '20261104b';
// 전문을 웹으로 읽을 수 있는 리포트 (assets/reports/full/<id>.json)
// 정규 세미나 산업 리포트 (rfs-cafe-data 원본 PDF, 21-1~25-2). 리서치 '산업 리포트' 칸에서 PDF로 받는다. 상세 화면은 없다
const INDUSTRY = [
  { id:'4195', sem:'21-2', date:'2021.11.11', name:'반도체 후공정 산업', team:'1', sector:'IT', pages:45, pdf:'assets/reports/industry/21-2_4195.pdf' },
  { id:'4197', sem:'21-2', date:'2021.11.11', name:'AI반도체 산업', team:'2', sector:'IT', pages:34, pdf:'assets/reports/industry/21-2_4197.pdf' },
  { id:'4278', sem:'22-1', date:'2022.05.10', name:'비메모리 반도체 산업', team:'6', sector:'IT', pages:29, pdf:'assets/reports/industry/22-1_4278.pdf' },
  { id:'4427', sem:'22-2', date:'2022.11.08', name:'전기전자 및 IT부품장비 산업', team:'2', sector:'IT', pages:33, pdf:'assets/reports/industry/22-2_4427.pdf' },
  { id:'4544', sem:'23-1', date:'2023.05.09', name:'반도체·반도체장비', team:'3', sector:'IT', pages:31, pdf:'assets/reports/industry/23-1_4544.pdf' },
  { id:'4548', sem:'23-1', date:'2023.05.09', name:'AI반도체 산업', team:'2', sector:'IT', pages:30, pdf:'assets/reports/industry/23-1_4548.pdf' },
  { id:'4550', sem:'23-1', date:'2023.05.10', name:'클라우드 산업', team:'6', sector:'IT', pages:29, pdf:'assets/reports/industry/23-1_4550.pdf' },
  { id:'4665', sem:'23-2', date:'2023.11.07', name:'디스플레이 및 소재장비', team:'4', sector:'IT', pages:34, pdf:'assets/reports/industry/23-2_4665.pdf' },
  { id:'4666', sem:'23-2', date:'2023.11.07', name:'반도체 산업', team:'5', sector:'IT', pages:32, pdf:'assets/reports/industry/23-2_4666.pdf' },
  { id:'4667', sem:'23-2', date:'2023.11.07', name:'사이버보안', team:'1', sector:'IT', pages:30, pdf:'assets/reports/industry/23-2_4667.pdf' },
  { id:'4894', sem:'24-2', date:'2024.11.10', name:'AI소프트웨어-클라우드 산업', team:'5', sector:'IT', pages:22, pdf:'assets/reports/industry/24-2_4894.pdf' },
  { id:'4895', sem:'24-2', date:'2024.11.10', name:'AI반도체', team:'3', sector:'IT', pages:31, pdf:'assets/reports/industry/24-2_4895.pdf' },
  { id:'4991', sem:'25-1', date:'2025.05.13', name:'통신장비', team:'3', sector:'IT', pages:25, pdf:'assets/reports/industry/25-1_4991.pdf' },
  { id:'5082', sem:'25-2', date:'2025.11.09', name:'AI 전력 인프라', team:'6', sector:'IT', pages:20, pdf:'assets/reports/industry/25-2_5082.pdf' },
  { id:'5084', sem:'25-2', date:'2025.11.09', name:'메모리반도체', team:'5', sector:'IT', pages:26, pdf:'assets/reports/industry/25-2_5084.pdf' },
  { id:'5086', sem:'25-2', date:'2025.11.09', name:'휴머노이드', team:'1', sector:'IT', pages:25, pdf:'assets/reports/industry/25-2_5086.pdf' },
  { id:'4193', sem:'21-2', date:'2021.11.11', name:'바이오 산업', team:'4', sector:'건강관리', pages:38, pdf:'assets/reports/industry/21-2_4193.pdf' },
  { id:'4275', sem:'22-1', date:'2022.05.10', name:'미용의료 산업', team:'3', sector:'건강관리', pages:33, pdf:'assets/reports/industry/22-1_4275.pdf' },
  { id:'4546', sem:'23-1', date:'2023.05.09', name:'제약·바이오', team:'4', sector:'건강관리', pages:32, pdf:'assets/reports/industry/23-1_4546.pdf' },
  { id:'4778', sem:'24-1', date:'2024.05.08', name:'제약·바이오', team:'3', sector:'건강관리', pages:30, pdf:'assets/reports/industry/24-1_4778.pdf' },
  { id:'4897', sem:'24-2', date:'2024.11.10', name:'수술로봇', team:'2', sector:'건강관리', pages:25, pdf:'assets/reports/industry/24-2_4897.pdf' },
  { id:'5081', sem:'25-2', date:'2025.11.09', name:'글로벌 헬스케어', team:'4', sector:'건강관리', pages:25, pdf:'assets/reports/industry/25-2_5081.pdf' },
  { id:'4276', sem:'22-1', date:'2022.05.10', name:'화장품 산업', team:'4', sector:'경기관련 소비재', pages:26, pdf:'assets/reports/industry/22-1_4276.pdf' },
  { id:'4423', sem:'22-2', date:'2022.11.08', name:'자동차 모빌리티', team:'3', sector:'경기관련 소비재', pages:29, pdf:'assets/reports/industry/22-2_4423.pdf' },
  { id:'4668', sem:'23-2', date:'2023.11.07', name:'화장품 산업', team:'2', sector:'경기관련 소비재', pages:30, pdf:'assets/reports/industry/23-2_4668.pdf' },
  { id:'4781', sem:'24-1', date:'2024.05.08', name:'자동차', team:'6', sector:'경기관련 소비재', pages:23, pdf:'assets/reports/industry/24-1_4781.pdf' },
  { id:'4891', sem:'24-2', date:'2024.11.07', name:'카지노', team:'6', sector:'경기관련 소비재', pages:33, pdf:'assets/reports/industry/24-2_4891.pdf' },
  { id:'5085', sem:'25-2', date:'2025.11.09', name:'자동차', team:'3', sector:'경기관련 소비재', pages:26, pdf:'assets/reports/industry/25-2_5085.pdf' },
  { id:'4194', sem:'21-2', date:'2021.11.09', name:'은행·증권·보험', team:'5', sector:'금융', pages:40, pdf:'assets/reports/industry/21-2_4194.pdf' },
  { id:'4990', sem:'25-1', date:'2025.05.09', name:'증권', team:'5', sector:'금융', pages:28, pdf:'assets/reports/industry/25-1_4990.pdf' },
  { id:'4277', sem:'22-1', date:'2022.05.10', name:'건설 산업', team:'2', sector:'산업재', pages:30, pdf:'assets/reports/industry/22-1_4277.pdf' },
  { id:'4777', sem:'24-1', date:'2024.05.08', name:'조선', team:'2', sector:'산업재', pages:26, pdf:'assets/reports/industry/24-1_4777.pdf' },
  { id:'4780', sem:'24-1', date:'2024.05.08', name:'방위산업', team:'4', sector:'산업재', pages:27, pdf:'assets/reports/industry/24-1_4780.pdf' },
  { id:'4994', sem:'25-1', date:'2025.05.13', name:'방위산업', team:'6', sector:'산업재', pages:30, pdf:'assets/reports/industry/25-1_4994.pdf' },
  { id:'4995', sem:'25-1', date:'2025.05.13', name:'건설', team:'4', sector:'산업재', pages:29, pdf:'assets/reports/industry/25-1_4995.pdf' },
  { id:'5080', sem:'25-2', date:'2025.11.08', name:'우주', team:'2', sector:'산업재', pages:23, pdf:'assets/reports/industry/25-2_5080.pdf' },
  { id:'4132', sem:'21-1', date:'2021.05.27', name:'철강 산업', team:'1', sector:'소재', pages:12, pdf:'assets/reports/industry/21-1_4132.pdf' },
  { id:'4664', sem:'23-2', date:'2023.11.07', name:'전장부품', team:'6', sector:'소재', pages:31, pdf:'assets/reports/industry/23-2_4664.pdf' },
  { id:'4192', sem:'21-2', date:'2021.11.09', name:'원자력 산업', team:'3', sector:'에너지 유틸리티', pages:44, pdf:'assets/reports/industry/21-2_4192.pdf' },
  { id:'4280', sem:'22-1', date:'2022.05.10', name:'2차전지 및 소재 산업', team:'1', sector:'에너지 유틸리티', pages:39, pdf:'assets/reports/industry/22-1_4280.pdf' },
  { id:'4425', sem:'22-2', date:'2022.11.08', name:'이차전지 산업', team:'4', sector:'에너지 유틸리티', pages:38, pdf:'assets/reports/industry/22-2_4425.pdf' },
  { id:'4428', sem:'22-2', date:'2022.11.08', name:'2차전지 분리막 산업', team:'6', sector:'에너지 유틸리티', pages:18, pdf:'assets/reports/industry/22-2_4428.pdf' },
  { id:'4545', sem:'23-1', date:'2023.05.09', name:'폐배터리 산업', team:'1', sector:'에너지 유틸리티', pages:23, pdf:'assets/reports/industry/23-1_4545.pdf' },
  { id:'4547', sem:'23-1', date:'2023.05.10', name:'이차전지 산업', team:'5', sector:'에너지 유틸리티', pages:32, pdf:'assets/reports/industry/23-1_4547.pdf' },
  { id:'4775', sem:'24-1', date:'2024.05.08', name:'에너지', team:'5', sector:'에너지 유틸리티', pages:26, pdf:'assets/reports/industry/24-1_4775.pdf' },
  { id:'4776', sem:'24-1', date:'2024.05.08', name:'전력기기', team:'1', sector:'에너지 유틸리티', pages:26, pdf:'assets/reports/industry/24-1_4776.pdf' },
  { id:'4896', sem:'24-2', date:'2024.11.10', name:'원자력', team:'1', sector:'에너지 유틸리티', pages:25, pdf:'assets/reports/industry/24-2_4896.pdf' },
  { id:'4898', sem:'24-2', date:'2024.11.10', name:'전력기기', team:'4', sector:'에너지 유틸리티', pages:22, pdf:'assets/reports/industry/24-2_4898.pdf' },
  { id:'4992', sem:'25-1', date:'2025.05.13', name:'LNG', team:'2', sector:'에너지 유틸리티', pages:27, pdf:'assets/reports/industry/25-1_4992.pdf' },
  { id:'4130', sem:'21-1', date:'2021.05.26', name:'암호화폐 분석', team:'4', sector:'기타', pages:39, pdf:'assets/reports/industry/21-1_4130.pdf' },
  { id:'4424', sem:'22-2', date:'2022.11.08', name:'플랫폼', team:'5', sector:'기타', pages:26, pdf:'assets/reports/industry/22-2_4424.pdf' },
  { id:'4133', sem:'21-1', date:'2021.05.26', name:'메타버스 산업', team:'2', sector:'커뮤니케이션', pages:47, pdf:'assets/reports/industry/21-1_4133.pdf' },
  { id:'4196', sem:'21-2', date:'2021.11.09', name:'엔터 산업', team:'6', sector:'커뮤니케이션', pages:40, pdf:'assets/reports/industry/21-2_4196.pdf' },
  { id:'4279', sem:'22-1', date:'2022.05.10', name:'미디어 콘텐츠 산업', team:'5', sector:'커뮤니케이션', pages:32, pdf:'assets/reports/industry/22-1_4279.pdf' },
  { id:'4993', sem:'25-1', date:'2025.05.13', name:'음악 엔터테인먼트', team:'1', sector:'커뮤니케이션', pages:29, pdf:'assets/reports/industry/25-1_4993.pdf' }
];
// 웹에서 전문으로 읽는 산업 리포트 (assets/reports/full/ind-<id>.json)
const IND_FULL = ['ind-4192', 'ind-4193', 'ind-4194', 'ind-4195', 'ind-4196', 'ind-4197', 'ind-4275', 'ind-4276', 'ind-4277', 'ind-4278', 'ind-4279', 'ind-4280', 'ind-4423', 'ind-4424', 'ind-4425', 'ind-4427', 'ind-4428', 'ind-4544', 'ind-4545', 'ind-4546', 'ind-4547', 'ind-4548', 'ind-4550', 'ind-4664', 'ind-4665', 'ind-4666', 'ind-4667', 'ind-4668', 'ind-4775', 'ind-4776', 'ind-4777', 'ind-4778', 'ind-4780', 'ind-4781', 'ind-4891', 'ind-4894', 'ind-4895', 'ind-4896', 'ind-4897', 'ind-4898', 'ind-4990', 'ind-4991', 'ind-4992', 'ind-4993', 'ind-4994', 'ind-4995', 'ind-5080', 'ind-5081', 'ind-5082', 'ind-5084', 'ind-5085', 'ind-5086'];
const FULL_REPORTS = ['anet', 'aniplus', 'apple', 'apr', 'bgf', 'bh', 'binex', 'celltrion', 'classys', 'crowdstrike', 'cswind', 'daewoong', 'douzone', 'duolingo', 'ecopro', 'ecopro21', 'fadu', 'flitto', 'gev', 'greenplus', 'gtf', 'hankooktire', 'hanmi', 'hanwhaaero', 'hanwhaocean', 'hdengine', 'hdmarine', 'hivision', 'hjncs', 'hmm', 'humedix', 'hybe', 'hyundai', 'inbody', 'intel', 'intellian', 'isrg', 'jeju', 'jinsung', 'kcc', 'kia', 'kolmar', 'komico', 'koreanair', 'koreanair26', 'krafton', 'kyungdong', 'lges', 'lguplus', 'livsmed', 'lnf', 'lottechem', 'lottetour', 'lselectric', 'lutronic', 'naver', 'nepesark', 'oci', 'orion', 'osstem', 'parksystems', 'pearlabyss', 'pharmaresearch', 'pisms', 'pnt', 'poscochem', 'rfhic', 'samsungbio', 'samsungsdi', 'samyang', 'sanil', 'sbl21', 'seers', 'semco', 'sena', 'silicon2', 'skgas', 'sm', 'sm21', 'soil', 'stpharm', 'taekwang', 'techwing', 'tesla', 'tesna', 'tnl', 'tovis', 'trmd', 'ttwo', 'vt'];
const REPORTS = [
  { id:'sanil', name:'산일전기', ticker:'062040', sector:'전력기기', type:'Company Analysis', op:'BUY', tp:'367,000원', buy:'', cur:'205,500원', upside:'+78.6%', upNum:78.6, tpNum:367000, date:'2026.09.29', team:'Research Team 4', region:'Korea',
    headline:'지금이 가장 ‘싼’ 일전기',
    summary:'2Q26 매출액 1,642억 원(YoY +28.0%), 영업이익 620억 원(YoY +34.3%)을 기록했다. 이는 노동집약적 구조하 물량 확대에 따른 영업 레버리지와 특수변압기 비중 확대에 기인한다. 수주잔고 5,567억 원과 ’28E CAPA 140% 증설을 기반으로 외형 성장을 지속할 것으로 전망한다.',
    heroSummary:'블룸에너지 벤더 편입과 미국 전력망 교체 수요. ’27E 특수변압기 매출액 YoY +34.6%를 전망한다.',
    points:[
      { title:'투자포인트 1. 앗! 데이터센터 풀숲에서 야생의 산일전기가 나타났다!', body:'’27E 특수변압기 매출액 7,118억 원(YoY +34.6%)을 전망한다. 이는 견조한 신재생向 수요에 블룸에너지向 후속 수주가 더해짐에 기인한다. 동사는 ’26년 정식 벤더 편입으로 반복 수주 기반을 확보했으며, 블룸에너지의 데이터센터向 발전용량이 ’27E 최대 5GW로 확대됨에 따라 ’27E 블룸에너지向 매출액 1,345억 원(YoY +735%)을 달성할 전망이다.' },
      { title:'투자포인트 2. 더 TAM나는 전력망 시장', body:'’27E 전력망 매출액 2,173억 원(YoY +61.1%)을 전망한다. 이는 미국 배전변압기의 노후화 교체 수요와 IIJA·FERC Order 2023 등 정책 수혜에 따른 FTM 투자 본격화에 기인한다. 동사는 3~6개월의 짧은 납기와 유연한 CAPA를 기반으로 수요를 온전히 흡수할 전망이다.' }
    ],
    valuation:'Peer P/E Valuation을 채택했다. 목표주가 367,000원, 상승여력 78.6%, 투자의견 BUY를 제시한다.',
    members:'Research Team 4',
    pdf:'assets/reports/26-2_sanil.pdf', pdfMeta:'PDF · 33 pages', cover:'assets/covers/26-2_sanil-top169.webp', heroCover:'assets/covers/26-2_sanil-top169.webp', heroBg:'assets/hero/sanil.webp', heroScrim:0.74, credit:'', creditHref:'' },
  { id:'koreanair26', name:'대한항공', ticker:'003490', sector:'항공운송', type:'Company Analysis', op:'BUY', tp:'45,300원', buy:'', cur:'31,400원', upside:'+44.3%', upNum:44.3, tpNum:45300, date:'2026.09.29', team:'Research Team 1', region:'Korea',
    headline:'高유가에도 高공비행',
    summary:'3Q26E 매출액 7조 153억 원(QoQ -3.0%), 영업이익 1,309억 원(QoQ +1.9%)을 기록하며 고유가 속에서도 이익 반등을 보일 전망이다. 동사는 유류할증료를 통한 가격 전가와 반도체 중심의 고부가 화물 수요로 비용 상승을 매출 확대로 상쇄하고 있다. 이에 더해 인천공항 환승 수요 확대로 수익성 개선세는 지속될 전망이다.',
    heroSummary:'유류할증료 전가와 인천 환승 허브 수혜. ’26E 화물 매출액 YoY +13.4%를 전망한다.',
    points:[
      { title:'투자포인트 1. 짐은 나한테 다 맡겨', body:'’26E 동사의 화물 매출 6조 855억 원(YoY +13.4%)을 전망한다. 동사는 높은 화물 매출 비중을 바탕으로 유가 상승분을 유류할증료로 전가한다. 반도체 화물 수요가 미주 노선 운송을 49.6% 점유한 동사에 집중되며 운임 강세를 이끌 가능성이 높다. 신규 화물기 인도가 지연되는 가운데, 아시아나 벨리 편입은 동사의 화물 운송 능력을 빠르게 늘려줄 것으로 판단한다.' },
      { title:'투자포인트 2. 환승객도 나한테 다 맡겨', body:'’26E 동사의 여객 매출 16조 4,666억 원(YoY +15%)을 전망한다. 동사는 중동 Hub 마비로 대체 환승 허브로 부상한 인천공항의 수혜 기업이다. 통합 이후 중복 운항편 조정으로 환승 연결편을 늘리고, 단거리 광동체를 미주 노선에 재배치해 환승 수요를 추가 흡수할 전망이다. 여기에 델타 JV 편입과 양사 운임 수렴까지 더해지며, 단순 합산 이상의 여객 매출을 확보할 것으로 판단한다.' }
    ],
    valuation:'Peer EV/EBITDA Valuation을 채택했다. ’27E EBITDA 54,121억 원에 Target EV/EBITDA 5.0배를 적용해 목표주가 45,300원, 상승여력 44.3%, 투자의견 BUY를 제시한다.',
    members:'Research Team 1',
    pdf:'assets/reports/26-2_korean_air.pdf', pdfMeta:'PDF · 31 pages', cover:'assets/covers/26-2_korean_air-top169.webp', heroCover:'assets/covers/26-2_korean_air-top169.webp', heroBg:'assets/hero/koreanair26.webp', heroPosM:'72% 50%', heroScrim:0.66, credit:'', creditHref:'' },
  { id:'inbody', name:'인바디', ticker:'041830', sector:'헬스케어', type:'Company Analysis', op:'BUY', tp:'100,800원', buy:'', cur:'53,800원', upside:'+87.4%', upNum:87.4, tpNum:100800, date:'2026.09.29', team:'Research Team 3', region:'Korea',
    headline:'(인)바디 췍~!',
    summary:'2H26 매출액 1,493억 원(YoY +22.2%), 영업이익 287억 원(YoY +48.4%)을 전망한다. 해외 매출이 1,309억 원(YoY +27.1%)으로 성장하며 내수 부진을 상쇄할 것이다. 또한 운영 효율화 및 ’25년 선투자에 따른 효과로 OPM은 19.2%(YoY +3.4%p)로 개선될 전망이다.',
    heroSummary:'미국 GLP-1 연계 수요와 체성분 데이터 수익화. ’27년 해외 매출 YoY +17.3%를 전망한다.',
    points:[
      { title:'투자포인트 1. 에브리바디 인바디', body:'동사의 ’27년 해외向 매출 2,987억 원(YoY +17.3%)을 전망한다. 미국의 GLP-1 연계 수요 확대와 중국의 병원·DTP 약국 신규채널 침투를 기반으로 주요 해외 시장의 성장세가 강화될 전망이다. 또한 멕시코·유럽·아시아의 현지 영업망 및 직판 커버리지 확대를 통해 신규 수요처 확보가 가속화되며, 지역 다변화에 기반한 해외 외형 성장이 지속될 것으로 판단한다.' },
      { title:'투자포인트 2. 데이터가 쏘아올린 리레이팅', body:'동사의 ’27년 소프트웨어 매출 129억 원(YoY +18.6%)을 전망한다. LookinBody 도입 확대와 구독형 서비스 성장으로 소프트웨어 수익성이 개선될 전망이다. 또한 LB Trainer, 네이버와의 협력, InBodyLIKE를 통해 체성분 데이터 수익화가 구체화되며, ’26년 11월 PoC 종료를 전후로 멀티플 리레이팅을 기대한다.' }
    ],
    valuation:'Historical P/E Valuation을 채택했다. Target P/E 21.92배를 적용해 목표주가 100,800원, 상승여력 87.4%, 투자의견 BUY를 제시한다.',
    members:'Research Team 3',
    pdf:'assets/reports/26-2_inbody.pdf', pdfMeta:'PDF · 34 pages', cover:'assets/covers/26-2_inbody-top169.webp', heroCover:'assets/covers/26-2_inbody-top169.webp', heroBg:'assets/hero/inbody.webp', heroPosM:'82% 50%', heroScrim:0.6, credit:'', creditHref:'' },
  { id:'nepesark', name:'네패스아크', ticker:'330860', sector:'반도체', type:'Company Analysis', op:'BUY', tp:'40,000원', buy:'', cur:'31,550원', upside:'+26.8%', upNum:26.8, tpNum:40000, date:'2026.09.29', team:'Research Team 2', region:'Korea',
    headline:'삼성 파운드리 회복의 최대 수혜주',
    summary:'’27E 매출액 2,079억 원(YoY +49.1%), 영업이익 509억 원(YoY +64.7%)을 전망한다. ’27년은 HBM4 베이스 다이와 실리콘 커패시터 등 신규 테스트 품목의 매출 기여가 본격화되는 동시에, 갤럭시 S27 시리즈 내 엑시노스 채택 확대가 기존 AP·PMIC 테스트 물량 증가로 이어지는 시점이다.',
    heroSummary:'HBM4 베이스 다이와 엑시노스 테스트 확대. ’27E 매출액 YoY +49.1%를 전망한다.',
    points:[
      { title:'투자포인트 1. 신규 테스트 품목 확대로 성장축 다변화', body:'HBM4 베이스 다이·실리콘 커패시터의 합산 테스트 매출은 ’27E 485억 원, ’28E 613억 원을 전망한다. ’26년 상반기 1,042억 원 규모의 신규 시설투자를 기반으로 기존 AP·PMIC 중심에서 HBM4·실리콘 커패시터로 테스트 품목이 확대되며 신규 성장축을 확보할 것으로 판단한다.' },
      { title:'투자포인트 2. 엑시노스가 키우는 테스트 판', body:'동사의 AP 테스트 매출은 ’26E 598억 원, ’27E 803억 원, ’28E 866억 원을 전망한다. 이는 엑시노스 2700의 S27 울트라 신규 진입에 따른 AP 테스트 물량 증가와 플래그십 믹스 상승에 따른 칩당 테스트 ASP 확대에 기인한다. 여기에 AP 연동 PMIC 수요 증가까지 더해지며 동사의 외형 성장을 견인할 것으로 판단한다.' }
    ],
    valuation:'Peer P/E Valuation을 채택했다. Target P/E 14.3배를 적용해 목표주가 40,000원, 상승여력 26.8%, 투자의견 BUY를 제시한다.',
    members:'Research Team 2',
    pdf:'assets/reports/26-2_nepes_ark.pdf', pdfMeta:'PDF · 28 pages', cover:'assets/covers/26-2_nepes_ark-top169.webp', heroCover:'assets/covers/26-2_nepes_ark-top169.webp', heroBg:'assets/hero/nepesark.webp', heroScrim:0.72, credit:'', creditHref:'' },
  { id:'ttwo', name:'Take-Two Interactive', ticker:'TTWO', sector:'게임', type:'Company Analysis', op:'BUY', tp:'$477.62', buy:'', cur:'$226.98', upside:'+110.4%', upNum:110.4, tpNum:477.62, date:'2026.06.02', team:'Research Team 1', region:'Global',
    headline:'Take 2 Portfolio!',
    summary:'AI 사이클과 낮은 상관성을 가진 성장 자산 중 가장 주목해야 할 산업으로 게임을 제시한다. 게임 산업은 AI 투자 사이클과 기댓값의 변수가 다르고, 경기 둔화 국면에서도 소비 방어력이 존재하며, 콘솔 교체주기와 대형 IP 출시를 바탕으로 자체 성장 동력을 보유한다.',
    heroSummary:'13년의 기다림, GTA VI. FY27 매출 35억 달러로 컨센서스 상회를 전망한다.',
    points:[
      { title:'투자포인트 1. 13년의 기다림, GTA VI', body:'FY27 3Q 출시 예정인 GTA VI 판매량 3,810만 장, 판매가 $79.99를 제시하며 FY27 매출 35억 달러를 전망한다. 판매량 2,900만 장·$69.99의 컨센서스는 GTA V 어태치율을 그대로 적용한 과소추정으로, AAA 대작의 흥행 공식과 인플레이션을 반영한 가격 전가를 고려하면 실적은 시장 기대치를 상회할 것으로 판단한다.' },
      { title:'투자포인트 2. 13년이면 강산도 변하고 남는다', body:'GTA VI Online이 FY27~28 누적 약 $10.25B(GTA V 대비 +388%)의 반복 결제 매출을 창출하며 차세대 매출 동력으로 자리잡을 전망이다. 전작 대비 늘어난 모수와 진입률·잔존률의 질적 상승에, 인앱 결제에 익숙한 20대가 더해지며 결제력 역시 전작을 넘어설 전망이다.' }
    ],
    valuation:'Historical Peer P/E Valuation을 채택했다. 이에 따라 목표주가 $477.62, 상승여력 110.4%, 투자의견 BUY를 제시한다.',
    members:'Research Team 1',
    pdf:'assets/reports/26-1_ttwo.pdf', pdfMeta:'PDF · 25 pages', cover:'assets/covers/26-1_ttwo-top169.webp', heroCover:'assets/covers/26-1_ttwo-top169.webp', heroBg:'assets/hero/ttwo.webp', heroScrim:0.74, credit:'', creditHref:'' },
  { id:'livsmed', name:'리브스메드', ticker:'491000', sector:'의료기기', type:'Company Analysis', op:'BUY', tp:'98,000원', buy:'', cur:'47,950원', upside:'+104%', upNum:104, tpNum:98000, date:'2026.06.02', team:'Research Team 2', region:'Korea',
    headline:'스메드의 몸단속',
    summary:'1Q26 매출액 102억 6,322만 원(YoY +5.47%), 영업손실 83억 6,687만 원을 기록했다. 아티센셜의 계절적 비수기와 해외 매출 인식의 일시적 요인으로 컨센서스를 하회했으나, 복강경 풀 스펙트럼 포트폴리오와 수술 로봇 스타크의 연내 식약처 허가 및 4분기 국내 출시가 가시화될 경우 실적 모멘텀의 강한 재가속이 예상된다.',
    heroSummary:'세계 최초 5mm 외경·360도 자유도. 27년 매출액 YoY +120.1%를 전망한다.',
    points:[
      { title:'투자포인트 1. 우리 걸 안 살 이유가..?', body:'27년 매출은 2,862억 원(YoY +120.1%)을 전망한다. 세계 최초 5mm 외경·360도 자유도를 구현한 기술력을 기반으로 아티씰·아티스테이플러·리브스캠 등 풀 포트폴리오 완성에 따른 락인 효과와 반복 매출 구조가 본격화된다. 미국 최대 GPO 헬스트러스트와의 계약으로 약 4,300개 의료기관 공급망을 확보했다.' },
      { title:'투자포인트 2. 모든 제품은 STARK로 통한다', body:'27년 스타크 매출은 317억 원(YoY +1,607%)을 전망한다. 풀 포트폴리오 전략을 통한 수술로봇 핵심 부품 내재화와 이에 기반한 낮은 본체 가격·운영비 경쟁력에 기인한다. 공동 연구개발 병원과 기존 제품 사용처를 중심으로 공급을 시작하고, 이후 중형병원과 해외 시장까지 로봇수술 시장을 확대할 것으로 판단한다.' }
    ],
    valuation:'Peer PER 방식을 채택했다. Target PER 43.1배, 목표주가 98,000원, 상승여력 104%, 투자의견 BUY를 제시한다.',
    members:'Research Team 2',
    pdf:'assets/reports/26-1_livsmed.pdf', pdfMeta:'PDF · 39 pages', cover:'assets/covers/26-1_livsmed-top169.webp', heroCover:'assets/covers/26-1_livsmed-top169.webp', heroBg:'assets/hero/livsmed.webp', heroScrim:0.76, credit:'', creditHref:'' },
  { id:'jeju', name:'제주반도체', ticker:'080220', sector:'IT', type:'Company Analysis', op:'BUY', tp:'430,000원', buy:'', cur:'101,000원', upside:'+326%', upNum:326, tpNum:430000, date:'2026.06.03', team:'Research Team 3', region:'Korea',
    headline:'귤비디아',
    summary:'1Q26 매출액 1,805억 원(QoQ +97%), 영업이익 671억 원(QoQ +87%)으로 사상 최대 실적을 달성했다. LPDDR4X 공급 부족에 따른 단가 상승과 NAND MCP 수요 확대가 동시에 반영되며, 팹리스 구조 특성상 매출 증가분이 영업이익으로 직결되는 레버리지 효과가 본격화됐다.',
    heroSummary:'레거시 DRAM 숏티지의 유일한 수혜자. 26년 매출액 YoY +352%를 전망한다.',
    points:[
      { title:'투자포인트 1. 무사 이렇게 오르쿠광?', body:'26년 매출액 1조 3,666억 원(YoY +352%)을 제시한다. 글로벌 공급사들의 레거시 디램 시장 이탈에 따른 LPDDR4·4X 숏티지가 고착화되며 단가 프리미엄이 실적으로 직결되고, 판매가 상승이 원가 상승을 압도하는 팹리스 구조상 P-C 스프레드 확대가 영업이익으로 이어질 전망이다.' },
      { title:'투자포인트 2. 황금감귤이 주렁주렁', body:'대형사 이탈이 만든 공급 공백을 흡수할 수 있는 플레이어는 동사뿐이다. 니치마켓 내 독보적 지위로 온디바이스·엣지 AI 확산과 맞물린 LPDDR4X 수요 확대의 최대 수혜를 전망하며, 단기 사이클의 일회성 수혜가 아닌 구조적 리레이팅 국면에 진입한 것으로 판단한다.' }
    ],
    valuation:'Peer P/E Valuation을 채택했다. 레거시 DRAM 공급 부족이 27년까지 지속될 것으로 전망됨에 따라 21년 쇼티지 국면 당시 Peer Group 평균 PER을 적용, Target P/E 39.98배, 목표주가 430,000원, 상승여력 326%, 투자의견 STRONG BUY를 제시한다.',
    members:'Research Team 3',
    pdf:'assets/reports/26-1_jeju_semi.pdf', pdfMeta:'PDF · 25 pages', cover:'assets/covers/26-1_jeju_semi-top169.webp', heroCover:'assets/covers/26-1_jeju_semi-top169.webp', heroBg:'assets/hero/jeju.webp', heroScrim:0.8, credit:'', creditHref:'' },
  { id:'fadu', name:'파두', ticker:'440110', sector:'IT', type:'Company Analysis', op:'BUY', tp:'166,100원', buy:'', cur:'107,100원', upside:'+55.1%', upNum:55.1, tpNum:166100, date:'2026.06.02', team:'Research Team 4', region:'Korea',
    headline:'파두...이제 그만 아파두 돼',
    summary:'1Q26 매출액 595.4억 원(YoY +209.8%), 영업이익 76.8억 원을 달성하며 흑자전환에 성공했다. PCIe Gen6 컨트롤러 테이프아웃 완료에 따른 연구개발비 집행 종료와 eSSD 컨트롤러 매출 비중 80% 확대에 기인하며, 수주잔고의 대부분이 eSSD 컨트롤러 공급계약으로 구성돼 외형 성장과 수익성 개선이 지속될 전망이다.',
    heroSummary:'PCIe Gen6 전환의 수혜. 27년 영업이익 YoY +130.4%를 전망한다.',
    points:[
      { title:'투자포인트 1. 파두 말구 답두 없다', body:'27년 SSD 컨트롤러 매출액 5,841억 원(YoY +68.9%)을 전망한다. 아키텍처 경쟁력과 선제적 Gen6 출시를 기반으로 PCIe 세대 전환 국면에서 수혜를 받을 전망이며, 샌디스크의 구글 eSSD 공급 계약에 따른 물량 확대와 Gen6 전환 국면의 키옥시아向 공급 가능성이 성장을 견인할 것이다.' },
      { title:'투자포인트 2. 밀려온다 거대한 파두가', body:'27년 영업이익 2,502억 원(YoY +130.4%)을 전망한다. 본격적인 영업 레버리지 구간에 진입했으며, 기확보된 매출 성장, 수익성 높은 eSSD 컨트롤러 비중 확대, Gen6 완료에 따른 개발비 축소 및 Gen7 개발비 분담에 기인한다.' }
    ],
    valuation:'Peer PER 기법을 채택했다. 이에 따른 목표주가 166,100원, 상승여력 55.1%, 투자의견 BUY를 제시한다.',
    members:'Research Team 4',
    pdf:'assets/reports/26-1_fadu.pdf', pdfMeta:'PDF · 23 pages', cover:'assets/covers/26-1_fadu-top169.webp', heroCover:'assets/covers/26-1_fadu-top169.webp', heroBg:'assets/hero/fadu.webp', heroScrim:0.76, credit:'', creditHref:'' },
  { id:'trmd', name:'TORM plc.', ticker:'TRMD', sector:'해운', type:'Company Analysis', op:'BUY', tp:'$46.59', buy:'$25.61', upside:'+81.9%', upNum:81.9, tpNum:46.59, date:'2026.05.12', team:'Research Team', region:'Global',
    headline:'MR.TORM, Stay Clean !',
    summary:'2026E 매출액 26.2억 달러(YoY +96%), 영업이익 11.5억 달러(YoY +224%)를 전망한다. 글로벌 정유 능력 재편과 호르무즈 해협 봉쇄에 따른 톤마일 수요 폭증, LR2의 원유선 시장 이동으로 인한 Clean 탱커 공급 압박이 운임 상승을 가속할 것이다.',
    heroSummary:'호르무즈 봉쇄발 톤마일 폭증. 2026E 매출액 YoY +96%를 전망한다.',
    points:[
      { title:'투자포인트 1. 싸고(C) 많은(Q) MR', body:'동사의 선박은 peer 대비 21%p 높은 67%의 MR 포트폴리오를 보유한다. 80%의 스크러버 장착률로 확보한 26%의 연료비 우위가 USGC 수혜 국면에서 모멘텀을 가속할 전망이다.' },
      { title:'투자포인트 2. 바다를 먼저 읽는 One TORM System', body:'자체 AI가 영업과 정비 데이터를 통합 처리해 고운임 지역에 선박을 선제 배치한다. 업타임 96.2%로 가용수익일수를 극대화하며, 2026E 14.91%의 TCE 프리미엄을 전망한다.' }
    ],
    valuation:'EV/EBITDA 방식을 채택했다. 홍해 사태 당시 초입 멀티플 4.0x를 적용해 목표주가 $46.59, 매수가 $25.61, 상승여력 81.9%를 제시한다.',
    members:'TEAM RFS',
    pdf:'assets/torm-report.pdf', pdfMeta:'PDF · 24 pages · 6.0MB', cover:'assets/torm-cover-169.webp', photoBg:'assets/torm-fleet.webp', heroCover:'assets/torm-cover-top169.webp', credit:'', creditHref:'' },
  { id:'oci', name:'OCI홀딩스', ticker:'010060', sector:'에너지', type:'Company Analysis', op:'BUY', tp:'493,000원', buy:'', cur:'332,500원', upside:'+48%', upNum:48, tpNum:493000, date:'2026.05.12', team:'Research Team 4', region:'Korea',
    headline:'‘O’nly ‘C’hance ‘I’s OCI 홀딩스',
    summary:'1Q26 매출액 8,924억 원(QoQ +10.1%)을 기록했다. 폴리실리콘 공장 정기 보수 및 일회성 비용으로 수익성이 일시 하락했으나, 보수 완료에 따른 가동률 정상화로 2분기 턴어라운드가 전망된다. 비중국 밸류체인 수직계열화와 대규모 프로젝트 매각 수익 인식을 통해 외형 성장을 지속할 것으로 전망한다.',
    heroSummary:'비중국 폴리실리콘의 유일한 대안. 26년 폴리실리콘 매출액 YoY +49.7%를 전망한다.',
    points:[
      { title:'투자포인트 1. 폴리-인 럽', body:'26년 OCI Terrasus 폴리실리콘 매출액 6,398억 원(YoY +49.7%)을 전망한다. 미국 태양광 규제에 따른 비중국 수요 증가와 중국 구조조정·Section 232 확정에 따른 ASP 상승에 기인한다. 수요처는 스페이스X의 100GW 우주 태양광 프로젝트와 함께 우주 태양광으로 다변화되고 있으며, 선제적 CAPA 증설과 원가경쟁력으로 1조 원 규모 LTA 체결을 판단한다.' },
      { title:'투자포인트 2. 아임 유어 에너지', body:'업·미드스트림부터 다운스트림까지 태양광 통합 밸류체인을 구축한 에너지 전문 기업으로 리레이팅될 전망이다. 업스트림 수직계열화로 27년 웨이퍼 매출액 637억 원(YoY +326.5%), 텍사스 점유율 1위 디벨로퍼로서 27년 OCI Energy 매출액 2,294억 원(YoY +64.9%)을 전망한다.' }
    ],
    valuation:'SOTP Valuation 방식을 채택했다. 이에 따른 목표주가 493,000원, 상승여력 48%, 투자의견 BUY를 제시한다.',
    members:'Research Team 4',
    pdf:'assets/reports/26-1_oci.pdf', pdfMeta:'PDF · 31 pages', cover:'assets/covers/26-1_oci-top169.webp', heroCover:'assets/covers/26-1_oci-top169.webp', photoBg:'assets/hero/oci.webp', heroScrim:0.62, credit:'', creditHref:'' },
  { id:'sena', name:'삼성E&A', ticker:'028050', sector:'건설', type:'Company Analysis', op:'BUY', tp:'94,000원', buy:'', cur:'54,900원', upside:'+71%', upNum:71, tpNum:94000, date:'2026.05.12', team:'Research Team 2', region:'Korea',
    headline:'재건 제 건데요?',
    summary:'1Q26 매출액 약 2조 2,674억 원(YoY +8.07%), 영업이익 1,882억 원(YoY +19.64%)을 기록했다. 화공부문의 수주 회복이 실적을 뒷받침하고, 에너지 시장 재편에 따른 뉴에너지 부문의 호실적이 이어지며 전체 매출 성장을 견인했다.',
    heroSummary:'중동 재건과 New Energy. 27년 화공부문 매출 YoY +42.7%를 전망한다.',
    points:[
      { title:'투자포인트 1. 화공은 원래 잘 했고요, 재건도 잘해요', body:'27년 화공부문 매출은 약 5.5조 원(YoY +42.7%)을 전망한다. 미-이란 갈등으로 인한 에너지 인프라 시설 피해는 바레인 Bapco Sitra, 쿠웨이트 KNPC CFP 등 재건 매출로 이어질 전망이며, 에너지 안보 중요성과 유가 상승에 따른 산유국 CAPEX 증가 흐름에 기반한 대규모 수주 역시 이어질 것으로 판단한다.' },
      { title:'투자포인트 2. NEW energy, NEW Balance', body:'26년 New Energy 부문 매출은 2조 5,420억 원(YoY +88.8%)을 전망한다. 중동 지정학적 리스크 심화로 LNG·SAF 수요 압력이 높아지는 가운데 주요국의 탈탄소 규제 강화에 따른 청정 인프라 투자 확대가 맞물리며 수주 모멘텀이 강화되고 있다.' }
    ],
    valuation:'Historical PBR을 사용했다. Target PBR 3.2배, 목표주가 94,000원, 상승여력 71%, 투자의견 BUY를 제시한다.',
    members:'Research Team 2',
    pdf:'assets/reports/26-1_samsung_ena.pdf', pdfMeta:'PDF · 33 pages', cover:'assets/covers/26-1_samsung_ena-top169.webp', heroCover:'assets/covers/26-1_samsung_ena-top169.webp', photoBg:'assets/hero/sena.webp', heroScrim:0.72, credit:'', creditHref:'' },
  { id:'taekwang', name:'태광', ticker:'023160', sector:'산업재', type:'Company Analysis', op:'BUY', tp:'81,700원', buy:'', cur:'37,350원', upside:'+119%', upNum:119, tpNum:81700, date:'2026.05.12', team:'Research Team 3', region:'Korea',
    headline:'가장 FIT한 선택지, 태광',
    summary:'25년 매출액 2,969억 원(YoY +11%), 영업이익 387억 원(YoY +13%)을 기록하며 컨센서스를 소폭 하회했다. 자회사 HYTC 부진과 수주-매출 인식 Lagging에 따른 분기 편중에도 STS 매출 비중 상승(YoY +6%)이 하락을 일부 상쇄했다.',
    heroSummary:'LNG와 중동 재건, 두 개의 큰 빛. 27년 중동向 매출 YoY +64%를 전망한다.',
    points:[
      { title:'투자포인트 1. LNG라는 큰太 시장', body:'27E 북미向 매출 1,093.3억 원(YoY +40.3%)을 전망한다. 에너지 공급병목에 따른 미국 FID 가속화로 공급자 우위 시장 내 Q 확대와 고마진 STS 믹스 개선을 통해 매출과 영업이익의 레벨업이 기대된다. 조선向 매출도 고부가 LNG선 수주가 국내 조선 3사에 집중되며 비선형적으로 성장할 전망이다.' },
      { title:'투자포인트 2. 중동 재건의 빛, 光', body:'27E 중동向 매출 2,533억 원(YoY +64%)을 전망한다. 압도적인 중동 레퍼런스를 보유한 동사로 미국·이란 전쟁발 재건 수주가 집중될 것으로 판단하며, 24년 약 20조 원에 달하는 국내 EPC사 중동 수주에 재건 수요가 더해져 장기 매출 성장 기반이 확보될 전망이다.' }
    ],
    valuation:'Historical P/E Valuation을 채택했으며 과거 슈퍼사이클 구간인 12년 평균 멀티플을 활용했다. 이에 목표주가 81,700원, 상승여력 119%, 투자의견 BUY를 제시한다.',
    members:'Research Team 3',
    pdf:'assets/reports/26-1_taekwang.pdf', pdfMeta:'PDF · 30 pages', cover:'assets/covers/26-1_taekwang-top169.webp', heroCover:'assets/covers/26-1_taekwang-top169.webp', photoBg:'assets/hero/taekwang.webp', heroScrim:0.7, credit:'', creditHref:'' },
  { id:'kcc', name:'KCC', ticker:'002380', sector:'화학', type:'Company Analysis', op:'BUY', tp:'899,400원', buy:'', cur:'517,000원', upside:'+74%', upNum:74, tpNum:899400, date:'2026.03.24', team:'Research Team 1', region:'Korea',
    headline:'King Of Chemical Cycle, KCC',
    summary:'26년 매출 7조 6,035억 원(YoY +25.56%), 영업이익 6,135억 원(YoY +43.5%)을 전망한다. 실리콘 업사이클 본격화에 따른 수급 불균형 해소와 경쟁사 이탈 물량 흡수가 동시에 작동하며 실리콘 부문의 외형과 수익성 개선이 가시화될 것이다.',
    heroSummary:'실리콘 업사이클과 이자비용 48% 감소가 겹치는 변곡점.',
    points:[
      { title:'투자포인트 1. 여유 CAPA가 남아도는, 명품으로 치장한 우리', body:'26년 실리콘 부문 매출 4조 2,059억 원(YoY +37.13%)을 전망한다. 글로벌 Commodity 68%를 점유하는 중국의 감산 합의와 Dongyue 30만 톤 셧다운, 경쟁사 구조조정에 따른 공급과잉 해소 국면에서 유럽 Dow의 Barry 폐쇄가 확정되었다. 동사는 경쟁사 대비 고부가 믹스(82%)에 따른 전가율도 높아 가격 반등 구간에서 모멘텀을 더할 전망이다.' },
      { title:'투자포인트 2. 삼위일체', body:'26년 이자비용 1,753억 원(YoY -48.4%)으로 영업이익 대비 약 41% 하락을 전망한다. 자사주 소각은 EPS 15.2% 개선과 NAV 할인 해소를 동시에 창출할 전망이며, 이는 자사주 153만 주 중 77%의 27년 9월까지 분할 소각에 따른 주식수 감소와 소각을 전제로 한 보유 상장지분 유동화에 기인한다.' }
    ],
    valuation:'SOTP Valuation 방식을 채택했다. 이에 따른 목표주가 899,400원, 상승여력 74%, 투자의견 STRONG BUY를 제시한다.',
    members:'Research Team 1',
    pdf:'assets/reports/26-1_kcc.pdf', pdfMeta:'PDF · 31 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'rfhic', name:'RFHIC', ticker:'218410', sector:'전기전자', type:'Company Analysis', op:'BUY', tp:'99,000원', buy:'', cur:'76,600원', upside:'+29%', upNum:29, tpNum:99000, date:'2026.03.24', team:'Research Team 2', region:'Korea',
    headline:'RFs가 ‘힉!’하고 놀라면? RFHIC!',
    summary:'4Q25 매출액 689억 원(QoQ +70.1%), 영업이익 116억 원(QoQ +57.4%)을 기록했다. 방산 부문에서 LIG넥스원의 수주잔고 확대에 따른 방산 시스템 부품 공급이 본격화되었고, 해외 방산 수출도 견조하게 유지되며 실적을 뒷받침했다.',
    heroSummary:'K-방산 수혜와 NXP 철수 공백. 26년 방산 매출 YoY +103.6%를 전망한다.',
    points:[
      { title:'투자포인트 1. RFHIC 방산 업~ 매출 업~!', body:'26년 방산 매출은 2,058억 원(YoY +103.60%)을 전망한다. 동사는 미국-이란 전쟁 심화로 부각되는 K-방산의 수혜 기업이다. 중동向 천궁-II 수요 증가에 따른 국내 주요 고객사와의 수주 밸류체인으로 매출 상승을 견인할 것으로 판단하며, 1Q26 방산업체 전 세계 4위 레이시온과 506억 수주를 확보해 해외 매출 증진에 따른 수익성 개선이 기대된다.' },
      { title:'투자포인트 2. 통신 빈집털이 GaN다', body:'26년 통신부문 매출은 896억 원(YoY +15.3%)을 전망한다. RF PA 시장의 핵심 공급자 NXP가 27년 1분기까지 단계적 철수를 발표함에 따라 발생하는 시장 공백은 동사의 공급사 내 점유율 확대 및 에릭슨 등 신규 공급망 편입 가능성을 높인다.' }
    ],
    valuation:'Historical P/E를 채택했다. Target P/E 39.4배, 목표주가 99,000원, 상승여력 29%, 투자의견 BUY를 제시한다.',
    members:'Research Team 2',
    pdf:'assets/reports/26-1_rfhic.pdf', pdfMeta:'PDF · 28 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'stpharm', name:'에스티팜', ticker:'237690', sector:'바이오', type:'Company Analysis', op:'BUY', tp:'231,000원', buy:'', cur:'151,000원', upside:'+53%', upNum:53, tpNum:231000, date:'2026.03.24', team:'Research Team 3', region:'Korea',
    headline:'에스티팜? 좋다',
    summary:'25년 매출액 3,316억 원(YoY +21.1%), 영업이익 551억 원(YoY +98.9%)을 기록하며 수익성 중심의 펀더멘털 레벨업을 입증했다. 올리고 상업화 매출 확대와 저분자 신규 프로젝트 인식을 트리거로, 임상과 상업화 파이프라인 확장에 따른 수주 락인 효과가 본격화될 것으로 판단한다.',
    heroSummary:'올리고 CDMO의 톤 단위 전환. 27년 매출 YoY +96%를 전망한다.',
    points:[
      { title:'투자포인트 1. Q진화, 가라 올리고!', body:'27E 올리고 CDMO 매출 6,996억 원(YoY +96%)을 전망한다. 라이텔로·렉비오의 1차 치료제 안착, 트린골자의 만성질환 확산으로 기존 상업화 약물의 성장이 진행 중이다. 여기에 블록버스터급 임상 3종의 27~28년 상업화로 소량 임상용에서 톤 단위 상업용으로 물량이 전환되며 중장기 성장 레버리지가 완성될 전망이다.' },
      { title:'투자포인트 2. P개선으로 최종 진화', body:'고정비 희석과 원가 해자가 맞물리며 수익성 레버리지가 본격화된다. CDMO 프로젝트와 고마진 상업화 프로젝트가 전환되면서 매출 믹스를 개선할 전망이며, 제2올리고동 가동률 상승에 따른 고정비 희석과 3중 원가 해자가 동시에 작동해 이익 전환율을 확대시킬 것으로 판단한다.' }
    ],
    valuation:'DCF Valuation을 채택했다. WACC 10.57%를 적용해 목표주가 231,000원, 상승여력 53%, 투자의견 BUY를 제시한다. 교차 검증한 Peer PER 28.97배 기준 목표주가는 275,000원이다.',
    members:'Research Team 3',
    pdf:'assets/reports/26-1_st_pharm.pdf', pdfMeta:'PDF · 32 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'intellian', name:'인텔리안테크', ticker:'189300', sector:'IT', type:'Company Analysis', op:'BUY', tp:'182,800원', buy:'', cur:'128,100원', upside:'+42.7%', upNum:42.7, tpNum:182800, date:'2026.03.24', team:'Research Team 4', region:'Korea',
    headline:'GEO와 LEO 사이의 우주를 건너',
    summary:'4Q25 매출액 3,196억 원(YoY +24.0%)을 기록하며 글로벌 위성 통신 시장의 멀티오빗 채택 확대에 따른 외형 성장을 시현했다. 지상에서는 게이트웨이 성장과 원웹 서비스 정상화에 따른 수요 회복이, 해상에서는 멀티오빗 서비스 확산이 성장을 견인했다.',
    heroSummary:'글로벌 LEO 인프라 구축 본격화. 27년 게이트웨이 매출 YoY +53%를 전망한다.',
    points:[
      { title:'투자포인트 1. 웨잇, 게이트웨잇', body:'27E 게이트웨이 매출액 2,155억 원(YoY +53%)을 전망한다. Amazon의 위성 roll-out 가속화 및 지상 인프라 확충에 따른 게이트웨이 발주 확대와 ASTS·TELESAT 중심 고객사 다변화에 기인한다. 글로벌 LEO 사업자의 시장 진입 본격화에 힘입어 독점적 공급 지위를 기반으로 비 스타링크 진영 내 LEO 게이트웨이 수요를 흡수할 것으로 전망한다.' },
      { title:'투자포인트 2. 평판하다 평판한', body:'27E 평판형 안테나 매출 2,127억 원(YoY +29.62%)을 전망한다. 게이트웨이 성장에 더해 평판형 안테나는 동사의 핵심 성장 축으로 자리매김할 전망이며, 원웹의 서비스 확대에 따른 수혜와 해상용 평판형 안테나 성장의 본격화에 기인한다.' }
    ],
    valuation:'Historical PER 기법을 채택했다. 이에 따른 목표주가 182,800원, 상승여력 42.7%, 투자의견 BUY를 제시한다.',
    members:'Research Team 4',
    pdf:'assets/reports/26-1_intellian.pdf', pdfMeta:'PDF · 27 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'techwing', name:'테크윙', ticker:'089030', sector:'반도체', type:'Company Analysis', op:'BUY', tp:'89,000원', buy:'', cur:'47,500원', upside:'+87%', upNum:87, tpNum:89000, date:'2025.11.30', team:'Research Team 2', region:'Korea',
    headline:'큐브 프로버 날개 달고 윙윙',
    summary:'26년 매출 7,902억 원(YoY +351.1%), 영업이익 2,506억 원(YoY +1,008.7%)을 전망한다. HBM向 큐브 프로버 공급이 본격 개시됨에 따라 폭발적 외형 성장이 기대된다. HBM 전환기로 발생할 테스트 공정 장비의 전방사 수요와 큐브 프로버 성장이 맞물린다.',
    heroSummary:'HBM 전환기의 큐브 프로버. 26년 매출 YoY +351.1%를 전망한다.',
    points:[
      { title:'투자포인트 1. HBM 3사 다 공급하겠습니다', body:'26년 큐브 프로버 매출액 6,237억 원(YoY +2,298.8%)을 전망한다. 큐브 프로버는 기술적 우위를 기반으로 이미 주요 HBM 제조사 2곳의 퀄리피케이션을 통과했고 남은 1곳의 테스트도 통과가 유력한 상황이다. 고마진 제품인 큐브 프로버의 매출 폭증과 함께 강력한 외형 성장이 전망된다.' },
      { title:'투자포인트 2. 핸들러와 C.O.K가 지탱하는 현금흐름', body:'26년 핸들러와 C.O.K 매출액을 각각 556억 원(YoY +20.6%), 747억 원(YoY +17%)으로 전망한다. 장비 산업 실적 변동성을 완충하는 안정적인 반복 매출이 존재하며, 글로벌 점유율을 확보한 핸들러와 세대 전환마다 매출이 발생하는 C.O.K는 현금흐름의 하방을 지탱하는 역할을 수행할 것이다.' }
    ],
    valuation:'Historical P/E Valuation을 채택했다. 26년 EPS 4,940원, Target P/E 18배, 목표주가 89,000원, 상승여력 87%, 투자의견 BUY를 제시한다. 교차 검증 방식으로는 DCF Valuation을 채택했다.',
    members:'Research Team 2',
    pdf:'assets/reports/25-2_techwing.pdf', pdfMeta:'PDF · 21 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'flitto', name:'플리토', ticker:'300080', sector:'IT서비스', type:'Company Analysis', op:'BUY', tp:'37,000원', buy:'', cur:'18,700원', upside:'+98%', upNum:98, tpNum:37000, date:'2025.11.30', team:'Research Team 5', region:'Korea',
    headline:'나 혼자만 저자원',
    summary:'25년 3분기 기준 매출 비중은 데이터판매 75.95%, 플랫폼 15.79%, 솔루션 7.54%다. 특히 데이터판매는 글로벌 IT 수주 확대로 수출액이 YoY +94.5% 증가했는데, 이는 동사의 언어데이터 경쟁력이 글로벌로부터 본격적으로 인정받고 있음을 의미한다.',
    heroSummary:'저자원 언어데이터의 대체 불가 공급자. 26년 데이터판매 YoY +46.3%를 전망한다.',
    points:[
      { title:'투자포인트 1. 일어나라, P&Q', body:'26년 데이터판매 사업부 매출액 406억 원(YoY +46.3%) 달성을 전망한다. 희소성 높은 저자원 데이터 중심의 고단가 믹스와 99.8%의 정합성은 글로벌 빅테크·소버린向 AI 수요 폭증과 맞물려 대체 불가한 공급자 지위를 확보했다는 판단이다. 1,400만 유저 기반의 집단지성 시스템은 경쟁사 대비 원가 우위를 완성했다.' },
      { title:'투자포인트 2. 러브콜이 쏟아진다', body:'26년 솔루션 사업부 매출액 35.1억 원(YoY +51%)을 전망한다. Live Translation은 APEC 등 글로벌 레퍼런스와 재사용률 100%를 기반으로 대형 국제행사를 담당할 핵심 매출원으로 자리잡을 전망이다. Chat Translation 또한 외국인 방문객 수 증가에 따라 설치에서 구독료 반복 수취로 이어지는 선순환 구조를 형성할 것으로 판단한다.' }
    ],
    valuation:'SOTP Valuation 방식을 채택했다. 이에 따른 목표주가 37,000원, 상승여력 98%, 투자의견 STRONG BUY를 제시한다. 사업부별 성장 기울기가 상이한 점을 반영했다.',
    members:'Research Team 5',
    pdf:'assets/reports/25-2_flitto.pdf', pdfMeta:'PDF · 21 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'komico', name:'코미코', ticker:'183300', sector:'반도체', type:'Company Analysis', op:'BUY', tp:'161,700원', buy:'', cur:'100,400원', upside:'+61.1%', upNum:61.1, tpNum:161700, date:'2025.09.23', team:'Research Team 6', region:'Korea',
    headline:'(코)믿코 더블로 가',
    summary:'2Q25 매출액 1,460억 원(QoQ +8.1%)을 기록하며 분기 기준 사상 최대치를 경신했다. 글로벌 고객사의 선단공정 투자와 Fab 증설에 따른 세정·코팅 수요 확대, 자회사 미코세라믹스의 안정적 매출 기여가 성장세를 견인했다.',
    heroSummary:'글로벌 Top-tier CapEx 확대의 동반 수혜. 26년 세라믹 매출 YoY +34%를 전망한다.',
    points:[
      { title:'투자포인트 1. 동반 CapEx up, 주가 Level-up', body:'25E 세정·코팅 부문 매출액 3,672억 원(YoY +16%)을 전망한다. 글로벌 Top-tier 고객사의 CapEx 확장에 동반해 생산거점 근처에 현지법인을 설립하고 수요 증가를 안정적으로 흡수하는 전략을 전개하고 있다. 26E TSMC向 매출액 227억 원(YoY +72%), 오스틴 법인 매출 540억 원(YoY +8.2%)을 전망한다.' },
      { title:'투자포인트 2. 세라믹 등에 업고, 매출 Boost-up', body:'미코세라믹스의 26E 매출액 3,637억 원(YoY +34%)을 전망한다. 중국向 부품 수요 증가, 마진율이 높은 ALD 세라믹 히터 수요 확대, ESC 시장 개화에 따른 Top-line 성장에 기인한다. 26E 세라믹 히터向 매출액 3,056억 원(YoY +72.1%), ESC 매출액 581억 원(YoY +15.8%)을 전망한다.' }
    ],
    valuation:'Historical PER 기법을 채택했다. 이에 따른 목표주가 161,700원, 상승여력 61.1%, 투자의견 BUY를 제시한다.',
    members:'Research Team 6',
    pdf:'assets/reports/25-2_komico.pdf', pdfMeta:'PDF · 30 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'humedix', name:'휴메딕스', ticker:'200670', sector:'소비재', type:'Company Analysis', op:'BUY', tp:'76,000원', buy:'', cur:'63,200원', upside:'+20.3%', upNum:20.3, tpNum:76000, date:'2025.09.23', team:'Research Team 3', region:'Korea',
    headline:'휴메딕스 안 사면 후회한다',
    summary:'2Q25 매출액 430억 원(YoY -6.2%), 영업이익 108억 원(YoY -17.3%)을 기록하며 전년 동기 대비 감익했다. 국내 에스테틱 시장 내 경쟁 심화에 따른 톡신·필러 내수 부진이 주된 요인이나, 필러 수출은 109억 원(YoY +21.1%)을 기록하며 전사 실적을 방어했다.',
    heroSummary:'브라질·중국·태국 필러 수출 확대. 25년 해외 필러 매출 YoY +23.7%를 전망한다.',
    points:[
      { title:'투자포인트 1. 브라질, 중국, 태국', body:'25년 해외 필러 매출 약 318억 원(YoY +23.7%)을 전망한다. 브라질은 글로벌 2위 성형시장으로 동사는 국내 최초 바디필러 허가를 추진 중이며 선제적 품목 승인 시 초기 시장을 선점할 가능성이 높다. 중국은 프리미엄 필러 시술량 증가를 통해 매출 성장을 견인하고, 태국은 의료관광 수요 급증으로 동남아 확장의 교두보 역할을 할 것으로 기대한다.' },
      { title:'투자포인트 2. 혁신기술로 완성하는 NEXT BEAUTY', body:'1Q26E 코스메틱 부문 엘라비에 리투오 매출액 약 8.9억 원(QoQ +28%)을 전망한다. 리들부스터의 국내 독점 유통은 전국 유통망과의 시너지를 창출할 것이며, 스킨부스터 엘라비에 리투오는 기존 제품을 뛰어넘는 작용 기전과 긴 유지 기간으로 매출 상승을 견인할 예정이다.' }
    ],
    valuation:'Historical Peer PER Method를 채택했다. 목표주가 76,000원, 상승여력 20.3%, 투자의견 BUY를 제시한다.',
    members:'Research Team 3',
    pdf:'assets/reports/25-2_humedix.pdf', pdfMeta:'PDF · 35 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'duolingo', name:'Duolingo', ticker:'DUOL', sector:'플랫폼', type:'Company Analysis', op:'BUY', tp:'$415', buy:'', cur:'$309', upside:'+34%', upNum:34, tpNum:415, date:'2025.09.23', team:'Research Team 4', region:'Global',
    headline:'이 정도면, 듀오링고로 넘어와듀오',
    summary:'2Q25 매출 2억 5,230만 달러(YoY +41%), 순이익 4,478만 달러(YoY +84%)를 기록했다. AI 기반 콘텐츠 확장과 MAX 요금제 전환으로 ASP 상승 및 침투율 9%를 달성했고, MAU 1억 2,830만 명(YoY +24%), DAU 4,770만 명(YoY +40%)의 성장세를 이어가고 있다.',
    heroSummary:'MAX 전환과 AI 원가 절감. 25년 조정 EBITDA 마진 28%를 전망한다.',
    points:[
      { title:'투자포인트 1. P-C 스프레드 확대해 듀오', body:'25E 조정 EBITDA 마진 28%(YoY +270bp)를 전망한다. 프리미엄 요금제 MAX 확산에 따른 ASP 상승, AI LLM 단가 급락 및 Birdbrain 최적화를 통한 비용 절감, 앱스토어 외부결제 허용에 따른 수수료 축소에 기인한다. 25년 말까지 MAX 구독자가 약 139만 명에 이르며 수익성 개선 모멘텀이 본격화될 전망이다.' },
      { title:'투자포인트 2. 듀오링고 Q에 링GO', body:'26E MAU는 약 22.9억 명, DAU는 약 10.1억 명으로 전망한다. 글로벌 스마트폰 보급 확대에 따른 TAM 확장, APAC·EMEA 지역 중심의 신규 유입 증가, AI 기반 강좌 확대 및 신규 과목 도입에 기인한다. 24년 2.24%였던 유입률이 26년 3.66%까지 상승할 전망이다.' }
    ],
    valuation:'EV/EBITDA Valuation을 채택했다. 이에 따른 목표주가 415달러, 상승여력 34%, 투자의견 BUY를 제시한다.',
    members:'Research Team 4',
    pdf:'assets/reports/25-2_duolingo.pdf', pdfMeta:'PDF · 21 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'crowdstrike', name:'CrowdStrike', ticker:'CRWD', sector:'보안', type:'Company Analysis', op:'BUY', tp:'$718', buy:'', cur:'$509', upside:'+41%', upNum:41, tpNum:718, date:'2025.11.30', team:'Research Team 4', region:'Global',
    headline:'미리 메리 크라스마스!',
    summary:'FY26 2Q 매출액 11.7억 달러(YoY +21%), 구독 매출 11억 달러(YoY +20%)를 기록했다. 주력 상품인 Falcon 플랫폼의 확장세에 기반해 ARR은 사상 최대치인 46.6억 달러(YoY +20%)를 달성했다.',
    heroSummary:'Falcon 플랫폼의 락인 구조. 27년 총 고객 수 5.9만(YoY +32%)을 전망한다.',
    points:[
      { title:'투자포인트 1. Q 성장과 락인이 만드는 구조적 성장', body:'총 고객 수는 27년 5.9만(YoY +32%)에 달할 것으로 전망한다. 기존 엔드포인트 보안뿐 아니라 클라우드 보안, 아이덴티티 보호, 차세대 SIEM 등 신규 세그먼트에서의 기술적 우위에 기인한다. 보안 플랫폼 TAM은 29년 2,500억 달러 달성을 전망하며, 분기당 순신규 ARR은 2.2억 달러(YoY +11%)를 안정적으로 확보했다.' },
      { title:'투자포인트 2. P-C 스프레드 in 스트라이크존', body:'27년 ARPU를 3.9만 달러로 추산한다. Falcon Flex 확산으로 중대형 기업의 지출 단가가 고부가 구조로 전환되고 반복 재계약을 통해 P 상승이 실현됨에 기인한다. AI 기반 자동화 확산으로 CAC 회수 기간이 단축되고 인력 구조조정을 통한 비용 절감 효과까지 맞물려 비용 구조가 경량화되고 있다.' }
    ],
    valuation:'Historical PSR Valuation을 채택했다. 순수 SaaS 기업으로 단기 수익성보다 매출과 ARR 성장률이 기업 가치에 더 큰 영향을 미친다고 판단했다. 목표주가 718달러, 상승여력 41%, 투자의견 BUY를 제시한다.',
    members:'Research Team 4',
    pdf:'assets/reports/25-2_crowdstrike.pdf', pdfMeta:'PDF · 18 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'jinsung', name:'진성티이씨', ticker:'036890', sector:'건설기계', type:'Company Analysis', op:'BUY', tp:'17,300원', buy:'', cur:'12,800원', upside:'+35.2%', upNum:35.2, tpNum:17300, date:'2025.09.23', team:'Research Team 1', region:'Korea',
    headline:'Make Jinsung Great Again',
    summary:'2H25 직전 동기 대비 64.0% 증가한 3,401억 원의 매출을 기록할 전망이다. 미국 내 건설 업황이 개선되고 있으며 전방 산업의 수혜가 동사에 집중될 것이다. 신공장 완공으로 증가한 CAPA를 통해 수요가 실적으로 전환될 전망이다.',
    heroSummary:'건설기계 사이클 초반 진입. 26년 매출 7,364억 원(YoY +30.7%)을 전망한다.',
    points:[
      { title:'투자포인트 1. 지금까지 이런 수요는 없었다', body:'고객사 수요 폭증으로 26년 매출 7,364억 원(YoY +30.7%)을 기록할 전망이다. 미국의 우호적인 정책 환경과 타국의 인프라 투자 본격화는 건설기계 산업의 사이클 초반 진입을 촉발했다. 1Q25 전방사의 수요를 급격히 확대시켰으며 이전 사이클 대비 추가 상승 여력을 보유한 점이 성장을 가시화한다.' },
      { title:'투자포인트 2. 이것은 CAPA인가 초파인가', body:'신규 CAPA를 통해 수요를 전부 실적으로 전환할 전망이다. 26년 말까지 약 140만 개의 생산능력을 새롭게 보유하게 되며 총 CAPA는 약 1조 원이다. 이는 향후 매출을 13.4% 상회하는 수준으로 증가한 수요를 안정적으로 뒷받침할 것이다. 경쟁사의 신규 CAPA 확장 가능성이 제한적이라 증설 후 높은 가동률이 유지될 전망이다.' }
    ],
    valuation:'Historical PER 방식을 채택했다. 이에 따른 목표주가 17,300원, 상승여력 35.2%, 투자의견 BUY를 제시한다.',
    members:'Research Team 1',
    pdf:'assets/reports/25-2_jinsung_tec.pdf', pdfMeta:'PDF · 19 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'seers', name:'씨어스테크놀로지', ticker:'458870', sector:'의료 AI', type:'Company Analysis', op:'BUY', tp:'216,000원', buy:'', cur:'135,000원', upside:'+60%', upNum:60, tpNum:216000, date:'2025.11.30', team:'Research Team 3', region:'Korea',
    headline:'나는 thynC한다, 고로 존재한다',
    summary:'3Q25 매출액 157억 원(YoY +1,500%), 영업이익 68억 원(QoQ +357%)을 기록하며 컨센서스를 대폭 상회했다. 핵심 성장원인 씽크 부문이 전사 실적을 견인하며 창사 이래 최대 분기 실적과 함께 국내 의료 AI 기업 중 최초로 연간 흑자전환을 달성했다.',
    heroSummary:'수가 확보로 병동이 수익 센터로. 27년 씽크 매출 1,234억 원을 전망한다.',
    points:[
      { title:'투자포인트 1. thynC', body:'27E 씽크 부문 매출액 1,234억 원(YoY +28%)을 전망한다. 씽크는 중환자실을 넘어 일반병동까지 확장되며 병동 단위의 Q를 확보했다. 25년 2월 EX871 수가 확보로 일반병동이 비용 센터에서 연간 병상당 2,600만 원을 창출하는 수익 센터로 전환되었으며, 엔지니어 조직 확충으로 설치 병목이 해소되면서 수주 잔고가 즉각 매출로 전환될 수 있다.' },
      { title:'투자포인트 2. mobiCARE', body:'27년 모비케어 부문 매출액은 341억 원(YoY +195%)을 전망한다. 최대 14일까지 가능한 장기 연속 검사 수가 신설은 의료진에게 진단 도구를, 병원에는 기술료 차익이라는 확정적 수익 모델을 제공한다. 병원이 초기 투자 부담 없이 즉시 매출을 창출할 수 있게 하는 구조가 강력한 유인으로 작용한다.' }
    ],
    valuation:'Historical Peer PER 방식을 채택했으며 Peer 그룹에는 쇼크웨이브 메디컬을 선정했다. 이에 목표주가 216,000원, 상승여력 60%, 투자의견 BUY를 제시한다.',
    members:'Research Team 3',
    pdf:'assets/reports/25-2_seers.pdf', pdfMeta:'PDF · 24 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'binex', name:'바이넥스', ticker:'053030', sector:'제약바이오', type:'Company Analysis', op:'BUY', tp:'30,900원', buy:'', cur:'14,640원', upside:'+111.1%', upNum:111.1, tpNum:30900, date:'2025.11.30', team:'Research Team 1', region:'Korea',
    headline:'Buy Next? Buy Now!',
    summary:'27년 25년 대비 37.2% 증가한 2,477억 원의 매출을 기록할 전망이다. 최근 개시된 CDMO 상업 생산이 본격화되며 25년 흑자전환과 27년 24.1%의 OPM을 기록할 전망이다. 26년 예정된 CAPA 증설은 실적 개선을 안정적으로 뒷받침할 것이다.',
    heroSummary:'생물보안법 반사 수혜와 상업 생산 개시. 27년 OPM 21.7%를 전망한다.',
    points:[
      { title:'투자포인트 1. 상업화로 나의 상승기 시작했다', body:'상업 생산 본격화로 27년 매출 2,477억 원을 달성하며 성장 궤도에 진입할 전망이다. cGMP 인증 획득을 기반으로 시작된 셀트리온 앱토즈마 상업 생산은 고마진 구조로의 체질 개선을 견인하고 있다. 삼성바이오에피스와의 PPQ 계약이 상업 생산으로 전환되며 장기적이고 안정적인 매출원이 추가될 예정이다.' },
      { title:'투자포인트 2. 중국 Bye, Next는 바이넥스', body:'미국 생물보안법 시행에 따른 반사 수혜로 신규 고객사를 확보하며 밸류에이션 리레이팅을 맞이할 전망이다. 미국의 중국 CDMO 기업 퇴출로 인한 공급망 공백은 cGMP 인증과 가격 경쟁력을 모두 갖춘 동사에게 기회로 작용하고 있다.' }
    ],
    valuation:'Historical Peer PER 방식을 채택했다. 이에 따른 목표주가 30,900원, 상승여력 111.1%, 투자의견 BUY를 제시한다.',
    members:'Research Team 1',
    pdf:'assets/reports/25-2_binex.pdf', pdfMeta:'PDF · 18 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'lottetour', name:'롯데관광개발', ticker:'032350', sector:'레저', type:'Company Analysis', op:'BUY', tp:'30,300원', buy:'', cur:'19,270원', upside:'+57.2%', upNum:57.2, tpNum:30300, date:'2025.11.30', team:'Research Team 6', region:'Korea',
    headline:'25년 고생 많으셨고, 26년 베팅하시죠',
    summary:'3Q25 매출액 1,867억 원(YoY +34.2%), 영업이익 530억 원(YoY +139%)으로 컨센서스를 12% 상회하며 어닝 서프라이즈를 기록했다. 드랍액과 방문객 증가로 카지노 매출이 1,393억 원(YoY +65.4%)에 달하며 사상 최대치를 경신했다.',
    heroSummary:'하이롤러 유입과 영업 레버리지. 26년 카지노 매출 YoY +52.2%를 전망한다.',
    points:[
      { title:'투자포인트 1. MASS 묶고, 하이롤러 더블로 가', body:'26E 카지노 사업부 매출액 6,231억 원(YoY +52.2%)을 전망한다. 업계 최상위 수준의 콤프 제공 역량과 게임 인프라를 기반으로 하이롤러 Q 확대 전략을 가속화하고 있다. 중국 하이롤러向 영업수익은 26년 3,244억 원(YoY +77%)까지 급증할 전망이며, 승률 변동성이 낮은 MASS 고객의 비중은 실적의 하방을 지지한다.' },
      { title:'투자포인트 2. CAPA 믿고, 콤프도 더블로 가', body:'26E 영업이익 2,043억 원(YoY +25.6%)을 전망한다. 1,600실 규모의 호텔 객실 CAPA 보유 및 복합리조트 내재화를 통해 외부 임차료가 없어 고정비 부담을 최소화하는 비용 구조를 보유하고 있다. 26년 콤프 비중을 70%까지 확대할 것으로 전망됨에 따라 본격적인 영업 레버리지를 실현할 것으로 판단한다.' }
    ],
    valuation:'Peer EV/EBITDA를 채택했다. Target EV/EBITDA 10.9배를 적용한 목표주가 30,300원, 상승여력 57.2%, 투자의견 BUY를 제시한다.',
    members:'Research Team 6',
    pdf:'assets/reports/25-2_lotte_tour.pdf', pdfMeta:'PDF · 26 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'lselectric', name:'LS ELECTRIC', ticker:'010120', sector:'전력기기', type:'Company Analysis', op:'BUY', tp:'348,000원', buy:'', cur:'293,000원', upside:'+18.77%', upNum:18.77, tpNum:348000, date:'2025.09.23', team:'Research Team 5', region:'Korea',
    headline:'배전부터 송전까지, ALL IN ONE',
    summary:'2Q25 매출액 1조 1,930억 원(YoY +5.4%)을 달성했다. 전력사업 내 미국 매출 비중 증가세와 변압기(YoY +44.4%), 배전반(YoY +23.7%) 중심 성장에 기인한다. 빅테크向 납품 레퍼런스, 현지화 전략, 지속적 CAPA 증설을 통해 고성장이 기대된다.',
    heroSummary:'배전부터 송전까지. 26년 송전 매출 YoY +166%를 전망한다.',
    points:[
      { title:'투자포인트 1. 배전', body:'본사 배전 매출 26년 3조 3,714억 원(YoY +19%)을 전망한다. 북미向 배전반은 UL 인증을 통한 신뢰 확보와 텍사스 현지화, MCM 파트너십을 기반으로 글로벌 빅테크와의 납품 협의가 본격화되고 있다. 국내에서는 데이터센터 전력 인프라 투자와 한전의 배전망 증설이 레퍼런스를 뒷받침해 안정적 수익 기반을 제공한다.' },
      { title:'투자포인트 2. 송전', body:'본사 기준 26E 송전 부문 매출액 6,150억 원(YoY +166%)을 전망한다. 글로벌 전력망 대전환과 탄소중립 기조 확산에 따라 초고압 변압기 및 HVDC 수요가 구조적으로 확대되는 가운데, KOC 공장 인수와 부산 지역 5,000억 원 규모 CAPA 증설을 통해 글로벌 수요를 선제적으로 흡수할 것으로 예상한다.' }
    ],
    valuation:'P/E Valuation을 채택했다. Target P/E는 공장 증설과 법인 인수로 과거 외형으로 설명할 수 없어 Global Peer 평균에 15%를 할증했다. 26E EPS 10,299원, Target P/E 33.81배, 목표주가 348,000원, 상승여력 18.77%, 투자의견 BUY를 제시한다.',
    members:'Research Team 5',
    pdf:'assets/reports/25-2_ls_electric.pdf', pdfMeta:'PDF · 44 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'hdmarine', name:'HD현대마린솔루션', ticker:'443060', sector:'조선', type:'Company Analysis', op:'BUY', tp:'298,200원', buy:'', cur:'203,500원', upside:'+47%', upNum:47, tpNum:298200, date:'2025.09.22', team:'Research Team 2', region:'Korea',
    headline:'전적으로 저를 믿으셔야 합니다',
    summary:'2Q25 매출액 4,677억 원(QoQ -4%), 영업이익 830억 원(QoQ 0%)을 기록하며 컨센서스를 소폭 하회했다. 환율과 유가의 불리한 조건으로 벙커링 부문 매출이 침체되었지만, 핵심 사업부인 AM 솔루션의 최대 실적 갱신 및 마진 상승으로 이를 상쇄했다.',
    heroSummary:'환경 규제가 만드는 개조 수요. 26년 친환경 솔루션 YoY +51.4%를 전망한다.',
    points:[
      { title:'투자포인트 1. 내게 꼭 맞는 Fit, Retrofit', body:'26E 친환경 솔루션 부문 매출액 2,573억 원(YoY +51.4%)을 전망한다. 강화되는 환경 규제는 선주와 해운사에 새로운 대응을 요구하고 있으며 이는 친환경 개조 수요의 폭증으로 이어질 것이다. LNGC를 중심으로 확대되는 개조 수요는 핵심 성장축으로 자리매김하고 있으며, 블랙마켓이 대체할 수 없는 고도의 기술력을 기반으로 최대 수혜자로 부상할 전망이다.' },
      { title:'투자포인트 2. I AM 신뢰에요', body:'26E AM 솔루션 부문 매출액 1조 1,250억 원(YoY +18.5%)을 전망한다. HD현대그룹과의 긴밀한 협업은 안정적 물량 확보를 넘어 선주들의 선택 기준으로 작용하며 AM 부문의 점유율 확대를 견인할 것이다. 독자 라이선스를 보유한 힘쎈엔진 관련 수요는 영업이익을 견인할 전망이다.' }
    ],
    valuation:'Peer P/E Valuation 방식을 채택했으며 Peer 그룹으로는 타 중공업종 내 MRO 기업들을 선정했다. 이에 목표주가 298,200원, 상승여력 47%, 투자의견 BUY를 제시한다.',
    members:'Research Team 2',
    pdf:'assets/reports/25-2_hd_marine.pdf', pdfMeta:'PDF · 30 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'hanmi', name:'한미반도체', ticker:'042700', sector:'반도체 장비', type:'Company Analysis', op:'BUY', tp:'94,400원', buy:'', cur:'69,700원', upside:'+35.4%', upNum:35.4, tpNum:94400, date:'2025.04.01', team:'Research Team 1', region:'Korea',
    headline:'한미(寒微)하지 않은 컨센서스',
    summary:'2024년 매출 5,589억 원(YoY +251%), 영업이익 2,554억 원(YoY +638%)을 기록했다. 기존 고객사의 CAPEX 증대에 따른 장비 공급 증가와 신규 고객사向 매출 확대에 기인한다. 2025년 매출액 9,220억 원(YoY +65%)을 전망한다.',
    heroSummary:'HBM 수요가 만든 TC본더 사이클. 25년 TC본더 매출 YoY +81.6%를 전망한다.',
    points:[
      { title:'투자포인트 1. 고객이 지르면, 우리는 웃는다', body:'AI 산업의 구조적 성장과 HBM의 중요성 확대로 고객사 CAPEX가 확대되며 TC본더 매출은 8,054억 원(YoY +81.6%)으로 증가할 예정이다. SK하이닉스와 Micron은 총액 40조 4,000억 원의 CAPEX 확대가 예정되었으며, 동사는 선제적으로 TC본더 공장을 증설해 매출액 기준 약 2조 원의 CAPA를 갖출 예정이다.' },
      { title:'투자포인트 2. HBM을 넘어 파운드리까지', body:'고객사 TSMC의 공장 증설을 통한 생산성 증대로 매출 1,629억 원을 전망한다. TSMC는 2025년 약 63억 달러 규모의 첨단 패키징 설비 투자에 나설 계획이며, CoWoS 생산 능력이 2배 확대될 것으로 예상된다. 해당 공정에는 TSMC 맞춤형 장비인 2.5D BIG DIE TC BONDER가 필수적으로 도입될 전망이다.' }
    ],
    valuation:'Peer PER Method를 채택했다. 전방 산업인 반도체 제조사들의 CAPEX 투자 확대와 산업의 지속적인 성장 기대감을 반영했다. 12fwd 목표주가 94,400원, 상승여력 35.4%를 제시한다.',
    members:'Research Team 1',
    pdf:'assets/reports/25-1_hanmi_semi.pdf', pdfMeta:'PDF · 24 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'classys', name:'클래시스', ticker:'214150', sector:'미용/의료기기', type:'Company Analysis', op:'BUY', tp:'77,900원', buy:'', cur:'58,000원', upside:'+34.3%', upNum:34.3, tpNum:77900, date:'2025.04.01', team:'Research Team 2', region:'Korea',
    headline:'클래시스, 어디까지 클래?',
    summary:'24년 매출액 2,429억 원(YoY +35%), 영업이익 1,225억 원(YoY +36%)을 기록했으며 OPM 50.4%로 높은 수준을 유지했다. 4Q24에 미국 시장 진출에 성공했고 태국과 브라질에서도 견조한 매출 성장을 이루며 확고한 입지를 다졌다.',
    heroSummary:'장비와 소모품의 선순환. 25년 해외 장비매출 YoY +47%를 전망한다.',
    points:[
      { title:'투자포인트 1. 장비와 소모품, 함께 Class UP!', body:'25년 장비 매출액 1,441억 원(YoY +30%)을 전망한다. 사용자 편의에 특화된 기술력을 바탕으로 M/S와 장비 판매 대수를 확대하고 있다. 장비 판매 확대에 따라 소모품 매출이 함께 증가하는 선순환 구조를 고려할 때 25년 소모품 매출액 1,322억 원(YoY +20%), OPM 52%를 전망한다.' },
      { title:'투자포인트 2. Global 시장, Glory한 확대', body:'25년 해외 장비매출액 1,645억 원(YoY +47%)을 전망한다. 해외 매출 비중은 67.4%에 달하며 글로벌 시장 성장에 힘입어 강한 Q 성장이 기대된다. 글로벌 피부 리프팅 장비 시장에서 가장 큰 비중을 차지하는 미국으로의 본격적인 수출이 25년 매출 성장을 견인할 것으로 예상하며, 중국 시장에서는 3Q26 볼뉴머 진출이 기대된다.' }
    ],
    valuation:'Historical PER 기법을 채택했다. 이에 따른 목표주가 77,900원, 상승여력 34.3%, 투자의견 BUY를 제시한다.',
    members:'Research Team 2',
    pdf:'assets/reports/25-1_classys.pdf', pdfMeta:'PDF · 26 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'semco', name:'삼성전기', ticker:'009150', sector:'전자부품', type:'Company Analysis', op:'BUY', tp:'208,300원', buy:'', cur:'128,700원', upside:'+62%', upNum:62, tpNum:208300, date:'2025.04.01', team:'Research Team 3', region:'Korea',
    headline:'아빠, 이제 쉬어',
    summary:'4Q24 매출액 2조 4,923억 원(YoY +7.9%), 영업이익 1,150억 원(YoY +4.1%), 당기순이익 2,112억 원(YoY +340%)을 기록했다. 24년 전체 매출과 영업이익은 각각 15.5%, 14.9% 상승해 10.3조 원, 7,350억 원을 기록하며 창사 이래 최초로 10조 원대 매출을 거뒀다.',
    heroSummary:'AI 서버가 되살린 MLCC 수요. 컴포넌트 매출 YoY +15%를 전망한다.',
    points:[
      { title:'투자포인트 1. 다시 고개 드는 MLCC 수요', body:'주력 제품인 MLCC는 AI 서버와 자율주행 등 전방산업 Q 증가의 영향으로 수요가 증가하고 있다. 이에 따른 고용량·고신뢰성 MLCC 판매 비중 확대가 컴포넌트 사업부 매출액 5조 1,107억 원(YoY +15%) 달성과 ASP 상승에 따른 수익성 개선으로 이어질 전망이다.' },
      { title:'투자포인트 2. FC + BGA = FCBGA', body:'반도체기판 시장은 글로벌 빅테크의 AI 데이터센터 증설에 따른 고성능 FC-BGA 수요 급증으로 업황 회복 국면에 접어들었다. 동사는 고성능 FC-BGA로의 매출 비중 확대를 통한 ASP 증가를 추진하며 성공적인 외형 성장을 이뤄낼 것으로 전망한다.' }
    ],
    valuation:'Historical PER Method를 채택했다. 이에 따라 2025년 목표주가 208,300원, 상승여력 62%를 제시한다.',
    members:'Research Team 3',
    pdf:'assets/reports/25-1_semco.pdf', pdfMeta:'PDF · 22 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'apr', name:'에이피알', ticker:'278470', sector:'화장품', type:'Company Analysis', op:'BUY', tp:'108,500원', buy:'', cur:'70,700원', upside:'+53%', upNum:53, tpNum:108500, date:'2025.04.01', team:'Research Team 6', region:'Korea',
    headline:'A~ 누가 요새 APR 안 사~',
    summary:'24년 매출은 7,228억 원(YoY +38%), 영업이익은 1,226억 원(YoY +17%)을 기록했다. 해외 매출 비중은 23년 44%에서 24년 64%로 확대되며 글로벌 입지를 강화했다.',
    heroSummary:'티르티르의 미국 성공 공식. 25년 화장품 부문 매출 YoY +67%를 전망한다.',
    points:[
      { title:'투자포인트 1. 화장품 산업의 Next level', body:'25E 화장품 부문 매출 5,666억 원(YoY +67%)을 전망한다. 미국 시장에서 티르티르가 입증한 성공 공식을 유사한 경로로 따라가고 있는 점, 일본 오프라인 유통 진출 및 유럽 전역으로의 B2B 확장, 수요가 급증 중인 PDRN 제품군에 대응한 생산 인프라 증설을 통해 외형 성장을 이어갈 것으로 보인다.' },
      { title:'투자포인트 2. 디바이스 하나면 시술은 안녕', body:'25E 흡수형 및 재생형 뷰티 디바이스 부문 매출을 4,346억 원(YoY +37%)으로 전망한다. 국내 뷰티 디바이스 시장 점유율 1위 사업자로, 흡수형 디바이스 부스터프로의 글로벌 판매 호조, 북미를 중심으로 한 고가 피부시술의 대체 수요 확산, 울트라튠·하이포커스샷 등 재생형 라인업 확대를 통해 고성장 기조가 이어질 것으로 판단된다.' }
    ],
    valuation:'Peer PER을 채택했다. 25년 목표주가 108,500원, 상승여력 53%, 투자의견 BUY를 제시한다.',
    members:'Research Team 6',
    pdf:'assets/reports/25-1_apr.pdf', pdfMeta:'PDF · 30 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'hdengine', name:'HD현대마린엔진', ticker:'071970', sector:'조선기자재', type:'Company Analysis', op:'BUY', tp:'42,700원', buy:'', cur:'27,250원', upside:'+57%', upNum:57, tpNum:42700, date:'2025.04.01', team:'Research Team 5', region:'Korea',
    headline:'바다를 가로지르는 선박의 심장',
    summary:'24E 매출액 3,158억 원(YoY +29.2%), 영업이익 332억 원(YoY +80.4%)을 기록하며 성장을 가시화했다. 선박엔진 가동률이 40%에 불과함에도 영업이익률은 10%를 상회했다. 조선 슈퍼사이클과 엔진 쇼티지의 수혜로 상승은 지속될 전망이다.',
    heroSummary:'조선 슈퍼사이클과 엔진 쇼티지. 26년 중국 매출 YoY +75.9%를 전망한다.',
    points:[
      { title:'투자포인트 1. Q 성장의 물결, 파도를 일으키다', body:'HD한국조선해양 편입에 따라 사실상의 Q 증가가 이루어져 26E 한국 매출액 419억 원, 리드타임 감소로 인한 생산량 11% 증가가 전망된다. HD현대미포向 캡티브 물량이 지속적으로 증가할 예정이며, HD현대중공업의 엔진 제작 노하우를 이전받아 리드타임이 단축되기 때문이다.' },
      { title:'투자포인트 2. 파도 타고 중국을 향해', body:'Q 확대와 P 상승을 통해 26E 중국 매출액 46억 원(YoY +75.9%)을 달성할 전망이다. 중국 내 엔진 쇼티지로 중소형 선박 엔진 수주가 매년 증가 중이며, 엔진 리드타임 증가와 경쟁사의 오버캐파 상태, 친환경 엔진 확대에 의해 가속화되고 있다. 엔진 판가 역시 신조선가 상승과 납기 프리미엄 부각으로 상승세다.' }
    ],
    valuation:'Implied PBR 기법을 사용했다. 현재 수주물량의 인식이 예상되는 26E BPS 11,921원에 PBR 3.62배를 적용해 목표주가 42,700원, 상승여력 57.0%를 제시한다.',
    members:'Research Team 5',
    pdf:'assets/reports/25-1_hd_engine.pdf', pdfMeta:'PDF · 29 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'tovis', name:'토비스', ticker:'051360', sector:'디스플레이', type:'Company Analysis', op:'BUY', tp:'26,500원', buy:'', cur:'17,950원', upside:'+47%', upNum:47, tpNum:26500, date:'2025.04.01', team:'Research Team 4', region:'Korea',
    headline:'토비스, 카지노 묻고 전장으로 따블가!',
    summary:'24년 매출액 6,238억 원(YoY +39.4%), 영업이익 583억 원(YoY +127.5%)을 기록했다. 주력 사업부문인 산업용 모니터(YoY +8.0%)와 전장용 디스플레이 부문(YoY +84.0%) 모두 가시적인 성장이 주목되었다.',
    heroSummary:'전장과 카지노의 두 축. 25년 전장 매출 4,063억 원(YoY +25.6%)을 전망한다.',
    points:[
      { title:'투자포인트 1. 토비스는 전장으로 Double Q 준비 완', body:'25년 전장용 디스플레이 사업부 매출액 4,063억 원(YoY +25.6%), 영업이익 226억 원 달성을 전망한다. LGD·현대모비스 등 기존 고객사 기반의 안정적 성장과 함께 스텔란티스, 콘티넨탈 등 신규 글로벌 고객사 수주를 확보했다. 서천공장 증설 이후 1,000억 원 이상의 CAPA를 확보하며 탑라인 성장과 수익성 개선이 동시에 기대된다.' },
      { title:'투자포인트 2. 카지노는 캐시카우가 아니다', body:'25년 산업용 모니터 사업부 매출액 2,967억 원(YoY +10%), 영업이익 320억 원 달성을 전망한다. 연간 30만 대 규모의 슬롯머신 교체수요와 아시아·북미 지역 카지노 신설에 따른 신규수요에 기인한다. IGT, LNW, ATA 등 글로벌 Top4 슬롯머신 제조사에 모두 납품하며 고객사별 60~70% 수준의 점유율을 유지 중이다.' }
    ],
    valuation:'각 부문의 상이한 사업구조와 성장성을 반영하기 위해 SOTP Valuation을 채택했다. 이에 따른 목표주가 26,500원, 상승여력 47%, 투자의견 BUY를 제시한다.',
    members:'Research Team 4',
    pdf:'assets/reports/25-1_tovis.pdf', pdfMeta:'PDF · 28 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'parksystems', name:'파크시스템스', ticker:'140860', sector:'반도체 장비', type:'Company Analysis', op:'BUY', tp:'303,000원', buy:'', cur:'204,500원', upside:'+48.2%', upNum:48.2, tpNum:303000, date:'2024.11.26', team:'Research Team 3', region:'Korea',
    headline:'Amazing Force of Microscope',
    summary:'산업용 원자현미경은 3Q24 매출 278억 원(YoY +34.8%)을 기록하며 견조한 성장세를 보였다. 원자현미경 수요 증가로 인한 Q 상승과 신제품 비중 확대에 따른 ASP 증가로 외형 성장을 이어 나갈 것으로 전망한다.',
    heroSummary:'원자현미경 M/S 1위. 25년 원자현미경 매출 YoY +38.7%를 전망한다.',
    points:[
      { title:'투자포인트 1. No.1 원자현미경', body:'반도체 공정 미세화가 주목받으며 전자현미경의 단점을 보완한 원자현미경 시장이 성장하는 가운데 M/S 1위인 동사의 4Q24 산업용 원자현미경 매출액 485억 원(YoY +53.1%)을 전망한다. 전 세계 유일한 비접촉 모드와 경사식 Z스캐너로 경쟁사와 기술력 차이를 보이며 점유율 격차를 벌리고 있다.' },
      { title:'투자포인트 2. 고객사 손잡고 정상에 파킹', body:'고객사의 선단공정 내 원자현미경 수요가 증가함에 따라 25년 원자현미경 매출액 2,387억 원(YoY +38.7%)을 전망한다. TSMC, 삼성전자, SK하이닉스 등을 고객사로 두고 있으며 칩 메이커들에게 수율 향상을 위한 정밀도 계측 장비는 필수가 되어가고 있다. 2년간 약 300억 원의 CAPEX 투자를 진행했다.' }
    ],
    valuation:'Peer PER을 채택했다. Target PER 32.8배, 12M Fwd EPS 9,230원을 적용해 12개월 목표주가 303,000원, 상승여력 48.2%, 투자의견 BUY를 제시한다.',
    members:'Research Team 3',
    pdf:'assets/reports/24-2_park_systems.pdf', pdfMeta:'PDF · 23 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'hjncs', name:'한중엔시에스', ticker:'107640', sector:'ESS/EV 부품', type:'Company Analysis', op:'BUY', tp:'62,300원', buy:'', cur:'50,400원', upside:'+24%', upNum:24, tpNum:62300, date:'2024.10.02', team:'Research Team 4', region:'Korea',
    headline:'나야, 국내 유일 수냉식',
    summary:'2분기 매출액 436억 원(QoQ +42%), 영업이익 23억 원(QoQ 흑자전환)을 달성했다. ESS 부문 매출액 228억 원(QoQ +75%)의 급격한 성장에서 기인한 것으로 추정된다. 자동차 부품 업체에서 ESS 부품 업체로 체질 개선 중이다.',
    heroSummary:'국내 유일 수냉식 냉각. 25년 ESS 매출 1,465억 원(YoY +69.9%)을 전망한다.',
    points:[
      { title:'투자포인트 1. 수냉식 날개 달고 실적 턴어라운드', body:'수냉식 냉각 시스템의 필연적 전환이 예상되는 가운데 확실한 고객사와 경쟁사 대비 높은 고객사 다변화 가능성을 보유한 동사의 실적 향상이 기대된다. 삼성SDI向 납품 제품 믹스 개선을 바탕으로 25년 ESS 매출액 1,465억 원(YoY +69.9%)이 예상된다. 유일한 경쟁사 Envicool은 중국 내수용 기업으로 대중국 규제가 리스크로 작용할 것이다.' },
      { title:'투자포인트 2. CAPA 확장, 근데 이제 효율성을 곁들인', body:'점진적 CAPA 확장을 통해 글로벌 Q를 모두 매출로 흡수할 전망이다. 25년까지 기계설비를 증설해 Q 증대(YoY +9.2%)가 전망된다. 공장을 증설하지 않고 기계 도입만으로 즉각적으로 CAPA를 확장시켜 효율적으로 대응하며 비용을 절감할 계획이다. 국내 최대 규모의 브레이징 라인 설비를 보유하고 있다.' }
    ],
    valuation:'Peer PER Method를 채택했다. ESS 산업 내 수냉식 냉각시스템으로의 전환 수혜와 ESS 사업부문을 필두로 한 증익을 함께 반영했다. 목표주가 62,300원, 상승여력 24%, 투자의견 BUY를 제시한다.',
    members:'Research Team 4',
    pdf:'assets/reports/24-2_hjncs.pdf', pdfMeta:'PDF · 24 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'hanwhaocean', name:'한화오션', ticker:'042660', sector:'조선', type:'Company Analysis', op:'BUY', tp:'37,900원', buy:'', cur:'30,600원', upside:'+24%', upNum:24, tpNum:37900, date:'2024.10.02', team:'Research Team 6', region:'Korea',
    headline:'한화, 드디어 오션네',
    summary:'2Q24 매출액 2조 5,361억 원(QoQ +11%), 영업이익 -97억 원으로 1Q 턴어라운드 후 일회성 비용 반영으로 적자 전환했다. 하반기에는 생산 안정화와 적자선박 해소에 따른 안정적 매출 인식을 전망한다.',
    heroSummary:'특수선과 MRO. 26년 특수선 매출 1조 5,505억 원(YoY +64%)을 전망한다.',
    points:[
      { title:'투자포인트 1. 특수선으로 새로운 특별함', body:'MRO 시장의 주요 플레이어로서 국내 MRO 매출은 25E 396억 원에서 26E 634억 원(YoY +60%)으로 전망된다. 강점인 특수선 매출액은 25E 9,421억 원에서 26E 1조 5,505억 원(YoY +64%)이 예상되며, 자체 개발 원천 설계 기술 보유와 수주 레퍼런스로 쌓인 기술적 신뢰에 기인한다. 캐나다 6,388억, 폴란드 5,981억의 수주가 기대된다.' },
      { title:'투자포인트 2. 상선으로 올라가는 힘', body:'컨테이너선 매출 25E 1,675억 원을 전망한다. 3Q23 적자호선 해소와 머스크 물량 확보에 기인하며, LNG선 매출액은 24E 5.6조 원, 25E 5.3조 원으로 전망된다. LNG터미널 수주잔고 추가 확보 3.8조 원이 기대되며, VLCC 부문은 선박 연령 상승에 따른 교체주기 도래와 중국 슬롯 포화로 수주 확대가 기대된다.' }
    ],
    valuation:'Implied PBR 기법을 사용했다. 현재 수주물량의 인식이 예상되는 26E BPS 21,259원에 PBR 1.78배를 적용해 목표주가 37,900원, 상승여력 24.0%를 제시한다.',
    members:'Research Team 6',
    pdf:'assets/reports/24-2_hanwha_ocean.pdf', pdfMeta:'PDF · 26 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'vt', name:'브이티', ticker:'018290', sector:'화장품', type:'Company Analysis', op:'BUY', tp:'58,000원', buy:'', cur:'34,800원', upside:'+66.7%', upNum:66.7, tpNum:58000, date:'2024.07.31', team:'UIC 투자콘서트 대상', region:'Korea',
    headline:'Q티? P리티? C큐리티? → 브이티!',
    summary:'1Q24 매출 1,018억 원(YoY +113%), 영업이익 240억 원(YoY +3,766%)의 역대 최고 실적을 기록하며 리들샷의 성장성을 증명했다. 2Q24는 매출 1,053억 원(YoY +56%), 영업이익 236억 원(YoY +101%)을 전망한다.',
    heroSummary:'UIC 투자콘서트 대상. 리들샷이 주도하는 P·Q 성장과 C 감소.',
    points:[
      { title:'투자포인트 1. 이제 본게임, 미국 + 기타국가', body:'스킨케어 수준이 높은 일본과 한국에서 인정받은 제품력을 바탕으로 2H24부터 본격적인 미국·기타국가 Q 확보에 나선다. 3Q24부터 유통사와 협업해 미국 시장을 공략할 예정이며, 23년 3억 원에서 25년 418억 원(YoY +207%)의 미국 매출 성장이 기대된다. 4Q24에는 중국에 진출해 25년 271억 원의 중국 매출을 달성할 전망이다.' },
      { title:'투자포인트 2. 일본과 한국이 증명한 제품력', body:'일본과 한국에서의 고성장세는 25년까지 계속될 예정이다. 일본에서는 리들샷 오프라인 점포 수 확장과 유통사 인수에 힘입어 23년 1,251억 원에서 25년 2,171억 원(YoY +31%)의 매출 성장이 전망된다. 한국은 높은 P를 가진 상위 라인의 올리브영 입점과 새로운 매출처 공략으로 23년 210억 원에서 25년 1,446억 원(YoY +40%)으로 증가할 예정이다.' }
    ],
    valuation:'Peer Historical PER을 사용했다. 25년 Target PER로 아모레퍼시픽의 14년 P/E 40.42배에 40%를 할인한 24.25배를 적용해 목표주가 58,000원, 상승여력 66.7%, 투자의견 STRONG BUY를 제시한다.',
    members:'UIC 투자콘서트 대상',
    pdf:'assets/reports/24-2_vt.pdf', pdfMeta:'PDF · 20 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'naver', name:'NAVER', ticker:'035420', sector:'인터넷/플랫폼', type:'Company Analysis', op:'BUY', tp:'294,100원', buy:'', cur:'195,600원', upside:'+50.4%', upNum:50.4, tpNum:294100, date:'2024.11.26', team:'Research Team 1', region:'Korea',
    headline:'NAVER, NA는 VER써 기대돼!',
    summary:'3Q24 매출액 2조 7,156억 원, 영업이익 5,253억 원으로 6분기 연속 증가하며 최대 규모의 영업이익을 기록했다. 서치플랫폼의 견고한 검색 광고(YoY +9.5%)와 디스플레이 광고(YoY +11%)가 성장을 견인했다.',
    heroSummary:'검색과 커머스에 AI 적용. 25년 서치플랫폼 매출 YoY +13.2%를 전망한다.',
    points:[
      { title:'투자포인트 1. 이젠 검색도 광고도 NAVER', body:'25년 서치플랫폼 부문 매출액 4조 3,966억 원(YoY +13.2%)을 전망한다. 독보적인 검색 플랫폼에 AI 검색 및 광고 솔루션을 적용할 예정이다. AI 브리핑을 통해 AI 검색과 콘텐츠, 커머스의 시너지 효과를 얻을 것이며 확장 검색을 통한 광고 노출 확대는 매출 증가로 이어질 것이다.' },
      { title:'투자포인트 2. 이젠 쇼핑도 NAVER', body:'25년 커머스 부문 매출액 3조 1,935억 원(YoY +10.7%)을 전망한다. 25년 상반기 AI 쇼핑 앱 네이버플러스 스토어 출시를 앞두고 있으며 기존 멤버십 혜택 확대는 커머스 서비스 이용자 수 확대로 이어질 것이다. 네이버배송의 도입은 빠름을 우선시하는 커머스 시장에서의 경쟁력을 높일 것으로 전망한다.' }
    ],
    valuation:'Peer Historical PER Valuation을 채택했다. 25년 EPS 12,566원, Target PER 23.41배, 목표주가 294,100원, 상승여력 50.4%, 투자의견 BUY를 제시한다.',
    members:'Research Team 1',
    pdf:'assets/reports/24-2_naver.pdf', pdfMeta:'PDF · 24 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'isrg', name:'Intuitive Surgical', ticker:'ISRG', sector:'의료기기', type:'Company Analysis', op:'BUY', tp:'$765', buy:'', cur:'$537', upside:'+42.56%', upNum:42.56, tpNum:765, date:'2024.11.26', team:'Research Team 2', region:'Global',
    headline:'다빈치형 인재전형, ISRG',
    summary:'수술로봇 시장에서 독점적 지위를 공고히 하는 시스템-소모품-서비스 플랫폼 구조의 근간에는 압도적 성능의 다빈치가 있다. 3월 10년 만에 신제품 다빈치5를 출시해 또 한 번 입지 굳히기에 나섰다.',
    heroSummary:'시스템-소모품-서비스의 선순환. 25년 소모품 매출 YoY +18.9%를 전망한다.',
    points:[
      { title:'투자포인트 1. 시스템', body:'직전 모델 출시 시점인 14년보다 로봇시장의 의존도가 높아진 현시점에서, 신제품 다빈치5의 Q 확보와 P 상승, 신규 지역 진출, 새롭게 떠오르는 수익 창출방안인 리스를 통한 다빈치 시스템 25E 매출액 21.5억 달러(YoY +30%)를 전망한다.' },
      { title:'투자포인트 2. 소모품', body:'소모품은 압도적 시스템이 구축한 독점적 생태계를 지속하게 하는 핵심 매출원이다. 3Q24 소모품 매출액은 12.6억 달러(YoY +18%)로 총 매출의 62%를 차지하는 Cash Cow다. 고마진 구조와 반복 매출은 안정적인 현금흐름을 창출하며 대규모 R&D 재투자로 이어진다. 25E 소모품 매출 59.27억 달러(YoY +18.9%)를 전망한다.' }
    ],
    valuation:'Historical PER Method를 채택했다. 2025년 목표주가 $636, 상승여력 18.52%, 2026년 목표주가 $765, 상승여력 42.56%를 제시한다.',
    members:'Research Team 2',
    pdf:'assets/reports/24-2_isrg.pdf', pdfMeta:'PDF · 37 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'krafton', name:'크래프톤', ticker:'259960', sector:'게임', type:'Company Analysis', op:'BUY', tp:'516,000원', buy:'', cur:'338,000원', upside:'+52.7%', upNum:52.7, tpNum:516000, date:'2024.10.02', team:'Research Team 1', region:'Korea',
    headline:'inZOI with PUBG!',
    summary:'1H24 매출액 1조 3,729억 원, 영업이익 6,426억 원으로 역대 최대 반기 매출을 기록했다. 지속적인 업데이트를 통해 강력한 트래픽과 수익성 상승이 보장된 메가 IP를 보유하고 있으며, 다양한 장르의 신규 IP 출시를 앞두고 있다.',
    heroSummary:'인조이로 One-IP 리스크 해소. 배틀그라운드 트래픽 YTD +37.5%.',
    points:[
      { title:'투자포인트 1. 효자 IP, 배틀그라운드', body:'배틀그라운드는 YTD +37.5%의 트래픽 상승을 이루며 견조한 매출 성장을 보이고 있다. 신규 맵 업데이트, 성장형 스킨 출시, 콜라보의 다양화 등 꾸준히 새로운 콘텐츠를 업데이트한 결과다. PC는 25년 언리얼 엔진 5 도입과 26년 UGC 모드 출시를 통해, 모바일은 중국과 인도에서의 강력한 입지를 바탕으로 지속적인 성장이 전망된다.' },
      { title:'투자포인트 2. One IP? No! 인조이가 있다', body:'인조이, 다크앤다커, 서브노티카2 등의 신작 출시를 앞두고 있어 기대작인 인조이를 중심으로 연 매출 1,551억 원의 기여와 함께 One-IP 리스크를 해소할 것으로 전망한다. 4Q24 출시 예정 신작 인조이는 독점 중인 기존 경쟁작의 교체수요를 이끌고 글로벌 메가 IP로 자리잡을 것으로 전망된다.' }
    ],
    valuation:'Peer Group PER Valuation을 사용했다. 목표주가 516,000원, 상승여력 52.7%, 투자의견 BUY를 제시한다.',
    members:'Research Team 1',
    pdf:'assets/reports/24-2_krafton.pdf', pdfMeta:'PDF · 22 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'pharmaresearch', name:'파마리서치', ticker:'214450', sector:'미용/의료기기', type:'Company Analysis', op:'BUY', tp:'299,000원', buy:'', cur:'192,600원', upside:'+55%', upNum:55, tpNum:299000, date:'2024.10.02', team:'Research Team 5', region:'Korea',
    headline:'피부결을 헤엄치는 연어',
    summary:'1H24 누적 매출액 1,578억 원(YoY +29.1%), 영업이익 574억 원(YoY +29.5%)을 기록하며 역대 최대 반기 실적을 기록했다. 매출 내 수출 비중은 36.4%, 사업 비중은 의료기기 51.6%, 화장품 23.8%, 의약품 21.7%다.',
    heroSummary:'리쥬란의 동남아·중동 확장. 25년 매출원가율 10% 이상 개선을 전망한다.',
    points:[
      { title:'투자포인트 1. 든든한 기존 해외 시장, 동남아', body:'태국은 23년 리쥬란 런칭 이후 단독 유통사를 통한 병원 납품으로 꾸준한 매출이 발생하고 있으며 프리미엄 라인 리쥬란 HB 추가 런칭이 성장을 가속화할 것이다. 인도네시아는 피부 재생 트렌드 부상으로 25년 수출액 240만 달러를 기록할 것이며, 싱가포르는 런칭 후 수출 1위를 달성해 200만 달러 이상의 판매량을 기록할 것이다.' },
      { title:'투자포인트 2. 상큼하게 터져버릴 포텐셜, 이슬람 시장', body:'할랄 인증에 유리한 PN 성분을 강점으로 이슬람 시장에 빠르게 침투할 것이다. 중동은 주력 제품 리쥬란이 안티에이징에 대한 높은 관심을 바탕으로 CAGR +11%로 성장하는 스킨부스터 시장에 안착하며 25년 1,000만 달러 이상의 수출액을 달성할 것이다. 말레이시아는 25년 하반기부터 80만 달러 이상을 보여줄 것으로 기대한다.' }
    ],
    valuation:'Historical PER 방식을 사용했다. 1H23 평균 PER 21배를 적용한 목표주가 299,000원, 상승여력 55%, 투자의견 BUY를 제시한다.',
    members:'Research Team 5',
    pdf:'assets/reports/24-2_pharma_research.pdf', pdfMeta:'PDF · 21 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'tnl', name:'티앤엘', ticker:'340570', sector:'미용/의료기기', type:'Company Analysis', op:'BUY', tp:'100,000원', buy:'', cur:'71,500원', upside:'+39.9%', upNum:39.9, tpNum:100000, date:'2024.10.02', team:'Research Team 3', region:'Korea',
    headline:'Time to Level up, T&L',
    summary:'24년 2분기 기준 매출액 548억 원(YoY +50%)을 달성하며 분기 기준 최대 매출을 기록했다. 특히 73.6%의 수출 비중을 기록하며 해외에서의 강한 수요를 증명했다.',
    heroSummary:'Mighty Patch의 아마존 1위. 25년 하이드로콜로이드 매출 YoY +77%를 전망한다.',
    points:[
      { title:'투자포인트 1. 수출로 증명하는 강력한 수요', body:'해외 수출을 중심으로 강한 Q 성장이 기대된다. 주 고객사 Hero의 Mighty Patch는 아마존 Beauty & Personal Care 부문 1위로 트러블 패치 시장의 선두 주자다. CAGR +9.87%의 시장 성장과 락인 효과로 인한 점유율 확대를 바탕으로 2Q25 453억 원(YoY +21.7%)의 수출을 기록할 것으로 전망한다.' },
      { title:'투자포인트 2. C&D 손잡고 글로벌로 도약', body:'C&D를 통한 추가 유통망 확대로 추가 매출 상승세가 기대된다. CVS와 월마트를 포함한 미국 내 미입점 오프라인 매장 진출로 Mighty Patch의 입지를 확고히 할 것으로 예상한다. 유럽 신규 국가 진출 및 본격적인 오프라인 유통망 확대를 통해 25년 하이드로콜로이드 매출 1,800억 원(YoY +77%)을 달성할 것으로 전망한다.' }
    ],
    valuation:'Historical PER을 채택했다. Target PER 16.1배, 12M Fwd 당기순이익 507억 원을 적용해 목표주가 100,000원, 상승여력 39.9%, 투자의견 BUY를 제시한다.',
    members:'Research Team 3',
    pdf:'assets/reports/24-2_tnl.pdf', pdfMeta:'PDF · 23 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'silicon2', name:'실리콘투', ticker:'257720', sector:'화장품', type:'Company Analysis', op:'BUY', tp:'72,000원', buy:'', cur:'42,400원', upside:'+69%', upNum:69, tpNum:72000, date:'2024.10.02', team:'Research Team 2', region:'Korea',
    headline:'K-beauty 수출 해결사 S2',
    summary:'견조한 미국 스킨케어 시장의 성장에 더불어 카테고리 다각화를 통해 미국시장 제2차 Q 확장에 나섰다. 유럽·중동·동남아 시장에서 K-Beauty 수요가 시작되며 미국 외 국가 본격 진출이 전망된다.',
    heroSummary:'미국 밖으로 넓히는 K-뷰티. 25년 OPM 25% 개선을 전망한다.',
    points:[
      { title:'투자포인트 1. 미국, 공략할 Q 여전히 많다', body:'기초화장품은 TOP4 브랜드의 브랜드 파워를 기반한 카테고리 증설 및 낙수효과를 통한 루키 브랜드의 수요 증가로 24E 2,179억 원(YoY +86%)이 기대된다. 색조는 5월 시작된 수출 반등으로 24E 매출액 339억 원(YoY +607%) 성장이 기대되며, 홈뷰티 디바이스는 에이피알과의 계약을 통해 25E 95억 원을 전망한다.' },
      { title:'투자포인트 2. NEXT 미국, 유럽·중동·동남아', body:'세 지역 모두 인디브랜드의 진입장벽이 높아 동사에 대한 의존도가 높다. 유럽 시장은 미국을 뛰어넘는 K-Beauty 수요로 24E 매출액 734억 원(YoY +532%) 달성이 기대된다. 중동 시장은 Gen.Z 세대 Q 확보로 24E 626억 원, 동남아 시장은 과거 중국의 성장성을 대체할 시장으로 24E 994억 원(YoY +75%)이 기대된다.' }
    ],
    valuation:'Historical PER을 채택했다. 12MF 목표주가 72,000원, 상승여력 69%, 투자의견 BUY를 제시한다.',
    members:'Research Team 2',
    pdf:'assets/reports/24-2_silicon2.pdf', pdfMeta:'PDF · 41 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'douzone', name:'더존비즈온', ticker:'012510', sector:'AI 소프트웨어', type:'Company Analysis', op:'BUY', tp:'96,500원', buy:'', cur:'67,800원', upside:'+42%', upNum:42, tpNum:96500, date:'2024.11.26', team:'Research Team 5', region:'Korea',
    headline:'더 좋은 뷰죠! 더존비즈온',
    summary:'클라우드 전환에 발맞춘 신제품 전환으로 매출구조 전환을 이끌어내고 있다. 클라우드 제품의 특성으로 비용 절감을 이뤄내고 반복매출로 업셀링의 기회를 잡았으며, AI 어시스턴트 도입으로 선순환을 만들어냈다.',
    heroSummary:'클라우드 매출 비중 60%로. One AI로 최소 200억 원의 추가 매출을 전망한다.',
    points:[
      { title:'투자포인트 1. 클라우드 전환의 수혜자, 더존', body:'25년 온프레미스 제품 위주의 매출구조를 60% 이상 클라우드 제품 매출로 바꿔갈 예정이다. AI의 발전 속에서 기업들이 클라우드 전환을 필수적으로 요하는 상황은 매출구조의 순조로운 변화를 의미하며, 비용 절감과 반복현금 창출로 업셀링 기회 창출을 시사한다.' },
      { title:'투자포인트 2. AI로 이익은 곱하고 비용은 나누고', body:'One AI라는 제품으로 최소 200억 원의 추가 매출을 실현시킬 것이다. One AI는 기존 타사 대비 차별화된 기술을 가진 AI 어시스턴트로 업무효율을 약 67% 절감시킬 수 있으며, 미래 수요도 충분히 남아 있어 잠재고객의 10%만 사용해도 위와 같은 수치가 나타날 것이다.' }
    ],
    valuation:'18~20년 클라우드 사이클 및 WEHAGO 출시를 통한 클라우드 전환을 반영해 Historical PER 방식을 사용했다. 목표주가 96,500원, 상승여력 42%, 투자의견 BUY를 제시한다.',
    members:'Research Team 5',
    pdf:'assets/reports/24-2_douzone.pdf', pdfMeta:'PDF · 24 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'kyungdong', name:'경동나비엔', ticker:'009450', sector:'보일러/온수기', type:'Company Analysis', op:'BUY', tp:'131,800원', buy:'', cur:'77,200원', upside:'+71%', upNum:71, tpNum:131800, date:'2024.11.26', team:'Research Team 4', region:'Korea',
    headline:'겨울엔 경(冬) 나비엔',
    summary:'3Q24 매출 3,237억 원(YoY +14.3%), 영업이익 368억 원(YoY +67.3%)을 기록했다. 독자적 기술 콘덴싱과 독보적 가격 경쟁력을 기반으로 난방기기의 친환경·에너지효율화 트렌드에 따른 수혜를 받을 것으로 전망된다.',
    heroSummary:'북미 온수기 교체주기 도래. 25년 영업이익 YoY +26%를 전망한다.',
    points:[
      { title:'투자포인트 1. 온수기 바꿀 때 됐잖아?', body:'25E 북미 온수기 매출액 6,532억 원(YoY +10.01%)을 전망한다. 모기지 사태 이전 착공된 주택의 교체주기 도래, 플리핑에 따른 교체수요 증가, CAPA 증설에 기인한다. 04~07년 착공된 주택의 온수기 교체 수요가 28E까지 지속되고, 증축된 서탄 공장 CAPA가 Q 증가를 모두 흡수해 향후 4년간 실적 개선세가 지속될 것으로 전망된다.' },
      { title:'투자포인트 2. 퍼니스로 Funny한 실적', body:'4Q24E 신제품 콘덴싱 하이드로 퍼니스 매출액 96억 원, 25E 매출액 776억 원 달성을 전망한다. 높은 AFUE와 북미 최초 Wave to Air 방식 채택, 절대적 가격 우위에 근거해 북미지역에서 성공적으로 신시장 개척을 이뤄낼 것으로 판단한다. 3,300개 이상의 유통망과 18년간 쌓아온 브랜드 신뢰도가 M/S 확대를 뒷받침한다.' }
    ],
    valuation:'Peer PER Method를 채택했다. 신시장 진출 기대감과 북미 지역을 필두로 한 증익을 함께 반영해 목표주가 131,800원, 상승여력 71%, 투자의견 BUY를 제시한다.',
    members:'Research Team 4',
    pdf:'assets/reports/24-2_kyungdong.pdf', pdfMeta:'PDF · 29 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'skgas', name:'SK가스', ticker:'018670', sector:'에너지/유틸리티', type:'Company Analysis', op:'BUY', tp:'324,000원', buy:'', cur:'209,500원', upside:'+55%', upNum:55, tpNum:324000, date:'2024.11.26', team:'Research Team 6', region:'Korea',
    headline:'돈($)가스 좋아하세요?',
    summary:'3Q24 매출액 1조 7,338억 원(QoQ +5%), 영업이익 430억 원(QoQ +8.4%)이 발생했다. LNG 터미널과 UGPS는 4Q부터 상업운전을 시작할 것으로 예상되며, 매출액은 24E 8.8조 원, 25E 9.3조 원으로 전망한다.',
    heroSummary:'UGPS·KET 상업운전 개시. 25년 배당수익률 6.21%를 전망한다.',
    points:[
      { title:'투자포인트 1. 처음 뵙겠습니다, UGPS/KET입니다', body:'UGPS 매출액 25년 1조 417억 원, 26년 1조 3,097억 원(YoY +26%)을 전망한다. UGPS는 대표 산업단지인 미포에 위치해 높은 배후수요를 기반으로 규모의 경제 실현이 가능하다. 경쟁사와 다르게 현물장기계약 형태로 LNG를 직도입 중이며, 높은 원가 경쟁력과 혼합발전 방식의 높은 효율성으로 25년 본격 매출화가 기대된다.' },
      { title:'투자포인트 2. 이거 두고 가셨어요, 배당금', body:'복합발전소 상업운전이 25E부터 온기로 반영됨과 동시에 주주 환원 규모 확대가 기대된다. DPS는 24E 8,000원에서 25E 13,000원(YoY +62%)으로 전망된다. 24년 이후 배당정책 변화로 배당금의 절대액 증가와 자회사 순이익을 활용한 배당이 가능하며, 현재 주가 대비 25E 배당수익률은 6.21%다.' }
    ],
    valuation:'Historical PBR method를 채택했다. PDH 사업이 본격화된 16년도와 유사하다고 판단해 25년 예상 BPS 390,752원과 16년 평균 PBR인 Target PBR 0.83배를 적용, 목표주가 324,000원, 상승여력 55%, 투자의견 BUY를 제시한다.',
    members:'Research Team 6',
    pdf:'assets/reports/24-2_sk_gas.pdf', pdfMeta:'PDF · 35 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'hivision', name:'하이비젼시스템', ticker:'126700', sector:'IT', type:'Company Analysis', op:'BUY', tp:'39,300원', buy:'', cur:'23,500원', upside:'+67.2%', upNum:67.2, tpNum:39300, date:'2024.05.28', team:'Research Team 2', region:'Korea',
    headline:'하이비젼시스템: Time to move High',
    summary:'카메라 모듈 검사 사업에 주력하고 있으며 비수기임에도 1Q24 매출 482억 원(YoY +30.1%), 영업이익 56억 원(YoY +26.6%)의 양호한 실적을 거뒀다. 24~25년에도 안정적인 본업에 이은 신사업 진출 및 자회사 실적 증가로 매출 상승이 전망된다.',
    heroSummary:'아이폰 16 폴디드 줌 확장. 24년 2차전지 검사장비 매출 YoY +288%를 전망한다.',
    points:[
      { title:'투자포인트 1. 카메라 모듈 검사, 본업 잘해요', body:'주력사업인 카메라 모듈 검사장비에서 호조를 이어 나갈 전망이다. 주 고객사 Apple의 아이폰 16 폴디드 줌 적용 모델 확장으로 장비 ASP 성장이 전망되며 스마트폰向 매출은 24E 1,072억 원(YoY +19%)이 예상된다. MR 시장 개화로 카메라 센서 수요가 발생함에 따라 24E 114억 원(YoY +13%)의 매출 확보가 가능하다.' },
      { title:'투자포인트 2. 신사업 진출도 날씨 맑음', body:'본업의 기술력을 바탕으로 2차전지·바이오·반도체 등 신사업 확장에 힘쓰고 있다. 21년부터 개발에 착수한 2차전지 검사장비는 협력사 세방으로부터의 안정적인 수주와 수주 공정 확장으로 24E 매출 718억 원(YoY +288%)이 기대된다. 바이오 사업부는 기존 ASP의 절반 수준의 가격경쟁력으로 24E 90억 원의 매출이 기대된다.' }
    ],
    valuation:'Peer Historical PER을 채택했다. 이에 따라 목표주가 39,300원, 상승여력 67.2%, 투자의견 BUY를 제시한다.',
    members:'Research Team 2',
    pdf:'assets/reports/24-1_hivision.pdf', pdfMeta:'PDF · 19 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'gev', name:'GE Vernova', ticker:'GEV', sector:'에너지', type:'Company Analysis', op:'BUY', tp:'$220', buy:'', cur:'$177.43', upside:'+24%', upNum:24, tpNum:220, date:'2024.05.28', team:'Research Team 5', region:'Global',
    headline:'Gas, Electrification, Wind',
    summary:'24년 1분기 매출액 72.6억 달러(YoY +6.4%)를 달성하며 분사 이후 견고한 Top-line 성장을 증명했다. 2억 9,200만 달러의 영업 적자를 기록했으나 EBITDA 흑자 전환을 시작으로 24년 실적 턴어라운드, 25년 모든 부문의 수익성 증가가 가능할 것으로 전망한다.',
    heroSummary:'LNG 과잉투자 사이클의 수혜. 25년 Electrification 매출 80억 달러를 전망한다.',
    points:[
      { title:'투자포인트 1. Top-line 성장의 근간, Equipment', body:'돌아온 LNG Over Investment Cycle의 수혜로 가스발전 장비 수주의 빠른 증가를 예상한다. 안정적인 대량의 전기를 필요로 하는 매크로 환경에 맞물려 LNG 사이클은 가스터빈 발전의 매력도를 증가시켰다. 동사는 50%가 넘는 가스터빈 M/S를 기반으로 차별화된 기술력을 결합해 이번 사이클에서 승기를 잡을 것으로 전망한다.' },
      { title:'투자포인트 2. 큰 그림 Grid', body:'25년 Electrification 사업부의 약 80억 달러 매출 달성을 전망한다. 밸류체인 상단 데이터센터 전력 수요와 미국의 노후화된 전력망 교체 수요가 맞물리는 상황에서 전방 수주의 기대감은 확실하다. 동 사업부 수주잔고 마진은 5% 증가하며 원활한 수주 계약 이행능력을 보여줬다.' }
    ],
    valuation:'SOTP Valuation 방식을 채택했다. 25년 Total EBITDA 45억 달러, EV/EBITDA 12.75배를 적용해 목표주가 220달러, 상승여력 24%, 투자의견 BUY를 제시한다.',
    members:'Research Team 5',
    pdf:'assets/reports/24-1_ge_vernova.pdf', pdfMeta:'PDF · 19 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'samyang', name:'삼양식품', ticker:'003230', sector:'음식료', type:'Company Analysis', op:'BUY', tp:'453,000원', buy:'', cur:'343,500원', upside:'+32%', upNum:32, tpNum:453000, date:'2024.05.16', team:'SOHKA Research Team', region:'Korea',
    headline:'불닭 제국은 해가 지지 않는다',
    summary:'1Q24 매출액 3,858억 원(YoY +57%), 영업이익 800억 원(YoY +206%)을 기록했다. 라면 수출 매출액 2,860억 원(YoY +85%)과 해외의 높은 ASP가 영업이익 성장을 이끌었다. 수출 확대와 원재료 스프레드 개선을 바탕으로 기록적인 성장이 지속될 전망이다.',
    heroSummary:'수출 피크아웃은 아직 이르다. 미국 오프라인 채널 확대로 27년까지 CAGR +44%를 전망한다.',
    points:[
      { title:'투자포인트 1. 해외 외형성장', body:'ASP가 높은 미국에서 오프라인 채널 확대로 27년까지 CAGR +44%의 고성장을 전망한다. 중국은 온라인 채널 정비와 마케팅 효과로 24년 YoY +23% 성장이 기대되고, 인도네시아는 법인 설립으로 M/S 회복과 매출액 YoY +48% 성장이 가능한 시점이다.' },
      { title:'투자포인트 2. CAPA 이상 무', body:'늘어나는 수요와 유통망에 비해 CAPA는 아직 부족하다. 2025년 5월 완공 예정인 밀양 2공장과 함께 2025년 상반기 CAPA 5억 개를 수용할 추가 공장 설립을 예상한다. 신규 공장을 위한 현금흐름에도 문제가 없어 가동률 상승과 함께 2028년까지 꾸준한 매출 성장이 기대된다.' },
      { title:'투자포인트 3. SNS 최강자 불닭', body:'식음료 사업에서 노출도는 매출과 직결되며, 구글 검색량과 해외 매출의 상관관계는 0.8로 높다. 숏폼 레시피와 관련 영상·게시물 증가를 바탕으로 2023년부터 해외 매출이 급성장했다. SNS와 유튜브의 영향력 확대가 동사 매출에 계속 긍정적으로 작용할 것으로 기대한다.' }
    ],
    valuation:'해외 시장 확대에 따라 목표주가 453,000원, 상승여력 32%를 제시한다. 라면 기업 중 수출 수혜가 가장 크고 추가 CAPA 확장이 전망되는 만큼, 이를 가장 잘 반영하는 DCF 절대가치평가법으로 목표가를 도출했다.',
    members:'SOHKA Research Team',
    pdf:'assets/reports/24-1_samyang.pdf', pdfMeta:'PDF · 24 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'aniplus', name:'애니플러스', ticker:'310200', sector:'미디어/엔터', type:'Company Analysis', op:'BUY', tp:'5,600원', buy:'', cur:'3,455원', upside:'+62.1%', upNum:62.1, tpNum:5600, date:'2024.04.02', team:'Research Team 2', region:'Korea',
    headline:'전지적 애니플러스, 주가는 A+',
    summary:'일본 애니메이션 사업에 주력하는 동사는 23년 매출액 1,113억 원(YoY +93%), 영업이익 229억 원(YoY +131%)을 기록했다. 콘텐츠 매출 부문 603억 원(YoY +102%), 상품 부문 265억 원(YoY +62%), 기타 부문 246억 원(YoY +105%)으로 모든 사업부 흑자 달성에 성공했다.',
    heroSummary:'국내 애니 유통 85% 점유. 라프텔 동남아 6개국 진출로 24년 196억 원을 전망한다.',
    points:[
      { title:'투자포인트 1. 우린 버릴 사업부가 없다', body:'국내 애니메이션 유통업계의 85% 점유율을 차지하는 동사는 고성장하는 애니메이션 수출 시장의 독점적 수혜를 받을 예정이다. 서브컬쳐의 대중화에 따라 AGF 행사의 Q 성장과 콜라보 카페를 통한 MD 사업의 P·Q 성장으로 애니플러스 개별 매출액은 24E 427억 원(YoY +12%)으로 증가할 전망이다.' },
      { title:'투자포인트 2. 해외시장 총알 장전 완료', body:'국내 시장 장악에 성공한 동사는 24년 해외 Q 확보에 돌입한다. 라프텔의 동남아 6개국 진출 성공 요인은 동남아 성공 경험 보유, 경쟁사 부재, 마니아층 수요 관측이다. 동남아 진출 성공으로 24E 196억 원의 매출이 발생할 예정이며, 미디어앤아트는 2Q24 그라운드시소 싱가포르 지점 확대가 예상된다.' }
    ],
    valuation:'SOTP EV/EBITDA를 채택했다. 이에 따라 목표주가 5,600원, 상승여력 62.1%, 투자의견 BUY를 제시한다.',
    members:'Research Team 2',
    pdf:'assets/reports/24-1_aniplus.pdf', pdfMeta:'PDF · 33 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'gtf', name:'글로벌텍스프리', ticker:'204620', sector:'금융서비스', type:'Company Analysis', op:'BUY', tp:'8,300원', buy:'', cur:'4,610원', upside:'+80%', upNum:80, tpNum:8300, date:'2023.11.28', team:'Research Team 3', region:'Korea',
    headline:'GTF, 텍스리펀이 주는 GiFT',
    summary:'3Q23 매출액 261억 원(YoY +109.5%), 영업이익 38억 원으로 흑자전환하며 4Q19 이후 분기 최대 실적을 달성했다. 팬데믹 기간 비용구조 개선 작업에 따른 결과로 보이며, 고정비 효과로 개선될 영업이익률 상승 여력은 아직 남아 있다고 판단한다.',
    heroSummary:'중국 단체관광 재개와 파리 올림픽. 태국 진출 시 매출 152억 원을 전망한다.',
    points:[
      { title:'투자포인트 1. 높이뛰기 신기록에 도전하는 국내법인', body:'수수료 사업은 P(인당 구매력)와 Q(관광객수)로 정의된다. 올해 매출을 끌어올렸던 P는 2024년에도 의료관광 확대와 환급한도 개정안을 바탕으로 높은 수준을 유지할 전망이다. Q의 경우에도 역대 최장기간의 춘절 연휴를 앞두고 중국 단체관광 재개 효과가 가시화됨에 따라 1Q24 방한 중국인 수가 19년도의 80% 이상을 회복할 전망이다.' },
      { title:'투자포인트 2. 멈출 줄 모르는 해외법인', body:'싱가포르 법인은 열대기후 지역의 겨울철 성수기 효과로 Q의 반등이 기대되며 24년 부가가치세율 인상으로 P 상승 또한 예정되어 있다. 프랑스 법인은 24년 파리 올림픽의 영향으로 매출 성장이 이어질 것으로 판단한다. 새로운 해외 진출 시장으로는 유럽과 동남아시아에 주목하며, 태국 진출 시 매출액이 152억 원에 이를 것으로 예상한다.' }
    ],
    valuation:'Historical PER Valuation을 채택했다. 2019년 평균 PER인 23.94배를 적용해 Base case 목표주가 8,300원, 상승여력 80%를 제시하며, 태국 진출 시 Bull case 목표주가는 10,300원이다.',
    members:'Research Team 3',
    pdf:'assets/reports/23-2_gtf.pdf', pdfMeta:'PDF · 26 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'anet', name:'Arista Networks', ticker:'ANET', sector:'네트워크 장비', type:'Company Analysis', op:'BUY', tp:'$279', buy:'', cur:'$218', upside:'+28%', upNum:28, tpNum:279, date:'2023.11.28', team:'Research Team 4', region:'Global',
    headline:'아리스타 상향 스위치 ON',
    summary:'3Q23 매출액 15.09억 달러(YoY +28.3%), 영업이익 6.02억 달러(YoY +44.4%)를 기록했다. 생성형 AI 시장의 확장 및 빅테크 기업들의 CAPEX 투자 확대를 통해 2022년부터 CAGR 45%의 높은 매출액 성장률을 보여주고 있다.',
    heroSummary:'GPU 랠리를 잇는 네트워크 장비. 100G 이상 이더넷 스위치 점유율 1위.',
    points:[
      { title:'투자포인트 1. 빅테크 CAPEX가 곧 실적이다', body:'LLM 학습을 위해 고성능이면서도 많은 양의 GPU가 필요하다. 고성능의 GPU가 연산을 한다면 연산할 데이터를 가져다주는 네트워크 장비가 필요하며, 동사는 해당 네트워크 장비를 가장 잘 만들 기업이 될 것이다. GPU의 주가 상승 랠리가 그대로 적용될 기업으로 판단한다.' },
      { title:'투자포인트 2. 처음부터 클라우드를 위해 만들어진 기업', body:'이전 스위치 기업들이 수직계열화를 통해 매출을 늘려왔다면 동사는 높은 수준의 소프트웨어를 제작하는 클라우드 업체들에 부합하는 호환성 높은 장비를 생산해왔다. 이에 100G 이상 이더넷 스위치에서 점유율 1위를 달성했다. 빅테크들이 결성한 이더넷 컨소시엄과 기존의 호환성·가격 경쟁력은 인피니밴드를 앞서갈 이유로 충분하다.' }
    ],
    valuation:'24F EPS $7.58에 Target P/E 34배를 적용해 12개월 목표주가 $279, 상승여력 28%를 제시한다.',
    members:'Research Team 4',
    pdf:'assets/reports/23-2_arista.pdf', pdfMeta:'PDF · 20 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'hybe', name:'하이브', ticker:'352820', sector:'엔터/미디어', type:'Company Analysis', op:'BUY', tp:'360,000원', buy:'', cur:'238,000원', upside:'+51.3%', upNum:51.3, tpNum:360000, date:'2023.10.02', team:'Research Team 6', region:'Korea',
    headline:'Super High브',
    summary:'23E 매출액 2조 4,586억 원, 당기순이익 3,790억 원, 24E 매출액 3조 274억 원, 당기순이익 4,708억 원을 전망한다. 앨범 모멘텀 확보와 위버스 플랫폼 성장, 미국 시장 점유율 확대가 성장을 견인할 전망이다.',
    heroSummary:'앨범과 콘서트, 위버스. 하반기 모객수 41% 증가를 전망한다.',
    points:[
      { title:'투자포인트 1. 팬덤 유입으로 상승하는 앨범, 콘서트 수익', body:'하반기 앨범 모멘텀을 확보하여 꾸준한 팬덤 확대를 노린다. 앨범 판매량 73%를 차지하는 구보 판매 상승에 주목할 때 신규 팬 유입이 빠르게 이루어짐을 알 수 있으며, 팬덤 확장에 따라 앨범 판매량이 늘어날수록 영업레버리지 효과를 얻을 수 있다. 올 하반기 41%의 모객수 증가가 예상되는 공연 매출액 또한 타사 대비 월등한 실적을 보이고 있다.' },
      { title:'투자포인트 2. 위버스, 새로운 플랫폼 수익 기대', body:'플랫폼 위버스는 차별화된 서비스로 플랫폼 시장을 점유할 것으로 전망한다. 글로벌 시장 확장에 강점을 가지고 있다는 점과 전용 서비스에 따른 가입자 유치 효과로 타사보다 6배 이상 높은 약 3,100억 원의 매출액을 기록했다. MAU는 SM 아티스트의 입점 및 서비스 확장으로 가파른 성장세를 지속할 것으로 기대된다.' }
    ],
    valuation:'Peer Group을 산정하여 Target PER 31.87배를 적용했다. 목표주가 360,000원, 상승여력 51.3%를 제시한다.',
    members:'Research Team 6',
    pdf:'assets/reports/23-2_hybe.pdf', pdfMeta:'PDF · 18 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'celltrion', name:'셀트리온', ticker:'068270', sector:'제약/바이오', type:'Company Analysis', op:'BUY', tp:'203,000원', buy:'', cur:'173,100원', upside:'+17.3%', upNum:17.3, tpNum:203000, date:'2023.05.28', team:'Research Team 4', region:'Korea',
    headline:'셀트리온, 돈 벌 준비 ON',
    summary:'1Q23 매출액 5,975억 원(YoY +8.5%), 영업이익 1,824억 원(YoY +28.2%)을 기록하며 컨센서스에 부합했다. 주요 바이오시밀러인 램시마SC와 트룩시마가 각각 1,613억 원, 1,135억 원을 기록하며 총매출의 68%를 차지했다.',
    heroSummary:'휴미라 특허 만료와 유플라이마. 램시마 유럽 합산 점유율 60.6%.',
    points:[
      { title:'투자포인트 1. 유플라이마, 최대 매출 성장의 기회', body:'휴미라 바이오시밀러 유플라이마는 강력한 성장 모멘텀으로 작용할 것이다. 지난 10년간 글로벌 매출 1위를 기록한 휴미라가 올해 미국에서 특허가 만료되며 바이오시밀러 간 경쟁이 치열할 전망이다. 유플라이마는 First Mover 그룹, 고농도 제형, 대체처방 허가 확보 등 7가지 측면에서 경쟁 우위를 가지며 7월 출시 예정이다.' },
      { title:'투자포인트 2. 램시마SC, 시장 패러다임 변화를 선도', body:'램시마SC와 램시마IV는 투트랙으로 시너지를 발휘하고 있다. 램시마SC는 레미케이드 시장에서 유일한 피하주사 제형이라는 독보적인 경쟁력을 가진다. 유럽 시장에서 두 제품의 합산 점유율은 4Q22 기준 60.6%를 기록하며 과점 체제를 형성하고 있다. 하반기 FDA 승인을 앞둔 램시마SC는 미국 시장에서 동반 상승을 이룰 전망이다.' }
    ],
    valuation:'DCF Valuation 방법을 채택했다. 유사한 사업을 영위하는 Peer Group 산정이 어렵고 10년 이내 출시를 앞둔 다수의 파이프라인이 존재하는 점에 근거한다. Base case 목표주가 203,000원, 상승여력 17.3%, Bull case 목표주가 257,000원, 상승여력 48.5%를 제시한다.',
    members:'Research Team 4',
    pdf:'assets/reports/23-1_celltrion.pdf', pdfMeta:'PDF · 18 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'apple', name:'Apple', ticker:'AAPL', sector:'IT', type:'Company Analysis', op:'BUY', tp:'$192.6', buy:'', cur:'$164.9', upside:'+16.8%', upNum:16.8, tpNum:192.6, date:'2023.04.02', team:'Research Team 3', region:'Global',
    headline:'나스닥의 사과에 중력은 없다',
    summary:'1Q23 매출액은 1,172억 달러(YoY -5%), 영업이익은 360억 달러(YoY -13%)로 하락세를 기록했다. 매출 약세의 원인은 강달러, 코로나로 인한 아이폰 공급망 블락, 전쟁과 인플레이션 등 불안정한 매크로를 꼽는다.',
    heroSummary:'하드웨어 구독 서비스와 중국 리오프닝. 프리미엄 시장의 ASP 상승을 전망한다.',
    points:[
      { title:'투자포인트 1. Innovative Business Model, 아이폰 구독 서비스', body:'성장이 둔화된 스마트폰 시장에 하드웨어 구독 서비스로 대응하여 꾸준한 성장이 가능하다. 리스 형태의 판매 서비스 전략으로 단순 판매보다 더 큰 이익이 발생하며, 구조화된 구독료를 통해 매출액 계절성을 희석시킬 수 있다. 서비스 전략 노하우, 다수의 충성 고객, 스마트폰 소비 트렌드를 근거로 구독 서비스 도입이 용이하다고 판단된다.' },
      { title:'투자포인트 2. 애플에 우호적인 중국 시장의 회복', body:'아이폰은 중국 내 프리미엄 휴대폰에 대한 수요를 독차지하고 있다. 중국의 봉쇄와 정저우 공장 생산 차질이 직전분기 실적 하향으로 이어졌으나 정저우 공장이 재가동하며 수요를 다시 소화할 전망이다. 지급준비율 인하로 유동성이 확보되었고 소비 증진 시점이 아이폰 15 출시 시점과 맞물리는 점은 분명한 호재다.' }
    ],
    valuation:'DCF Valuation 방법을 채택했다. 투자의견 BUY, 12개월 목표주가 $192.6, 상승여력 16.8%를 제시한다.',
    members:'Research Team 3',
    pdf:'assets/reports/23-1_apple.pdf', pdfMeta:'PDF · 14 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'tesla', name:'Tesla', ticker:'TSLA', sector:'자동차/모빌리티', type:'Company Analysis', op:'BUY', tp:'$279', buy:'', cur:'$182', upside:'+52.9%', upNum:52.9, tpNum:279, date:'2022.12.06', team:'Research Team 3', region:'Global',
    headline:'신(新)세계의 새로운 신(信)이 되는거다',
    summary:'3Q22 기준 매출액 214.5억 달러(YoY +55.9%), 영업이익 36.8억 달러(YoY +79.5%)를 달성해 높은 성장성과 안정성을 동시에 갖추게 되었다. 그럼에도 주가는 내재가치에 맞지 않는 평가를 받고 있으며, 단순 완성차 업체와 비교한 멀티플은 동사의 가치를 제대로 평가하지 않는다.',
    heroSummary:'배터리 100% 내재화와 FSD. 모빌리티 선두 기업으로의 재평가를 전망한다.',
    points:[
      { title:'투자포인트 1. IRA와 100% 내재화', body:'미국은 22년 8월 IRA 법안을 추진하여 공급망 개편 및 산업 자동화를 목표에 두고 미국 내 생산 여부로 광물 정책을 정치적으로 이용하기 시작했다. 포드·GM과 같이 합작법인을 세워 배터리를 공급받는 것과 달리 동사는 100% 내재화를 추진하며, 전기차 마진의 핵심인 원가 절감 능력에서 동류 기업 대비 우위에 있다.' },
      { title:'투자포인트 2. 모빌리티는 테슬라가 주도', body:'소프트웨어 사업의 FSD 기술로 타 완성차 대비 10년 정도의 기술 격차를 만들었으며, 이연수익으로 계상되어 1Q22에서 3Q22로 약 28억 달러의 40% 성장을 입증했다. ESS 사업부의 리사이클링은 흑자 전환으로 사업성을 인정받았고 광물이 미국산으로 인정되어 IRA 수혜가 기대된다. 자동차 사업부는 세미트럭과 사이버트럭 출시로 모멘텀을 만들었다.' }
    ],
    valuation:'PER Valuation을 채택했다. 재무적 안정성과 성장 여력이 충분함에도 주가가 과도한 낙폭을 보인다고 판단해 목표주가 $279, 상승여력 52.9%, 투자의견 BUY를 제시한다.',
    members:'Research Team 3',
    pdf:'assets/reports/22-2_tesla.pdf', pdfMeta:'PDF · 17 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'sm', name:'에스엠', ticker:'041510', sector:'엔터테인먼트', type:'Company Analysis', op:'BUY', tp:'113,000원', buy:'', cur:'77,200원', upside:'+46.4%', upNum:46.4, tpNum:113000, date:'2022.11.28', team:'Research Team 1', region:'Korea',
    headline:'Star Museum, 살아있는 아이돌 박물관',
    summary:'2023년 매출액 9,969억 원, 당기순이익 1,086억 원을 추정한다. 다양한 포트폴리오를 확보하고 있는 만큼 아티스트들의 컴백이 공백 없이 이루어져 콘서트와 앨범 모두 가파른 성장을 보이고 있다.',
    heroSummary:'엔터 4사 중 최다 모객. 2023년 태민·백현 전역으로 포트폴리오가 강화된다.',
    points:[
      { title:'투자포인트 1. 탄탄한 음반과 콘서트', body:'콘서트 부문에서 2~4세대 모두 활발한 활동을 보이며 2022년 엔터 4사 중 가장 많은 관객을 모객했다. 앨범 부문에서는 매 분기 역대 최고 판매량을 갱신하고 있으며, 에스파는 미니 2집으로 걸그룹 최초 초동 밀리언셀러를 달성했다. 레드벨벳의 구보 판매량 증가와 NCT의 연속 더블밀리언셀러가 안정적으로 매출을 견인한다.' },
      { title:'투자포인트 2. 에스엠만의 세계관에 Lock-In', body:'Super-M은 샤이니, EXO, NCT 127, WayV 멤버들로 구성된 프로젝트 보이그룹으로 데뷔와 동시에 빌보드200 정상에 올랐다. 이는 SM이라는 브랜드 가치를 중시하는 기존 팬덤의 힘이다. 갓 더 비트 역시 1세대부터 4세대 대표 아티스트들이 총출동한 걸그룹으로 동사만의 독보적인 세계관이 통했음을 입증했다.' }
    ],
    valuation:'Peer Group을 선정하여 Target P/E 24.6배를 산정했다. 목표주가 113,000원, 상승여력 46.4%, 투자의견 BUY를 제시한다.',
    members:'Research Team 1',
    pdf:'assets/reports/22-2_sm.pdf', pdfMeta:'PDF · 27 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'poscochem', name:'포스코케미칼', ticker:'003670', sector:'2차전지', type:'Company Analysis', op:'BUY', tp:'303,543원', buy:'', cur:'223,500원', upside:'+35.8%', upNum:35.8, tpNum:303543, date:'2022.11.27', team:'Research Team 5', region:'Korea',
    headline:'언감생심(焉敢生心) 고평가',
    summary:'글로벌 완성차 수요 회복과 함께 전기차의 가파른 침투율 상승으로 2차전지 시장은 성장할 것이다. 미국 전기차 시장의 본격적인 개화와 예정 CAPA에 못 미치는 배터리 공급량으로 배터리 수요는 지속될 전망이다.',
    heroSummary:'광물부터 리사이클까지. 풀 밸류체인이 만드는 수익성 개선을 전망한다.',
    points:[
      { title:'투자포인트 1. 수직계열화', body:'구축하고 있는 견고한 수직 계열화는 배터리 시장에서 핵심적인 전략이다. 모회사 포스코홀딩스를 통해 광물 생산부터 가공, 소재 생산, 완성차 납품, 배터리 리사이클로 이어지는 배터리 풀 밸류체인을 갖추고 있다. 광물 확보가 중요해지는 현 배터리 시장에서 핵심 광물을 안정적으로 조달받을 수 있어 수익성 개선이 확대될 것으로 전망한다.' },
      { title:'투자포인트 2. 양극재와 음극재', body:'IRA 법안 통과 이후 북미 제조시설에서의 공급이 필수적이게 되며 GM과 북미에 양극재 합작법인 얼티엄캠을 설립한 동사의 수혜는 커졌다. 음극재는 주요 거래처인 배터리 3사의 예상 매입규모 합이 62조 원을 넘고, 탈중국 흐름 속 북미 수요도 일부 충당할 것이다. 공격적인 CAPA 증대와 실리콘 음극재 개발로 중장기 성장동력까지 확보했다.' }
    ],
    valuation:'DCF Valuation 기법을 채택했다. 국내 유일의 양극·음극재 생산 기업으로 상대가치법의 비교 대상을 찾기 어렵다는 점에 근거한다. Base case 목표주가 303,543원, 상승여력 35.8%, Bull case 목표주가는 378,503원이다.',
    members:'Research Team 5',
    pdf:'assets/reports/22-2_posco_chem.pdf', pdfMeta:'PDF · 19 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'ecopro', name:'에코프로비엠', ticker:'247540', sector:'2차전지', type:'Company Analysis', op:'BUY', tp:'151,300원', buy:'', cur:'113,400원', upside:'+33%', upNum:33, tpNum:151300, date:'2022.11.27', team:'Research Team 2', region:'Korea',
    headline:'양극재 미래는 고개를 들어 BM을 보라',
    summary:'3Q22 매출액 1.6조 원(YoY +283%), 영업이익 1,409억 원(YoY +246%)으로 시장 기대치를 큰 폭으로 상회했다. 양극재 수요 증가 속 CAM5N 공장 9월 조기 가동으로 물량이 증가했고, 2분기 메탈 가격 상승에 대한 3분기 판가 인상분이 반영됐다.',
    heroSummary:'하이니켈 양극재 점유율 확대. 2023년 매출 9.59조 원(YoY +87%)을 전망한다.',
    points:[
      { title:'투자포인트 1. 넉넉한 CAPA에 실적은 ON-TRACK', body:'CAPA로 생산 가능한 글로벌 전기차는 22년 83만 대에서 26년 469.7만 대까지 증가한다. 북미 전기차 시장 규모를 감안하면 이는 북미 수요량의 90%를 충족할 수 있는 물량이다. 포드向 585GWh NCM9 수요를 감당 가능한 CAPA로 실적은 성장궤도를 달릴 전망이며, 22년 점유율은 22.9%로 대폭 확대될 예정이다.' },
      { title:'투자포인트 2. 수직계열화 및 기술에서 비롯할 수익성 증대', body:'수직 계열화 시스템을 바탕으로 한 추가 수주 확보와 자회사 에코프로이노베이션向 리튬 확보로 36%의 가격 리스크를 방어할 수 있다. Single crystal 및 망간리치 양극재 R&D를 통해 23년부터 현금흐름 및 수익성 개선이 전망된다.' }
    ],
    valuation:'RIM Valuation 방법을 채택했다. 투자의견 BUY, 12개월 목표주가 151,300원, 상승여력 33%를 제시한다.',
    members:'Research Team 2',
    pdf:'assets/reports/22-2_ecopro_bm.pdf', pdfMeta:'PDF · 22 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'hanwhaaero', name:'한화에어로스페이스', ticker:'012450', sector:'우주항공/방산', type:'Company Analysis', op:'BUY', tp:'108,000원', buy:'', cur:'71,500원', upside:'+51%', upNum:51, tpNum:108000, date:'2022.11.27', team:'Research Team 6', region:'Korea',
    headline:'한화, 하나가 된 지금부터 시작',
    summary:'러시아·우크라이나 전쟁으로 높아진 군사적 긴장감에 무기 수요가 빠르게 증가하고 있으나 주요 무기 생산 국가들은 수요를 감당하지 못하고 있다. 이에 국내 방산 업체들의 체감 수요는 빠르게 증가하고 있으며, 해외 물량의 높은 마진율에 따라 매출액과 영업이익이 큰 폭으로 상승할 전망이다.',
    heroSummary:'육해공을 아우르는 토탈 디펜스. 한국형 록히드 마틴으로의 도약을 전망한다.',
    points:[
      { title:'투자포인트 1. 엔진으로부터 시작하는 실적 상승', body:'한화에어로스페이스는 비행기 엔진부품 생산 및 수리를 영위하며 주로 엔진부품 생산·납품을 통해 기업가치를 창출하고 있다. 2015년 이후 글로벌 엔진시장 OEM업체와 RSP 및 LTA계약 확대, 우수협력사 인증 등을 통해 시장점유율을 확대하고 있다. 포스트코로나로 민항기 수요가 증가하고 퇴역항공기 수명 연장을 위한 부품 수요도 증가하는 추세다.' },
      { title:'투자포인트 2. 해양에서 우주까지, 한국형 록히드 마틴', body:'한화그룹은 육·해·공 전반을 아우르는 글로벌 토탈 디펜스를 구축하기 위해 방산부문을 한화에어로스페이스로 일원화하고 있다. 대우조선해양을 2조 원에 인수하여 함 건조 기술과 해군납품 기술력이 시너지를 낼 전망이며, 쎄트렉아이는 항공우주 사업부문을 담당하며 또 다른 성장 모멘텀이 되었다.' }
    ],
    valuation:'SOTP를 사용했다. 항공엔진, 방산, 시큐리티 및 ICT, 항공우주 4개 부문으로 나누어 각 부문가치를 추정 후 합산해 2023년 목표주가 108,000원, 상승여력 51%를 제시한다.',
    members:'Research Team 6',
    pdf:'assets/reports/22-2_hanwha_aero.pdf', pdfMeta:'PDF · 26 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'lges', name:'LG에너지솔루션', ticker:'373220', sector:'2차전지', type:'Company Analysis', op:'BUY', tp:'815,000원', buy:'', cur:'588,000원', upside:'+38.6%', upNum:38.6, tpNum:815000, date:'2022.11.08', team:'Research Team 1', region:'Korea',
    headline:'2차 어디갈래? 엔솔이 맛집이라던데',
    summary:'2025년 매출액 69조 6,520억 원, 영업이익 6조 4,890억 원을 추정한다. 유럽과 북미의 글로벌 전기차 업체 대부분을 고객으로 삼고 있어 가파르게 성장하는 전기차 시장에서 강력한 헤게모니를 가진다.',
    heroSummary:'IRA 최대 수혜. 미국 전기차 시장은 연평균 33% 성장을 전망한다.',
    points:[
      { title:'투자포인트 1. 고객은 많이, 생산기지는 넓게', body:'이제 성장국면으로 진입할 미국 전기차 시장은 연평균 33%씩 성장하며 폭발적인 증가세를 보일 것이며, 2년 전과 비교해 146% 증가한 수주잔고가 이를 보여준다. 탈중국 선두주자로서 북미 시장을 공략해 생산기지를 공격적으로 증설하고 있으며 GM, Stellantis, 혼다와 JV를 설립할 예정이다.' },
      { title:'투자포인트 2. 미국이 돕는다, IRA 법안', body:'IRA에 미국 시장에서의 전기차 보조금 적용 조건이 명시되어 국내 배터리·소재 및 완성차 업체들에 큰 영향을 미칠 것으로 예상된다. 동사는 IRA 최대수혜 업체로 평가받는 Tesla, GM 등을 고객사로 확보하고 있고 지분투자·장기공급계약과 소재업체와의 협력으로 대비를 잘해나가고 있어 글로벌 배터리 업체 중 수혜를 가장 많이 차지할 것으로 기대된다.' }
    ],
    valuation:'영업이익 성장률과 PEG를 고려해 Target P/E를 48.39배로 산정했다. 목표주가 815,000원, 상승여력 38.6%, 투자의견 BUY를 제시한다.',
    members:'Research Team 1',
    pdf:'assets/reports/22-2_lges.pdf', pdfMeta:'PDF · 24 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'koreanair', name:'대한항공', ticker:'003490', sector:'항공운송', type:'Company Analysis', op:'BUY', tp:'30,720원', buy:'', cur:'22,100원', upside:'+39%', upNum:39, tpNum:30720, date:'2022.10.04', team:'Research Team 3', region:'Korea',
    headline:'대한항공, 비상(飛上)을 꿈꾸다',
    summary:'2Q22 매출액 3조 3,324억 원(YoY +70.8%), 영업이익 7,359억 원(YoY +273.7%)을 기록했다. 리오프닝 기조로 미주노선을 중심으로 여객 수요가 가파른 회복세를 보이고 있으며, 화물운송사업에서 국내 시장 점유율 1위를 달리고 있다.',
    heroSummary:'미주 노선 회복과 화물 캐시카우. 4분기부터 여객 증가세 가속을 전망한다.',
    points:[
      { title:'투자포인트 1. 중·장거리 국제선을 필두로 한 빠른 여객 회복', body:'세계 각국의 입출국 제한 조치 완화로 여객 수요는 꾸준히 우상향할 전망이다. 국내선 탑승률은 역대 최고치를 기록했고 국제선은 전 분기 대비 약 40% 급등했다. 특히 미주 노선이 가장 빠른 회복세를 보이고 있는데, 이는 미주 노선 매출이 가장 큰 비중을 차지하는 동사에 매우 긍정적인 시그널이다.' },
      { title:'투자포인트 2. 견고한 Cash-cow로 자리매김한 화물운송', body:'부가가치가 높은 특수화물을 바탕으로 한 경쟁력과 낮은 운임 탄력성으로 화물 사업은 캐시카우로 자리매김했다. 러시아·우크라이나 전쟁과 중국 봉쇄정책 등으로 인한 공급 증가 제한으로 팬데믹 이전 대비 높은 운임단가를 유지하고 있으며, 주요 경쟁사인 중국 FSC의 여객 회복이 부진해 수혜는 지속될 전망이다.' }
    ],
    valuation:'PBR Valuation을 채택했다. 항공 운송업은 자산가치가 크고 설비가 중요하며 경기에 민감한 사이클을 띤다는 점에 근거한다. BPS 30,474원, Target PBR 1.01배를 적용해 목표주가 30,720원, 상승여력 39.0%를 제시한다.',
    members:'Research Team 3',
    pdf:'assets/reports/22-2_korean_air.pdf', pdfMeta:'PDF · 21 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'samsungbio', name:'삼성바이오로직스', ticker:'207940', sector:'제약/바이오', type:'Company Analysis', op:'BUY', tp:'1,010,000원', buy:'', cur:'807,000원', upside:'+25%', upNum:25, tpNum:1010000, date:'2022.10.02', team:'Research Team 6', region:'Korea',
    headline:'BUY할 수 밖에 없는 바이오로직스',
    summary:'22E 매출액 3조 47억 원, 영업이익 9,058억 원을 전망한다. 최대 경쟁력은 CAPA로, 생산능력과 안정성으로 직결되며 이는 곧 가격경쟁력과 수율로 이어져 기술력이 된다.',
    heroSummary:'CMO와 바이오시밀러의 양날개. 재계약 규모 1조 1,601억 원을 기록했다.',
    points:[
      { title:'투자포인트 1. CAPA, CMO 1등', body:'선제적으로 CAPA를 증설하여 높은 수준의 경쟁력을 확보할 것으로 기대된다. 빅파마들이 투자역량에 집중하며 수주물량 증가가 예상되기 때문에 수주 역시 견고할 것으로 예상한다. 지난해 기존 고객과의 재계약 규모가 전체 계약금액의 90%에 달하는 1조 1,601억 원 규모로 경쟁력에 대한 고객들의 신뢰가 두터워졌음을 알 수 있다.' },
      { title:'투자포인트 2. 위탁생산 1인자, 바이오시밀러 기술도 품었다', body:'올 4월 삼성바이오에피스를 100% 종속회사로 편입시켜 CMO 사업과 바이오시밀러 사업이라는 양날개를 확보했다. 유럽 시장의 바이오시밀러 교차처방 본격화로 시밀러 의약품은 오리지널과 동등한 효능 및 안전성을 입증받았으며, 빅파마들의 블록버스터 의약품 특허만료를 고려할 때 에피스의 매출 상승여력은 충분하다.' }
    ],
    valuation:'성장성이 높은 기업이므로 상대가치 평가는 적절하지 않다고 판단해 DCF를 채택했다. CAPA 증설에 따른 생산실적 증가율과 CDMO 시장 및 M/S 성장률을 가중평균해 목표주가 1,010,000원, 상승여력 25%를 제시한다.',
    members:'Research Team 6',
    pdf:'assets/reports/22-2_samsung_bio.pdf', pdfMeta:'PDF · 15 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'hankooktire', name:'한국타이어앤테크놀로지', ticker:'161390', sector:'자동차부품', type:'Company Analysis', op:'BUY', tp:'47,386원', buy:'', cur:'35,250원', upside:'+34.4%', upNum:34.4, tpNum:47386, date:'2022.10.02', team:'Research Team 5', region:'Korea',
    headline:'한국타이어, 넌 다 계획이 있구나!',
    summary:'2Q22 매출액 2조 400억 원(YoY +12.9%), 영업이익 1,753억 원(YoY -6.3%)을 기록했다. 매출 비중은 RE 타이어 80%, OE 타이어 20%이며, 원재료 가격 하락과 물류망 확보, 차량용 반도체 수급난 해소에 따라 타이어 수요 증가가 기대된다.',
    heroSummary:'테네시 공장 증설과 믹스 개선. RE 타이어 80% 비중이 하방을 지지한다.',
    points:[
      { title:'투자포인트 1. 미국 탄탄한 물류망 구축', body:'운임비 증가에 따른 판매지 근접 필요성, 규모의 경제 효과, 세액 공제 혜택으로 인한 가격 경쟁력 우위를 이유로 테네시 생산법인 증설 공시를 발표했다. 이는 비용 감소로 이어져 영업이익 상승으로 귀결될 것으로 판단되며, 물류망 구축의 효과로 가격 경쟁력과 제품 경쟁력을 도모할 수 있다.' },
      { title:'투자포인트 2. 한국타이어의 이익개선 활로', body:'글로벌 완성차 시장에서 SUV 신차 판매 비중은 지속적으로 상승했다. 덩치가 큰 차일수록 장착되는 타이어 크기가 커지고 SUV용 타이어는 가격이 비싸 수익성이 높다. 전기차 판매량은 226.3% 증가한 660만 대로 역대 최대를 기록했으며, 전기차 타이어는 내연기관 대비 약 20% 높은 가격으로 믹스 개선이 지속될 것으로 보인다.' }
    ],
    valuation:'12개월 목표주가 47,386원, 상승여력 34.4%, 투자의견 BUY를 제시한다.',
    members:'Research Team 5',
    pdf:'assets/reports/22-2_hankook_tire.pdf', pdfMeta:'PDF · 19 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'sungkwang', name:'성광벤드', ticker:'014620', sector:'산업재', type:'Company Analysis', op:'BUY', tp:'20,819원', buy:'', cur:'14,650원', upside:'+42%', upNum:42, tpNum:20819, date:'2022.10.02', team:'Research Team 2', region:'Korea',
    headline:'넝쿨째 굴러온 당신, LNG',
    summary:'2Q22 매출액 671억 원(YoY +84.7%), 영업이익 87억 원(흑자전환)으로 실적이 대폭 개선되었다. 2Q22 신규수주는 약 800억 원으로 8년 만에 분기 사상 최대 수주 금액을 기록했으며, 조선 및 플랜트 산업 호조에 따른 수요 증가로 해석된다.',
    heroSummary:'산업용 피팅 국내 1위. 북미 LNG 터미널 착공으로 23년 650억 원을 전망한다.',
    points:[
      { title:'투자포인트 1. 북미 LNG 터미널 착공', body:'수출 매출의 70%가 미국에서 발생하며, 25~26년 예정된 최대 규모의 미국 LNG 터미널 신규 건설과 건설 시차에 따른 22~23년 피팅 발주 수혜가 예상된다. 진행 중인 5개 터미널 프로젝트가 완공되면 25~26년 피크 수출 용량은 약 75MTPA에 달한다. 북미 프로젝트 매출을 합산하면 23년 약 650억 원의 매출이 예상된다.' },
      { title:'투자포인트 2. 중동 플랜트 건설에 따른 구조적 수혜', body:'유가 상승으로 자금력을 갖춘 중동 국가들의 LNG 플랜트 건설은 피팅 수주에 연쇄적인 영향을 미친다. 22년 하반기에는 바스라 정유공장 프로젝트와 NFE 프로젝트로 약 254억 원의 수혜가, 23년 상반기에는 아람코 프로젝트가 가세하여 약 440억 원의 매출 수혜가 기대된다.' }
    ],
    valuation:'PER Valuation 방법을 채택했다. 코로나 영향권에서 벗어나 양의 순이익이 발생하고 있으며 LNG 사이클로 중장기 고성장이 예상되는 점에 근거해 목표주가 20,819원, 상승여력 42%, 투자의견 BUY를 제시한다.',
    members:'Research Team 2',
    pdf:'assets/reports/22-2_sungkwang.pdf', pdfMeta:'PDF · 22 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'pisms', name:'PI첨단소재', ticker:'178920', sector:'소재', type:'Company Analysis', op:'BUY', tp:'40,000원', buy:'', cur:'29,850원', upside:'+34%', upNum:34, tpNum:40000, date:'2022.10.02', team:'Research Team 1', region:'Korea',
    headline:'세계 1위의 PI, 땀, 눈물',
    summary:'세계 최대 PI필름 판매량 및 생산능력으로 2014년부터 8년 연속 글로벌 PI필름 시장 1위를 지키고 있다. 2021년 말 기준 매출액 3,019억 원(YoY +15.3%), 영업이익 759억 원(YoY +26.4%)을 기록했다.',
    heroSummary:'PI필름 글로벌 1위. 2023년 CAPA 6,000톤 확대를 전망한다.',
    points:[
      { title:'투자포인트 1. 전방산업의 PI 수요 증대', body:'FPCB는 IT기기의 고성능 슬림화 추세에 따라 기존 회로기판보다 얇고 유연하며 설계 자율성이 높아 적용이 확대되고 있다. 스마트폰 배터리 용량과 디스플레이가 커지며 방열시트 면적 점유율이 증가하고 있고, 4K·8K 기술 발전과 OLED 패널 기술로 CoF 사용이 급격히 증가하고 있다.' },
      { title:'투자포인트 2. 첨단산업까지 더한 포트폴리오 다각화', body:'PI필름 및 PI바니쉬의 성장은 전방산업에서 첨단산업으로 확장되고 있다. 내열성이 높은 EV 배터리 절연용 PI필름을 사용하면 20%의 무게 경량화가 가능해 전기차 시장에서 수요가 증가하고 있다. 자체 연구역량으로 개발한 PI파우더의 적용범위도 항공우주, 반도체, 자동차까지 확대되는 추세다.' }
    ],
    valuation:'2023년 매출액 3,732억 원, 당기순이익 766억 원을 추정해 목표주가 40,000원, 상승여력 34%, 투자의견 BUY를 제시한다.',
    members:'Research Team 1',
    pdf:'assets/reports/22-2_pi_advanced.pdf', pdfMeta:'PDF · 21 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'greenplus', name:'그린플러스', ticker:'186230', sector:'금속', type:'Company Analysis', op:'BUY', tp:'13,900원', buy:'', cur:'11,250원', upside:'+24%', upNum:24, tpNum:13900, date:'2022.10.02', team:'RFS Team 4', region:'Korea',
    headline:'세상을 플러스하는 스마트 팜',
    summary:'알루미늄 압출 생산라인을 기반으로 첨단 온실 원스톱 서비스를 제공하는 국내 유일 스마트팜 상장사다. 2Q22 매출액 204억 원(YoY +40.26%), 영업이익 20.3억 원을 기록하며 높은 매출액 증가율을 보였다.',
    heroSummary:'국내 유일 스마트팜 상장사. 온실시공능력평가 10년 연속 1위.',
    points:[
      { title:'투자포인트 1. 캐시카우가 될 알루미늄', body:'알루미늄 압출 제품은 전기차 산업의 발전과 친환경 산업의 중요성 대두로 차량 경량화와 태양광, 스마트팜의 높은 수요를 받고 있다. 압출부터 가공, 온실, 용접으로 이어지는 수직계열화 생산라인은 알루미늄 사업부와 스마트팜 사업부의 원스톱 서비스를 가능하게 하여 수익성 확보에 이점이 있다.' },
      { title:'투자포인트 2. 증가하는 스마트팜 수요', body:'정부는 스마트팜 시설 보급을 위해 2029년까지 7,000억 원 이상을 투입할 예정이다. 한국의 식량 자급률 감소와 WTO 개발도상국 특혜 포기가 수요를 증가시켰다. 온실시공능력에서 인정받은 동사는 국내에서 올해에만 5건 106억 원 규모의 대형계약을 체결했고 일본·호주·뉴질랜드로의 공급계약도 체결했다.' }
    ],
    valuation:'SOTP Method와 EV/Sales를 사용했다. 2023년 목표주가 13,900원, 상승여력 24%를 제시한다.',
    members:'RFS Team 4',
    pdf:'assets/reports/22-2_greenplus.pdf', pdfMeta:'PDF · 20 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'hyundai', name:'현대차', ticker:'005380', sector:'자동차', type:'Company Analysis', op:'BUY', tp:'272,380원', buy:'', cur:'185,500원', upside:'+46.84%', upNum:46.84, tpNum:272380, date:'2022.05.29', team:'Research Team 2', region:'Korea',
    headline:'변동성의 장에서는 튼튼한 기업을!',
    summary:'중형세단 수요 감소에 발맞추어 고가 차량인 SUV·Luxury 차종으로 판매 비중을 늘리고 있다. 과거에 비해 SUV와 제네시스의 판매비중이 두 배 이상 증가하며 개선된 믹스를 증명했다.',
    heroSummary:'믹스 개선과 E-GMP. 2030년 글로벌 전기차 점유율 12%를 목표한다.',
    points:[
      { title:'투자포인트 1. 선택과 집중으로의 믹스 개선', body:'글로벌 제네시스 판매량은 주목할 만하다. 믹스 개선에 따른 효과는 매출액과 영업이익에서 드러났다. 당분간 Q의 문제는 지속해서 유지될 것이지만 글로벌 ASP 증가와 믹스 개선, 고환율 추세에 따른 매출 상승 기조는 계속될 것이다.' },
      { title:'투자포인트 2. 매력적인 전기차 성장', body:'성장하는 친환경 자동차 시장 속에서 높은 기술력과 대규모 투자로 경쟁력을 확보하고 있다. 전기차 전용 플랫폼인 E-GMP와 초고속 배터리 기술을 보유했고 63조 원 규모의 중장기 투자 전략을 발표한 바 있다. 2030년 전 세계 전기차 시장에서 12%의 점유율을 목표로 하고 있으며, 수소차 부문에서도 솔루션 제공과 신사업 확장에 주력하고 있다.' }
    ],
    valuation:'제품믹스 개선에 따른 매출원가율 감소와 매출 증가를 잘 반영할 수 있다고 판단해 Bottom-up 방식의 DCF Model을 채택했다. 목표주가 272,380원, 상승여력 46.84%, 투자의견 BUY를 제시한다.',
    members:'Research Team 2',
    pdf:'assets/reports/22-1_hyundai_motor.pdf', pdfMeta:'PDF · 20 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'lnf', name:'엘앤에프', ticker:'066970', sector:'2차전지', type:'Company Analysis', op:'BUY', tp:'451,500원', buy:'', cur:'243,800원', upside:'+83.25%', upNum:83.25, tpNum:451500, date:'2022.05.29', team:'Research Team 1', region:'Korea',
    headline:'테슬라 차량은 NCMA를 타고',
    summary:'2016년 엘앤에프신소재를 흡수합병해 양극활물질 사업에서 하이니켈 NCMA를 개발하여 2차전지 산업에서 세계적으로 큰 두각을 보이고 있다. 전기차 시장 확대와 NCMA 수요 증가에 대구국가산업단지를 중심으로 꾸준한 CAPA 증진에 힘을 쏟고 있다.',
    heroSummary:'LG엔솔을 통한 테슬라 납품. 24년까지 3공장 완공으로 CAPA를 확대한다.',
    points:[
      { title:'투자포인트 1. 테슬라 밸류체인의 수혜', body:'LG에너지솔루션을 통하여 테슬라에 납품하고 있다. 베를린, 텍사스 기가팩토리가 올해부터 가동되면 차량 생산량은 증가할 것이고 동사가 그 수혜를 고스란히 받을 것이다. NCMA는 기존 NCM에서 단가는 낮추고 출력은 높여 테슬라의 롱레인지 트림에 탑재되고 있으며, 올해 양산을 목표로 하는 4680 배터리에도 NCMA를 탑재할 것이라 밝힌 바 있다.' },
      { title:'투자포인트 2. CAPA 증설과 단결정 양극재', body:'양극재 숏티지로 인한 폭발적 수요에 대응하기 위해 CAPA 증설 계획을 연이어 발표했다. 기존 구지 1공장의 6만 톤에 더해 올해 완공될 7만 톤 물량의 2공장, 24년 7만 톤을 감당할 3공장이 완공될 예정이다. 에너지 밀도와 안정성을 모두 잡을 수 있는 단결정 적용 양극재도 타 업체 대비 가장 빠른 양산을 계획 중이다.' }
    ],
    valuation:'CAPA 증대 계획을 통한 생산량 추정과 원재료 가격을 반영한 매출원가 추정을 바탕으로 목표주가 451,500원, 상승여력 83.25%, 투자의견 BUY를 제시한다.',
    members:'Research Team 1',
    pdf:'assets/reports/22-1_lnf.pdf', pdfMeta:'PDF · 20 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'osstem', name:'오스템임플란트', ticker:'048260', sector:'헬스케어', type:'Company Analysis', op:'BUY', tp:'253,000원', buy:'', cur:'106,900원', upside:'+136.67%', upNum:136.67, tpNum:253000, date:'2022.05.29', team:'RFS Team 4', region:'Korea',
    headline:'이빨 빠진 호랑이? 심으면 그만이야',
    summary:'치과용 임플란트를 필두로 치과용 기자재 및 임상교육 사업을 영위하는 종합 덴탈 기업이다. 견고한 직접영업망과 지속적인 R&D 투자로 22년 1분기 연결기준 매출액 2,341억 원(YoY +36.5%), 영업이익 511억 원(YoY +100.5%)의 분기 사상 최대 실적을 기록했다.',
    heroSummary:'세계 임플란트 판매량 1위. 2028년까지 연평균 11% 시장 성장을 전망한다.',
    points:[
      { title:'투자포인트 1. 가시성이 보이는 투자처', body:'2020년 기준 15%였던 OECD 평균 고령인구 비중은 2045년 24%를 넘을 것으로 추정되며 인구 고령화는 직접적으로 임플란트 수요를 증가시킬 것이다. 소득수준 증가와 건강보험 보장 확대는 시장 성장 속도를 가속화시킬 것으로 예측된다. 21년 임플란트 시장 규모는 YoY +8.3% 성장했으며 2028년까지 연평균 11%가량 늘어날 전망이다.' },
      { title:'투자포인트 2. 1위 절대사수', body:'임플란트 산업은 임상데이터 및 인지도 면에서 신규 업체의 진입이 어렵고 기존 제품을 그대로 유지하는 보수적인 특성을 가지고 있어 업계 1위 기업으로서 점유율 유지를 확고히 할 것으로 기대된다. 치과의사와 개별적으로 접촉하는 직접영업 방식을 고수하고 OIC 연수센터를 통해 자사 제품을 지속적으로 사용하게끔 유도하면서 유리한 위치를 선점했다.' }
    ],
    valuation:'Peer PER Method를 채택했다. 목표주가 253,000원, 상승여력 136.67%, 투자의견 CONVICTION BUY를 제시한다.',
    members:'RFS Team 4',
    pdf:'assets/reports/22-1_osstem.pdf', pdfMeta:'PDF · 20 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'lutronic', name:'루트로닉', ticker:'085370', sector:'미용/의료기기', type:'Company Analysis', op:'BUY', tp:'29,000원', buy:'', cur:'23,950원', upside:'+21.08%', upNum:21.08, tpNum:29000, date:'2022.05.29', team:'Research Team 3', region:'Korea',
    headline:'예뻐지는 올바른 루트, 루트로닉',
    summary:'에스테틱 레이저 의료기기 국내 1위 기업이다. 1Q22 매출액 571억 원(YoY +74.1%), 영업이익 114억 원(YoY +254.2%)으로 크게 상승했다. 고가·고마진 프리미엄 제품들이 미국·유럽에서 판매가 확대되며 컨센서스 대비 44%가량의 어닝 서프라이즈를 기록했다.',
    heroSummary:'리오프닝 수혜와 프리미엄 제품군. 지역별 맞춤 제품 배치로 시장을 공략한다.',
    points:[
      { title:'투자포인트 1. 미용의료기기 시장의 성장', body:'미용의료기기 시장은 구조적으로 성장하고 있다. 통증이 덜하고 회복이 빠른 최소·비침습적 미용의학시술이 각광받으면서 대표주자인 미용의료기기가 수혜를 입고 있다. 수출 비중이 높은 만큼 지역별 수요에 따른 제품 배치로 시장을 공략하고 있으며, 미국·유럽에는 안티에이징 제품을, 아시아에는 미백 관련 제품을 주로 판매하고 있다.' },
      { title:'투자포인트 2. 공격적인 R&D 투자로 프리미엄 제품군 확대', body:'공격적인 R&D 투자를 통해 프리미엄 레이저 제품군을 확대했다. 이를 통해 얻은 다양한 해외 프리미엄 제품군과 기술력으로 ASP가 상승했다. 경쟁력 있는 프리미엄 제품들은 선진국 진출의 기반을 마련했고 미국向 수출이 크게 증가했다. 판매된 제품들이 새로운 소모품 매출을 이끌면서 긍정적인 연쇄작용을 가져왔다.' }
    ],
    valuation:'PER Valuation 방법을 채택했다. Peer Group PER 22.08배, 향후 12개월 당기순이익 347억 원을 추정해 목표주가 29,000원, 상승여력 21.08%, 투자의견 BUY를 제시한다.',
    members:'Research Team 3',
    pdf:'assets/reports/22-1_lutronic.pdf', pdfMeta:'PDF · 21 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'lguplus', name:'LG유플러스', ticker:'032640', sector:'통신', type:'Company Analysis', op:'BUY', tp:'14,353원', buy:'', cur:'13,750원', upside:'+4.4%', upNum:4.4, tpNum:14353, date:'2022.05.29', team:'Research Team 6', region:'Korea',
    headline:'통신 넘어 탈통신으로, 차세대 선두주자',
    summary:'무선통신 3위 기업으로 1Q22 매출 비중은 무선통신 62%, 스마트홈·전화 23%, 기업인프라 15%다. 1Q22 당기순이익이 QoQ +67.4%로 나타나 실적 둔화를 딛고 회복세에 접근하고 있다고 판단된다.',
    heroSummary:'5G 가입자 순증가 8.7%. Q 중심 전략으로 규모의 경제를 실현한다.',
    points:[
      { title:'투자포인트 1. 무선통신, 막내의 반란', body:'ARPU 감소에도 불구하고 실질적인 무선 서비스 수익이 꾸준히 증가하고 있다. 5G 가입자 순증가비율도 YoY 8.7%로 높다. P가 아닌 Q에 초점을 둔 전략을 기반으로 MVNO 시장에서의 점유율 확장 및 MNO 시장 해지율 최소화 전략을 통해 다소 ARPU는 낮아지더라도 규모의 경제가 실현될 전망이다.' },
      { title:'투자포인트 2. 탈통신 사업 확장', body:'안정적인 수익원이지만 내수에만 한정된 통신업의 한계를 극복하기 위해 탈통신으로 비즈니스 모델을 확장하고 있다. 자체 콘텐츠와 해외 플랫폼 독점제휴를 통해 경쟁력을 확보하고 있으며, 전력 효율화에 강점을 가진 IDC 사업부는 기술적 경쟁우위를 가진다. 스마트팩토리·스마트모빌리티 등 신사업에도 네트워크 망 기술력을 접목하고 있다.' }
    ],
    valuation:'Global Peer forward PER를 가중평균한 9.2565배를 Target P/E에 적용했다. 12개월 목표주가 14,353원, 상승여력 4.4%, 투자의견 BUY를 제시한다.',
    members:'Research Team 6',
    pdf:'assets/reports/22-1_lg_uplus.pdf', pdfMeta:'PDF · 20 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'samsungsdi', name:'삼성SDI', ticker:'006400', sector:'2차전지', type:'Company Analysis', op:'BUY', tp:'762,402원', buy:'', cur:'587,000원', upside:'+29.9%', upNum:29.9, tpNum:762402, date:'2022.04.03', team:'Research Team 6', region:'Korea',
    headline:'전기차 제너레이션으로, 젠5가 선도',
    summary:'매출의 81%는 고성장 산업인 에너지솔루션 사업부, 19%는 전자재료 사업부로 고성장 산업 특유의 불안정성을 상쇄한다. 하이니켈 2차전지 배터리로 고성장 기로에 진입할 시기다.',
    heroSummary:'2023년부터 배터리 공급부족. 3원계 집중 전략으로 대응한다.',
    points:[
      { title:'투자포인트 1. 배터리 산업의 shortage 심화', body:'글로벌 친환경 정책에 따라 2차전지 산업이 주목받으며 배터리 기업들이 대규모 CAPA 증설에 돌입했다. 초과공급이 발생할 수 있지만 2022년 기점으로 수급이 안정되어 2030년까지 공급부족이 이어질 전망이다. 2022년 공급 과잉률은 6%이며 2023년부터 -6%, 2025년 -25%, 2030년 -15%의 공급부족이 발생할 전망이다.' },
      { title:'투자포인트 2. 배터리 전쟁 속 기술적 차별화', body:'배터리 업계의 게임 체인저로 떠오른 중대형 원통형 배터리 시장이 춘추전국 시대에 도래했다. 3원계 배터리와 중국 LFP 배터리의 맞대결 속에서 동사는 기술·성능적 경쟁우위가 확보된 3원계 배터리에 집중하고, 배터리 안전성 극대화, 원가 절감을 통한 수익성 증대라는 차별화 전략으로 대응하고 있다.' }
    ],
    valuation:'PER Valuation 방법을 채택했다. Global Peer PER를 가중평균한 29.9배 수준까지 기업가치를 평가받을 수 있을 것으로 전망해 12개월 목표주가 762,402원, 상승여력 29.9%, 투자의견 BUY를 제시한다.',
    members:'Research Team 6',
    pdf:'assets/reports/22-1_samsung_sdi.pdf', pdfMeta:'PDF · 20 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'daewoong', name:'대웅제약', ticker:'069620', sector:'헬스케어', type:'Company Analysis', op:'BUY', tp:'211,218원', buy:'', cur:'163,500원', upside:'+29.5%', upNum:29.5, tpNum:211218, date:'2022.04.03', team:'Research Team 5', region:'Korea',
    headline:'이런 여우 같은 곰을 봤나',
    summary:'의약품 제조 및 판매를 영위하며 나보타, 펙수프라잔과 같은 전문의약품과 우루사, 임팩타민 등 일반의약품을 제조·판매한다. 2021년 별도 기준 매출액 955억 원, 영업이익률 9.1%를 기록했다.',
    heroSummary:'국산 톡신 1위 나보타. 21년 매출 796억 원(YoY +59%)의 고성장이 지속된다.',
    points:[
      { title:'투자포인트 1. 든든한 Cash Cow, ETC/OTC', body:'전문의약품과 일반의약품 부문은 미래 성장동력을 위한 캐시카우 역할로 21년 7,780억 원(YoY +9.6%)의 매출을 기록했다. 다수의 파이프라인 보유를 통한 지속적인 신약 개발과 이를 위한 충분한 규모의 R&D 투자가 필수적이며, 고수익성 신약인 펙수프라잔의 출시를 앞두고 있다.' },
      { title:'투자포인트 2. 국산 톡신 No.1 나보타', body:'나보타는 고마진 제품으로서 국내외 시장 모두 판매 호조가 이어져 21년 매출액 796억 원(YoY +59%)으로 고성장세가 지속되고 있다. 에볼루스의 공격적인 마케팅을 통한 미국 점유율 확대와 유럽·중국 시장의 순차적인 진출로 나보타 판매를 본격화할 전망이다.' }
    ],
    valuation:'성장성 차이를 감안해 ETC/OTC 사업부와 나보타 사업부를 분리한 SOTP 방식을 진행했다. ETC/OTC에는 EV/EBITDA, 나보타에는 PER 방식을 적용해 목표주가 211,218원, 상승여력 29.5%, 투자의견 BUY를 제시한다.',
    members:'Research Team 5',
    pdf:'assets/reports/22-1_daewoong.pdf', pdfMeta:'PDF · 19 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'glovis', name:'현대글로비스', ticker:'086280', sector:'물류', type:'Company Analysis', op:'BUY', tp:'201,350원', buy:'', cur:'190,000원', upside:'+5.97%', upNum:5.97, tpNum:201350, date:'2022.04.03', team:'RFS Team 4', region:'Korea',
    headline:'너 내 주주가 돼라! 현대 글로비스',
    summary:'종합물류업, 유통판매업, 해운업을 대표하는 기업이다. 2021년 연결 기준 매출액 21조 7,796억 원(YoY +31.8%), 영업이익 1조 4,917억 원(YoY +70.1%)을 기록하며 사상 최고의 영업 실적을 기록했다.',
    heroSummary:'중고차 시장 진출과 비계열 60% 돌파. 오토벨로 사업 영역을 확장한다.',
    points:[
      { title:'투자포인트 1. 중고차 부문의 규모 확대', body:'중고차 매매업의 생계 적합업종 미지정으로 현대차와 기아가 중고차 시장 진출을 선언하면서 시장 규모가 더욱 확대될 것으로 기대된다. 국내 최대 규모의 중고차 경매장을 운영하며 20여 년간 약 130만 대의 중고차를 거래해 온 선도 업체로, 21년 중고차 부문 매출액은 7,332억 원(YoY +45.7%)을 기록했고 22년 1월 오토벨을 출시했다.' },
      { title:'투자포인트 2. 비계열 비중 확대를 통한 고객 다각화', body:'현대자동차그룹 완성차 외에도 비계열 고객사와의 계약을 지속적으로 추진하여 지난해 비계열 비중은 60%를 돌파했다. 21년 12월에 폭스바겐, 테슬라 등 글로벌 완성차 업체와 각각 5,000억 원 규모의 계약을 체결하면서 앞으로 글로벌 시장에서 입지가 강화될 것으로 예상된다.' }
    ],
    valuation:'EV/EBITDA를 채택했다. 목표주가 201,350원, 상승여력 5.97%, 투자의견 BUY를 제시한다.',
    members:'RFS Team 4',
    pdf:'assets/reports/22-1_glovis.pdf', pdfMeta:'PDF · 20 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'bh', name:'비에이치', ticker:'090460', sector:'전자부품', type:'Company Analysis', op:'BUY', tp:'27,000원', buy:'', cur:'24,300원', upside:'+11.1%', upNum:11.1, tpNum:27000, date:'2022.04.03', team:'Research Team 3', region:'Korea',
    headline:'비에이치 최고점? 묻고 BUY로 가',
    summary:'연성회로기판(FPCB)을 주사업으로 영위하는 기업이다. 4Q21 별도기준 영업이익 769억 원(YoY +1,442.9%), 매출액 4,431억 원(YoY +37%)을 기록했다. 22년 1분기는 전장산업 인수와 전방산업의 호재가 겹쳐 사상 최대 실적을 갱신할 것으로 보인다.',
    heroSummary:'삼성전기 철수로 점유율 70%. 폴더블과 아이폰 수요가 겹쳤다.',
    points:[
      { title:'투자포인트 1. FPCB 산업, 이제 성장할 일만 남았다', body:'비대면 수요 증가로 인한 5G 네트워크 상용화와 중국向 제조사의 잇따른 폴더블 스마트폰 출시 예정으로 FPCB 수요가 급증하며 양호한 회복세를 보이고 있다. 스마트폰 기기뿐 아니라 다양한 첨단기기에 FPCB가 적용되면서 산업 규모와 동사의 수익성이 양의 상관관계를 가지며 증가할 것으로 보인다.' },
      { title:'투자포인트 2. 겹경사 맞은 FPCB 사업 수요', body:'주요 매출처 삼성디스플레이와 애플의 프리미엄 스마트폰이 판매 호조를 지속하고 있다. 지난해 출시된 삼성 Z시리즈 폴더블폰 판매량은 이전 시리즈보다 4배 이상 성장했고 아이폰13도 견고한 출하량을 보였다. 애플 FPCB 납품의 주요 경쟁사 삼성전기가 관련 사업을 철수하면서 동사의 점유율이 70%까지 확대될 것으로 기대된다.' }
    ],
    valuation:'PER Valuation을 채택했다. 목표주가 27,000원, 상승여력 11.1%, 투자의견 BUY를 제시한다.',
    members:'Research Team 3',
    pdf:'assets/reports/22-1_bh.pdf', pdfMeta:'PDF · 20 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'hmm', name:'HMM', ticker:'011200', sector:'해운', type:'Company Analysis', op:'BUY', tp:'34,500원', buy:'', cur:'28,900원', upside:'+19.3%', upNum:19.3, tpNum:34500, date:'2022.04.03', team:'Research Team 1', region:'Korea',
    headline:'흠! 누가 고점이라고 하였는가',
    summary:'컨테이너선, 벌크선, 중량화물선, 특수제품선에 진출하여 100여 척의 다양한 선박을 통해 물류 사업을 영위한다. 해운 동맹 디 얼라이언스에 가입해 세계 주요 노선 물동량의 7%를 차지하며, 글로벌 물류 적체로 운임이 크게 증가하면서 매출과 영업이익이 크게 상승했다.',
    heroSummary:'물류 병목 해소가 만드는 Q 증가. 해운 재건 5개년 계획의 수혜를 전망한다.',
    points:[
      { title:'투자포인트 1. 물류 병목현상 해소는 Q의 증가', body:'2021년은 물류 병목현상으로 컨테이너 처리 속도와 선박 회전율이 하락했다. 따라서 동사의 물동량은 전년 대비 크게 감소했다. 물류 병목현상이 해소되면 선박의 회전율이 증가하여 처리하는 물동량은 증가할 것이며, Q의 증대는 매출을 견인한다.' },
      { title:'투자포인트 2. 정부 정책의 수혜', body:'정부는 2018년 4월 해운업 육성을 위해 해운 재건 5개년 계획을 수립했다. 2025년까지 해운 매출 51조 원, 원양 컨테이너 선복량 120만 TEU, 지배선대 1억 톤 달성을 목표로 하고 있다. 특히 이번 정권에서는 신해양강국 정책을 내세움으로써 동사의 수혜가 예상된다.' }
    ],
    valuation:'PBR Valuation을 채택했다. 당기순이익 8조 8,764억 원, BPS 28,166원, Target PBR 1.22배를 적용해 2022년 목표주가 34,500원, 상승여력 19.3%, 투자의견 BUY를 제시한다.',
    members:'Research Team 1',
    pdf:'assets/reports/22-1_hmm.pdf', pdfMeta:'PDF · 20 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'bgf', name:'BGF리테일', ticker:'282330', sector:'유통/소비재', type:'Company Analysis', op:'BUY', tp:'226,000원', buy:'', cur:'179,500원', upside:'+26%', upNum:26, tpNum:226000, date:'2022.04.03', team:'Research Team 2', region:'Korea',
    headline:'포켓몬빵은 품절이지만 푸근한 기업!',
    summary:'사업 부문은 편의점, 물류, 기타로 구분된다. 편의점 부문이 매출액의 약 95%를 차지하며 식품 12.4%, 가공식품 42.5%, 담배 39.5%, 비식품 5.6%를 취급한다. 작년 상품 믹스 개선으로 매출 YoY +12%, 영업이익 YoY +99% 모두 증가했다.',
    heroSummary:'상품 믹스 개선이 만든 영업이익 YoY +99%. 몽골·말레이시아로 확장한다.',
    points:[
      { title:'투자포인트 1. 편의점이라는 정체성에 집중', body:'편의점 매출은 가맹점에 대한 상품 판매 및 로열티 수취를 통해 발생한다. 상품 믹스가 고마진일수록, 점포 수가 많을수록 매출실적은 늘어난다. 식품군은 25~30%의 고마진 품목으로 분류되며 상품 믹스 개선이 실적으로 직결됐다. 자체 통합상품 브랜드 HEYROO를 출범해 브랜드 가치도 키워왔다.' },
      { title:'투자포인트 2. 포화된 국내를 넘어 해외로', body:'국내 편의점 업계는 포화상태에 이르렀다. 가맹점 수는 20년 기준 1,006개 증가했으나 점포당 평균 매출액은 600만 원 감소했다. 이에 일찍이 몽골과 말레이시아로 눈을 돌렸다. 2018년 Central Express CVS와 마스터프랜차이즈 계약을 체결해 업계 최초로 몽골에 진출했으며, 2022년 1월 말레이시아에서 CU 50호점을 오픈했다.' }
    ],
    valuation:'DCF Valuation을 채택했다. 목표주가 226,000원, 상승여력 26%, 투자의견 BUY를 제시한다.',
    members:'Research Team 2',
    pdf:'assets/reports/22-1_bgf_retail.pdf', pdfMeta:'PDF · 15 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'pearlabyss', name:'펄어비스', ticker:'263750', sector:'게임', type:'Company Analysis', op:'BUY', tp:'136,247원', buy:'', cur:'133,000원', upside:'+2.4%', upNum:2.4, tpNum:136247, date:'2021.11.28', team:'Research Team 3', region:'Korea',
    headline:'강자가 다시 돌아온다',
    summary:'주요 IP로는 매출의 80%를 차지하는 검은사막과 20%를 차지하는 이브가 있다. 검은사막 모바일의 중국 시장 출시에 이어 2022년 이후 붉은사막을 시작으로 도깨비, Plan8 등 신작 출시가 이어질 것으로 보아 1Q22 이후 매출 반등이 전망된다.',
    heroSummary:'검은사막 모바일 중국 출시. 2022년 붉은사막으로 반등을 전망한다.',
    points:[
      { title:'투자포인트 1. 자체개발 엔진에서 나오는 자신감', body:'국내 대부분 게임사들이 상용 엔진을 사용하는 반면 동사는 설립 초기부터 엔진 개발에 많은 시간과 비용을 투자해 게임 엔진을 자체 개발하는 데 성공했다. 전용 게임엔진은 원하는 게임환경을 구축하기 용이해 게임의 방향성을 100% 구현할 수 있고, 완성도 높은 그래픽으로 메타버스 활용에도 최적화되어 있다.' },
      { title:'투자포인트 2. 마지막 남은 해외시장, 중국', body:'검은사막의 한국 오픈베타 서비스를 시작으로 해외에 진출해왔던 동사는 중국시장만을 남겨놓고 있었는데, 지난 6월 검은사막 모바일에 대한 판호를 발급받는 데 성공하면서 12월 출시를 앞두고 있다. 중국 게임 시장은 그 규모가 세계 2위로 큰 비중을 차지하고 있다.' }
    ],
    valuation:'PER Valuation을 채택했다. 목표주가 136,247원, 상승여력 2.4%, 투자의견 BUY를 제시한다.',
    members:'Research Team 3',
    pdf:'assets/reports/21-2_pearl_abyss.pdf', pdfMeta:'PDF · 22 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'tesna', name:'테스나', ticker:'131970', sector:'반도체', type:'Company Analysis', op:'BUY', tp:'70,800원', buy:'', cur:'44,150원', upside:'+60%', upNum:60, tpNum:70800, date:'2021.11.28', team:'Research Team 1', region:'Korea',
    headline:'아 테스나 형! 반도체 검사해',
    summary:'시스템 반도체 중에서 SoC, CIS, MCU, Smart Card IC를 중점적으로 테스트한다. 주요 고객사는 삼성전자이며 테스트 매출 비중은 CIS, AP, RF 순으로 높다. 2020년 매출액은 2019년 대비 약 36.9% 증가했다.',
    heroSummary:'삼성전자 CIS 테스트의 큰 비중. 엑시노스 출하량 40% 증가를 전망한다.',
    points:[
      { title:'투자포인트 1. 삼성전자와 SK하이닉스의 CIS 성장', body:'매출의 약 80%는 삼성전자로부터 이루어진다. 삼성전자는 고해상도 CIS 시장에서 이미 소니를 추월했으며 화성공장 D램 11라인을 CIS를 생산하는 S4라인으로 순차 전환했다. SK하이닉스도 13MP 저화소 시장의 메이저 공급사로 올라섰고 32MP 고화소 CIS 출시를 앞두고 있어 두 기업 모두 CIS 성장세는 주요 포인트다.' },
      { title:'투자포인트 2. SoC는 AP, RF만 믿으라구', body:'코로나19로 급감했던 스마트폰 출하량이 1Q21 3억 4,500만 대를 기록하며 AP 수요는 이미 반등에 나섰다. 2022년부터 삼성전자 플래그십에 탑재될 차세대 엑시노스 2200 출시가 매출 성장 기대주다. 갤럭시 A·M 시리즈 중저가 폰 탑재 비중 증대와 중화권 업체로의 포트폴리오 확대는 내년 엑시노스 출하량을 전년 대비 약 40% 증가시킬 전망이다.' }
    ],
    valuation:'EV/EBITDA를 채택했다. 목표주가 70,800원, 상승여력 60%, 투자의견 BUY를 제시한다.',
    members:'Research Team 1',
    pdf:'assets/reports/21-2_tesna.pdf', pdfMeta:'PDF · 25 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'sm21', name:'에스엠', ticker:'041510', sector:'엔터테인먼트', type:'Company Analysis', op:'BUY', tp:'-', buy:'', cur:'67,000원', upside:'-', upNum:0, tpNum:0, date:'2021.11.29', team:'Research Team 6', region:'Korea',
    headline:'K-ENTER, ALL WEATHER IN 에스엠',
    summary:'국내 및 일본, 중국, 미국 등 전 세계에서 매출이 발생하는 글로벌 엔터테인먼트 기업이다. 2021년 9월말 연결기준 매출에서 엔터 사업부문이 약 89%, 광고가 약 11%의 비중을 차지한다.',
    heroSummary:'국내 최다 K-POP IP. NCT 팬덤이 2년 새 빠르게 확대되고 있다.',
    points:[
      { title:'투자포인트 1. 국내 최다 K-POP IP 보유', body:'코로나 기간 K-POP은 유튜브와 SNS 중심으로 폭발적인 성장을 이뤄냈고 한국 엔터사의 대표격인 SM은 그 수혜를 온전히 누리고 있다. 확실한 캐시카우인 NCT의 팬덤 규모는 최근 2년 새 매우 빠르게 확대되고 있으며, 유튜브 구독자 수와 조회수 모두 1년 사이 3~5배 성장했다. 20년 데뷔한 에스파 역시 가장 가파른 성장을 보이고 있다.' },
      { title:'투자포인트 2. 콘텐츠까지 삼켜버린 SM', body:'SMSTUDIOS를 통해 비음악 콘텐츠 분야의 통합 및 확장을 시도하고 있다. SM C&C와 KEYEAST는 OTT 확대에 따라 콘텐츠 확보 경쟁이 심화되면서 수혜를 얻을 것으로 기대된다. SM C&C는 최근 4년 동안 29개의 오리지널 IP를 확보하며 입지를 확대해 나가고 있고, KEYEAST는 2편의 텐트폴 작품 제작이 계획되어 있다.' }
    ],
    valuation:'PER Valuation을 채택했다. 목표주가는 보고서 작성 시점에 미확정(TBD)으로 제시되었다.',
    members:'Research Team 6',
    pdf:'assets/reports/21-2_sm.pdf', pdfMeta:'PDF · 21 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'sbl21', name:'삼성바이오로직스', ticker:'207940', sector:'제약/바이오', type:'Company Analysis', op:'BUY', tp:'-', buy:'', cur:'-', upside:'-', upNum:0, tpNum:0, date:'2021.11.30', team:'RFS Team 4', region:'Korea',
    headline:'CMO산업의 최전선에 서다!',
    summary:'2021년 매출액 1조 6,148억 원(YoY +39%)을 제시한다. 2011년 1공장 착공부터 2017년 3공장 완공까지 꾸준한 설비 투자로 총 36만 4,000리터의 CAPA를 확보했다.',
    heroSummary:'론자를 꺾은 세계 1위 생산능력. 4공장 CAPEX 1조 7,400억 원.',
    points:[
      { title:'투자포인트 1. CMO 생산역량, 론자를 꺾고 세계 1위', body:'1공장 3만 리터, 2공장 15만 4,000리터, 3공장 18만 리터로 총 36만 4,000리터의 CAPA를 확보했다. 이로써 경쟁사인 론자, 베링거인겔하임 등을 제치고 세계 1위의 생산능력을 차지했으며 규모의 경제를 통한 원가 경쟁력을 용이하게 함으로써 우위에 섰다.' },
      { title:'투자포인트 2. 선제적 CAPEX 지출으로 시장저변 확대', body:'3공장이 완공된 2017년 이후 CAPEX가 감소하는 추세를 보였으나 20년 말 25만 6,000리터 규모의 4공장 착공에 돌입해 올해부터 다시 증가하고 있다. 5·6공장 증설과 미국·유럽 등 선진국 진출이 가시화될 경우 투자규모는 예상보다 더 커질 것으로 전망되며, 4공장에 활용되는 1조 7,400억 원의 CAPEX는 3~4년간 나뉘어 인식될 예정이다.' }
    ],
    valuation:'DCF Valuation을 채택했다. 2021년 매출액 1조 6,148억 원(YoY +39%)을 제시한다.',
    members:'RFS Team 4',
    pdf:'assets/reports/21-2_samsung_bio.pdf', pdfMeta:'PDF · 16 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'kia', name:'기아', ticker:'000270', sector:'자동차', type:'Company Analysis', op:'BUY', tp:'-', buy:'', cur:'-', upside:'-', upNum:0, tpNum:0, date:'2021.10.05', team:'RFS Team 4', region:'Korea',
    headline:'현기차? 이젠 기현차',
    summary:'2020년 연결 기준 매출액 34조 9,212억 원(YoY +34%), 영업이익 2조 5,635억 원(YoY +454%)을 기록했다. 자동차 산업 자체에 대한 높은 수요와 신차 출시 이익 모멘텀, 전기차 시장 선점 등을 통해 지속적인 성장을 이뤄낼 것으로 전망된다.',
    heroSummary:'내연기관의 견조함과 전기차 Full line-up. 2Q21 글로벌 판매 YoY +46.1%.',
    points:[
      { title:'투자포인트 1. 내연기관', body:'내연기관 차량은 현재 주요 매출액을 내는 주력 라인이다. 각국 정부와 소비자들이 전기차로 눈을 돌리고 있지만 아직 과도기를 지나는 중이며 당분간 니즈는 존재할 것으로 판단된다. 특히 높은 퍼포먼스 주행을 요구하는 RV 차량 판매가 높아짐에 따라 견조한 매출액을 보이고 있으며, 2Q21 글로벌 합산 판매량은 YoY +46.1%를 기록했다.' },
      { title:'투자포인트 2. 전기차', body:'전기차는 높은 수익성을 가지는 매출원으로 현재 가장 집중적으로 개발 중인 분야다. 친환경 차량에 대한 글로벌 수요는 전기차 시장 성장을 가속화시킬 것이다. 기아는 전기차 Full line-up 구축을 계획하며 충전 인프라 확대 등의 노력을 기울이고 있고, 배터리 원가가 절감되면서 전기차 판매를 통한 이익은 점차 높아지는 추세다.' }
    ],
    valuation:'PER Valuation을 채택했다.',
    members:'RFS Team 4',
    pdf:'assets/reports/21-2_kia.pdf', pdfMeta:'PDF · 16 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'intel', name:'Intel', ticker:'INTC', sector:'반도체', type:'Company Analysis', op:'HOLD', tp:'$53.0', buy:'', cur:'$48.8', upside:'+8.7%', upNum:8.7, tpNum:53, date:'2021.11.30', team:'Research Team 2', region:'Global',
    headline:'장기적으로는 지켜볼만 하나',
    summary:'영업이익의 53%를 차지하는 PC용 CPU 성장 및 점유율이 둔화되는 시점에서 단기 실적 성장성은 서버용 CPU 매출액에 달렸다. 대규모 CAPEX 투자에 따른 수익성 악화도 예견되어 있어 밸류에이션이 리레이팅될 모멘텀은 부족한 상황이다.',
    heroSummary:'x86 생태계가 흔들린다. 지금은 때가 아니라고 판단한다.',
    points:[
      { title:'투자포인트 1. 지금은 때가 아니다', body:'서버용 CPU 성능을 가늠해볼 수 있는 최신 아키텍처 Golden Cove 기반 CPU Alder Lake가 발열 및 전력 소비 관련 문제를 보이며 시장의 반응이 냉담하다. 30년 이상 지켜온 x86 생태계 자체가 Arm 기반 CPU에 위협당하고 있으며, x86 생태계 내에서도 AMD가 공정 우위를 바탕으로 턱밑을 추격 중이다.' },
      { title:'투자포인트 2. 중장기 생태계 로드맵은 지켜볼 필요 있어', body:'가이던스가 시장의 신뢰를 잃은 것은 사실이나 현금창출 능력과 재무건전성을 고려할 때 장기 로드맵이 어떻게 전개되는지 지켜볼 필요는 있다. IDM2.0을 발표하며 파운드리 확대를 통한 운영 효율화 방침을 밝혔고, Mobileye는 ADAS 칩 점유율이 70%에 달하며 스타 엔지니어들을 대거 등용하며 재기를 노리고 있다.' }
    ],
    valuation:'PER Valuation을 채택했다. 2021년 EPS와 2022년 EPS를 가중평균해 12개월 목표주가 $53.0, 상승여력 8.7%, 투자의견 HOLD를 제시한다.',
    members:'Research Team 2',
    pdf:'assets/reports/21-2_intel.pdf', pdfMeta:'PDF · 28 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'cswind', name:'씨에스윈드', ticker:'112610', sector:'풍력', type:'Company Analysis', op:'BUY', tp:'78,000원', buy:'', cur:'58,500원', upside:'+33%', upNum:33, tpNum:78000, date:'2021.11.28', team:'Research Team 5', region:'Korea',
    headline:'꽉꽉 눌러 담은 추진력',
    summary:'각국이 재생에너지 비중을 확대함에 따라 풍력산업의 글로벌 성장기조는 계속 이어질 전망이다. 100% 해외 사업으로부터 매출이 발생하는 동사의 상대적 매력이 부각될 것으로 전망한다.',
    heroSummary:'글로벌 풍력타워 M/S 1위. 4배 규모의 하부구조물 시장으로 확장한다.',
    points:[
      { title:'투자포인트 1. 현지 생산법인이 가지는 가치', body:'풍력발전 산업은 장비의 운송 비용이 크다는 점으로 인해 현지조달이 가지는 장점이 크다. 주요국의 자국 신재생에너지 산업 육성을 위한 반덤핑 관세부과가 거듭 이루어지는 점을 감안할 때 현지법인 보유의 가치는 더욱 크다. 지역별 생산능력은 베트남 40%, 말레이시아 22.3%, 태국 19.6%, 중국 13.4%, 터키 4.5%로 분산되어 있다.' },
      { title:'투자포인트 2. 신규 인수로 챙긴 시너지와 성장성', body:'해상풍력발전 시장의 급속한 성장이 예상되면서 글로벌 풍력타워 시장 점유율 1위에서 그치지 않고 풍력타워 시장의 4배 규모인 하부구조물 시장 진출도 노리고 있다. 지난 9월 포르투갈의 하부구조물 제조기업 ASMI를 인수하고 2023년을 목표로 아시아向 하부구조물 법인을 설립하면서 두각을 드러낼 것으로 기대된다.' }
    ],
    valuation:'EV/EBITDA를 사용했다. 예상 매출액 1조 36억 원, EBITDA와 Multiple 22.6배를 적용해 2021년 목표주가 78,000원, 상승여력 33.33%를 제시한다.',
    members:'Research Team 5',
    pdf:'assets/reports/21-2_cs_wind.pdf', pdfMeta:'PDF · 18 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'orion', name:'오리온', ticker:'271560', sector:'음식료', type:'Company Analysis', op:'BUY', tp:'165,000원', buy:'', cur:'116,000원', upside:'+42.24%', upNum:42.24, tpNum:165000, date:'2021.10.03', team:'Research Team 5', region:'Korea',
    headline:'영업이익 사냥꾼 오리온',
    summary:'2020년 영업이익률은 약 17%로 동종업계 평균 5%대와 비교하면 경이로운 수준이다. 높은 영업이익률을 유지하는 비결은 경쟁사에 비해 매출원가를 10%p가량 절감해내는 데 있다.',
    heroSummary:'동종업계 3배의 영업이익률. 현지화 전략으로 해외 매출이 늘고 있다.',
    points:[
      { title:'투자포인트 1. 높은 영업이익률과 높아지는 해외매출', body:'매출원가 절감을 통해 C단을 낮추고 해외시장 점유율을 높여가며 Q단의 상승을 이끌어내고 있다. 현지의 수요에 맞는 제품을 개발하여 경쟁력을 확보했으며, 현지화 전략의 성공으로 2020년 매출이 중국 YoY +12%, 베트남 YoY +27%, 러시아 YoY +16% 증가했다.' },
      { title:'투자포인트 2. 신제품과 신 카테고리', body:'국내외 시장을 가리지 않고 과자, 건강식, 음료 등 카테고리별로 꾸준히 신제품을 출시하며 성장하는 모습을 보여주고 있다. 꼬북칩 초코츄러스맛의 인기는 중국, 미국, 호주 등 해외로까지 이어져 올해 1~8월 매출이 지난해 동기 대비 85% 성장했다. 닥터유 브랜드는 상반기 누적 매출액 450억 원(YoY +75%)을 기록했다.' }
    ],
    valuation:'EV/EBITDA를 채택했다. 목표주가 165,000원, 상승여력 42.24%, 투자의견 BUY를 제시한다.',
    members:'Research Team 5',
    pdf:'assets/reports/21-2_orion.pdf', pdfMeta:'PDF · 19 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'seah', name:'세아베스틸', ticker:'001430', sector:'철강', type:'Company Analysis', op:'BUY', tp:'33,000원', buy:'', cur:'24,750원', upside:'+33%', upNum:33, tpNum:33000, date:'2021.10.03', team:'Research Team 3', region:'Korea',
    headline:'세아베스틸, 네 마음을 Steal',
    summary:'탄소합금 특수강과 대형단조를 주사업으로 영위한다. 2Q21 별도기준 영업이익 601억 원(QoQ +725.9%), 매출액 5,736억 원(QoQ +107.7%)을 기록하며 최근 7개 연도 중 분기별 매출액 최대치를 달성했다.',
    heroSummary:'특수강 부문 부동의 1위. 전방산업 호조로 철강 수요가 급증하고 있다.',
    points:[
      { title:'투자포인트 1. 전방 산업의 호재로 인한 철강 수요 증가', body:'지난해 COVID-19로 전방산업이 급격하게 위축되면서 영업이익 적자를 기록했으나, 올해 코로나 종식 기대감과 함께 전방산업이 활력을 되찾음에 따라 철강 수요가 급증하고 있다. 세계철강시장점유율 1위인 중국이 탄소중립을 선언하며 중국산 물량이 감소할 것으로 예상되고, 증치세 폐지로 중국 철강의 가격 경쟁력이 약화돼 판매량이 더욱 증가할 것으로 보인다.' },
      { title:'투자포인트 2. 해외 수출 확대를 통한 납품처 다각화', body:'종속회사인 세아창원특수강이 사우디 아람코 프로젝트에 참여하면서 중동시장으로의 진출이 엿보인다. 이번 프로젝트는 세아그룹의 중동 허브 개척의 시작이라는 점에서 의미가 있다. 태국 현지에서 특수강 소재를 공급하며 꾸준히 점유율을 높이고 있고 베트남에 생산공장을 설립하고 있어 수출 규모는 더욱 확대될 것으로 보인다.' }
    ],
    valuation:'PBR Valuation을 채택했다. 목표주가 33,000원, 상승여력 33%, 투자의견 BUY를 제시한다.',
    members:'Research Team 3',
    pdf:'assets/reports/21-2_seah_besteel.pdf', pdfMeta:'PDF · 21 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'soil', name:'S-Oil', ticker:'010950', sector:'정유', type:'Company Analysis', op:'BUY', tp:'168,000원', buy:'', cur:'101,500원', upside:'+65%', upNum:65, tpNum:168000, date:'2021.10.05', team:'Research Team 2', region:'Korea',
    headline:'올 겨울, 따뜻하게 나고 싶다면',
    summary:'역내 정유 기업들의 수익성 지표인 싱가폴 정제마진이 $6.0을 돌파했다. 통상 BEP라 불리는 $4~5 수준을 상회하는 19년 10월 이후 최고치다. 3Q21 매출액은 7조 2,390억 원(YoY +86%), 영업이익 4,880억 원으로 컨센서스를 소폭 상회할 전망이다.',
    heroSummary:'정제마진 $6.0 돌파. 라니냐 도래 확률 70~80%가 난방 수요를 끌어올린다.',
    points:[
      { title:'투자포인트 1. 정제마진 강세는 연말 이후에도 지속', body:'3분기 미국 정제 설비 평균 가동률이 90%에 육박했음에도 석유제품 재고는 밴드 하단을 유지하고 있다. 수요 강세에 따른 업사이클이 도래했다고밖에 설명할 수 없는 상황이며, 정제 마진 강세에 힘입어 실적은 컨센서스를 상회할 전망이다.' },
      { title:'투자포인트 2. 중국발 전력난과 라니냐', body:'화력발전 및 난방용 대체재로서 등·경유의 매력도가 높아졌다. 중국 탈탄소 정책 방향 및 대외 이슈로 글로벌 전력난이 발생했으며, 전력 공급난으로 발생한 추가 수요와 중국 순수출 감소에 따른 공급 부담 완화는 국내 정유사에 유리하다. NOAA 전망에 따르면 올 겨울 라니냐 도래 확률은 70~80%에 달해 난방용 수요가 급등할 것으로 예상된다.' }
    ],
    valuation:'PBR Valuation을 채택했다. 목표주가 168,000원, 상승여력 65%, 투자의견 BUY를 제시한다.',
    members:'Research Team 2',
    pdf:'assets/reports/21-2_s_oil.pdf', pdfMeta:'PDF · 47 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'pnt', name:'피엔티', ticker:'137400', sector:'2차전지 장비', type:'Company Analysis', op:'BUY', tp:'46,000원', buy:'', cur:'32,900원', upside:'+40%', upNum:40, tpNum:46000, date:'2021.10.03', team:'Research Team 6', region:'Korea',
    headline:'이제는 장비주의 시간, 아직 싸다 피엔티',
    summary:'Roll to Roll 기술을 바탕으로 IT용 소재, 2차전지의 음극 및 분리막 소재, Copper 등의 코팅 및 슬리터 장비 제작 판매를 주요 사업으로 한다. 최근 대부분의 수주와 매출이 2차전지 및 동박 장비에서 나오는 추세로 2차전지 산업과 성장의 궤를 같이한다.',
    heroSummary:'국내 롤투롤 장비 시장 점유율 50%. 1H21 수주잔고 5,411억 원.',
    points:[
      { title:'투자포인트 1. 롤투롤이 견인하는 해자', body:'롤투롤 기술을 바탕으로 기술적 해자를 유지할 뿐 아니라 원자재 및 영업비용의 효율화를 통해 가격적 해자도 보유 중이다. 에너지밀도가 중요해짐에 따라 얇아지는 동박에 고른 장력을 가해 코팅·압축·절단하는 것이 중요한데 국내 기업으로는 독보적인 기술력을 보유 중이다. 국내 롤투롤 장비 시장 점유율은 압도적 1위로 전체 50%를 차지한다.' },
      { title:'투자포인트 2. 고객사와 함께 간다', body:'매출은 18년 2,567억 원, 19년 3,214억 원, 20년 3,900억 원으로 꾸준히 증가 중이며 수주잔고 역시 1H21 5,411억 원으로 국내 3사 및 각종 해외업체로부터 꾸준히 확보해 나가고 있다. 국내외 주요 고객사의 CAPA 증설에 따른 지속적인 수주잔고 증가가 예상되며, SK넥실리스向 동박장비 매출도 주목할 필요가 있다.' }
    ],
    valuation:'PER Valuation을 채택했다. 목표주가 46,000원, 상승여력 40%, 투자의견 BUY를 제시한다.',
    members:'Research Team 6',
    pdf:'assets/reports/21-2_pnt.pdf', pdfMeta:'PDF · 20 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'kolmar', name:'콜마비앤에이치', ticker:'200130', sector:'건강기능식품', type:'Company Analysis', op:'BUY', tp:'47,200원', buy:'', cur:'33,750원', upside:'+39.88%', upNum:39.88, tpNum:47200, date:'2021.10.03', team:'RFS Team 1', region:'Korea',
    headline:'널리 사람들을 건강하게 하라, 홍익콜마',
    summary:'한국콜마와 한국원자력연구원이 공동 설립한 민관 최초 합작회사로 미래창조과학부에 등록된 제1호 연구소 기업이다. 천연물 기반 신소재를 연구·개발하여 국내 건강기능식품과 화장품 시장의 혁신을 주도하고 있다.',
    heroSummary:'국내 건기식 시장 연평균 26.5% 성장. 중국은 세계 2위 시장이다.',
    points:[
      { title:'투자포인트 1. 고령화와 함께 커지는 건강기능식품 시장', body:'국내외 할 것 없이 건강기능식품 시장은 고속 성장하고 있다. 매년 세계 시장은 연평균 10%, 국내 시장은 연평균 26.5% 성장한다. 고령화 인구 비율이 높을수록 시장은 더욱 가파르게 성장한다. 동사는 개별인정형 원료를 기반으로 제품을 생산·판매하며 주력 상품은 헤모힘이다.' },
      { title:'투자포인트 2. 세계 2위 중국 건기식 시장', body:'한국 건기식 시장의 약 7배인 중국 건기식 시장은 14.8%의 점유율로 세계 2위다. 지난 10년간 연평균 약 9.5% 성장했으며 앞으로의 성장성도 기대된다. 애터미 차이나가 빠른 성장세에 있고 중국에 강소콜마와 연태콜마가 자리 잡고 있다. 강소콜마는 작년부터 가동을 시작해 매출을 내고 있으며 연태콜마는 올해 말 완공 예정이다.' }
    ],
    valuation:'PER Valuation을 채택했다. 목표주가 47,200원, 상승여력 39.88%, 투자의견 BUY를 제시한다.',
    members:'RFS Team 1',
    pdf:'assets/reports/21-2_kolmar_bnh.pdf', pdfMeta:'PDF · 22 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'ecopro21', name:'에코프로BM', ticker:'247540', sector:'2차전지', type:'Company Analysis', op:'BUY', tp:'195,000원', buy:'', cur:'172,700원', upside:'+12.9%', upNum:12.9, tpNum:195000, date:'2021.05.12', team:'RFS Research Team 2', region:'Korea',
    headline:'담고 보자 에코프로BM',
    summary:'리튬이온 2차전지의 핵심소재인 하이니켈계 양극 소재를 개발·생산하는 전지재료 사업을 영위한다. 2020년 매출액 8,552억 원(YoY +38%), 영업이익 560억 원(YoY +50%)을 기록했으며, 주요 원재료 가격 상승으로 매출 확대가 기대된다.',
    heroSummary:'국내 유일 NCA·하이니켈 NCM 동시 생산. 2023년 연 15만 톤 CAPA를 목표한다.',
    points:[
      { title:'투자포인트 1. 기술 경쟁력과 우수한 생산능력', body:'국내 유일 NCA와 하이니켈 NCM 양극재를 모두 생산하는 기업이다. 최근 NCM 9½½ 개발에 성공하는 등 뛰어난 양극재 생산 기술력을 보유하고 있으며, 이를 바탕으로 1H20 하이니켈 양극재 M/S 34%를 달성했다. 2023년까지 연간 15만 톤을 생산할 수 있도록 설비를 공격적으로 증설하고 있으며 이는 경쟁사 대비 가장 많은 용량이다.' },
      { title:'투자포인트 2. 안정적인 Supply Chain', body:'주요 고객사로는 삼성SDI와 SK이노베이션이 있다. 삼성SDI와는 JV를 맺어 양극재를 공급하고, SK이노베이션과는 20년 초 2조 7,000억 원 규모의 장기 공급계약을 맺어 양극재를 공급하게 된다. 향후 안정적인 supply chain 구축에 성공한 것이다.' }
    ],
    valuation:'PER Valuation을 채택했다. 21년 추정 매출액 1조 2,132억 원, 영업이익 889억 원, 당기순이익 728억 원을 기반으로 목표주가 195,000원, 상승여력 12.9%, 투자의견 BUY를 제시한다.',
    members:'RFS Research Team 2',
    pdf:'assets/reports/21-1_ecopro_bm.pdf', pdfMeta:'PDF · 22 pages', cover:'', heroCover:'', credit:'', creditHref:'' },
  { id:'lottechem', name:'롯데케미칼', ticker:'011170', sector:'석유화학', type:'Company Analysis', op:'BUY', tp:'540,000원', buy:'', cur:'301,000원', upside:'+79%', upNum:79, tpNum:540000, date:'2021.03.31', team:'RFS Research Team 5', region:'Korea',
    headline:'석유화학 슈퍼사이클의 서막',
    summary:'1976년 설립된 종합 석유화학 회사로 여수, 대산, 울산에 생산시설을 보유하고 있다. 에틸렌 생산 능력은 연간 4,500만 톤으로 국내 1위, 글로벌 13위 수준이다. 2021년에는 경기 회복 본격화와 기저효과로 큰 폭의 실적 개선이 이루어질 전망이다.',
    heroSummary:'21년 영업이익 2조 9,500억 원(YoY +738%). 슈퍼 어닝 서프라이즈를 전망한다.',
    points:[
      { title:'투자포인트 1. 주요 제품 업황 반등', body:'PE, PP, ABS 수요 성장세는 다소 둔화될 전망이나 절대적 수요 수준은 견조하므로 스프레드 강세는 지속될 것으로 전망한다. 화재로 가동 중단되었던 대산NCC의 정상화가 Olefin 사업부 이익 개선에 기여할 것이며, 미국 텍사스주 한파로 북미 주요 ECC 업체들이 가동을 중단하며 주력 제품 공급 부족이 심화돼 가격이 급등했다.' },
      { title:'투자포인트 2. ESG 경영과 4조 원 실탄', body:'2030년 중장기 전략 목표로 6조 원의 친환경 사업 매출액 창출을 구체화했다. 주목할 만한 신사업으로는 바이오 플라스틱 및 재생 플라스틱 사업, 2차전지용 PE 사업이 있다. 3.8조 원의 현금성자산과 20%대의 부채비율이라는 탄탄한 재무구조를 기반으로 신사업 M&A 기회를 노리고 있다.' }
    ],
    valuation:'21년 예상 매출액 21조 원(YoY +72%), 영업이익 2조 9,500억 원(YoY +738%)을 기반으로 목표주가 540,000원, 상승여력 79%, 투자의견 BUY를 제시한다.',
    members:'RFS Research Team 5',
    pdf:'assets/reports/21-1_lotte_chem.pdf', pdfMeta:'PDF · 48 pages', cover:'', heroCover:'', credit:'', creditHref:'' }
];
const termOf = (d) => { const y = +d.slice(0,4), m = +d.slice(5,7); return m >= 3 && m <= 8 ? (y % 100) + '-1' : (m >= 9 ? (y % 100) + '-2' : ((y - 1) % 100) + '-2'); };
REPORTS.forEach((r) => { r.term = termOf(r.date); });
const ROSTER = {"0":["정해원","이규달","장의성","정세호","황화희","김선명","민효재","장용수","정두균","정진현","현경태","변대규","김수현","박성주","도남국","노시원","진신우","노승원","이재환","서정은","김상수","유홍종","송창열","신경준","문준호","송혜경","나현진","김동호","최정인","주영숙","정성민","유혜림","천재서"],"1":["김도아","김인선","김효연","박기훈","장화영","이우택"],"2":["김소연","김수향","나종민","박민주","송현동","안혜원","윤석영","전민철","김동영","장서은"],"3":["김경아","최지원"],"4":["김유림"],"5":["김진영","민강근","박준규","윤선호"],"6":["고윤기","권오성","김동환","김하람","박은혜","이진강","정수정","정지아","최민정"],"7":["곽수신","류충한","박상하","박선영","박윤호","최영위","이은주","조상훈","조현정","최두혁","안수현"],"8":["강나래","곽태성","김덕기","박민우","남승규","김도연","홍지혜","김우진","정지효"],"9":["노희준","이승호","이승훈","이윤아","임성일","변재희","김주훈","박민우","장승찬"],"10":["김동현","이상인","이예나","김재석","김태민","김현주","류혜준","성예나","하수경","이지은","정대규"],"11":["신선호","이상열","이자인","김도현","이가운","조태호","최인영","박규연"],"12":["이주희","황수연","이준형","문수완","이윤수","전민규","황성연","전용식","한유정","주예지"],"13":["백상훈","이재우","배재성","최준태"],"14":["권택준","장성민","한치구","홍성준","김택돈","오정민","김인기","서한샘","인솔비","양진용","송은혜","윤재경","임형규","김화란","이호진"],"15":["김소정","이준현","정신애","최귀병","편주현","박성범","김동준","이동훈","오세홍","노승용","김휘재","배민성","변윤재"],"16":["김민석","문지환","박진한","엄대용","이도경","강진형","김학현","라태임","심상백","이수희","이승준","이한새","전승규","최용훈","하태일","김지현"],"17":["이찬종","최규범","김동규","유혜선","김도희","박소행","오찬영","한희승"],"18":["김태업","강민주","도애희","박수빈","정종훈","정진화","황지훈","윤현지","정현찬","김안식","김선식"],"19":["김민석","김영은","김진형","이혁균","추승완","황현경","이혜원"],"20":["강윤환","권성후","이동휘","전용덕","하창하","김진실","신민아","이민광","이재빈","최효정","채희애","임형규","박정희","정용","김정현","김희덕","서영석","신영범","이가경"],"21":["김태섭","라진철","유진선","이성호","장승모","최지윤","최창현","최현제","김현규","이동근","이민호","구범모","정아름","최고은","최민혁","정해명","임광빈","조웅희","최성빈","박건민"],"22":["강준형","김승일","유승현","조원희","양윤석","오주호","강희주","이주헌","정인묵","이슬이","류준규","김기덕","안혜선","신유정","지다은","이수민"],"23":["김지원","서지현","신영철","양진영","윤연주","이서현","이한","강민경","민용기","박성홍","안영준","양도봉","이세웅","이호연","이효정","정종길","조현재","차현호","한우경","한태욱","황지영"],"24":["강예리","강정묵","김동우","김민진","김소희","김지훈","박재경","서동주","이재영","이환","장대한","정다예","지수민","진상진","최우원","추정호","한선만","홍나경"],"25":["배준호","장영우","허수민","김현준","이나연","이영권","서채훈","장문영","정승윤","엄태환","김고은","김병창","최준호","김수빈","곽지윤","장영서","이승훈","박태규","최원우"],"26":["김동욱","김범수","김성민","김안치","김재환","남경현","방서현","손원희","송하은","신예찬","안선동","우의진","옥경석","정진","조희진","최성민","유현우"],"27":["고대호","김권우","김민혜","김범년","김지언","김하늘","김혜리","김혜정","박민주","박상호","윤예원","이원영","이준희","이혜진","임현재","장현수","허정","황성철"],"28":["김건","김대협","김동건","김민영","김석진","김영현","민태홍","박주영","심수은","이도영","이태경","임수영","장원영","정종연","전수경","조주연","주형돈","최정명","표다빈","피승한","한정훈"],"29":["고경태","김관희","김나영","김대영","김성원","김아현","김준식","민동욱","박빛이찬","백종길","유원걸","윤승욱","채인철"],"30":["권민규","김건","김나현","김동건","김동규","김민기","김정호","김혜린","박소정","배현준","서현지","송미정","유지현","윤지수","이민서","이영범","이유진","이윤지","이은솔","진현준","차윤지","최용우","최재민","하윤호","현지혜"],"31":["강윤성","권준환","김형진","박지은","서경민","서유진","송성곤","안윤수","이수민","이은혜","이진주","함진효","홍원빈"],"32":["권용수","권은혁","김도연","김유민","김지윤","김태형","김해린","도경민","백가연","성수원","송희언","안예린","안태윤","이승무","조유나","조준영","허준범","홍윤서","황성재"],"33":["강성재","김근아","김동윤","김성훈","문해일","박효정","서제덕","신혜주","염규리","오주영","이인복","이진구","정기정","정수환","정예림","진유진"],"34":["김건희","김민규","김세영","김유진","김윤호","김지현","박은지","박태하","송세희","신준섭","양홍석","원동민","유승주","유은비","이동근","이민형","이윤호","이지우","지유성","하승주","하진호","한지수"],"35":["강민지","권태연","김휘석","성지용","신동석","신서현","신재혁","유지희","윤은정","이기혁","이승욱","이웅기","이제성","이종훈","이지연","임소윤","전유나"],"36":["고예진","김수민","김효원","명수현","박성윤","방성원","상필주","서예원","서현지","오지영","이수정","이영빈","이윤학","이주현","이채린","정하윤","조이준","홍소현","홍우현"],"37":["구모성","김민하","김창영","김현재","남민수","박세진","박시후","신혜원","임범수","전성재","허민준","홍서연","홍현선"],"38":["고은진","김범석","김지우","김형주","박성은","신정빈","신호연","이주원","이충혁","장민호","전종은","최민영","최용호","최재은","한지선","황민협","황선우"],"39":["김나영","김지연","김혜림","손규영","연서희","오승은","원준식","유재현","이영서","이종택","이호찬","이희재","정예윤","채하진","탁동엽","형주훈"],"40":["고명은","김경표","박나영","박세연","박정훈","박정훈","박주원","배서윤","성시형","손지민","신예진","심민주","심희범","원호상","유소희","이의준","이정민","임우열","정한울","주혜원","채현기","최예림","황호성"],"41":["김기린","김동은","김민석","김민우","김두영","동진희","박연주","박진원","양준모","염도규","이재원","이승혁","이지성","임서진","정임수","정재웅","정준영"],"42":["강요한","김수진","김세정","김우주","류찬이","사도윤","서정민","신예은","위호진","이동헌","이원석","임동현"],"43":["강우진","김도연","김영빈","김유빈","남동호","문경민","박상훈","박수민","엄한새","우지원","윤은강","정성헌","정은기","조은비","주현익","한현욱"]};
const COHORTS = {0:33,1:6,2:10,3:2,4:1,5:4,6:9,7:11,8:9,9:9,10:11,11:8,12:10,13:4,14:15,15:13,16:16,17:8,18:11,19:7,20:19,21:20,22:16,23:21,24:18,25:19,26:17,27:18,28:21,29:13,30:25,31:13,32:19,33:16,34:22,35:17,36:19,37:13,38:17,39:16,40:23,41:17,42:12,43:16};
const FIN = ['증권','은행','자산운용사','보험사','금융권 그 외'];
const SEGS = [
  { label:'증권', pct:23, color:'#203864', dark:'#A8C6F0' },
  { label:'은행', pct:18, color:'#5C7CA8', dark:'#7089A8' },
  { label:'자산운용사', pct:6, color:'#8CA3BE', dark:'#93A4B8' },
  { label:'보험사', pct:4, color:'#A9B7C7', dark:'#AAB6C3' },
  { label:'금융권 그 외', pct:5, color:'#BCC6D2', dark:'#BFC7D0' },
  { label:'대기업', pct:20, color:'#77736C', dark:'#8A867F' },
  { label:'기타', pct:10, color:'#918D86', dark:'#9C988F' },
  { label:'회계법인', pct:7, color:'#ABA79F', dark:'#AEAAA1' },
  { label:'공기업', pct:6, color:'#C0BCB3', dark:'#C0BCB3' }];
const arcs = (segs, box, cx, opts) => {
  const total = segs.reduce((a, b) => a + b.pct, 0);
  let acc = 0;
  return segs.map((x, i) => {
    const r = opts.r(x), w = opts.w(x), C = 2 * Math.PI * r;
    const frac = x.pct / total;
    const len = frac * C;
    const groupEdge = i > 0 && (FIN.indexOf(x.label) >= 0) !== (FIN.indexOf(segs[i - 1].label) >= 0);
    const gap = groupEdge ? 11 : 3;
    const mid = (acc + frac / 2) * 2 * Math.PI - Math.PI / 2;
    acc += frac;
    return { ...x, r, w, pct: x.pct + '%', text: x.label + ' ' + x.pct + '%',
      dash: Math.max(len - gap, 0) + ' ' + (C - Math.max(len - gap, 0)),
      offset: -(acc - frac) * C,
      show: x.pct >= 7,
      size: x.pct >= 18 ? '15px' : '12.5px',
      weight: x.pct >= 18 ? '700' : '500',
      tone: x.label === '증권' ? '#F7F6F3' : 'rgba(247,246,243,0.72)',
      lx: (100 * (cx + opts.labelR * Math.cos(mid)) / box) + '%',
      ly: (100 * (cx + opts.labelR * Math.sin(mid)) / box) + '%' };
  });
};
const CHART = [
  { label:'증권사', pct:29, color:'#e0a63c', accent:true, ink:'#111c2e' },
  { label:'은행', pct:19, color:'#a8c4e8', ink:'#111c2e' },
  { label:'자산운용사·헤지펀드', pct:14, color:'#7d9fd1', ink:'#111c2e', ring:false },
  { label:'회계법인·컨설팅', pct:6, color:'#c9c3b4', ink:'#111c2e' },
  { label:'대기업', pct:27, color:'#6f6a5f', ink:'#F7F6F3' },
  { label:'공공기관', pct:5, color:'#454239', ink:'#F7F6F3' }];
// 알럼나이 재직 기관 로고 (assets/network/*.webp, 흰색 단색). r: 줄 번호. 첫 화면(줄마다 앞 6개)에 선호도 상위 30곳, 나머지는 순위대로 줄마다 번갈아 배치. a: 가로/세로 비율
const NETWORK = [
  { n:'국민연금공단', f:'nps', r:0, a:4.05 },
  { n:'김앤장 법률사무소', f:'kimchang', r:0, a:9.69 },
  { n:'J.P. Morgan', f:'jpmorgan', r:0, a:4.85 },
  { n:'PwC', f:'pwc', r:0, a:2.06 },
  { n:'KPMG', f:'kpmg', r:0, a:2.5 },
  { n:'EY', f:'ey', r:0, a:0.99 },
  { n:'신한은행', f:'shinhan', r:0, a:3.44 },
  { n:'NH농협은행', f:'nhbank', r:0, a:6.81 },
  { n:'브이아이자산운용', f:'vi', r:0, a:1.16 },
  { n:'현대해상', f:'hi', r:0, a:4.78 },
  { n:'코스콤', f:'koscom', r:0, a:5.05 },
  { n:'iM증권', f:'imsec', r:0, a:10.33 },
  { n:'삼성전기', f:'semco', r:0, a:4.71 },
  { n:'흥국증권', f:'heungkuk', r:0, a:4.6 },
  { n:'롯데', f:'lotte', r:0, a:5.16 },
  { n:'LS ELECTRIC', f:'lselectric', r:0, a:6.23 },
  { n:'GS건설', f:'gs', r:0, a:1.94 },
  { n:'두산건설', f:'doosan', r:0, a:6.91 },
  { n:'미래에셋증권', f:'mirae', r:1, a:4.22 },
  { n:'NH-Amundi자산운용', f:'nh-amundi', r:1, a:6.67 },
  { n:'삼성증권', f:'samsung-sec', r:1, a:3.44 },
  { n:'한국투자증권', f:'koreainv', r:1, a:7.31 },
  { n:'KB금융', f:'kb', r:1, a:3.05 },
  { n:'대신증권', f:'daishin', r:1, a:2.46 },
  { n:'한화', f:'hanwha', r:1, a:1.53 },
  { n:'타이거자산운용', f:'tiger', r:1, a:3.68 },
  { n:'SGI서울보증', f:'sgi', r:1, a:4.97 },
  { n:'SC제일은행', f:'sc', r:1, a:2.55 },
  { n:'LS증권', f:'ls', r:1, a:2.22 },
  { n:'KT', f:'kt', r:1, a:1.23 },
  { n:'금융보안원', f:'fsec', r:1, a:3.23 },
  { n:'지멘스 헬시니어스', f:'siemens-hc', r:1, a:4.22 },
  { n:'LS전선', f:'lscable', r:1, a:5.47 },
  { n:'농협', f:'nonghyup', r:1, a:3.11 },
  { n:'오리온', f:'orion', r:1, a:4.58 },
  { n:'키움증권', f:'kiwoom', r:2, a:3.21 },
  { n:'메리츠', f:'meritz', r:2, a:3.44 },
  { n:'타임폴리오자산운용', f:'timefolio', r:2, a:5.47 },
  { n:'미래에셋자산운용', f:'mirae-am', r:2, a:3.16 },
  { n:'하나금융', f:'hana', r:2, a:4.88 },
  { n:'하나은행', f:'hanabank', r:2, a:3.71 },
  { n:'신영증권', f:'shinyoung', r:2, a:4.18 },
  { n:'iM에셋자산운용', f:'imam', r:2, a:19.2 },
  { n:'삼성전자', f:'samsung', r:2, a:6.4 },
  { n:'신용보증기금', f:'kodit', r:2, a:6.65 },
  { n:'SK증권', f:'sk', r:2, a:1.27 },
  { n:'한양증권', f:'hanyang', r:2, a:6.24 },
  { n:'넥슨', f:'nexon', r:2, a:3.27 },
  { n:'현대글로비스', f:'glovis', r:2, a:4.41 },
  { n:'보쉬', f:'bosch', r:2, a:4.48 },
  { n:'현대로템', f:'rotem', r:2, a:2.95 },
  { n:'MG새마을금고', f:'mg', r:2, a:4.45 },
  { n:'태광산업', f:'taekwang', r:2, a:4.94 },
  { n:'한국증권금융', f:'ksfc', r:3, a:3.59 },
  { n:'신한자산운용', f:'shinhan-am', r:3, a:11.21 },
  { n:'법무법인 율촌', f:'yulchon', r:3, a:3.4 },
  { n:'한국기업평가', f:'korearatings', r:3, a:1.33 },
  { n:'마스턴투자운용', f:'mastern', r:3, a:3.69 },
  { n:'우리은행', f:'woori', r:3, a:6.41 },
  { n:'교보', f:'kyobo', r:3, a:2.01 },
  { n:'DB', f:'db', r:3, a:1.78 },
  { n:'한국무역보험공사', f:'ksure', r:3, a:10.67 },
  { n:'유안타증권', f:'yuanta', r:3, a:5.1 },
  { n:'AIA생명', f:'aia', r:3, a:2.59 },
  { n:'한국전력공사', f:'kepco', r:3, a:5.08 },
  { n:'LG유플러스', f:'lguplus', r:3, a:3.63 },
  { n:'로레알', f:'loreal', r:3, a:5.52 },
  { n:'현대위아', f:'wia', r:3, a:2.77 },
  { n:'국민건강보험공단', f:'nhis', r:3, a:2.96 },
  { n:'한글과컴퓨터', f:'hancom', r:3, a:3.17 },
  { n:'삼성생명', f:'samsunglife', r:4, a:5.66 },
  { n:'삼성화재', f:'samsungfire', r:4, a:16.13 },
  { n:'토스', f:'toss', r:4, a:3.26 },
  { n:'현대자동차', f:'hyundai', r:4, a:7.67 },
  { n:'LG전자', f:'lg', r:4, a:2.27 },
  { n:'IBK기업은행', f:'ibk', r:4, a:4.62 },
  { n:'KIS자산평가', f:'kispricing', r:4, a:4.36 },
  { n:'KB손해보험', f:'kbins', r:4, a:7.5 },
  { n:'금융결제원', f:'kftc', r:4, a:3.59 },
  { n:'유진투자증권', f:'eugene', r:4, a:4.12 },
  { n:'HD현대중공업', f:'hdhhi', r:4, a:6.0 },
  { n:'한국수력원자력', f:'khnp', r:4, a:4.85 },
  { n:'아모레퍼시픽', f:'amore', r:4, a:10.0 },
  { n:'LX인터내셔널', f:'lx', r:4, a:2.86 },
  { n:'한화큐셀', f:'qcells', r:4, a:4.23 },
  { n:'KCC', f:'kcc', r:4, a:1.81 },
  { n:'GS SHOP', f:'gsshop', r:4, a:5.4 }];
// FUND 첫 화면 사진: 겨울 산 (눈 덮인 긴 언덕 = 버핏의 '스노볼')
const FUND_BG = [
  { src: 'assets/hero/fund-snow_dark.webp', pos: 'center 40%', scrim: '0.12', credit: 'Photo: Nathan Anderson (Unsplash, CC0)', href: 'https://commons.wikimedia.org/w/index.php?curid=61895601' }];
// AGORA 로그인 전 화면의 별 이름: WHERE WE WORK 줄마다 앞 9곳(첫 화면 6곳 + 다음 3곳), 첫 화면 기관부터
const GATE_TOP = ['J.P. Morgan', 'PwC', '타임폴리오자산운용', 'NH-Amundi자산운용'];   // 로그인 칸 바로 옆 가장 눈에 띄는 자리에 먼저
const GATE_NAMES = [...GATE_TOP, ...[[0, 6], [6, 9]].flatMap(([a, b]) => [0, 1, 2, 3, 4].flatMap((r) => NETWORK.filter((x) => x.r === r).slice(a, b).map((x) => x.n))).filter((n) => !GATE_TOP.includes(n))];
// lead: 이 줄에서 맨 앞으로 올릴 로고(모바일은 화면이 좁아 첫 줄에 J.P.Morgan·PwC부터)
const netRows = (lead = []) => [0, 1, 2, 3, 4].map((r) => {
  const row = NETWORK.filter((x) => x.r === r);
  const items = row.filter((x) => lead.indexOf(x.f) >= 0).sort((a, b) => lead.indexOf(a.f) - lead.indexOf(b.f)).concat(row.filter((x) => lead.indexOf(x.f) < 0)).map((x) => {
    const hpx = Math.round(Math.min(64, Math.max(26, 44 / Math.sqrt(x.a / 3))));
    return { name: x.n, src: 'assets/network/' + x.f + '.webp', hpx: hpx + 'px', h: hpx, w: Math.round(hpx * x.a) };
  });
  return { items: items.concat(items, items), dur: Math.round(items.length * (9 + r * 1.2)) + 's', dir: r % 2 ? 'reverse' : 'normal' };
});
const BOX = 480, CEN = 240;
const slices = (hover, on, drawn) => {
  const total = CHART.reduce((a, b) => a + b.pct, 0);
  let acc = 0;
  return CHART.map((x, i) => {
    const hot = hover === i;
    const r = x.accent ? 174 : 170;
    const w = (x.accent ? 68 : 60) + (hot ? 12 : 0);
    const C = 2 * Math.PI * r, Ce = 2 * Math.PI * 134;
    const frac = x.pct / total, len = frac * C;
    const mid = (acc + frac / 2) * 2 * Math.PI - Math.PI / 2;
    const start = acc;
    acc += frac;
    return { ...x, r, w, i,
      dash: drawn ? Math.max(len - 3, 0) + ' ' + (C - Math.max(len - 3, 0)) : '0 ' + C,
      offset: -start * C,
      echoDash: drawn ? Math.max(frac * Ce - 3, 0) + ' ' + (Ce - Math.max(frac * Ce - 3, 0)) : '0 ' + Ce,
      echoOffset: -start * Ce,
      opacity: !drawn ? '1' : (hover === null || hot ? '1' : '0.5'),
      echoOpacity: !drawn ? '0.35' : (hover === null || hot ? '0.35' : '0.16'),
      delay: (i * 60) + 'ms',
      onEnter: () => on(i),
      big: x.ring !== false && x.pct >= 10,
      small: x.ring === false || x.pct < 10,
      size: x.accent ? '22px' : '15px',
      text: x.label,
      val: x.pct + '%',
      lx: (100 * (CEN + 170 * Math.cos(mid)) / BOX) + '%',
      ly: (100 * (CEN + 170 * Math.sin(mid)) / BOX) + '%' };
  });
};
const ring = (segs, r) => {
  const C = 2 * Math.PI * r;
  const sum = segs.reduce((a, b) => a + b.pct, 0);
  let acc = 0;
  return segs.map((x) => {
    const len = (x.pct / sum) * C;
    const seg = { ...x, pct: x.pct + '%', dash: Math.max(len - 1.5, 0) + ' ' + (C - Math.max(len - 1.5, 0)), offset: -acc };
    acc += len;
    return seg;
  });
};
const opStyle = (op) => op === 'BUY' ? { c:'#203864', a:'1' } : op === 'SELL' ? { c:'#1A1A1A', a:'0.65' } : { c:'#1A1A1A', a:'1' };

const RES_HERO = Math.random() < 0.5 ? '' : '-b';
// 운용보고서 부록 숫자: 일별 기준가 [날짜, 기준가, KOSPI] 로 기간 수익률·기준가 변화·위험 지표를 계산한다 (모두 % 비율)
const wkStats = (hist, week) => {
  const end = new Date(new Date(week + 'T00:00:00').getTime() + 4 * 864e5).toISOString().slice(0, 10);
  const H = hist.filter((h) => h[0] <= end && h[1]); if (H.length < 2) return {};
  const last = H[H.length - 1], at = (d) => { let r = H[0]; H.forEach((h) => { if (h[0] <= d) r = h; }); return r; };
  const ago = (days) => at(new Date(new Date(last[0] + 'T00:00:00').getTime() - days * 864e5).toISOString().slice(0, 10));
  const pct = (a, b) => (a && b ? (a / b - 1) * 100 : null), f = (v) => (v == null ? '-' : (v > 0 ? '+' : '') + v.toFixed(2));
  const per = [['1주', ago(7)], ['1개월', ago(30)], ['3개월', ago(91)], ['설정 이후', H[0]]].map(([k, r]) => { const a = pct(last[1], r[1]), b = pct(last[2], r[2]); return [k, f(a), f(b), a != null && b != null ? f(a - b) : '-']; });
  const prev = at(new Date(new Date(week + 'T00:00:00').getTime() - 864e5).toISOString().slice(0, 10));
  const rf = [], rk = [];
  for (let i = 1; i < H.length; i++) { if (H[i - 1][1] && H[i][1] && H[i - 1][2] && H[i][2]) { rf.push(H[i][1] / H[i - 1][1] - 1); rk.push(H[i][2] / H[i - 1][2] - 1); } }
  const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1), sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
  let peak = 0, mdd = 0; H.forEach((h) => { peak = Math.max(peak, h[1]); mdd = Math.min(mdd, h[1] / peak - 1); });
  const mf = mean(rf), mk = mean(rk), cov = mean(rf.map((x, i) => (x - mf) * (rk[i] - mk))), vk = sd(rk) ** 2;
  const risk = rf.length > 5 ? [['연환산 변동성 (펀드)', (sd(rf) * Math.sqrt(252) * 100).toFixed(1) + '%'], ['연환산 변동성 (KOSPI)', (sd(rk) * Math.sqrt(252) * 100).toFixed(1) + '%'],
    ['최대 낙폭 (MDD)', (mdd * 100).toFixed(1) + '%'], ['베타 (KOSPI 대비)', vk ? (cov / vk).toFixed(2) : '-'], ['추적오차 (연환산)', (sd(rf.map((x, i) => x - rk[i])) * Math.sqrt(252) * 100).toFixed(1) + '%']] : [];
  return { per, perAsOf: last[0].slice(5).replace('-', '.'), navs: prev[0] < week ? [prev[0].slice(5).replace('-', '.'), prev[1].toFixed(2), last[0].slice(5).replace('-', '.'), last[1].toFixed(2), f(pct(last[1], prev[1]))] : null, risk, riskFrom: H[0][0].replace(/-/g, '.') };
};
// 운용팀 기본 명단: 위클리에 운용 인력을 따로 적지 않았을 때 보고서와 글쓰기 칸에 쓴다 [이름, 직책, 담당 섹터, 기수, 주요 경력]
const FUND_TEAM = [['박정훈', '운용역', '', '40기', ''], ['심민주', '운용역', '', '40기', ''], ['서정민', '운용역', '', '42기', ''], ['김영빈', '운용역', '', '43기', ''], ['박상훈', '운용역', '', '43기', ''], ['주현익', '운용역', '', '43기', '']];
// AMT Fund 업종: 운용팀 분류 (종목이 새로 편입되면 여기에 추가). FUND 화면과 운용보고서 PDF가 같이 쓴다
const FUND_SECTOR = {
  '009150': '전자부품', '353200': 'PCB·기판', '007660': 'PCB·기판', '222800': 'PCB·기판', '007810': 'PCB·기판',
  '064290': '반도체 장비·부품', '039030': '반도체 장비·부품', '058470': '반도체 장비·부품', '089030': '반도체 장비·부품', '330860': '반도체 장비·부품',
  '005930': '반도체', '000660': '반도체', '103590': '전력기기', '062040': '전력기기', '033790': '2차전지 소재',
  '003490': '항공', '041830': '의료기기', 'TRMD': '해운', '035900': '엔터', '041510': '엔터', '352820': '엔터', '096770': '정유·화학',
};
class Component extends DCLogic {
  state = { weekly: (() => { try { const c = JSON.parse(localStorage.getItem('rfs_wk_cache') || 'null'); return Array.isArray(c) ? c : undefined; } catch (e) { return undefined; } })(), posts:[], agoraLoaded:false, pTitle:'', pBody:'', posting:false, navMode:'dark', activeSec:'about-values', ...(() => { try { const r = routeFromLocation(); return { page: r.page, reportId: r.reportId || 'trmd', ...(r.intraTab ? { intraTab: r.intraTab } : {}) }; } catch (e) { return { page: 'home', reportId: 'trmd' }; } })(), fSector:'All sectors', fOp:'All ratings', fYear:'All terms', fRegion:'All regions', q:'', page1:1, sortKey:'date', sortDir:-1, faqOpen:-1, menuOpen:false, pastHero:false, counted:false, hoverSlice:null, drawn:false, heroIdx:0, heroFade:false, bxIdx:0, email:'', notified:false, cohort:'43기', user:null, intraTab:'dashboard', intraQ:'', intraCohort:43, intraData:null, rfmData:null, dirQ:'', dirInd:'전체', dirCoffee:false, coffeeFor:null, coffeeSent:false, cName:'', cCohort:'', cMsg:'', isMobile: typeof window !== 'undefined' && window.innerWidth <= 768 };

  prefetchHero() {
    if (this._pf) return;
    this._pf = [];
    const hero = REPORTS.filter((r) => r.upside && r.upside !== '-');
    const cur = ((this.state.heroIdx % hero.length) + hero.length) % hero.length;
    const order = [];
    for (let k = 1; k <= hero.length; k++) {
      order.push(hero[(cur + k) % hero.length]);
      order.push(hero[(cur - k + hero.length * 2) % hero.length]);
    }
    const urls = [];
    order.forEach((r) => { if (r) [r.heroBg, r.heroCover].forEach((u) => { if (u && urls.indexOf(u) < 0) urls.push(u); }); });
    let i = 0;
    const next = () => {
      if (i >= urls.length) return;
      const im = new Image();
      im.decoding = 'async';
      im.onload = im.onerror = () => { const go = () => next(); window.requestIdleCallback ? requestIdleCallback(go, { timeout: 400 }) : setTimeout(go, 60); };
      im.src = urls[i++];
      this._pf.push(im);
    };
    // 동시 2건으로 대역폭 점유를 낮춘다
    next(); next();
  }

  componentDidMount() {
    // 홈 히어로를 잡고 좌우로 끌면 화면이 따라오고, 충분히 끌면 다음/이전 리포트로 넘어간다 (조금만 끌면 제자리로)
    {
      let drag = null;
      const els = () => document.querySelectorAll('section.hero .hero-bgwrap, section.hero .hero-grid');
      const put = (x, ms) => els().forEach((el) => { el.style.transition = ms ? `transform ${ms}ms cubic-bezier(.4,0,.2,1)` : 'none'; el.style.transform = x ? `translate3d(${x}px,0,0)` : ''; });
      document.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.pointerType !== 'mouse' || this._heroBusy) return;
        const sec = e.target.closest && e.target.closest('section.hero');
        if (!sec || e.target.closest('button, input, textarea')) return;
        drag = { sec, x: e.clientX, y: e.clientY, dx: 0, t: performance.now(), moved: false };
      });
      document.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.x;
        if (!drag.moved) {
          if (Math.abs(dx) < 6) return;
          if (Math.abs(e.clientY - drag.y) > Math.abs(dx)) { drag = null; return; }   // 세로로 움직이면 끌기가 아니다
          drag.moved = true; drag.sec.classList.add('dragging');
        }
        drag.dx = dx; put(dx, 0);
      });
      const end = () => {
        if (!drag) return;
        const d = drag; drag = null; d.sec.classList.remove('dragging');
        if (!d.moved) return;
        this._heroDraggedAt = performance.now();
        const fast = Math.abs(d.dx) > 40 && Math.abs(d.dx) / Math.max(1, performance.now() - d.t) > 0.5;
        if ((Math.abs(d.dx) > d.sec.clientWidth * 0.15 || fast) && this._heroStep) this._heroStep(d.dx < 0 ? 1 : -1);
        else { put(0, 300); setTimeout(() => els().forEach((el) => { el.style.transition = ''; }), 320); }
      };
      document.addEventListener('pointerup', end);
      document.addEventListener('pointercancel', end);
      // 끌고 놓은 직후의 클릭(제목·READ 버튼)은 무시한다
      document.addEventListener('click', (e) => { if (this._heroDraggedAt && performance.now() - this._heroDraggedAt < 350 && e.target.closest && e.target.closest('section.hero')) { e.preventDefault(); e.stopPropagation(); } }, true);
      document.addEventListener('dragstart', (e) => { if (e.target.closest && e.target.closest('section.hero')) e.preventDefault(); });
    }
    window.heroScrollWants = window.heroScrollWants || ((e) => { const sc = e.target && e.target.closest && e.target.closest('.hero-scroll'); if (!sc) return false; return e.deltaY > 0 ? sc.scrollTop + sc.clientHeight < sc.scrollHeight - 1 : sc.scrollTop > 0; });   // 히어로 표지 안에서 더 굴릴 데가 남았으면 페이지 휠 이동이 가로채지 않는다
    setTimeout(() => this.heroAuto(), 0);
    // 히어로 표지 위에 마우스가 있는 동안은 자동 넘김을 멈춘다 (휠로 내려 읽는 중)
    document.addEventListener('mouseover', (e) => { this._heroHold = !!(e.target.closest && e.target.closest('.hero-cover-wrap')); });
    document.addEventListener('scroll', (e) => { const t = e.target; if (t.classList && t.classList.contains('hero-scroll')) t.parentNode.parentNode.classList.toggle('scrolled', t.scrollTop > 8); }, true);
    window.__wkReady = () => this.wkDom(); this.wkDom();
    // Weekly Strategy: 흰 리포트 종이 위로 내려가면 메뉴 글자가 묻히지 않게 메뉴에 어두운 바탕을 깐다
    window.addEventListener('scroll', () => document.documentElement.classList.toggle('wk-solid', this.state.page === 'strategy' && window.scrollY > 160), { passive: true });
    // 카드가 화면에 들어오면 in 클래스를 붙여 등장 효과를 한 번 재생한다
    if ('IntersectionObserver' in window && 'MutationObserver' in window) {
      document.documentElement.classList.add('fx');
      // 카드가 12% 보이거나, 아주 긴 카드(위클리 전문 등)는 화면의 30%를 채우면 나타난다. 12%만 보면 화면보다 8배 긴 카드는 영영 안 나타난다
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && (e.intersectionRatio >= 0.12 || e.intersectionRect.height >= window.innerHeight * 0.3)) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: [0, 0.05, 0.12, 0.3, 0.6] });
      // 펀드 카드 + 다른 페이지(홈 제외)의 본문 블록에도 같은 등장 효과
      const blocks = 'main section:not(.pg-hero):not(.hero) > .wrap > *:not(.rv), main.mhome section:not(.pg-hero) > *:not(.rv)';
      const scan = () => {
        document.querySelectorAll('.fd-card:not([data-fx])').forEach((el) => { el.setAttribute('data-fx', '1'); io.observe(el); });
        document.querySelectorAll(blocks).forEach((el) => {
          if (el.hasAttribute('data-fx') || el.closest('.fdpage, [data-screen-label="홈"], [data-screen-label="홈 (모바일)"], [data-screen-label="아고라"]')) return;
          el.setAttribute('data-fx', '1'); el.setAttribute('data-fxb', ''); io.observe(el);
        });
      };
      // 히어로를 지나면 상단 메뉴에 배경을 깔아 아래 고정 탭과 한 덩어리로 보이게
      const solid = (on) => { const d = document.documentElement; if (document.querySelector('main.pgx .story')) on = false; if (document.querySelector('.rpt-paper, .rf-side')) on = window.scrollY > 60; d.classList.toggle('nav-solid', on); d.classList.toggle('nav-dark', on && !!document.querySelector('main.fdpage')); };
      // 리포트 화면엔 큰 사진(.pg-hero)이 없어서, 조금 내리면 바로 메뉴 바탕을 깐다 (안 그러면 투명한 메뉴가 본문 글자와 겹친다)
      window.addEventListener('scroll', () => { if (document.querySelector('.rpt-paper, .rf-side')) solid(false); }, { passive: true });
      const hio = new IntersectionObserver((es) => es.forEach((e) => solid(!e.isIntersecting && e.boundingClientRect.top < 0)), { rootMargin: '-84px 0px 0px 0px' });
      const scanHero = () => {
        const h = document.querySelector('.pg-hero');
        if (h === this._fxHero) return;
        if (this._fxHero) hio.unobserve(this._fxHero);
        this._fxHero = h; solid(false);
        if (h) hio.observe(h);
      };
      scan(); scanHero();
      new MutationObserver(() => { scan(); scanHero(); }).observe(document.body, { childList: true, subtree: true });
    }
    this._prefetch = () => {
      const urls = [...document.querySelectorAll('image-slot[src]')].map((el) => el.getAttribute('src')).filter((u) => u && !u.startsWith('{'));
      urls.slice(0, 12).forEach((u) => { const i = new Image(); i.decoding = 'async'; i.src = u; });
    };
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
    // 메뉴 페이지 맨 위 사진은 그 페이지를 열 때 처음 받기 시작해서 늦게 떴다. 첫 화면이 뜬 뒤 미리 받아 둔다 (기기에 맞는 크기로)
    this._menuHeroes = () => {
      const m = window.innerWidth <= 768, u = 'https://images.unsplash.com/photo-';
      return {
        fund: ['assets/hero/sky.webp?v=1014'], rfm: [m ? 'assets/hero/nyse-m.webp' : 'assets/hero/nyse.webp'], people: ['assets/people-group.webp'],
        research: [m ? 'assets/hero/research' + RES_HERO + '-m.webp?v=1020' : 'assets/hero/research' + RES_HERO + '.webp?v=1020'],
        about: [u + '1682332402542-652cb5dcf31f?auto=format&fit=crop&w=1920&q=80'],
        recruit: [m ? 'assets/hero/recruit-m.webp' : 'assets/hero/recruit.webp'],
        intranet: [m ? 'assets/hero/cau-m.webp' : 'assets/hero/cau.webp'],
      };
    };
    this._heroGot = {};
    this.preloadHero = (page) => {
      ((this._menuHeroes()[page]) || []).forEach((src) => {
        if (this._heroGot[src]) return;
        const i = new Image(); i.decoding = 'async'; i.src = src; this._heroGot[src] = i;
      });
    };
    // 히어로가 6.5초마다 넘어가므로 다음 리포트 사진을 가장 먼저 받고, 그다음 메뉴 첫 화면 사진, 마지막으로 나머지
    idle(() => { this.prefetchHero(); Object.keys(this._menuHeroes()).forEach((p) => this.preloadHero(p)); this._prefetch && this._prefetch();
      // 리포트 글꼴을 미리 받아 둔다 (리포트를 열었을 때 바로 보이게)
      window.__rfsFont && window.__rfsFont(); });   // 용어집(5.8MB)은 Research·리포트에 들어갈 때만 받는다
    document.addEventListener('click', (e) => {
      const t = e.target.closest && e.target.closest('.gl');
      if (t) { e.preventDefault(); this.glOpen(t); return; }
      if (e.target.closest && e.target.closest('#gl-pop') && !e.target.closest('.gl-x, .gl-ok')) return;
      this.glClose();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { this.glClose(); if (this.state.menuOpen) this.setState({ menuOpen:false }); } });
    window.addEventListener('hashchange', () => this.glClose());
    this._onHash = () => this.applyHash();
    window.addEventListener('hashchange', this._onHash);
    // 리포트 개별 주소와 메인 사이를 뒤로/앞으로 가기로 오갈 때는 hashchange가 안 날 수 있다
    this._onPop = () => { if (location.pathname !== '/') this.applyHash(); };
    window.addEventListener('popstate', this._onPop);
    const SB_URL = 'https://xyewclvpshldjucryapr.supabase.co';
    const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZXdjbHZwc2hsZGp1Y3J5YXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NzI0MTAsImV4cCI6MjEwNTA0ODQxMH0.6JRZhZ6FPh-VUb1RHGf0wxfo_Y69ZQ-V6vk6TCoyM4c';
    if (window.supabase) {
      // 로그인은 이 탭에서만 유지한다 (새로고침은 괜찮고, 탭·브라우저를 닫았다 다시 오면 다시 로그인). 예전처럼 브라우저에 남아 있던 로그인은 지운다
      try { Object.keys(localStorage).forEach((k) => { if (/^sb-.*-auth-token/.test(k)) localStorage.removeItem(k); }); } catch (e) {}
      let store; try { store = window.sessionStorage; } catch (e) {}
      this.sb = window.supabase.createClient(SB_URL, SB_KEY, store ? { auth: { storage: store, persistSession: true } } : { auth: { persistSession: false } });
      // 학회원으로 로그인한 기기는 GA에서 내부 방문(traffic_type=internal)으로 표시해 외부 방문 지표와 섞이지 않게 한다
      const markMember = (ses) => { if (!ses) return; try { localStorage.setItem('rfs_member', '1'); } catch (e) {} try { window.gtag && window.gtag('set', { traffic_type: 'internal' }); } catch (e) {} };
      // 다른 화면(Polaris 등)에서 로그인하러 왔으면 로그인하자마자 돌려보낸다 (10분 안에 온 요청만)
      const back = (ses) => { if (!ses) return; try { const r = JSON.parse(sessionStorage.getItem('rfs_after_login') || 'null'); sessionStorage.removeItem('rfs_after_login'); if (r && /^\/(?!\/)[\w/-]*$/.test(r.to) && Date.now() - r.at < 600000) location.href = r.to; } catch (e) {} };
      // 학회원이 아닌 일반 회원은 app_metadata.role = 'guest' (가입 승인 때 관리자가 정한다). 값이 없으면 학회원(공용 계정·예전 승인)
      const isGuest = (u) => !!(u && u.app_metadata && u.app_metadata.role === 'guest');
      const setU = (ses) => back(ses) || markMember(ses) || this.setState({ user: ses ? { email: ses.user.email, name: (ses.user.user_metadata && ses.user.user_metadata.name) || '', cohort: (ses.user.user_metadata && ses.user.user_metadata.cohort) || '', phone: (ses.user.user_metadata && ses.user.user_metadata.phone) || '', guest: isGuest(ses.user) } : null }, () => { if (ses) { if (!isGuest(ses.user)) { this.loadAgora(); this.loadIntra(); } this.loadRfm(); this.loadJoinAdmin(ses.user.email); } else { this._joinFor = null; this.setState({ intraData: null, fundLive: null, joinPending: null }); this.loadRfm(); } });
      this.sb.auth.getSession().then(({ data }) => setU(data.session));
      this.sb.auth.onAuthStateChange((_e, ses) => setU(ses));
    }
    const ni = null;
    if (ni) {
      ni.on('init', (u) => this.setState({ user: u ? { email: u.email, name: (u.user_metadata && u.user_metadata.full_name) || '' } : null }));
      ni.on('login', (u) => { this.setState({ user: { email: u.email, name: (u.user_metadata && u.user_metadata.full_name) || '' } }); ni.close(); });
      ni.on('logout', () => this.setState({ user: null, intraTab: 'dashboard' }));
      ni.init();
    }
    this._onResize = () => { const m = window.innerWidth <= 768; if (m !== this.state.isMobile) this.setState({ isMobile: m }, () => { this.setupReveal(); this.setupNav(); }); };
    window.addEventListener('resize', this._onResize);
    this.applyHash();
    this.setupReveal();
    this.setupNav();
  }

  pickNavMode() {
    if (this.state.page === 'intranet' || this.state.page === 'rfm' || this.state.page === 'fund' || this.state.page === 'strategy') { if (this.state.navMode !== 'dark') this.setState({ navMode: 'dark' }); return; }
    let mode = 'light';
    document.querySelectorAll('[data-nav]').forEach((n) => {
      const r = n.getBoundingClientRect();
      if (r.top <= 72 && r.bottom > 0) mode = n.dataset.nav === 'dark' ? 'dark' : 'light';
    });
    if (mode !== this.state.navMode) this.setState({ navMode: mode });
  }

  setupCount() {
    if (this._countDone) return;
    if (!this._cntIo) this._cntIo = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { this._cntIo.disconnect(); this.runCount(); }
    }, { threshold: 0.2 });
    requestAnimationFrame(() => {
      if (this._cntIo && !this._countDone) document.querySelectorAll('[data-count-root]').forEach((n) => this._cntIo.observe(n));
    });
  }

  runCount() {
    if (this._countDone) return;
    const nodes = [...document.querySelectorAll('[data-hero-num]')].filter((n) => parseInt(n.dataset.target, 10) > 0);
    if (!nodes.length) return;
    this._countDone = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ counted: true }); return; }
    const targets = nodes.map((n) => parseInt(n.dataset.target, 10) || 0);
    const dur = 900, t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      nodes.forEach((n, i) => { n.textContent = Math.round(targets[i] * e); });
      if (p < 1) requestAnimationFrame(step);
      else this.setState({ counted: true });
    };
    requestAnimationFrame(step);
  }

  checkHero() {
    const hero = document.querySelector('.hero');
    const past = !hero || hero.getBoundingClientRect().bottom <= 140;
    if (past !== this.state.pastHero) this.setState({ pastHero: past });
  }

  setupNav() {
    this._onScroll = () => {
      if (this._rafScroll) return;
      this._rafScroll = requestAnimationFrame(() => { this._rafScroll = null; this.checkHero(); });
    };
    window.addEventListener('scroll', this._onScroll, { passive: true });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.setState({ drawn: true });
    else setTimeout(() => this.setState({ drawn: true }), 120);
    this.setupCount();
    this.setupSnap();
    this._navIo = new IntersectionObserver(() => this.pickNavMode(),
      { rootMargin: '-72px 0px 0px 0px', threshold: [0, 0.01, 0.5, 0.99, 1] });
    this._onResize = () => { this.pickNavMode(); this.checkHero(); };
    window.addEventListener('resize', this._onResize);
    this.observeSentinel();
  }

  observeSentinel() {
    requestAnimationFrame(() => {
      if (this._navIo) {
        this._navIo.disconnect();
        const secs = document.querySelectorAll('[data-nav]');
        if (secs.length) {
          secs.forEach((n) => this._navIo.observe(n));
          this.pickNavMode();
          [120, 400, 1200].forEach((t) => setTimeout(() => this.pickNavMode(), t));
        } else this.setState({ navMode: 'light' });
      }
      this.checkHero();
      this.setupCount();
      if (!this._secIo) {
        this._secIo = new IntersectionObserver((es) => {
          const hit = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          if (hit && hit.target.id !== this.state.activeSec) this.setState({ activeSec: hit.target.id });
        }, { rootMargin: '-96px 0px -60% 0px' });
      }
      this._secIo.disconnect();
      document.querySelectorAll('[data-about-sec]').forEach((n) => this._secIo.observe(n));
    });
  }
  // 홈 히어로는 6.5초마다 다음 리포트로 (원형 타이머와 같은 시간). 넘기거나 화살표를 누르면 처음부터 다시 잰다
  heroAuto() {
    // 저절로 넘기지 않는다: 잡고 좌우로 끌거나 화살표로 넘긴다 (2026-10, 네이버 클라우드식). 다시 켜려면 아래 false를 지운다
    const on = false && this.state.page === 'home' && !this.state.isMobile && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!on) { clearTimeout(this._heroT); this._heroT = null; this._heroSeen = null; return; }
    if (this._heroSeen === this.state.heroIdx && this._heroT) return;
    this._heroSeen = this.state.heroIdx; clearTimeout(this._heroT);
    this._heroT = setTimeout(() => {
      this._heroT = null;
      if (this._heroHold) { this._heroSeen = null; return this.heroAuto(); }   // 표지를 읽는 중이면 넘기지 않는다
      if (!document.hidden && this._heroAdvance) this._heroAdvance(); else this.heroAuto();
    }, 6500);
    // 리포트가 바뀌면 표지를 다시 맨 위로
    const sc = document.querySelector('.hero-scroll');
    if (sc && this._heroTopIdx !== this.state.heroIdx) { this._heroTopIdx = this.state.heroIdx; sc.scrollTop = 0; sc.parentNode.parentNode.classList.remove('scrolled'); }
  }
  componentDidUpdate(pp, ps) {
    this.heroAuto();
    this.wkDom();
    this.setTitle(this.state.page, this.state.reportId); this.pickNavMode(); this.setupReveal();
    if (this._heroPage !== this.state.page) { this._heroPage = this.state.page; this.heroIntro(this.state.page); }   // 이 엔진은 이전 state를 따로 주지 않아 직접 기억한다
    // AGORA는 '선배님께 여쭙기' 하나만 보여 준다. 로그인하고 명부를 받으면 바로 열고, 다른 페이지로 가면 닫는다
    const onAgora = this.state.page === 'intranet' && !!this.state.user && !this.state.user.guest;
    if (!onAgora) this._askShut = false;
    if (onAgora && !this._askShut && this.state.intraData && window.RFSAsk && !window.RFSAsk.isOpen()) this.openAsk();
    else if (!onAgora && window.RFSAsk && window.RFSAsk.isOpen()) window.RFSAsk.close(true);
    this.syncGate();
  }

  // AGORA 로그인 전 화면(별 608개의 구, assets/agora-gate.js). 로그인하면 구 쪽으로 다가가며 AGORA 화면과 겹쳐 바뀐다
  syncGate() {
    const want = this.state.page === 'intranet' && !this.state.user && !(this.props.intranetPreview ?? false);
    if (want && !this._gate) {
      if (!window.AgoraGate) { clearTimeout(this._gateT); this._gateT = setTimeout(() => this.syncGate(), 150); return; }
      this._gate = window.AgoraGate.mount({ total: 608, names: GATE_NAMES, top: GATE_TOP.length, login: (id, pw) => this.signIn(id, pw), join: () => this.openJoin() });
    } else if (!want && this._gate) {
      if (this.state.page === 'intranet' && this.state.user) this._gate.dive(); else this._gate.destroy();
      this._gate = null;
    }
  }

  // 첫 화면(pg-full)이 있는 페이지 안에서 탭을 바꿀 때: 맨 위(첫 화면 사진)가 아니라 내용 첫 줄로
  toContent() {
    const h = [...document.querySelectorAll('main .pg-hero.pg-full')].find((n) => n.offsetParent !== null);
    window.scrollTo({ top: h ? h.getBoundingClientRect().bottom + window.scrollY : 0, behavior: 'instant' });
  }

  // ABOUT·FUND·RFM·PEOPLE·AGORA 첫 화면(사진 + 제목): 처음 열면 잠깐 보여 준 뒤 그 자리에서 흐려지고, 다음 내용이 같은 자리에 나타난다 (스크롤해 내려가는 모습 없이).
  // 기다리는 동안 스크롤·터치·키를 쓰면 그만둔다. 같은 탭에서 다시 열면 바로 내용부터. 위로 올리면 첫 화면이 다시 보인다
  // 리포트 1페이지 본문(page1.json)은 리포트를 열기 전에 미리 받아 둔다. 받기 전에 열면 본문을 잠깐 감췄다가 한 번에 보인다 (html.rp1)
  // 목차: PDF 2쪽 목차(toc)가 있으면 그것, 없으면 본문의 장 제목(h)으로 만든다 (예전 양식·목차 쪽이 없는 산업 리포트)
  tocOf(f) {
    if (!f) return [];
    if (f._toc) return f._toc;
    let t = f.toc || [];
    if (!t.length) {
      t = (f.blocks || []).map((b, i) => (b.h && b.h.replace(/[\s\d,.%\-–—/()원~]/g, '').length >= 2 ? { t: b.h.replace(/\s+/g, ' ').trim(), lvl: 0, to: i, pg: null } : null)).filter(Boolean);
      // 'II.'처럼 번호만 떨어진 장 제목은 다음 제목과 합친다
      t = t.reduce((a, e) => { const p = a[a.length - 1]; if (p && /^([IVXⅠ-Ⅻ]+|\d+)\s*[.)]?$/.test(p.t)) { p.t += ' ' + e.t; return a; } a.push(e); return a; }, []);
      if (t.length < 3) t = [];
    }
    return (f._toc = t);
  }
  loadP1() {
    if (this._p1req) return; this._p1req = true;
    const done = () => document.documentElement.classList.add('rp1');
    setTimeout(done, 6000);
    fetch('/assets/reports/glossary.json?v=' + DATA_VER).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) this.setState({ gl: j }); }, () => {});
    fetch('/assets/reports/page1.json?v=' + DATA_VER).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) this.setState({ p1: j }); done(); }, done);
  }

  // 기업 리포트 목록의 평가 기간 주가(assets/data/track.json, tools/build-prices.js가 주 1회 갱신). Research를 열 때 받는다.
  // /assets/는 하루 캐시라 6시간 단위 값을 붙여 새로 받게 한다
  loadTrack() {
    if (this._trackReq) return; this._trackReq = true;
    const none = { r: {} };
    fetch('/assets/data/track.json', { cache: 'no-cache' })   /* 주 1회 바뀌므로 매번 바뀌었는지만 확인(ETag) */.then((r) => (r.ok ? r.json() : null)).then((j) => this.setState({ track: (j && j.r) ? j : none }), () => this.setState({ track: none }));
  }

  // 리포트 전문(assets/reports/full/<id>.json)은 그 리포트를 처음 열 때 받는다
  loadFull(id) {
    this._fullReq = this._fullReq || {};
    if (this._fullReq[id]) return; this._fullReq[id] = true;
    fetch('/assets/reports/full/' + id + '.json?v=' + DATA_VER).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) this.setState({ full: { ...(this.state.full || {}), [id]: j } }); }, () => {});
  }

  // 리포트 용어 풀이 (assets/reports/glossary.json). 같은 용어는 1쪽과 전문의 장(Ⅰ~Ⅷ)마다 처음 나온 곳에만 밑줄을 친다
  glSplit(id) {
    const g = this.state.gl, list = g ? [...(g[id] || []), ...(g._common || [])] : [];
    if (!list.length) return (t) => [{ t, cls: '', k: '' }];
    const terms = list.map((e) => e.t).sort((a, b) => b.length - a.length);
    // 영문 약어(DC·AC 등)는 다른 단어 속(DCF 등)에서 잡히지 않게 앞뒤가 영문·숫자가 아닐 때만
    const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(' + terms.map((t) => (/^[A-Za-z0-9]/.test(t) ? '(?<![A-Za-z0-9])' : '') + esc(t) + (/[A-Za-z0-9]$/.test(t) ? '(?![A-Za-z0-9])' : '')).join('|') + ')');
    const seen = new Set();
    return (t) => t.split(re).filter((x) => x !== '').map((x) => {
      const i = list.findIndex((e) => e.t === x);
      if (i < 0 || seen.has(x)) return { t: x, cls: '', k: '' };
      seen.add(x); return { t: x, cls: 'gl', k: id + ':' + x };
    });
  }

  glOpen(el) {
    const [id, term] = el.dataset.gl.split(/:(.*)/s), g = this.state.gl || {};
    const e = [...(g[id] || []), ...(g._common || [])].find((x) => x.t === term); if (!e) return;
    let pop = document.getElementById('gl-pop');
    if (!pop) { pop = document.createElement('div'); pop.id = 'gl-pop'; document.body.appendChild(pop); }
    const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    pop.innerHTML = '<i class="gl-h"></i><span class="gl-k">' + esc(e.k) + '</span><button class="gl-x" aria-label="닫기">×</button><b class="gl-t">' + esc(e.t) + '</b><p class="gl-d">' + esc(e.d) + '</p>'
      + (e.c ? '<div class="gl-c"><small>이 리포트에서는</small><p>' + esc(e.c) + '</p></div>' : '')
      + '<a class="gl-a" href="/chat/?q=' + encodeURIComponent(e.t + (/[가-힣]$/.test(e.t) && (e.t.charCodeAt(e.t.length - 1) - 0xAC00) % 28 ? '이 ' : '가 ') + ((document.querySelector('.rpt-name, .ind-title, .ic-title') || {}).textContent || '이') + ' 리포트에서 왜 중요한지 설명해 줘') + '">POLARIS에게 더 물어보기</a><button class="gl-ok">확인</button>';
    // 'POLARIS에게 더 물어보기': 넓은 화면은 페이지를 떠나지 않고 오른쪽 Polaris 창에서 바로 물어본다 (폰은 /chat/ 으로)
    pop.querySelector('.gl-a').onclick = (ev) => { if (window.rfsAsk && window.innerWidth > 640 && !ev.metaKey && !ev.ctrlKey) { ev.preventDefault(); this.glClose(); window.rfsAsk(decodeURIComponent(ev.currentTarget.href.split('?q=')[1])); } };
    document.querySelectorAll('.gl.on').forEach((n) => n.classList.remove('on')); el.classList.add('on');
    const mob = window.innerWidth < 720; pop.className = mob ? 'sheet' : '';
    let dim = document.getElementById('gl-dim');
    if (mob && !dim) { dim = document.createElement('div'); dim.id = 'gl-dim'; document.body.appendChild(dim); }
    if (dim) dim.hidden = !mob;
    pop.hidden = false;
    if (!mob) {
      // 글자 바로 아래에 띄우고, 아래 자리가 모자라면 위로 올린다. 꼬리는 단어 가운데를 가리킨다
      const b = el.getBoundingClientRect(), w = 340, h = pop.offsetHeight;
      const left = Math.max(12, Math.min(b.left, window.innerWidth - w - 12));
      const up = b.bottom + h + 16 > window.innerHeight && b.top > h + 16;
      pop.classList.toggle('up', up);
      pop.style.setProperty('--ax', Math.max(18, Math.min(w - 18, b.left + Math.min(b.width, 80) / 2 - left)) + 'px');
      pop.style.left = (left + window.scrollX) + 'px';
      pop.style.top = (up ? b.top + window.scrollY - h - 10 : b.bottom + window.scrollY + 10) + 'px';
    } else { pop.style.left = ''; pop.style.top = ''; }
  }

  glClose() { const pop = document.getElementById('gl-pop'), dim = document.getElementById('gl-dim'); if (pop) pop.hidden = true; if (dim) dim.hidden = true; document.querySelectorAll('.gl.on').forEach((n) => n.classList.remove('on')); }

  heroIntro(page) {
    clearTimeout(this._hiT); this._hiStop && this._hiStop();
    // 컴퓨터에서 애니메이션을 꺼 두었어도 같은 순서로 보여 준다 (움직임 없이 흐려지기만 한다)
    if (!['about', 'research', 'fund', 'rfm', 'people', 'recruit', 'intranet'].includes(page)) return;
    requestAnimationFrame(() => {
      const hero = [...document.querySelectorAll('main .pg-hero.pg-full')].find((n) => n.offsetParent !== null);
      if (!hero || this.state.page !== page) return;
      // 첫 화면 바로 아래 탭이 메뉴 아래에 붙어 있으면(sticky) 그만큼 덜 내려가야 내용 첫 줄이 가려지지 않는다
      const stick = () => { const n = hero.nextElementSibling, cs = n && getComputedStyle(n); return cs && cs.position === 'sticky' ? parseFloat(cs.top) || 0 : 0; };
      // 첫 화면 바로 아래 탭 줄이 고정이 아니면(ABOUT) 그 줄도 지나서 내용 첫 칸이 화면 맨 위에 오게
      const skip = () => { const n = hero.nextElementSibling; return n && n.tagName === 'NAV' && getComputedStyle(n).position !== 'sticky' ? n.offsetHeight : 0; };
      const target = () => hero.getBoundingClientRect().bottom + window.scrollY - stick() + skip();
      // 한 번 지나간 첫 화면은 띠 높이(제목만 있는 배너)로 줄인다. 다시 올라오면 전체 화면이 아니라 이 띠가 보인다
      const shrink = () => {
        if (hero.classList.contains('hero-short')) return;
        const h0 = hero.offsetHeight, y0 = window.scrollY;
        hero.classList.add('hero-short');
        if (y0 > 0) window.scrollTo({ top: Math.max(0, y0 - (h0 - hero.offsetHeight)), behavior: 'instant' });
        hero.classList.remove('hero-out');
        off();
      };
      const onScroll = () => {
        // 화살표로 내려가는 중에는 줄이지 않는다. 도중에 줄이면 남은 이동이 옛 위치로 끌고 가서 마지막에 화면이 탁 튄다
        if (busy || hero.classList.contains('hero-short') || hero.classList.contains('hero-lift')) return;
        if (window.scrollY >= target() - 1) return shrink();
        // 흐려지지 않고 그대로 밀려 올라간다
      };
      // 첫 화면은 그대로 두고, 접속자가 조금만 내리면(휠 한 칸·살짝 스와이프·↓키·화살표) 한 칸 스르륵 내려간다
      let busy = false, ty = null, cue = null;
      const advance = () => {
        if (busy || hero.classList.contains('hero-short') || this.state.page !== page) return;
        busy = true; cue && cue.remove();
        // 첫 화면이 위로 밀려 올라가며 다음 섹션이 아래에서 올라온다 (실제 스크롤로 한 칸 내려감, 흐려지지 않음)
        this.glideTo(target(), 800);
        // 다 내려간 뒤에 첫 화면을 띠 높이로 줄이고 그만큼 스크롤을 당겨서, 보이는 화면은 그대로다
        this._hiT = setTimeout(() => { busy = false; if (window.scrollY >= target() - 1) shrink(); off(); }, 860);
      };
      const atTop = () => window.scrollY < 10 && !hero.classList.contains('hero-short');
      // 소개 페이지의 칸 단위 휠 이동(setupSnap)보다 먼저 받아서, 첫 화면을 넘기는 휠은 그쪽으로 안 가게 막는다
      const onWheel = (e) => { if (window.heroScrollWants && window.heroScrollWants(e)) return; if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; } if (atTop() && e.deltaY > 0) { e.preventDefault(); e.stopImmediatePropagation(); advance(); } };
      const onTs = (e) => { ty = e.touches[0].clientY; };
      const onTm = (e) => { if (busy) { e.preventDefault(); return; } if (ty != null && atTop() && ty - e.touches[0].clientY > 12) { e.preventDefault(); ty = null; advance(); } };
      const onKey = (e) => { if (atTop() && ['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(e.key) && !/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) { e.preventDefault(); advance(); } };
      const off = () => {
        window.removeEventListener('wheel', onWheel, true); window.removeEventListener('touchstart', onTs); window.removeEventListener('touchmove', onTm); window.removeEventListener('keydown', onKey);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      this._hiStop = () => { off(); cue && cue.remove(); window.removeEventListener('scroll', onScroll); document.querySelectorAll('.pg-hero-ph').forEach((n) => n.remove()); hero.classList.remove('hero-out', 'hero-lift'); };
      // 들어올 때마다 같은 방식: 첫 화면 + 아래 화살표, 휠·스와이프·화살표로 한 칸 내려간다
      if (window.scrollY > 10) { shrink(); return; }
      window.addEventListener('wheel', onWheel, { passive: false, capture: true });
      window.addEventListener('touchstart', onTs, { passive: true });
      window.addEventListener('touchmove', onTm, { passive: false });
      window.addEventListener('keydown', onKey);
      // 아래로 내리라는 표시 (누르면 바로 넘어감)
      cue = document.createElement('button');
      cue.type = 'button'; cue.className = 'hero-cue'; cue.setAttribute('aria-label', '아래로');
      cue.addEventListener('click', advance);
      hero.appendChild(cue);
    });
  }



  componentWillUnmount() { window.removeEventListener('hashchange', this._onHash); window.removeEventListener('popstate', this._onPop); this._navIo && this._navIo.disconnect(); this._onResize && window.removeEventListener('resize', this._onResize); this._secIo && this._secIo.disconnect(); this._rvIo && this._rvIo.disconnect(); this._onScroll && window.removeEventListener('scroll', this._onScroll); this._cntIo && this._cntIo.disconnect(); this._mch && this.sb && this.sb.removeChannel(this._mch); this._onWheel && window.removeEventListener('wheel', this._onWheel); this._onResize && window.removeEventListener('resize', this._onResize); this._glideRaf && cancelAnimationFrame(this._glideRaf); this._settle && clearTimeout(this._settle); }

  snapTargets() {
    const list = [...document.querySelectorAll('section[data-snap]')].map((n) => n.offsetTop);
    // 홈 첫 화면이 화면보다 길면, 별자리로 가기 전에 소식 띠 아래 끝까지 한 번 멈춘다
    const bx = [...document.querySelectorAll('.bx-hero')].find((n) => n.offsetHeight);
    if (bx) { list.push(bx.offsetTop); const end = bx.offsetTop + bx.offsetHeight - window.innerHeight; if (end > bx.offsetTop + 40) list.push(end); }
    const foot = document.querySelector('footer');
    if (foot) list.push(Math.min(foot.offsetTop, document.documentElement.scrollHeight - window.innerHeight));
    return list.sort((a, b) => a - b);
  }

  glideTo(y, dur) {
    if (this._glideRaf) cancelAnimationFrame(this._glideRaf);
    const from = window.scrollY, dist = y - from;
    if (!dist) return;
    this._gliding = true;
    this._glideTarget = y;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 2.4);
      window.scrollTo({ top: from + dist * e, behavior: 'instant' });
      if (p < 1) this._glideRaf = requestAnimationFrame(step);
      else {
        this._glideRaf = null; this._glideTarget = null;
        this._settle = setTimeout(() => { this._gliding = false; this._settle = null; }, 110);
      }
    };
    this._glideRaf = requestAnimationFrame(step);
  }

  setupSnap() {
    if (this._onWheel) return;
    this._onWheel = (e) => {
      if ((this.state.page !== 'home' && this.state.page !== 'about') || this.state.menuOpen) return;
      if (window.heroScrollWants && window.heroScrollWants(e)) return;
      if (window.innerWidth < 900 || window.matchMedia('(pointer: coarse)').matches) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (Math.abs(e.deltaY) < 4 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.target.closest && e.target.closest('[data-noscroll]')) return;

      if (this._gliding) {
        e.preventDefault();
        if (this._settle) { clearTimeout(this._settle); this._settle = setTimeout(() => { this._gliding = false; this._settle = null; }, 110); }
        return;
      }
      const pts = this.snapTargets();
      if (pts.length < 2) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      let i = 0;
      pts.forEach((p, k) => { if (p <= y + 6) i = k; });
      const cur = pts[i];
      const secH = (pts[i + 1] !== undefined ? pts[i + 1] : max) - cur;

      // 화면보다 긴 섹션은 내부를 먼저 다 읽게 둔다
      if (secH > window.innerHeight * 1.5) {
        const atEnd = dir > 0 ? y >= cur + secH - window.innerHeight - 6 : y <= cur + 6;
        if (!atEnd) return;
      }
      const next = dir > 0 ? pts[i + 1] : (y > cur + 6 ? cur : pts[i - 1]);
      if (next === undefined) return;
      e.preventDefault();
      this.glideTo(Math.min(next, max), 620);
    };
    window.addEventListener('wheel', this._onWheel, { passive: false });
  }

  // 인트라넷 콘텐츠는 로그인한 학회원만 Supabase(intranet_content)에서 받는다
  loadIntra() {
    if (!this.sb) return;
    this.sb.from('intranet_content').select('data').eq('id', 'main').maybeSingle()
      .then(({ data }) => { if (data && data.data) this.setState({ intraData: data.data }); });
    // RFM 순위는 GitHub Actions(tools/rfm)가 하루 1~2회 갱신한다
    this.loadRfm();
    this.loadFundLive();
    // 장중에는 수집기가 15초마다 저장한다. 실시간 구독으로 바로 반영하고, 구독이 안 되는 환경을 위해 15초 폴링도 둔다
    if (!this._rfmCh) {
      this._rfmCh = this.sb.channel('rfs-rfm')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'intranet_content', filter: 'id=eq.rfm' }, (p) => { if (p.new && p.new.data) this.setRfm(p.new.data); })
        .subscribe();
    }
    if (!this._rfmTimer) this._rfmTimer = setInterval(() => { if (this.state.page === 'rfm' && !document.hidden) this.loadRfm(); }, 15000);
  }

  // 학회원: 운용 계좌 실시간 (tools/fund 수집기가 장중 15초마다 저장)
  loadFundLive() {
    if (!this.sb) return;
    this.fetchFundLive();
    if (!this._fundCh) {
      this._fundCh = this.sb.channel('rfs-fund')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'intranet_content', filter: 'id=eq.fund_live' }, (p) => { if (p.new && p.new.data) this.setFundLive(p.new.data); })
        .subscribe();
    }
    if (!this._fundTimer) this._fundTimer = setInterval(() => { if (this.state.page === 'fund' && !document.hidden) this.fetchFundLive(); }, 15000);
  }

  // 로그인 없이 누구나: public_content 우선, 아직 없으면(수집기 갱신 전) 학회원은 intranet_content
  fetchFundLive() {
    this.sb.from('public_content').select('data').eq('id', 'fund_live').maybeSingle()
      .then(({ data }) => {
        if (data && data.data) return this.setFundLive(data.data);
        if (this.state.user) this.sb.from('intranet_content').select('data').eq('id', 'fund_live').maybeSingle().then(({ data: d }) => { if (d && d.data) this.setFundLive(d.data); });
      });
  }

  setFundLive(next) {
    const prev = this.state.fundLive;
    if (prev && prev.asOf === next.asOf) return;
    this._fundTick = (this._fundTick || 0) + 1;
    this.setState({ fundLive: next, fundLivePrev: prev || null });
  }

  loadRfm() {
    if (!this.sb) return;
    // 학회원은 intranet_content, 로그인 안 했으면 공개용 public_content (둘 다 별칭만 있고 실명은 없음)
    this.sb.from(this.state.user ? 'intranet_content' : 'public_content').select('data').eq('id', 'rfm').maybeSingle()
      .then(({ data }) => { if (data && data.data) this.setRfm(data.data); this.setState({ rfmLoaded: true }); }, () => this.setState({ rfmLoaded: true }));
  }

  // 새 데이터가 오면 직전 데이터와 비교해 추월·50위 진입/이탈을 변동 목록에 쌓는다 (페이지를 열어 둔 동안만)
  setRfm(next) {
    const prev = this.state.rfmData;
    if (prev && prev.asOf === next.asOf) return;
    const ev = [];
    if (prev && prev.members) {
      const ord = (d) => (d.members || []).filter((m) => m.found && m.nav).sort((a, b) => b.nav - a.nav).map((m) => m.nick);
      const po = ord(prev), no = ord(next);
      const pm = {}; (prev.members || []).forEach((m) => { pm[m.nick] = m; });
      const t = (next.asOf || '').slice(11, 16);
      no.forEach((nick, i) => {
        const j = po.indexOf(nick);
        if (j > i) ev.push({ t, who: nick, text: (j + 1) + '위 → ' + (i + 1) + '위, ' + no[i + 1] + ' 추월' });
      });
      (next.members || []).forEach((m) => {
        const b = pm[m.nick];
        if (!b || !m.rank || !b.rank) return;
        if (m.rank <= 50 && b.rank > 50) ev.push({ t, who: m.nick, text: '전체 ' + m.rank + '위, 50위 안 진입' });
        if (m.rank > 50 && b.rank <= 50) ev.push({ t, who: m.nick, text: '전체 ' + m.rank + '위, 50위 밖으로' });
      });
    }
    this._rfmTick = (this._rfmTick || 0) + 1;
    this.setState((st) => ({ rfmData: next, rfmPrevData: prev || null, rfmFeed: [...ev.reverse(), ...(st.rfmFeed || [])].slice(0, 8) }));
  }

  // RFM: 기준가 1,000에서 출발하므로 수익률 = 기준가 / 1000 - 1
  // 실명은 서버에 두지 않고, 회장 브라우저(localStorage)에만 별칭→실명 목록을 저장해 그 기기에서만 보이게 한다
  rfmNames() {
    try { return JSON.parse(localStorage.getItem('rfs_rfm_names') || '{}') || {}; } catch (e) { return {}; }
  }

  // 보유 종목 원형 차트·목록, 오늘 움직인 종목 (학회 리포트가 있으면 연결)
  fundPortfolio(F, live, hs, shades, cw, pct, won, col, up, dn) {
    // 기여도 = 비중 × 등락률 (수집기가 넣은 ctb가 있으면 그 값). 금액은 쓰지 않는다
    const ctbOf = (h) => (typeof h.ctb === 'number' ? h.ctb : h.day !== null && h.day !== undefined ? (h.weight || 0) * h.day / 100 : null);
    const rep = {}; REPORTS.forEach((r) => { if (r.ticker && !rep[r.ticker]) rep[r.ticker] = r; });
    // 업종: 운용팀 분류 (종목이 새로 편입되면 여기에 추가)
    const SECTOR = FUND_SECTOR;
    const sectorOf = (h) => SECTOR[h.code] || (rep[h.code] && rep[h.code].sector) || '기타';
    const hi = this.state.fdHi === undefined ? null : this.state.fdHi;
    let acc = 0; const stops = []; const segs = [];
    hs.forEach((h, i) => { const w = h.weight || 0; const c = shades[i % shades.length] + (hi !== null && hi !== i ? '40' : ''); stops.push(c + ' ' + acc.toFixed(2) + '% ' + (acc + w).toFixed(2) + '%'); segs.push([acc, acc + w]); acc += w; });
    if (cw > 0) { stops.push((hi !== null && hi !== hs.length ? 'rgba(247,246,243,0.07) ' : 'rgba(247,246,243,0.22) ') + acc.toFixed(2) + '% 100%'); segs.push([acc, 100]); }
    this._fdSegs = segs;
    const hh = hi !== null ? (hi < hs.length ? hs[hi] : { name: '현금', weight: cw }) : null;
    const rows = hs.map((h, i) => {
      const r = rep[h.code];
      return {
        cls: 'fd-row' + (hi === i ? ' hi' : ''), enter: () => this.setState({ fdHi: i }), leave: () => this.setState({ fdHi: null }),
        rank: i + 1, badge: i === 0 ? '#8FAADC' : i === 1 ? '#C3D3EE' : i === 2 ? '#3E5F9E' : 'rgba(247,246,243,0.1)', badgeC: i < 2 ? '#0F1B2E' : i === 2 ? '#F7F6F3' : 'rgba(247,246,243,0.7)',
        dot: shades[i % shades.length], name: h.name, wbar: Math.min(100, (h.weight || 0) / Math.max(...hs.map((x) => x.weight || 0), 1) * 100).toFixed(1) + '%',
        meta: [h.code, sectorOf(h)].filter(Boolean).join(' · '),
        w: (h.weight || 0).toFixed(1) + '%',
        ret: pct(h.ret), retColor: col(h.ret), day: h.day === null || h.day === undefined ? '' : 'Today ' + pct(h.day), dayColor: col(h.day),
        hasRep: !!r, repLabel: r ? '리포트 ' + r.op + (r.tp ? ' · TP ' + r.tp : '') + ' · ' + (r.date || '').slice(2, 7) : '', repHref: r ? '/research/' + r.id + '/' : '#',
        repOn: (e) => { e.preventDefault(); if (r) this.go('report', r.id); },
      };
    });
    if (cw > 0) rows.push({ rank: '', badge: 'rgba(247,246,243,0.18)', badgeC: '#F7F6F3', cls: 'fd-row' + (hi === hs.length ? ' hi' : ''), enter: () => this.setState({ fdHi: hs.length }), leave: () => this.setState({ fdHi: null }), wbar: Math.min(100, cw / Math.max(...hs.map((x) => x.weight || 0), 1) * 100).toFixed(1) + '%', dot: 'rgba(247,246,243,0.35)', name: '현금', meta: '', w: cw.toFixed(1) + '%', ret: '', retColor: '', day: '', dayColor: '',  hasRep: false, repLabel: '', repHref: '#', repOn: (e) => e.preventDefault() });
    // 오늘 기여: 학회원은 원 단위 손익/전일 총자산, 외부는 비중×등락
    const mv = hs.map((h) => {
      const c = ctbOf(h);
      return { h, c };
    }).filter((x) => x.c !== null).sort((a, b) => b.c - a.c);
    const mx = Math.max(0.01, ...mv.map((x) => Math.abs(x.c)));
    const sec = {}; hs.forEach((h) => { const k = sectorOf(h); sec[k] = (sec[k] || 0) + (h.weight || 0); });
    const stockW = hs.reduce((a, h) => a + (h.weight || 0), 0) || 1;
    const secs = Object.entries(sec).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const secMax = Math.max(...secs.map((x) => x[1]), 1);
    const wMax = Math.max(cw, ...hs.map((h) => h.weight || 0), 1);
    const legend = hs.map((h, i) => ({ c: shades[i % shades.length], t: h.name, w: (h.weight || 0).toFixed(2) + '%', bw: ((h.weight || 0) / wMax * 100).toFixed(1) + '%', i })).concat(cw > 0 ? [{ c: 'rgba(247,246,243,0.35)', t: '현금', w: cw.toFixed(2) + '%', bw: (cw / wMax * 100).toFixed(1) + '%', i: hs.length }] : []);
    // 링: 반지름 80 원둘레를 비중대로 나누고 조각 사이를 조금 띄운다 (12시 방향부터 시계방향)
    const C = 2 * Math.PI * 80, gap = 1.6;
    const arcs = segs.map(([a, b], i) => {
      const len = Math.max(0.6, (b - a) / 100 * C - gap);
      const sw = 10 + ((b - a) / Math.max(...segs.map(([x, y]) => y - x), 1)) * 16;
      return { sw: sw.toFixed(1), c: i < hs.length ? shades[i % shades.length] : 'rgba(247,246,243,0.32)', da: len.toFixed(2) + ' ' + C.toFixed(2), off: (-(a / 100 * C) - gap / 2).toFixed(2), dl: (0.15 + i * 0.08).toFixed(2) + 's', cls: 'fd-arc' + (hi === null ? '' : hi === i ? ' on' : ' dim') };
    });
    return {
      fdLegend: legend.map((l) => ({ ...l, cls: 'fd-li' + (hi === l.i ? ' on' : ''), enter: () => this.setState({ fdHi: l.i }), leave: () => this.setState({ fdHi: null }) })),
      fdCenterV: hh ? (hh.weight || 0).toFixed(2) + '%' : (100 - cw).toFixed(2) + '%',
      fdCenterK: hh ? hh.name : '주식 비중',
      fdCenterS: hh ? (hh.ret !== undefined ? '수익률 ' + pct(hh.ret) : '대기 자금') : '현금 ' + cw.toFixed(1) + '%',
      fdArcs: arcs, fdStockPct: (100 - cw).toFixed(2) + '%', fdCashPct: cw.toFixed(2) + '%',
      fdSecChart: (() => { const sh = secs.map(([, w]) => w / stockW * 100); const top = Math.max(10, Math.ceil(Math.max(...sh, 0) / 0.85 / 10) * 10); const ticks = []; for (let v = 0; v <= top; v += top > 50 ? 20 : 10) ticks.push({ v: v + '%', p: (v / top * 100) + '%' }); return { ticks, bars: secs.map(([t], i) => ({ t, v: sh[i].toFixed(1) + '%', h: (sh[i] / top * 100).toFixed(1) + '%', bg: i === 0 ? '#A9C2EE' : '#7B9BD6', cls: '' })) }; })(),
      fdSectors: secs.map(([t, w]) => ({ t, w: (w / stockW * 100).toFixed(2) + '%', h: (w / secMax * 72).toFixed(1) + '%' })),
      fdDonut: 'conic-gradient(' + stops.join(',') + ')',
      fdCount: hh ? hh.name : hs.length + '종목', fdCashLine: hh ? (hh.weight || 0).toFixed(1) + '%' + (hh.ret !== undefined ? ' · ' + pct(hh.ret) : '') : '현금 ' + cw.toFixed(1) + '%',
      fdDonutMove: (e) => {
        const rc = e.currentTarget.getBoundingClientRect(); const dx = e.clientX - rc.left - rc.width / 2, dy = e.clientY - rc.top - rc.height / 2;
        const r = Math.hypot(dx, dy); if (r < rc.width * 0.32 || r > rc.width * 0.5) { if (this.state.fdHi !== null) this.setState({ fdHi: null }); return; }
        const pctA = ((Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360) / 3.6;
        const k = (this._fdSegs || []).findIndex(([a, b]) => pctA >= a && pctA < b);
        if (k !== this.state.fdHi) this.setState({ fdHi: k < 0 ? null : k });
      },
      fdDonutLeave: () => this.setState({ fdHi: null }),
      fdRows: rows,
      fdMovers: mv.map((x) => ({
        name: x.h.name, pp: (x.c > 0 ? '+' : x.c < 0 ? '−' : '') + Math.abs(x.c).toFixed(2) + '%p',
        amt: pct(x.h.day),
        c: x.c >= 0 ? up : dn, l: (x.c >= 0 ? 50 : 50 - Math.abs(x.c) / mx * 50).toFixed(2) + '%', w: (Math.abs(x.c) / mx * 50).toFixed(2) + '%', o: x.c >= 0 ? 'left' : 'right',
      })),
      hasMovers: mv.length > 0,
      fdAsOfShort: (F.asOf || '').slice(5, 10).replace('-', '/'),
      fdPortCap: '기준일 ' + (F.asOf || '').slice(5, 10).replace('-', '/') + ' · ' + hs.length + '종목 · 상위 3종목 ' + hs.slice(0, 3).reduce((a, h) => a + (h.weight || 0), 0).toFixed(1) + '% · 현금 ' + cw.toFixed(1) + '%',
      fdTodayCap: '기준일 ' + (F.asOf || '').slice(5, 10).replace('-', '/') + ' · 펀드 ' + pct(F.day) + ' · 비중 × 일간 등락률',
      fdPerfCap: '설정일 ' + (F.start || '').replace(/-/g, '.') + ' = 1,000 · 벤치마크 KOSPI, KOSDAQ',
      ...this.fundPerf(F, pct, col),
    };
  }

  // 그래프 위 마우스·터치: 세로선과 날짜별 값 (상태를 바꾸지 않고 DOM만 갱신)
  fdHover(e) {
    const C = this._fdChart; const el = e.currentTarget; if (!C || !el) return;
    const pt = e.touches && e.touches[0] ? e.touches[0] : e;
    const rc = el.getBoundingClientRect(); const n = C.d.length;
    const i = Math.max(0, Math.min(n - 1, Math.round((pt.clientX - rc.left) / rc.width * (n - 1))));
    const x = (i / (n - 1) * 100).toFixed(2) + '%';
    const yp = (v) => (v ? (+C.y(v) / 250 * 100).toFixed(2) + '%' : '-50%');
    const pc = (v) => (v ? ((v / 1000 - 1) * 100 >= 0 ? '+' : '−') + Math.abs((v / 1000 - 1) * 100).toFixed(2) + '%' : '-');
    if (el._fdI === i && el.classList.contains('on')) return;
    el._fdI = i;
    // 처음 들어올 때는 바로 그 자리에, 이후에는 부드럽게 따라가게 (CSS transition)
    el.classList.toggle('mv', el.classList.contains('on'));
    el.classList.add('on');
    el.querySelector('.fd-cross').style.left = x;
    [['f', C.fs], ['k', C.ks], ['q', C.qs]].forEach(([k, a]) => { const d = el.querySelector('.fd-dot.' + k); d.style.left = x; d.style.top = yp(a[i]); d.style.visibility = a[i] ? 'visible' : 'hidden'; });
    const tip = el.querySelector('.fd-tip');
    tip.innerHTML = '<b>' + C.d[i].replace(/-/g, '.') + '</b><span><i style="background:#8FAADC"></i>AMT Fund<em>' + pc(C.fs[i]) + '</em></span><span><i style="background:rgba(247,246,243,0.7)"></i>KOSPI<em>' + pc(C.ks[i]) + '</em></span><span><i style="background:rgba(247,246,243,0.35)"></i>KOSDAQ<em>' + pc(C.qs[i]) + '</em></span>';
    tip.style.left = x; tip.style.transform = i / (n - 1) > 0.6 ? 'translateX(calc(-100% - 14px))' : 'translateX(14px)';
  }

  // 기간별 수익률 표: history [날짜, 기준가, KOSPI, KOSDAQ]
  fundPerf(F, pct, col) {
    const s = this.state;
    const wkd = (d) => { const x = new Date(d + 'T00:00:00Z').getUTCDay(); return x !== 0 && x !== 6; };
    const H = (F.history || []).filter((h) => h[1] && wkd(h[0]));
    if (H.length < 2) return { fdPerRows: [], fdPerCols: [], fdPerAsOf: '' };
    const last = H[H.length - 1];
    const back = (days) => { const t = new Date(last[0]); t.setDate(t.getDate() - days); const d = t.toISOString().slice(0, 10); return H[0][0] <= d ? H.filter((h) => h[0] <= d).pop() : null; };
    const refs = [back(7), back(30), back(91), back(182), back(365), H[0]];
    const r = (j, ref) => (ref && ref !== last && last[j] && ref[j] ? (last[j] / ref[j] - 1) * 100 : null);
    const fmt = (v, p) => (v === null ? '-' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + (p || ''));
    const mk = (k, vals, cls, p) => { const o = { k, cls: 'rr' + (cls ? ' ' + cls : '') }; vals.forEach((v, i) => { o['v' + (i + 1)] = fmt(v, p); o['c' + (i + 1)] = v === null ? 'rgba(247,246,243,0.62)' : col(v); }); return o; };
    const f = refs.map((x) => r(1, x)), kp = refs.map((x) => r(2, x)), kq = refs.map((x) => r(3, x));
    const ex = f.map((v, i) => (v === null || kp[i] === null ? null : v - kp[i]));
    const cell = (v, p) => ({ v: fmt(v, p), c: v === null ? 'rgba(247,246,243,0.62)' : col(v) });
    const fdPerCols = ['1주', '1개월', '3개월', '6개월', '1년', '설정 이후'].map((k, i) => ({ k, a: cell(f[i]), b: cell(kp[i]), q: cell(kq[i]), e: cell(ex[i], '%p'), cls: 'rr' + (i === 5 ? ' fund' : '') })).filter((x, i) => i === 5 || f[i] !== null);
    return {
      fdPerCols,
      fdPerRows: [mk('AMT Fund', f, 'fund'), mk('KOSPI', kp), mk('KOSDAQ', kq), mk('KOSPI 대비', f.map((v, i) => (v === null || kp[i] === null ? null : v - kp[i])), 'ex', '%p')],
      fdPerAsOf: last[0].replace(/-/g, '.') + ' 기준 · 설정일 ' + (F.start || H[0][0]).replace(/-/g, '.'),
    };
  }

  fundProps(authed) {
    const s = this.state;
    const live = s.fundLive || null;
    const F = live || s.fundPub;
    const pct = (v, d = 2) => (v === null || v === undefined || isNaN(v) ? '-' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d) + '%');
    const won = (v) => Math.round(Math.abs(v)).toLocaleString('ko-KR');
    const up = 'var(--up)', dn = 'var(--dn)', flat = 'var(--flat)';
    const col = (v) => (v > 0 ? up : v < 0 ? dn : flat);
    if (!F) return { fdHas: false, fdNone: !!s.fundPubLoaded || !!live, fdLoading: !s.fundPubLoaded && !live, fdLive: false, fdPublic: false };
    const k = new Date(Date.now() + 9 * 3600e3), hm = k.getUTCHours() * 60 + k.getUTCMinutes(), wd = k.getUTCDay();
    const open = wd >= 1 && wd <= 5 && hm >= 540 && hm <= 930;
    const kospi = F.bm && F.bm.kospi ? F.bm.kospi.ret : null, kosdaq = F.bm && F.bm.kosdaq ? F.bm.kosdaq.ret : null;
    const gap = kospi !== null && kospi !== undefined ? F.ret - kospi : null;
    const hs = (F.holdings || []).slice().sort((a, b) => b.weight - a.weight);
    const maxW = Math.max(10, ...hs.map((h) => h.weight || 0));
    const ctbOf = (h) => (typeof h.ctb === 'number' ? h.ctb : h.day !== null && h.day !== undefined ? (h.weight || 0) * h.day / 100 : null);
    const best = hs.filter((h) => ctbOf(h) !== null).sort((a, b) => ctbOf(b) - ctbOf(a))[0];
    // 기준가 추이: history = [날짜, 기준가, KOSPI, KOSDAQ] → 첫날 1,000으로 맞춰 세 선
    const wkd = (d) => { const x = new Date(d + 'T00:00:00Z').getUTCDay(); return x !== 0 && x !== 6; };
    const HA = (F.history || []).filter((h) => h[1] && wkd(h[0]));
    const RANGES = { '1w': 7, '1m': 30, '3m': 91 };
    const rk = s.fdRange && RANGES[s.fdRange] ? s.fdRange : 'all';
    let H = HA;
    if (rk !== 'all' && HA.length) {
      const t = new Date(HA[HA.length - 1][0]); t.setDate(t.getDate() - RANGES[rk]); const cut = t.toISOString().slice(0, 10);
      const i0 = Math.max(0, HA.findIndex((h) => h[0] >= cut) - 1);
      H = HA.slice(i0);
    }
    let chart = { f: '', k: '', q: '', base: '125', has: false, ticks: [], xs: [], ends: [] };
    if (H.length >= 2) {
      const k0 = (H.find((h) => h[2]) || [])[2], q0 = (H.find((h) => h[3]) || [])[3];
      const fs = H.map((h) => h[1] / H[0][1] * 1000), ks = H.map((h) => (k0 && h[2] ? h[2] / k0 * 1000 : null)), qs = H.map((h) => (q0 && h[3] ? h[3] / q0 * 1000 : null));
      const all = fs.concat(ks, qs).filter((v) => v), lo = Math.min(...all, 1000) * 0.995, hi = Math.max(...all, 1000) * 1.005;
      const y = (v) => (245 - (v - lo) / (hi - lo) * 235).toFixed(1);
      const pts = (a) => a.map((v, i) => (v ? (i / (a.length - 1) * 1000).toFixed(1) + ',' + y(v) : null)).filter(Boolean).join(' ');
      chart = { f: pts(fs), k: pts(ks), q: pts(qs), base: y(1000), has: true };
      this._fdChart = { d: H.map((h) => h[0]), fs, ks, qs, y };
      const yp = (v) => (+y(v) / 250 * 100).toFixed(2) + '%';
      const pLo = (lo / 1000 - 1) * 100, pHi = (hi / 1000 - 1) * 100;
      const step = [1, 2, 5, 10, 20, 50].find((st) => (pHi - pLo) / st <= 5) || 100;
      const ticks = []; for (let t = Math.ceil(pLo / step) * step; t <= pHi; t += step) ticks.push({ y: yp(1000 * (1 + t / 100)), t: (t > 0 ? '+' : t < 0 ? '−' : '') + Math.abs(t) + '%' });
      const md = (d) => +d.slice(5, 7) + '/' + +d.slice(8, 10);
      const xi = [0, Math.floor((H.length - 1) / 2), H.length - 1].filter((v, i, a) => a.indexOf(v) === i);
      const ends = [
        { v: fs[fs.length - 1], n: 'AMT', c: '#8FAADC' },
        { v: ks[ks.length - 1], n: 'KOSPI', c: 'rgba(247,246,243,0.75)' },
        { v: qs[qs.length - 1], n: 'KOSDAQ', c: 'rgba(247,246,243,0.5)' },
      ].filter((e) => e.v).map((e) => ({ ...e, yy: +y(e.v) / 250 * 100 })).sort((a, b) => a.yy - b.yy);
      for (let i = 1; i < ends.length; i++) if (ends[i].yy - ends[i - 1].yy < 9) ends[i].yy = ends[i - 1].yy + 9;
      chart.ticks = ticks;
      chart.xs = xi.map((i) => ({ x: (i / (H.length - 1) * 100).toFixed(2) + '%', t: md(H[i][0]), al: i === 0 ? 'translateX(0)' : i === H.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)' }));
      chart.ends = ends.map((e) => ({ y: e.yy.toFixed(2) + '%', t: e.n + ' ' + pct((e.v / 1000 - 1) * 100), c: e.c }));
    }
    // 오늘 수익 기여 (학회원): 종목별 오늘 손익 / 전일 총자산
    const contrib = live ? hs.map((h) => ({ nm: h.name, c: ctbOf(h) })).filter((x) => x.c).sort((a, b) => a.c - b.c) : [];
    const ctot = contrib.reduce((a, x) => a + Math.abs(x.c), 0) || 1;
    const prevMap = {}; ((s.fundLivePrev && s.fundLivePrev.holdings) || []).forEach((h) => { prevMap[h.code] = h.cur; });
    const tick = this._fundTick || 0;
    const shades = ['#8FAADC', '#3E5F9E', '#C3D3EE', '#6F8FC9', '#2C4A82', '#A9BEE6', '#5577B5', '#DCE6F6', '#4A6AA6', '#7E9BD2'];
    const cw = F.cashWeight || 0;
    const alloc = hs.map((h, i) => ({ grow: (h.weight || 0).toFixed(2), bg: shades[i % shades.length], tc: '#0F1B2E', label: (h.weight || 0) >= 7 ? h.name : '' }))
      .concat(cw > 0 ? [{ grow: cw.toFixed(2), bg: 'rgba(247,246,243,0.16)', tc: '#F7F6F3', label: cw >= 7 ? '현금' : '' }] : []);
    const byDay = hs.filter((h) => ctbOf(h) !== null);
    const key = (h) => ctbOf(h);
    const top = byDay.slice().sort((a, b) => key(b) - key(a))[0], bot = byDay.slice().sort((a, b) => key(a) - key(b))[0];
    const fmtK = (h) => pct(h.day);
    const sd = F.start ? F.start : '';
    return {
      fdHas: true, fdNone: false, fdLive: !!live, fdPublic: !live,
      fdStartDate: (F.start || '').replace(/-/g, '.'),
      fdAsOfLine: (live ? (F.asOf || '').slice(0, 16).replace(/-/g, '.') : (F.asOf || '').replace(/-/g, '.') + ' 장 마감') + ' 기준 · 설정일 ' + (F.start || '').replace(/-/g, '.') + ' · 벤치마크 KOSPI',
      fdCards: (() => {
        const H2 = (F.history || []).filter((h) => h[1]);
        const last = H2[H2.length - 1];
        const ref = (days) => { if (!last) return null; const t = new Date(last[0]); t.setDate(t.getDate() - days); const d = t.toISOString().slice(0, 10); return H2.filter((h) => h[0] <= d).pop(); };
        const m1 = ref(30), r1 = m1 && m1 !== last ? (last[1] / m1[1] - 1) * 100 : null;
        const chg = F.nav && F.day !== null && F.day !== undefined ? F.nav - F.nav / (1 + F.day / 100) : null;
        const ex = kospi !== null && kospi !== undefined ? F.ret - kospi : null;
        return [
          { k: '기준가 (전일대비)', v: F.nav ? Number(F.nav).toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-', c: '#F7F6F3', s: chg === null ? '' : (chg >= 0 ? '+' : '−') + Math.abs(chg).toFixed(2) + ' (' + pct(F.day) + ')', sc: col(F.day) },
          { k: '수익률 (설정 이후)', v: pct(F.ret), c: col(F.ret), s: '', sc: '' },
          { k: '수익률 (1개월)', v: r1 === null ? '-' : pct(r1), c: col(r1), s: '', sc: '' },
          { k: 'KOSPI 대비 (설정 이후)', v: ex === null ? '-' : (ex > 0 ? '+' : ex < 0 ? '−' : '') + Math.abs(ex).toFixed(2) + '%p', c: col(ex), s: 'KOSPI ' + pct(kospi), sc: 'rgba(247,246,243,0.55)' },
          { k: '보유 종목', v: String(hs.length), c: '#F7F6F3', s: '현금 ' + (F.cashWeight || 0).toFixed(1) + '%', sc: 'rgba(247,246,243,0.55)' },
        ];
      })(),
      fdNav: [['fd-weekly', 'Strategy'], ['fd-strat', 'Summary'], ['fd-perf', '수익률'], ['fd-alloc', '자산구성'], ['fd-hold', '보유종목'], ['fd-attr', '기여도']].map(([id, t]) => ({ t, on: (e) => { e.preventDefault(); const el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior: 'smooth' }); } })),
      fdStartLabel: '설정 이후' + (sd ? ' (' + sd.replace(/-/g, '.') + ')' : ''),
      fdAlloc: alloc,
      fdAllocLegend: hs.slice(0, 6).map((h, i) => ({ c: shades[i % shades.length], t: h.name, w: (h.weight || 0).toFixed(1) + '%' })).concat(hs.length > 6 ? [{ c: 'rgba(247,246,243,0.35)', t: '외 ' + (hs.length - 6) + '종목', w: hs.slice(6).reduce((a, h) => a + (h.weight || 0), 0).toFixed(1) + '%' }] : []).concat([{ c: 'rgba(247,246,243,0.16)', t: '현금', w: cw.toFixed(1) + '%' }]),
      fdChips: [
        { k: '일간', v: pct(F.day), c: col(F.day), n: '' },
        top && key(top) > 0 ? { k: '상위 기여', n: top.name, v: fmtK(top), c: up } : null,
        bot && key(bot) < 0 ? { k: '하위 기여', n: bot.name, v: fmtK(bot), c: dn } : null,
      ].filter(Boolean),
      fdTicks: chart.ticks, fdXs: chart.xs, fdEnds: chart.ends,
      fdTabs: [['1w', '1주'], ['1m', '1개월'], ['3m', '3개월'], ['all', '설정 이후']].filter(([k]) => k === 'all' || (HA.length && (new Date(HA[HA.length - 1][0]) - new Date(HA[0][0])) / 864e5 > RANGES[k] * 0.6)).map(([k, t]) => ({ t, cls: k === rk ? 'on' : '', on: (e) => { e.preventDefault(); this.setState({ fdRange: k }); } })),
      fdRangeCap: rk === 'all' ? '설정일 ' + (F.start || '').replace(/-/g, '.') + ' = 1,000 · 벤치마크 KOSPI, KOSDAQ' : (H[0] ? H[0][0].replace(/-/g, '.') : '') + ' = 0% · 벤치마크 KOSPI, KOSDAQ',
      fdMove: (e) => this.fdHover(e), fdLeave: (e) => { const r = e.currentTarget; r.classList.remove('on', 'mv'); r._fdI = null; },
      ...this.fundPortfolio(F, live, hs, shades, cw, pct, won, col, up, dn),
      fdLiveDot: !!live && open, fdClosed: !(live && open),
      fdMeta: live ? 'AMT Fund · 키움증권 계좌 · ' + (F.asOf || '').slice(5, 19).replace('-', '/') + ' 기준' : 'AMT Fund · ' + (F.asOf || '').replace(/-/g, '.') + ' 장 마감 기준',
      fdHeadRet: pct(F.ret), fdHeadColor: col(F.ret),
      fdHeadRest: gap === null ? '' : ', KOSPI보다 ' + Math.abs(gap).toFixed(2) + '%p ' + (gap >= 0 ? '앞서' : '뒤처져'),
      fdDek: (F.day !== null && F.day !== undefined ? '오늘 ' + pct(F.day) + '. ' : '') + (best ? best.name + (live ? '이 오늘 가장 많이 벌었고, ' : '이 오늘 가장 많이 올랐고, ') : '') + hs.length + '개 종목과 현금 ' + (F.cashWeight || 0).toFixed(1) + '%로 운용 중입니다.',
      fdKpis: [
        { v: F.nav ? Number(F.nav).toFixed(2) : '-', k: '기준가격' + (F.nav && F.day !== null && F.day !== undefined ? '  ' + (F.day >= 0 ? '▲ ' : '▼ ') + Math.abs(F.nav - F.nav / (1 + F.day / 100)).toFixed(2) : ''), c: '#F7F6F3' },
        { v: pct(F.ret), k: '설정 이후', c: col(F.ret) },
        { v: pct(F.day), k: '일간', c: col(F.day) },
        { v: pct(kospi), k: 'KOSPI 동기간', c: col(kospi) },
        { v: pct(kosdaq), k: 'KOSDAQ 동기간', c: col(kosdaq) },
      ],
      fdChartHas: chart.has, fdChartNone: !chart.has, fdPtsF: chart.f, fdPtsK: chart.k, fdPtsQ: chart.q, fdBaseY: chart.base,
      fdContrib: contrib.map((x) => ({ grow: (Math.abs(x.c) / ctot * 100).toFixed(2), bg: x.c >= 0 ? up : dn, label: Math.abs(x.c) / ctot > 0.08 ? x.nm + ' ' + (x.c > 0 ? '+' : '−') + Math.abs(x.c).toFixed(2) + '%p' : '' })),
      fdHasContrib: contrib.length > 0,
      fdContribSum: live ? '합계 ' + pct(live.day) : '',
      fdHoldCap: hs.length + '종목 · 주식 ' + (100 - (F.cashWeight || 0)).toFixed(1) + '% · 현금 ' + (F.cashWeight || 0).toFixed(1) + '%',
      fdHolds: hs.map((h) => {
        const pc = prevMap[h.code];
        const fl = live && pc !== undefined && pc !== h.cur ? (h.cur > pc ? 'fdFu' : 'fdFd') + (tick % 2) : 'none';
        return {
          name: h.name, meta: h.code + (h.since ? ' · ' + h.since.slice(2).replace(/-/g, '.') + ' 편입' : ''),
          w: (h.weight || 0).toFixed(1) + '%', wbar: ((h.weight || 0) / maxW * 72).toFixed(1) + '%', evlt: '',
          avg: '', cur: '',
          ret: pct(h.ret), retColor: col(h.ret), day: h.day === null || h.day === undefined ? '' : 'Today ' + pct(h.day), dayColor: col(h.day),
          dayPl: '', dayPlColor: col(h.day), fl,
        };
      }),
      fdNote: '본 페이지는 중앙대학교 가치투자학회 R.F.S. 운용팀의 운용 현황을 학회 활동 목적으로 공개하는 자료이며, 특정 종목의 매수·매도를 권유하지 않습니다. 과거의 수익률이 미래의 수익을 보장하지 않으며, 투자 판단과 그 결과에 대한 책임은 투자자 본인에게 있습니다. 표시된 수치는 운용 계좌의 추정 자산 기준으로 실제와 다를 수 있습니다.',
    };
  }

  // 가입 신청 (assets/join.js). 관리자면 AGORA 위쪽 바에 '운영'(승인 대기 N)이 생긴다 (assets/ask.js). 관리자 여부는 member-admin 함수가 정한다
  openJoin() { if (window.RFSJoin && this.sb) window.RFSJoin.open({ sb: this.sb }); }
  // 관리자 버튼은 운영 대시보드(assets/ops.js: 승인·계좌·유지비·API 사용량)를 연다. ops.js가 없으면 예전처럼 승인 화면만
  openJoinAdmin() { if (!this.sb) return; if (window.RFSOps) window.RFSOps.open({ sb: this.sb, onPending: (n) => this.setJoinPending(n) }); else if (window.RFSJoin) window.RFSJoin.admin({ sb: this.sb, onChange: (n) => this.setJoinPending(n) }); }
  setJoinPending(n) { this.setState({ joinPending: n }); if (window.RFSAsk && window.RFSAsk.setAdmin) window.RFSAsk.setAdmin(n); }
  logout() { if (this.sb) this.sb.auth.signOut(); this.setState({ user: null }); this.go('home'); }
  loadJoinAdmin(email) {
    if (this._joinFor === email) return; this._joinFor = email;
    const run = () => (window.RFSJoin ? window.RFSJoin.isAdmin(this.sb).then((n) => { if (this._joinFor === email) this.setJoinPending(n); }) : setTimeout(run, 300));
    run();
  }

  // 로그인은 한 곳: 비밀번호 하나로 학회원 공용 계정, 맞지 않으면 운용팀 계정을 차례로 시도한다 (운용팀은 학회원 화면도 다 본다)
  // 아이디는 '@' 앞만 써도 된다 (amt → amt@caurfs.kr, member → member@caurfs.kr)
  signIn(id, pw) {
    if (!this.sb) return Promise.resolve({ error: new Error('no client') });
    const raw = String(id || '').trim().toLowerCase();
    const email = raw.includes('@') ? raw : raw + '@caurfs.kr';
    return this.sb.auth.signInWithPassword({ email, password: pw || '' }).then(({ error }) => ({ error, email }));
  }

  // 증권사 문체로 다듬기 (운용팀 계정만): 편집기 HTML의 사진을 [[IMG n]]로 바꿔 보내고, 돌아온 HTML에 사진을 다시 끼운다
  async wkPolish(ed) {
    const imgs = [...ed.querySelectorAll('img')].map((im) => im.outerHTML);
    let k = 0; const html = ed.innerHTML.replace(/<img\b[^>]*>/g, () => '[[IMG ' + (++k) + ']]');
    const { data } = await this.sb.auth.getSession();
    const r = await fetch('https://api.caurfs.kr/wk/polish', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ((data && data.session && data.session.access_token) || '') }, body: JSON.stringify({ html }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error || !j.html) throw new Error(j.error || '문체를 다듬지 못했습니다');
    this._wkPrevHtml = ed.innerHTML;
    ed.innerHTML = window.RFSWk.clean(j.html.replace(/\[\[IMG (\d+)\]\]/g, (m, n) => imgs[+n - 1] || ''));
    // clean이 사진 표시(data-k)를 지우므로 다시 붙이고, 편집기에 바뀐 걸 알린다
    ed.querySelectorAll('img').forEach((im) => { if (/^blob:|^https:/.test(im.getAttribute('src') || '')) im.setAttribute('data-k', 'ok'); });
    ed.dispatchEvent(new Event('input'));
  }

  // Polaris 피드백 (운용팀 계정만, 서버가 한 번 더 확인): 글 → {items} 또는 {err}
  async wkFeedback(text) {
    const { data } = await this.sb.auth.getSession();
    const r = await fetch('https://api.caurfs.kr/wk/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ((data && data.session && data.session.access_token) || '') }, body: JSON.stringify({ text }) });
    const j = await r.json().catch(() => ({}));
    return r.ok && !j.error ? { items: j.items || [] } : { err: j.error || '피드백을 받지 못했습니다' };
  }

  // 위클리: 글쓰기 칸을 노션식 편집기로 붙이고, 노션식 글은 HTML로 채운다 (assets/wk-rich.js)
  wkDom() {
    const W = window.RFSWk; if (!W) return;
    if (W.setProxy && !this._wkProxy) {
      this._wkProxy = true;
      // 노션 사진 주소는 브라우저가 직접 못 받는 경우가 많아 wk-image 함수가 대신 받아 준다
      W.setProxy((url) => this.sb.auth.getSession().then(({ data }) => fetch(this.sb.supabaseUrl + '/functions/v1/wk-image', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: this.sb.supabaseKey, Authorization: 'Bearer ' + ((data && data.session && data.session.access_token) || this.sb.supabaseKey) }, body: JSON.stringify({ url }) }))
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); }));
    }
    const ed = document.querySelector('.wk-form .wk-ed'); if (ed) W.attach(ed);
    document.querySelectorAll('.wk-rich[data-wk]').forEach((n) => { const id = n.getAttribute('data-wk'); const b = (this._wkBodies || {})[id]; if (b && n.__wk !== b) { n.__wk = b; W.render(n, b); if (n.closest('.wr')) W.report(n.closest('.wr'), n); else W.sheet(n.closest('.wkp-sheet'), n); } });
  }

  // FUND 위클리: 누구나 읽고, 운용팀 계정(AMT_EMAIL)만 쓴다. 표는 Supabase fund_weekly, 사진은 Storage fund-weekly
  loadWeekly() {
    if (!this.sb) return;
    this.sb.from('fund_weekly').select('*').order('week', { ascending: false }).order('created_at', { ascending: false }).limit(30)
      .then(({ data, error }) => {
        // 다음에 들어올 때 바로 보이게 마지막 목록을 이 브라우저에 둔다 (공개 글이라 괜찮다). 실패하면 있던 것을 그대로 쓴다
        if (!error && data) { try { const j = JSON.stringify(data.slice(0, 6)); if (j.length < 400000) localStorage.setItem('rfs_wk_cache', j); } catch (e) {} }
        this.setState((st) => ({ weekly: error ? (st.weekly || []) : (data || []), weeklyLoaded: true }));
      }, () => this.setState((st) => ({ weekly: st.weekly || [], weeklyLoaded: true })));
  }

  weeklyProps() {
    const s = this.state;
    const AMT_EMAIL = 'amt@caurfs.kr';
    const isAmt = !!(s.user && s.user.email === AMT_EMAIL);
    const list = s.weekly || [];
    const openId = s.wkOpen === undefined ? (list[0] && list[0].id) : s.wkOpen;
    const fmt = (d) => { const t = new Date(d + 'T00:00:00'); return isNaN(t) ? d : t.getFullYear() + '.' + String(t.getMonth() + 1).padStart(2, '0') + '.' + String(t.getDate()).padStart(2, '0'); };
    const today = (() => { const k = new Date(Date.now() + 9 * 3600e3); return k.toISOString().slice(0, 10); })();
    // 투자전략: 일요일에 올리면 다음 월~금. 그 주 월요일(오늘이 월요일이면 오늘)을 기준일로, 제목은 날짜 범위
    // 기본 적용 주: 주말에 쓰면 다음 주 월요일, 평일(월~금)에 쓰면 이번 주 월요일 (그 주 전략을 늦게 올리는 경우가 많아서)
    const nextMon = (() => { const d = new Date(today + 'T00:00:00'); const k = d.getDay(); d.setDate(d.getDate() + (k === 0 ? 1 : k === 6 ? 2 : 1 - k)); return d; })();
    const ymdOf = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const md = (d) => (d.getMonth() + 1) + '.' + d.getDate();
    const weekTitle = (mon) => { const a = new Date(mon + 'T00:00:00'); const f = new Date(a); f.setDate(a.getDate() + 4); return md(a) + '(월) ~ ' + md(f) + '(금) 투자전략'; };
    const cat = s.wkCat || '투자전략';
    const strat = cat === '투자전략';
    const monPick = (() => { const v = s.wkMon || ymdOf(nextMon); const d = new Date(v + 'T00:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymdOf(d); })();
    // 본문 속 [사진 N] 줄은 그 자리에 N번째 사진을 넣는다. 본문에 안 쓰인 사진은 글 끝에 모아 보여준다
    const TOK = /\[사진\s*(\d+)\]/g;
    const parasImg = (b, imgs) => String(b || '').replace(/\r/g, '').replace(/[ \t]*\[사진\s*(\d+)\][ \t]*/g, '\n\n[사진 $1]\n\n').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => {
      const m = p.match(/^\[사진 (\d+)\]$/);
      if (m) { const u = imgs[+m[1] - 1]; return u ? { isImg: true, isText: false, u, lines: [] } : null; }
      return { isImg: false, isText: true, u: '', lines: p.split('\n').map((t) => ({ t })) };
    }).filter(Boolean);
    const usedIdx = (b) => { const set = new Set(); String(b || '').replace(TOK, (_, n) => { set.add(+n - 1); return ''; }); return set; };
    const paras = (b) => String(b || '').replace(/\r/g, '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => ({ lines: p.split('\n').map((t) => ({ t })) }));
    const upload = async (files) => {
      const urls = [];
      for (const f of files) {
        const ext = (f.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = today + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
        const { error } = await this.sb.storage.from('fund-weekly').upload(path, f, { contentType: f.type || undefined, upsert: false });
        if (error) throw error;
        urls.push(this.sb.storage.from('fund-weekly').getPublicUrl(path).data.publicUrl);
      }
      return urls;
    };
    // 노션식 글(<!--rich-->로 시작)은 HTML로 저장된다. 목록에는 글자만 뽑아 보여 준다
    const plain = (b) => (new DOMParser().parseFromString(String(b || '').replace(/</g, ' <'), 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim();
    this._wkBodies = this._wkBodies || {};
    // 리포트 양식 오른쪽 칸: 글의 기준일(투자전략은 그 주 월요일 전 마지막 거래일) 펀드 기준가·수익률·추이를 자동으로.
    // 리포트 1페이지의 투자의견 박스·Stock Data·Stock Price 자리. 보유 상위 종목은 지금 것이라 가장 최근 글에만
    const FD = s.fundLive || s.fundPub;
    const FH = ((FD && FD.history) || []).filter((h) => h[1] && h[2]);
    const sg = (v, d = 1) => (v === null || v === undefined || isNaN(v) ? '-' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d));
    const fundSide = (w, newest) => {
      const isN = (w.category || '투자전략') === '공지';
      const a = new Date(w.week + 'T00:00:00'), f = new Date(a); f.setDate(a.getDate() + 4);
      const base = isN ? [{ l: '구분', v: '공지' }, { l: '게시일', v: fmt(w.week).slice(2) }] : [{ l: '구분', v: '투자전략' }, { l: '적용 기간', v: isNaN(a) ? '-' : md(a) + ' ~ ' + md(f) }];
      let i = -1; FH.forEach((h, k) => { if (isN ? h[0] <= w.week : h[0] < w.week) i = k; });
      if (i < 1) return { facts: base.concat([{ l: '작성', v: '운용팀' }]), hasFd: false, hasTop: false, metaLine: isN ? '게시일 ' + fmt(w.week) : '적용 기간 ' + (isNaN(a) ? '-' : md(a) + '(월) ~ ' + md(f) + '(금)'), asOfLine: '' };
      const H = FH.slice(0, i + 1), L = H[i], d0 = L[0];
      const back = (days) => { const t = new Date(d0 + 'T00:00:00'); t.setDate(t.getDate() - days); const c = t.toISOString().slice(0, 10); return H.filter((h) => h[0] <= c).pop() || null; };
      const r = (ref, col) => (ref ? (L[col] / ref[col] - 1) * 100 : null);
      const w1 = back(7), m1 = back(30), m3 = back(91);
      const sinceF = (L[1] / 1000 - 1) * 100, sinceK = (L[2] / H[0][2] - 1) * 100;
      // 추이: 설정일 = 100으로 맞춘 펀드·KOSPI 두 선
      const fs = H.map((h) => h[1] / H[0][1] * 100), ks = H.map((h) => h[2] / H[0][2] * 100);
      const lo = Math.min(...fs, ...ks, 100) * 0.98, hi = Math.max(...fs, ...ks, 100) * 1.02;
      const pt = (arr) => arr.map((v, k) => (k / Math.max(1, arr.length - 1) * 237).toFixed(1) + ',' + (100 - (v - lo) / (hi - lo) * 96).toFixed(1)).join(' ');
      const yb = (100 - (100 - lo) / (hi - lo) * 96).toFixed(1);
      const hs = newest ? ((FD.holdings || []).slice().sort((x, y) => y.weight - x.weight).slice(0, 5)) : [];
      const wm = Math.max(1, ...hs.map((h) => h.weight || 0));
      // 새 양식(주간 운용 리포트): 기간 수익률 표 4칸 + 초과, 넓은 누적 그래프(설정일 = 0%), 보유 종목 전체 + 현금
      const UP = '#B23A3A', DN = '#2F5FA8', FL = 'rgba(26,26,26,.45)', cc = (v) => (v === null || isNaN(v) ? FL : v > 0 ? UP : v < 0 ? DN : FL);
      const per = [[r(w1, 1), r(w1, 2)], [r(m1, 1), r(m1, 2)], [r(m3, 1), r(m3, 2)], [sinceF, sinceK]];
      const prow = (n, k, cls, unit) => { const o = { n, cls }; per.forEach((pr, q) => { const v = k === 2 ? (pr[0] === null || pr[1] === null ? null : pr[0] - pr[1]) : pr[k]; o['v' + (q + 1)] = sg(v, 2) + (v === null ? '' : unit); o['c' + (q + 1)] = cc(v); }); return o; };
      const ff = H.map((h) => (h[1] / 1000 - 1) * 100), kk = H.map((h) => (h[2] / H[0][2] - 1) * 100);
      const lo2 = Math.min(...ff, ...kk, 0) - 2, hi2 = Math.max(...ff, ...kk, 0) + 2;
      const X2 = (k) => (k / Math.max(1, H.length - 1) * 860).toFixed(1), Y2 = (v) => (6 + (hi2 - v) / (hi2 - lo2) * 208).toFixed(1);
      const pl = (arr) => arr.map((v, k) => X2(k) + ',' + Y2(v)).join(' ');
      // 보유 종목: 그 주 비중 기록(수집기 weeks)이 있으면 그것을, 없으면 가장 최근 글에만 지금 비중을. 지난주 기록이 있으면 비중 증감도
      const WK = FD.weeks || [], wi = WK.findIndex((x) => x.week === w.week);
      const snapOf = (x) => x ? { cash: x.cash, h: x.h.map(([code, name, weight]) => ({ code, name, weight, ret: null })), asOf: x.asOf } : null;
      const cur = wi >= 0 ? snapOf(WK[wi]) : newest ? { cash: FD.cashWeight, h: (FD.holdings || []).map((h) => ({ code: h.code, name: h.name, weight: h.weight, ret: h.ret })), asOf: (FD.asOf || '').slice(0, 10) } : null;
      (this._wkTo = this._wkTo || {})[w.id] = wi >= 0 && WK[wi].to != null ? WK[wi].to.toFixed(1) + '%' : ''; // 매매회전율 (수집기 kt00007), 보고서 PDF에만 쓴다
      // 운용보고서 PDF 부록: 업종별 비중·매매 종목·비용(모두 % 비율, 금액 없음)
      (this._wkPdf = this._wkPdf || {})[w.id] = (() => {
        const sn = wi >= 0 ? WK[wi] : null; const cur0 = wi >= 0 ? snapOf(WK[wi]) : null;
        const sec = {}; ((cur0 && cur0.h) || []).forEach((h) => { const k = FUND_SECTOR[h.code] || '기타'; sec[k] = (sec[k] || 0) + (h.weight || 0); });
        const prev0 = wi > 0 ? snapOf(WK[wi - 1]) : null; const pw0 = {}; ((prev0 && prev0.h) || []).forEach((h) => { pw0[h.code] = h.weight; });
        const cw0 = {}; ((cur0 && cur0.h) || []).forEach((h) => { cw0[h.code] = h.weight; });
        return {
          sectors: Object.entries(sec).sort((x, y) => y[1] - x[1]).map(([k, v]) => [k, v.toFixed(1)]), cash: cur0 && cur0.cash != null ? cur0.cash.toFixed(1) : '',
          trades: ((sn && sn.tr) || []).map(([c, n, sd]) => { const d = (cw0[c] || 0) - (pw0[c] || 0); return [n, sd, prev0 ? (d > 0 ? '+' : d < 0 ? '−' : '') + Math.abs(d).toFixed(1) : '-']; }),
          fee: sn && sn.fee != null ? sn.fee.toFixed(3) + '%' : '', tax: sn && sn.tax != null ? sn.tax.toFixed(3) + '%' : '',
          top: ((cur0 && cur0.h) || []).slice().sort((x, y) => (y.weight || 0) - (x.weight || 0)).slice(0, 10).map((h) => [h.name, FUND_SECTOR[h.code] || '기타', (h.weight || 0).toFixed(1)]),
          ...wkStats(FD.history || [], w.week),
        };
      })();
      const prvS = wi > 0 ? snapOf(WK[wi - 1]) : wi < 0 && newest ? snapOf(WK.filter((x) => x.week < w.week).pop()) : null;
      const pw = {}; if (prvS) prvS.h.forEach((h) => { pw[h.code] = h.weight; });
      const all = cur ? cur.h.slice().sort((x, y) => y.weight - x.weight) : [];
      const hm = Math.max(1, ...all.map((h) => h.weight || 0), (cur && cur.cash) || 0);
      const dlt = (now, was) => { if (!prvS) return { d: '', dc: FL }; const v = (now || 0) - (was || 0); return Math.abs(v) < 0.05 ? { d: '-', dc: FL } : { d: (was === undefined ? '신규 ' : '') + sg(v, 1) + '%p', dc: v > 0 ? UP : DN }; };
      return {
        facts: base.concat([{ l: '기준가 (' + d0.slice(5).replace('-', '.') + ')', v: Number(L[1]).toFixed(2) }, { l: '설정 이후', v: sg(sinceF) + '%' }, { l: 'KOSPI 대비', v: sg(sinceF - sinceK) + '%p' }]),
        hasFd: true,
        fdRows: [{ n: 'AMT Fund', a: sg(r(w1, 1)), b: sg(r(m1, 1)), c: sg(r(m3, 1)) }, { n: 'KOSPI', a: sg(r(w1, 2)), b: sg(r(m1, 2)), c: sg(r(m3, 2)) }],
        fdKv: [{ l: '설정일', v: (FD.start || H[0][0]).replace(/-/g, '.') }, { l: 'KOSPI (' + d0.slice(5).replace('-', '.') + ')', v: Number(L[2]).toLocaleString('ko-KR', { maximumFractionDigits: 2 }) }],
        chF: pt(fs), chK: pt(ks), chB: '0,' + yb + ' 237,' + yb, chFrom: H[0][0].slice(2).replace(/-/g, '.'), chTo: d0.slice(2).replace(/-/g, '.'),
        hasTop: hs.length > 0 || !!(cur && cur.h.length), topAsOf: ((cur && cur.asOf) || FD.asOf || '').slice(5, 10).replace('-', '.') + ' 기준' + (prvS ? ' · 가운데 칸은 지난주 대비' : ''),
        top: hs.map((h) => ({ n: h.name, w: (h.weight || 0).toFixed(1) + '%', bw: ((h.weight || 0) / wm * 100).toFixed(0) + '%' })),
        ptRows: [prow('AMT Fund', 0, 'f', '%'), prow('KOSPI', 1, '', '%'), prow('초과수익', 2, 'x', '%p')],
        rcF: pl(ff), rcK: pl(kk), rcZ: '0,' + Y2(0) + ' 860,' + Y2(0), rcA: '0,' + Y2(0) + ' ' + pl(ff) + ' 860,' + Y2(0),
        hold: all.map((h) => ({ n: h.name, w: (h.weight || 0).toFixed(1) + '%', bw: ((h.weight || 0) / hm * 100).toFixed(0) + '%', op: 1, r: h.ret === null || h.ret === undefined ? '' : sg(h.ret, 1) + '%', rc: cc(h.ret), ...dlt(h.weight, pw[h.code]) }))
          .concat(prvS ? prvS.h.filter((h) => !all.some((x) => x.code === h.code)).map((h) => ({ n: h.name, w: '0.0%', bw: '0%', op: 1, r: '편출', rc: FL, d: sg(-h.weight, 1) + '%p', dc: DN })) : [])
          .concat(cur && cur.cash ? [{ n: '현금', w: cur.cash.toFixed(1) + '%', bw: (cur.cash / hm * 100).toFixed(0) + '%', op: .4, r: '', rc: FL, ...dlt(cur.cash, prvS ? prvS.cash : undefined) }] : []),
        metaLine: (isN ? '게시일 ' + fmt(w.week) : '적용 기간 ' + md(a) + '(월) ~ ' + md(f) + '(금)') + ' · 기준가 ' + Number(L[1]).toFixed(2),
        asOfLine: '기준일 ' + d0.replace(/-/g, '.'),
      };
    };
    // FUND 첫 화면 카드: 주차, 금주 섹터 배분(글의 '금주:' 줄), 그 주 수익률·KOSPI 대비, 주식비(글 속 '주식비 N%'들의 처음 → 마지막)
    const cardOf = (w, body, rich) => {
      const x = rich ? plain(body) : body;
      const wk = (x.match(/(\d{1,2})월\s*(\d)주차/) || []);
      const head = ((x.match(/금주\s*[:：]\s*([^()\n]{2,60}?)\s*(?:\(|주식비|$)/) || [])[1] || '').trim();
      const eq = [...x.matchAll(/주식비\s*(\d{1,3})\s*%/g)].map((m) => m[1] + '%').slice(0, 2);
      const a = new Date(w.week + 'T00:00:00'), f = new Date(a); f.setDate(a.getDate() + 4);
      const fy = ymdOf(f), pre = FH.filter((h) => h[0] < w.week).pop(), end = FH.filter((h) => h[0] <= fy).pop();
      const ok = pre && end && end[0] >= w.week;
      const rf = ok ? (end[1] / pre[1] - 1) * 100 : null, rk = ok ? (end[2] / pre[2] - 1) * 100 : null;
      const col = (v) => (v === null ? 'rgba(247,246,243,.5)' : v > 0 ? 'var(--up)' : v < 0 ? 'var(--dn)' : 'rgba(247,246,243,.7)');
      return { cWeek: wk.length ? wk[1] + '월 ' + wk[2] + '주차' : fmt(w.week), cRange: isNaN(a) ? '' : md(a) + ' ~ ' + md(f),
        cHead: head || w.title, cRet: rf === null ? '-' : sg(rf, 2) + '%', cRetC: col(rf), cEx: rf === null ? '-' : sg(rf - rk, 2) + '%p', cExC: col(rf === null ? null : rf - rk),
        cEq: eq.length ? (eq.length > 1 && eq[0] !== eq[1] ? eq[0] + ' → ' + eq[1] : eq[eq.length - 1]) : '-', cTag: end && end[0] < fy ? '진행 중' : '', hasTag: !!(end && end[0] < fy) };
    };
    const item = (w, open, key = 'wkOpen') => {
      const body = String(w.body || '');
      const rich = body.indexOf('<!--rich-->') === 0;
      if (rich) this._wkBodies[w.id] = body;
      return {
        id: w.id, rich: open && rich, kind: (w.category || '투자전략') === '공지' ? 'Notice' : 'Weekly Strategy', kindLine: ((w.category || '투자전략') === '공지' ? 'NOTICE' : 'WEEKLY STRATEGY') + ' · AMT FUND',
        // 리포트 양식 머리: 회색 띠는 리포트의 회사명 자리에 'AMT Fund', 위 칸은 Weekly Strategy/Notice. 오른쪽 남색 박스는 글 정보
        bandName: 'AMT Fund',
        ...(open && rich ? fundSide(w, w === list[0]) : {}),
        date: fmt(w.week), title: w.title, cat: w.category || '투자전략', catCls: 'wk-cat' + ((w.category || '투자전략') === '공지' ? ' n' : ''), open, closed: !open, cls: 'wk-item' + (open ? ' open' : ''),
        excerpt: (() => { const x = rich ? plain(body) : body.replace(TOK, '').replace(/\s+/g, ' ').trim(); return x.slice(0, 120) + (x.length > 120 ? '…' : ''); })(),
        paras: open && !rich ? parasImg(body, w.images || []) : [], imgs: open && !rich ? (w.images || []).filter((_, k) => !usedIdx(body).has(k)).map((u) => ({ u })) : [],
        hasLink: open && !!w.link, plainLink: open && !rich && !!w.link, link: w.link || '',
        toggle: (e) => { e.preventDefault(); if (key === 'wkTop') { this.setState({ wkTopFull: false }, () => { const el = document.getElementById('fd-weekly'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior: 'smooth' }); }); return; } this.setState({ [key]: open ? null : w.id }); },
        pdf: (e) => { e.preventDefault(); const wr = e.target.closest('.wr'); if (wr && window.RFSPrint && !window.RFSPrint.open(wr, { team: (w.team && w.team.length) ? w.team : FUND_TEAM, note: w.note || '', bm: 'KOSPI', turnover: (this._wkTo || {})[w.id] || '', ...((this._wkPdf || {})[w.id] || {}) })) window.alert('팝업이 막혀 있어요. 이 사이트의 팝업을 허용해 주세요'); },
        ...(key === 'wkTop' ? cardOf(w, body, rich) : {}),
        canDel: open && isAmt,
        // 올린 글도 운용팀 계정이면 Polaris 피드백을 볼 수 있다 (글 안에서만, 저장하지 않음)
        canFb: open && isAmt,
        fbLabel: (s.wkFbPost && s.wkFbPost.id === w.id && s.wkFbPost.busy) ? 'Polaris가 읽는 중…' : 'Polaris 피드백',
        fbOn: !!(s.wkFbPost && s.wkFbPost.id === w.id && (s.wkFbPost.items || s.wkFbPost.err)),
        fbHead: (s.wkFbPost && s.wkFbPost.id === w.id) ? (s.wkFbPost.err || ((s.wkFbPost.items || []).length ? '고칠 곳 ' + s.wkFbPost.items.length + '개 · 작성자에게만 보입니다' : '짚을 곳이 없습니다')) : '',
        fbItems: (s.wkFbPost && s.wkFbPost.id === w.id && s.wkFbPost.items) || [],
        fbRun: async (e) => {
          e.preventDefault();
          if (this.state.wkFbPost && this.state.wkFbPost.busy) return;
          const el = e.target.closest('.wr'); const bd = el && el.querySelector('.wr-body'); const text = bd ? bd.innerText.trim() : '';
          this.setState({ wkFbPost: { id: w.id, busy: true } });
          try { this.setState({ wkFbPost: { id: w.id, ...(await this.wkFeedback(text)) } }); } catch (x) { this.setState({ wkFbPost: { id: w.id, err: 'Polaris 서버에 연결하지 못했습니다' } }); }
        },
        fbClose: (e) => { e.preventDefault(); this.setState({ wkFbPost: null }); },
        del: async (e) => { e.preventDefault(); if (!window.confirm('이 글을 지울까요?')) return; await this.sb.from('fund_weekly').delete().eq('id', w.id); this.loadWeekly(); },
      };
    };
    return {
      hasWeekly: true, weeklyEmpty: list.length === 0 && !!s.weeklyLoaded, noWeekly: false,
      wkStart: (e) => { e.preventDefault(); this.setState(isAmt ? { wkWrite: true } : { wkLogin: true }, () => { const el = document.getElementById('fd-weekly'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); },
      ...(() => {
        // FUND 첫 화면: 최근 투자전략 몇 주를 고르는 줄 + 고른 주의 리포트 윗부분만 보이고 아래는 흐려진다. 누르면 전체가 펼쳐진다
        const st = list.filter((w) => (w.category || '투자전략') === '투자전략').slice(0, 1);
        const sel = st[0];
        const label = (w, k) => (k === 0 ? '이번 주' : k === 1 ? '지난주' : (cardOf(w, String(w.body || ''), true).cWeek));
        return {
          weeklyLatest: sel ? [item(sel, true, 'wkTop')] : [],
          wkPicks: st.map((w, k) => ({ l: label(w, k), r: cardOf(w, String(w.body || ''), String(w.body || '').indexOf('<!--rich-->') === 0).cRange, cls: 'wk-pk' + (w === sel ? ' on' : ''), on: (e) => { e.preventDefault(); this.setState({ wkTop: w.id, wkTopFull: false }); } })),
          wkPeekCls: 'wk-list wk-peek',
          wkExpand: (e) => { e.preventDefault(); this.setState({ wkOpen: sel ? sel.id : undefined, wkList: false }, () => { this.go('strategy'); window.scrollTo(0, 0); }); },
        };
      })(),
      // 위클리 게시판: 위쪽 주 메뉴(이번 주·지난주·그 전 주·공지)에서 고른 글 하나만 전체로 보여 준다
      weeklyList: list.filter((w) => w.id === (list.some((x) => x.id === openId) ? openId : list[0] && list[0].id)).map((w) => item(w, true)),
      ...(() => {
        // 위클리 페이지: 들어가면 고른 글(처음엔 이번 주) 하나만. ← 이전 주 / 다음 주 →로 넘기고, 게시판 버튼은 전체 목록을 따로 연다
        const cur = list.findIndex((x) => x.id === (list.some((y) => y.id === openId) ? openId : list[0] && list[0].id));
        const w0 = list[cur], go = (k) => (e) => { e.preventDefault(); if (list[k]) this.setState({ wkOpen: list[k].id, wkList: false }, () => window.scrollTo({ top: 0, behavior: 'smooth' })); };
        const c0 = w0 ? cardOf(w0, String(w0.body || ''), String(w0.body || '').indexOf('<!--rich-->') === 0) : null;
        return {
          wkCurL: !w0 ? '' : (w0.category || '투자전략') === '공지' ? '공지' : cur === 0 ? '이번 주 · ' + c0.cWeek : c0.cWeek, wkCurR: w0 ? ((w0.category || '투자전략') === '공지' ? fmt(w0.week) : c0.cRange) : '',
          wkPrev: go(cur + 1), wkNext: go(cur - 1), wkPrevCls: 'wk-arr' + (list[cur + 1] ? '' : ' off'), wkNextCls: 'wk-arr' + (cur > 0 ? '' : ' off'),
          wkListOn: !!s.wkList, wkNavCls: 'wk-nav' + (s.wkList ? ' lst' : ''), wkListLabel: s.wkList ? '닫기' : '전체 목록', wkBoardCls: 'wk-list' + (s.wkList ? ' wk-hide' : ''),
          wkListToggle: (e) => { e.preventDefault(); this.setState({ wkList: !s.wkList }); },
          wkRows: list.map((w) => ({ date: fmt(w.week), cat: w.category || '투자전략', title: w.title, ex: (() => { const x = plain(String(w.body || '')); return x.slice(0, 70) + (x.length > 70 ? '…' : ''); })(), cls: 'wk-tr' + (w === w0 ? ' on' : ''), on: (e) => { e.preventDefault(); this.setState({ wkOpen: w.id, wkList: false }, () => window.scrollTo({ top: 0, behavior: 'smooth' })); } })),
        };
      })(),
      wkBoard: (e) => { e.preventDefault(); this.go('strategy'); },
      wkBack: (e) => { e.preventDefault(); this.go('fund'); },
      wkNewLabel: s.wkWrite ? '닫기' : '글쓰기',
      wkPreviews: (s.wkFiles || []).map((f, i) => ({ n: '사진 ' + (i + 1), u: f.__url || (f.__url = URL.createObjectURL(f)), rm: (e) => {
        e.preventDefault();
        const ta = document.querySelector('.wk-form textarea[data-body]');
        const body = (ta ? ta.value : (s.wkBody || '')).replace(new RegExp('\\s*\\[사진\\s*' + (i + 1) + '\\]\\s*', 'g'), '\n\n').replace(TOK, (m0, n) => (+n > i + 1 ? '[사진 ' + (+n - 1) + ']' : m0)).replace(/\n{3,}/g, '\n\n').trim();
        this.setState({ wkFiles: s.wkFiles.filter((_, k) => k !== i), wkBody: body });
      } })),
      hasWkLatest: true,
      wkLatestShort: list[0] ? fmt(list[0].week).slice(5) : '', wkLatestDate: list[0] ? fmt(list[0].week) : '', wkLatestTitle: list[0] ? list[0].title : '',
      wkLatestEx: list[0] ? (() => { const x = plain(list[0].body); return x.slice(0, 90) + (x.length > 90 ? '…' : ''); })() : '',
      wkGo: (e) => { e.preventDefault(); this.setState({ wkOpen: list[0] ? list[0].id : undefined }, () => { const el = document.getElementById('fd-weekly'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: 'smooth' }); }); },
      hasWkMsg: !!s.wkErr && !s.wkWrite,
      wkIsAmt: isAmt, wkWriteOpen: !!s.wkWrite, wkLoginOpen: !!s.wkLogin && !isAmt,
      wkToggleWrite: (e) => { e.preventDefault(); if (isAmt) this.setState({ wkWrite: !s.wkWrite, wkErr: '' }); else { this.setState({ wkLogin: true, wkErr: '', loginErr: '' }); window.scrollTo(0, 0); } },
      wkPw: s.wkPw || '', onWkPw: (e) => this.setState({ wkPw: e.target.value }), wkErr: s.wkErr || '',
      wkLogin: (e) => {
        e.preventDefault();
        this.signIn('amt', s.wkPw)
          .then(({ error, email }) => this.setState(error ? { wkErr: '비밀번호가 맞지 않습니다' } : email === AMT_EMAIL ? { wkErr: '', wkPw: '', wkLogin: false, wkWrite: true } : { wkErr: '학회원으로 로그인했습니다. 글쓰기는 운용팀 계정(amt)으로 로그인해야 합니다.', wkPw: '' }));
      },
      wkDate: s.wkDate || today, onWkDate: (e) => this.setState({ wkDate: e.target.value }),
      wkCats: ['투자전략', '공지'].map((c) => ({ t: c, cls: 'wk-catbtn' + (cat === c ? ' on' : ''), on: (e) => { e.preventDefault(); this.setState({ wkCat: c }); } })),
      wkIsStrat: strat, wkIsNotice: !strat,
      wkMon: monPick, onWkMon: (e) => this.setState({ wkMon: e.target.value }), wkAutoTitle: weekTitle(monPick),
      wkTitle: s.wkTitle || '', onWkTitle: (e) => this.setState({ wkTitle: e.target.value }),
      wkBody: s.wkBody || '', onWkBody: (e) => this.setState({ wkBody: e.target.value }),
      wkLink: s.wkLink || '', onWkLink: (e) => this.setState({ wkLink: e.target.value }),
      // 운용 인력은 새 글을 쓸 때 지난 글의 명단을 그대로 가져와 고쳐 쓴다
      wkTeamTxt: s.wkTeamTxt != null ? s.wkTeamTxt : (((list.find((x) => Array.isArray(x.team) && x.team.length) || {}).team) || FUND_TEAM).map((r) => r.filter(Boolean).join(' · ')).join('\n'),
      onWkTeam: (e) => this.setState({ wkTeamTxt: e.target.value }),
      wkNote: s.wkNote || '', onWkNote: (e) => this.setState({ wkNote: e.target.value }),
      // Polaris 피드백 (작성자 전용): 올리기 전에 빠진 맥락·설명 없는 용어·다듬을 문장을 짚는다 (api.caurfs.kr /wk/feedback, tools/rag/wk_feedback.py)
      wkPolLabel: s.wkPolBusy ? '문체 다듬는 중…' : '증권사 문체로 다듬기',
      wkPolUndo: !!s.wkPolished,
      wkPolRun: async (e) => {
        e.preventDefault(); if (s.wkPolBusy) return;
        const ed = document.querySelector('.wk-form .wk-ed'); if (!ed || !ed.textContent.trim()) { this.setState({ wkErr: '본문을 먼저 붙여넣어 주세요' }); return; }
        this.setState({ wkPolBusy: true, wkErr: '' });
        try { await this.wkPolish(ed); this.setState({ wkPolBusy: false, wkPolished: true, wkErr: '문체를 다듬었어요. 확인한 뒤 올리기를 누르세요' }); }
        catch (x) { this.setState({ wkPolBusy: false, wkErr: (x && x.message) || '문체를 다듬지 못했습니다' }); }
      },
      wkPolBack: (e) => { e.preventDefault(); const ed = document.querySelector('.wk-form .wk-ed'); if (ed && this._wkPrevHtml != null) { ed.innerHTML = this._wkPrevHtml; ed.dispatchEvent(new Event('input')); } this.setState({ wkPolished: false, wkErr: '원래 글로 되돌렸어요' }); },
      wkFbLabel: s.wkFbBusy ? 'Polaris가 읽는 중…' : 'Polaris 피드백',
      wkFbOn: !!(s.wkFb && (s.wkFb.items || s.wkFb.err)),
      wkFbHead: s.wkFb ? (s.wkFb.err || (s.wkFb.items.length ? '고칠 곳 ' + s.wkFb.items.length + '개' : '짚을 곳이 없습니다')) : '',
      wkFbItems: (s.wkFb && s.wkFb.items) || [],
      wkFbRun: async (e) => {
        e.preventDefault();
        if (s.wkFbBusy) return;
        const ed = document.querySelector('.wk-form .wk-ed'); const text = ed ? ed.innerText.trim() : '';
        if (!text) { this.setState({ wkFb: { err: '본문을 먼저 붙여넣어 주세요' } }); return; }
        this.setState({ wkFbBusy: true, wkFb: null });
        try {
          this.setState({ wkFbBusy: false, wkFb: await this.wkFeedback(text) });
        } catch (x) { this.setState({ wkFbBusy: false, wkFb: { err: 'Polaris 서버에 연결하지 못했습니다' } }); }
      },
      onWkFiles: (e) => {
        const cur = s.wkFiles || [];
        const add = [...(e.target.files || [])].filter((f) => /^image\//.test(f.type)).slice(0, 10 - cur.length); e.target.value = '';
        if (!add.length) return;
        // 커서가 있던 자리(없으면 끝)에 [사진 N] 줄을 넣어 글 중간에 사진이 들어가게 한다
        const ta = document.querySelector('.wk-form textarea[data-body]');
        const body = ta ? ta.value : (s.wkBody || '');
        const c0 = ta && typeof ta.selectionStart === 'number' ? ta.selectionStart : body.length;
        const nl = body.indexOf('\n', c0); const at = nl < 0 ? body.length : nl; // 커서가 있는 줄 끝에 넣어 단어가 잘리지 않게
        const toks = add.map((_, k) => '[사진 ' + (cur.length + k + 1) + ']').join('\n\n');
        const next = body.slice(0, at).replace(/\s*$/, '') + (at ? '\n\n' : '') + toks + '\n\n' + body.slice(at).replace(/^\s*/, '');
        this.setState({ wkFiles: [...cur, ...add], wkBody: next });
      },
      wkPick: (e) => { e.preventDefault(); window.RFSWk && window.RFSWk.pick(); },
      wkZip: (e) => { e.preventDefault(); window.RFSWk && window.RFSWk.pickZip && window.RFSWk.pickZip().catch((x) => this.setState({ wkErr: (x && x.message) || String(x) })); },
      wkFileNote: (s.wkFiles || []).length ? '사진 ' + s.wkFiles.length + '장' : '',
      wkBusy: !!s.wkBusy, wkSubmitLabel: s.wkBusy ? '올리는 중…' : '올리기',
      wkSubmit: async (e) => {
        e.preventDefault();
        if (s.wkBusy) return;
        if (!strat && !(s.wkTitle || '').trim()) { this.setState({ wkErr: '제목을 입력하세요' }); return; }
        const ed = document.querySelector('.wk-form .wk-ed');
        if (!ed || !window.RFSWk) { this.setState({ wkErr: '편집기를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요' }); return; }
        // 투자전략은 올리기 전에 한 번 증권사 문체로 다듬어 보여 준다. 확인하고 다시 누르면 그대로 올라간다
        if (strat && !s.wkPolished && !s.wkPolTried) {
          this.setState({ wkPolBusy: true, wkErr: '' });
          try { await this.wkPolish(ed); this.setState({ wkPolBusy: false, wkPolished: true, wkPolTried: true, wkErr: '문체를 다듬었어요. 확인한 뒤 올리기를 한 번 더 누르세요' }); }
          catch (x) { this.setState({ wkPolBusy: false, wkPolTried: true, wkErr: ((x && x.message) || '문체를 다듬지 못했습니다') + '. 이대로 올리려면 올리기를 한 번 더 누르세요' }); }
          return;
        }
        this.setState({ wkBusy: true, wkErr: '' });
        try {
          // 본문 속 사진은 저장소에 올리고 그 주소로 바꿔 HTML로 저장한다
          // 노션 제목에 '(10/26~10/30)'처럼 기간이 있으면 그 주 월요일을 적용 주로 쓴다 (날짜 칸을 잘못 골라도 맞게)
          let wkMon = monPick;
          const h1 = ed.querySelector('h1, h2'); const m = h1 && /\((\d{1,2})\s*[\/.]\s*(\d{1,2})\s*~/.exec(h1.textContent || '');
          if (strat && m) {
            const now = new Date(today + 'T00:00:00'); let y = now.getFullYear(); const mo = +m[1];
            if (mo === 12 && now.getMonth() === 0) y--; else if (mo === 1 && now.getMonth() === 11) y++;
            const d = new Date(y, mo - 1, +m[2]); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); wkMon = ymdOf(d);
          }
          const body = await window.RFSWk.collect(ed, upload);
          const link = (s.wkLink || '').trim();
          const row = { category: cat, week: strat ? wkMon : today, title: strat ? weekTitle(wkMon) : s.wkTitle.trim(), body, images: [], link: /^https?:\/\//.test(link) ? link : '' };
          if (strat) {
            const teamSrc = s.wkTeamTxt != null ? s.wkTeamTxt : ((document.querySelector('.wk-form .wk-team') || {}).value || '');
            row.team = teamSrc.split('\n').map((l) => l.split(/\s*[·|\t]\s*/).map((x) => x.trim()).filter(Boolean)).filter((r) => r.length).map((r) => [r[0], r[1] || '', r[2] || '', r[3] || '', r.slice(4).join(' · ')]);
            row.note = (s.wkNote || '').trim();
          }
          const { error } = await this.sb.from('fund_weekly').insert(row);
          if (error && /team|note/.test(error.message || '')) throw new Error('Supabase에 운용 인력·한마디 칸이 아직 없어요. supabase/fund_weekly_team.sql을 먼저 실행해 주세요');
          if (error) throw error;
          window.RFSWk.reset();
          this.setState({ wkBusy: false, wkWrite: false, wkTitle: '', wkBody: '', wkLink: '', wkFiles: [], wkMon: '', wkOpen: undefined, wkNote: '', wkTeamTxt: null, wkFb: null, wkPolished: false, wkPolTried: false });
          this.loadWeekly();
        } catch (x) { const m = (x && x.message) || String(x); this.setState({ wkBusy: false, wkErr: /^(노션|Supabase)/.test(m) ? m : '올리지 못했습니다: ' + m }); }
      },
    };
  }

  rfmProps(RF) {
    const s = this.state;
    const ms = (RF && RF.members) || [];
    const key = (n) => String(n || '').replace(/\s+/g, '').toLowerCase();
    const names = this.rfmNames();
    const real = (m) => names[key(m.nick)] || '';
    const nm = (m) => real(m) || m.nick;
    const pct = (v, d = 2) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d) + '%';
    const pp = (v) => Math.abs(v).toFixed(2) + '%p';
    const up = '#F2626B', dn = '#5E9BFF', flat = 'rgba(247,246,243,0.62)';
    const col = (v) => (v > 0 ? up : v < 0 ? dn : flat);
    const ret = (m) => (m.nav / 1000 - 1) * 100;
    const on = ms.filter((m) => m.found && m.nav);
    const order = [...on].sort((a, b) => b.nav - a.nav);
    const pos = {}; order.forEach((m, i) => { pos[m.nick] = i; });
    const bm = (RF && RF.bm) || {};
    const kospi = bm.kospi ? bm.kospi.ret : null, kosdaq = bm.kosdaq ? bm.kosdaq.ret : null;
    const cut = RF && RF.cut50 ? (RF.cut50 / 1000 - 1) * 100 : null;
    const vals = on.map(ret).concat([0], kospi !== null ? [kospi] : [], cut !== null ? [cut] : []);
    const lo = Math.min(...vals) - 2, hi = Math.max(...vals) + 2;
    const x = (v) => ((v - lo) / (hi - lo) * 100).toFixed(2) + '%';
    const avg = on.length ? on.reduce((a, m) => a + ret(m), 0) / on.length : 0;
    // 팀별: 수집기 명단의 팀 제목 줄로 묶인 별칭들. 평균 수익률 순
    const teamMap = {};
    ms.forEach((m) => { if (m.team) (teamMap[m.team] = teamMap[m.team] || []).push(m); });
    const teams = Object.entries(teamMap).map(([name, list]) => {
      const live = list.filter((m) => m.found && m.nav);
      const a = live.length ? live.reduce((q, m) => q + ret(m), 0) / live.length : null;
      const best = [...live].sort((p, q) => q.nav - p.nav)[0];
      return { name, list, live, a, best };
    }).filter((t) => t.live.length).sort((p, q) => q.a - p.a);
    const srt = on.map(ret).sort((a, b) => a - b), med = srt.length ? (srt.length % 2 ? srt[(srt.length - 1) / 2] : (srt[srt.length / 2 - 1] + srt[srt.length / 2]) / 2) : 0;
    const prevRet = {}; ((s.rfmPrevData && s.rfmPrevData.members) || []).forEach((m) => { if (m.nav) prevRet[m.nick] = ret(m); });
    const tick = this._rfmTick || 0;
    const dayOf = (m) => (m.navChg !== null && m.navChg !== undefined && m.nav - m.navChg ? m.navChg / (m.nav - m.navChg) * 100 : null);
    // 헤드라인: 1·2위 격차로 독주/접전
    const a1 = order[0], a2 = order[1];
    const gap12 = a1 && a2 ? ret(a1) - ret(a2) : 0;
    let mine = ''; try { mine = localStorage.getItem('rfs_rfm_me') || ''; } catch (e) {}
    const mi = order.findIndex((m) => m.nick === mine), me = order[mi];
    const k = new Date(Date.now() + 9 * 3600e3), hm = k.getUTCHours() * 60 + k.getUTCMinutes(), wd = k.getUTCDay();
    const live = wd >= 1 && wd <= 5 && hm >= 540 && hm <= 930;
    return {
      hasRfm: on.length > 0, noRfm: on.length === 0 && !!s.rfmLoaded, rfmLoading: on.length === 0 && !s.rfmLoaded,
      rfmLive: live, rfmClosed: !live,
      rfmMeta: [RF && RF.asOf ? RF.asOf.slice(0, 16).replace(/-/g, '.').replace('T', ' ') + ' 기준' : '', (RF && RF.contest) || '', on.length ? '참가 ' + on.length + '명' : '', '벤치마크 KOSPI'].filter(Boolean).join(' · '),
      rfmHeadLead: a1 ? nm(a1) : '',
      rfmHeadRest: !a1 ? '' : !a2 ? ' 단독 참가' : gap12 > 5 ? ' 독주, 2위와 ' + pp(gap12) + ' 차' : (' · ' + nm(a2) + ', ' + pp(gap12) + ' 차 접전'),
      rfmDek: [
        { k: '학회 평균', v: pct(avg), c: col(avg) },
        { k: 'KOSPI', v: kospi !== null ? pct(kospi) : '-', c: kospi !== null ? col(kospi) : flat },
        { k: 'KOSDAQ', v: kosdaq !== null ? pct(kosdaq) : '-', c: kosdaq !== null ? col(kosdaq) : flat },
      ],
      rfmCards: (() => {
        if (!a1) return [];
        const beat = kospi !== null ? on.filter((m) => ret(m) > kospi).length : null;
        const in50 = on.filter((m) => m.rank && m.rank <= 50).length;
        const ex = kospi !== null ? avg - kospi : null;
        return [
          { k: '학회 1위', v: nm(a1), c: '#F7F6F3', s: pct(ret(a1)), sc: col(ret(a1)) },
          { k: '학회 평균 수익률', v: pct(avg), c: col(avg), s: '중앙값 ' + pct(med), sc: 'rgba(247,246,243,0.6)' },
          { k: 'KOSPI 대비 (평균)', v: ex === null ? '-' : (ex >= 0 ? '+' : '−') + pp(ex), c: ex === null ? flat : col(ex), s: kospi !== null ? 'KOSPI ' + pct(kospi) : '', sc: 'rgba(247,246,243,0.6)' },
          { k: 'KOSPI 초과', v: beat === null ? '-' : beat + '명', c: '#F7F6F3', s: beat === null ? '' : '참가 ' + on.length + '명 중 ' + Math.round(beat / on.length * 100) + '%', sc: 'rgba(247,246,243,0.6)' },
          { k: '전체 50위 이내', v: in50 + '명', c: '#F7F6F3', s: cut !== null ? '50위 컷 ' + pct(cut) : '', sc: 'rgba(247,246,243,0.6)' },
        ];
      })(),
      hasRfmTeams: teams.length > 0,
      rfmTeams: teams.map((t, i) => ({
        rank: i + 1, name: t.name === '회장단' ? 'Executive' : t.name === '운용팀' ? 'Team AMT' : /^\d+팀$/.test(t.name) ? 'Team ' + parseInt(t.name, 10) : t.name, n: t.live.length + '명' + (t.list.length > t.live.length ? ' · 미집계 ' + (t.list.length - t.live.length) : ''),
        avg: pct(t.a), c: col(t.a), ax: x(t.a), z: x(0),
        best: '팀 내 1위 ' + nm(t.best) + ' ' + pct(ret(t.best)),
        dots: t.live.map((m) => ({ x: x(ret(m)), c: col(ret(m)), t: nm(m) + ' ' + pct(ret(m)) })),
      })),
      rfmNav: [...(teams.length ? [['rfm-team', '팀']] : []), ['rfm-rank', '순위'], ['rfm-me', '내 순위'], ['rfm-dist', '분포'], ['rfm-bm', '벤치마크']].map(([id, t]) => ({ t, on: (e) => { e.preventDefault(); const el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior: 'smooth' }); } })),
      rfmFoot: '학회 내 순위 · 이름 아래 전체 순위 · 장중 15초 갱신',
      rfmMineRows: !me ? [] : [
        { k: '수익률', v: pct(ret(me)), c: col(ret(me)) },
        { k: '전체 순위', v: me.rank ? Number(me.rank).toLocaleString('ko-KR') + '위' + (me.rankChg > 0 ? ' ▲' + me.rankChg : me.rankChg < 0 ? ' ▼' + -me.rankChg : '') : '-', c: '#F7F6F3' },
        mi > 0 ? { k: '위 ' + nm(order[mi - 1]), v: '−' + pp(ret(order[mi - 1]) - ret(me)), c: dn } : { k: '학회 1위', v: '-', c: '#F7F6F3' },
        mi < order.length - 1 ? { k: '아래 ' + nm(order[mi + 1]), v: '+' + pp(ret(me) - ret(order[mi + 1])), c: up } : null,
        kospi !== null ? { k: 'KOSPI 대비', v: (ret(me) >= kospi ? '+' : '−') + pp(ret(me) - kospi), c: col(ret(me) - kospi) } : null,
        cut !== null ? { k: '전체 50위 컷', v: ret(me) >= cut ? '통과' : '−' + pp(cut - ret(me)), c: ret(me) >= cut ? up : dn } : null,
      ].filter(Boolean),
      ...(() => {
        const edges = [-Infinity, -10, -5, 0, 5, 10, 20, Infinity];
        const labs = ['<−10', '−10~−5', '−5~0', '0~5', '5~10', '10~20', '20+'];
        const cnt = labs.map((_, j) => on.filter((m) => ret(m) >= edges[j] && ret(m) < edges[j + 1]).length);
        const mx = Math.max(1, ...cnt);
        const kb = kospi === null ? -1 : edges.findIndex((e, j) => kospi >= e && kospi < edges[j + 1]);
        return {
          rfmDistChart: (() => { const st = mx <= 5 ? 1 : mx <= 10 ? 2 : mx <= 25 ? 5 : 10; const top = Math.ceil(mx / 0.85 / st) * st; const ticks = []; for (let v = 0; v <= top; v += st) ticks.push({ v: String(v), p: (v / top * 100) + '%' }); return { ticks, bars: labs.map((t, j) => ({ t, v: cnt[j] + '명', h: (cnt[j] / top * 100).toFixed(1) + '%', bg: j < 3 ? '#6FA6FF' : '#F2747C', cls: (j === kb ? 'k ' : '') + (cnt[j] ? '' : 'z') })) }; })(),
          rfmDist: labs.map((t, j) => ({ t, n: cnt[j] + '명', h: (cnt[j] ? Math.max(4, cnt[j] / mx * 72) : 1) + '%', bg: j < 3 ? 'linear-gradient(180deg,#A9C6FF,#4A7FD9)' : 'linear-gradient(180deg,#F7A8AE,#D9505B)', cls: j === kb ? 'k' : '' })),
          rfmDistCap: '참가 ' + on.length + '명',
          rfmDistFoot: '설정 이후 수익률 구간(%)별 인원' + (kospi !== null ? ' · KOSPI ' + pct(kospi) : ''),
        };
      })(),
      rfmBmRows: (() => {
        const row = (k, v, cls) => {
          const ex = kospi === null || v === null ? null : v - kospi;
          return { k, v: v === null ? '-' : pct(v), c: v === null ? flat : col(v), ex: ex === null ? '-' : (ex >= 0 ? '+' : '−') + pp(ex), ec: ex === null ? flat : col(ex), eb: ex === null ? 'transparent' : ex >= 0 ? 'rgba(242,98,107,0.12)' : 'rgba(94,155,255,0.12)', cls: 'fd-pr rfm-pr' + (cls ? ' ' + cls : '') };
        };
        const top10 = order.slice(0, 10);
        return [
          a1 ? row('학회 1위', ret(a1)) : null,
          top10.length > 1 ? row('학회 상위 ' + top10.length + '명 평균', top10.reduce((x, m) => x + ret(m), 0) / top10.length) : null,
          row('학회 평균', avg),
          row('학회 중앙값', med),
          me ? row('내 수익률', ret(me), 'me') : null,
          cut !== null ? row('전체 50위 컷', cut) : null,
          row('KOSDAQ', kosdaq),
          { ...row('KOSPI', kospi), ex: '-', ec: flat, eb: 'transparent' },
        ].filter(Boolean);
      })(),
      rfmBeatLine: kospi !== null && on.length ? on.length + '명 중 ' + on.filter((m) => ret(m) > kospi).length + '명이 KOSPI를 앞서고 있습니다.' : '',
      rfmAxis: [kospi !== null ? { x: x(kospi), t: 'KOSPI' } : null, cut !== null ? { x: x(cut), t: '50위' } : null].filter(Boolean),
      rfmZero: x(0), rfmKx: kospi !== null ? x(kospi) : '-10%', rfmCx: cut !== null ? x(cut) : '-10%',
      rfmCount: on.length,
      // 레인은 명단 순서 그대로 두고 위치(translateY)만 바꿔야 순위가 바뀔 때 미끄러지듯 움직인다
      rfmLanes: on.map((m) => {
        const r = ret(m), i = pos[m.nick], d = dayOf(m);
        const pr = prevRet[m.nick];
        const fl = pr === undefined || Math.abs(pr - r) < 1e-9 ? 'none' : (r > pr ? 'rfmFu' : 'rfmFd') + (tick % 2);
        const lo2 = Math.min(0, r), hi2 = Math.max(0, r);
        const above = order[i - 1];
        return {
          idx: i, no: i + 1, cls: 'rfmlane' + (i < 3 ? ' top' : '') + (m.nick === mine ? ' me' : ''),
          label: nm(m), sub: real(m) ? m.nick : '',
          meta: '전체 ' + (m.rank ? Number(m.rank).toLocaleString('ko-KR') + '위' : '-') + (m.rankChg > 0 ? ' ▲' + m.rankChg : m.rankChg < 0 ? ' ▼' + -m.rankChg : '') + ' · ' + (m.count ? m.count + '종목' : '현금'),
          ret: pct(r), retColor: col(r), day: d === null ? '' : 'Today ' + pct(d), dayColor: d === null ? flat : col(d),
          x: x(r), tailL: x(lo2), tailW: 'calc(' + x(hi2) + ' - ' + x(lo2) + ')', dot: col(r), fl, to: r >= 0 ? 'left' : 'right',
          gap: above ? '위와 ' + pp(ret(above) - r) : '', hasGap: !!above,
        };
      }),
      rfmFeed: (s.rfmFeed || []).map((e) => ({ ...e, who: names[key(e.who)] || e.who })),
      hasRfmFeed: (s.rfmFeed || []).length > 0, noRfmFeed: !(s.rfmFeed || []).length,
      hasMine: !!me, noMine: !me,
      rfmMineRank: me ? (mi + 1) + '위' : '', rfmMineOf: '/ ' + order.length,
      rfmMineUp: me && mi > 0 ? nm(order[mi - 1]) + '까지 ' + pp(ret(order[mi - 1]) - ret(me)) : me ? '학회 1위' : '',
      rfmMineDn: me && mi < order.length - 1 ? nm(order[mi + 1]) + '와 ' + pp(ret(me) - ret(order[mi + 1])) + ' 차' : '',
      rfmMine50: me && cut !== null && ret(me) < cut ? '50위까지 ' + pp(cut - ret(me)) : me && me.rank && me.rank <= 50 ? '전체 50위 안' : '',
      rfmMineName: me ? nm(me) : '', rfmMineNick: mine,
      rfmPick: [{ v: '', t: '내 별칭 선택' }].concat([...on].sort((a, b) => nm(a).localeCompare(nm(b), 'ko')).map((m) => ({ v: m.nick, t: nm(m) }))),
      onRfmPick: (e) => { try { localStorage.setItem('rfs_rfm_me', e.target.value); } catch (x) {} this.setState({ rfmPickAt: Date.now() }); },
      rfmMissing: ms.filter((m) => !m.found).map((m) => (real(m) ? real(m) + '(' + m.nick + ')' : m.nick)).join(', '),
      hasRfmMissing: ms.some((m) => !m.found),
      rfmHasNames: Object.keys(names).length > 0, rfmNameOpen: !!s.rfmNameOpen, rfmNameText: s.rfmNameText || '',
      rfmNameCount: Object.keys(names).length ? '이 기기에 ' + Object.keys(names).length + '명 저장됨 · 새로 붙여넣으면 기존 목록에 더해집니다' : '이 기기에 저장된 이름 없음',
      rfmNameToggle: (e) => { e.preventDefault(); this.setState({ rfmNameOpen: !s.rfmNameOpen, rfmNameText: '' }); },
      onRfmNameText: (e) => this.setState({ rfmNameText: e.target.value }),
      rfmNameSave: (e) => {
        e.preventDefault();
        // 기존 목록에 더한다 (같은 별칭은 새 이름으로 바뀜). 추가분만 붙여넣어도 예전 이름이 지워지지 않게
        const map = { ...this.rfmNames() };
        (s.rfmNameText || '').split(/\r?\n/).forEach((l) => { l = l.trim(); const sp = l.match(/^(\S+)\s+(.+)$/); const p = (/[,\t:]/.test(l) ? l.split(/[,\t:]/) : sp ? [sp[1], sp[2]] : []).map((y) => y.trim()); if (p.length > 1 && p[0] && p[1]) map[key(p.slice(1).join(','))] = p[0]; });
        try { localStorage.setItem('rfs_rfm_names', JSON.stringify(map)); } catch (y) {}
        this.setState({ rfmNameOpen: false, rfmNameText: '' });
      },
      rfmNameClear: (e) => { e.preventDefault(); if (!window.confirm('이 기기에 저장된 이름을 모두 지울까요?')) return; try { localStorage.removeItem('rfs_rfm_names'); } catch (y) {} this.setState({ rfmNameOpen: false }); },
    };
  }

  loadAgora() {
    if (!this.sb) return;
    this.sb.from('posts').select('*, comments(count)').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => this.setState({ posts: data || [], agoraLoaded: true }));
    if (!this._mch) {
      this._mch = this.sb.channel('rfs-live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (p) => this.setState((st) => ({ posts: [{ ...p.new, comments: [{ count: 0 }] }, ...st.posts.filter((x) => x.id !== p.new.id)] })))
        .subscribe();
    }
  }

  loadComments(postId) {
    if (!this.sb) return;
    this.sb.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true })
      .then(({ data }) => this.setState((st) => ({ cmts: { ...(st.cmts || {}), [postId]: data || [] } })));
  }

  // AGORA '선배님께 여쭙기': 분야를 하나씩 골라 선배님을 안내하고 첫 문자를 만들어 준다 (assets/ask.js)
  openAsk() {
    if (!window.RFSAsk || !this.state.user || this.state.user.guest) return;
    const ID = this.state.intraData || {};
    window.RFSAsk.open({ alumni: ID.ALUMNI || [], me: this.me(), myPhone: this.state.user.phone || '', myName: this.state.user.name || this.me().name, onSaveMe: (n, c) => this.saveMe(n, c),
      onLogout: () => this.logout(), adminCount: this.state.joinPending, onAdmin: () => this.openJoinAdmin(),
      // 마지막 단계: 내 번호로 선배님 연락처와 문구를 문자로 받는다 (Supabase 함수 agora-sms, 솔라피)
      sendSms: (body) => this.sb.functions.invoke('agora-sms', { body }).then(async ({ error }) => {
        if (!error) return { ok: true };
        if (error.context && error.context.status === 404) return { error: 'not_configured' };   // 함수를 아직 안 올렸을 때
        let j = {}; try { j = await error.context.json(); } catch (x) {}
        return { error: j.error || 'send' };
      }, () => ({ error: 'send' })), intro: true, onClose: () => { this._askShut = true; if (this.state.page === 'intranet') this.go('home'); } });
  }

  me() {
    try { const m = JSON.parse(localStorage.getItem('rfs_me') || 'null'); if (m && m.name) return m; } catch (e) {}
    return this.state.me || { name: '', cohort: '' };
  }

  saveMe(name, cohort) {
    const m = { name: String(name || '').trim(), cohort: String(cohort || '').replace(/\D/g, '') };
    try { localStorage.setItem('rfs_me', JSON.stringify(m)); } catch (e) {}
    this.setState({ me: m, cName: m.name, cCohort: m.cohort });
  }

  who() {
    const m = this.me();
    return m.name ? (m.cohort ? m.cohort + '기 ' : '') + m.name : '이름 미설정';
  }


  setupReveal() {
    this.setupCount();
    if (!this._rvDone) this._rvDone = (e) => { if (e.propertyName === 'opacity') { e.currentTarget.style.willChange = 'auto'; e.currentTarget.removeEventListener('transitionend', this._rvDone); } };
    if (!this._rvIo) this._rvIo = new IntersectionObserver((entries) => {
      entries.filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        .forEach((e, i) => {
          e.target.style.setProperty('--rv-delay', (i * 120) + 'ms');
          e.target.addEventListener('transitionend', this._rvDone);
          e.target.classList.add('is-in');
          this._rvIo.unobserve(e.target);
        });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    requestAnimationFrame(() => {
      if (this._rvIo) document.querySelectorAll('.rv:not(.is-in)').forEach((n) => this._rvIo.observe(n));
    });
  }

  setTitle(page, reportId) {
    if (page === 'report' && window.__rfsFont) window.__rfsFont();   // 글꼴을 아직 안 받았으면 지금 받는다 (받는 동안 본문은 감춰짐)
    const r = REPORTS.find((x) => x.id === reportId);
    const ir = !r && /^ind-/.test(reportId || '') && INDUSTRY.find((x) => 'ind-' + x.id === reportId);
    // 정적 페이지(/research/<id>/ 등)로 들어온 첫 화면은 그 페이지가 정한 검색용 제목을 그대로 둔다 (tools/build-site.js·build-pages.js)
    const tk = page + '|' + (page === 'report' ? reportId : '');
    if (this._titleKey === undefined) this._titleKey = location.pathname !== '/' && document.title ? tk : null;
    if (tk === this._titleKey) return;
    this._titleKey = null;
    document.title = page === 'report' && ir ? ir.name.replace(/\s*산업$/, '') + ' 산업 전망 | 산업분석 리포트 - 중앙대 RFS'
      : page === 'report' && r ? r.name + ' 주가 전망' + (r.tp && r.tp !== '-' ? '·목표주가 ' + r.tp : '') + ' | ' + r.name + '(' + r.ticker + ') 기업분석 리포트 - 중앙대 RFS'
      : page === 'research' ? '기업·산업 리포트 | 중앙대 가치투자학회 R.F.S.'
      : page === 'about' ? '학회 소개 | 중앙대 가치투자학회 R.F.S.'
      : page === 'people' ? '학회원·알럼나이 | 중앙대 가치투자학회 R.F.S.'
      : page === 'activity' ? '활동 | 중앙대 가치투자학회 R.F.S.'
      : page === 'recruit' ? '신입 학회원 모집 | 중앙대 가치투자학회 R.F.S.'
      : page === 'intranet' ? 'Intranet | RFS'
      : page === 'rfm' ? 'RFM 순위 | RFS'
      : page === 'strategy' ? 'Weekly Strategy | AMT Fund | RFS'
      : page === 'fund' ? 'AMT Fund | 중앙대 가치투자학회 R.F.S.'
      : 'R.F.S. 중앙대학교 가치투자학회';
  }

  applyHash() {
    // 검색용 정적 주소(/research/<id>/, /research/, /about/, /recruiting/, /fund/, /people/)로 들어온 경우 해시 없이도 그 화면을 연다
    const r = routeFromLocation();
    let page = r.page, reportId = r.reportId || this.state.reportId;
    if (r.intraTab !== undefined) this.setState({ intraTab: r.intraTab });
    // go()가 방금 해시를 바꾼 경우엔 전환 효과가 이미 진행 중이라 그냥 반영만 한다 (뒤로/앞으로 가기는 전환 효과)
    const update = (done) => this.setState({ page, reportId, menuOpen:false }, () => { if (changed) window.scrollTo(0, 0); this.setTitle(page, reportId); this.setupReveal(); this.observeSentinel(); done && done(); });
    const changed = page !== this.state.page || reportId !== this.state.reportId;
    if (changed && Date.now() - (this._navAt || 0) > 600) this.withTransition(update, page); else update();
  }

  // 화면 전환 효과: 지원 브라우저에서만 View Transitions로 감싸고, 아니면 바로 바꾼다 (동작 줄이기 설정은 CSS에서 페이드만)
  withTransition(update, to) {
    // 모바일 브라우저(특히 iOS Safari)는 전환 중 주소창이 접히고 펴지며 화면 스냅샷이 찌그러져 보여서 PC에서만 쓴다
    if (!document.startViewTransition || window.innerWidth <= 1024) return update();
    // 메뉴끼리 오갈 때는 전환 효과 없이 바로 (홈 ↔ 메뉴만 효과)
    if (to && to !== 'home' && this.state.page !== 'home') return update();
    // 해시 변경·뒤로가기 이벤트가 한 번에 두 번 와도 전환은 한 번만
    if (this._vtBusy) return update();
    this._vtBusy = true;
    const vt = document.startViewTransition(() => new Promise((res) => update(res)));
    vt.finished.finally(() => { this._vtBusy = false; });
  }

  go(page, id) {
    this._navAt = Date.now();
    const nh = page === 'report' ? 'research/' + (id || this.state.reportId) : page === 'strategy' ? 'fund/strategy' : page;
    // 리포트 개별 주소에서 다른 화면으로 갈 때는 주소를 메인(/#...)으로 바꾼다
    if (location.pathname !== '/') history.pushState(null, '', '/#' + nh); else location.hash = nh;
    this.withTransition((done) => this.setState({ page, reportId: id || this.state.reportId, menuOpen:false }, () => { window.scrollTo(0, 0); this.setupReveal(); this.observeSentinel(); done && done(); }), page);
  }

  renderVals() {
    const s = this.state;
    // 리포트 1페이지 원문(tools/extract-page1.py가 만든 파일)은 리포트 화면을 처음 열 때 한 번 받아 온다
    // 펀드 공개분(장 마감 확정치)은 누구나 읽는 public_content에서 받는다
    if (s.page === 'strategy' && !this._wkReq && this.sb) {
      this._wkReq = true; this.loadWeekly();
      // 리포트 양식 오른쪽 칸(기준가·수익률·추이)에 쓰는 펀드 공개분
      if (!this._fundPubReq) this.sb.from('public_content').select('data').eq('id', 'fund').maybeSingle().then(({ data }) => this.setState({ fundPub: (data && data.data) || null }), () => {});
    }
    if (s.page === 'fund' && !this._fundPubReq && this.sb) {
      this._fundPubReq = true;
      this.loadFundLive();
      this.loadWeekly();
      this.sb.from('public_content').select('data').eq('id', 'fund').maybeSingle()
        .then(({ data }) => this.setState({ fundPub: (data && data.data) || null, fundPubLoaded: true }), () => this.setState({ fundPubLoaded: true }));
    }
    if (s.page === 'rfm' && !this._rfmReq && this.sb) {
      this._rfmReq = true;
      this.loadRfm();
      if (!this._rfmTimer) this._rfmTimer = setInterval(() => { if (this.state.page === 'rfm' && !document.hidden) this.loadRfm(); }, 15000);
    }
    if (s.page === 'report' || s.page === 'research') this.loadP1();
    if (s.page === 'research') this.loadTrack();
    const status = this.props.recruitStatus ?? '마감';
    const nextRecruit = this.props.nextRecruit ?? '27-1학기, 2027년 1월';
    const rSem = this.props.recruitSemester ?? '26-2';
    const rCohort = this.props.recruitCohort ?? 43;
    const rDeadline = this.props.recruitDeadline ?? '7월 31일 (금) 23:59';
    const rForm = this.props.recruitFormUrl ?? 'https://forms.gle/[교체]';
    const HERO_LIST = REPORTS.filter((r) => r.heroBg);
    const heroIdx = ((s.heroIdx % HERO_LIST.length) + HERO_LIST.length) % HERO_LIST.length;
    const hero = HERO_LIST[heroIdx] || REPORTS[0];
    // 다음/이전 리포트: 지금 화면이 옆으로 밀려 나가고 새 화면이 반대편에서 들어온다 (네이버 클라우드처럼, 페이드 없음).
    // 잡고 끄는 중이었으면 끈 자리에서 이어서 나간다 (componentDidMount의 끌기)
    const heroStep = (d) => {
      if (HERO_LIST.length < 2 || this._heroBusy) return;
      this._heroBusy = true;
      const L = HERO_LIST.length, to = heroIdx + d, nx = HERO_LIST[((to % L) + L) % L];
      const els = () => [...document.querySelectorAll('section.hero .hero-bgwrap:not(.hero-ghost), section.hero .hero-grid:not(.hero-ghost)')];
      const xOf = (el) => { const m = /translate3d\((-?[\d.]+)px/.exec(el.style.transform); return m ? parseFloat(m[1]) : 0; };   // 끌던 거리
      const tx = (el, x, ms) => { el.style.transition = ms ? `transform ${ms}ms cubic-bezier(.4,0,.2,1)` : 'none'; el.style.transform = x ? `translate3d(${x}px,0,0)` : ''; };
      let done = false, ghosts = [];
      const finish = () => { if (done) return; done = true; ghosts.forEach((g) => g.remove()); els().forEach((el) => tx(el, 0, 0)); requestAnimationFrame(() => els().forEach((el) => { el.style.transition = ''; })); this._heroBusy = false; preloadNear(to); };
      setTimeout(finish, 2600);   // 어떤 경우에도 화면이 옆으로 밀린 채 멈추지 않게
      const sec = els()[0] && els()[0].closest('section');
      if (!sec || matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ heroIdx: to }, finish); return; }
      const W = sec.clientWidth;
      // 들어올 리포트 사진이 받아질 때까지는 끈 자리에 그대로 둔다 (최대 0.7초). 미리 받아 두므로 보통 바로다
      const ready = new Promise((res) => { const im = new Image(); im.src = nx.heroBg; (im.decode ? im.decode() : Promise.resolve()).then(res, res); setTimeout(res, 700); });
      ready.then(() => {
        if (done) return;
        // 지금 화면을 그대로 복사해 두고(나가는 쪽), 원래 화면은 반대편 밖으로 옮긴 뒤 새 리포트로 바꾼다(들어오는 쪽). 둘이 같이 움직여서 중간에 빈 화면이 없다
        const box = sec.getBoundingClientRect();
        ghosts = els().map((el) => {
          const r = el.getBoundingClientRect(), g = el.cloneNode(true);
          g.classList.add('hero-ghost'); g.removeAttribute('id'); g.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
          // image-slot은 복사하면 사진이 비어서, 지금 보이는 사진을 그냥 img로 바꿔 끼운다
          const slots = el.querySelectorAll('image-slot');
          g.querySelectorAll('image-slot').forEach((n, i) => {
            const src = slots[i] && slots[i].shadowRoot && slots[i].shadowRoot.querySelector('img'), im = document.createElement('img');
            im.src = (src && src.currentSrc) || slots[i].getAttribute('src') || '';
            Object.assign(im.style, { width: '100%', height: '100%', display: 'block', objectFit: 'cover', objectPosition: src ? getComputedStyle(src).objectPosition : '50% 50%' });
            n.replaceWith(im);
          });
          Object.assign(g.style, { position: 'absolute', margin: '0', left: (r.left - box.left - xOf(el)) + 'px', top: (r.top - box.top) + 'px', width: r.width + 'px', height: r.height + 'px', pointerEvents: 'none', zIndex: el.classList.contains('hero-grid') ? '1' : '' });
          el.classList.contains('hero-grid') ? sec.appendChild(g) : el.after(g);
          return g;
        });
        const off = xOf(els()[0]);
        els().forEach((el) => tx(el, d * W + off, 0));
        this.setState({ heroIdx: to }, () => {
          void sec.offsetWidth;
          requestAnimationFrame(() => { ghosts.forEach((g) => tx(g, -d * W, 460)); els().forEach((el) => tx(el, 0, 460)); setTimeout(finish, 500); });
        });
      });
    };
    // 앞뒤 리포트의 배경 사진과 표지 1쪽을 미리 받아 둔다 (끌어서 넘길 때 빈 화면이 안 보이게)
    const preloadNear = (i) => [i - 1, i + 1].forEach((k) => {
      const r = HERO_LIST[((k % HERO_LIST.length) + HERO_LIST.length) % HERO_LIST.length];
      [r.heroBg, /-top169\.webp$/.test(r.heroCover || '') ? r.heroCover.replace(/-top169\.webp$/, '-p1.webp') : ''].forEach((u) => { if (u) { const im = new Image(); im.decoding = 'async'; im.src = u; } });
    });
    if (!this._heroNearInit) { this._heroNearInit = true; setTimeout(() => preloadNear(heroIdx), 1200); }
    this._heroStep = heroStep;
    this._heroAdvance = () => heroStep(1);
    const vm = (r) => { const o = opStyle(r.op); return { ...r, opColor:o.c, opAlpha:o.a, href:'/research/' + r.id + '/', open:(e) => { e && e.preventDefault && e.preventDefault(); e && e.stopPropagation && e.stopPropagation(); this.go('report', r.id); } }; };
    const cardVm = (r) => ({ ...vm(r), title: r.name + ' (' + r.ticker + ')', meta: r.sector + ' · ' + r.type, hasCover: !!r.cover, noCover: !r.cover, hasPdf: !!r.pdf, pdfHref: r.pdf });
    const sorted = [...REPORTS].sort((a, b) => {
      const k = s.sortKey, d = s.sortDir;
      const va = k==='upside'?a.upNum : k==='tp'?a.tpNum : a[k];
      const vb = k==='upside'?b.upNum : k==='tp'?b.tpNum : b[k];
      if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * d;
    });
    const byDate = [...REPORTS].sort((a, b) => (a.date < b.date ? 1 : -1));
    const q = s.q.trim().toLowerCase();
    const filtered = sorted.filter((r) =>
      (s.fSector === 'All sectors' || r.sector === s.fSector) &&
      (s.fOp === 'All ratings' || r.op === s.fOp) &&
      (s.fYear === 'All terms' || r.term === s.fYear) &&
      (s.fRegion === 'All regions' || r.region === s.fRegion) &&
      (!q || (r.name + ' ' + r.ticker + ' ' + r.sector + ' ' + r.headline).toLowerCase().includes(q)));
    const PER = 12;
    const pageCount = Math.max(1, Math.ceil(filtered.length / PER));
    const cur = Math.min(s.page1 || 1, pageCount);
    const pageRows = filtered.slice((cur - 1) * PER, cur * PER);
    const pagerItems = (() => {
      const nums = [];
      if (pageCount <= 9) { for (let i = 1; i <= pageCount; i++) nums.push(i); }
      else {
        for (let i = 1; i <= 5; i++) nums.push(i);
        nums.push('…');
        for (let i = pageCount - 3; i <= pageCount; i++) nums.push(i);
      }
      const items = nums.map((n) => typeof n === 'number'
        ? { label: String(n), cls: n === cur ? 'current' : '', gap: false, on: () => this.setState({ page1: n }, () => { const t = document.querySelector('.covtbl'); if (t) window.scrollTo({ top: Math.max(0, t.getBoundingClientRect().top + window.scrollY - 140) }); }) }
        : { label: '…', cls: '', gap: true, on: () => {} });
      if (cur < pageCount) items.push({ label: '다음 ›', cls: '', gap: false, on: () => this.setState({ page1: cur + 1 }, () => { const t = document.querySelector('.covtbl'); if (t) window.scrollTo({ top: Math.max(0, t.getBoundingClientRect().top + window.scrollY - 140) }); }) });
      return items;
    })();
    // 평가 기간 결과 (목록 오른쪽 음영 칸). 주가선은 0~1000 x 0~100 좌표에 그리고 칸 너비에 맞춰 늘린다
    const tkVm = (id) => {
      const T = s.track && s.track.r[id];
      if (!T || !T.p || !T.p.length) return { ok: false, none: !!s.track };
      const p = T.p, run = T.st === 'run' || T.x != null;
      // 세로 범위는 주가에 맞춘다 (목표가가 너무 위면 선이 납작해져서, 가까울 때만 범위에 넣고 아니면 목표가 선은 안 그린다)
      let lo = Math.min(...p, 1000), hi = Math.max(...p, 1000);
      const showT = T.t && T.t <= hi * 1.25;
      if (showT) hi = Math.max(hi, T.t);
      const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
      const W = (run && T.x != null ? T.x : 1000) * 0.98;   // 끝 점이 칸 끝에 잘리지 않게 조금 안쪽까지   // 진행 중이면 12개월 중 지난 만큼만 그린다
      const X = (i) => i / (p.length - 1 || 1) * W;
      const Y = (v) => 10 + (1 - (v - lo) / (hi - lo || 1)) * 80;
      const f1 = (v) => Math.round(v * 10) / 10;
      const pct = (v, u) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v * 100).toFixed(1) + u;
      const cl = (v) => (v > 0 ? 'tk-up' : v < 0 ? 'tk-dn' : '');
      const kst = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
      const left = Math.max(0, Math.round((Date.parse(T.e) - Date.parse(kst)) / 864e5));
      const mo = (d) => (d < 30 ? d + '일' : Math.max(1, Math.round(d / 30.44)) + '개월');
      const ex = T.mx == null ? null : T.mx;   // m은 평가 기간(개월)
      const L = p.length - 1, H = T.hi != null ? T.hi : -1;
      return { ok: true, none: false,
        d: p.map((v, i) => (i ? 'L' : 'M') + f1(X(i)) + ' ' + f1(Y(v))).join(''),
        c: (run ? T.r : (T.mx != null ? T.mx : T.r)) > 0 ? '#D6404E' : '#2F64C2',
        by: f1(Y(1000)), ty: showT ? f1(Y(T.t)) : -10, 
        rx: run ? f1(X(L)) : 1000, rw: run ? f1(1000 - X(L)) : 0,
        lx: f1(X(L)), ly: f1(Y(p[L])),
        hx: H >= 0 ? f1(X(H)) : -50, hy: H >= 0 ? f1(Y(p[H])) : -50,
        chip: T.st === 'hit' ? '목표가 도달 · ' + mo(T.hd) : T.st === 'end' ? '기간 종료' : '진행 중 D-' + left,
        cc: 'tk-chip tk-' + T.st,
        ret: run ? pct(T.r, '%') : '', rc: cl(T.r),   
        ex: ex == null ? '—' : pct(ex, '%'), ec: ex == null ? '' : cl(ex),
        mkt: '최고 수익률' };
    };
    const rowVm = (r) => ({ ...vm(r), tk: tkVm(r.id) });
    const covGroups = (() => {
      const out = [];
      pageRows.forEach((r) => {
        const last = out[out.length - 1];
        if (last && last.date === r.term) last.rows.push(rowVm(r));
        else out.push({ date: r.term, rows: [rowVm(r)] });
      });
      return out.map((g) => ({ ...g, count: g.rows.length + '편' }));
    })();
    const cols = [
      { label:'Company', key:'name', align:'left', cls:'' }, { label:'Sector', key:'sector', align:'left', cls:'col-s' },
      { label:'Rating', key:'op', align:'left', cls:'' }, { label:'Target', key:'tp', align:'right', cls:'col-tp' },
      { label:'Upside', key:'upside', align:'right', cls:'' }, { label:'Term', key:'date', align:'right', cls:'col-t' },
      { label:'Team', key:'team', align:'right', cls:'col-t' }];
    const covCols = cols.map((c) => ({ ...c,
      label: c.label + (s.sortKey === c.key ? (s.sortDir === -1 ? ' ▾' : ' ▴') : ''),
      onSort: () => this.setState(s.sortKey === c.key ? { sortDir: -s.sortDir } : { sortKey: c.key, sortDir: -1 }) }));
    // 산업 리포트(research/ind-<id>)는 기업 리포트 화면을 같이 쓰되, 투자의견·주가 칸 대신 1쪽 그림을 보여 준다
    const indA = /^ind-/.test(s.reportId || '') && INDUSTRY.find((x) => 'ind-' + x.id === s.reportId);
    const active = indA ? { ...hero, id: s.reportId, name: indA.name, ticker: '', sector: indA.sector, date: indA.date, type: 'Industry Analysis', headline: '', pdf: indA.pdf, pdfMeta: 'PDF · ' + indA.pages + ' pages', isInd: true, ind: indA }
      : REPORTS.find((r) => r.id === s.reportId) || hero;
    const ai = byDate.findIndex((r) => r.id === active.id);
    const prevNext = {
      prev: ai > 0 ? vm(byDate[ai - 1]) : null,
      next: ai >= 0 && ai < byDate.length - 1 ? vm(byDate[ai + 1]) : null };
    // 기수는 0기(2006 창립)부터. 명부(ROSTER)에 있는 기수를 최신순으로 전부 보여준다
    const CUR = Math.max(...Object.keys(ROSTER).map(Number));
    const cohortDefs = Object.keys(ROSTER).map(Number).sort((a, b) => b - a).map((n) => n + '기');
    const related = REPORTS.filter((r) => r.sector === active.sector && r.id !== active.id).slice(0, 3).map(vm);
    const isPh = !active.summary;
    const opc = opStyle(active.op);
    // 세 번째 값이 있으면 별도 페이지로 이동하는 링크. RFM은 FUND 안으로 합쳤다 (FUND 첫 화면의 AMT Fund | RFM 전환)
    // 검색엔진이 따라갈 수 있게 정적 페이지가 있는 화면은 실제 주소로 (클릭은 preventDefault 후 SPA 전환)
    const PAGE_PATH = { home: '/', about: '/about/', research: '/research/', fund: '/fund/', people: '/people/', recruit: '/recruiting/' };
    const navDefs = [['ABOUT','about'], ['POLARIS','polaris','/chat/'], ['RESEARCH','research'], ['FUND','fund'], ['PEOPLE','people'], ['RECRUITING','recruit'], ['AGORA','intranet']];
    const navActive = s.page === 'report' ? 'research'
      : s.page === 'activity' ? 'about' : (s.page === 'strategy' || s.page === 'rfm') ? 'fund' : s.page;
    const navItems = navDefs.map(([label, page, url]) => ({
      label, href: url || PAGE_PATH[page] || '#' + page,
      on: url ? () => {} : (e) => { e.preventDefault(); this.preloadHero && this.preloadHero(page); this.go(page); },
      pre: () => { this.preloadHero && this.preloadHero(page); },
      cls: navActive === page ? 'on' : '',
      hideM: false,
      mcolor: navActive === page ? '#203864' : '#1A1A1A' }));
    const recruiting = status === '모집 중';
    const statusText = recruiting
      ? rSem + '학기 ' + rCohort + '기 신입 학회원을 모집합니다. 서류 접수는 ' + rDeadline + '에 마감됩니다.'
      : status === '서류 심사 중'
        ? '서류 심사가 진행 중입니다. 결과는 지원자분들께 개별 안내드립니다.'
        : '현재 모집이 마감되었습니다. 지원해주신 분들께 감사드립니다. 다음 모집은 ' + nextRecruit + '로 예정되어 있습니다.';
    const conn = (arr) => arr.map((label, i) => ({ label, conn: i < arr.length - 1 }));
    const previewAuth = this.props.intranetPreview ?? false;
    const authed = !!s.user || previewAuth;
    const mob = this.props.mobilePreview ? true : s.isMobile;
    const ID = s.intraData || { NOTICES: [], SCHEDULE: [], BOARDS: [], TEAM_BOARDS: [], OFFICERS: [], ALUMNI: [], INDUSTRIES: [], QNA: [], FUND: null };
    const FD = ID.FUND || { asOf:'', nav:0, since:'', ytd:'', bench:'', aum:'', positions:[], notes:[] };
    const dq = (s.dirQ || '').trim().toLowerCase();
    const coh = (a) => (a.cohort === 0 || a.cohort) ? a.cohort : 999;   // 0기도 있다 (기수 없음만 맨 뒤로)
    const dirAll = (ID.ALUMNI || []).slice().sort((a, b) => coh(a) - coh(b) || a.name.localeCompare(b.name, 'ko'));
    const dirHits = dirAll.filter((a) => (s.dirInd === '전체' || (s.dirInd === '미기재' ? !a.industry : a.industry === s.dirInd)) &&(!dq || (a.name + ' ' + a.company + ' ' + a.role).toLowerCase().indexOf(dq) >= 0));
    const indCounts = {}; dirAll.forEach((a) => { indCounts[a.industry] = (indCounts[a.industry] || 0) + 1; });
    const coffeeTarget = s.coffeeFor ? dirAll.find((a) => a.name + a.cohort === s.coffeeFor) : null;
    const tab = s.intraTab || 'dashboard';
    const CATS = ['취업 Q&A', '합격·면접 후기', '채용 공고', '자유'];
    const chip = (on, label, fn) => ({ label, on: (e) => { e.preventDefault(); fn(); }, bg: on ? '#8FAADC' : 'transparent', color: on ? '#111c2e' : 'rgba(247,246,243,0.8)' });
    const pCat = s.pCat || '자유', bCat = s.bCat || '전체';
    const dateOf = (t) => new Date(t).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
    const shown = s.posts.filter((p) => bCat === '전체' || (p.category || '자유') === bCat);
    const setTab = (t) => (e) => { if (e) e.preventDefault(); this.setState({ intraTab: t, intraQ: '' }, () => { location.hash = 'intranet/' + t; this.toContent(); }); };
    const railItem = (key, label) => ({ key, label, href: '#intranet/' + key, on: setTab(key), cls: tab === key ? 'on' : '' });

    const iq = (s.intraQ || '').trim();
    const allNames = [];
    Object.keys(ROSTER).forEach((k) => ROSTER[k].forEach((n) => allNames.push({ name: n, cohort: parseInt(k, 10) + '기' })));
    const alumniHits = iq ? allNames.filter((p) => p.name.indexOf(iq) >= 0).slice(0, 60) : [];
    // ROSTER·COHORTS의 키는 기수 그대로다 (42 = 42기)
    const cohortNums = Object.keys(ROSTER).map((k) => parseInt(k, 10)).sort((a, b) => b - a);
    const intraTitle = tab === 'dashboard' ? 'R.F.S. Network' : tab === 'board' ? '게시판' : tab === 'fund' ? 'RFS 펀드' : tab === 'schedule' ? '이번 학기 일정' : tab === 'ask' ? 'Ask' : tab === 'directory' ? '알럼나이 디렉토리' : 'Intranet';
    return {
      // 리서치 맨 위 그림: 열 때마다 렘브란트와 플라톤의 동굴(산레담) 중 하나
      resHero: 'assets/hero/research' + RES_HERO + '.webp?v=1020', resHeroM: 'assets/hero/research' + RES_HERO + '-m.webp?v=1020',
      // 페이지 상단 고정 탭: data-t와 같은 data-tab 섹션(지금 보이는 것)으로 이동
      tabGo: (e) => {
        e.preventDefault();
        const t = e.currentTarget.getAttribute('data-t');
        const el = [...document.querySelectorAll('[data-tab="' + t + '"]')].find((x) => x.offsetParent);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (el.hasAttribute('data-snap') ? 0 : window.innerWidth <= 860 ? 112 : 130), behavior: 'smooth' });
      },
      isIntranet: s.page === 'intranet', agoraGate: s.page === 'intranet' && !authed, intraLocked: (s.page === 'strategy' && !!s.wkLogin && !(s.user && s.user.email === 'amt@caurfs.kr')), intraOpen: s.page === 'intranet' && authed && !(s.user && s.user.guest), agoraGuest: s.page === 'intranet' && !!(s.user && s.user.guest), rfmOpen: s.page === 'rfm', fundOpen: s.page === 'fund', strategyOpen: s.page === 'strategy' && !(s.wkLogin && !(s.user && s.user.email === 'amt@caurfs.kr')), loginBack: s.page === 'strategy', loginBackGo: (e) => { e.preventDefault(); this.setState({ wkLogin: false, loginErr: '' }); },
      goFund: (e) => { e.preventDefault(); this.go('fund'); }, goRfm: (e) => { e.preventDefault(); this.go('rfm'); },
      loginLabel: s.page === 'rfm' ? 'RFM 순위' : s.page === 'strategy' ? 'Weekly Strategy 글쓰기' : 'Agora',
      loginPw: s.loginPw || '', loginErr: s.loginErr || '', hasLoginErr: !!s.loginErr, loginBusy: !!s.loginBusy,
      onLoginPw: (e) => this.setState({ loginPw: e.target.value }),
      loginId: s.loginId || '', onLoginId: (e) => this.setState({ loginId: e.target.value }),
      intraLogin: (e) => {
        e.preventDefault();
        if (!this.sb) return this.setState({ loginErr: '연결에 실패했습니다. 새로고침 후 다시 시도해 주세요.' });
        this.setState({ loginBusy: true, loginErr: '' });
        this.signIn(s.loginId, s.loginPw)
          .then(({ error, email }) => this.setState({ loginBusy: false, loginErr: error ? (/banned/i.test(error.message || '') || error.code === 'user_banned' ? '승인 대기 중이에요. 승인되면 로그인할 수 있어요.' : '아이디와 비밀번호를 확인해 주세요.') : '', loginPw: error ? s.loginPw : '',
            // 게시판 글쓰기에서 왔으면 로그인 뒤 게시판으로 돌아간다 (운용팀이면 작성 폼을 연다)
            ...(!error && s.page === 'strategy' ? { wkLogin: false, wkWrite: email === 'amt@caurfs.kr', wkErr: email === 'amt@caurfs.kr' ? '' : '학회원으로 로그인했습니다. 글쓰기는 운용팀 계정(amt)으로 로그인해야 합니다.' } : {}) }));
      },
      intraLogout: (e) => { e.preventDefault(); this.logout(); },
      qna: ID.QNA.map((x) => ({ ...x, meta: x.from + ' 질문 · ' + x.date })),
      qnaCount: ID.QNA.length + '건',
      hasQna: ID.QNA.length > 0,
      goFund: (e) => { e.preventDefault(); this.go('fund'); }, goBoard: setTab('board'),
      pCats: CATS.map((c) => chip(pCat === c, c, () => this.setState({ pCat: c }))),
      boardCats: ['전체', ...CATS].map((c) => chip(bCat === c, c, () => this.setState({ bCat: c }))),
      posts: shown.map((p) => {
        const list = (s.cmts || {})[p.id];
        const n = list ? list.length : ((p.comments && p.comments[0] && p.comments[0].count) || 0);
        const open = !!(s.openPost || {})[p.id];
        return {
          ...p, category: p.category || '자유',
          meta: p.author + ' · ' + dateOf(p.created_at),
          open, cLabel: open ? '댓글 접기' : (n ? '댓글 ' + n + '개' : '댓글 달기'),
          cmts: (list || []).map((c) => ({ ...c, meta: c.author + ' · ' + dateOf(c.created_at) })),
          toggle: (e) => { e.preventDefault(); this.setState((st) => ({ openPost: { ...(st.openPost || {}), [p.id]: !open } })); if (!open && !list) this.loadComments(p.id); },
          draft: (s.cDraft || {})[p.id] || '',
          onDraft: (e) => { const v = e.target.value; this.setState((st) => ({ cDraft: { ...(st.cDraft || {}), [p.id]: v } })); },
          submitC: (e) => {
            e.preventDefault();
            const t = ((this.state.cDraft || {})[p.id] || '').trim();
            if (!t || !this.sb || !this.state.user) return;
            if (!this.me().name) return this.setState({ agoraErr: '먼저 위에서 이름과 기수를 저장해 주세요.' });
            const m = this.me();
            this.sb.from('comments').insert({ post_id: p.id, author: this.who(), cohort: m.cohort || '', body: t }).select()
              .then(({ data, error }) => {
                if (error) return this.setState({ agoraErr: '댓글을 올리지 못했습니다. ' + error.message });
                this.setState((st) => ({ cDraft: { ...(st.cDraft || {}), [p.id]: '' }, cmts: { ...(st.cmts || {}), [p.id]: [...((st.cmts || {})[p.id] || []), ...(data || [])] } }));
              });
          },
        };
      }),
      hasPosts: shown.length > 0, noPosts: shown.length === 0,
      postCount: s.posts.length + '건',
      pTitle: s.pTitle, pBody: s.pBody, posting: s.posting,
      onPTitle: (e) => this.setState({ pTitle: e.target.value }),
      onPBody: (e) => this.setState({ pBody: e.target.value }),
      agoraErr: s.agoraErr || '', hasAgoraErr: !!s.agoraErr,
      submitPost: (e) => {
        e.preventDefault();
        if (s.posting) return;
        if (!this.sb || !this.state.user) return this.setState({ agoraErr: '로그인이 필요합니다. 로그인 후 다시 시도해 주세요.' });
        if (!this.me().name) return this.setState({ agoraErr: '먼저 위에서 이름과 기수를 저장해 주세요.' });
        this.setState({ posting: true, agoraErr: '' });
        this.sb.from('posts').insert({ author: this.who(), cohort: this.me().cohort || '', category: pCat, title: s.pTitle.trim(), body: s.pBody.trim() }).select('*, comments(count)')
          .then(({ data, error }) => {
            if (error) return this.setState({ posting: false, agoraErr: '글을 올리지 못했습니다. ' + error.message });
            this.setState((st) => ({ posting: false, pTitle: '', pBody: '', posts: [...(data || []), ...st.posts.filter((p) => !(data || []).some((d) => d.id === p.id))] }));
          });
      },
      dashPostTop: s.posts.slice(0, 3).map((p) => ({ ...p, category: p.category || '자유', meta: p.author + ' · ' + dateOf(p.created_at) })),
      hasDashPosts: s.posts.length > 0,
      fundAsOf: FD.asOf ? FD.asOf + ' 기준' : '', fundNav: FD.nav ? FD.nav.toFixed(2) : '-',
      fundSince: FD.since, fundBench: FD.bench, fundAum: FD.aum,
      fundPos: FD.positions.map((p) => ({ ...p, w: p.weight.toFixed(1) + '%', bar: (p.weight * 2.6).toFixed(0) + 'px', tick: p.ticker || '—', retColor: p.ret ? (p.up ? '#0F5132' : '#842029') : 'rgba(26,26,26,0.4)', retText: p.ret || '—' })),
      fundNotes: FD.notes, hasFundNotes: FD.notes.length > 0,
      ...this.rfmProps(s.rfmData),
      ...this.weeklyProps(),
      ...this.fundProps(authed),
      stopProp: (e) => e.stopPropagation(),
      intraUser: s.user ? this.who() : '미리보기',
      editMe: (e) => { e.preventDefault(); const m = this.me(); try { localStorage.removeItem('rfs_me'); } catch (x) {} this.setState({ me: null, nmName: m.name, nmCohort: m.cohort }); },
      needsName: !!s.user && !this.me().name,
      nmName: s.nmName || '', nmCohort: s.nmCohort || '',
      onNmName: (e) => this.setState({ nmName: e.target.value }),
      onNmCohort: (e) => this.setState({ nmCohort: e.target.value }),
      saveName: (e) => {
        e.preventDefault();
        const nm = (s.nmName || '').trim();
        if (!nm) return;
        this.saveMe(nm, s.nmCohort);
      },
      intraTitle, intraTab: tab,
      isIntraDash: tab === 'dashboard', isIntraFund: tab === 'fund', isIntraBoard: tab === 'board', isIntraSchedule: tab === 'schedule', isIntraDirectory: tab === 'directory',

      intraRailMain: [railItem('dashboard', 'Home'), railItem('directory', '알럼나이 디렉토리'), { key: 'ask', label: '선배님께 여쭙기', href: '#intranet/ask', on: (e) => { e.preventDefault(); this.openAsk(); }, cls: '' }, railItem('board', '게시판'), { key: 'fund', label: 'AMT Fund ↗', href: '#fund', on: (e) => { e.preventDefault(); this.go('fund'); }, cls: '' }, { key: 'rfm', label: 'RFM 순위 ↗', href: '#rfm', on: (e) => { e.preventDefault(); this.go('rfm'); }, cls: '' }],
      dirTotal: dirAll.length + '명', dirIndTotal: new Set(dirAll.map((a) => a.industry).filter(Boolean)).size + '개', dirHitCount: dirHits.length + '명',
      dirQ: s.dirQ, onDirQ: (e) => this.setState({ dirQ: e.target.value }),
      // 아고라 첫 화면 (네트워크형)
      agoraCls: tab === 'dashboard' ? 'ag-dash' : 'ag-sub',
      fundBg: FUND_BG[0],
      agoraBg: s.isMobile ? 'assets/hero/cau-m.webp' : 'assets/hero/cau.webp', agoraBgCredit: '', agoraBgHref: '',
      agAlumniN: String(allNames.length || dirAll.length),
      agDirN: String(dirAll.length),
      // 금융권 비율: 회사가 적힌 알럼나이(현 임원진 제외) 중 대기업·기타가 아닌 업종
      agFinPct: (() => { const w = dirAll.filter((a) => a.company && a.company !== 'R.F.S.' && a.industry); const f = w.filter((a) => a.industry !== '대기업' && a.industry !== '기타'); return w.length ? Math.round(100 * f.length / w.length) + '%' : '–'; })(),
      // 디렉토리: 기수별로 묶은 명부 (기수 제목을 누르면 접고 펼침. 검색·업종 필터 중에는 모두 펼침)
      dirGroups: (() => { const g = []; dirHits.forEach((a) => { const k = coh(a); let x = g[g.length - 1]; if (!x || x.k !== k) { x = { k, rows: [] }; g.push(x); } x.rows.push(a); });
        const closed = s.dirClosed || {}, filtering = !!dq || s.dirInd !== '전체';
        return g.map((x) => { const open = filtering || !closed[x.k]; return { label: x.k < 999 ? x.k + '기' : '기수 미상', count: x.rows.length + '명', open, mark: open ? '−' : '+',
          toggle: (e) => { e.preventDefault(); this.setState({ dirClosed: { ...(this.state.dirClosed || {}), [x.k]: open } }); },
          rows: x.rows.map((a) => ({ name: a.name, line: a.company ? a.company + (a.role ? ' · ' + a.role : '') : '—', industry: a.industry || '', phone: a.phone || '', tel: a.phone ? 'tel:' + a.phone.replace(/\D/g, '') : '#', on: (e) => { e.preventDefault(); const m = this.me(); this.setState({ coffeeFor: a.name + a.cohort, coffeeSent: false, coffeeErr: '', cName: m.name, cCohort: m.cohort }); } })) }; }); })(),
      dirAllOpen: (e) => { e.preventDefault(); this.setState({ dirClosed: {} }); },
      dirAllClose: (e) => { e.preventDefault(); const c = {}; dirHits.forEach((a) => { c[coh(a)] = true; }); this.setState({ dirClosed: c }); },
      agTwoCls: (ID.SCHEDULE || []).length ? 'ag-two' : 'ag-two one',
      hasSchedule: (ID.SCHEDULE || []).length > 0,
      onDirQGo: (e) => { const v = e.target.value; this.setState({ dirQ: v }); if (tab !== 'directory') this.setState({ intraTab: 'directory' }, () => { history.replaceState(null, '', '#intranet/directory'); }); },
      agTiles: [['전체', dirAll.length]].concat(Object.keys(indCounts).filter((k) => k && k !== 'undefined').map((k) => [k, indCounts[k]]).sort((x, y) => y[1] - x[1]).slice(0, 6)).map(([label, count]) => ({ label, count, cls: (label === '전체' ? (tab !== 'directory' || !s.dirInd || s.dirInd === '전체') : (tab === 'directory' && s.dirInd === label)) ? 'on' : '', on: (e) => { e.preventDefault(); this.setState({ dirInd: label, intraTab: 'directory' }, () => { history.replaceState(null, '', '#intranet/directory'); }); } })),
      agAlumni: (() => { const pool = dirAll.filter((a) => a.company); if (!pool.length) return []; const k = Math.floor(Date.now() / 864e5) % pool.length; return pool.slice(k).concat(pool.slice(0, k)).slice(0, 6).map((a) => ({ ...a, ini: (a.name || '?')[0], cohortLabel: coh(a) < 999 ? a.cohort + '기' : '', on: (e) => { e.preventDefault(); const m = this.me(); this.setState({ intraTab: 'directory', coffeeFor: a.name + a.cohort, coffeeSent: false, coffeeErr: '', cName: m.name, cCohort: m.cohort }); } })); })(),
      dirInds: ['전체', ...(ID.INDUSTRIES || []), '미기재'].map((i) => ({ label: i, count: i === '전체' ? dirAll.length : i === '미기재' ? dirAll.filter((a) => !a.industry).length : (indCounts[i] || 0), on: (e) => { e.preventDefault(); this.setState({ dirInd: i }); }, bg: s.dirInd === i ? '#8FAADC' : 'transparent', color: s.dirInd === i ? '#111c2e' : 'rgba(247,246,243,0.8)' })),
      dirHits: dirHits.map((a) => ({ ...a, cohortLabel: coh(a) < 999 ? a.cohort + '기' : '', hasCohort: coh(a) < 999, hasNote: !!a.note, hasInd: !!a.industry, hasCompany: !!a.company, companyLine: a.company + (a.role ? ' · ' + a.role : ''), on: (e) => { e.preventDefault(); const m = this.me(); this.setState({ coffeeFor: a.name + a.cohort, coffeeSent: false, coffeeErr: '', cName: m.name, cCohort: m.cohort }); } })),
      hasDirHits: dirHits.length > 0, noDirHits: dirHits.length === 0,
      coffeeOpen: !!coffeeTarget && !s.coffeeSent, coffeeDone: !!coffeeTarget && s.coffeeSent,
      coffeeName: coffeeTarget ? coffeeTarget.name + ' (' + coffeeTarget.cohort + '기)' : '', coffeeMeta: coffeeTarget ? [coffeeTarget.company, coffeeTarget.role].filter(Boolean).join(' · ') : '',
      coffeeClose: (e) => { if (e) e.preventDefault(); this.setState({ coffeeFor: null, coffeeSent: false, cMsg: '', coffeeErr: '' }); },
      cName: s.cName, cCohort: s.cCohort, cMsg: s.cMsg,
      onCName: (e) => this.setState({ cName: e.target.value }), onCCohort: (e) => this.setState({ cCohort: e.target.value }), onCMsg: (e) => this.setState({ cMsg: e.target.value }),
      cPhone: s.cPhone || '', onCPhone: (e) => this.setState({ cPhone: e.target.value }),
      coffeeErr: s.coffeeErr || '', hasCoffeeErr: !!s.coffeeErr,
      coffeeBtn: s.coffeeBusy ? 'SENDING…' : 'SEND',
      submitCoffee: (e) => {
        e.preventDefault();
        if (s.coffeeBusy || !coffeeTarget) return;
        if (!this.sb || !this.state.user) return this.setState({ coffeeErr: '로그인이 필요합니다.' });
        this.saveMe(s.cName, s.cCohort);
        this.setState({ coffeeBusy: true, coffeeErr: '' });
        const body = { alumniKey: coffeeTarget.cohort + '-' + coffeeTarget.name, fromName: s.cName, fromCohort: String(s.cCohort || '').replace(/\D/g, ''), fromPhone: s.cPhone, message: s.cMsg };
        const MSG = { no_phone: '이 선배님은 연락처가 등록되지 않았어요. 임원진(contact@caurfs.kr)에게 문의해 주세요.', fromPhone: '휴대폰 번호를 010-0000-0000 형식으로 입력해 주세요.', message: '메시지를 1~500자로 입력해 주세요.', fromName: '이름을 20자 이내로 입력해 주세요.', fromCohort: '기수는 숫자로 입력해 주세요.', auth: '로그인이 만료됐어요. 다시 로그인해 주세요.' };
        this.sb.functions.invoke('coffee-chat', { body }).then(async ({ error }) => {
          if (!error) return this.setState({ coffeeBusy: false, coffeeSent: true, cMsg: '' });
          let j = {}; try { j = await error.context.json(); } catch (x) {}
          this.setState({ coffeeBusy: false, coffeeErr: MSG[j.field] || MSG[j.error] || '문자를 보내지 못했어요. 잠시 후 다시 시도해 주세요.' });
        });
      },
      dashDirPreview: dirAll.slice(0, 6).map((a) => ({ ...a, cohortLabel: a.cohort + '기' })),
      goDirectory: setTab('directory'), goSchedule: setTab('schedule'),
      intraNotices: ID.NOTICES.map((n) => ({ ...n, href: n.href || '#intranet/notice' })),
      intraNoticeTop: ID.NOTICES.slice(0, 5).map((n) => ({ ...n, href: n.href || '#intranet/notice' })),
      intraSchedule: ID.SCHEDULE.map((d) => { const dow = /^\d{4}\.\d{2}\.\d{2}$/.test(d.date || '') ? '일월화수목금토'[new Date(d.date.replace(/\./g, '-') + 'T00:00:00').getDay()] : (d.dow || ''); return { ...d, dow, dowLabel: dow ? '(' + dow + ')' : '', meta: [dow, d.where].filter(Boolean).join(' · ') }; }),
      intraScheduleNext: (() => { const t = new Date().toISOString().slice(0,10).replace(/-/g,'.'); const up = ID.SCHEDULE.filter((d) => d.date >= t); return (up.length ? up : ID.SCHEDULE.slice(-4)).slice(0, 4).map((d) => ({ ...d, sub: d.where || d.note ? '· ' + (d.where || d.note) : '' })); })(),
      intraNext: ID.SCHEDULE[0] || { title: '', date: '', where: '', note: '' },

      intraOfficers: ID.OFFICERS,
      intraCohorts: cohortNums.map((n) => ({ label: n + '기', on: (e) => { e.preventDefault(); this.setState({ intraCohort: n }); }, bg: s.intraCohort === n ? '#203864' : 'transparent', color: s.intraCohort === n ? '#F7F6F3' : 'rgba(26,26,26,0.65)' })),
      intraCohortLabel: s.intraCohort + '기', intraCohortCount: (ROSTER[s.intraCohort] || []).length + '명',
      intraCohortNames: (ROSTER[s.intraCohort] || []).map((n) => ({ name: n })),
      intraQ: s.intraQ, onIntraQ: (e) => this.setState({ intraQ: e.target.value }),
      alumniHits, hasAlumniHits: alumniHits.length > 0, noAlumniHits: !!iq && alumniHits.length === 0, alumniHitCount: alumniHits.length + '명',
      alumniTotal: allNames.length + '명',
      cafeUrl: 'https://cafe.naver.com/caurfs',
      mNavItems: navItems.filter((it) => !it.hideM),
      isMobile: mob, isDesktopHome: !mob,
      mHeroDots: HERO_LIST.map((r, i) => ({ on: i === heroIdx ? '#F7F6F3' : 'rgba(247,246,243,0.3)', go: () => heroStep(i - heroIdx) })),
      mTouchStart: (e) => { this._tx = e.touches[0].clientX; this._ty = e.touches[0].clientY; },
      mTouchEnd: (e) => { if (this._tx == null) return; const dx = e.changedTouches[0].clientX - this._tx, dy = e.changedTouches[0].clientY - this._ty; this._tx = null; if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) heroStep(dx < 0 ? 1 : -1); },
      mHeroNameOnly: hero.name, mHeroTicker: hero.ticker,
      mProcess: [
        { n:'01', t:'투자제안서', d:'신입이 작성하는 첫 문서. 우수 종목은 RFS 펀드에 편입' },
        { n:'02', t:'1차 기업보고서', d:'20p · 세미나 발표' },
        { n:'03', t:'2차 기업보고서', d:'20p · SOHKA 학술제 출전' },
        { n:'04', t:'3차 기업보고서', d:'20p · 세미나 발표와 피드백' }],
      netRows: netRows(),
      mNetRows: netRows(['jpmorgan', 'pwc']),
      mAlumniTop: CHART.filter((c) => ['증권사','대기업','은행'].indexOf(c.label) >= 0).sort((a, b) => b.pct - a.pct).map((c) => ({ label: c.label, pct: c.pct + '%', w: Math.round(c.pct / 29 * 100) + '%', color: c.color })),
      isHome: s.page==='home', isResearch: s.page==='research', isReport: s.page==='report', isAbout: s.page==='about', isPeople: s.page==='people', isActivity: s.page==='activity', isRecruit: s.page==='recruit', isIntranet: s.page==='intranet',
      aboutHeroStats: [
        { val:'2006', key:'Founded', k:'설립', s:'중앙대학교 가치투자학회' },
        { val:'43기', key:'Cohort', k:'활동 기수', s:'2026년 2학기' },
        { val:'608명', key:'Alumni', k:'알럼나이', s:'2006년 이후 누적' },
        { val:'250+', key:'Reports', k:'발간 리포트', s:'기업분석 · 해외기업' }],
      researchStats: [
        { val:'250+', key:'Reports since 2006', k:'누적 리포트', s:'2006년 이후' },
        { val:'12편', key:'정규 리포트 · 학기', k:'정규 리포트', s:'학기당' },
        { val:'4편', key:'해외기업 리포트 · 방학', k:'해외기업 리포트', s:'방학당' },
        { val:'20p', key:'보고서 분량', k:'보고서 분량', s:'리포트당' }],
      rhythmYear: [
        { name:'방학', months:'1 – 2월', items:'해외기업 리포트 4편', ink:'#1A1A1A' },
        { name:'1학기', months:'3 – 6월', items:'투자제안서 → 1차 → 2차(SOHKA 출전) → 3차 기업보고서 · 정규 리포트 12편', ink:'#203864' },
        { name:'방학', months:'7 – 8월', items:'해외기업 리포트 4편', ink:'#1A1A1A' },
        { name:'2학기', months:'9 – 12월', items:'투자제안서 → 1차 → 2차(SOHKA 출전) → 3차 기업보고서 · 정규 리포트 12편', ink:'#203864' }],
      cycleSteps: [
        { num:'01', label:'방학 해외기업 리포트', note:'방학 중 해외 기업 4편', bar:'#D0CECE', ink:'#1A1A1A' },
        { num:'02', label:'투자제안서', note:'신입 작성 · 기초 학습 · 우수 종목 포트폴리오 편입', bar:'#203864', ink:'#203864' },
        { num:'03', label:'1차 기업보고서', note:'20p · 세미나 발표', bar:'#203864', ink:'#1A1A1A' },
        { num:'04', label:'2차 기업보고서', note:'20p · SOHKA 학술제 출전', bar:'#203864', ink:'#1A1A1A' },
        { num:'05', label:'3차 기업보고서', note:'20p · 세미나 발표', bar:'#203864', ink:'#1A1A1A' }],
      aboutStats: [
        { target: 0, suffix: '2006', shown: '', key: 'Founded', note: '창립 20년' },
        { target: 43, suffix: '기', shown: s.counted ? '43' : '0', key: 'Cohort', note: '26-2학기 활동 중' },
        { target: 608, suffix: '명', shown: s.counted ? '608' : '0', key: 'Alumni', note: 'COHORTS' },
        { target: 250, suffix: '+', shown: s.counted ? '250' : '0', key: 'Reports', note: '누적 발간 기업 보고서' }],
      goRecruitLink: (e) => { e.preventDefault(); this.go('recruit'); },
      navItems, menuCls: s.menuOpen ? 'open' : '', navCls: (s.navMode === 'dark' ? 'on-dark' : 'on-light') + (s.page === 'home' ? ' nav-home' : ''),
      aboutSecs: [
        { label:'소개', href:'#home-intro', id:'home-intro' },
        { label:'연혁', href:'#about-history', id:'about-history' },
        { label:'네트워크', href:'#home-network', id:'home-network' },
        { label:'동문', href:'#home-alumni', id:'home-alumni' },
        { label:'활동', href:'#home-process', id:'home-process' },
        { label:'커리큘럼', href:'#about-calendar', id:'about-calendar' }
      ].map((a) => ({ ...a, cls: s.activeSec === a.id ? 'active' : '', go: (e) => { e.preventDefault(); const el = document.getElementById(a.id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' }); } })),
      toggleMenu: () => this.setState({ menuOpen: !s.menuOpen }), menuExp: s.menuOpen ? 'true' : 'false',
      goHome: (e) => { e.preventDefault(); this.go('home'); },
      goResearch: (e) => { e.preventDefault(); this.go('research'); },
      goRecruit: () => this.go('recruit'),
      goAbout: (e) => { e.preventDefault(); this.go('about'); },
      goPeoplePage: (e) => { e.preventDefault(); this.go('people'); },
      goPeople: (e) => { e.preventDefault(); this.go('people'); },
      heroMeta: hero.sector + ' · ' + hero.type + ' · ' + hero.date,
      heroName: hero.name + ' (' + hero.ticker + ')', heroHeadline: hero.headline, heroSummary: hero.heroSummary,
      heroOp: hero.op, heroTp: hero.tp, heroUpside: hero.upside, heroOpen: (e) => { e.preventDefault(); this.go('report', hero.id); },
      numbers: [
        { big:'43기', label:'2006년 창립, 43번째 기수가 활동 중',
          desc:'매 학기 신입 학회원을 모집해 20년째 기수가 끊기지 않고 이어져 왔습니다.' },
        { big:'608', label:'0기부터 42기까지 거쳐간 알럼나이',
          desc:'정기 세미나와 직무세미나에 선배님이 직접 방문해 발표를 듣고 피드백을 남깁니다.' },
        { big:'250+', label:'누적 발간 기업 보고서',
          desc:'학기당 정규 리포트 12편과 방학 해외기업 리포트 4편이 쌓인 결과입니다.' }],
      procNotes: [
        { name:'투자제안서', desc:'신입 학회원은 전원 \'투자제안서\'를 작성해야 합니다. \nPre-Seminar를 통해 학습한 지식을 기반으로,    기업 선정부터 PT까지의 과정을 훈련합니다. ' },
        { name:'기업 보고서', desc:'모든 리서치팀은 4번의 Equity Research를 수행합니다. PT를 통해 선배님의 피드백을 받습니다.' },
        { name:'포트폴리오 편입', desc:'우수종목은 Asset Management Team 포트폴리오에 편입되어 학회의 자금으로 운용됩니다.' }],
      cycleNotes: [
        { name:'Stock Pitch · 기업 선정', desc:'산업과 기업에 대한 깊은 이해를 바탕으로 가치 있는 기업을 발굴합니다. ' },
        { name:'재무 분석 & Valuation', desc:'재무분석과 적절한 밸류에이션으로 합리적인 기업가치를 산정합니다.' },
        { name:'논리적 · 분석적 사고', desc:'객관적인 추정과 논리를 기반으로 투자포인트를 구성하여, 모두를 납득시키는 것을 목표로 합니다.' }],
      orgRoles: [
        { name:'회장 · 부회장', desc:'학회 운영과 정기 세미나, 선배님 초청을 담당합니다.' },
        { name:'Research Team', desc:'팀 단위로 기업을 발굴해 Valuation을 거쳐 20p 분량 보고서를 작성하고, 세미나에서 발표해 피드백을 받습니다.' },
        { name:'Asset Management Team', desc:'6인이 섹터를 분담해 매크로 보고서로 시장을 판단하고, 실제 자금으로 RFS 펀드를 운용합니다.' }],
      teamNotes: [
        { name:'Research Team', accent:'#203864', bg:'#F7F6F3', ink:'#0F1B2E', body:'rgba(26,26,26,0.75)', desc:'사이클마다 기업을 발굴해 분석하고 20p 분량 보고서를 작성합니다. 세미나에서 발표하고 선배님 피드백을 받아 다음 보고서에 반영합니다.' },
        { name:'Asset Management Team', accent:'#0F1B2E', bg:'#203864', ink:'#F7F6F3', body:'rgba(247,246,243,0.85)', desc:'매크로 보고서로 시장을 판단하고 투자전략을 수립합니다. 실제 자금으로 RFS 펀드를 운용하며 성과를 운용 보고서로 정리해 공개합니다.' }],
      topCards: byDate.slice(0, 3).map(cardVm),
      homeRows: byDate.slice(0, 8).map(vm),
      covHead: cols,
      goActivity: (e) => { e.preventDefault(); this.go('activity'); },
      recruitEyebrow: rSem + ' · ' + rCohort + '기', recruitCohort: rCohort, formUrl: rForm,
      bandText: recruiting ? RECRUIT.eligibility + '이면 전공·학번·나이 제한 없이 지원할 수 있습니다. 서류 접수는 ' + rDeadline + ' 마감.' : '1년 이상 활동 가능한 중앙인이면 전공·학번·나이 제한 없이 지원할 수 있습니다.',
      bandCta: recruiting ? 'APPLY NOW' : 'GET NOTIFIED',
      bandCtaEn: recruiting ? 'APPLY NOW' : 'GET NOTIFIED',
      fSector: s.fSector, fOp: s.fOp, fYear: s.fYear, fRegion: s.fRegion,
      sectorOpts: ['All sectors', ...new Set(REPORTS.map((r) => r.sector))].map((v) => ({ v, l: v === 'All sectors' ? '전체 섹터' : v })),
      opOpts: ['All ratings','BUY','HOLD','SELL'].map((v) => ({ v, l: v === 'All ratings' ? '전체 의견' : v })),
      yearOpts: ['All terms', ...new Set(REPORTS.map((r) => r.term))].map((v) => ({ v, l: v === 'All terms' ? '전체 학기' : v })),
      regionOpts: ['All regions','Korea','Global'].map((v) => ({ v, l: { 'All regions': '국내·해외', Korea: '국내', Global: '해외' }[v] })),
      onSector: (e) => this.setState({ fSector: e.target.value, page1: 1 }),
      onOp: (e) => this.setState({ fOp: e.target.value, page1: 1 }),
      onYear: (e) => this.setState({ fYear: e.target.value, page1: 1 }),
      onRegion: (e) => this.setState({ fRegion: e.target.value, page1: 1 }),
      covCols, filteredReports: pageRows.map(vm), covCount: filtered.length,
      indGroups: (() => { const by = {}; INDUSTRY.forEach((x) => { (by[x.sem] = by[x.sem] || []).push(x); });
        return Object.keys(by).sort((a, b) => b.localeCompare(a)).map((k) => ({ term: k, rows: by[k].sort((a, b) => (+a.team || 9) - (+b.team || 9)).map((x) => { const web = IND_FULL.includes('ind-' + x.id); return { ...x, teamLine: x.team ? 'Team ' + x.team : '', dateLine: x.date, web, pdfOnly: !web, href: '/research/ind-' + x.id + '/', open: (e) => { e.preventDefault(); this.go('report', 'ind-' + x.id); } }; }) })); })(),
      indCount: INDUSTRY.length,
      covGroups, isGrouped: s.sortKey === 'date', isFlat: s.sortKey !== 'date',
      covEmpty: filtered.length === 0,
      trackOn: !!(s.track && s.track.asOf), trackAsOf: s.track && s.track.asOf ? s.track.asOf.replace(/-/g, '.') : '',
      // 리서치 화면: 최신 학기 카드, 학기 목록, 섹터 칩
      latestTerm: byDate[0].term,
      latestCards: byDate.filter((r) => r.term === byDate[0].term).slice(0, 4).map((r) => ({ ...vm(r), teamShort: String(r.team || '').replace('Research ', '') })),
      termItems: ['All terms', ...new Set(byDate.map((r) => r.term))].slice(0, 13).map((t) => ({
        label: t === 'All terms' ? '전체' : t, count: t === 'All terms' ? REPORTS.length : REPORTS.filter((r) => r.term === t).length,
        color: s.fYear === t ? '#203864' : 'rgba(26,26,26,0.62)', weight: s.fYear === t ? '700' : '400',
        on: (e) => { e.preventDefault(); this.setState({ fYear: t, page1: 1 }); } })),
      sectorChips: ['All sectors', ...Object.entries(REPORTS.reduce((m, r) => (m[r.sector] = (m[r.sector] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 11).map((x) => x[0])].map((c) => ({
        label: c === 'All sectors' ? '전체' : c, bg: s.fSector === c ? '#203864' : '#FFFFFF', color: s.fSector === c ? '#F7F6F3' : '#1A1A1A', border: s.fSector === c ? '#203864' : '#D0CECE',
        on: (e) => { e.preventDefault(); this.setState({ fSector: c, page1: 1 }); } })),
      toCoverage: (e) => { e.preventDefault(); const t = document.getElementById('coverage'); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); },
      pagerItems, showPager: pageCount > 1, pageInfo: (s.page1 || 1) + ' / ' + pageCount,
      q: s.q, onQuery: (e) => this.setState({ q: e.target.value, page1: 1 }),
      gridReports: byDate.filter((r) => !q || (r.name + ' ' + r.ticker + ' ' + r.sector + ' ' + r.headline).toLowerCase().includes(q)).map(cardVm),
      prevReport: prevNext.prev, nextReport: prevNext.next, hasPrev: !!prevNext.prev, hasNext: !!prevNext.next,
      cohortCount: (ROSTER[parseInt(s.cohort, 10)] || []).length + '명',
      cohortNames: (ROSTER[parseInt(s.cohort, 10)] || []).join(' · '),
      cohorts: cohortDefs.map((c) => {
        const n = parseInt(c, 10);
        return { label: c, cls: s.cohort === c ? 'on' : '', count: (COHORTS[n] || 0) + '명',
          color: s.cohort === c ? '#F7F6F3' : '#1A1A1A',
          bg: s.cohort === c ? '#203864' : 'transparent',
          weight: s.cohort === c ? '700' : '400',
          on: (e) => { e.preventDefault(); this.setState({ cohort: c }); } };
      }),
      cohortLabel: s.cohort,
      activityItems: [
        { name:'정규 세션', desc:'매주 팀별 리서치 발표와 질의응답. 종목 선정부터 밸류에이션까지 팀 단위로 진행하고, 세미나에서 현직 알럼나이의 피드백을 받습니다.' },
        { name:'투자제안서', desc:'학기 초 각 팀이 커버할 기업과 투자 논리를 제안합니다. 이 단계에서 논리가 검증되지 않으면 리포트로 넘어가지 않습니다.' },
        { name:'해외기업 리포트', desc:'방학 중 해외 상장 기업을 분석합니다. 연 4편을 발간하며, 국내와 다른 공시 체계와 회계 기준을 다룹니다.' },
        { name:'Asset Management Team 세션', desc:'실제 자금을 기반으로 투자전략을 수립하고 포트폴리오를 구성해 RFS 펀드를 운용합니다. 운용 성과를 분석해 운용 보고서를 작성합니다.' },
        { name:'직무 세미나', desc:'증권사, 은행, IB 현직 선배들이 직무별 커리어와 실무를 강연합니다.' },
        { name:'창립제', desc:'매년 알럼나이와 현역이 함께 모이는 행사. 현직 연사 세션이 함께 열립니다.' }],
      rMeta: active.sector + ' · ' + active.type + ' · ' + active.date,
      rHasP1: !!((s.p1 && s.p1[active.id]) || (active.isInd && s.full && s.full[active.id] && s.full[active.id].p1)), rNoP1: !(s.p1 && s.p1[active.id]),
      rP1: (() => { const gl = this.glSplit(active.id); return ((s.p1 && s.p1[active.id]) || (s.full && s.full[active.id] && s.full[active.id].p1 && s.full[active.id].p1.sections) || []).map((sec, si) => ({ hasH: !!sec.h, h: sec.h || '',
        ps: sec.ps.map((p, pi) => ({ mt: (!sec.h && si === 0 && pi === 0) ? '26px' : (pi === 0 ? '0' : '12px'),
          segs: p.map((g) => ({ t: g.t, w: g.b ? '700' : '300', c: 'inherit', parts: gl(g.t) })) })) })); })(),
      rHasFull: (FULL_REPORTS.includes(active.id) || IND_FULL.includes(active.id)) && (this.loadFull(active.id), true),
      rIsInd: !!active.isInd, rIsCo: !active.isInd,
      rIndTeam: active.isInd ? ('20' + active.ind.sem.replace('-', '년 ') + '학기' + (active.ind.team ? ' · Research Team ' + active.ind.team : '')) : '',
      rIndHead: (active.isInd && s.full && s.full[active.id] && s.full[active.id].p1) ? s.full[active.id].p1.head : '',
      rIndView: ((active.isInd && s.full && s.full[active.id] && s.full[active.id].p1) && s.full[active.id].p1.view) || [],
      rIndViewTop: (((active.isInd && s.full && s.full[active.id] && s.full[active.id].p1) && s.full[active.id].p1.view) || [])[0] || '', rIndViewMain: (((active.isInd && s.full && s.full[active.id] && s.full[active.id].p1) && s.full[active.id].p1.view) || [])[1] || '', rIndViewSub: (((active.isInd && s.full && s.full[active.id] && s.full[active.id].p1) && s.full[active.id].p1.view) || [])[2] || '',
      rIndSide: ((active.isInd && s.full && s.full[active.id] && s.full[active.id].p1) && s.full[active.id].p1.side) ? '/assets/reports/full/' + s.full[active.id].p1.side.src + '?v=' + DATA_VER : '',
      rIndP1Cls: (active.isInd && s.full && s.full[active.id] && s.full[active.id].p1 && s.full[active.id].p1.cover) ? 'is-cov' : '', rIsNoCov: !((active.isInd && s.full && s.full[active.id] && s.full[active.id].p1) && s.full[active.id].p1.cover), rIndCover: !!((active.isInd && s.full && s.full[active.id] && s.full[active.id].p1) && s.full[active.id].p1.cover), rIndCoverTitle: ((active.isInd && s.full && s.full[active.id] && s.full[active.id].p1) && s.full[active.id].p1.cover && s.full[active.id].p1.cover.title) || '', rIndCoverTag: active.isInd ? ('REPORT │ ' + ({ '건강관리': 'BIO', 'IT': 'TECH', '금융': 'FINANCE', '산업재': 'INDUSTRIALS', '에너지 유틸리티': 'ENERGY', '커뮤니케이션': 'MEDIA', '소재': 'MATERIALS', '경기관련 소비재': 'CONSUMER' }[active.sector] || 'INDUSTRY')) : '', rIndCoverDate: active.isInd && active.date ? (() => { const [y, m, d] = active.date.split('.'); return 'DATE ' + (+d) + ' ' + ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][+m - 1] + ' ' + y; })() : '', rIndHasView: !!((active.isInd && s.full && s.full[active.id] && s.full[active.id].p1) && (s.full[active.id].p1.view || []).length),
      rIndHasSide: !!((active.isInd && s.full && s.full[active.id] && s.full[active.id].p1) && s.full[active.id].p1.side),
      rIndPdf: active.isInd ? active.pdf : '',
      rFullShown: !!(s.full && s.full[active.id]),
      rHasToc: this.tocOf(s.full && s.full[active.id]).length > 0,
      // 목차: 누르면 그 제목으로 스크롤 (주소의 해시는 화면 이동에 쓰므로 바꾸지 않는다)
      rToc: this.tocOf(s.full && s.full[active.id]).map((t, i, a) => ({ t: t.t, pg: t.pg == null ? '' : String(t.pg), cls: 'l' + t.lvl + (t.lvl === 0 && i && a[i - 1].lvl > 0 ? ' after' : '') + (t.to == null ? ' nt' : ''), id: t.to == null ? '' : 'rf-' + t.to, href: '/research/' + active.id + '/',
        go: (e) => { e.preventDefault(); const el = t.to != null && document.getElementById('rf-' + t.to); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' }); } })),
      rHasStock: !!(s.full && s.full[active.id] && s.full[active.id].stock && s.full[active.id].stock.rows.length),
      rStock: (() => { const st = s.full && s.full[active.id] && s.full[active.id].stock; if (!st) return [];
        // PDF 1쪽 Stock Data 표 모양 그대로: 이름 | 값(오른쪽), 주요주주는 이름 | 주주 | 지분, 주가상승률은 회색 머리줄 + 값 줄
        return st.rows.map((r, i) => { const nx = st.rows[i + 1] || [], pv = st.rows[i - 1] || [];
          if (r.length >= 4) { const head = !!r[0]; return { cls: head ? 'hd' : 'vals' + (nx.length >= 4 && !nx[0] ? '' : ' last'), cells: [{ t: r[0], cs: 1, cls: '' }, ...r.slice(1, 4).map((t) => ({ t, cs: 1, cls: '' }))] }; }
          if (r.length === 3) return { cls: r[0] && pv.length !== 3 ? 'sep' : '', cells: [{ t: r[0], cs: 1, cls: '' }, { t: r[1], cs: 2, cls: '' }, { t: r[2], cs: 1, cls: 'r' }] };
          return { cls: '', cells: [{ t: r[0], cs: 2, cls: '' }, { t: r.slice(1).join(' '), cs: 2, cls: 'r' }] }; }); })(),
      rHasStockChart: !!(s.full && s.full[active.id] && s.full[active.id].stock && s.full[active.id].stock.chart),
      rStockChart: (() => { const c = s.full && s.full[active.id] && s.full[active.id].stock && s.full[active.id].stock.chart; return c ? '/assets/reports/full/' + c.src + '?v=' + DATA_VER : ''; })(),
      rFull: (() => { const B = s.full && s.full[active.id] && s.full[active.id].blocks; if (!B) return []; let gl = this.glSplit(active.id);
        const segs = (a) => a.map((g) => ({ w: g.b ? '700' : '300', parts: gl(g.t) }));
        const no = { isH: false, isSub: false, isSubm: false, isSub2: false, isText: false, isFig: false, text: '', cls: '', segs: [], figs: [], hasNote: false, note: '', id: '' };
        return B.map((b, i) => b.h ? (gl = this.glSplit(active.id), { ...no, isH: true, text: b.h, id: 'rf-' + i }) : b.sub ? { ...no, isSub: true, text: b.sub, id: 'rf-' + i } : b.subm ? { ...no, isSubm: true, text: b.subm, id: 'rf-' + i } : b.sub2 ? { ...no, isSub2: true, text: b.sub2, id: 'rf-' + i }
          : b.fig ? { ...no, isFig: true, cls: 'rf-figs' + (b.fig.length > 1 ? ' two' : ''), figs: b.fig.map((f) => ({ src: '/assets/reports/full/' + f.src + '?v=' + DATA_VER, w: f.w, h: f.h, dw: Math.round(f.w / 3 * 1.45), no: f.no, cap: f.cap, unit: f.unit, srcT: f.src_t, alt: (f.no + ' ' + f.cap).trim() || '표' })) }
          : { ...no, isText: true, cls: b.lead ? 'rf-lead' : b.li ? 'rf-li' : 'rf-p', segs: segs(b.lead || b.li || b.p), hasNote: !!b.note, note: (b.note || []).join('\n\n') }); })(),
      rHasFund: !!(s.p1 && s.p1._fund && s.p1._fund[active.id]),
      rFund: (() => { const f = s.p1 && s.p1._fund && s.p1._fund[active.id]; return f ? { unit: f.unit, cols: f.cols, rows: f.rows.map((r) => ({ label: r[0], vals: r.slice(1) })) } : { unit: '', cols: [], rows: [] }; })(),
      rDate: active.date, rType: active.type, rSector: active.sector, rNameOnly: active.name, rTicker: active.ticker,
      // PDF 표기의 거래소 접미사(.KS/.KQ/.US)를 붙인다. PDF 티커가 우리 데이터와 다르면 우리 것만
      rTickerFull: (() => { const n = s.p1 && s.p1._names && s.p1._names[active.id]; const m = n && n.match(/\(([^)]*)\)\s*$/); const t = m && m[1].replace(',', '.').trim(); return t && t.split('.')[0] === active.ticker ? t : active.ticker; })(),
      // PDF 표지처럼 '[Investment Point 1] 제목' 형식
      rPointsNote: (active.points || []).map((p, i) => ({ label: '[Investment Point ' + (i + 1) + '] ' + String(p.title || '').replace(/^투자\s?포인트\s*\d+\s*[.:]\s*/, ''), body: p.body })),
      rFactsKo: [
        { label:'투자의견', value:active.op },
        { label:'목표주가', value:active.tp || '-' },
        active.buy ? { label:'매수가', value:active.buy } : (active.cur ? { label:'현재주가(' + String(active.date).slice(5) + ')', value:active.cur } : null),
        { label:'상승여력', value:active.upside || '-' }].filter(Boolean),
      rName: active.name + ' (' + active.ticker + ')', rHeadline: active.headline,
      rSummary: isPh ? '[교체] 요약 3~4문장을 입력하세요.' : active.summary,
      rPoints: active.points, rHasValuation: !!active.valuation, rValuation: active.valuation,
      rIsPlaceholder: isPh, rTeamName: active.team, rTeamMembers: active.members,
      rHasPdf: !!active.pdf, rNoPdf: !active.pdf, rPdfHref: active.pdf,
      rFacts: [
        { label:'Rating', value:active.op, color:opc.c },
        { label:'Target', value:active.tp, color:'#1A1A1A' },
        active.buy ? { label:'Entry', value:active.buy, color:'#1A1A1A' } : (active.cur ? { label:'Current', value:active.cur, color:'#1A1A1A' } : null),
        { label:'Upside', value:active.upside, color:'#203864' }].filter(Boolean),
      rRelated: related, rNoRelated: related.length === 0,
      history: [
        { year:'2006', eyebrow:'Founded', eyebrowColor:'rgba(26,26,26,0.5)', ink:'#1A1A1A', title:'창립', text:'중앙대학교 가치투자학회 R.F.S. 창립' },
        { year:'2016', eyebrow:'10th year', eyebrowColor:'rgba(26,26,26,0.5)', ink:'#1A1A1A', title:'10주년, 창립제 신설', text:'RFS만을 위한 축제,창립제 첫 개최' },
        { year:'2020', eyebrow:'Asset Management', eyebrowColor:'rgba(26,26,26,0.5)', ink:'#1A1A1A', title:'Asset Management Team 신설', text:'RFS 펀드 운용 시작' },
        { year:'2026', eyebrow:'Today', eyebrowColor:'#203864', ink:'#203864', title:'43기 활동 중', text:'알럼나이 608명 · 누적 기업 보고서 250편' }],
      sohka: [
        { name:'KUVIC', school:'고려대학교', color:'rgba(26,26,26,0.65)' },
        { name:'YIG', school:'연세대학교', color:'rgba(26,26,26,0.65)' },
        { name:'SRS', school:'서강대학교', color:'rgba(26,26,26,0.65)' },
        { name:'STOCKWARS', school:'한양대학교', color:'rgba(26,26,26,0.65)' },
        { name:'R.F.S.', school:'중앙대학교', color:'#203864' }],
      programs: [
        { name:'Data Guide', desc:'국내 상장기업 재무 데이터와 컨센서스를 조회합니다.' },
        { name:'Refinitiv Eikon', desc:'해외 기업 분석과 방학 외사 리포트에 활용합니다.' },
        { name:'블룸버그 터미널', desc:'매크로 지표와 시장 데이터를 확인합니다.' }],
      etcActivities: [
        { name:'직무세미나', desc:'애널리스트, IB, PB 등 다양한 직무에 계신 선배님들께서 직접 방문해 직무 소개와 취업 전략을 강연합니다.' },
        { name:'방학 외사 리포트', desc:'방학 기간 기존 기수가 외국 기업을 선정해 투자포인트를 도출하고, Valuation으로 목표 주가를 산출합니다.' },
        { name:'모의투자 대회', desc:'다양한 모의투자 대회에 학회 자격으로 참가해 실제 운용 경험을 학습합니다.' }],
      currentCohort: CUR,
      peopleStats: [
        { val:'608명', key:'Alumni', k:'알럼나이', s:'2006년 이후 누적' },
        { val:'43기', key:'Cohorts', k:'기수', s:'현재 43기 활동' },
        { val:'68%', key:'금융권', k:'금융권 진출', s:'알럼나이 중' },
        { val:'20년', key:'Since 2006', k:'역사', s:'2006년 창립' }],
      roleCards: [
        { name:'회장 · 부회장', desc:'학회 운영과 정기 세미나, 선배님 초청을 담당합니다.', bg:'#FFFFFF', border:'#D0CECE', top:'#1A1A1A', ink:'#0F1B2E', body:'rgba(26,26,26,0.75)' },
        { name:'Research Team', desc:'팀 단위로 기업을 발굴해 Valuation을 거쳐 20p 분량 보고서를 작성하고, 세미나에서 발표해 피드백을 받습니다.', bg:'#FFFFFF', border:'#D0CECE', top:'#203864', ink:'#0F1B2E', body:'rgba(26,26,26,0.75)' },
        { name:'Asset Management Team', desc:'매크로 보고서로 시장을 판단하고 투자전략을 수립합니다. 실제 자금으로 RFS 펀드를 운용하며 운용 보고서를 작성합니다.', bg:'#203864', border:'#203864', top:'#0F1B2E', ink:'#F7F6F3', body:'rgba(247,246,243,0.85)' }],
      employers: '[교체] 알럼나이가 재직 중인 기업명을 나열하세요. 개인 이름과 기수는 넣지 않습니다.',
      recruitStats: [
        { val: RECRUIT.schedule[1].date, key:'서류 접수', k:'서류 접수', s:'' },
        { val: RECRUIT.schedule[3].date, key:'면접', k:'면접', s:'' },
        { val:'1년 이상', key:'활동 기간', k:'활동 기간', s:'' },
        { val:'제한 없음', key:'전공 · 학번 · 나이', k:'지원 자격', s:'전공 · 학번 · 나이' }],
      scheduleSteps: RECRUIT.schedule.map((d, i) => ({ ...d, num: String(i + 1).padStart(2, '0'), bar: i === 0 ? '#1A1A1A' : '#203864', ink: d.key ? '#203864' : '#1A1A1A' })),
      eligibilityText: '자격 요건은 ' + RECRUIT.eligibility + '. 전공, 학번, 나이 제한은 없습니다.',
      commitCards: [
        { kind:'Seminar', label:'정기 세미나', desc:'학기 중 3회 진행합니다. 선배님을 초청해 발표하고 피드백을 받습니다.', bg:'#FFFFFF', border:'#D0CECE', top:'#1A1A1A', eyebrow:'rgba(26,26,26,0.5)', ink:'#0F1B2E', body:'rgba(26,26,26,0.75)' },
        { kind:'Weekly', label:'팀별 모임', desc:'매주 팀별 모임 및 세미나를 진행합니다.', bg:'#FFFFFF', border:'#D0CECE', top:'#1A1A1A', eyebrow:'rgba(26,26,26,0.5)', ink:'#0F1B2E', body:'rgba(26,26,26,0.75)' },
        { kind:'Team', label:'Research Team', desc:'기업 분석 보고서를 작성합니다. 투자제안서 1개와 기업 보고서 3개를 씁니다.', bg:'#F7F6F3', border:'#D0CECE', top:'#203864', eyebrow:'#203864', ink:'#0F1B2E', body:'rgba(26,26,26,0.75)' },
        { kind:'Team', label:'Asset Management Team', desc:'포트폴리오를 구성하고 자금을 운용합니다. 매크로 보고서와 운용 보고서를 작성합니다.', bg:'#203864', border:'#203864', top:'#0F1B2E', eyebrow:'rgba(247,246,243,0.7)', ink:'#F7F6F3', body:'rgba(247,246,243,0.85)' }],
      schedule: [
        { step:'설명회', when:'7월 27일 (월) 18:30 · 310관 502호' },
        { step:'서류 접수', when:'7월 13일 (월) ~ 7월 31일 (금) 23:59' },
        { step:'서류 발표', when:'8월 2일 (일)' },
        { step:'면접', when:'8월 8일 (토)' },
        { step:'최종 발표', when:'8월 9일 (일) 정오' }],
      donutSegs: ring(SEGS, 86),
      slices: slices(s.hoverSlice, (i) => this.setState({ hoverSlice: i }), s.drawn),
      sliceLeave: () => this.setState({ hoverSlice: null }),
      drawnCls: s.drawn ? 'drawn' : '',
      donutArcs: arcs(SEGS.map((x) => ({ ...x, color: x.dark })), 360, 180, {
        r: (x) => (FIN.indexOf(x.label) >= 0 ? 124 : 132),
        w: (x) => (FIN.indexOf(x.label) >= 0 ? 44 : 26),
        labelR: 172 }),
      donutGroups: ring([{ label:'금융권', pct:55.9, color:'#203864' }, { label:'비금융권', pct:43, color:'#A8A6A0' }], 60),
      donutGroupsDark: ring([{ label:'금융권', pct:55.9, color:'#9FB8DE' }, { label:'비금융권', pct:43, color:'#807D76' }], 60),
      donutDark: ring(SEGS.map((x) => ({ ...x, color: x.dark })), 86),
      anchorVis: s.pastHero ? 'is-vis' : '',
      latestName: byDate[0].name + ' (' + byDate[0].ticker + ')', latestMeta: byDate[0].sector + ' · ' + byDate[0].type + ' · ' + byDate[0].date,
      latestHeadline: byDate[0].headline, latestSummary: byDate[0].heroSummary || byDate[0].summary,
      latestOp: byDate[0].op, latestTp: byDate[0].tp, latestUpside: byDate[0].upside,
      latestCover: byDate[0].cover || '', latestHref: '#research/' + byDate[0].id,
      latestOpen: (e) => { e.preventDefault(); this.go('report', byDate[0].id); },
      heroBgSafe: hero.heroBg || 'assets/torm-fleet.webp',
      heroBg: hero.heroBg || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=72',
      heroScrim: hero.heroScrim || 0.58,
      heroPosM: hero.heroPosM || '50% 50%',
      heroBgCredit: hero.heroBg ? '' : 'Photo by Maxim Hopman on Unsplash',
      heroBgCreditHref: hero.heroBg ? '' : 'https://unsplash.com/@nampoh',
      heroCover: hero.heroCover || hero.cover || '',
      heroPage: /-top169\.webp$/.test(hero.heroCover || '') ? hero.heroCover.replace(/-top169\.webp$/, '-p1.webp') : (hero.heroCover || ''),   // 표지 1쪽 전체 (assets/covers/*-p1.webp), 휠로 내려 읽는다
      heroCaption: hero.name + ' (' + hero.ticker + ') · ' + hero.date,
      heroHref: '#research/' + hero.id,
      heroCounter: String(heroIdx + 1).padStart(2, '0') + ' / ' + String(HERO_LIST.length).padStart(2, '0'),
      heroCompany: hero.name, heroDate: hero.date, heroCur: String(heroIdx + 1).padStart(2, '0'), heroTot: String(HERO_LIST.length).padStart(2, '0'),
      heroRing: s.heroFade ? '' : (heroIdx % 2 ? 'rb' : 'ra'),   // 애니메이션 이름을 번갈아 써야 리포트가 바뀔 때마다 처음부터 다시 돈다
      heroDown: (e) => { e.preventDefault(); const el = document.getElementById('home-sky'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' }); },
      heroFadeCls: s.heroFade ? 'fading' : '',
      ...(() => {   // 홈 히어로 아래 슬라이드 (블랙스톤형): 사진을 흐리게 깔고 가운데 카드, 아래 제목·설명
        const B = [
          { kind:'shots', img:'assets/covers/26-2_sanil-p1.webp', shots:[['sanil','산일전기'],['koreanair26','대한항공'],['inbody','인바디'],['nepesark','네패스아크']].map(([id,name]) => ({ id, name, src:'assets/covers/26-2_' + ({ sanil:'sanil', koreanair26:'korean_air', inbody:'inbody', nepesark:'nepes_ark' })[id] + '-p1.webp' })), title:'리포트 발간', desc:'26-2학기 1차 세미나 기업분석 리포트 4편이 발간되었습니다.', page:'research' },
          { kind:'card', img:'assets/hero/sky.webp', title:'Claude 제휴', desc:'Claude 비영리 단체 제휴로 R.F.S. 학회원은 누구나 Claude Pro·Max를 60% 할인된 가격으로 이용할 수 있습니다.', page:'recruit' },
          { kind:'butler', img:'', title:'Butler 제휴', desc:'기업분석 플랫폼 Butler의 유료 플랜을 학회원 전원에게 제공합니다. 증권사 리포트 요약, 실적·공시, 사업부문, 재무 그래프를 한곳에서 봅니다.', page:'recruit' },
          { kind:'chat', img:'assets/hero/polaris.webp?v=2', title:'POLARIS', desc:'학회 리포트를 찾아 출처와 함께 답해 주는 R.F.S.의 리서치 챗봇입니다. 궁금한 기업을 물어보세요.', href:'/chat/' }];
        const L = B.length, i = ((s.bxIdx % L) + L) % L, b = B[i];
        const to = (n) => this.setState({ bxIdx: ((n % L) + L) % L });
        return { bxImg: b.img, bxWord: b.word || '', bxTag: b.tag || '', bxTitle: b.title, bxDesc: b.desc, bxHref: b.href || (b.page ? ({ home: '/', about: '/about/', research: '/research/', fund: '/fund/', people: '/people/', recruit: '/recruiting/' }[b.page] || '#' + b.page) : '#'),
          bxKind: b.kind, bxIsCard: b.kind === 'card', bxIsWord: b.kind === 'word', bxIsShots: b.kind === 'shots', bxIsButler: b.kind === 'butler', bxIsChat: b.kind === 'chat', bxShots: (b.shots || []).map((x) => ({ ...x, go: (e) => { e.preventDefault(); e.stopPropagation(); if (this._bxSwiped) { this._bxSwiped = false; return; } this.go('report', x.id); } })),
          bxGo: (e) => { e.preventDefault(); if (this._bxSwiped) { this._bxSwiped = false; return; } if (b.href) { window.location.href = b.href; return; } if (b.page) this.go(b.page); },
          bxTs: (e) => { this._bxX = e.touches[0].clientX; this._bxSwiped = false; },
          bxTe: (e) => { const dx = e.changedTouches[0].clientX - (this._bxX || 0); if (Math.abs(dx) > 40) { this._bxSwiped = true; to(i + (dx < 0 ? 1 : -1)); } },
          bxAnim: i % 2 ? 'bxb' : 'bxa', bxPrev: () => to(i - 1), bxNext: () => to(i + 1),
          bxDots: B.map((x, k) => ({ cls: k === i ? 'on' : '', label: x.title || '소식 ' + (k + 1), go: () => to(k) })) };
      })(),
      heroPrev: () => heroStep(-1),
      heroNext: () => heroStep(1),
      heroTicker: (() => { const live = REPORTS.filter((r) => r.heroBg).map((r) => ({ ticker: r.region === 'Korea' ? r.name : r.ticker, op: r.op, upside: r.upside })); const out = []; while (out.length < 12) live.forEach((x) => out.push(x)); return out; })(),
      people: [
        { id:'chair', photo:'assets/officers/president.webp', name:'김민석', role:'President', desc:'회장' },
        { id:'vice', photo:'assets/officers/vice.webp', name:'이승혁', role:'Vice President', desc:'부회장' },
        { id:'t1', photo:'assets/officers/team1.webp', name:'김세정', role:'Research Team 1', desc:'1팀장' },
        { id:'t2', photo:'assets/officers/team2.webp', name:'김우주', role:'Research Team 2', desc:'2팀장' },
        { id:'t3', photo:'assets/officers/team3.webp', name:'이동헌', role:'Research Team 3', desc:'3팀장' },
        { id:'t4', photo:'assets/officers/team4.webp', name:'이원석', role:'Research Team 4', desc:'4팀장' },
        { id:'am', photo:'assets/officers/am.webp', name:'박정훈', role:'Asset Management', desc:'운용팀장' }],
      peopleLead: [{ id:'chair', photo:'assets/officers/president.webp', name:'김민석', role:'President', desc:'회장' }, { id:'vice', photo:'assets/officers/vice.webp', name:'이승혁', role:'Vice President', desc:'부회장' }],
      peopleRT: [
        { id:'t1', photo:'assets/officers/team1.webp', name:'김세정', role:'Research Team 1', desc:'1팀장' },
        { id:'t2', photo:'assets/officers/team2.webp', name:'김우주', role:'Research Team 2', desc:'2팀장' },
        { id:'t3', photo:'assets/officers/team3.webp', name:'이동헌', role:'Research Team 3', desc:'3팀장' },
        { id:'t4', photo:'assets/officers/team4.webp', name:'이원석', role:'Research Team 4', desc:'4팀장' }],
      peopleAM: [{ id:'am', photo:'assets/officers/am.webp', name:'박정훈', role:'Asset Management', desc:'운용팀장' }],
      teams: [
        { name:'Research Team', desc:'팀 단위로 기업을 선정하고 Valuation을 거쳐 20p 분량 보고서를 작성합니다. 선배님과 함께하는 세미나에서 발표하고 피드백을 받습니다.' },
        { name:'Asset Management Team', desc:'실제 자금을 기반으로 투자전략을 수립하고 포트폴리오를 구성해 RFS 펀드를 운용합니다. 운용 성과를 분석해 운용 보고서를 작성하고 매크로 보고서를 씁니다.' },
        { name:'임원진', desc:'회장과 부회장이 학회 운영과 세미나, 선배님 초청을 담당합니다.' }],
      statusText, isRecruiting: recruiting, notRecruiting: !recruiting,
      scrollToNotify: () => { const el = document.getElementById('notify-form'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); },
      yearCycle: conn(['방학 해외기업 리포트','투자제안서','1차 정규','2차 정규','3차 정규']),
      commitments: [
        { label:'정기 세미나', desc:'학기 중 3회 진행합니다. 선배님을 초청해 발표하고 피드백을 받습니다.' },
        { label:'팀별 모임', desc:'매주 팀별 모임 및 세미나를 진행합니다.' },
        { label:'Research Team', desc:'기업 분석 보고서를 작성합니다. 투자제안서 1개와 기업 보고서 3개를 씁니다.' },
        { label:'Asset Management Team', desc:'포트폴리오를 구성하고 자금을 운용합니다. 매크로 보고서와 운용 보고서를 작성합니다.' }],
      faqs: [
        { q:'금융·재무 지식과 자격증이 필수인가요?', a:'관련 지식과 자격증이 없더라도 학회 활동에 무리가 없습니다. 신입 회원들을 위한 3차례의 기초 세미나가 진행되며, 학회원들과 함께 배우고 성장하려는 열정이 중요합니다.' },
        { q:'전공·학번·나이에 제한이 있나요?', a:'전공, 학번, 나이에 제한은 없으며 선발 과정의 차이도 없습니다. 이공계, 인문계 등 다양한 전공과 학번이 함께 활동하고 있으며, 다양한 학회원의 창의적 생각을 공유하는 것을 지향합니다.' },
        { q:'개인 투자경험이 필요한가요?', a:'개인 투자경험이 필수적으로 요구되지 않습니다. 개인 투자와 학회 활동이 높은 관련성을 가지는 것은 맞으나, 투자 경험의 유무보다는 학회에 대한 열정이 더욱 중요합니다.' },
        { q:'휴학생도 가입이 가능한가요?', a:'휴학생, 졸업유예생 분들도 가입이 가능합니다. 1년 이상 활동이 가능하다면 지원이 가능합니다. 다만 졸업생, 대학원생은 지원이 불가하다는 점 참고 부탁드립니다.' },
        { q:'인턴, 대외활동과 병행이 가능한가요?', a:'인턴, 대외활동과 병행이 충분히 가능합니다. 진행하시는 인턴과 대외활동의 업무량에 따라 다르겠지만, 많은 학회원들이 인턴과 병행하며 학회 활동을 하고 있습니다.' }
      ].map((f, i) => ({ ...f, mark: s.faqOpen === i ? '·' : '+', cls: s.faqOpen === i ? 'open' : '', toggle: () => this.setState({ faqOpen: s.faqOpen === i ? -1 : i }) })),
      closedNote: '43기 신입 모집은 마감되었습니다.',
      nextNote: '다음 모집은 ' + nextRecruit + '로 예정되어 있습니다. 모집이 열리면 이메일로 알려드립니다.',
      email: s.email, onEmail: (e) => this.setState({ email: e.target.value }),
      notified: s.notified, notNotified: !s.notified,
      // 모집 알림 신청: Supabase recruit_notify 표에 저장(누구나 넣기만 가능, 읽기는 운영진만)하고 GA 전환(generate_lead)으로 잡는다
      submitNotify: () => {
        const em = (s.email || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { window.alert('이메일 주소를 확인해 주세요'); return; }
        const done = () => { this.setState({ notified: true }); try { window.gtag && window.gtag('event', 'generate_lead', { method: 'recruit_notify' }); } catch (e) {} };
        if (!this.sb) return done();
        this.sb.from('recruit_notify').insert({ email: em, semester: this.props.nextRecruit ?? '' }).then(({ error }) => { if (error && error.code !== '23505') window.alert('신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요'); else done(); });
      },
    };
  }
}
  }.toString();
  el.textContent = src.slice(src.indexOf('{') + 1, src.lastIndexOf('}'));
})();
