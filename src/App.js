import React, { useEffect, useState } from "react";
import "./App.css";
import ChatBot from "./components/ChatBot";
import ChatBot2 from "./components/ChatBot2";
import ReactMarkdown from "react-markdown";
import BoundingBoxEditor from "./components/BoundingBoxEditor";
import DataEditor from "./components/DataEditor";
import SnapshotTree from "./components/SnapshotTree";
import MediaExplorer from "./components/MediaExplorer";
import GameIframe from "./components/GameIframe";
import GameEmbed from "./components/GameEmbed";
import {
  getGameSpec,
  getGameData,
  getSnapshotLog,
  getChat,
} from "./api/backend";

function App() {
  const [markdownContent, setMarkdownContent] = useState(""); //('# Alparka 놀이공원 기획서\n\n[기획서 내용]');
  const [activeTab, setActiveTab] = useState("markdown"); // 'markdown', 'boundingBox', 'data', 'snapshots', 'media'
  const [activeChatTab, setActiveChatTab] = useState("chatbot1"); // 'chatbot1' or 'chatbot2'
  const [isEditing, setIsEditing] = useState(false);
  const [gameName, setGameName] = useState(""); // 게임 이름 상태
  const [isGameNameLocked, setIsGameNameLocked] = useState(false); // 게임 이름 편집 잠금
  const [snapshotData, setSnapshotData] = useState(null); // 스냅샷 데이터 상태
  const [dataEditorData, setDataEditorData] = useState({}); // 데이터 편집기 상태
  const [loadedChat, setLoadedChat] = useState(null); // 서버에서 불러온 채팅 내역
  const [assetRefreshToken, setAssetRefreshToken] = useState(0); // 미디어 자산 갱신 트리거
  const [scriptUrl, setScriptUrl] = useState("/game_folder/index.html"); // iframe으로 로드할 게임 URL
  const [reloadToken, setReloadToken] = useState(0); // iframe 재로딩 트리거
  const [embedScriptUrl, setEmbedScriptUrl] = useState("/game_folder/game.js"); // GameEmbed용 스크립트 URL
  const [embedReloadToken, setEmbedReloadToken] = useState(0); // GameEmbed 재실행 트리거
  const [gameErrorBatch, setGameErrorBatch] = useState(null); // 게임 에러 배치 데이터

  // 게임 에러 배치 핸들러
  const handleGameErrorBatch = (batchData) => {
    setGameErrorBatch(batchData);
  };

  // 게임 이름이 변경되고 잠금되지 않았을 때 기본 게임 URL을 동기화
  useEffect(() => {
    if (!isGameNameLocked) {
      const trimmed = (gameName || "").trim();
      if (trimmed) {
        setScriptUrl(`/games/${encodeURIComponent(trimmed)}/index.html`);
        setEmbedScriptUrl(`/games/${encodeURIComponent(trimmed)}/game.js`);
      } else {
        setScriptUrl("/game_folder/index.html");
        setEmbedScriptUrl("/game_folder/game.js");
      }
    }
  }, [gameName, isGameNameLocked]);

  const handleMarkdownUpdate = (content) => {
    setMarkdownContent(content);
  };
  const handleSnapshotUpdate = (json) => {
    // 유효성 간단 체크: versions 배열 존재 여부
    if (json && Array.isArray(json.versions)) {
      setSnapshotData(json);
      // 스냅샷이 갱신될 때만 미디어 갱신 토큰 증가
      setAssetRefreshToken((t) => t + 1);
    } else {
      console.warn("Invalid snapshot data, expected { versions: [...] }");
    }
  };

  const handleEditorChange = (e) => {
    setMarkdownContent(e.target.value);
  };

  const toggleMode = () => {
    setIsEditing((prev) => !prev);
  };

  // '확인/변경' 버튼 동작
  const handleToggleGameName = async () => {
    // 현재가 unlocked(확인 상태)일 때 클릭하면 잠그고 서버에서 데이터 가져오기
    if (!isGameNameLocked) {
      if (gameName.trim() === "") return; // 버튼 disabled 조건과 동일한 가드
      setIsGameNameLocked(true);
      // 게임 이름 확정 시 게임 불러오기
      const GAME_SERVER =
        process.env.REACT_APP_GAME_URL || "http://localhost:8080";
      setScriptUrl(`${GAME_SERVER}/${gameName.trim()}`);
      setReloadToken((k) => k + 1);
      // 게임 이름 확정 시 미디어도 초기 로드 필요 -> 토큰 증가
      setAssetRefreshToken((t) => t + 1);
      try {
        const res = await getGameData(gameName);
        const payload = res?.data;
        if (payload && typeof payload === "object") {
          setDataEditorData(payload);
        } else {
          console.warn("Unexpected /game_data response", payload);
        }

        // 이어서 스냅샷 로그 갱신
        try {
          const snapRes = await getSnapshotLog(gameName);

          let snapPayload = snapRes?.data;
          // 기존 검증 로직 사용
          handleSnapshotUpdate(snapPayload);
        } catch (snapErr) {
          console.error("Failed to GET /snapshot-log:", snapErr);
        }

        try {
          const specRes = await getGameSpec(gameName);
          if (specRes?.data) {
            setMarkdownContent(specRes.data);
            // 필요시 메시지 처리 등 UI 업데이트
          }
        } catch (specError) {
          console.group("사양서 갱신 오류");
          console.error("오류 객체:", specError);
          if (specError.response) {
            console.error("서버 응답 상태:", specError.response.status);
            console.error("서버 응답 데이터:", specError.response.data);
          }
          console.groupEnd();
          // UI 메시지 업데이트
        }
      } catch (err) {
        console.error("Failed to GET /game_data:", err);
      }

      // 마지막으로 채팅 이력 로드 (/load-chat)
      try {
        const chatRes = await getChat(gameName);

        let chatPayload = chatRes?.data;
        if (chatPayload && Array.isArray(chatPayload.chat)) {
          // from -> sender 로 매핑
          const normalized = chatPayload.chat.map((m, i) => ({
            sender: m.from === "user" ? "user" : "bot",
            text: m.text,
            id: `loaded-${i}`,
          }));
          setLoadedChat(normalized);
        } else {
          // chat 필드가 없거나 형식이 다르면 빈 배열로 처리
          setLoadedChat([]);
        }
      } catch (chatErr) {
        console.error("Failed to GET /load-chat:", chatErr);
        setLoadedChat([]);
      }
    } else {
      // 잠금 해제 -> 이름 변경 가능
      setIsGameNameLocked(false);
    }
  };

  const renderMarkdownSection = () => {
    // 문서 보기/편집만 제공 (게임은 별도 상위 탭)
    if (isEditing) {
      return (
        <>
          <h2>기획서 편집 (수정 모드)</h2>
          <textarea
            className="markdown-editor"
            value={markdownContent}
            onChange={handleEditorChange}
            rows={25}
          />
        </>
      );
    }
    return (
      <>
        <h2>기획서 미리보기 (보기 모드)</h2>
        <div className="markdown-viewer">
          <ReactMarkdown>{markdownContent}</ReactMarkdown>
        </div>
      </>
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>
          알아서 만들어 주는 AI 놀이공원, Alparka!{" "}
          {gameName ? `- ${gameName}` : ""}
        </h1>
        <div style={{ marginTop: "10px" }}>
          <label style={{ marginRight: "8px" }}>게임 이름:</label>
          <input
            type="text"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder="게임 이름을 입력하세요"
            style={{
              padding: "6px 10px",
              fontSize: "14px",
              minWidth: "220px",
              marginRight: "8px",
            }}
            disabled={isGameNameLocked}
          />
          <button
            onClick={handleToggleGameName}
            disabled={!isGameNameLocked && gameName.trim() === ""}
            title={isGameNameLocked ? "게임 이름 변경" : "게임 이름 확정"}
            aria-pressed={isGameNameLocked}
            style={{ padding: "6px 12px", fontSize: "14px" }}
          >
            {isGameNameLocked ? "변경" : "확인"}
          </button>
        </div>
      </header>
      <main className="split-layout">
        {/* 챗봇 섹션 */}
        <div className="chat-section">
          <div className="chat-tabs">
            <button
              className={`chat-tab ${
                activeChatTab === "chatbot1" ? "active" : ""
              }`}
              onClick={() => setActiveChatTab("chatbot1")}
            >
              게임 만들기
            </button>
            <button
              className={`chat-tab ${
                activeChatTab === "chatbot2" ? "active" : ""
              }`}
              onClick={() => setActiveChatTab("chatbot2")}
            >
              기획 QnA
            </button>
          </div>
          <div className="chat-content">
            <div
              style={{
                display: activeChatTab === "chatbot1" ? "block" : "none",
                height: "100%",
              }}
            >
              <ChatBot
                onMarkdownUpdate={handleMarkdownUpdate}
                onSnapshotUpdate={handleSnapshotUpdate}
                onGameDataUpdate={setDataEditorData}
                loadedChat={loadedChat}
                gameName={gameName}
                gameErrorBatch={gameErrorBatch}
                onErrorBatchHandled={() => setGameErrorBatch(null)}
              />
            </div>
            <div
              style={{
                display: activeChatTab === "chatbot2" ? "block" : "none",
                height: "100%",
              }}
            >
              <ChatBot2
                onMarkdownUpdate={handleMarkdownUpdate}
                onSnapshotUpdate={handleSnapshotUpdate}
                onGameDataUpdate={setDataEditorData}
                gameName={gameName}
              />
            </div>
          </div>
        </div>

        {/* 콘텐츠 섹션 */}
        <div className="content-section">
          {/* 탭 네비게이션 */}
          <div className="tab-navigation">
            <button
              onClick={() => setActiveTab("markdown")}
              className={`tab-button ${
                activeTab === "markdown" ? "active" : ""
              }`}
            >
              기획서
            </button>
            <button
              onClick={() => setActiveTab("game")}
              className={`tab-button ${activeTab === "game" ? "active" : ""}`}
            >
              게임
            </button>
            <button
              onClick={() => setActiveTab("game-embed")}
              className={`tab-button ${
                activeTab === "game-embed" ? "active" : ""
              }`}
            >
              게임(Embed)
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={`tab-button ${activeTab === "data" ? "active" : ""}`}
            >
              게임 설정
            </button>
            <button
              onClick={() => setActiveTab("snapshots")}
              className={`tab-button ${
                activeTab === "snapshots" ? "active" : ""
              }`}
            >
              버전 관리
            </button>
            <button
              onClick={() => setActiveTab("media")}
              className={`tab-button ${activeTab === "media" ? "active" : ""}`}
            >
              에셋
            </button>
            <button
              onClick={() => setActiveTab("boundingBox")}
              className={`tab-button ${
                activeTab === "boundingBox" ? "active" : ""
              }`}
            >
              바운딩 박스
            </button>
          </div>

          {/* 마크다운 탭 */}
          {activeTab === "markdown" && (
            <div className="markdown-section">
              <button
                onClick={toggleMode}
                hidden
                style={{
                  marginBottom: "15px",
                  padding: "10px 20px",
                  fontSize: "16px",
                }}
              >
                {isEditing ? "👀 미리보기 모드로 전환" : "✍️ 편집 모드로 전환"}
              </button>
              {renderMarkdownSection()}
            </div>
          )}

          {/* 게임 탭 */}
          {activeTab === "game" && (
            <div className="data-section" style={{ height: "100%" }}>
              {isGameNameLocked ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <button
                      onClick={() => {
                        setReloadToken((k) => k + 1);
                      }}
                      style={{ padding: "6px 12px" }}
                    >
                      새로고침
                    </button>
                  </div>
                  <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
                    <GameIframe
                      src={scriptUrl}
                      reloadToken={reloadToken}
                      onErrorBatch={handleGameErrorBatch}
                    />
                  </div>
                </>
              ) : (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#999",
                    fontSize: "18px",
                  }}
                >
                  게임 이름을 입력하고 확인 버튼을 눌러주세요
                </div>
              )}
            </div>
          )}

          {/* 게임(Embed) 탭 - game.js만 로드하여 캔버스에서 실행 */}
          {activeTab === "game-embed" && (
            <div className="data-section" style={{ height: "100%" }}>
              <h2>게임 미리보기 (Embed)</h2>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <label style={{ whiteSpace: "nowrap" }}>스크립트 URL</label>
                <input
                  type="text"
                  value={embedScriptUrl}
                  onChange={(e) => setEmbedScriptUrl(e.target.value)}
                  style={{ flex: 1, padding: "6px 10px", fontSize: 14 }}
                  placeholder="/game_folder/game.js 또는 서버 경로"
                />
                <button
                  onClick={() => setEmbedReloadToken((k) => k + 1)}
                  style={{ padding: "6px 12px" }}
                >
                  새로고침
                </button>
              </div>
              <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
                <GameEmbed
                  scriptUrl={embedScriptUrl}
                  isModule={true}
                  width={1080}
                  height={720}
                  reloadToken={embedReloadToken}
                />
              </div>
            </div>
          )}

          {/* 바운딩 박스 탭 */}
          {activeTab === "boundingBox" && (
            <div className="bounding-box-section">
              <BoundingBoxEditor />
            </div>
          )}

          {/* 데이터 탭 */}
          {activeTab === "data" && (
            <div className="data-section">
              <DataEditor
                data={dataEditorData}
                onDataChange={setDataEditorData}
                showImportExport={false}
                gameName={gameName}
                onSnapshotUpdate={handleSnapshotUpdate}
                hiddenTopLevelKeys={["assets"]}
              />
            </div>
          )}

          {/* 스냅샷 트리 탭 */}
          {activeTab === "snapshots" && (
            <div className="snapshot-section" style={{ flex: 1 }}>
              <SnapshotTree
                data={snapshotData || undefined}
                gameName={gameName}
                onSnapshotUpdate={handleSnapshotUpdate}
                onGameDataUpdate={setDataEditorData}
                showImportExport={false}
              />
            </div>
          )}

          {/* 미디어 탭 - 항상 마운트, 표시만 전환하여 상태 유지 */}
          <div
            className="data-section"
            style={{
              display: activeTab === "media" ? "block" : "none",
              height: "100%",
            }}
          >
            <MediaExplorer
              gameName={gameName}
              isLocked={isGameNameLocked}
              refreshToken={assetRefreshToken}
              onSnapshotUpdate={handleSnapshotUpdate}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
