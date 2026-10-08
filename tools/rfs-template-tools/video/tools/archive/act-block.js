        // ── 막마다 리본을 짚는 헬퍼 ──
        const NS = "http://www.w3.org/2000/svg";
        const conn = one("#conn");
        const RIBBON_SHIFT = -40;
        const PX = 140, PY = 768, PS = 1.55;
        const zoomBtn = {};

        const G = function (name) { return root.querySelector('[data-group="' + name + '"]'); };
        const B = function (label) { return zoomBtn[label] || root.querySelector('[data-btn="' + label + '"]'); };

        function layoutBox(el, stopAt) {
          let x = 0, y = 0, n = el;
          while (n && n !== stopAt) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
          return { x: x, y: y, w: el.offsetWidth, h: el.offsetHeight };
        }
        function btnBox(el) {
          const panel = el.closest(".zpanel");
          if (panel) {
            const r = layoutBox(el, panel);
            return { x: PX + r.x * PS, y: PY + r.y * PS, w: r.w * PS, h: r.h * PS };
          }
          const cell = el.closest(".group");
          const gm = cell ? GEOM[cell.dataset.group] : null;
          const r = layoutBox(el, cell);
          if (gm) return { x: gm.x + r.x, y: gm.y + r.y + RIBBON_SHIFT, w: r.w, h: r.h };
          const a = layoutBox(el, null);
          return { x: a.x, y: a.y + RIBBON_SHIFT, w: a.w, h: a.h };
        }

        function focusOn(names, t) {
          names.forEach(function (n) {
            const g = G(n);
            tl.to(g, { backgroundColor: "#2a4677", duration: 0.45, ease: "power2.out" }, t);
            tl.fromTo(g.querySelector(".focusbar"), { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: "power2.out", immediateRender: false }, t);
            tl.to(g.querySelector(".g-label"), { color: "#f7f6f3", duration: 0.45, ease: "power2.out" }, t);
          });
        }
        function focusOff(names, t) {
          names.forEach(function (n) {
            const g = G(n);
            tl.to(g, { backgroundColor: "#203864", duration: 0.4, ease: "power2.inOut" }, t);
            tl.to(g.querySelector(".focusbar"), { scaleX: 0, duration: 0.4, ease: "power2.inOut" }, t);
            tl.to(g.querySelector(".g-label"), { color: "#8faadc", duration: 0.4, ease: "power2.inOut" }, t);
          });
        }

        // 그룹을 돋보기로 뽑아온다 — 원본이 한 번 번쩍한 뒤 들려 올라온다
        function zoomGroup(name, tIn, tOut) {
          const g = G(name);
          const gm = GEOM[name];
          const panel = document.createElement("div");
          panel.className = "zpanel";
          const glow = document.createElement("div");
          glow.className = "zglow";
          const clone = g.cloneNode(true);
          clone.style.width = gm.w.toFixed(2) + "px";
          clone.style.height = "auto";
          clone.style.paddingBottom = "10px";
          clone.style.flex = "none";
          clone.style.boxSizing = "border-box";
          clone.style.transform = "none";
          clone.style.opacity = "1";
          clone.style.backgroundColor = "#2a4677";
          clone.querySelectorAll(".gbody, .g-label").forEach(function (el) { el.style.transform = "none"; el.style.opacity = "1"; });
          const cl = clone.querySelector(".g-label"); if (cl) cl.style.color = "#f7f6f3";
          const fb = clone.querySelector(".focusbar"); if (fb) fb.style.transform = "scaleX(1)";
          clone.querySelectorAll("[data-btn]").forEach(function (el) {
            el.style.transform = "none"; el.style.backgroundColor = "rgba(27,63,122,0)";
            const sp = el.querySelector("span"); if (sp) sp.style.color = "rgba(247,246,243,0.95)";
          });
          clone.querySelectorAll(".ring").forEach(function (el) { el.style.transform = "none"; el.style.opacity = "0"; });
          panel.appendChild(glow);
          panel.appendChild(clone);
          root.appendChild(panel);
          clone.querySelectorAll("[data-btn]").forEach(function (b) { zoomBtn[b.dataset.btn] = b; });

          const dx = gm.x - PX, dy = (gm.y + RIBBON_SHIFT) - PY;
          // 1) 원본 그룹이 한 번 번쩍한다
          tl.fromTo(g, { filter: "brightness(1)" }, { filter: "brightness(1.6)", duration: 0.18, yoyo: true, repeat: 1, immediateRender: false }, tIn);
          // 2) 패널이 들려 올라오며 커진다 (살짝 넘어갔다 제자리)
          tl.fromTo(panel, { opacity: 0, x: dx, y: dy, scale: 1 },
            { opacity: 1, x: 0, y: 0, scale: PS * 1.06, duration: 0.8, ease: "power3.out", immediateRender: false }, tIn + 0.1);
          tl.to(panel, { scale: PS, duration: 0.32, ease: "power2.inOut" }, tIn + 0.9);
          // 3) 테두리 빛이 한 번 훑고 사라진다
          tl.fromTo(glow, { opacity: 0 }, { opacity: 1, duration: 0.22, immediateRender: false }, tIn + 0.55);
          tl.to(glow, { opacity: 0, duration: 0.7, ease: "power2.out" }, tIn + 0.85);
          // 4) 제자리로 돌아간다
          tl.to(panel, { opacity: 0, x: dx, y: dy, scale: 1, duration: 0.6, ease: "power2.in" }, tOut);
        }

        function press(label, t, hold) {
          hold = hold || 0.85;
          const b = B(label);
          if (!b) return;
          const rg = b.querySelector(".ring");
          tl.fromTo(b, { backgroundColor: "rgba(27,63,122,0)" },
            { backgroundColor: "rgba(27,63,122,1)", duration: 0.12, ease: "power2.out", immediateRender: false }, t);
          tl.fromTo(b, { scale: 1 }, { scale: 0.86, duration: 0.12, ease: "power2.in", immediateRender: false }, t);
          tl.to(b, { scale: 1.08, duration: 0.2, ease: "back.out(3.2)" }, t + 0.12);
          tl.to(b, { scale: 1, duration: 0.22, ease: "power2.out" }, t + 0.32);
          if (rg) {
            tl.fromTo(rg, { opacity: 0, scale: 0.7 }, { opacity: 1, duration: 0.12, ease: "power2.out", immediateRender: false }, t);
            tl.to(rg, { opacity: 0, scale: 1.5, duration: 0.6, ease: "power2.out" }, t + 0.12);
          }
          tl.to(b, { backgroundColor: "rgba(27,63,122,0)", duration: 0.4, ease: "power2.inOut" }, t + hold);
        }

        // 메뉴 버튼의 드롭다운
        function dropdown(hostLabel, items, tOpen, tClose) {
          const host = B(hostLabel);
          if (!host) return;
          const hb = btnBox(host);
          const menu = document.createElement("div");
          menu.className = "zmenu";
          menu.style.left = (hb.x - 10) + "px";
          menu.style.top = (hb.y + hb.h + 6) + "px";
          items.forEach(function (it) {
            const row = document.createElement("div");
            row.className = "mi"; row.dataset.mi = it.label;
            const im = document.createElement("img"); im.src = "assets/icons/" + it.icon + ".png"; im.alt = "";
            const sp = document.createElement("span"); sp.className = "z"; sp.textContent = it.label;
            const rg = document.createElement("div"); rg.className = "mring";
            row.appendChild(im); row.appendChild(sp); row.appendChild(rg);
            menu.appendChild(row);
          });
          root.appendChild(menu);
          tl.fromTo(menu, { opacity: 0, y: -12, scaleY: 0.85 },
            { opacity: 1, y: 0, scaleY: 1, duration: 0.3, ease: "power3.out", immediateRender: false }, tOpen);
          tl.to(menu, { opacity: 0, y: -10, duration: 0.3, ease: "power2.in" }, tClose);
          items.forEach(function (it, i) {
            const rg = menu.querySelector('[data-mi="' + it.label + '"] .mring');
            const t = tOpen + 0.5 + i * 0.6;
            tl.fromTo(rg, { opacity: 0 }, { opacity: 1, duration: 0.16, immediateRender: false }, t);
            tl.to(rg, { opacity: 0, duration: 0.28 }, t + 0.4);
          });
        }

        // ══════════ 막 진행 — 리본 왼쪽에서 오른쪽 순서 ══════════

        // 3막 · 데이터 > 주가 차트 (표지를 채우므로 먼저)
        focusOn(["데이터"], 18.6);
        press("주가 차트", 19.8);
        focusOff(["데이터"], 26.2);

        // 4막 · 제목
        focusOn(["제목"], 27.0);
        zoomGroup("제목", 27.1, 35.2);
        press("대제목", 28.4);
        press("중제목", 30.6);
        press("소제목", 32.4);
        focusOff(["제목"], 35.6);

        // 5막 · 문단
        focusOn(["문단"], 36.0);
        zoomGroup("문단", 36.1, 45.4);
        press("본문", 37.4);
        press("글머리 ①", 39.2);
        press("요약박스", 41.0);
        press("사이드노트", 42.8);
        focusOff(["문단"], 45.8);

        // 6막 · 자료 틀
        focusOn(["자료 틀"], 47.0);
        zoomGroup("자료 틀", 47.1, 54.4);
        press("1단 틀", 48.4);
        press("2단 틀", 49.9);
        press("3단 틀", 51.4);
        focusOff(["자료 틀"], 54.8);

        // 7막 · 강조
        focusOn(["강조"], 56.0);
        zoomGroup("강조", 56.1, 62.4);
        press("강조", 57.4);
        press("빨강 강조", 59.0);
        press("첫문장 볼드", 60.6);
        focusOff(["강조"], 62.8);

        // 8막 · 차트·표
        focusOn(["차트·표"], 64.0);
        zoomGroup("차트·표", 64.1, 72.6);
        press("차트 양식", 66.4);
        press("엑셀 표", 68.4);
        press("추정치 구분", 70.4);
        focusOff(["차트·표"], 73.0);

        // 9막 · 주석
        focusOn(["주석"], 75.0);
        zoomGroup("주석", 75.1, 87.2);
        press("빨간 글", 76.6);
        press("화살표", 78.2);
        press("강조 상자", 79.8);
        press("폭 맞추기", 81.4);
        press("점선 상자", 82.8);
        press("점선 원", 84.2);
        press("더보기", 85.6, 2.8);
        dropdown("더보기", [
          { icon: "ShapesInsertGallery", label: "점선 화살표" },
          { icon: "ShapesInsertGallery", label: "이벤트 선" },
          { icon: "ShadingColorPicker",  label: "구간 음영" },
          { icon: "TextBoxInsert",       label: "남색 메모" },
        ], 85.8, 88.2);
        focusOff(["주석"], 88.6);

        // 10막 · 데이터 (주가 비교 · 모델 값)
        focusOn(["데이터"], 89.0);
        zoomGroup("데이터", 89.1, 96.0);
        press("주가 비교", 90.4);
        press("모델 값", 93.2);
        focusOff(["데이터"], 96.4);

        // 11막 · 글꼴
        focusOn(["글꼴"], 97.0);
        zoomGroup("글꼴", 97.1, 104.2);
        press("코펍 볼드", 98.4);
        press("코펍 미디움", 99.8);
        press("코펍 라이트", 101.2);
        press("윤고딕 540", 102.6);
        focusOff(["글꼴"], 104.6);

        // 12막 · 마무리 — 대제목을 하나 더 넣고 목차가 갱신되는 걸 본다
        focusOn(["제목"], 105.0);
        press("대제목", 105.9);
        focusOff(["제목"], 107.4);
        focusOn(["마무리"], 107.6);
        zoomGroup("마무리", 107.7, 126.2);
        press("필드 갱신", 109.0);
        press("양식 점검", 115.6);
        press("내용 점검", 119.8);
        press("PDF 내보내기", 122.8);
        focusOff(["마무리"], 126.6);

        // 13막 · 설정
        focusOn(["설정"], 128.8);
        zoomGroup("설정", 128.9, 134.0);
        press("설치", 130.2, 2.4);
        dropdown("설치", [{ icon: "QuickPartsInsertGallery", label: "블록 등록 (템플릿 열고 1회)" }], 130.4, 133.4);
        focusOff(["설정"], 134.4);

        // 14막 · 엔딩
        tl.to(one("#ribbon"), { y: -320, opacity: 0, duration: 1.1, ease: "power2.inOut" }, 135.4);
        tl.to(one("#mark"), { opacity: 0, duration: 0.8, ease: "power2.inOut" }, 135.4);
        tl.to(one("#sealWrap"), { x: 0, y: -96, scale: 0.78, opacity: 1, duration: 1.4, ease: "power3.inOut" }, 135.6);

        // ── 버튼 → 결과물 연결선 ──
        // ex, ey = 페이지 CSS 좌표를 해당 막의 카메라로 환산한 전역 좌표
        const CONN = [
          { t: 19.90, btn: "주가 차트",   ex: 1103, ey: 862, out: 1.10 },
          { t: 28.50, btn: "대제목",     ex:  845, ey: 631, out: 1.00 },
          { t: 30.70, btn: "중제목",     ex:  845, ey: 727, out: 1.00 },
          { t: 32.50, btn: "소제목",     ex:  845, ey: 762, out: 1.00 },
          { t: 37.50, btn: "본문",       ex:  845, ey: 795, out: 1.00 },
          { t: 39.30, btn: "글머리 ①",   ex:  845, ey: 872, out: 1.00 },
          { t: 41.10, btn: "요약박스",   ex:  845, ey: 698, out: 1.00 },
          { t: 42.90, btn: "사이드노트", ex:  636, ey: 800, out: 1.00 },
          { t: 48.50, btn: "1단 틀",     ex:  608, ey: 470, out: 0.95 },
          { t: 50.00, btn: "2단 틀",     ex:  608, ey: 722, out: 0.95 },
          { t: 51.50, btn: "3단 틀",     ex:  608, ey: 912, out: 0.95 },
          { t: 57.50, btn: "강조",       ex:  845, ey: 795, out: 0.95 },
          { t: 59.10, btn: "빨강 강조",   ex:  845, ey: 828, out: 0.95 },
          { t: 60.70, btn: "첫문장 볼드", ex:  845, ey: 812, out: 0.95 },
          { t: 66.50, btn: "차트 양식",   ex:  608, ey: 577, out: 1.00 },
          { t: 68.50, btn: "엑셀 표",     ex:  608, ey: 800, out: 1.00 },
          { t: 70.50, btn: "추정치 구분", ex:  608, ey: 556, out: 1.00 },
          { t: 76.70, btn: "빨간 글",     ex:  608, ey: 500, out: 0.95 },
          { t: 78.30, btn: "화살표",     ex:  608, ey: 536, out: 0.95 },
          { t: 79.90, btn: "강조 상자",   ex:  608, ey: 572, out: 0.95 },
          { t: 81.50, btn: "폭 맞추기",   ex:  608, ey: 608, out: 0.95 },
          { t: 82.90, btn: "점선 상자",   ex:  608, ey: 644, out: 0.95 },
          { t: 84.30, btn: "점선 원",     ex:  608, ey: 680, out: 0.95 },
          { t: 90.50, btn: "주가 비교",   ex:  980, ey: 722, out: 1.00 },
          { t: 93.30, btn: "모델 값",     ex:  845, ey: 800, out: 1.00 },
        ];

        function pathFor(b, L) {
          const bb = btnBox(b);
          const sx = bb.x + bb.w / 2;
          const sy = bb.y + bb.h + 6;
          const cx1 = sx + (L.ex - sx) * 0.52;
          const cx2 = L.ex - 150;
          return "M " + sx.toFixed(1) + " " + sy.toFixed(1) +
                 " C " + cx1.toFixed(1) + " " + sy.toFixed(1) +
                 ", " + cx2.toFixed(1) + " " + L.ey.toFixed(1) +
                 ", " + L.ex.toFixed(1) + " " + L.ey.toFixed(1);
        }

        const drawn = [];
        CONN.forEach(function (L) {
          const b = B(L.btn);
          if (!b) return;
          const p = document.createElementNS(NS, "path");
          p.setAttribute("pathLength", "1");
          p.setAttribute("d", pathFor(b, L));
          p.style.strokeDasharray = "1";
          p.style.strokeDashoffset = "1";
          conn.appendChild(p);
          const dot = document.createElementNS(NS, "circle");
          dot.setAttribute("cx", L.ex); dot.setAttribute("cy", L.ey); dot.setAttribute("r", "4.5");
          conn.appendChild(dot);
          drawn.push({ b: b, p: p, L: L });

          tl.to(p, { opacity: 1, duration: 0.08 }, L.t);
          tl.fromTo(p, { strokeDashoffset: 1 },
            { strokeDashoffset: 0, duration: 0.45, ease: "power2.inOut", immediateRender: false }, L.t);
          tl.fromTo(dot, { opacity: 0, scale: 0.4 },
            { opacity: 1, scale: 1, duration: 0.22, ease: "back.out(3)", immediateRender: false }, L.t + 0.38);
          tl.to([p, dot], { opacity: 0, duration: 0.3, ease: "power1.out" }, L.t + L.out);
        });

        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(function () {
            drawn.forEach(function (d) { d.p.setAttribute("d", pathFor(d.b, d.L)); });
          });
        }

