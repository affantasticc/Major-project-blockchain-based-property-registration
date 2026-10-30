import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import contractArtifact from "./abis/PropertyRegistration.json";

// Hardhat artifact is an object with an `abi` field; ethers needs the array.
const ABI = contractArtifact.abi ?? contractArtifact;

// ⚠ Update this after every fresh deploy (npx hardhat run scripts/deploy.cjs --network localhost)
const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const EXPECTED_CHAIN_ID = 31337;

// ─── helpers ────────────────────────────────────────────────────────────────
const short = (a) => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "";
const ts    = (t) => new Date(Number(t) * 1000).toLocaleDateString("en-IN");

// ─── styles (all-in-one, no external CSS file needed) ───────────────────────
const S = {
  page:    { minHeight:"100vh", background:"#0f1220", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:"#e6e8f0", colorScheme:"dark" },
  nav:     { background:"linear-gradient(135deg,#0b0e1a,#151a30)", color:"#fff", padding:"0 28px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 12px #0008", borderBottom:"1px solid #262c48" },
  brand:   { fontSize:20, fontWeight:700, letterSpacing:-0.5 },
  accent:  { color:"#e94560" },
  pill:    (on) => ({ background: on?"rgba(46,213,115,.2)":"rgba(255,255,255,.1)", border:`1px solid ${on?"#2ed573":"rgba(255,255,255,.25)"}`, color: on?"#2ed573":"#fff", borderRadius:999, padding:"6px 18px", fontSize:13, cursor:"pointer" }),
  wrap:    { maxWidth:1060, margin:"0 auto", padding:"0 20px" },
  tabs:    { display:"flex", gap:4, background:"#1a1f35", padding:6, borderRadius:12, margin:"24px 0 20px", boxShadow:"0 1px 6px #0006", border:"1px solid #262c48", flexWrap:"wrap" },
  tab:     (on) => ({ padding:"8px 18px", border:"none", borderRadius:8, background: on?"#e94560":"transparent", color: on?"#fff":"#9aa3b8", fontWeight:500, fontSize:14, cursor:"pointer" }),
  card:    { background:"#1a1f35", borderRadius:16, padding:28, boxShadow:"0 2px 12px #0006", border:"1px solid #262c48", marginBottom:20 },
  h2:      { fontSize:18, fontWeight:700, marginBottom:4, color:"#ffffff" },
  sub:     { fontSize:13, color:"#8b94ab", marginBottom:22 },
  label:   { display:"block", fontSize:13, fontWeight:600, marginBottom:6, color:"#c3c9dc" },
  input:   { width:"100%", padding:"10px 14px", border:"1.5px solid #2a3150", borderRadius:10, fontSize:14, background:"#11152a", color:"#e6e8f0", outline:"none", boxSizing:"border-box" },
  select:  { width:"100%", padding:"10px 14px", border:"1.5px solid #2a3150", borderRadius:10, fontSize:14, background:"#11152a", color:"#e6e8f0", outline:"none", boxSizing:"border-box" },
  row:     { display:"flex", gap:16 },
  fg:      { flex:1, marginBottom:18 },
  mb:      { marginBottom:18 },
  btn:     (c) => ({ padding:"10px 22px", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", background: c==="red"?"#e94560": c==="green"?"#2ed573":"#4c5bd4", color: c==="green"?"#0f1220":"#fff", width:"100%", marginTop:4 }),
  btnSm:   { padding:"6px 14px", border:"1.5px solid #4c5bd4", borderRadius:8, background:"transparent", color:"#b8bfff", fontSize:13, fontWeight:600, cursor:"pointer" },
  alert:   (t) => ({ padding:"11px 16px", borderRadius:10, fontSize:14, marginBottom:14, background: t==="ok"?"rgba(46,213,115,.12)": t==="err"?"rgba(233,69,96,.14)": t==="warn"?"rgba(255,193,7,.12)":"rgba(80,160,255,.12)", color: t==="ok"?"#6ee7a0": t==="err"?"#ff8fa3": t==="warn"?"#ffd966":"#8cc4ff", border:`1px solid ${t==="ok"?"rgba(46,213,115,.4)": t==="err"?"rgba(233,69,96,.45)": t==="warn"?"rgba(255,193,7,.4)":"rgba(80,160,255,.4)"}` }),
  propCard:{ background:"#1f2540", borderRadius:14, padding:20, border:"1.5px solid #2a3150", transition:"box-shadow .2s" },
  grid:    { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 },
  badge:   (c) => ({ display:"inline-block", padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:600, background: c==="blue"?"rgba(59,130,246,.22)": c==="green"?"rgba(16,185,129,.22)": c==="red"?"rgba(239,68,68,.22)":"rgba(139,92,246,.25)", color: c==="blue"?"#93c5fd": c==="green"?"#6ee7b7": c==="red"?"#fca5a5":"#c4b5fd" }),
  mono:    { fontFamily:"monospace", fontSize:12, color:"#aab2c8", wordBreak:"break-all" },
  table:   { width:"100%", borderCollapse:"collapse", fontSize:14 },
  th:      { background:"#151a2e", padding:"9px 13px", textAlign:"left", fontSize:12, fontWeight:700, color:"#9aa3b8", textTransform:"uppercase" },
  td:      { padding:"11px 13px", borderBottom:"1px solid #262c48" },
  center:  { textAlign:"center", padding:"40px 0", color:"#8b94ab" },
  spinner: { display:"inline-block", width:16, height:16, border:"2px solid #fff5", borderTopColor:"#fff", borderRadius:"50%", animation:"spin .7s linear infinite", marginRight:8 },
  warn:    { background:"rgba(255,193,7,.12)", border:"1px solid rgba(255,193,7,.4)", color:"#ffd966", borderRadius:10, padding:"11px 15px", fontSize:13, marginBottom:16 },
};

// ─── global spin keyframe ────────────────────────────────────────────────────
if (!document.getElementById("_theme")) {
  const el = document.createElement("style");
  el.id = "_theme";
  el.textContent = "@keyframes spin{to{transform:rotate(360deg)}} body{margin:0;background:#0f1220} ::placeholder{color:#6b7494;opacity:1}";
  document.head.appendChild(el);
}

// ─── Alert component ─────────────────────────────────────────────────────────
function Alert({ msg }) {
  if (!msg) return null;
  const t = msg.startsWith("✅") ? "ok" : msg.startsWith("❌") ? "err" : msg.startsWith("⚠") ? "warn" : "info";
  return <div style={S.alert(t)}>{msg}</div>;
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spin() { return <span style={S.spinner} />; }

// ════════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [wallet,   setWallet]   = useState("");
  const [contract, setContract] = useState(null);
  const [tab,      setTab]      = useState("my");
  const [msg,      setMsg]      = useState("");

  // ── connect wallet ────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!window.ethereum) return setMsg("❌ MetaMask not found. Please install it.");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const addr   = await signer.getAddress();
      setWallet(addr);

      // 1. correct network?
      const net = await provider.getNetwork();
      if (Number(net.chainId) !== EXPECTED_CHAIN_ID) {
        setContract(null);
        setMsg(`⚠ Wrong network (chain ID ${net.chainId}). Switch MetaMask to Hardhat Local (chain ID ${EXPECTED_CHAIN_ID}).`);
        return;
      }

      // 2. is there actually a contract at this address on the running node?
      const code = await provider.getCode(CONTRACT_ADDRESS);
      if (code === "0x") {
        setContract(null);
        setMsg("⚠ No contract found at this address. Is `npx hardhat node` running? If you restarted it, redeploy and update CONTRACT_ADDRESS.");
        return;
      }

      setContract(new ethers.Contract(CONTRACT_ADDRESS, ABI, signer));
      setMsg("✅ Wallet connected and contract loaded.");
    } catch (e) {
      setMsg("❌ " + (e.shortMessage || e.message || "Connection failed"));
    }
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    window.ethereum.request({ method: "eth_accounts" })
      .then(a => { if (a[0]) connect(); })
      .catch(() => {});

    const onAccounts = () => connect();
    const onChain    = () => window.location.reload();
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);

    return () => {
      window.ethereum.removeListener("accountsChanged", onAccounts);
      window.ethereum.removeListener("chainChanged", onChain);
    };
  }, [connect]);

  const TABS = [
    { id:"my",          label:"My Properties" },
    { id:"register",    label:"Register Property" },
    { id:"transfer",    label:"Transfer Ownership" },
    { id:"inheritance", label:"Inheritance" },
    { id:"audit",       label:"Audit Log" },
  ];

  return (
    <div style={S.page}>
      {/* NAV */}
      <nav style={S.nav}>
        <div style={S.brand}>Block<span style={S.accent}>Property</span>
          <span style={{fontSize:12,fontWeight:400,color:"#aaa",marginLeft:10}}>
            Decentralised Registry · India
          </span>
        </div>
        <button style={S.pill(!!wallet)} onClick={connect}>
          {wallet ? `● ${short(wallet)}` : "Connect MetaMask"}
        </button>
      </nav>

      <div style={S.wrap}>
        {!wallet ? (
          <NotConnected onConnect={connect} msg={msg} />
        ) : (
          <>
            {/* global alert */}
            {msg && <div style={{marginTop:16}}><Alert msg={msg} /></div>}

            {/* tabs */}
            <div style={S.tabs}>
              {TABS.map(t => (
                <button key={t.id} style={S.tab(tab===t.id)} onClick={()=>{ setTab(t.id); setMsg(""); }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* tab views */}
            {tab === "my"          && <MyProperties  contract={contract} wallet={wallet} />}
            {tab === "register"    && <Register       contract={contract} wallet={wallet} />}
            {tab === "transfer"    && <Transfer        contract={contract} />}
            {tab === "inheritance" && <Inheritance     contract={contract} />}
            {tab === "audit"       && <Audit           contract={contract} />}
          </>
        )}
      </div>

      <footer style={{textAlign:"center",padding:"32px 0",marginTop:40,borderTop:"1px solid #262c48",color:"#6b7494",fontSize:13}}>
        Blockchain Property Registry · VTU BE Project · Ethereum + React + Hardhat
      </footer>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  NOT CONNECTED BANNER
// ────────────────────────────────────────────────────────────────────────────
function NotConnected({ onConnect, msg }) {
  return (
    <div style={{textAlign:"center",padding:"70px 24px"}}>
      <div style={{fontSize:60,marginBottom:16}}>🔐</div>
      <h2 style={{fontSize:26,marginBottom:12}}>Connect Your MetaMask Wallet</h2>
      <p style={{color:"#9aa3b8",fontSize:15,marginBottom:28}}>
        Your wallet address is your identity — no username or password needed.
      </p>
      <div style={{maxWidth:520,margin:"0 auto"}}><Alert msg={msg} /></div>
      <button style={{...S.btn(), width:"auto",padding:"12px 36px"}} onClick={onConnect}>
        Connect MetaMask
      </button>
      <div style={{marginTop:28,background:"rgba(80,160,255,.12)",border:"1px solid rgba(80,160,255,.4)",color:"#8cc4ff",borderRadius:12,padding:"16px 24px",display:"inline-block",textAlign:"left",fontSize:14}}>
        <strong>MetaMask network settings</strong><br/>
        Network Name : Hardhat Local<br/>
        RPC URL &nbsp;&nbsp;&nbsp;: http://127.0.0.1:8545<br/>
        Chain ID &nbsp;&nbsp;&nbsp;: 31337<br/>
        Currency &nbsp;&nbsp;&nbsp;: ETH
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  MY PROPERTIES
// ────────────────────────────────────────────────────────────────────────────
function MyProperties({ contract, wallet }) {
  const [props,   setProps]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [sid,     setSid]     = useState("");
  const [found,   setFound]   = useState(null);
  const [msg,     setMsg]     = useState("");

  const load = async () => {
    if (!contract) return setMsg("⚠ Contract not loaded. Deploy first.");
    setLoading(true); setMsg("");
    try {
      const ids = await contract.getMyProperties(wallet);
      const rows = await Promise.all(ids.map(id => fetchProp(contract, id)));
      setProps(rows.filter(Boolean));
    } catch(e) { setMsg("❌ " + (e.reason || e.shortMessage || e.message)); }
    finally { setLoading(false); }
  };

  const search = async () => {
    if (!contract || !sid) return;
    setLoading(true); setFound(null); setMsg("");
    try { setFound(await fetchProp(contract, sid)); }
    catch { setMsg("❌ Property not found."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [contract, wallet]);

  return (
    <div>
      <div style={S.card}>
        <div style={S.h2}>Search by Property ID</div>
        <div style={S.sub}>Look up any property on the blockchain.</div>
        <Alert msg={msg} />
        <div style={{display:"flex",gap:10}}>
          <input style={{...S.input,flex:1}} type="number" placeholder="Enter ID e.g. 1"
            value={sid} onChange={e=>setSid(e.target.value)} />
          <button style={{...S.btnSm,padding:"10px 20px"}} onClick={search} disabled={loading}>
            {loading ? <Spin/> : null}Search
          </button>
        </div>
        {found && <div style={{marginTop:18}}><PropCard p={found}/></div>}
      </div>

      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={S.h2}>My Properties</div>
            <div style={S.sub}>Properties owned by your wallet.</div>
          </div>
          <button style={S.btnSm} onClick={load} disabled={loading}>
            {loading ? <Spin/> : null}Refresh
          </button>
        </div>
        {!loading && props.length === 0 && (
          <div style={S.center}><div style={{fontSize:36,marginBottom:8}}>🏠</div>No properties found.</div>
        )}
        <div style={S.grid}>
          {props.map(p => <PropCard key={p.id} p={p}/>)}
        </div>
      </div>
    </div>
  );
}

// getProperty returns: (id, name, location, area, documentCID, owner, registeredAt)
async function fetchProp(contract, id) {
  const [propId,name,location,area,,owner,registeredAt] = await contract.getProperty(id);
  return { id:Number(propId), name, location, area:Number(area), owner, registeredAt:Number(registeredAt) };
}

function PropCard({ p }) {
  return (
    <div style={S.propCard}>
      <div style={{fontSize:12,fontWeight:700,color:"#e94560",marginBottom:6}}>Property #{p.id}</div>
      <div style={{fontSize:15,fontWeight:600,marginBottom:3}}>{p.name}</div>
      <div style={{fontSize:13,color:"#9aa3b8",marginBottom:10}}>{p.location} · {p.area.toLocaleString()} sq.ft.</div>
      <span style={S.badge("green")}>Registered</span>
      <div style={{...S.mono,marginTop:10}}>Owner: {p.owner}</div>
      <div style={{fontSize:12,color:"#aaa",marginTop:6}}>
        Registered: {ts(p.registeredAt)}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  REGISTER PROPERTY
// ────────────────────────────────────────────────────────────────────────────
function Register({ contract, wallet }) {
  const [f, setF] = useState({ name:"", location:"", area:"", owner:wallet, cid:"" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // keep the owner field in sync if the user switches MetaMask account
  useEffect(() => { setF(prev => ({ ...prev, owner: wallet })); }, [wallet]);

  const submit = async (e) => {
    e.preventDefault();
    if (!contract) return setMsg("⚠ Contract not loaded.");
    setLoading(true); setMsg("⏳ Sending transaction...");
    try {
      const tx = await contract.registerProperty(f.name, f.location, Number(f.area), f.cid || "NO_DOC", f.owner);
      setMsg("⏳ Waiting for confirmation...");
      const rc = await tx.wait();
      setMsg(`✅ Property registered! Tx: ${rc.hash.slice(0,22)}...`);
      setF({ name:"", location:"", area:"", owner:wallet, cid:"" });
    } catch(e) { setMsg("❌ " + (e.reason || e.shortMessage || e.message)); }
    finally { setLoading(false); }
  };

  return (
    <div style={S.card}>
      <div style={S.h2}>Register New Property</div>
      <div style={S.sub}>Only admin (deployer account) can register. Fill all details and submit.</div>
      <Alert msg={msg} />
      <form onSubmit={submit}>
        <div style={S.mb}>
          <label style={S.label}>Property Name</label>
          <input style={S.input} placeholder="e.g. Green Villa" value={f.name}
            onChange={e=>setF({...f,name:e.target.value})} required />
        </div>
        <div style={S.mb}>
          <label style={S.label}>Location / Survey Number</label>
          <input style={S.input} placeholder="e.g. Sy.No.45, Whitefield, Bengaluru" value={f.location}
            onChange={e=>setF({...f,location:e.target.value})} required />
        </div>
        <div style={S.row}>
          <div style={S.fg}>
            <label style={S.label}>Area (sq.ft.)</label>
            <input style={S.input} type="number" min="1" placeholder="e.g. 1200" value={f.area}
              onChange={e=>setF({...f,area:e.target.value})} required />
          </div>
          <div style={S.fg}>
            <label style={S.label}>Owner Wallet Address</label>
            <input style={S.input} placeholder="0x..." value={f.owner}
              onChange={e=>setF({...f,owner:e.target.value})} required />
          </div>
        </div>
        <div style={S.mb}>
          <label style={S.label}>IPFS Document CID <span style={{color:"#aaa",fontWeight:400}}>(optional for prototype)</span></label>
          <input style={S.input} placeholder="QmXxx... or leave blank" value={f.cid}
            onChange={e=>setF({...f,cid:e.target.value})} />
        </div>
        <button style={S.btn()} type="submit" disabled={loading}>
          {loading && <Spin/>}Register on Blockchain
        </button>
      </form>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  TRANSFER OWNERSHIP
// ────────────────────────────────────────────────────────────────────────────
function Transfer({ contract }) {
  const [f,        setF]       = useState({ id:"", to:"", reason:"Sale" });
  const [history,  setHistory] = useState([]);
  const [hid,      setHid]     = useState("");
  const [loading,  setLoading] = useState(false);
  const [msg,      setMsg]     = useState("");
  const reasons = ["Sale","Gift","Court Order","Auction","Government Acquisition"];

  const transfer = async (e) => {
    e.preventDefault();
    if (!contract) return setMsg("⚠ Contract not loaded.");
    setLoading(true); setMsg("⏳ Sending transaction...");
    try {
      const tx = await contract.transferProperty(Number(f.id), f.to, f.reason);
      setMsg("⏳ Waiting for confirmation...");
      await tx.wait();
      setMsg("✅ Ownership transferred successfully!");
      setF({ id:"", to:"", reason:"Sale" });
    } catch(e) { setMsg("❌ " + (e.reason || e.shortMessage || e.message)); }
    finally { setLoading(false); }
  };

  const fetchHistory = async () => {
    if (!contract || !hid) return;
    setLoading(true); setMsg("");
    try {
      const h = await contract.getTransferHistory(Number(hid));
      setHistory(h.map(r=>({ from:r.from, to:r.to, reason:r.reason, ts:Number(r.timestamp) })));
    } catch(e) { setMsg("❌ " + (e.reason || e.shortMessage || e.message)); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={S.card}>
        <div style={S.h2}>Transfer Property Ownership</div>
        <div style={S.sub}>Only the current owner can transfer. The contract verifies ownership automatically.</div>
        <Alert msg={msg} />
        <div style={S.warn}>⚠ This action is irreversible and permanently recorded on the blockchain.</div>
        <form onSubmit={transfer}>
          <div style={S.row}>
            <div style={S.fg}>
              <label style={S.label}>Property ID</label>
              <input style={S.input} type="number" placeholder="e.g. 1" value={f.id}
                onChange={e=>setF({...f,id:e.target.value})} required />
            </div>
            <div style={S.fg}>
              <label style={S.label}>Reason</label>
              <select style={S.select} value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}>
                {reasons.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div style={S.mb}>
            <label style={S.label}>New Owner Wallet Address</label>
            <input style={S.input} placeholder="0x..." value={f.to}
              onChange={e=>setF({...f,to:e.target.value})} required />
          </div>
          <button style={S.btn("red")} type="submit" disabled={loading}>
            {loading && <Spin/>}Transfer Ownership
          </button>
        </form>
      </div>

      <div style={S.card}>
        <div style={S.h2}>Transfer History</div>
        <div style={S.sub}>Immutable audit trail of all past ownership changes.</div>
        <div style={{display:"flex",gap:10,marginBottom:20}}>
          <input style={{...S.input,flex:1}} type="number" placeholder="Property ID"
            value={hid} onChange={e=>setHid(e.target.value)} />
          <button style={{...S.btnSm,padding:"10px 20px"}} onClick={fetchHistory} disabled={loading}>
            Fetch
          </button>
        </div>
        {history.length > 0 && (
          <div style={{overflowX:"auto"}}>
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>#</th>
                <th style={S.th}>From</th>
                <th style={S.th}>To</th>
                <th style={S.th}>Reason</th>
                <th style={S.th}>Date</th>
              </tr></thead>
              <tbody>
                {history.map((r,i)=>(
                  <tr key={i}>
                    <td style={S.td}>{i+1}</td>
                    <td style={{...S.td,...S.mono}}>{short(r.from)}</td>
                    <td style={{...S.td,...S.mono}}>{short(r.to)}</td>
                    <td style={S.td}><span style={S.badge("blue")}>{r.reason}</span></td>
                    <td style={{...S.td,color:"#888",fontSize:13}}>{ts(r.ts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  INHERITANCE
// ────────────────────────────────────────────────────────────────────────────
function Inheritance({ contract }) {
  const [mode,    setMode]    = useState("nominee");
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState("");

  // nominee form
  const [nf, setNf] = useState({ id:"", wallet:"", name:"", share:"100", relation:"Son" });
  // will form
  const [wf, setWf] = useState({ id:"", cid:"" });
  // death form
  const [df, setDf] = useState({ id:"" });
  const [heirs, setHeirs] = useState([{ wallet:"", share:"" }]);

  const relations = ["Son","Daughter","Spouse","Father","Mother","Brother","Sister","Other"];

  const assignNominee = async (e) => {
    e.preventDefault();
    if (!contract) return setMsg("⚠ Contract not loaded.");
    setLoading(true); setMsg("⏳ Submitting...");
    try {
      const tx = await contract.assignNominee(Number(nf.id), nf.wallet, nf.name, Number(nf.share), nf.relation);
      await tx.wait();
      setMsg("✅ Nominee assigned for Property #" + nf.id);
      setNf({ id:"", wallet:"", name:"", share:"100", relation:"Son" });
    } catch(e) { setMsg("❌ " + (e.reason || e.shortMessage || e.message)); }
    finally { setLoading(false); }
  };

  const uploadWill = async (e) => {
    e.preventDefault();
    if (!contract) return setMsg("⚠ Contract not loaded.");
    setLoading(true); setMsg("⏳ Uploading will CID...");
    try {
      const tx = await contract.uploadWill(Number(wf.id), wf.cid);
      await tx.wait();
      setMsg("✅ Will CID recorded on blockchain for Property #" + wf.id);
      setWf({ id:"", cid:"" });
    } catch(e) { setMsg("❌ " + (e.reason || e.shortMessage || e.message)); }
    finally { setLoading(false); }
  };

  const triggerDeath = async (e) => {
    e.preventDefault();
    if (!contract) return setMsg("⚠ Contract not loaded.");
    const legalH = heirs.filter(h=>h.wallet);
    const shares = legalH.map(h=>Number(h.share));
    setLoading(true); setMsg("⏳ Executing inheritance...");
    try {
      const tx = await contract.executeInheritance(Number(df.id), legalH.map(h=>h.wallet), shares);
      await tx.wait();
      setMsg("✅ Inheritance executed for Property #" + df.id);
      setDf({ id:"" }); setHeirs([{ wallet:"", share:"" }]);
    } catch(e) { setMsg("❌ " + (e.reason || e.shortMessage || e.message)); }
    finally { setLoading(false); }
  };

  const addHeir = () => setHeirs(h=>[...h,{wallet:"",share:""}]);
  const updHeir = (i,k,v) => setHeirs(h=>h.map((x,j)=>j===i?{...x,[k]:v}:x));

  return (
    <div>
      <div style={S.tabs}>
        {["nominee","will","death"].map(m=>(
          <button key={m} style={S.tab(mode===m)}
            onClick={()=>{ setMode(m); setMsg(""); }}>
            { m==="nominee"?"Assign Nominee": m==="will"?"Upload Will":"Trigger Inheritance (Admin)" }
          </button>
        ))}
      </div>

      <Alert msg={msg} />

      {/* ── Nominee ─────────────────────────────────────────── */}
      {mode==="nominee" && (
        <div style={S.card}>
          <div style={S.h2}>Assign Nominee</div>
          <div style={S.sub}>
            The nominee automatically receives ownership on your death. Multiple nominees allowed — shares must total 100%.
          </div>
          <form onSubmit={assignNominee}>
            <div style={S.row}>
              <div style={S.fg}>
                <label style={S.label}>Property ID</label>
                <input style={S.input} type="number" placeholder="1" value={nf.id}
                  onChange={e=>setNf({...nf,id:e.target.value})} required />
              </div>
              <div style={S.fg}>
                <label style={S.label}>Share %</label>
                <input style={S.input} type="number" min="1" max="100" value={nf.share}
                  onChange={e=>setNf({...nf,share:e.target.value})} required />
              </div>
            </div>
            <div style={S.mb}>
              <label style={S.label}>Nominee Wallet Address</label>
              <input style={S.input} placeholder="0x..." value={nf.wallet}
                onChange={e=>setNf({...nf,wallet:e.target.value})} required />
            </div>
            <div style={S.row}>
              <div style={S.fg}>
                <label style={S.label}>Full Name</label>
                <input style={S.input} placeholder="e.g. Rahul Kumar" value={nf.name}
                  onChange={e=>setNf({...nf,name:e.target.value})} required />
              </div>
              <div style={S.fg}>
                <label style={S.label}>Relation</label>
                <select style={S.select} value={nf.relation}
                  onChange={e=>setNf({...nf,relation:e.target.value})}>
                  {relations.map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <button style={S.btn()} type="submit" disabled={loading}>
              {loading&&<Spin/>}Assign Nominee
            </button>
          </form>
        </div>
      )}

      {/* ── Will ─────────────────────────────────────────────── */}
      {mode==="will" && (
        <div style={S.card}>
          <div style={S.h2}>Upload Will (IPFS CID)</div>
          <div style={S.sub}>
            Upload your will PDF to Pinata/IPFS separately, then paste the CID here.
            The CID is stored permanently on the blockchain.
          </div>
          <form onSubmit={uploadWill}>
            <div style={S.mb}>
              <label style={S.label}>Property ID</label>
              <input style={S.input} type="number" placeholder="1" value={wf.id}
                onChange={e=>setWf({...wf,id:e.target.value})} required />
            </div>
            <div style={S.mb}>
              <label style={S.label}>Will Document IPFS CID</label>
              <input style={S.input} placeholder="QmXxx..." value={wf.cid}
                onChange={e=>setWf({...wf,cid:e.target.value})} required />
            </div>
            <button style={S.btn()} type="submit" disabled={loading}>
              {loading&&<Spin/>}Store Will CID on Blockchain
            </button>
          </form>
        </div>
      )}

      {/* ── Death / Inheritance Trigger ──────────────────────── */}
      {mode==="death" && (
        <div style={S.card}>
          <div style={S.h2}>Trigger Inheritance — Admin Only</div>
          <div style={S.sub}>
            Admin declares death after verification. Inheritance executes automatically:
            Nominee → Will → Rule-based legal heirs.
          </div>
          <div style={S.warn}>
            ⚠ Only the deployer (Account #0) can call this. In production this is automated via Chainlink oracles + government death registry API.
          </div>
          <form onSubmit={triggerDeath}>
            <div style={S.mb}>
              <label style={S.label}>Property ID</label>
              <input style={S.input} type="number" placeholder="1" value={df.id}
                onChange={e=>setDf({id:e.target.value})} required />
            </div>
            <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>
              Legal Heirs <span style={{color:"#aaa",fontWeight:400,fontSize:13}}>(only if no nominee/will)</span>
            </div>
            {heirs.map((h,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:10}}>
                <input style={{...S.input,flex:2}} placeholder="0x wallet address"
                  value={h.wallet} onChange={e=>updHeir(i,"wallet",e.target.value)} />
                <input style={{...S.input,flex:1,maxWidth:100}} type="number" placeholder="Share %"
                  value={h.share} onChange={e=>updHeir(i,"share",e.target.value)} />
              </div>
            ))}
            <button type="button" style={{...S.btnSm,marginBottom:16}} onClick={addHeir}>
              + Add Heir
            </button>
            <br/>
            <button style={S.btn("red")} type="submit" disabled={loading}>
              {loading&&<Spin/>}Declare Death & Execute Inheritance
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  AUDIT LOG
// ────────────────────────────────────────────────────────────────────────────
function Audit({ contract }) {
  const [id,      setId]      = useState("");
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState("");

  // (renamed from `fetch` so it no longer shadows the browser's window.fetch)
  const fetchEvents = async () => {
    if (!contract || !id) return;
    setLoading(true); setLogs([]); setMsg("");
    try {
      // registration events
      const regF  = contract.filters.PropertyRegistered(Number(id));
      const regE  = await contract.queryFilter(regF, 0, "latest");
      // transfer events
      const trnF  = contract.filters.OwnershipTransferred(Number(id));
      const trnE  = await contract.queryFilter(trnF, 0, "latest");
      // inheritance events
      const inhF  = contract.filters.InheritanceExecuted(Number(id));
      const inhE  = await contract.queryFilter(inhF, 0, "latest");

      // sort everything by block order so the timeline is consistent
      const all = [
        ...regE.map(e=>({ type:"Registered", color:"green", tx:e.transactionHash,
          detail:`Owner: ${short(e.args.owner)} · ${e.args.name}`,
          ts: Number(e.blockNumber) })),
        ...trnE.map(e=>({ type:"Transferred", color:"blue", tx:e.transactionHash,
          detail:`${short(e.args.from)} → ${short(e.args.to)} · ${e.args.reason}`,
          ts: Number(e.blockNumber) })),
        ...inhE.map(e=>({ type:"Inheritance", color:"purple", tx:e.transactionHash,
          detail:`New owner: ${short(e.args.newOwner)} · Mode: ${e.args.mode}`,
          ts: Number(e.blockNumber) })),
      ].sort((a,b)=>a.ts-b.ts);

      if (all.length===0) setMsg("⚠ No events found for Property #" + id);
      else setLogs(all);
    } catch(e) { setMsg("❌ " + (e.reason || e.shortMessage || e.message)); }
    finally { setLoading(false); }
  };

  return (
    <div style={S.card}>
      <div style={S.h2}>Blockchain Audit Log</div>
      <div style={S.sub}>Every event is permanently and immutably recorded on-chain.</div>
      <Alert msg={msg} />
      <div style={{display:"flex",gap:10,marginBottom:20}}>
        <input style={{...S.input,flex:1}} type="number" placeholder="Property ID"
          value={id} onChange={e=>setId(e.target.value)} />
        <button style={{...S.btnSm,padding:"10px 20px",background:"#4c5bd4",color:"#fff",border:"none"}}
          onClick={fetchEvents} disabled={loading}>
          {loading?<Spin/>:null}Fetch Events
        </button>
      </div>
      {logs.length>0 && (
        <div style={{position:"relative"}}>
          <div style={{position:"absolute",left:16,top:8,bottom:8,width:2,background:"#2a3150"}}/>
          {logs.map((l,i)=>(
            <div key={i} style={{display:"flex",gap:20,marginBottom:20,paddingLeft:44,position:"relative"}}>
              <div style={{position:"absolute",left:8,top:8,width:18,height:18,borderRadius:"50%",
                background: l.color==="green"?"#d1fae5":l.color==="blue"?"#dbeafe":"#ede9fe",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,
                color: l.color==="green"?"#065f46":l.color==="blue"?"#1e40af":"#5b21b6"}}>
                {l.type[0]}
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={S.badge(l.color)}>{l.type}</span>
                </div>
                <div style={{fontSize:14,marginBottom:4}}>{l.detail}</div>
                <div style={S.mono}>Tx: {l.tx?.slice(0,28)}...</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}