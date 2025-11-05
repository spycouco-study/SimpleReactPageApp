import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatBot2.css';

function ChatBot({ onMarkdownUpdate }) {
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
            //const response = await axios.post('/process-code', {
            const response = await axios.post('/question', {
                message: currentMessage
            });

            // 서버 응답을 파싱하여 여러 메시지로 분리
            const responseData = JSON.parse(response.data.reply);
            
            // 임시 메시지 제거
            setMessages(prev => prev.filter(msg => msg.id !== tempBotMessage.id));
            
            // 코멘트가 있다면 추가
            if (responseData.comment) {
                setMessages(prev => [...prev, {
                    text: responseData.comment,
                    sender: 'bot'
                }]);
            }
            
            // 질문들 추가
            if (responseData.questions && Array.isArray(responseData.questions)) {
                responseData.questions.forEach(question => {
                    if (question) {  // 빈 문자열이 아닌 경우만 추가
                        setMessages(prev => [...prev, {
                            text: question,
                            sender: 'bot'
                        }]);
                    }
                });
            }
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
