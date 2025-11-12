import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatBot.css';

function ChatBot({ onMarkdownUpdate, gameName }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

        // 현재 입력 메시지 저장 후 입력창 초기화
        const currentMessage = inputMessage;
        setInputMessage('');

        // 사용자 메시지를 대화 목록에 추가
        const userMessage = {
            text: currentMessage,
            sender: 'user'
        };
        setMessages(prev => [...prev, userMessage]);

        // 임시 응답 메시지 추가
        const tempBotMessage = {
            id: Date.now(),
            text: '응답을 생성하는 중입니다...',
            sender: 'bot'
        };
        setMessages(prev => [...prev, tempBotMessage]);

        try {
            // 서버로 메시지 전송
            const response = await axios.post('/process-code', {
                message: currentMessage,
                game_name: gameName || ''
            });

            // 임시 메시지를 실제 응답으로 교체
            setMessages(prev => prev.map(msg => 
                msg.id === tempBotMessage.id
                    ? { text: response.data.reply, sender: 'bot' }
                    : msg
            ));
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
                    <div key={message.id || index} className={`message ${message.sender}`}>
                        {message.text}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={handleSubmit}>
                <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                    placeholder="메시지를 입력하세요... (Shift + Enter로 줄바꿈)"
                    className="chat-input"
                />
                <button type="submit" className="send-button">전송</button>
            </form>
        </div>
    );
}

export default ChatBot;
