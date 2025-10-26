import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; 

// 기본 API 주소 (더미 데이터 사용)
const BASE_URL = 'https://jsonplaceholder.typicode.com/posts'; 

function App() {
  const [posts, setPosts] = useState([]); // 게시물 목록 상태
  const [newTitle, setNewTitle] = useState(''); // 새 게시물 제목 입력 상태
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // **********************************
  // 1. GET (Read): 게시물 목록 가져오기
  // **********************************
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get(`${BASE_URL}?_limit=5`); // 5개만 가져오기
        setPosts(response.data);
        setError(null);
      } catch (err) {
        setError('게시물을 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  // **********************************
  // 2. POST (Create): 새로운 게시물 추가
  // **********************************
  const handleCreate = async () => {
    if (!newTitle) return;

    // 서버로 보낼 데이터 (Payload)
    const newPostData = {
      title: newTitle,
      body: 'POST 요청으로 추가된 내용',
      userId: 1,
    };

    try {
      // POST 요청: 서버에 새 데이터를 생성하도록 요청
      const response = await axios.post(BASE_URL, newPostData); 
      
      // 서버에서 새로 생성된 항목을 응답으로 받음. (id는 서버가 지정)
      // 화면에 즉시 반영하기 위해 기존 목록에 추가
      setPosts(prevPosts => [response.data, ...prevPosts]); 
      setNewTitle(''); // 입력 필드 초기화
      alert('게시물 추가 성공!');

    } catch (err) {
      alert('게시물 추가에 실패했습니다.');
    }
  };

  // **********************************
  // 3. PUT/PATCH (Update): 게시물 내용 수정
  // **********************************
  const handleUpdate = async (id) => {
    const updatedTitle = prompt('새로운 제목을 입력하세요 (ID: ' + id + ')');
    if (!updatedTitle) return;

    const updateData = { title: updatedTitle };

    try {
      // PUT 요청: 해당 ID의 리소스를 업데이트하도록 요청
      const response = await axios.put(`${BASE_URL}/${id}`, updateData); 
      
      // 화면 업데이트: 목록에서 해당 ID를 찾아 새 데이터로 교체
      setPosts(prevPosts => prevPosts.map(post => 
        post.id === id ? { ...post, title: response.data.title } : post
      ));
      alert('게시물 수정 성공!');

    } catch (err) {
      alert('게시물 수정에 실패했습니다.');
    }
  };

  // **********************************
  // 4. DELETE (Delete): 게시물 삭제
  // **********************************
  const handleDelete = async (id) => {
    if (!window.confirm('정말로 이 게시물을 삭제하시겠습니까?')) return;

    try {
      // DELETE 요청: 해당 ID의 리소스를 삭제하도록 요청
      await axios.delete(`${BASE_URL}/${id}`); 
      
      // 화면 업데이트: 목록에서 해당 ID 항목을 제거
      setPosts(prevPosts => prevPosts.filter(post => post.id !== id));
      alert('게시물 삭제 성공!');

    } catch (err) {
      alert('게시물 삭제에 실패했습니다.');
    }
  };


  if (loading) return <div className="App">데이터 로딩 중...</div>;
  if (error) return <div className="App" style={{ color: 'red' }}>{error}</div>;

  return (
    <div className="App">
      <header>
        <h1>REST API CRUD 테스트</h1>
        
        {/* POST (Create) 영역 */}
        <div style={{ marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="새 게시물 제목"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ padding: '8px', marginRight: '10px' }}
          />
          <button onClick={handleCreate} style={{ padding: '8px 15px' }}>
            POST (추가)
          </button>
        </div>
      </header>

      {/* GET, PUT, DELETE 영역 */}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {posts.map(post => (
          <li key={post.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '10px' }}>
            <strong>ID: {post.id}</strong> 
            <p style={{ margin: '5px 0' }}>{post.title}</p>
            <button 
              onClick={() => handleUpdate(post.id)} 
              style={{ marginRight: '10px', padding: '5px 10px' }}
            >
              PUT (수정)
            </button>
            <button 
              onClick={() => handleDelete(post.id)} 
              style={{ padding: '5px 10px' }}
            >
              DELETE (삭제)
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;