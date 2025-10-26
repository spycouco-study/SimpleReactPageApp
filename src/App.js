import React, { useState } from 'react';
import './App.css';
import ChatBot from './components/ChatBot';
import ReactMarkdown from 'react-markdown';

function App() {
  const [markdownContent, setMarkdownContent] = useState('# 마크다운 문서\n\n이곳에 마크다운 문서가 표시됩니다.');

  const handleMarkdownUpdate = (content) => {
    setMarkdownContent(content);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>알아서 만들어 주는 AI 놀이공원, Alparka!</h1>
      </header>
      <main className="split-layout">
        <div className="chat-section">
          <ChatBot onMarkdownUpdate={handleMarkdownUpdate} />
        </div>
        <div className="markdown-section">
          <ReactMarkdown>{markdownContent}</ReactMarkdown>
        </div>
      </main>
    </div>
  );
}

export default App;
