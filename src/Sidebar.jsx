import { useState, useEffect } from "react";

/* ── TreeNode ──────────────────────────────────────────── */
function TreeNode({ name, node, path, current, activePath, onSelect, depth=0 }) {
  const fullPath    = path ? `${path}/${name}` : name;
  const hasChildren = Object.keys(node).length > 0;
  const active      = current === fullPath;

  const isAncestor = activePath && (
    activePath === fullPath || activePath.startsWith(fullPath + "/")
  );
  const [open, setOpen] = useState(isAncestor);

  useEffect(() => {
    if (isAncestor) setOpen(true);
  }, [activePath]);

  // 하위 폴더도 알파벳 역순 정렬
  const sortedChildren = Object.entries(node).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div>
      <div
        onClick={() => { setOpen(o => !o); onSelect(fullPath); }}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: `4px 8px 4px ${10 + depth * 13}px`,
          cursor: "pointer", borderRadius: 6, margin: "1px 4px",
          background: active ? "rgba(251,191,36,0.15)" : "transparent",
          color: active ? "#FBB724" : depth === 0 ? "#94A3B8" : "#64748B",
          fontSize: depth === 0 ? 13 : 12,
          fontWeight: active ? 600 : 400,
          transition: "all .15s",
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
      >
        <span style={{ fontSize: 9, opacity: .5, flexShrink: 0 }}>
          {hasChildren ? (open ? "▼" : "▶") : "·"}
        </span>
        <span style={{ flexShrink: 0 }}>{depth === 0 ? "📁" : "└"}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {name}
        </span>
      </div>
      {open && hasChildren && sortedChildren.map(([k, v]) => (
        <TreeNode key={k} name={k} node={v} path={fullPath}
          current={current} activePath={activePath}
          onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

/* ── Sidebar ───────────────────────────────────────────── */
export default function Sidebar({ currentPath, activePath, onSelect }) {
  const [treeData,   setTreeData]   = useState(null);
  const [totalFiles, setTotalFiles] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const bucketName = import.meta.env.VITE_BUCKET_NAME || "video-bucket";

  useEffect(() => {
    fetch("/api/folders")
      .then(r => r.json())
      .then(d => {
        if (!d.error) { setTreeData(d); setTotalFiles(d.totalFiles || 0); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const tree       = treeData?.tree       || {};
  const topFolders = treeData?.topFolders || [];

  // 알파벳 역순 정렬 (Z → A)
  const sortedFolders = [...topFolders].sort((a, b) => b.localeCompare(a));

  return (
    <div style={{
      width: 228, background: "#0A0C12",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      overflowY: "auto", flexShrink: 0,
      display: "flex", flexDirection: "column",
    }}>
      {/* ── BUCKET ── */}
      <div style={{ padding: "12px 8px 4px 12px", fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: 1.5 }}>
        BUCKET
      </div>
      <div
        onClick={() => onSelect("")}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 8px 6px 12px", cursor: "pointer",
          borderRadius: 6, margin: "1px 4px",
          background: currentPath === "" ? "rgba(251,191,36,0.15)" : "transparent",
          color: currentPath === "" ? "#FBB724" : "#64748B",
          fontSize: 13, fontWeight: currentPath === "" ? 600 : 400,
          transition: "all .15s",
        }}
        onMouseEnter={e => { if (currentPath !== "") e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
        onMouseLeave={e => { if (currentPath !== "") e.currentTarget.style.background = "transparent"; }}
      >
        <span>🪣</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {bucketName}
        </span>
        {totalFiles > 0 && (
          <span style={{
            fontSize: 10, color: "#334155", background: "rgba(255,255,255,0.05)",
            padding: "1px 6px", borderRadius: 10, flexShrink: 0,
          }}>
            {totalFiles.toLocaleString()}
          </span>
        )}
      </div>

      {/* ── FOLDERS ── */}
      <div style={{ padding: "12px 8px 4px 12px", fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: 1.5 }}>
        FOLDERS {!loading && sortedFolders.length > 0 && (
          <span style={{ color: "#1E293B", fontWeight: 400 }}>({sortedFolders.length})</span>
        )}
      </div>

      {loading ? (
        <div style={{ padding: "20px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.1)", borderTop: "2px solid #475569", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 12, color: "#334155" }}>로딩 중...</span>
        </div>
      ) : sortedFolders.length === 0 ? (
        <div style={{ padding: "12px 16px", fontSize: 12, color: "#334155" }}>폴더 없음</div>
      ) : (
        sortedFolders.map(k => (
          <TreeNode
            key={k}
            name={k}
            node={tree[k] || {}}
            path=""
            current={currentPath}
            activePath={activePath}
            onSelect={onSelect}
            depth={0}
          />
        ))
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
