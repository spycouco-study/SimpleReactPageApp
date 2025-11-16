import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './MediaExplorer.css';

/*
  MediaExplorer
  - FastAPI 보안 정책 반영: 각 게임의 최상위 폴더 아래 단일 'assets' 하위 폴더만 접근 허용.
    (ex) /static/{game_name}/assets/파일명
  - 서버는 /assets?game_name=... 호출 시 파일 확장자로 이미지/사운드를 분류하여
    { images: [{ name, url }], sounds: [{ name, url }] } 형태로 응답.
  - 프론트는 해당 url 그대로 사용 (상대경로이므로 CRA proxy 설정을 통해 8000 포트로 전달).
  - 이미지 클릭: 미리보기 모달, 사운드: 오디오 컨트롤 재생.

  API 응답 예:
    GET /assets?game_name=alp_game
    {
      "images": [ { "name": "bg.png", "url": "/static/alp_game/assets/bg.png" } ],
      "sounds": [ { "name": "bgm.mp3", "url": "/static/alp_game/assets/bgm.mp3" } ]
    }

  참고: 파일 변경 후 최신 썸네일을 강제로 갱신하고 싶으면 timestamp 쿼리를 추가해 캐시를 회피.
*/

function MediaExplorer({ gameName, isLocked, refreshToken }) {
  const [assets, setAssets] = useState({ images: [], sounds: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const fetchAssets = async () => {
    if (!isLocked || !gameName || !gameName.trim()) {
      setAssets({ images: [], sounds: [] });
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/assets', {
        params: { game_name: gameName, _t: Date.now() },
        headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
      });
      const data = res?.data;
      const images = Array.isArray(data?.images) ? data.images : [];
      const sounds = Array.isArray(data?.sounds) ? data.sounds : [];
      setAssets({ images, sounds });
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      setError('자산 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // gameName 확정 후 또는 스냅샷 갱신(refreshToken 변화) 시에만 로드
  useEffect(() => {
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  return (
    <div className="media-explorer">
      <div className="media-header">
        <h2>에셋 보기</h2>
        <button onClick={fetchAssets} disabled={loading || !isLocked || !gameName?.trim()}>
          {loading ? '새로고침 중…' : '새로고침'}
        </button>
      </div>
      {!isLocked && (
        <div className="media-hint">게임 이름을 확정하면 에셋을 불러옵니다.</div>
      )}
      {error && <div className="media-error">{error}</div>}

      <div className="media-sections">
        <section className="media-section">
          <h3>이미지</h3>
          <div className="thumb-grid">
            {assets.images.length === 0 && <div className="empty">이미지가 없습니다.</div>}
            {assets.images.map((img, i) => (
              <div key={i} className="thumb-card" title={img.name} onClick={() => setPreviewUrl(img.url)}>
                <div className="thumb thumb-image" style={{ backgroundImage: `url(${img.url})` }} />
                <div className="thumb-name" title={img.name}>{img.name}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="media-section">
          <h3>사운드</h3>
          <div className="thumb-grid">
            {assets.sounds.length === 0 && <div className="empty">사운드가 없습니다.</div>}
            {assets.sounds.map((snd, i) => (
              <div key={i} className="thumb-card" title={snd.name}>
                <div className="thumb thumb-audio" onClick={(e) => e.currentTarget.parentElement?.querySelector('audio')?.play()}>
                  <span className="audio-icon">🔊</span>
                </div>
                <div className="thumb-name" title={snd.name}>{snd.name}</div>
                <div className="audio-player">
                  <audio controls preload="none" src={snd.url} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {previewUrl && (
        <div className="modal" onClick={() => setPreviewUrl(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="preview" />
            <button className="close" onClick={() => setPreviewUrl(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MediaExplorer;
