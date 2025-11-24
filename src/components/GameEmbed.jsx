import { useEffect, useRef } from "react";

export default function GameEmbed({
  scriptUrl = "/game_folder/game.js",
  isModule = true,
  width = 1080,
  height = 720,
  reloadToken = 0,
  applyBaseHref = true, // 스크립트 위치를 기준으로 상대 경로를 해석하도록 <base> 주입
}) {
  const scriptRef = useRef(null);
  const baseRef = useRef(null);

  useEffect(() => {
    // 이전 스크립트 제거
    if (scriptRef.current && scriptRef.current.parentNode) {
      scriptRef.current.parentNode.removeChild(scriptRef.current);
      scriptRef.current = null;
    }

    // (선택) <base> 주입: 상대 경로 에셋이 스크립트 폴더 기준으로 로드되도록 보정
    if (applyBaseHref) {
      const existingBase = document.head.querySelector("base[href]");
      if (!existingBase) {
        try {
          const abs = new URL(scriptUrl, window.location.origin);
          const baseHref = abs.href.replace(/[^/]*$/, ""); // 파일명 제거 후 마지막 슬래시까지
          const base = document.createElement("base");
          base.href = baseHref;
          baseRef.current = base;
          // base는 head의 첫 요소여야 우선 적용됨
          const head = document.head;
          if (head.firstChild) head.insertBefore(base, head.firstChild);
          else head.appendChild(base);
        } catch (e) {
          // URL 파싱 실패 시 무시
        }
      }
    }

    // 새로운 스크립트 주입
    const s = document.createElement("script");
    if (isModule) s.type = "module";
    s.src = scriptUrl;
    s.crossOrigin = "anonymous";
    scriptRef.current = s;
    document.body.appendChild(s);

    // 언마운트/변경 시 정리
    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
      if (baseRef.current && baseRef.current.parentNode) {
        baseRef.current.parentNode.removeChild(baseRef.current);
        baseRef.current = null;
      }
      // 게임 쪽에서 정리 함수가 전역으로 노출된다면 호출 (옵션)
      // window.__gameCleanup && window.__gameCleanup();
    };
  }, [scriptUrl, isModule, reloadToken, applyBaseHref]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minWidth: 0,
      }}
    >
      <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex" }}>
        <canvas
          id="gameCanvas"
          width={width}
          height={height}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            maxWidth: "100%",
            maxHeight: "100%",
          }}
        ></canvas>
      </div>
    </div>
  );
}
