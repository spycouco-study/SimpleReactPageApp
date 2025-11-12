import React, { useMemo, useState, useRef, useEffect } from 'react';
import './SnapshotTree.css';

// 기본 스냅샷 데이터 (사용자가 제공한 예시)
const DEFAULT_SNAPSHOTS = {
  versions: [
    {
      version: 'v1-1',
      parent: null,
      timestamp: '2025-11-11T15:59:22.534617',
      summary: '',
      is_latest: false,
      is_current: false,
    },
    {
      version: 'v2-1',
      parent: 'v1-1',
      timestamp: '2025-11-11T15:59:51.776138',
      summary: '',
      is_latest: false,
      is_current: false,
    },
    {
      version: 'v2-2',
      parent: 'v1-1',
      timestamp: '2025-11-11T16:00:44.291699',
      summary: '',
      is_latest: false,
      is_current: false,
    },
    {
      version: 'v3-1',
      parent: 'v2-1',
      timestamp: '2025-11-11T16:02:52.116514',
      summary: '',
      is_latest: true,
      is_current: true,
    },
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
  const width = margin * 2 + (maxX - minX || hGap);
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

export default function SnapshotTree({ data = DEFAULT_SNAPSHOTS }) {
  const [customData, setCustomData] = useState(null);
  const [versions, setVersions] = useState(data?.versions || []);
  const [selected, setSelected] = useState(null); // 선택된 버전 오브젝트
  const fileRef = useRef(null);

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
        <div className="st-toolbar">
          <button onClick={() => fileRef.current?.click()}>JSON 불러오기</button>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleFile} />
          {customData && (
            <button onClick={() => setCustomData(null)}>기본 데이터로 복원</button>
          )}
        </div>
        <div className="st-empty">스냅샷이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="snapshot-tree graph">
      <div className="st-toolbar">
        <button onClick={() => fileRef.current?.click()}>JSON 불러오기</button>
        <button onClick={handleExport}>JSON 내보내기</button>
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleFile} />
        {customData && (
          <button onClick={() => { setCustomData(null); setVersions(data?.versions || []); setSelected(null); }}>기본 데이터로 복원</button>
        )}
      </div>
      <div className="st-graph-wrap">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMinYMin meet">
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
          {nodes.map((n) => (
            <g key={n.version} className="st-node-g" transform={`translate(${n.x}, ${n.y})`} onClick={() => setSelected(n)}>
              <circle r={20} className={`st-node ${n.is_current ? 'current' : n.is_latest ? 'latest' : ''}`} />
              <text className="st-label" x={26} y={2}>{n.version}</text>
              <text className="st-sub" x={26} y={18}>{(() => { try { const d = new Date(n.timestamp); return d.toLocaleString(); } catch { return n.timestamp; } })()}</text>
            </g>
          ))}
        </g>
      </svg>
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
                onClick={() => {
                  // 선택된 버전만 is_current = true, 나머지는 false
                  setVersions((prev) => prev.map((v) => ({
                    ...v,
                    is_current: v.version === selected.version,
                  })));
                  // customData가 있으면 동기화, 없으면 내부 versions 사용 중이므로 그대로
                  if (customData) {
                    setCustomData((prev) => ({ ...prev, versions: prev.versions.map((v) => ({
                      ...v,
                      is_current: v.version === selected.version,
                    })) }));
                  }
                  // 선택된 노드 상태도 즉시 반영
                  setSelected((s) => ({ ...s, is_current: true }));
                }}
              >
                현재 버전으로 설정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
