import React, { useRef, useState } from 'react';
import axios from 'axios';
import './DataEditor.css';

/*
  DataEditor: 간단한 key-value JSON 편집기
  기능:
  - JSON 파일 불러오기 (input type=file)
  - 현재 상태를 JSON 다운로드
  - 키/타입은 변경 불가(값만 수정)
  - 값 타입: number / boolean / string (가져오기 시 고정)
  - 숫자 필드는 숫자만 입력
  - 가져오기/내보내기 지원
*/

// 제거된: 이전 top-level 편집기 유틸

// Leaf 판단
// leaf 판별은 직접 사용하지 않아 제거

const classifyType = (val) => {
  if (typeof val === 'boolean') return 'boolean';
  if (typeof val === 'number') return 'number';
  return 'string';
};

// 재귀 편집 컴포넌트
const depthColors = ['#e3f2fd', '#e8f5e9', '#fff3e0', '#f3e5f5'];
const getDepthStyle = (depth) => ({
  borderLeft: `4px solid ${depthColors[depth % depthColors.length]}`,
  backgroundColor: depth % 2 === 0 ? '#fbfbfb' : '#ffffff'
});

const CollapsibleNode = ({ label, typeLabel, depth, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="collapsible-node" style={{ ...getDepthStyle(depth), padding: 8, borderRadius: 6, marginBottom: 8 }}>
      <div className="node-header" onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <span className="caret" style={{ width: 16 }}>{open ? '▼' : '▶'}</span>
        <strong className="node-label" style={{ flex: 1 }}>{label}</strong>
        {typeLabel && <span className="type-badge" style={{ fontSize: 12, color: '#555' }}>{typeLabel}</span>}
      </div>
      {open && (
        <div className="node-body" style={{ marginTop: 8 }}>
          {children}
        </div>
      )}
    </div>
  );
};

const NodeEditor = ({ path, value, onChange, depth = 0, label, hiddenTopLevelKeys = [] }) => {
  // 객체
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const allKeys = Object.keys(value);
    const keys = (depth === 0 && hiddenTopLevelKeys && hiddenTopLevelKeys.length)
      ? allKeys.filter(k => !hiddenTopLevelKeys.includes(k))
      : allKeys;
    return (
      <div className="node object-node">
        {keys.map(k => {
          const child = value[k];
          const isGroup = child && typeof child === 'object';
          if (isGroup) {
            return (
              <CollapsibleNode key={k} label={k} typeLabel={Array.isArray(child) ? `array(${child.length})` : 'object'} depth={depth}>
                <NodeEditor path={[...path, k]} value={child} onChange={onChange} depth={depth + 1} label={k} hiddenTopLevelKeys={hiddenTopLevelKeys} />
              </CollapsibleNode>
            );
          }
          // leaf는 접기/펼치기 없이 바로 표시
          return (
            <NodeEditor key={k} path={[...path, k]} value={child} onChange={onChange} depth={depth} label={k} hiddenTopLevelKeys={hiddenTopLevelKeys} />
          );
        })}
      </div>
    );
  }
  // 배열
  if (Array.isArray(value)) {
  return (
      <div className="node array-node">
        {value.map((item, idx) => {
          const isGroup = item && typeof item === 'object';
          if (isGroup) {
            return (
              <CollapsibleNode key={idx} label={`[${idx}]`} typeLabel={Array.isArray(item) ? `array(${item.length})` : 'object'} depth={depth}>
        <NodeEditor path={[...path, idx]} value={item} onChange={onChange} depth={depth + 1} label={`[${idx}]`} hiddenTopLevelKeys={hiddenTopLevelKeys} />
              </CollapsibleNode>
            );
          }
          // leaf는 접기/펼치기 없이 바로 표시
          return (
      <NodeEditor key={idx} path={[...path, idx]} value={item} onChange={onChange} depth={depth} label={`[${idx}]`} hiddenTopLevelKeys={hiddenTopLevelKeys} />
          );
        })}
      </div>
    );
  }
  // Leaf 값 편집
  const type = classifyType(value);
  const handleValueChange = (raw) => {
    let newVal = raw;
    if (type === 'number') {
      newVal = raw === '' ? '' : Number(raw);
    } else if (type === 'boolean') {
      newVal = raw === 'true';
    }
    onChange(path, newVal);
  };
  return (
    <div className="leaf-line" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, alignItems: 'center' }}>
      <div className="leaf-key" style={{ color: '#333' }}>{label}</div>
      <div className="leaf-editor">
        {type === 'boolean' ? (
          <select value={String(value)} onChange={(e) => handleValueChange(e.target.value)}>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : (
          <input
            type={type === 'number' ? 'number' : 'text'}
            value={value === undefined || value === null ? '' : value}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={type === 'number' ? '0' : 'value'}
          />
        )}
      </div>
    </div>
  );
};

function DataEditor({ data, onDataChange, showImportExport = true, gameName, onSnapshotUpdate, hiddenTopLevelKeys = [] }) {
  const fileInputRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const setValueAtPath = (path, newVal) => {
    onDataChange(prev => {
      const base = typeof prev === 'object' && prev !== null ? prev : {};
      const clone = structuredClone(base);
      let cur = clone;
      for (let i = 0; i < path.length - 1; i++) {
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = newVal;
      return clone;
    });
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        if (json && typeof json === 'object') {
          onDataChange(json);
        }
      } catch(err) {
        alert('JSON 파싱 오류: ' + err.message);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const buildObject = () => data;

  const handleExport = () => {
  const dataStr = JSON.stringify(buildObject(), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 저장 실행 핸들러: /data-update -> /snapshot-log
  const handleSave = async () => {
    if (isSaving) return;
    if (!gameName || !gameName.trim()) {
      alert('게임 이름을 먼저 입력해주세요.');
      return;
    }
    if (data === undefined || data === null) {
      alert('보낼 데이터가 없습니다.');
      return;
    }
    try {
      setIsSaving(true);
      const payload = { game_name: gameName, data };
      await axios.post('/data-update', payload, { headers: { 'Content-Type': 'application/json' } });
      const snapRes = await axios.get('/snapshot-log', { params: { game_name: gameName || '' } });
      const snapData = snapRes?.data;
      if (onSnapshotUpdate && snapData) onSnapshotUpdate(snapData);
    } catch (err) {
      console.error('Failed to save data or refresh snapshot-log:', err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="data-editor-container">
      <div className="data-editor-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0 }}>게임 설정 편집</h2>
        <div className="data-editor-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {showImportExport && (
            <>
              <button onClick={() => fileInputRef.current?.click()}>가져오기(JSON)</button>
              <button onClick={handleExport}>내보내기(JSON)</button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                style={{ display: 'none' }}
                onChange={handleImport}
              />
            </>
          )}
          <button onClick={() => setShowPreview(v => !v)}>
            {showPreview ? 'JSON 미리보기 숨기기' : 'JSON 미리보기'}
          </button>
          <button onClick={handleSave} disabled={isSaving || !gameName?.trim()} title={!gameName?.trim() ? '게임 이름이 필요합니다' : '현재 데이터 저장'}>
            {isSaving ? '저장 중…' : '변경 내용 저장'}
          </button>
        </div>
      </div>
    <div className="hierarchy-editor">
  <NodeEditor path={[]} value={data} onChange={setValueAtPath} depth={0} hiddenTopLevelKeys={hiddenTopLevelKeys} />
      </div>
      {showPreview && (
        <div className="data-editor-preview">
          <h3>미리보기 JSON</h3>
          <pre>{JSON.stringify(buildObject(), null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default DataEditor;
