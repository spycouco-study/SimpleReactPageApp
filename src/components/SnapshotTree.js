import React, { useMemo, useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './SnapshotTree.css';

// 기본 스냅샷 데이터 (사용자가 제공한 예시)
const DEFAULT_SNAPSHOTS = {
  versions: [
    // {
    //   version: 'v1-1',
    //   parent: null,
    //   timestamp: '2025-11-11T15:59:22.534617',
    //   summary: '',
    //   is_latest: false,
    //   is_current: false,
    // },
    // {
    //   version: 'v2-1',
    //   parent: 'v1-1',
    //   timestamp: '2025-11-11T15:59:51.776138',
    //   summary: '',
    //   is_latest: false,
    //   is_current: false,
    // },
    // {
    //   version: 'v2-2',
    //   parent: 'v1-1',
    //   timestamp: '2025-11-11T16:00:44.291699',
    //   summary: '',
    //   is_latest: false,
    //   is_current: false,
    // },
    // {
    //   version: 'v3-1',
    //   parent: 'v2-1',
    //   timestamp: '2025-11-11T16:02:52.116514',
    //   summary: '',
    //   is_latest: true,
    //   is_current: true,
    // },
  ],
};

// 버전 배열을 트리(루트들)로 변환
function buildTree(versions) {
  const map = new Map();
  versions.forEach((v) => {
    map.set(v.version, { ...v, children: [] });
  });
  const roots = [];
  versions.forEach((v) => {
    const node = map.get(v.version);
    if (v.parent) {
      const parent = map.get(v.parent);
      if (parent) parent.children.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortByTime = (a, b) => new Date(a.timestamp) - new Date(b.timestamp);
  const sortRec = (n) => {
    n.children.sort(sortByTime);
    n.children.forEach(sortRec);
  };
  roots.sort(sortByTime);
  roots.forEach(sortRec);
  return roots;
}

// 간단한 계층 레이아웃: 리프를 위에서 아래로 배치하고 내부 노드는 자식의 평균 y
// 수직 레이아웃(위→아래): y는 depth 기반, x는 리프 순서/자식 평균
function layoutTreeVertical(roots, hGap = 110, vGap = 110, margin = 50) {
  let xCounter = 0; // 리프별 가로 위치 증가
  const nodes = [];
  const edges = [];
  let maxDepth = 0;

  function dfs(node, depth) {
    maxDepth = Math.max(maxDepth, depth);
    node.depth = depth;
    if (!node.children || node.children.length === 0) {
      node._tx = xCounter * hGap;
      xCounter += 1;
    } else {
      node.children.forEach((ch) => dfs(ch, depth + 1));
      const avg = node.children.reduce((s, c) => s + c._tx, 0) / node.children.length;
      node._tx = avg;
    }
    nodes.push(node);
    if (node.children) node.children.forEach((ch) => edges.push([node, ch]));
  }

  roots.forEach((r) => dfs(r, 0));

  const minX = Math.min(...nodes.map((n) => n._tx));
  const maxX = Math.max(...nodes.map((n) => n._tx));
  // 라벨 텍스트와 여백이 우측에서 잘리지 않도록 추가 패딩
  const rightLabelPadding = 120; // 라벨 대략 길이만큼 확보
  const width = margin * 2 + (maxX - minX || hGap) + rightLabelPadding;
  const height = margin * 2 + maxDepth * vGap;

  const placed = nodes.map((n) => ({
    ...n,
  x: margin + (n._tx - minX),
    y: margin + n.depth * vGap,
  }));

  const placedMap = new Map(placed.map((n) => [n.version, n]));
  const placedEdges = edges.map(([p, c]) => [placedMap.get(p.version), placedMap.get(c.version)]);
  return { width, height, nodes: placed, edges: placedEdges };
}

export default function SnapshotTree({ data = DEFAULT_SNAPSHOTS, gameName, onSnapshotUpdate, showImportExport = true }) {
  const [customData, setCustomData] = useState(null);
  const [versions, setVersions] = useState(data?.versions || []);
  const [selected, setSelected] = useState(null); // 선택된 버전 오브젝트
  const [isApplying, setIsApplying] = useState(false);
  const fileRef = useRef(null);
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const wasDraggingRef = useRef(false);

  const MIN_SCALE = 0.7;
  const MAX_SCALE = 2.5;

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // 외부 data prop이 변경되면, 사용자 업로드(customData)가 없는 경우에만 동기화
  useEffect(() => {
    if (!customData) {
      setVersions(data?.versions || []);
      setSelected(null);
    }
  }, [data, customData]);

  // 외부 data 혹은 업로드 데이터 변화에 따라 versions 상태 갱신
  const effectiveData = useMemo(() => (customData ? customData : { versions }), [customData, versions]);

  const roots = useMemo(() => buildTree(effectiveData?.versions || []), [effectiveData]);
  const { width, height, nodes, edges } = useMemo(() => layoutTreeVertical(roots), [roots]);

  // 초기 확대 비율: 콘텐츠가 래퍼보다 크면 최소 배율로 시작, 아니면 1로 시작
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      const cs = window.getComputedStyle(el);
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      const availW = el.clientWidth - padX;
      const availH = el.clientHeight - padY;
      const needScrollX = width > availW;
      const needScrollY = height > availH;
      const next = (needScrollX || needScrollY) ? MIN_SCALE : 1;
      if (scaleRef.current !== next) {
        scaleRef.current = next;
        setScale(next);
      }
      // 초기 위치를 좌상단으로
      el.scrollLeft = 0;
      el.scrollTop = 0;
    } catch (_e) {
      // 측정 실패 시 무시
    }
  }, [width, height, versions]);

  // 스냅샷 갱신 시 현재 버전 노드를 중앙에 보이도록 스크롤 조정
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !nodes.length) return;
    const target = nodes.find(n => n.is_current) || nodes.find(n => n.is_latest) || nodes[0];
    if (!target) return;
    const s = scaleRef.current || 1;
    // 콘텐츠 좌표를 뷰 중앙에 위치시키기 위한 스크롤 계산
    const desiredLeft = Math.max(0, target.x * s - el.clientWidth / 2);
    const desiredTop = Math.max(0, target.y * s - el.clientHeight / 2);
    requestAnimationFrame(() => {
      el.scrollLeft = desiredLeft;
      el.scrollTop = desiredTop;
    });
  }, [nodes, scale]);

  // 드래그 패닝 + Ctrl+휠 줌
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0, startY = 0;
    let lastX = 0, lastY = 0;

    const onMouseDown = (e) => {
      if (e.button !== 0) return; // 좌클릭만
      isDown = true;
      startX = e.clientX; startY = e.clientY;
      lastX = e.clientX; lastY = e.clientY;
      el.classList.add('dragging');
      // 텍스트 선택 방지
      e.preventDefault();
    };
    const onMouseMove = (e) => {
      if (!isDown) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 3) {
        wasDraggingRef.current = true;
      }
      el.scrollLeft -= dx;
      el.scrollTop -= dy;
      lastX = e.clientX; lastY = e.clientY;
    };
    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      el.classList.remove('dragging');
      // 클릭과 구분되도록 잠깐 뒤에 해제
      setTimeout(() => { wasDraggingRef.current = false; }, 50);
    };

    const onWheel = (e) => {
      if (!e.ctrlKey) return; // 일반 스크롤은 통과
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseXInView = e.clientX - rect.left;
      const mouseYInView = e.clientY - rect.top;
      const preContentX = (el.scrollLeft + mouseXInView) / scaleRef.current;
      const preContentY = (el.scrollTop + mouseYInView) / scaleRef.current;

      const direction = e.deltaY < 0 ? 1 : -1; // 위로 굴리면 확대
      const factor = direction > 0 ? 1.1 : 0.9;
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current * factor));
      if (next === scaleRef.current) return;
      setScale(next);

      // 포인터 고정 줌: 포인터 위치가 가리키던 콘텐츠 좌표 유지
      // 다음 프레임에 스크롤 보정
      requestAnimationFrame(() => {
        el.scrollLeft = preContentX * next - mouseXInView;
        el.scrollTop = preContentY * next - mouseYInView;
      });
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', endDrag);
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', endDrag);
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        if (json?.versions && Array.isArray(json.versions)) {
          setCustomData(json);
          setVersions(json.versions);
        } else {
          alert('올바른 형식이 아닙니다. { versions: [...] } 필요');
        }
      } catch (err) {
        alert('JSON 파싱 오류: ' + err.message);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    try {
      const payload = JSON.stringify({ versions }, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'snapshots.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('내보내기 실패: ' + err.message);
    }
  };

  if (!nodes.length) {
    return (
      <div className="snapshot-tree graph">
        {showImportExport && (
          <div className="st-toolbar">
            <button onClick={() => fileRef.current?.click()}>JSON 불러오기</button>
            <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleFile} />
            {customData && (
              <button onClick={() => setCustomData(null)}>기본 데이터로 복원</button>
            )}
          </div>
        )}
        <div className="st-empty">스냅샷이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="snapshot-tree graph">
      {showImportExport && (
        <div className="st-toolbar">
          <button onClick={() => fileRef.current?.click()}>JSON 불러오기</button>
          <button onClick={handleExport}>JSON 내보내기</button>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleFile} />
          {customData && (
            <button onClick={() => { setCustomData(null); setVersions(data?.versions || []); setSelected(null); }}>기본 데이터로 복원</button>
          )}
        </div>
      )}
  <div className="st-graph-wrap" ref={wrapRef}>
  <div className="st-canvas" style={{ width: width, height: height, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
  <svg width={width} height={height}>
        <g className="st-edges">
          {edges.map(([p, c], idx) => (
            <path
              key={idx}
              d={`M ${p.x} ${p.y} C ${p.x} ${(p.y + c.y) / 2}, ${c.x} ${(p.y + c.y) / 2}, ${c.x} ${c.y}`}
              className="st-edge curved"
            />
          ))}
        </g>
        <g className="st-nodes">
          {nodes.map((n) => {
            const baseCircleClass = `st-node ${n.is_current ? 'current' : ''} ${(!n.is_current && n.is_latest) ? 'latest' : ''}`.trim();
            return (
              <g key={n.version} className="st-node-g" transform={`translate(${n.x}, ${n.y})`} onClick={() => { if (!wasDraggingRef.current) setSelected(n); }}>
                <circle r={20} className={baseCircleClass} />
                {n.is_current && <circle r={12} className="st-node-current-dot" />}
                <text className="st-label" x={26} y={2}>{n.version}</text>
                <text className="st-sub" x={26} y={18}>{(() => { try { const d = new Date(n.timestamp); return d.toLocaleString(); } catch { return n.timestamp; } })()}</text>
              </g>
            );
          })}
        </g>
      </svg>
  </div>
      </div>

      {selected && (
        <div className="st-detail">
          <div className="st-detail-header">
            <strong>{selected.version}</strong>
            <button className="st-detail-close" onClick={() => setSelected(null)}>닫기</button>
          </div>
          <div className="st-detail-body">
            <div><b>버전:</b> {selected.version}</div>
            <div><b>부모:</b> {selected.parent ?? '(없음)'}</div>
            <div><b>시간:</b> {(() => { try { const d = new Date(selected.timestamp); return d.toLocaleString(); } catch { return selected.timestamp; } })()}</div>
            <div><b>요약:</b> {selected.summary || '(요약 없음)'}</div>
            <div><b>현재 여부:</b> {selected.is_current ? 'true' : 'false'}</div>
            <div style={{ marginTop: 12 }}>
              <button
                disabled={isApplying}
                onClick={async () => {
                  if (!selected) return;
                  setIsApplying(true);
                  try {
                    // 1) 서버에 복원 요청 (복원 대상 버전명 포함)
                    await axios.post('/restore-version', {
                      version: selected.version,
                      game_name: gameName || ''
                    });

                    // 2) 최신 스냅샷 로그 재요청하여 화면 갱신
                    const snapRes = await axios.get('/snapshot-log', {
                      params: {
                        game_name: gameName || ''
                      }
                    });
                    const data = snapRes?.data;
                    if (data && Array.isArray(data.versions)) {
                      // 전역(부모) 갱신 콜백이 있으면 우선 전달
                      if (onSnapshotUpdate) {
                        onSnapshotUpdate(data);
                      }
                      // 로컬 상태도 동기화 (customData는 사용자 업로드 전용)
                      setVersions(data.versions);
                      // 선택 상태를 최신 데이터의 해당 버전으로 업데이트
                      const updatedSel = data.versions.find(v => v.version === selected.version) || null;
                      setSelected(updatedSel);
                    } else {
                      console.warn('스냅샷 응답 형식이 올바르지 않습니다. { versions: [...] } 예상');
                    }
                  } catch (err) {
                    console.error('버전 복원 중 오류:', err);
                    alert('버전 복원 중 오류가 발생했습니다.');
                  } finally {
                    setIsApplying(false);
                  }
                }}
              >
                {isApplying ? '적용 중…' : '현재 버전으로 설정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
