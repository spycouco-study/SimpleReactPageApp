import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatBot2.css';

function ChatBot({ onMarkdownUpdate }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [answers, setAnswers] = useState({});
    const [openRequestInputs, setOpenRequestInputs] = useState(new Set());
    const [additionalAnswers, setAdditionalAnswers] = useState({});
    const [submittedGroups, setSubmittedGroups] = useState(new Set());
    const messagesEndRef = useRef(null);

    const hasUnansweredQuestions = () => {
        // 마지막 봇 메시지 그룹을 찾아서 답변이 필요한 질문이 있는지 확인
        const lastBotGroup = [...messages].reverse().find(msg => 
            msg.sender === 'bot' && !msg.text.includes('응답을 생성하는 중입니다...')
        );

        if (!lastBotGroup) return false;

        // 질문에 대한 답변이 모두 있는지 확인
        const allQuestionsAnswered = messages
            .filter(msg => msg.sender === 'bot' && msg.type === 'question')
            .every((msg, index) => answers[`q-${index}`]?.trim());

        // 추가 요청에 대한 답변이 모두 있는지 확인
        const allAdditionalAnswered = Array.from(openRequestInputs)
            .every(requestId => additionalAnswers[requestId]?.trim());

        return !(allQuestionsAnswered && allAdditionalAnswered);
    };

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
                                messages: [message],
                                isLastGroup: index === messages.length - 1 || 
                                           messages[index + 1]?.sender === 'user' ||
                                           messages[index + 1]?.text === '응답을 생성하는 중입니다...'
                            });
                        } else {
                            // 기존 봇 메시지 그룹에 추가
                            const lastItem = result[result.length - 1];
                            if (lastItem.isGroup) {
                                lastItem.messages.push(message);
                                lastItem.isLastGroup = index === messages.length - 1 || 
                                                     messages[index + 1]?.sender === 'user' ||
                                                     messages[index + 1]?.text === '응답을 생성하는 중입니다...';
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
                                                        disabled={submittedGroups.has(`group-${index}`)}
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
                                {item.isLastGroup && (
                                    <div className="additional-request">
                                        {Array.from(openRequestInputs).map((requestId, requestIndex) => (
                                            <div key={requestId} className="message bot with-input">
                                                {!submittedGroups.has(`group-${index}`) && (
                                                    <button 
                                                        className="delete-request"
                                                        onClick={() => {
                                                            setOpenRequestInputs(prev => {
                                                                const newSet = new Set(prev);
                                                                newSet.delete(requestId);
                                                                return newSet;
                                                            });
                                                            setAdditionalAnswers(prev => {
                                                                const newAnswers = { ...prev };
                                                                delete newAnswers[requestId];
                                                                return newAnswers;
                                                            });
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    className="answer-input"
                                                    value={additionalAnswers[requestId] || ''}
                                                    disabled={submittedGroups.has(`group-${index}`)}
                                                    placeholder="추가 요청을 입력하세요..."
                                                    onChange={(e) => {
                                                        setAdditionalAnswers(prev => ({
                                                            ...prev,
                                                            [requestId]: e.target.value
                                                        }));
                                                    }}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                                            handleSubmit({
                                                                preventDefault: () => {},
                                                                target: { value: e.target.value }
                                                            });
                                                            setOpenRequestInputs(prev => {
                                                                const newSet = new Set(prev);
                                                                newSet.delete(requestId);
                                                                return newSet;
                                                            });
                                                            setAdditionalAnswers(prev => {
                                                                const newAnswers = { ...prev };
                                                                delete newAnswers[requestId];
                                                                return newAnswers;
                                                            });
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ))}
                                        <div 
                                            className="message bot clickable-message"
                                            onClick={() => {
                                                setOpenRequestInputs(prev => {
                                                    const newSet = new Set(prev);
                                                    newSet.add(`request-${Date.now()}`);
                                                    return newSet;
                                                });
                                            }}
                                        >
                                            요청 추가하기
                                        </div>
                                        <div className="submit-group">
                                            <button 
                                                className="submit-button"
                                                disabled={
                                                    // 기존 질문들의 답변 확인
                                                    !item.messages.every((msg, msgIndex) => 
                                                        msg.type === 'comment' || 
                                                        answers[`q-${index}-${msgIndex}`]?.trim()
                                                    ) ||
                                                    // 추가 요청 입력창이 있고 답변이 비어있는 경우 체크
                                                    Array.from(openRequestInputs).some(requestId => 
                                                        !additionalAnswers[requestId]?.trim()
                                                    )
                                                }
                                                onClick={async () => {
                                                    // 질문-답변 쌍 수집
                                                    const questionAnswerPairs = item.messages
                                                        .filter(msg => msg.type !== 'comment')
                                                        .map((msg, msgIndex) => ({
                                                            question: msg.text,
                                                            answer: answers[`q-${index}-${msgIndex}`]
                                                        }));
                                                    
                                                    // 추가 요청과 답변 수집
                                                    const additionalRequests = Array.from(openRequestInputs)
                                                        .map(requestId => ({
                                                            request: additionalAnswers[requestId]
                                                        }));

                                                    // 서버로 전송할 데이터 구성
                                                    // JSON 데이터를 문자열로 변환
                                                    const submitData = JSON.stringify({
                                                        mainQuestions: questionAnswerPairs,
                                                        additionalRequests: additionalRequests
                                                    });

                                                    try {
                                                        const response = await axios.post('/test', submitData, {
                                                            headers: {
                                                                'Content-Type': 'text/plain'
                                                            }
                                                        });
                                                        
                                                        // 전송한 데이터와 받은 응답을 상세히 출력
                                                        console.group('서버 통신 상세 정보');
                                                        console.log('전송한 데이터:', JSON.parse(submitData));
                                                        console.log('서버 응답 전체:', response);
                                                        console.log('서버 응답 데이터:', response.data);
                                                        console.log('서버 응답 상태:', response.status);
                                                        console.groupEnd();
                                                        
                                                        if (response.data.status === 'success') {
                                                            // 성공 메시지 추가
                                                            setMessages(prev => [...prev, {
                                                                text: response.data.message || '답변이 성공적으로 제출되었습니다.',
                                                                sender: 'bot',
                                                                type: 'comment'
                                                            }]);

                                                            // 현재 그룹을 제출 완료 상태로 표시
                                                            setSubmittedGroups(prev => {
                                                                const newSet = new Set(prev);
                                                                newSet.add(`group-${index}`);
                                                                return newSet;
                                                            });
                                                        } else {
                                                            // 서버에서 오류 응답을 보낸 경우
                                                            throw new Error(response.data.message || '서버 처리 중 오류가 발생했습니다.');
                                                        }
                                                    } catch (error) {
                                                        console.group('서버 통신 오류');
                                                        console.error('오류 객체:', error);
                                                        console.error('오류 메시지:', error.message);
                                                        if (error.response) {
                                                            console.error('서버 응답 상태:', error.response.status);
                                                            console.error('서버 응답 데이터:', error.response.data);
                                                        }
                                                        console.groupEnd();
                                                        // 에러 메시지 추가
                                                        setMessages(prev => [...prev, {
                                                            text: '답변 제출 중 오류가 발생했습니다. 다시 시도해 주세요.',
                                                            sender: 'bot',
                                                            type: 'comment'
                                                        }]);
                                                    }
                                                    // TODO: 여기에 서버 제출 로직 추가
                                                }}
                                            >
                                                제출
                                            </button>
                                        </div>
                                    </div>
                                )}
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
                        if (e.key === 'Enter' && !e.shiftKey && !hasUnansweredQuestions()) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                    placeholder={hasUnansweredQuestions() ? 
                        "모든 질문에 답변을 입력해주세요." : 
                        "메시지를 입력하세요... (Shift + Enter로 줄바꿈)"}
                    className="chat-input"
                    disabled={hasUnansweredQuestions()}
                />
                <button 
                    type="submit" 
                    className="send-button"
                    disabled={hasUnansweredQuestions()}
                >
                    전송
                </button>
            </form>
        </div>
    );
}

export default ChatBot;
