import React, { useState } from 'react';
import './App.css';
import ChatBot from './components/ChatBot';
import ChatBot2 from './components/ChatBot2';
import ReactMarkdown from 'react-markdown';
import BoundingBoxEditor from './components/BoundingBoxEditor';
import DataEditor from './components/DataEditor';
import SnapshotTree from './components/SnapshotTree';
import axios from 'axios';
import MediaExplorer from './components/MediaExplorer';

function App() {
  const [markdownContent, setMarkdownContent] = useState('');//('# Alparka 놀이공원 기획서\n\n[기획서 내용]');
  const [activeTab, setActiveTab] = useState('markdown'); // 'markdown', 'boundingBox', 'data', 'snapshots', 'media'
  const [activeChatTab, setActiveChatTab] = useState('chatbot1'); // 'chatbot1' or 'chatbot2'
  const [isEditing, setIsEditing] = useState(false);
  const [gameName, setGameName] = useState(''); // 게임 이름 상태
  const [isGameNameLocked, setIsGameNameLocked] = useState(false); // 게임 이름 편집 잠금
  const [snapshotData, setSnapshotData] = useState(null); // 스냅샷 데이터 상태
  const [dataEditorData, setDataEditorData] = useState({}); // 데이터 편집기 상태
  const [loadedChat, setLoadedChat] = useState(null); // 서버에서 불러온 채팅 내역
  const [assetRefreshToken, setAssetRefreshToken] = useState(0); // 미디어 자산 갱신 트리거

  const handleMarkdownUpdate = (content) => {
    setMarkdownContent(content);
  };
  const handleSnapshotUpdate = (json) => {
    // 유효성 간단 체크: versions 배열 존재 여부
    if (json && Array.isArray(json.versions)) {
      setSnapshotData(json);
      // 스냅샷이 갱신될 때만 미디어 갱신 토큰 증가
      setAssetRefreshToken(t => t + 1);
    } else {
      console.warn('Invalid snapshot data, expected { versions: [...] }');
    }
  };
  
  const handleEditorChange = (e) => {
    setMarkdownContent(e.target.value);
  };

  const toggleMode = () => {
    setIsEditing(prev => !prev);
  };

  // '확인/변경' 버튼 동작
  const handleToggleGameName = async () => {
    // 현재가 unlocked(확인 상태)일 때 클릭하면 잠그고 서버에서 데이터 가져오기
  if (!isGameNameLocked) {
      if (gameName.trim() === '') return; // 버튼 disabled 조건과 동일한 가드
      setIsGameNameLocked(true);
      // 게임 이름 확정 시 미디어도 초기 로드 필요 -> 토큰 증가
      setAssetRefreshToken(t => t + 1);
      try {
        const query = new URLSearchParams({ game_name: gameName.trim() }).toString();
        const res = await fetch(`/game_data?${query}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        let payload;
        try {
          // JSON 응답 시도
          payload = await res.json();
        } catch (e) {
          // 텍스트로 온 경우 파싱
          const text = await res.text();
          payload = JSON.parse(text);
        }
        if (payload && typeof payload === 'object') {
          setDataEditorData(payload);
        } else {
          console.warn('Unexpected /game_data response', payload);
        }

  // 이어서 스냅샷 로그 갱신
        try {
          const snapQuery = new URLSearchParams({ game_name: gameName.trim() }).toString();
          const snapRes = await fetch(`/snapshot-log?${snapQuery}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          let snapPayload;
          try {
            snapPayload = await snapRes.json();
          } catch (e2) {
            const text2 = await snapRes.text();
            snapPayload = JSON.parse(text2);
          }
          // 기존 검증 로직 사용
          handleSnapshotUpdate(snapPayload);
        } catch (snapErr) {
          console.error('Failed to GET /snapshot-log:', snapErr);
        }

        // // 이어서 스펙(마크다운) 갱신 - 단순화: 문자열이라고 가정
        // try {
        //   const specRes = await axios.get('/spec', {
        //     params: { game_name: gameName.trim() },
        //     responseType: 'text'
        //   });
        //   const mdText = typeof specRes.data === 'string' ? specRes.data : String(specRes.data ?? '');
        //   setMarkdownContent(mdText);
        // } catch (specErr) {
        //   console.error('Failed to GET /spec:', specErr);
        // }
        // 제출 성공 후 갱신된 사양서 가져오기`
        try {
            const specRes = await axios.get('/spec', {
                params: {
                    game_name: gameName || ''
                }
            });
            if (specRes?.data) {
                //if (typeof onMarkdownUpdate === 'function') {
                    setMarkdownContent(specRes.data);
                //}
                // setMessages(prev => [...prev, {
                //     text: '갱신된 사양서를 불러왔습니다.',
                //     sender: 'bot',
                //     type: 'comment'
                // }]);
            }
        } catch (specError) {
            console.group('사양서 갱신 오류');
            console.error('오류 객체:', specError);
            if (specError.response) {
                console.error('서버 응답 상태:', specError.response.status);
                console.error('서버 응답 데이터:', specError.response.data);
            }
            console.groupEnd();
            // setMessages(prev => [...prev, {
            //     text: '사양서를 불러오는 중 오류가 발생했습니다.',
            //     sender: 'bot',
            //     type: 'comment'
            // }]);
        }
      } catch (err) {
        console.error('Failed to GET /game_data:', err);
      }

      // 마지막으로 채팅 이력 로드 (/load-chat)
      try {
        const chatQuery = new URLSearchParams({ game_name: gameName.trim() }).toString();
        const chatRes = await fetch(`/load-chat?${chatQuery}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        let chatPayload;
        try {
          chatPayload = await chatRes.json();
        } catch (e) {
          const text = await chatRes.text();
          chatPayload = JSON.parse(text);
        }
        if (chatPayload && Array.isArray(chatPayload.chat)) {
          // from -> sender 로 매핑
          const normalized = chatPayload.chat.map((m, i) => ({
            sender: m.from === 'user' ? 'user' : 'bot',
            text: m.text,
            id: `loaded-${i}`
          }));
          setLoadedChat(normalized);
        } else {
          // chat 필드가 없거나 형식이 다르면 빈 배열로 처리
          setLoadedChat([]);
        }
      } catch (chatErr) {
        console.error('Failed to GET /load-chat:', chatErr);
        setLoadedChat([]);
      }
    } else {
      // 잠금 해제 -> 이름 변경 가능
      setIsGameNameLocked(false);
    }
  };

  const renderMarkdownSection = () => {
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
    } else {
      return (
        <>
          <h2>기획서 미리보기 (보기 모드)</h2>
          <div className="markdown-viewer">
             <ReactMarkdown>{markdownContent}</ReactMarkdown>
          </div>
        </>
      );
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>알아서 만들어 주는 AI 놀이공원, Alparka! {gameName ? `- ${gameName}` : ''}</h1>
        <div style={{ marginTop: '10px' }}>
          <label style={{ marginRight: '8px' }}>게임 이름:</label>
          <input
            type="text"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder="게임 이름을 입력하세요"
            style={{ padding: '6px 10px', fontSize: '14px', minWidth: '220px', marginRight: '8px' }}
            disabled={isGameNameLocked}
          />
          <button
            onClick={handleToggleGameName}
            disabled={!isGameNameLocked && gameName.trim() === ''}
            title={isGameNameLocked ? '게임 이름 변경' : '게임 이름 확정'}
            aria-pressed={isGameNameLocked}
            style={{ padding: '6px 12px', fontSize: '14px' }}
          >
            {isGameNameLocked ? '변경' : '확인'}
          </button>
        </div>
      </header>
      <main className="split-layout">
        {/* 챗봇 섹션 */}
        <div className="chat-section">
          <div className="chat-tabs">
            <button
              className={`chat-tab ${activeChatTab === 'chatbot1' ? 'active' : ''}`}
              onClick={() => setActiveChatTab('chatbot1')}
            >
              게임 만들기
            </button>
            <button
              className={`chat-tab ${activeChatTab === 'chatbot2' ? 'active' : ''}`}
              onClick={() => setActiveChatTab('chatbot2')}
            >
              기획 QnA
            </button>
          </div>
          <div className="chat-content">
            <div style={{ display: activeChatTab === 'chatbot1' ? 'block' : 'none', height: '100%' }}>
              <ChatBot
                onMarkdownUpdate={handleMarkdownUpdate}
                onSnapshotUpdate={handleSnapshotUpdate}
                onGameDataUpdate={setDataEditorData}
                loadedChat={loadedChat}
                gameName={gameName}
              />
            </div>
            <div style={{ display: activeChatTab === 'chatbot2' ? 'block' : 'none', height: '100%' }}>
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
              onClick={() => setActiveTab('markdown')}
              className={`tab-button ${activeTab === 'markdown' ? 'active' : ''}`}
            >
              기획서
            </button>
            <button 
              onClick={() => setActiveTab('data')}
              className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
            >
              게임 설정
            </button>
            <button 
              onClick={() => setActiveTab('snapshots')}
              className={`tab-button ${activeTab === 'snapshots' ? 'active' : ''}`}
            >
              버전 관리
            </button>
            <button 
              onClick={() => setActiveTab('media')}
              className={`tab-button ${activeTab === 'media' ? 'active' : ''}`}
            >
              에셋
            </button>
            <button 
              onClick={() => setActiveTab('boundingBox')}
              className={`tab-button ${activeTab === 'boundingBox' ? 'active' : ''}`}
            >
              바운딩 박스
            </button>
          </div>

          {/* 마크다운 탭 */}
          {activeTab === 'markdown' && (
            <div className="markdown-section">
              <button 
                onClick={toggleMode} 
                hidden
                style={{ marginBottom: '15px', padding: '10px 20px', fontSize: '16px' }}
              >
                {isEditing ? '👀 미리보기 모드로 전환' : '✍️ 편집 모드로 전환'} 
              </button>
              {renderMarkdownSection()}
            </div>
          )}

          {/* 바운딩 박스 탭 */}
          {activeTab === 'boundingBox' && (
            <div className="bounding-box-section">
              <BoundingBoxEditor />
            </div>
          )}

          {/* 데이터 탭 */}
          {activeTab === 'data' && (
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
          {activeTab === 'snapshots' && (
            <div className="snapshot-section" style={{ flex: 1 }}>
              <h2>프로젝트 스냅샷 트리</h2>
              <SnapshotTree data={snapshotData || undefined} gameName={gameName} onSnapshotUpdate={handleSnapshotUpdate} onGameDataUpdate={setDataEditorData} showImportExport={false} />
            </div>
          )}

          {/* 미디어 탭 - 항상 마운트, 표시만 전환하여 상태 유지 */}
          <div
            className="data-section"
            style={{ display: activeTab === 'media' ? 'block' : 'none', height: '100%' }}
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