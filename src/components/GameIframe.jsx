import React, { useEffect } from "react";

export default function GameIframe({
  src = "/game_folder/index.html",
  reloadToken = 0,
  style = {},
  allowFullScreen = true,
}) {
  // 🌟 useEffect Hook을 사용하여 컴포넌트가 마운트될 때 이벤트 리스너를 등록합니다.
  useEffect(() => {
    // 1. 메시지 수신 핸들러 함수 정의
    const handleIframeMessage = (event) => {
      // ⚠️ 보안 확인: 실제 서비스에서는 반드시 특정 출처(event.origin)를 확인해야 합니다.
      // if (event.origin !== "https://your-game-server-domain.com") return;

      const data = event.data;

      // 2. 메시지 타입 확인: 'alparka-game-iframe'에서 보낸 'error-report'인지 확인
      if (
        data &&
        data.source === "alparka-game-iframe" &&
        data.type === "error-report"
      ) {
        const errorData = data.payload;

        // 3. 부모 페이지의 콘솔에 출력 (React/Vue 앱의 메인 콘솔)
        console.error("🚨 IFRAME 오류 수신:", errorData);

        // 4. (추가 로직): 서버 전송, UI 업데이트 등
        // 예를 들어, 사용자에게 오류를 시각적으로 알리는 상태를 업데이트할 수 있습니다.
        // handleReportedError(errorData);
      }
    };

    // 3. window 객체에 'message' 이벤트 리스너를 등록합니다.
    window.addEventListener("message", handleIframeMessage);

    // 4. 클린업(Clean-up) 함수: 컴포넌트가 언마운트될 때 리스너를 해제합니다.
    return () => {
      window.removeEventListener("message", handleIframeMessage);
    };

    // reloadToken이 변경될 때 리스너를 다시 등록할 필요는 없으므로 의존성 배열을 비워둡니다.
    // 또는 src가 변경될 때 통신 로직에 영향을 줄 수 있다면 [src]를 넣어줄 수 있습니다.
  }, []); // 빈 배열: 컴포넌트가 처음 마운트될 때 한 번만 실행

  // -----------------------------------------------------------

  return (
    <iframe
      key={reloadToken}
      src={src}
      title="Game Preview"
      style={{
        flex: 1,
        width: "100%",
        height: "100%",
        border: "1px solid #ddd",
        borderRadius: 8,
        background: "#000",
        ...style,
      }}
      allow="autoplay; fullscreen"
      //allowFullScreen={allowFullScreen}
    />
  );
}
