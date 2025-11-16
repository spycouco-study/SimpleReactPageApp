import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './MediaExplorer.css';

/*
  MediaExplorer
  - 서버에서 이미지/오디오 자산 목록을 불러와 그리드 썸네일로 표시
  - 이미지 클릭: 큰 미리보기 모달 표시
  - 오디오 클릭: 카드 내 오디오 플레이어 표시

  예상 API (조정 가능):
  GET /assets?game_name=... -> {
    images: [{ name, url }...],
    sounds: [{ name, url }...]
  }
*/

function MediaExplorer({ gameName }) {
  const [assets, setAssets] = useState({ images: [], sounds: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const fetchAssets = async () => {
    if (!gameName || !gameName.trim()) {
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

  useEffect(() => {
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameName]);

  return (
    <div className="media-explorer">
      <div className="media-header">
        <h2>에셋 보기</h2>
        <button onClick={fetchAssets} disabled={loading || !gameName?.trim()}>
          {loading ? '새로고침 중…' : '새로고침'}
        </button>
      </div>
      {!gameName?.trim() && (
        <div className="media-hint">게임 이름을 확정하면 자산을 불러올 수 있어요.</div>
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
                <div className="thumb thumb-audio" onClick={(e) => e.currentTarget.nextSibling?.querySelector('audio')?.play()}>
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
