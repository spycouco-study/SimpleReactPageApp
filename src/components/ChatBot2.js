import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatBot2.css';

function ChatBot({ onMarkdownUpdate }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [answers, setAnswers] = useState({});
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleAnswerSubmit = async (questionId, answer) => {
        try {
            // 답변을 서버로 전송
            const response = await axios.post('/answer', {
                questionId,
                answer
            });

            // 답변을 메시지 목록에 추가
            if (response.data.reply) {
                setMessages(prev => [...prev, {
                    text: answer,
                    sender: 'user'
                }]);
            }

            // 답변 입력창 초기화
            setAnswers(prev => ({
                ...prev,
                [questionId]: ''
            }));
        } catch (error) {
            console.error('Error submitting answer:', error);
        }
    };

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
            
            // 코멘트와 질문들을 함께 그룹으로 추가
            if (responseData.comment || (responseData.questions && responseData.questions.length > 0)) {
                let newMessages = [];
                
                // 코멘트가 있다면 추가
                if (responseData.comment) {
                    newMessages.push({
                        text: responseData.comment,
                        sender: 'bot',
                        type: 'comment'
                    });
                }
                
                // 질문들 추가
                if (responseData.questions && Array.isArray(responseData.questions)) {
                    responseData.questions.forEach(question => {
                        if (question) {  // 빈 문자열이 아닌 경우만 추가
                            newMessages.push({
                                text: question,
                                sender: 'bot',
                                type: 'question'
                            });
                        }
                    });
                }

                setMessages(prev => [...prev, ...newMessages]);
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
                {messages.reduce((result, message, index) => {
                    if (message.sender === 'user') {
                        // 사용자 메시지는 개별적으로 처리
                        result.push(
                            <div key={message.id || index} className={`message ${message.sender}`}>
                                {message.text}
                            </div>
                        );
                    } else if (message.text === '응답을 생성하는 중입니다...') {
                        // 임시 응답 메시지는 별도로 처리
                        result.push(
                            <div key={message.id || index} className="message bot loading">
                                {message.text}
                            </div>
                        );
                    } else {
                        // 봇 메시지는 그룹화
                        if (index === 0 || messages[index - 1].sender !== 'bot') {
                            // 새로운 봇 메시지 그룹 시작
                            result.push({
                                isGroup: true,
                                messages: [message]
                            });
                        } else {
                            // 기존 봇 메시지 그룹에 추가
                            const lastItem = result[result.length - 1];
                            if (lastItem.isGroup) {
                                lastItem.messages.push(message);
                            }
                        }
                    }
                    return result;
                }, []).map((item, index) => {
                    if (item.isGroup) {
                        // 봇 메시지 그룹 렌더링
                        return (
                            <div key={`group-${index}`} className="message-group bot">
                                {item.messages.map((message, messageIndex) => {
                                    if (message.type === 'comment') {
                                        return (
                                            <div key={message.id || messageIndex} className="bot-comment">
                                                {message.text}
                                            </div>
                                        );
                                    } else {
                                        const questionId = `q-${index}-${messageIndex}`;
                                        return (
                                            <div key={message.id || messageIndex} className="message-container">
                                                <div className="message bot">
                                                    {message.text}
                                                    <input
                                                        type="text"
                                                        className="answer-input"
                                                        placeholder="답변을 입력하세요..."
                                                        value={answers[questionId] || ''}
                                                        onChange={(e) => setAnswers(prev => ({
                                                            ...prev,
                                                            [questionId]: e.target.value
                                                        }))}
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter' && answers[questionId]?.trim()) {
                                                                handleAnswerSubmit(questionId, answers[questionId]);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    }
                                })}
                            </div>
                        );
                    }
                    // 개별 사용자 메시지 렌더링
                    return item;
                })}
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
