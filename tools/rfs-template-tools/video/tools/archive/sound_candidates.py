# 인트로 소리 후보 — 같은 인트로 영상(0~14초)에 서로 다른 소리를 입혀 비교용 파일을 만든다
import io, json, copy, subprocess, os

base = json.load(io.open('tools/events.json', encoding='utf-8'))
END = 14.0
common = [
    {"t": 8.75, "type": "click", "gain": 0.8}, {"t": 9.55, "type": "click", "gain": 0.8},
    {"t": 10.35, "type": "click", "gain": 0.8}, {"t": 11.2, "type": "click", "gain": 0.8},
    {"t": 8.8, "type": "whoosh", "gain": 0.35}, {"t": 11.6, "type": "whoosh_out", "gain": 0.35},
    {"t": 12.1, "type": "cam", "dur": 0.9, "gain": 0.5}, {"t": 13.0, "type": "whoosh", "gain": 0.55},
    {"t": 0.0, "type": "bed", "gain": 0.11, "dur": END},
]
def e(t, typ, **k): d = {"t": t, "type": typ}; d.update(k); return d

C = {}
C['A_지금(샤라랑_절반)'] = [x for x in base['events'] if x['t'] < 12.5 and x['type'] != 'bed']
C['B_펠트피아노'] = common + [
    e(0.1, "riser", dur=2.0, gain=0.35),
    e(2.1, "felt", notes=[50, 57, 62, 66], spread=0.035, gain=0.75),     # 제목 — D 코드 한 번
    e(3.3, "felt", notes=[69], gain=0.3),                                # 크레딧 — 한 음
    e(5.2, "cam", dur=1.3, gain=0.45),
    e(6.3, "cam", dur=0.9, gain=0.35),
] + [e(6.4 + i * 0.15, "tick", gain=0.5, pan=round(-0.4 + i * 0.27, 2)) for i in range(4)]
C['C_기계식틱'] = common + [
    e(0.9, "swell", dur=1.2, gain=0.6),
    e(2.1, "tick", gain=0.9), e(2.1, "softclick", gain=0.5),               # 제목
    e(3.2, "tick", gain=0.5), e(3.32, "tick", gain=0.4), e(3.44, "tick", gain=0.35),
    e(5.2, "cam", dur=1.3, gain=0.45),
] + [e(6.3 + i * 0.075, "tick", gain=0.45, pan=round(-0.6 + i * 0.17, 2)) for i in range(8)] \
  + [e(7.3 + i * 0.15, "tick", gain=0.3, pan=round(-0.5 + i * 0.2, 2)) for i in range(6)]
C['D_스웰_착지'] = common + [
    e(0.4, "swell", dur=1.7, gain=0.7),
    e(2.1, "impact", gain=0.4), e(2.1, "felt", notes=[62], gain=0.3),     # 제목 — 부드러운 착지
    e(5.2, "cam", dur=1.3, gain=0.5),
    e(6.3, "whoosh", gain=0.3),
    e(7.0, "swell", dur=0.6, gain=0.4),
]
C['E_앰비언트만'] = common + [
    e(0.0, "bed", gain=0.12, dur=END),
    e(0.1, "riser", dur=2.4, gain=0.3),
    e(5.2, "cam", dur=1.3, gain=0.4),
    e(6.3, "cam", dur=0.9, gain=0.3),
]

out_dir = 'sound_candidates_out'
os.makedirs(out_dir, exist_ok=True)
os.makedirs('renders/cand', exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-t', str(END), '-i', 'renders/final7.mp4', '-an', '-c:v', 'libx264', '-crf', '16',
                '-preset', 'veryfast', 'renders/cand/intro_video.mp4'], check=True)
for name, evs in C.items():
    j = 'renders/cand/%s.json' % name; w = 'renders/cand/%s.wav' % name
    json.dump({"duration": END, "seed": base.get("seed", 1), "events": evs}, io.open(j, 'w', encoding='utf-8'), ensure_ascii=False)
    subprocess.run(['python', 'tools/sfx.py', j, w], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'renders/cand/intro_video.mp4', '-i', w, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
                    '-shortest', os.path.join(out_dir, name + '.mp4')], check=True)
    print('ok', name)
