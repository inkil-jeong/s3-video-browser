import { useState, useRef, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar.jsx";
import Uploader from "./Uploader.jsx";

/* ── 유틸 ──────────────────────────────────────────────── */
const EXT_COLOR = { mp4:"#4ADE80", mov:"#60A5FA", mxf:"#F59E0B", webm:"#A78BFA", mkv:"#FB923C", avi:"#E879F9",
  jpg:"#F472B6", jpeg:"#F472B6", png:"#34D399", gif:"#A78BFA", webp:"#22D3EE",
  svg:"#FB923C", heic:"#E879F9", avif:"#60A5FA" };
const IMAGE_EXTS = new Set(["jpg","jpeg","png","gif","webp","bmp","tiff","tif","heic","heif","svg","avif"]);
const isImage = (key) => IMAGE_EXTS.has(key.split(".").pop().toLowerCase());
const IMAGE_PALETTES = [
  ["#1a0533","#BE185D","#F472B6"],["#0a1628","#1E3A5F","#34D399"],
  ["#1a1040","#4338CA","#A78BFA"],["#001a1a","#0E7490","#22D3EE"],
  ["#1a0a00","#92400E","#FBB724"],["#0d1f0d","#166534","#4ADE80"],
];
function getImageThumb(key) {
  let h=0; for(const c of key) h=(h*31+c.charCodeAt(0))&0xffffffff;
  return IMAGE_PALETTES[Math.abs(h)%IMAGE_PALETTES.length];
}
const fmtSize = (b) => b>=1e12?(b/1e12).toFixed(1)+" TB":b>=1e9?(b/1e9).toFixed(1)+" GB":b>=1e6?(b/1e6).toFixed(1)+" MB":(b/1e3).toFixed(0)+" KB";
const fmtDate = (s) => new Date(s).toLocaleDateString("ko-KR",{year:"numeric",month:"short",day:"numeric"});
const getExt  = (k) => k.split(".").pop().toLowerCase();
const getName = (k) => k.split("/").pop();
const getDir  = (k) => k.split("/").slice(0,-1).join("/") || "/";
const THUMB_PALETTES = [
  ["#1a1040","#6D28D9","#EC4899"],["#0f2027","#203a43","#2c5364"],
  ["#1a0533","#7C3AED","#06B6D4"],["#0d1117","#21262d","#388BFD"],
  ["#1c0a00","#C2410C","#FBB724"],["#001220","#004D6E","#00B4D8"],
  ["#0a0a0a","#1a1a2e","#16213e"],["#0d0d0d","#2D6A4F","#52B788"],
];
function getThumb(key) {
  let h=0; for(const c of key) h=(h*31+c.charCodeAt(0))&0xffffffff;
  return THUMB_PALETTES[Math.abs(h)%THUMB_PALETTES.length];
}
/* ── MediaCard (Video + Image) ──────────────────────────── */
function MediaCard({ file, onClick }) {
  const [hover,    setHover]    = useState(false);
  const [thumbUrl, setThumbUrl] = useState(null);
  const ext        = getExt(file.key);
  const img        = isImage(file.key);
  const colors     = img ? getImageThumb(file.key) : getThumb(file.key);
  const isArchived = file.storageClass?.includes("ARCHIVE");

  // 이미지: 호버 시 실제 썸네일 프리뷰 로드
  useEffect(() => {
    if (!img || isArchived) return;
    fetch(`/api/presign?key=${encodeURIComponent(file.key)}`)
      .then(r=>r.json()).then(d=>{ if(d.url) setThumbUrl(d.url); }).catch(()=>{});
  }, [file.key, img, isArchived]);

  return (
    <div onClick={()=>onClick(file)} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{cursor:"pointer",borderRadius:12,overflow:"hidden",
        border:hover?"1px solid rgba(251,183,36,0.5)":"1px solid rgba(255,255,255,0.06)",
        background:"#0F1117",transform:hover?"translateY(-3px)":"translateY(0)",
        boxShadow:hover?"0 16px 40px rgba(0,0,0,0.5)":"0 2px 8px rgba(0,0,0,0.3)",
        transition:"all .2s"}}>
      <div style={{height:130,position:"relative",overflow:"hidden",
        background:`linear-gradient(135deg,${colors[0]} 0%,${colors[1]} 50%,${colors[2]} 100%)`}}>
        {/* 이미지 썸네일 */}
        {img && thumbUrl && (
          <img src={thumbUrl} alt="" style={{
            position:"absolute",inset:0,width:"100%",height:"100%",
            objectFit:"cover",opacity: hover?1:.92,transition:"opacity .2s",
          }}/>
        )}
        {/* 오버레이 아이콘 */}
        {(!img || !thumbUrl) && (
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(255,255,255,0.15)",
              backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:20,transform:hover?"scale(1.1)":"scale(1)",transition:"transform .2s"}}>
              {isArchived?"🧊":img?"🖼️":"▶"}
            </div>
          </div>
        )}
        {img && thumbUrl && hover && (
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.25)",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:38,height:38,borderRadius:"50%",background:"rgba(0,0,0,0.5)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🔍</div>
          </div>
        )}
        <div style={{position:"absolute",top:8,left:8,
          background:EXT_COLOR[ext]||"#64748B",color:"#000",
          fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4}}>
          {ext.toUpperCase()}
        </div>
        {isArchived&&<div style={{position:"absolute",bottom:8,left:8,
          background:"rgba(99,102,241,0.85)",color:"#fff",fontSize:9,
          padding:"2px 6px",borderRadius:4,fontWeight:600}}>ARCHIVED</div>}
      </div>
      <div style={{padding:"8px 12px 10px"}}>
        <div style={{fontSize:12,fontWeight:600,color:"#E2E8F0",overflow:"hidden",
          textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}}>{getName(file.key)}</div>
        <div style={{fontSize:10,color:"#475569",display:"flex",justifyContent:"space-between"}}>
          <span>{fmtSize(file.size)}</span>
          <span>{fmtDate(file.lastModified)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── VideoModal ─────────────────────────────────────────── */
function VideoModal({ file, onClose }) {
  const overlayRef    = useRef();
  const [presignedUrl, setPresignedUrl] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [playError,    setPlayError]    = useState(false);   // 재생 실패 여부
  const [restoreState, setRestoreState] = useState(null);    // null | "loading" | "done" | "progress"
  const [copied,       setCopied]       = useState("");

  useEffect(()=>{
    const h=(e)=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",h); return ()=>window.removeEventListener("keydown",h);
  },[onClose]);

  // Presigned URL 발급 (HeadObject 없이 바로 발급)
  useEffect(()=>{
    setLoading(true); setPlayError(false); setPresignedUrl(null); setRestoreState(null);
    fetch(`/api/presign?key=${encodeURIComponent(file.key)}`)
      .then(r=>r.json())
      .then(d=>{ if(d.url) setPresignedUrl(d.url); })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[file.key]);

  // 재생 실패 시 복원 요청 (storageClass 전달)
  const handleRestore = () => {
    setRestoreState("loading");
    const sc = encodeURIComponent(file.storageClass || "INTELLIGENT_TIERING");
    fetch(`/api/restore?key=${encodeURIComponent(file.key)}&tier=Standard&storageClass=${sc}`)
      .then(r=>r.json())
      .then(d=>{
        if(d.success) setRestoreState(d.alreadyInProgress ? "progress" : "done");
        else setRestoreState("error");
      })
      .catch(()=>setRestoreState("error"));
  };

  const copy=(text,label)=>navigator.clipboard.writeText(text).then(()=>{ setCopied(label); setTimeout(()=>setCopied(""),2000); });
  const colors=getThumb(file.key); const ext=getExt(file.key);
  const rows=[
    ["파일명",    getName(file.key)],
    ["전체 경로", file.key],
    ["크기",      fmtSize(file.size)],
    ["수정일",    fmtDate(file.lastModified)],
    ["포맷",      ext.toUpperCase()],
    ["스토리지",  file.storageClass||"STANDARD"],
  ];

  return (
    <div ref={overlayRef} onClick={e=>{if(e.target===overlayRef.current)onClose();}}
      style={{position:"fixed",inset:0,zIndex:100,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"#0F1117",borderRadius:16,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)",width:"100%",maxWidth:900,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 40px 80px rgba(0,0,0,0.8)"}}>

        {/* 미디어 플레이어 */}
        <div style={{position:"relative",background:`linear-gradient(135deg,${colors[0]} 0%,${colors[1]} 50%,${colors[2]} 100%)`,flexShrink:0}}>
          {!loading && presignedUrl && !playError ? (
            isImage(file.key) ? (
              <div style={{maxHeight:440,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.5)"}}>
                <img src={presignedUrl} alt={getName(file.key)}
                  style={{maxWidth:"100%",maxHeight:440,objectFit:"contain",display:"block"}}
                  onError={()=>setPlayError(true)}/>
              </div>
            ) : (
            <video controls autoPlay
              style={{width:"100%",maxHeight:360,display:"block",background:"#000"}}
              src={presignedUrl}
              onError={()=>setPlayError(true)}/>
            )
          ) : (
            <div style={{height:260,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}>
              {loading ? (
                <><div style={{width:40,height:40,border:"3px solid rgba(255,255,255,0.2)",borderTop:"3px solid #FBB724",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
                <span style={{color:"rgba(255,255,255,0.5)",fontSize:13}}>{isImage(file.key)?"이미지 로딩 중...":"재생 준비 중..."}</span></>
              ) : playError ? (
                /* 재생 실패 — 아카이브 가능성 안내 */
                <>
                  <span style={{fontSize:44}}>🧊</span>
                  <span style={{color:"#E2E8F0",fontSize:14,fontWeight:600}}>{isImage(file.key)?"이미지를 불러올 수 없습니다":"재생할 수 없습니다"}</span>
                  <span style={{color:"#64748B",fontSize:12,textAlign:"center",maxWidth:300,lineHeight:1.6}}>
                    파일이 아카이브 상태일 수 있습니다.<br/>복원을 요청하면 3~5시간 후 재생 가능합니다.
                  </span>
                  {restoreState === null && (
                    <button onClick={handleRestore}
                      style={{marginTop:4,padding:"8px 24px",background:"rgba(251,183,36,0.15)",border:"1px solid rgba(251,183,36,0.4)",color:"#FBB724",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>
                      🔄 복원 요청
                    </button>
                  )}
                  {restoreState === "loading" && (
                    <span style={{color:"#94A3B8",fontSize:13}}>⏳ 복원 요청 중...</span>
                  )}
                  {restoreState === "done" && (
                    <div style={{textAlign:"center"}}>
                      <div style={{color:"#4ADE80",fontSize:13,fontWeight:600}}>✅ 복원 요청 완료</div>
                      <div style={{color:"#64748B",fontSize:12,marginTop:4}}>Standard 티어 · 약 3~5시간 후 재생 가능</div>
                    </div>
                  )}
                  {restoreState === "progress" && (
                    <div style={{textAlign:"center"}}>
                      <div style={{color:"#FBB724",fontSize:13,fontWeight:600}}>⏳ 이미 복원 진행 중</div>
                      <div style={{color:"#64748B",fontSize:12,marginTop:4}}>잠시 후 다시 시도해주세요</div>
                    </div>
                  )}
                  {restoreState === "error" && (
                    <div style={{color:"#F87171",fontSize:12}}>복원 요청 실패 — 권한을 확인해주세요</div>
                  )}
                </>
              ) : null}
            </div>
          )}
          <button onClick={onClose} style={{position:"absolute",top:12,left:12,background:"rgba(0,0,0,0.6)",border:"none",color:"#94A3B8",cursor:"pointer",width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>✕</button>
        </div>

        {/* 메타 & 액션 */}
        <div style={{padding:24,overflowY:"auto"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#F1F5F9",marginBottom:16}}>{getName(file.key)}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 24px",marginBottom:20}}>
            {rows.map(([k,v])=>(
              <div key={k} style={{display:"flex",gap:8}}>
                <span style={{fontSize:11,color:"#475569",width:68,flexShrink:0,paddingTop:1}}>{k}</span>
                <span style={{fontSize:k==="전체 경로"?11:12,color:"#94A3B8",wordBreak:"break-all",fontFamily:k==="전체 경로"?"monospace":"inherit"}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[
              ["🔗 S3 URI 복사", ()=>copy(`s3://${import.meta.env.VITE_BUCKET_NAME||"bucket"}/${file.key}`,"s3uri")],
              ["📋 경로 복사",   ()=>copy(file.key,"path")],
              presignedUrl && !playError && ["🔑 URL 복사",  ()=>copy(presignedUrl,"purl")],
              presignedUrl && !playError && ["⬇️ 다운로드",  ()=>{ const a=document.createElement("a");a.href=presignedUrl;a.download=getName(file.key);a.click(); }],
            ].filter(Boolean).map(([label,action])=>{
              const isActive=copied===label;
              return (
                <button key={label} onClick={action}
                  style={{flex:1,minWidth:110,padding:"8px 0",background:isActive?"rgba(251,183,36,0.15)":"rgba(255,255,255,0.05)",border:`1px solid ${isActive?"rgba(251,183,36,0.4)":"rgba(255,255,255,0.1)"}`,color:isActive?"#FBB724":"#94A3B8",borderRadius:8,cursor:"pointer",fontSize:12,transition:"all .15s"}}
                  onMouseEnter={e=>{if(!isActive){e.currentTarget.style.background="rgba(251,183,36,0.08)";e.currentTarget.style.color="#FBB724";}}}
                  onMouseLeave={e=>{if(!isActive){e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="#94A3B8";}}}>
                  {isActive?"✅ 복사됨":label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Pagination ─────────────────────────────────────────── */
function Pagination({ page, totalPages, totalCount, pageSize, onPage }) {
  if (totalPages <= 1) return null;
  const start = (page-1)*pageSize+1;
  const end   = Math.min(page*pageSize, totalCount);

  // 페이지 번호 범위 계산 (현재 ±2)
  const range = [];
  for (let i=Math.max(1,page-2); i<=Math.min(totalPages,page+2); i++) range.push(i);

  const btnStyle = (active) => ({
    minWidth:32,height:32,padding:"0 8px",borderRadius:6,cursor:"pointer",fontSize:13,
    background: active?"rgba(251,183,36,0.2)":"rgba(255,255,255,0.04)",
    border: `1px solid ${active?"rgba(251,183,36,0.5)":"rgba(255,255,255,0.08)"}`,
    color: active?"#FBB724":"#64748B",
    fontWeight: active?700:400,
    transition:"all .15s",
  });

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
      <span style={{fontSize:12,color:"#475569"}}>
        전체 <span style={{color:"#94A3B8",fontWeight:600}}>{totalCount.toLocaleString()}</span>개 중{" "}
        <span style={{color:"#94A3B8"}}>{start}–{end}</span>번째
      </span>
      <div style={{display:"flex",gap:4,alignItems:"center"}}>
        <button onClick={()=>onPage(1)}       disabled={page===1}           style={{...btnStyle(false),opacity:page===1?.3:1}}>«</button>
        <button onClick={()=>onPage(page-1)}  disabled={page===1}           style={{...btnStyle(false),opacity:page===1?.3:1}}>‹</button>
        {range[0]>1&&<span style={{color:"#334155",padding:"0 4px"}}>…</span>}
        {range.map(p=>(
          <button key={p} onClick={()=>onPage(p)} style={btnStyle(p===page)}
            onMouseEnter={e=>{if(p!==page){e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.color="#94A3B8";}}}
            onMouseLeave={e=>{if(p!==page){e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.color="#64748B";}}}>
            {p}
          </button>
        ))}
        {range[range.length-1]<totalPages&&<span style={{color:"#334155",padding:"0 4px"}}>…</span>}
        <button onClick={()=>onPage(page+1)}  disabled={page===totalPages}  style={{...btnStyle(false),opacity:page===totalPages?.3:1}}>›</button>
        <button onClick={()=>onPage(totalPages)} disabled={page===totalPages} style={{...btnStyle(false),opacity:page===totalPages?.3:1}}>»</button>
      </div>
      <span style={{fontSize:12,color:"#475569"}}>
        {page} / {totalPages} 페이지
      </span>
    </div>
  );
}

/* ── Spinner / ErrorBanner ──────────────────────────────── */
function Spinner({ text="불러오는 중..." }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 0",gap:16}}>
      <div style={{width:36,height:36,border:"3px solid rgba(255,255,255,0.1)",borderTop:"3px solid #FBB724",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
      <span style={{fontSize:13,color:"#475569"}}>{text}</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{margin:20,padding:"16px 20px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:12,display:"flex",alignItems:"center",gap:12,justifyContent:"space-between"}}>
      <div>
        <div style={{fontSize:13,fontWeight:600,color:"#F87171",marginBottom:4}}>⚠️ S3 연결 오류</div>
        <div style={{fontSize:12,color:"#94A3B8",fontFamily:"monospace"}}>{message}</div>
      </div>
      <button onClick={onRetry} style={{padding:"6px 16px",background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",color:"#F87171",borderRadius:8,cursor:"pointer",fontSize:12,whiteSpace:"nowrap"}}>다시 시도</button>
    </div>
  );
}

/* ── Main App ──────────────────────────────────────────── */
const PAGE_SIZE = 50;

export default function App() {
  const [data,       setData]       = useState({ files:[], totalCount:0, totalPages:0, page:1 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [currentPath,setCurrentPath]= useState("");
  const [activePath, setActivePath] = useState(""); // 사이드바 하이라이트용
  const [search,     setSearch]     = useState("");
  const [searchInput,setSearchInput]= useState("");
  const [sortBy,     setSortBy]     = useState("date");
  const [sortDir,    setSortDir]    = useState("desc");
  const [filterExt,  setFilterExt]  = useState("");
  const [viewMode,   setViewMode]   = useState("grid");
  const [selected,   setSelected]   = useState(null);
  const [sidebarOpen,setSidebarOpen]= useState(true);
  const [page,       setPage]       = useState(1);
  const [showUploader,setShowUploader]=useState(false);
  const [filterType,  setFilterType]  = useState("");

  // 검색 디바운스
  useEffect(()=>{
    const t=setTimeout(()=>{ setSearch(searchInput); setPage(1); },400);
    return ()=>clearTimeout(t);
  },[searchInput]);

  const loadPage = useCallback((opts={})=>{
    const p   = opts.page       ?? page;
    const pfx = opts.prefix     ?? currentPath;
    const s   = opts.search     ?? search;
    const sb  = opts.sortBy     ?? sortBy;
    const sd  = opts.sortDir    ?? sortDir;
    const ext  = opts.ext       ?? filterExt;
    const ftype= opts.fileType  ?? filterType;

    setLoading(true); setError(null);
    const params = new URLSearchParams({
      prefix:  pfx,
      page:    p,
      pageSize:PAGE_SIZE,
      sortBy:  sb,
      sortDir: sd,
      ...(s   && { search: s }),
      ...(ext   && { ext }),
      ...(ftype && { fileType: ftype }),
    });

    fetch(`/api/list?${params}`)
      .then(r=>r.json())
      .then(d=>{
        if(d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false));
  },[page, currentPath, search, sortBy, sortDir, filterExt]);

  useEffect(()=>{ loadPage(); },[loadPage]);

  const handleSort = (newSortBy) => {
    const newDir = sortBy===newSortBy && sortDir==="desc" ? "asc" : "desc";
    setSortBy(newSortBy); setSortDir(newDir); setPage(1);
  };

  const handlePath = (path) => {
    setCurrentPath(path); setActivePath(path); setPage(1);
  };

  // 파일 클릭: 사이드바를 파일 위치로 이동 + 모달 열기
  const handleFileSelect = (file) => {
    const dir = file.key.split("/").slice(0, -1).join("/");
    setActivePath(dir);   // 사이드바 하이라이트
    setSelected(file);    // 모달 오픈
  };

  const handlePage = (p) => {
    setPage(p);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const crumbs = currentPath?["root",...currentPath.split("/")]:["root"];
  const allExts= [...new Set(data.files?.map(f=>getExt(f.key))||[])].sort();

  const SortBtn = ({col, label}) => {
    const active = sortBy===col;
    return (
      <span onClick={()=>handleSort(col)} style={{cursor:"pointer",color:active?"#FBB724":"#334155",fontWeight:active?700:600,userSelect:"none",display:"inline-flex",alignItems:"center",gap:3}}>
        {label}{active?(sortDir==="desc"?" ↓":" ↑"):""}
      </span>
    );
  };

  return (
    <div style={{fontFamily:"'DM Sans',system-ui,sans-serif",background:"#080A0F",color:"#E2E8F0",minHeight:"100vh",display:"flex",flexDirection:"column"}}>

      {/* ── Top Bar ── */}
      <div style={{height:52,background:"rgba(15,17,23,0.95)",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",gap:12,padding:"0 16px",position:"sticky",top:0,zIndex:50,backdropFilter:"blur(12px)"}}>
        <button onClick={()=>setSidebarOpen(o=>!o)} style={{background:"transparent",border:"none",color:"#475569",cursor:"pointer",fontSize:16,padding:"4px 6px",borderRadius:6}}>☰</button>
        <span style={{fontSize:18}}>🎬</span>
        <span style={{fontWeight:700,fontSize:14,color:"#F1F5F9",letterSpacing:.5}}>S3 Video Browser</span>
        <div style={{flex:1,maxWidth:420,marginLeft:16,display:"flex",alignItems:"center",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,overflow:"hidden"}}>
          <span style={{padding:"0 10px",color:"#475569",fontSize:14}}>🔍</span>
          <input value={searchInput} onChange={e=>setSearchInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&setSearch(searchInput)}
            placeholder="파일명 또는 경로 검색..."
            style={{background:"transparent",border:"none",outline:"none",color:"#E2E8F0",fontSize:13,padding:"8px 10px 8px 0",flex:1}}/>
          {searchInput&&<button onClick={()=>{setSearchInput("");setSearch("");setPage(1);}} style={{background:"transparent",border:"none",color:"#475569",cursor:"pointer",padding:"0 10px"}}>✕</button>}
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          {!loading&&!error&&(
            <span style={{fontSize:12,color:"#475569"}}>
              총 <span style={{color:"#94A3B8",fontWeight:600}}>{data.totalCount?.toLocaleString()}</span>개
            </span>
          )}
          <button onClick={()=>setShowUploader(true)} style={{
            display:"flex",alignItems:"center",gap:6,padding:"5px 14px",
            background:"linear-gradient(135deg,rgba(99,102,241,0.2),rgba(59,130,246,0.2))",
            border:"1px solid rgba(99,102,241,0.35)",color:"#818CF8",
            borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,
          }}>⬆️ 업로드</button>
          <button onClick={()=>loadPage()} title="새로고침" style={{background:"transparent",border:"1px solid rgba(255,255,255,0.08)",color:"#475569",cursor:"pointer",padding:"5px 8px",borderRadius:6,fontSize:13}}>↻</button>
          <div style={{display:"flex",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,overflow:"hidden"}}>
            {["grid","list"].map(v=>(
              <button key={v} onClick={()=>setViewMode(v)} style={{background:viewMode===v?"rgba(251,183,36,0.15)":"transparent",border:"none",color:viewMode===v?"#FBB724":"#475569",cursor:"pointer",padding:"6px 10px",fontSize:13}}>{v==="grid"?"⊞":"☰"}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <Sidebar
            currentPath={currentPath}
            activePath={activePath}
            onSelect={handlePath}
          />
        )}}

        {/* ── Main ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* 툴바 */}
          <div style={{padding:"10px 20px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",background:"rgba(10,12,18,0.5)"}}>
            {/* 브레드크럼 */}
            <div style={{display:"flex",alignItems:"center",gap:4,flex:1,flexWrap:"wrap"}}>
              {crumbs.map((c,i)=>(
                <span key={i} style={{display:"flex",alignItems:"center",gap:4}}>
                  {i>0&&<span style={{color:"#334155",fontSize:11}}>/</span>}
                  <span onClick={()=>handlePath(i===0?"":(crumbs.slice(1,i+1).join("/")))}
                    style={{fontSize:12,cursor:"pointer",color:i===crumbs.length-1?"#E2E8F0":"#475569",fontWeight:i===crumbs.length-1?600:400}}>{c}</span>
                </span>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#475569"}}>유형</span>
              <select value={filterType||""} onChange={e=>{setFilterType(e.target.value);setPage(1);}}
                style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"#94A3B8",borderRadius:6,padding:"4px 8px",fontSize:12,outline:"none"}}>
                <option value="">전체</option>
                <option value="video">🎬 동영상</option>
                <option value="image">🖼️ 이미지</option>
              </select>
              <span style={{fontSize:11,color:"#475569"}}>포맷</span>
              <select value={filterExt} onChange={e=>{setFilterExt(e.target.value);setPage(1);}}
                style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"#94A3B8",borderRadius:6,padding:"4px 8px",fontSize:12,outline:"none"}}>
                <option value="">전체</option>
                {allExts.map(e=><option key={e} value={e}>{e.toUpperCase()}</option>)}
              </select>
              <span style={{fontSize:11,color:"#475569"}}>정렬</span>
              <select value={`${sortBy}_${sortDir}`}
                onChange={e=>{ const [sb,sd]=e.target.value.split("_"); setSortBy(sb);setSortDir(sd);setPage(1); }}
                style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"#94A3B8",borderRadius:6,padding:"4px 8px",fontSize:12,outline:"none"}}>
                <option value="date_desc">최신순</option>
                <option value="date_asc">오래된순</option>
                <option value="size_desc">용량 큰순</option>
                <option value="size_asc">용량 작은순</option>
                <option value="name_asc">이름 오름차순</option>
                <option value="name_desc">이름 내림차순</option>
              </select>
            </div>
          </div>

          {/* 컨텐츠 */}
          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>
            {loading ? <Spinner text={`S3에서 파일 목록 로딩 중...`}/>
            : error  ? <ErrorBanner message={error} onRetry={()=>loadPage()}/>
            : data.files?.length===0 ? (
              <div style={{textAlign:"center",padding:"80px 0",color:"#334155"}}>
                <div style={{fontSize:48,marginBottom:12}}>🎞️</div>
                <div style={{fontSize:14}}>{search?"검색 결과가 없습니다":"이 폴더에 동영상이 없습니다"}</div>
              </div>
            ) : viewMode==="grid" ? (
              <>
                <div style={{padding:20,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:12,flex:1}}>
                  {data.files.map(f=><MediaCard key={f.key} file={f} onClick={handleFileSelect}/>)}
                </div>
                <Pagination page={data.page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={PAGE_SIZE} onPage={handlePage}/>
              </>
            ) : (
              <>
                <div style={{padding:"0 20px",flex:1}}>
                  <div style={{background:"#0A0C12",borderRadius:12,border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden",marginTop:20}}>
                    <div style={{display:"grid",gridTemplateColumns:"28px 1fr 80px 100px 110px",padding:"9px 16px",borderBottom:"1px solid rgba(255,255,255,0.08)",fontSize:11,color:"#334155",letterSpacing:.8,gap:8}}>
                      <span/>
                      <SortBtn col="name" label="파일명"/>
                      <span>포맷</span>
                      <SortBtn col="size" label="크기"/>
                      <SortBtn col="date" label="수정일"/>
                    </div>
                    {(data.files||[]).map((f,i)=>{
                      const ext=getExt(f.key); const colors=getThumb(f.key);
                      const isArchived=f.storageClass?.includes("ARCHIVE");
                      return (
                        <div key={f.key} onClick={()=>handleFileSelect(f)}
                          style={{display:"grid",gridTemplateColumns:"28px 1fr 80px 100px 110px",alignItems:"center",padding:"9px 16px",cursor:"pointer",gap:8,borderBottom:i<(data.files?.length-1)?"1px solid rgba(255,255,255,0.04)":"none",transition:"background .12s"}}
                          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <div style={{width:22,height:22,borderRadius:4,background:`linear-gradient(135deg,${colors[1]},${colors[2]})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9}}>{isArchived?"🧊":"▶"}</div>
                          <div style={{overflow:"hidden"}}>
                            <div style={{fontSize:12.5,color:"#CBD5E1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{getName(f.key)}</div>
                            <div style={{fontSize:10,color:"#334155",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{getDir(f.key)}</div>
                          </div>
                          <span style={{fontSize:10,fontWeight:700,color:EXT_COLOR[ext]||"#64748B"}}>{ext.toUpperCase()}</span>
                          <span style={{fontSize:12,color:"#64748B"}}>{fmtSize(f.size)}</span>
                          <span style={{fontSize:11,color:"#475569"}}>{fmtDate(f.lastModified)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Pagination page={data.page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={PAGE_SIZE} onPage={handlePage}/>
              </>
            )}
          </div>
        </div>
      </div>
      {showUploader && (
        <Uploader
          targetPath={currentPath}
          onClose={()=>setShowUploader(false)}
          onUploadDone={()=>loadPage()}
        />
      )}
      {selected&&<VideoModal file={selected} onClose={()=>setSelected(null)}/>}
    </div>
  );
}
