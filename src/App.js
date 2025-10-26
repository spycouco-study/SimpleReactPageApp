import React from 'react';
import './App.css';
import ChatBot from './components/ChatBot';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>알아서 만들어 주는 AI 놀이공원, Alparka!</h1>
      </header>
      <main>
        <ChatBot />
      </main>
    </div>
  );
}

export default App;