import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatBot.css';

function ChatBot({ onMarkdownUpdate, onSnapshotUpdate, onGameDataUpdate, loadedChat, gameName }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 외부에서 불러온 채팅 이력 반영
    useEffect(() => {
        if (Array.isArray(loadedChat)) {
            setMessages(loadedChat);
        }
    }, [loadedChat]);

    // 공통: 스냅샷 로그 및 게임 데이터 최신화
    const refreshSnapshotAndGameData = async () => {
        try {
            const snapRes = await axios.get('/snapshot-log', {
                params: {
                    game_name: gameName || '',
                    _t: Date.now(), // 캐시 방지
                },
                headers: {
                    'Cache-Control': 'no-cache',
                },
            });
            const data = snapRes?.data;
            if (data && onSnapshotUpdate) {
                onSnapshotUpdate(data);
            }
        } catch (snapErr) {
            console.warn('스냅샷 로그 가져오기 실패:', snapErr);
        }
        // 이어서 게임 데이터 갱신
        if (onGameDataUpdate && gameName) {
            try {
                const gdRes = await axios.get('/game_data', {
                    params: { game_name: gameName || '', _t: Date.now() },
                    headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
                });
                const payload = gdRes?.data;
                if (payload && typeof payload === 'object') {
                    onGameDataUpdate(payload);
                } else {
                    console.warn('예상치 못한 /game_data 응답 형식:', payload);
                }
            } catch (gdErr) {
                console.warn('게임 데이터 갱신 실패(/game_data):', gdErr);
            }
        }
    };

    const handleRevert = async () => {
        try {
            const response = await axios.post('/revert', {
                game_name: gameName || ''
            });

            const botMessage = {
                text: response.data.reply || '이전 상태로 되돌렸습니다.',
                sender: 'bot'
            };
            setMessages(prev => [...prev, botMessage]);

            // 스냅샷 + 게임 데이터 갱신
            await refreshSnapshotAndGameData();
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                text: '서버 오류 발생(되돌리기 작업).',
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

            if (response.data.status === 'success') {
                // 성공적인 응답 처리
                // 임시 메시지를 실제 응답으로 교체
                setMessages(prev => prev.map(msg => 
                    msg.id === tempBotMessage.id
                        ? { text: response.data.reply, sender: 'bot' }
                        : msg
                ));

                // 스냅샷/게임 데이터 최신화
                await refreshSnapshotAndGameData();
            }
            else{
                // 오류 응답 처리
                setMessages(prev => prev.map(msg => 
                    msg.id === tempBotMessage.id
                        ? { text: '서버 오류: ' + response.data.reply, sender: 'bot' }
                        : msg
                ));
            }
        } catch (error) {
            console.error('Error:', error);
            // 에러 메시지 표시
            setMessages(prev => [...prev, {
                text: '서버 오류 발생.',
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
