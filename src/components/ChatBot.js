import React, { useState } from 'react';
import axios from 'axios';
import './ChatBot.css';

function ChatBot({ onMarkdownUpdate }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');

    const handleRevert = async () => {
        try {
            const response = await axios.post('/revert');
            // 챗봇 응답을 대화 목록에 추가
            const botMessage = {
                text: response.data.reply || '이전 상태로 되돌렸습니다.',
                sender: 'bot'
            };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                text: '되돌리기 작업 중 오류가 발생했습니다.',
                sender: 'bot'
            }]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        // 사용자 메시지를 대화 목록에 추가
        const userMessage = {
            text: inputMessage,
            sender: 'user'
        };
        setMessages(prev => [...prev, userMessage]);

        try {
            // 서버로 메시지 전송 (서버 URL을 적절히 수정해주세요)
            const response = await axios.post('/process-code', {
                message: inputMessage
            });

            // 챗봇 응답을 대화 목록에 추가
            const botMessage = {
                text: response.data.reply,
                sender: 'bot'
            };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Error:', error);
            // 에러 메시지 표시
            setMessages(prev => [...prev, {
                text: '죄송합니다. 오류가 발생했습니다.',
                sender: 'bot'
            }]);
        }

        setInputMessage('');
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
                    <div key={index} className={`message ${message.sender}`}>
                        {message.text}
                    </div>
                ))}
            </div>
            <form className="chat-input-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="메시지를 입력하세요..."
                    className="chat-input"
                />
                <button type="submit" className="send-button">전송</button>
            </form>
        </div>
    );
}

export default ChatBot;
