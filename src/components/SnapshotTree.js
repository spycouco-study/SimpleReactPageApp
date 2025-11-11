import React, { useMemo, useState, useRef } from 'react';
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
  const fileRef = useRef(null);
  const effectiveData = customData || data;

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
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleFile} />
        {customData && (
          <button onClick={() => setCustomData(null)}>기본 데이터로 복원</button>
        )}
      </div>
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
            <g key={n.version} className="st-node-g" transform={`translate(${n.x}, ${n.y})`}>
              <circle r={20} className={`st-node ${n.is_current ? 'current' : n.is_latest ? 'latest' : ''}`} />
              <text className="st-label" x={26} y={2}>{n.version}</text>
              <text className="st-sub" x={26} y={18}>{(() => { try { const d = new Date(n.timestamp); return d.toLocaleString(); } catch { return n.timestamp; } })()}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
