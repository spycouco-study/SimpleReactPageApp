import React, { useEffect, useState, useRef } from 'react';
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
  const [previewItem, setPreviewItem] = useState(null); // { type: 'image'|'sound', url, name }
  const didFetchRef = useRef(false);
  const lastTokenRef = useRef(refreshToken);
  const [assetStamp, setAssetStamp] = useState(0); // 캐시 무효화용 스탬프
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

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
  setAssetStamp(Date.now()); // 새 목록 수신 시 스탬프 갱신
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      setError('자산 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // gameName 확정 후 또는 스냅샷 갱신(refreshToken 변화) 시에만 로드
  useEffect(() => {
    if (!isLocked || !gameName || !gameName.trim()) return;
    if (!Number.isFinite(refreshToken) || refreshToken <= 0) return;

    // React 18 StrictMode에서는 mount 시 effect가 2번 호출될 수 있으므로
    // 동일 토큰으로 중복 호출을 방지
    if (didFetchRef.current && lastTokenRef.current === refreshToken) return;

    didFetchRef.current = true;
    lastTokenRef.current = refreshToken;
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken, isLocked, gameName]);

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
            {assets.images.map((img, i) => {
              const stampedUrl = assetStamp ? `${img.url}?v=${assetStamp}` : img.url;
              return (
              <div key={i} className="thumb-card" title={img.name} onClick={() => setPreviewItem({ type: 'image', url: stampedUrl, name: img.name })}>
                <div className="thumb thumb-image" style={{ backgroundImage: `url(${stampedUrl})` }} />
                <div className="thumb-name" title={img.name}>{img.name}</div>
              </div>
            );})}
          </div>
        </section>

        <section className="media-section">
          <h3>사운드</h3>
          <div className="thumb-grid">
            {assets.sounds.length === 0 && <div className="empty">사운드가 없습니다.</div>}
            {assets.sounds.map((snd, i) => {
              const stampedUrl = assetStamp ? `${snd.url}?v=${assetStamp}` : snd.url;
              return (
              <div key={i} className="thumb-card" title={snd.name} onClick={() => setPreviewItem({ type: 'sound', url: stampedUrl, name: snd.name })}>
                <div className="thumb thumb-audio">
                  <span className="audio-icon">🔊</span>
                </div>
                <div className="thumb-name" title={snd.name}>{snd.name}</div>
              </div>
            );})}
          </div>
        </section>
      </div>

      {previewItem && (
        <div className="modal" onClick={() => setPreviewItem(null)}>
          <div className={`modal-body ${previewItem.type === 'sound' ? 'sound-modal' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{previewItem.name}</strong>
              <button className="close" onClick={() => setPreviewItem(null)}>닫기</button>
            </div>
            {previewItem.type === 'image' && (
              <img src={previewItem.url} alt={previewItem.name} />
            )}
            {previewItem.type === 'sound' && (
              <audio autoPlay controls src={previewItem.url} style={{ width: '100%', marginTop: '16px' }} />
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
              <button
                onClick={() => {
                  if (!fileInputRef.current) return;
                  fileInputRef.current.value = '';
                  fileInputRef.current.click();
                }}
                disabled={uploading}
              >
                {uploading ? '업로드 중…' : '다른 파일로 교체'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={previewItem.type === 'image' ? 'image/*' : 'audio/mpeg,.mp3'}
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!isLocked || !gameName?.trim()) {
                  alert('게임 이름을 먼저 확정해주세요.');
                  return;
                }
                // MP3만 허용 (프론트 선검증)
                if (previewItem.type === 'sound') {
                  const nameLower = file.name.toLowerCase();
                  if (!nameLower.endsWith('.mp3')) {
                    alert('사운드 교체는 MP3 파일만 가능합니다.');
                    return;
                  }
                }
                try {
                  setUploading(true);
                  const form = new FormData();
                  form.append('game_name', gameName);
                  form.append('old_name', previewItem.name);
                  form.append('file', file);
                  form.append('type', previewItem.type); // 서버는 typ 필드 기대
                  await axios.post('/replace-asset', form);
                  await fetchAssets();
                  const newStamp = Date.now();
                  setAssetStamp(newStamp);
                  setPreviewItem((cur) => cur ? { ...cur, url: `${cur.url.split('?')[0]}?v=${newStamp}` } : cur);
                } catch (err) {
                  console.error('replace-asset failed:', err);
                  alert('업로드 중 오류가 발생했습니다.');
                } finally {
                  setUploading(false);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default MediaExplorer;
