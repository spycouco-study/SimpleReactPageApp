import React, { useState } from 'react';
import './App.css';
import ChatBot from './components/ChatBot';
import ReactMarkdown from 'react-markdown';

function App() {
  const [markdownContent, setMarkdownContent] = useState('# Alparka 놀이공원 기획서\n\n[기획서 내용]');
  
  // 💡 새로운 상태 추가: 현재 편집 모드인지 (true) 보기 모드인지 (false) 저장
  const [isEditing, setIsEditing] = useState(true); 

  // ChatBot으로부터 업데이트 요청을 받을 때 사용
  const handleMarkdownUpdate = (content) => {
    setMarkdownContent(content);
  };
  
  // 사용자가 텍스트를 직접 입력하여 상태를 업데이트
  const handleEditorChange = (e) => {
    setMarkdownContent(e.target.value);
  };

  // 💡 모드 전환을 처리하는 함수
  const toggleMode = () => {
    // 현재 상태의 반대 값으로 isEditing을 전환 (true <-> false)
    setIsEditing(prev => !prev);
  };

  // 💡 현재 모드에 따라 렌더링할 컴포넌트 결정
  const renderMarkdownSection = () => {
    if (isEditing) {
      // 편집 모드: 텍스트 에어리어(수정창) 표시
      return (
          <>
            <h2>기획서 편집 (수정 모드)</h2>
            <textarea
              className="markdown-editor" // <--- 이 클래스를 사용합니다.
              value={markdownContent} 
              onChange={handleEditorChange} 
              rows={25} // rows 속성은 이제 CSS가 우선하므로 크게 중요하지 않습니다.
            />
          </>
      );
    } else {
      // 보기 모드: 마크다운 뷰어만 표시
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
          <ChatBot onMarkdownUpdate={handleMarkdownUpdate} />
        </div>
        
        {/* 마크다운 섹션: 모드 전환 버튼과 내용 표시 */}
        <div className="markdown-section">
          {/* 💡 모드 전환 버튼 */}
          <button 
            onClick={toggleMode} 
            style={{ marginBottom: '15px', padding: '10px 20px', fontSize: '16px' }}
          >
            {/* 현재 모드에 따라 버튼 텍스트 변경 */}
            {isEditing ? '👀 미리보기 모드로 전환' : '✍️ 편집 모드로 전환'} 
          </button>
          
          {/* 💡 렌더링 함수 호출 */}
          {renderMarkdownSection()}
          
        </div>
      </main>
    </div>
  );
}

export default App;