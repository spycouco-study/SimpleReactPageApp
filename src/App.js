import React, { useState } from 'react';
import './App.css';
import ChatBot from './components/ChatBot';
import ChatBot2 from './components/ChatBot2';
import ReactMarkdown from 'react-markdown';
import BoundingBoxEditor from './components/BoundingBoxEditor';

function App() {
  const [markdownContent, setMarkdownContent] = useState('# Alparka 놀이공원 기획서\n\n[기획서 내용]');
  const [activeTab, setActiveTab] = useState('markdown'); // 'markdown', 'boundingBox', or 'chat'
  const [activeChatTab, setActiveChatTab] = useState('chatbot1'); // 'chatbot1' or 'chatbot2'
  const [isEditing, setIsEditing] = useState(true);

  const handleMarkdownUpdate = (content) => {
    setMarkdownContent(content);
  };
  
  const handleEditorChange = (e) => {
    setMarkdownContent(e.target.value);
  };

  const toggleMode = () => {
    setIsEditing(prev => !prev);
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
        <h1>알아서 만들어 주는 AI 놀이공원, Alparka!</h1>
      </header>
      <main className="split-layout">
        {/* 챗봇 섹션 */}
        <div className="chat-section">
          <div className="chat-tabs">
            <button
              className={`chat-tab ${activeChatTab === 'chatbot1' ? 'active' : ''}`}
              onClick={() => setActiveChatTab('chatbot1')}
            >
              코드 수정
            </button>
            <button
              className={`chat-tab ${activeChatTab === 'chatbot2' ? 'active' : ''}`}
              onClick={() => setActiveChatTab('chatbot2')}
            >
              기획 QnA
            </button>
          </div>
          <div className="chat-content">
            {activeChatTab === 'chatbot1' ? (
              <ChatBot onMarkdownUpdate={handleMarkdownUpdate} />
            ) : (
              <ChatBot2 onMarkdownUpdate={handleMarkdownUpdate} />
            )}
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
        </div>
      </main>
    </div>
  );
}

export default App;