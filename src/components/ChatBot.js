import React, { useState, useRef, useEffect } from "react";
import "./ChatBot.css";
import {
  sendErrorBatch,
  getSnapshotLog,
  getGameData,
  revertGame,
  processCodeMessage,
} from "../api/backend";

function ChatBot({
  onMarkdownUpdate,
  onSnapshotUpdate,
  onGameDataUpdate,
  loadedChat,
  gameName,
  gameErrorBatch,
  onErrorBatchHandled,
}) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 외부에서 불러온 채팅 이력 반영
  useEffect(() => {
    if (Array.isArray(loadedChat)) {
      setMessages(loadedChat);
    }
  }, [loadedChat]);

  // 게임 에러 배치가 들어오면 메시지 추가
  useEffect(() => {
    if (!gameErrorBatch) return;

    // iframe에서 이미 포맷된 error_report를 사용
    const errorText =
      gameErrorBatch.error_report || "에러 정보를 불러올 수 없습니다.";

    const errorMessage = {
      id: `error-${Date.now()}`,
      text: errorText,
      sender: "bot",
      type: "error-batch",
      errorData: gameErrorBatch,
    };
    setMessages((prev) => [...prev, errorMessage]);

    // async 함수 정의 후 즉시 실행
    const sendError = async () => {
      try {
        await sendErrorBatch(gameName, gameErrorBatch);
        console.log("✅ FastAPI 서버로 에러 전송 성공");
      } catch (error) {
        console.error("❌ FastAPI 서버로 에러 전송 실패:", error);
      } finally {
        if (typeof onErrorBatchHandled === "function") {
          onErrorBatchHandled();
        }
      }
    };

    sendError();
  }, [gameErrorBatch, onErrorBatchHandled, gameName]);

  // 공통: 스냅샷 로그 및 게임 데이터 최신화
  const refreshSnapshotAndGameData = async () => {
    try {
      const snapRes = await getSnapshotLog(gameName);
      const data = snapRes?.data;
      if (data && onSnapshotUpdate) {
        onSnapshotUpdate(data);
      }
    } catch (snapErr) {
      console.warn("스냅샷 로그 가져오기 실패:", snapErr);
    }
    // 이어서 게임 데이터 갱신
    if (onGameDataUpdate && gameName) {
      try {
        const res = await getGameData(gameName);
        const payload = res?.data;
        if (payload && typeof payload === "object") {
          onGameDataUpdate(payload);
        } else {
          console.warn("예상치 못한 /game_data 응답 형식:", payload);
        }
      } catch (gdErr) {
        console.warn("게임 데이터 갱신 실패(/game_data):", gdErr);
      }
    }
  };

  const handleRevert = async () => {
    try {
      const response = await revertGame(gameName);

      const botMessage = {
        text: response.data.reply || "이전 상태로 되돌렸습니다.",
        sender: "bot",
      };
      setMessages((prev) => [...prev, botMessage]);

      // 스냅샷 + 게임 데이터 갱신
      await refreshSnapshotAndGameData();
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          text: "서버 오류 발생(되돌리기 작업).",
          sender: "bot",
        },
      ]);
    }
  };

  const sendCodeMessage = async (messageText, tempText) => {
    // 사용자 메시지 추가
    const userMessage = { text: messageText, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);

    // 임시 봇 메시지 추가
    const tempBotMessage = { id: Date.now(), text: tempText, sender: "bot" };
    setMessages((prev) => [...prev, tempBotMessage]);

    try {
      const response = await processCodeMessage(messageText, gameName);

      if (response.data.status === "success") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempBotMessage.id
              ? { text: response.data.reply, sender: "bot" }
              : msg
          )
        );
        await refreshSnapshotAndGameData();
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempBotMessage.id
              ? { text: "서버 오류: " + response.data.reply, sender: "bot" }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        { text: "서버 오류 발생.", sender: "bot" },
      ]);
    }
  };

  const handleFixError = async (errorData) => {
    // error_report를 그대로 사용
    const errorReport =
      errorData.error_report || "에러 정보를 불러올 수 없습니다.";

    const fixRequestMessage = `다음 런타임 오류를 수정해주세요:\n\n${errorReport}`;

    sendCodeMessage(fixRequestMessage, "오류를 분석하고 수정하는 중입니다...");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // 현재 입력 메시지 저장 후 입력창 초기화
    const currentMessage = inputMessage;
    setInputMessage("");

    sendCodeMessage(currentMessage, "응답을 생성하는 중입니다...");
    setInputMessage("");
  };

  return (
    <div className="chatbot-container">
      <div className="chat-controls">
        <button onClick={handleRevert} className="revert-button">
          최근 변경사항 되돌리기
        </button>
      </div>
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div
            key={message.id || index}
            className={`message ${message.sender}`}
          >
            <div style={{ whiteSpace: "pre-wrap" }}>{message.text}</div>
            {message.type === "error-batch" && message.errorData && (
              <button
                onClick={() => handleFixError(message.errorData)}
                style={{
                  marginTop: "10px",
                  padding: "8px 16px",
                  backgroundColor: "#ff4444",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                런타임 오류 수정 요청
              </button>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="메시지를 입력하세요... (Shift + Enter로 줄바꿈)"
          className="chat-input"
        />
        <button type="submit" className="send-button">
          전송
        </button>
      </form>
    </div>
  );
}

export default ChatBot;
