import { useState, useRef, useCallback, useEffect } from "react";

const fmtSize  = (b) => b>=1e9?(b/1e9).toFixed(1)+" GB":b>=1e6?(b/1e6).toFixed(1)+" MB":b>=1e3?(b/1e3).toFixed(0)+" KB":b+" B";
const fmtSpeed = (b) => b>=1e6?(b/1e6).toFixed(1)+" MB/s":b>=1e3?(b/1e3).toFixed(0)+" KB/s":b+" B/s";

const STATUS = { PENDING:"pending", UPLOADING:"uploading", DONE:"done", ERROR:"error", CANCELLED:"cancelled" };
const STATUS_LABEL = { pending:"대기", uploading:"업로드 중", done:"완료", error:"오류", cancelled:"취소됨" };
const STATUS_COLOR = { pending:"#475569", uploading:"#60A5FA", done:"#4ADE80", error:"#F87171", cancelled:"#F59E0B" };

/* ── Summary Modal ─────────────────────────────────────── */
function SummaryModal({ files, onClose, onRetry }) {
  const done      = files.filter(f => f.status === STATUS.DONE);
  const cancelled = files.filter(f => f.status === STATUS.CANCELLED);
  const errored   = files.filter(f => f.status === STATUS.ERROR);
  const totalUploaded = done.reduce((s, f) => s + f.file.size, 0);

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.85)",
      backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24
    }}>
      <div style={{
        background:"#0F1117",borderRadius:16,width:"100%",maxWidth:520,
        border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 40px 80px rgba(0,0,0,0.8)",
        overflow:"hidden",
      }}>
        {/* 헤더 */}
        <div style={{
          padding:"20px 24px 16px",
          borderBottom:"1px solid rgba(255,255,255,0.06)",
          background: done.length > 0 && errored.length === 0
            ? "linear-gradient(135deg,rgba(74,222,128,0.08),transparent)"
            : "linear-gradient(135deg,rgba(251,183,36,0.08),transparent)",
        }}>
          <div style={{fontSize:24,marginBottom:8}}>
            {errored.length > 0 ? "⚠️" : cancelled.length > 0 ? "🚫" : "✅"}
          </div>
          <div style={{fontSize:16,fontWeight:700,color:"#F1F5F9"}}>업로드 완료</div>
          <div style={{fontSize:12,color:"#64748B",marginTop:4}}>
            {fmtSize(totalUploaded)} 업로드됨
          </div>
        </div>

        {/* 통계 */}
        <div style={{padding:"16px 24px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {[
            ["✅ 완료",  done.length,      "#4ADE80"],
            ["🚫 취소됨", cancelled.length, "#F59E0B"],
            ["❌ 오류",  errored.length,   "#F87171"],
          ].map(([label, count, color]) => (
            <div key={label} style={{
              background:"rgba(255,255,255,0.03)",borderRadius:10,
              padding:"12px",textAlign:"center",
              border:"1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{fontSize:22,fontWeight:700,color}}>{count}</div>
              <div style={{fontSize:11,color:"#475569",marginTop:2}}>{label}</div>
            </div>
          ))}
        </div>

        {/* 파일 목록 */}
        <div style={{maxHeight:240,overflowY:"auto",padding:"0 24px 8px"}}>
          {files.map(f => (
            <div key={f.id} style={{
              display:"flex",alignItems:"center",gap:10,
              padding:"7px 0",
              borderBottom:"1px solid rgba(255,255,255,0.04)",
              fontSize:12,
            }}>
              <span style={{
                width:6,height:6,borderRadius:"50%",flexShrink:0,
                background:STATUS_COLOR[f.status],
              }}/>
              <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#94A3B8"}}>
                {f.file.name}
              </span>
              <span style={{color:"#334155",flexShrink:0}}>{fmtSize(f.file.size)}</span>
              <span style={{color:STATUS_COLOR[f.status],flexShrink:0,width:50,textAlign:"right"}}>
                {STATUS_LABEL[f.status]}
              </span>
            </div>
          ))}
        </div>

        {/* 액션 버튼 */}
        <div style={{padding:"16px 24px",display:"flex",gap:8,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
          {errored.length > 0 && (
            <button onClick={onRetry} style={{
              flex:1,padding:"9px 0",background:"rgba(248,113,113,0.1)",
              border:"1px solid rgba(248,113,113,0.3)",color:"#F87171",
              borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,
            }}>
              🔄 오류 파일 재시도
            </button>
          )}
          <button onClick={onClose} style={{
            flex:1,padding:"9px 0",background:"rgba(251,183,36,0.12)",
            border:"1px solid rgba(251,183,36,0.3)",color:"#FBB724",
            borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,
          }}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── FileRow ────────────────────────────────────────────── */
function FileRow({ item, onRemove }) {
  const pct = item.status === STATUS.DONE ? 100
    : item.status === STATUS.CANCELLED ? 0
    : Math.round((item.loaded / (item.file.size || 1)) * 100);

  return (
    <div style={{
      padding:"10px 12px",borderRadius:8,
      background:"rgba(255,255,255,0.02)",
      border:"1px solid rgba(255,255,255,0.05)",
      marginBottom:6,
    }}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:item.status===STATUS.UPLOADING?6:0}}>
        <span style={{
          width:7,height:7,borderRadius:"50%",flexShrink:0,
          background:STATUS_COLOR[item.status],
          boxShadow: item.status===STATUS.UPLOADING?"0 0 6px #60A5FA":undefined,
        }}/>
        <span style={{flex:1,fontSize:12,color:"#CBD5E1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {item.relativePath || item.file.name}
        </span>
        <span style={{fontSize:11,color:"#334155",flexShrink:0}}>{fmtSize(item.file.size)}</span>
        {item.status === STATUS.UPLOADING && item.speed > 0 && (
          <span style={{fontSize:10,color:"#475569",flexShrink:0}}>{fmtSpeed(item.speed)}</span>
        )}
        <span style={{fontSize:10,color:STATUS_COLOR[item.status],flexShrink:0,width:44,textAlign:"right"}}>
          {item.status===STATUS.UPLOADING ? `${pct}%` : STATUS_LABEL[item.status]}
        </span>
        {[STATUS.PENDING, STATUS.ERROR].includes(item.status) && (
          <button onClick={()=>onRemove(item.id)} style={{
            background:"transparent",border:"none",color:"#334155",
            cursor:"pointer",padding:"0 2px",fontSize:13,lineHeight:1,
          }}>✕</button>
        )}
      </div>
      {item.status === STATUS.UPLOADING && (
        <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
          <div style={{
            height:"100%",width:`${pct}%`,
            background:"linear-gradient(90deg,#3B82F6,#60A5FA)",
            borderRadius:2,transition:"width .3s",
          }}/>
        </div>
      )}
      {item.status === STATUS.ERROR && item.error && (
        <div style={{fontSize:10,color:"#F87171",marginTop:4,paddingLeft:15}}>{item.error}</div>
      )}
    </div>
  );
}

/* ── Uploader Main ──────────────────────────────────────── */
export default function Uploader({ targetPath, onClose, onUploadDone }) {
  const [queue,       setQueue]       = useState([]);
  const [uploading,   setUploading]   = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [dragging,    setDragging]    = useState(false);
  const xhrMapRef    = useRef({});   // id → XHR
  const fileInputRef = useRef();
  const dirInputRef  = useRef();
  const cancelledRef = useRef(false);

  const s3Key = (relativePath) => {
    const base = targetPath ? `${targetPath}/` : "";
    return base + relativePath;
  };

  /* 파일 추가 */
  const addFiles = useCallback((fileList) => {
    const newItems = Array.from(fileList).map(file => ({
      id:           Math.random().toString(36).slice(2),
      file,
      relativePath: file.webkitRelativePath || file.name,
      status:       STATUS.PENDING,
      loaded:       0,
      speed:        0,
      error:        null,
    }));
    setQueue(q => [...q, ...newItems]);
  }, []);

  /* 드래그 앤 드랍 */
  const onDrop = useCallback(async (e) => {
    e.preventDefault(); setDragging(false);
    const items = Array.from(e.dataTransfer.items || []);
    const files = [];

    async function traverseEntry(entry, path = "") {
      if (entry.isFile) {
        await new Promise(res => entry.file(f => {
          Object.defineProperty(f, "webkitRelativePath", { value: path + f.name });
          files.push(f); res();
        }));
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        await new Promise(res => reader.readEntries(async entries => {
          for (const e2 of entries) await traverseEntry(e2, path + entry.name + "/");
          res();
        }));
      }
    }

    for (const item of items) {
      const entry = item.webkitGetAsEntry?.();
      if (entry) await traverseEntry(entry);
      else if (item.kind === "file") files.push(item.getAsFile());
    }
    if (files.length) addFiles(files);
  }, [addFiles]);

  /* 개별 항목 제거 */
  const removeItem = (id) => setQueue(q => q.filter(f => f.id !== id));

  /* 전체 취소 */
  const cancelAll = () => {
    cancelledRef.current = true;
    Object.values(xhrMapRef.current).forEach(xhr => xhr.abort());
    setQueue(q => q.map(f =>
      f.status === STATUS.UPLOADING || f.status === STATUS.PENDING
        ? { ...f, status: STATUS.CANCELLED }
        : f
    ));
    setUploading(false);
    setShowSummary(true);
  };

  /* 업로드 실행 */
  const startUpload = async () => {
    const pending = queue.filter(f => f.status === STATUS.PENDING);
    if (!pending.length) return;
    cancelledRef.current = false;
    setUploading(true);

    for (const item of pending) {
      if (cancelledRef.current) break;

      setQueue(q => q.map(f => f.id === item.id ? { ...f, status: STATUS.UPLOADING } : f));

      try {
        // 1. Presigned PUT URL 발급
        const key = s3Key(item.relativePath);
        const ct  = item.file.type || "application/octet-stream";
        const r   = await fetch(`/api/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(ct)}`);
        const { url, error } = await r.json();
        if (error) throw new Error(error);

        // 2. XHR PUT (진행률 추적)
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrMapRef.current[item.id] = xhr;
          let lastLoaded = 0, lastTime = Date.now();

          xhr.upload.onprogress = (e) => {
            if (!e.lengthComputable) return;
            const now  = Date.now();
            const dt   = (now - lastTime) / 1000 || 0.1;
            const speed = (e.loaded - lastLoaded) / dt;
            lastLoaded = e.loaded; lastTime = now;
            setQueue(q => q.map(f =>
              f.id === item.id ? { ...f, loaded: e.loaded, speed } : f
            ));
          };

          xhr.onload = () => {
            delete xhrMapRef.current[item.id];
            if (xhr.status >= 200 && xhr.status < 300) {
              setQueue(q => q.map(f =>
                f.id === item.id ? { ...f, status: STATUS.DONE, loaded: item.file.size } : f
              ));
              resolve();
            } else {
              reject(new Error(`HTTP ${xhr.status}`));
            }
          };

          xhr.onerror = () => { delete xhrMapRef.current[item.id]; reject(new Error("네트워크 오류")); };
          xhr.onabort = () => { delete xhrMapRef.current[item.id]; resolve(); };

          xhr.open("PUT", url);
          xhr.setRequestHeader("Content-Type", ct);
          xhr.send(item.file);
        });

      } catch (err) {
        if (cancelledRef.current) break;
        setQueue(q => q.map(f =>
          f.id === item.id ? { ...f, status: STATUS.ERROR, error: err.message } : f
        ));
      }
    }

    setUploading(false);
    setShowSummary(true);
    onUploadDone?.();
  };

  /* 오류 파일 재시도 */
  const retryErrors = () => {
    setShowSummary(false);
    setQueue(q => q.map(f => f.status === STATUS.ERROR ? { ...f, status: STATUS.PENDING, error: null, loaded: 0 } : f));
  };

  /* 통계 계산 */
  const stats = {
    total:     queue.length,
    done:      queue.filter(f => f.status === STATUS.DONE).length,
    uploading: queue.filter(f => f.status === STATUS.UPLOADING).length,
    pending:   queue.filter(f => f.status === STATUS.PENDING).length,
    error:     queue.filter(f => f.status === STATUS.ERROR).length,
    cancelled: queue.filter(f => f.status === STATUS.CANCELLED).length,
    totalBytes:    queue.reduce((s, f) => s + f.file.size, 0),
    loadedBytes:   queue.reduce((s, f) => s + (f.status===STATUS.DONE ? f.file.size : f.loaded), 0),
  };
  const overallPct = stats.totalBytes > 0
    ? Math.round((stats.loadedBytes / stats.totalBytes) * 100) : 0;

  return (
    <>
      <div style={{
        position:"fixed",inset:0,zIndex:150,background:"rgba(0,0,0,0.7)",
        backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24,
      }} onClick={e => { if(e.target===e.currentTarget && !uploading) onClose(); }}>
        <div style={{
          background:"#0F1117",borderRadius:16,width:"100%",maxWidth:620,
          maxHeight:"90vh",display:"flex",flexDirection:"column",
          border:"1px solid rgba(255,255,255,0.08)",
          boxShadow:"0 40px 80px rgba(0,0,0,0.8)",
        }}>
          {/* 헤더 */}
          <div style={{
            padding:"18px 20px 14px",borderBottom:"1px solid rgba(255,255,255,0.06)",
            display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,
          }}>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:"#F1F5F9"}}>📤 파일 업로드</div>
              <div style={{fontSize:11,color:"#475569",marginTop:3}}>
                대상 경로: <span style={{color:"#FBB724",fontFamily:"monospace"}}>
                  {targetPath ? `/${targetPath}/` : "/ (루트)"}
                </span>
              </div>
            </div>
            {!uploading && (
              <button onClick={onClose} style={{background:"transparent",border:"none",color:"#475569",cursor:"pointer",fontSize:18,padding:4}}>✕</button>
            )}
          </div>

          {/* 드롭존 */}
          {!uploading && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{
                margin:16,borderRadius:12,
                border:`2px dashed ${dragging?"#FBB724":"rgba(255,255,255,0.1)"}`,
                background: dragging?"rgba(251,183,36,0.05)":"rgba(255,255,255,0.02)",
                padding:"28px 20px",textAlign:"center",
                transition:"all .2s",cursor:"default",flexShrink:0,
              }}
            >
              <div style={{fontSize:36,marginBottom:10}}>🎬🖼️</div>
              <div style={{fontSize:14,color:"#94A3B8",marginBottom:6}}>
                동영상・이미지를 드래그하거나 버튼으로 선택하세요
              </div>
              <div style={{fontSize:11,color:"#334155",marginBottom:16}}>
                동영상, 이미지, 여러 파일, 폴더 모두 지원
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
                <button onClick={() => fileInputRef.current.click()} style={{
                  padding:"7px 16px",background:"rgba(255,255,255,0.06)",
                  border:"1px solid rgba(255,255,255,0.12)",color:"#CBD5E1",
                  borderRadius:8,cursor:"pointer",fontSize:13,
                }}>📄 파일 선택</button>
                <button onClick={() => dirInputRef.current.click()} style={{
                  padding:"7px 16px",background:"rgba(255,255,255,0.06)",
                  border:"1px solid rgba(255,255,255,0.12)",color:"#CBD5E1",
                  borderRadius:8,cursor:"pointer",fontSize:13,
                }}>📁 폴더 선택</button>
              </div>
              <input ref={fileInputRef} type="file" multiple accept="video/*,image/*,.mxf,.ts,.m2ts" style={{display:"none"}}
                onChange={e => { addFiles(e.target.files); e.target.value=""; }} />
              <input ref={dirInputRef} type="file" multiple webkitdirectory="" style={{display:"none"}}
                onChange={e => { addFiles(e.target.files); e.target.value=""; }} />
            </div>
          )}

          {/* 파일 목록 */}
          {queue.length > 0 && (
            <div style={{flex:1,overflowY:"auto",padding:"0 16px 8px",minHeight:0}}>
              {queue.map(item => (
                <FileRow key={item.id} item={item} onRemove={removeItem} />
              ))}
            </div>
          )}

          {/* 전체 프로그레스바 */}
          {uploading && stats.totalBytes > 0 && (
            <div style={{padding:"10px 16px",flexShrink:0,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#475569",marginBottom:6}}>
                <span>
                  <span style={{color:"#4ADE80",fontWeight:600}}>{stats.done}</span>
                  <span style={{color:"#334155"}}> / {stats.total}개 완료</span>
                  {stats.uploading > 0 && <span style={{color:"#60A5FA"}}> · {stats.uploading}개 업로드 중</span>}
                </span>
                <span>
                  <span style={{color:"#94A3B8"}}>{fmtSize(stats.loadedBytes)}</span>
                  <span style={{color:"#334155"}}> / {fmtSize(stats.totalBytes)}</span>
                  <span style={{color:"#FBB724",fontWeight:600,marginLeft:8}}>{overallPct}%</span>
                </span>
              </div>
              <div style={{height:6,background:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden"}}>
                <div style={{
                  height:"100%",width:`${overallPct}%`,
                  background:"linear-gradient(90deg,#6366F1,#3B82F6,#06B6D4)",
                  borderRadius:3,transition:"width .4s",
                }}/>
              </div>
            </div>
          )}

          {/* 하단 버튼 */}
          <div style={{
            padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.06)",
            display:"flex",gap:8,flexShrink:0,
          }}>
            {uploading ? (
              <button onClick={cancelAll} style={{
                flex:1,padding:"9px 0",
                background:"rgba(248,113,113,0.1)",
                border:"1px solid rgba(248,113,113,0.3)",
                color:"#F87171",borderRadius:8,cursor:"pointer",
                fontSize:13,fontWeight:600,
              }}>
                🚫 전체 취소
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setQueue([]); }}
                  disabled={queue.length === 0}
                  style={{
                    padding:"9px 16px",background:"rgba(255,255,255,0.04)",
                    border:"1px solid rgba(255,255,255,0.08)",color:"#475569",
                    borderRadius:8,cursor:"pointer",fontSize:13,
                    opacity: queue.length===0 ? .4 : 1,
                  }}
                >
                  초기화
                </button>
                <button
                  onClick={startUpload}
                  disabled={stats.pending === 0}
                  style={{
                    flex:1,padding:"9px 0",
                    background: stats.pending > 0
                      ? "linear-gradient(135deg,#6366F1,#3B82F6)"
                      : "rgba(255,255,255,0.04)",
                    border:"none",color: stats.pending > 0 ? "#fff" : "#334155",
                    borderRadius:8,cursor: stats.pending > 0 ? "pointer" : "default",
                    fontSize:13,fontWeight:600,transition:"all .2s",
                  }}
                >
                  {stats.pending > 0
                    ? `⬆️ ${stats.pending}개 파일 업로드 시작`
                    : queue.length > 0 ? "✅ 모두 완료됨" : "파일을 추가해주세요"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showSummary && (
        <SummaryModal
          files={queue}
          onClose={() => { setShowSummary(false); if (!stats.error) onClose(); }}
          onRetry={retryErrors}
        />
      )}
    </>
  );
}
