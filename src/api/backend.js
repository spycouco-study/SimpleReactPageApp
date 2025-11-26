import { backendApi } from "./index";

// spec 호출만 담당, response 후처리는 하지 않음
export const getGameSpec = (gameName) => {
  return backendApi.get("/spec", {
    params: { game_name: gameName || "" },
  });
};

// 선택한 게임 버전 복원 요청
export const restoreGameVersion = (gameName, version) => {
  return backendApi.post("/restore-version", {
    version,
    game_name: gameName || "",
  });
};

// 스냅샷 로그 조회
export const getSnapshotLog = (gameName) => {
  return backendApi.get("/snapshot-log", {
    params: {
      game_name: gameName || "",
      _t: Date.now(), // 캐시 방지
    },
    headers: {
      "Cache-Control": "no-cache",
    },
  });
};

// 게임 데이터 조회
export const getGameData = (gameName) => {
  return backendApi.get("/game_data", {
    params: {
      game_name: gameName || "",
      _t: Date.now(), // 캐시 방지
    },
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  });
};

// 채팅 기록 조회
export const getChat = (gameName) => {
  return backendApi.get("/load-chat", {
    params: {
      game_name: gameName || "",
      _t: Date.now(), // 캐시 방지
    },
    headers: {
      "Cache-Control": "no-cache",
    },
  });
};

// 게임 에셋 조회
export const getGameAssets = (gameName) => {
  return backendApi.get("/assets", {
    params: {
      game_name: gameName || "",
      _t: Date.now(), // 캐시 방지용 타임스탬프
    },
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  });
};

// 게임 에셋 교체
export const replaceAsset = (gameName, previewItem, file) => {
  const form = new FormData();
  form.append("game_name", gameName);
  form.append("old_name", previewItem.name);
  form.append("file", file);
  form.append("typ", previewItem.type);
  form.append("type", previewItem.type);

  return backendApi.post("/replace-asset", form, {
    headers: { "Content-Type": "multipart/form-data" }, // FormData 전송
  });
};

// 게임 데이터 업데이트
export const updateGameData = (gameName, data) => {
  return backendApi.post(
    "/data-update",
    { game_name: gameName, data },
    {
      headers: { "Content-Type": "application/json" },
    }
  );
};

// 에러 배치 전송
export const sendErrorBatch = (
  gameName,
  gameErrorBatch,
  gameVersion = "1.0.1"
) => {
  const payload = {
    type: "error-batch",
    game_name: gameName || "",
    game_version: gameVersion,
    collected_at: new Date().toISOString(),
    error_count: gameErrorBatch.error_count || 0,
    error_report: gameErrorBatch.error_report || "",
    errors: [],
  };

  return backendApi.post("/client-error", payload);
};

// 게임 상태 되돌리기
export const revertGame = (gameName) => {
  return backendApi.post("/revert", {
    game_name: gameName || "",
  });
};

// 코드 메시지 처리 요청
export const processCodeMessage = (message, gameName) => {
  return backendApi.post("/process-code", {
    message,
    game_name: gameName || "",
  });
};

// 질문 답변 전송
export const submitAnswer = (questionId, answer) => {
  return backendApi.post("/answer", {
    questionId,
    answer,
  });
};

// QnA 제출
export const submitQnA = (gameName, payload) => {
  return backendApi.post("/qna", {
    game_name: gameName,
    payload,
  });
};

/**
 * 서버로 spec-question 요청
 * @param {string} gameName - 게임 이름
 * @param {string} message - 질문 메시지
 * @returns {Promise} Axios response
 */
export const specQuestion = (gameName, message) => {
  return backendApi.post("/spec-question", {
    game_name: gameName,
    message,
  });
};
