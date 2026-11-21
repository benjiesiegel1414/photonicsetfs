// PhotonicsETFs.com static site builder.  node scripts/build.mjs
// Reads data/funds.csv (synced daily from the Google Sheet), content/funds.json and
// content/articles/*.html, and writes the whole site to the repo root.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SITE="https://photonicsetfs.com";
const GA_ID="G-2Q61DCF15V";   // GA4 measurement ID for PhotonicsETFs (e.g. "G-XXXXXXX"). Leave blank to disable.
const SHEET="https://docs.google.com/spreadsheets/d/e/2PACX-1vRnQq9DFzVp4SUEZJLRPl1RinG_GASmoy6EjZk1895Zb-6GGroUiMevt4KzjyeiIxDsA0WFSQa9fMD1/pub?gid=0&single=true&output=csv";
const EMAIL="Business@TopDividendETFs.com";
const PRO="https://topdividendetfspro.com/";
const NOW=new Date();
const YEAR=NOW.getFullYear();

const FOCUS=[
 {id:"litho",wl:405,c:"#7B2FF7",ci:"#AC8BFF",label:"Optical chips",name:"Lithography & optical chips",desc:"The light sources, lithography systems and optical chips used to make semiconductors."},
 {id:"quantum",wl:450,c:"#2B6BFF",ci:"#7FA6FF",label:"Quantum & lasers",name:"Quantum & laser systems",desc:"Industrial and scientific lasers, photonic quantum computing and precision optics."},
 {id:"fiber",wl:490,c:"#00D4E8",ci:"#4FE4F4",label:"Fiber & networks",name:"Fiber & optical networking",desc:"Optical transceivers, lasers, fiber and networking systems that carry data as light."},
 {id:"datacenter",wl:530,c:"#38E08A",ci:"#63EBA6",label:"AI interconnect",name:"AI datacenter interconnect",desc:"Optical links, co-packaged optics and photonic chips inside AI data centers."},
 {id:"vision",wl:580,c:"#F5C518",ci:"#FFD84D",label:"Machine vision",name:"Machine vision & sensing",desc:"LiDAR, imaging sensors and machine vision that measure the world with light."},
 {id:"space",wl:610,c:"#FF8A2B",ci:"#FFA85C",label:"Space optics",name:"Space & satellite optics",desc:"Laser crosslinks between satellites and space-based optical systems."},
 {id:"directed",wl:660,c:"#FF3B4E",ci:"#FF7B87",label:"Directed energy",name:"Defense & directed energy",desc:"High-energy lasers and optical systems used in defense."}];
const FBY=Object.fromEntries(FOCUS.map(f=>[f.id,f]));

/* ---------- data ---------- */
function splitCSV(line){const o=[];let c="",q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(q){if(ch==='"'){if(line[i+1]==='"'){c+='"';i++;}else q=false;}else c+=ch;}else if(ch==='"')q=true;else if(ch===","){o.push(c);c="";}else c+=ch;}o.push(c);return o.map(v=>v.trim());}
const AL={ticker:["symbol","ticker"],name:["name","etf name","fund name"],issuer:["issuer","etf provider","provider"],focus:["focus","category"],aum:["aum","assets"],exp:["expense","expense ratio","er"],inception:["inception","inception date","launch date"]};
const pAum=v=>{const m=String(v||"").replace(/[$,\s]/g,"").match(/^(-?[\d.]+)([KMBT]?)$/i);return m?+m[1]*({K:1e3,M:1e6,B:1e9,T:1e12}[(m[2]||"M").toUpperCase()]):null;};
const pPct=v=>{const n=parseFloat(String(v||"").replace(/[%\s]/g,""));return isNaN(n)?null:n;};
const pDate=v=>{let m=String(v||"").trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);if(m){let y=+m[3];if(y<100)y+=2000;return `${y}-${String(m[1]).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`;}m=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[0]:null;};
const raw=fs.readFileSync(path.join(ROOT,"data","funds.csv"),"utf8").replace(/^﻿/,"").trim().split(/\r?\n/);
const hdr=splitCSV(raw.shift()).map(h=>h.toLowerCase());const ix={};for(const k in AL)ix[k]=AL[k].map(a=>hdr.indexOf(a)).find(i=>i>-1)??-1;
const PROF=JSON.parse(fs.readFileSync(path.join(ROOT,"content","funds.json"),"utf8"));
const FUNDS=raw.map((l,i)=>{const c=splitCSV(l),g=k=>ix[k]>-1?(c[ix[k]]||""):"";const t=g("ticker").replace(/\$/g,"").toUpperCase().trim(),f=g("focus").toLowerCase().trim();if(!t||!FBY[f])return null;
  const inc=pDate(g("inception"));return {ticker:t,slug:t.toLowerCase(),name:g("name")||t,issuer:g("issuer"),focus:f,fo:FBY[f],aum:pAum(g("aum")),exp:pPct(g("exp")),inception:inc,age:inc?(NOW-new Date(inc+"T12:00:00"))/864e5:null,curated:i,prof:PROF[t]||null};}).filter(Boolean);
if(!FUNDS.length)throw new Error("No funds parsed from data/funds.csv");
const BY=Object.fromEntries(FUNDS.map(f=>[f.ticker,f]));
const byAum=[...FUNDS].sort((a,b)=>(b.aum??-1)-(a.aum??-1));
const pick={largest:byAum[0],cheapest:[...FUNDS].filter(f=>f.exp!=null).sort((a,b)=>a.exp-b.exp)[0],priciest:[...FUNDS].filter(f=>f.exp!=null).sort((a,b)=>b.exp-a.exp)[0],newest:[...FUNDS].filter(f=>f.inception).sort((a,b)=>b.inception.localeCompare(a.inception))[0],oldest:[...FUNDS].filter(f=>f.inception).sort((a,b)=>a.inception.localeCompare(b.inception))[0]};
const TOTAL=FUNDS.reduce((s,f)=>s+(f.aum||0),0);
const AVGEXP=(()=>{const l=FUNDS.filter(f=>f.exp!=null);return l.length?l.reduce((s,f)=>s+f.exp,0)/l.length:null;})();

const ALPHA=[...FUNDS].sort((a,b)=>a.ticker.localeCompare(b.ticker));
const PAIRS=[];for(let i=0;i<ALPHA.length;i++)for(let j=i+1;j<ALPHA.length;j++)PAIRS.push([ALPHA[i],ALPHA[j]]);
// big-vs-big matchups first for display; URLs stay alphabetical so they never change
const PAIRS_POP=[...PAIRS].sort((p,q)=>((q[0].aum||0)+(q[1].aum||0))-((p[0].aum||0)+(p[1].aum||0)));
const pairUrl=(a,b)=>{const [x,y]=[a,b].sort((m,n)=>m.ticker.localeCompare(n.ticker));return `/compare/${x.slug}-vs-${y.slug}`;};
const STOCKS_INFO=JSON.parse(fs.readFileSync(path.join(ROOT,"content","stocks.json"),"utf8"));
const GLOSSARY=JSON.parse(fs.readFileSync(path.join(ROOT,"content","glossary.json"),"utf8"));
const slugify=x=>String(x).toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
// which funds hold which stocks (from the holdings snapshots in content/funds.json)
const HOLD={};for(const f of FUNDS){const h=f.prof&&f.prof.holdings;if(!h||(f.prof.flags||[]).includes("leveraged"))continue;for(const [n,t,w] of h.rows){(HOLD[n]=HOLD[n]||{name:n,ticker:t,in:[]}).in.push([f,w]);}}
const STOCKS=Object.values(HOLD).sort((a,b)=>b.in.length-a.in.length||b.in.reduce((x,y)=>x+y[1],0)-a.in.reduce((x,y)=>x+y[1],0));
const HFUNDS=FUNDS.filter(f=>f.prof&&f.prof.holdings&&!(f.prof.flags||[]).includes("leveraged"));
const shared=(a,b)=>{const A=a.prof?.holdings?.rows||[],B=new Set((b.prof?.holdings?.rows||[]).map(r=>r[0]));return A.filter(r=>B.has(r[0])).map(r=>r[0]);};

/* ---------- format ---------- */
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],MONL=["January","February","March","April","May","June","July","August","September","October","November","December"];
const fAum=v=>v==null?"—":v>=1e9?"$"+(v/1e9).toFixed(v>=1e10?1:2)+"B":v>=1e6?"$"+Math.round(v/1e6)+"M":"$"+Math.round(v/1e3)+"K";
const fExp=v=>v==null?"—":v.toFixed(2)+"%";
const fDate=s=>{if(!s)return "—";const p=s.split("-");return `${MON[+p[1]-1]} ${+p[2]}, ${p[0]}`;};
const fDateL=s=>{if(!s)return "";const p=s.split("-");return `${MONL[+p[1]-1]} ${+p[2]}, ${p[0]}`;};
const age=f=>f.age==null?"":f.age<60?Math.max(1,Math.round(f.age))+" days":Math.round(f.age/30.4)+" months";
const live=(f,k,fm)=>`<span data-live="${f.ticker}:${k}">${fm(f[k])}</span>`;
const tlink=f=>`<a href="/etf/${f.slug}">$${f.ticker}</a>`;

/* ---------- layout ---------- */
const NETWORK=[["TopETFs","topetfs.com"],["TopDividendETFs","topdividendetfs.com"],["TopDividendETFsPRO","topdividendetfspro.com"],["WeeklyETFs","weeklyetfs.com"],["MonthlyETFs","monthlyetfs.com"],["GrowthETFs","growthetfs.com"],["ETFTotalReturns","etftotalreturns.com"],["TopDividendTools","topdividendtools.com"],["DividendProjection","dividendprojection.com"]];
const NAV=[["Top ETFs","/#rankings"],["Compare","/compare/"],["Guides","/blog"],["About","/about"],["Advertise","/advertise"]];
const OG=SITE+"/photonics.png";
function head({title,desc,canonical,type="website",ld,faq,extra=""}){
  const t=esc(title),d=esc(desc);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${t}</title>
<meta name="description" content="${d}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#05070E">
<link rel="canonical" href="${SITE}${canonical}">
<meta property="og:site_name" content="PhotonicsETFs">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:type" content="${type}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:image" content="${OG}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="628">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@DevotedDividend">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${OG}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
<script>document.documentElement.className+=" js";</script>
${GA_ID?`<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>`:""}
${ld?`<script type="application/ld+json">${JSON.stringify(ld)}</script>`:""}
${faq&&faq.length?`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"FAQPage",mainEntity:faq.map(([q,a])=>({"@type":"Question",name:q,acceptedAnswer:{"@type":"Answer",text:a.replace(/<[^>]+>/g,"")}}))})}</script>`:""}
${extra}
</head>`;
}
const SICON=`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`;
const top=active=>{
  const cur=h=>active===h?' aria-current="page"':"";
  const menu=(label,href,inner,cls="")=>`<div class="mi${cls}"><a class="mb" href="${href}"${cur(href)} aria-haspopup="true">${label}<i aria-hidden="true">&#9662;</i></a><div class="menu">${inner}</div></div>`;
  return `<a class="skip" href="#main">Skip to content</a>
<div id="rail"><div id="railFill"></div></div>
<header class="site"><div class="wrap hbar">
<a class="mark" href="/" aria-label="PhotonicsETFs home"><span class="aperture" aria-hidden="true"></span><b>PHOTONICS<span>ETFs</span></b></a>
<form class="hsearch" role="search" action="/" autocomplete="off">${SICON}<input type="search" id="sq" placeholder="Search ETFs, stocks and guides" aria-label="Search PhotonicsETFs" aria-controls="sdd" aria-expanded="false" autocomplete="off" spellcheck="false"><kbd aria-hidden="true">/</kbd><div class="sdd" id="sdd" role="listbox" hidden></div></form>
<button id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="nav">&#9776;</button>
<nav class="main" id="nav" aria-label="Primary">
${menu("ETFs","/#rankings",`<div class="mcol"><span class="mh">All ${FUNDS.length} photonics ETFs</span><div class="mgrid">${byAum.map(f=>`<a href="/etf/${f.slug}" style="--c:${f.fo.c}"><b>$${f.ticker}</b><span>${esc(f.issuer)}</span><em>${fAum(f.aum)}</em></a>`).join("")}</div><a class="mall" href="/#rankings">See the full table &rarr;</a></div>`," wide")}
${menu("Compare","/compare/",`<div class="mcol"><span class="mh">Popular matchups</span><div class="mlist two">${PAIRS_POP.slice(0,10).map(([a,b])=>`<a href="${pairUrl(a,b)}">${a.ticker} vs ${b.ticker}</a>`).join("")}</div><a class="mall" href="/compare/">All ${PAIRS.length} comparisons &rarr;</a></div>`)}
${menu("Guides","/blog",`<div class="mcol"><span class="mh">Photonics ETF guides</span><div class="mlist">${ARTICLES.map(a=>`<a href="/${a.slug}">${esc(a.short||a.title)}</a>`).join("")}</div><a class="mall" href="/blog">All ${ARTICLES.length} guides &rarr;</a></div>`," wide")}
${menu("Research","/holdings",`<div class="mcol"><span class="mh">Dig deeper</span><div class="mlist"><a href="/holdings">Photonics stocks the ETFs own</a><a href="/holdings#overlap">Holdings overlap</a><a href="/glossary">Photonics glossary</a><a href="/#spectrum">The photonics spectrum</a><a href="/#faq">Photonics ETF FAQ</a></div></div>`)}
<a href="/about"${cur("/about")}>About</a><a class="navcta" href="/advertise"${cur("/advertise")}>Advertise</a>
</nav>
</div></header>`;};
const DISC=`PhotonicsETFs.com is published by Dividend Empire LLC for informational and educational purposes only and does not constitute investment, financial, tax or legal advice. Nothing here is a buy or sell signal. Fund data comes from our own data sheet and issuer materials, is refreshed daily and can be delayed, incomplete or incorrect. Always verify against the issuer's website and prospectus, do your own research and consult a licensed financial professional. Past performance does not guarantee future results. Investing involves risk, including possible loss of principal. Price charts are provided by TradingView and may be delayed.`;
const foot=()=>`
<div class="network" id="network"><div class="wrap"><div class="lbl">Our network</div><div class="chips">${NETWORK.map(([n,d])=>`<a class="pill" href="https://${d}/" target="_blank" rel="noopener">${n}</a>`).join("")}<a class="pill here" href="/">PhotonicsETFs</a></div></div></div>
<footer><div class="wrap">
<div class="fgrid">
<div class="fabout"><a class="mark" href="/"><span class="aperture" aria-hidden="true"></span><b>PHOTONICS<span>ETFs</span></b></a><p>Independent research and live data on every ETF built around photonics: lasers, optics, fiber, optical interconnect and the light-based tools that make chips. Part of the Dividend Empire network.</p></div>
<div><h4>Photonics ETFs</h4>${byAum.map(f=>`<a href="/etf/${f.slug}">$${f.ticker} ${esc(f.issuer)}</a>`).join("")}</div>
<div><h4>Research</h4><a href="/#rankings">All photonics ETFs</a><a href="/compare/">Compare photonics ETFs</a><a href="/holdings">Photonics stocks the ETFs own</a><a href="/glossary">Photonics glossary</a>${ARTICLES.slice(0,6).map(a=>`<a href="/${a.slug}">${esc(a.short||a.title)}</a>`).join("")}<a href="/blog">All guides</a></div>
<div><h4>Company</h4><a href="/about">About</a><a href="/advertise">Advertise</a><a href="/disclaimer">Disclaimer</a><a href="/privacy-policy">Privacy policy</a><a href="/terms-of-use">Terms of use</a><a href="mailto:${EMAIL}">${EMAIL}</a></div>
</div>
<div class="legal"><div class="top"><span>&copy; ${YEAR} DIVIDEND EMPIRE LLC</span><span>PHOTONICSETFS.COM</span></div>${DISC}</div>
</div></footer>
<script>window.PH_FOCUS=${JSON.stringify(FOCUS.map(({id,c,ci,label,name})=>({id,c,ci,label,name})))};</script>
<script src="/assets/app.js" defer></script>
</body>
</html>`;
const page=(o,body)=>head(o)+`\n<body>\n${top(o.active)}\n<main id="main">\n${body}\n</main>\n${foot()}`;

/* ---------- shared blocks ---------- */
const advSlot=`<a class="slot" href="/advertise" data-ga="slot-advertise"><div><b>Your photonics ETF here</b><span>Reach investors actively researching photonics funds. One placement per page.</span></div><em>ADVERTISE &rarr;</em></a>`;
const proSlot=`<a class="slot pro" href="${PRO}" target="_blank" rel="noopener" data-ga="slot-pro"><div><b>Top<span>DividendETFs</span>PRO</b><span>Screen 160+ income ETFs with grades, tax treatment and advanced filters.</span></div><em>GO PRO &rarr;</em></a>`;
const slot=(s,lbl="Advertisement")=>`<div class="sponsor"><div class="wrap"><div class="lbl">${lbl}</div>${s}</div></div>`;
const ADVISORY=`<div class="advisory"><b>&#9888; NOT FINANCIAL ADVICE:</b> Nothing on this site is a buy or sell signal. Data can lag the issuer. Informational and educational purposes only.</div>`;
function fundTable(list,me){return `<div class="ft"><div class="ft-h"><span>ETF</span><span>Focus</span><span>AUM</span><span>Expense</span><span>Launched</span></div>${list.map(f=>`<a class="ft-r${me&&f.ticker===me?" me":""}" href="/etf/${f.slug}" style="--c:${f.fo.c};--ci:${f.fo.ci}"><span class="ft-n"><b>$${f.ticker}</b><em>${esc(f.name)}</em><small>${esc(f.issuer)}</small></span><span class="ft-f"><span class="fx">${f.fo.label}</span></span><span class="ft-v" data-l="AUM">${live(f,"aum",fAum)}</span><span class="ft-v" data-l="Expense">${live(f,"exp",fExp)}</span><span class="ft-v" data-l="Launched">${fDate(f.inception)}</span></a>`).join("")}</div>`;}
/* ---------- charts (plain HTML and CSS, no scripts, responsive) ---------- */
function bars({title,rows,fmt=v=>String(v),note,src,me,max}){const mx=max||Math.max(...rows.map(r=>r[1]||0))||1;
  return `<figure class="fig"><figcaption>${esc(title)}</figcaption><div class="bars">${rows.map(([l,v,href])=>`<div class="bar${me&&l===me?" me":""}"><span class="bl">${href?`<a href="${href}">${esc(l)}</a>`:esc(l)}</span><span class="bt"><i style="width:${Math.max(1.5,(v||0)/mx*100).toFixed(1)}%"></i></span><b>${v==null?"n/a":fmt(v)}</b></div>`).join("")}</div>${note||src?`<p class="fnote">${note?note+" ":""}${src?"Source: "+src+".":""}</p>`:""}</figure>`;}
const OURDATA=`PhotonicsETFs.com data sheet, ${fDate(NOW.toISOString().slice(0,10))}`;
const chartAum=me=>bars({title:"Assets under management by photonics ETF",rows:byAum.map(f=>["$"+f.ticker,f.aum,`/etf/${f.slug}`]),fmt:fAum,me:me&&"$"+me,src:OURDATA});
const chartFees=me=>bars({title:"Expense ratio by photonics ETF, cheapest first",rows:[...FUNDS].filter(f=>f.exp!=null).sort((a,b)=>a.exp-b.exp).map(f=>["$"+f.ticker,f.exp,`/etf/${f.slug}`]),fmt:fExp,me:me&&"$"+me,src:OURDATA});
const chartCost=me=>bars({title:"What the fee costs on $10,000 held for 10 years (fee only, before any gains or losses)",rows:[...FUNDS].filter(f=>f.exp!=null).sort((a,b)=>a.exp-b.exp).map(f=>["$"+f.ticker,Math.round(f.exp*1000),`/etf/${f.slug}`]),fmt:v=>"$"+v.toLocaleString("en-US"),me:me&&"$"+me,note:"Simple math: expense ratio x $10,000 x 10 years.",src:OURDATA});
const chartTimeline=()=>`<figure class="fig"><figcaption>Photonics ETF launch timeline</figcaption><ol class="tline">${[...FUNDS].filter(f=>f.inception).sort((a,b)=>a.inception.localeCompare(b.inception)).map(f=>`<li style="--c:${f.fo.c}"><time>${fDate(f.inception)}</time><a href="/etf/${f.slug}"><b>$${f.ticker}</b> ${esc(f.name)}</a><span>${esc(f.issuer)} &middot; ${fExp(f.exp)} fee</span></li>`).join("")}</ol><p class="fnote">Source: issuer websites and ${OURDATA}.</p></figure>`;
const holdBars=f=>{const h=f.prof&&f.prof.holdings;if(!h)return "";return bars({title:`${f.ticker} top holdings (% of fund)`,rows:h.rows.map(([n,t,w])=>[n+(t&&/^[A-Z]+$/.test(t)?` ($${t})`:""),w]),fmt:v=>v.toFixed(1)+"%",note:esc(h.note||""),src:`${esc(h.src)}, as of ${esc(h.asOf)}. Holdings change, so check the <a href="${esc(f.prof.source)}" target="_blank" rel="noopener nofollow">issuer's page</a> for the latest`});};
const stockCard=s=>{const info=STOCKS_INFO[s.name]||{};return `<div class="stk" id="s-${slugify(s.name)}"><div class="stk-h"><h3>${esc(s.name)}${s.ticker&&/^[A-Z]+$/.test(s.ticker)?` <span>$${s.ticker}</span>`:""}</h3><em>In ${s.in.length} of ${HFUNDS.length} funds</em></div>${info.d?`<p>${esc(info.d)}</p>`:""}<div class="chips">${s.in.sort((a,b)=>b[1]-a[1]).map(([f,w])=>`<a class="pill" href="/etf/${f.slug}">$${f.ticker} <b>${w.toFixed(1)}%</b></a>`).join("")}</div></div>`;};
const chartOverlap=(n=12)=>`<figure class="fig"><figcaption>The stocks that show up in the most photonics ETFs</figcaption><div class="stks">${STOCKS.filter(s=>s.in.length>1).slice(0,n).map(stockCard).join("")}</div><p class="fnote">Based on each fund's published top holdings. Weights are the share of each fund. Source: issuer holdings files and StockAnalysis, dates on each <a href="/holdings">fund's holdings list</a>.</p></figure>`;
const out={};

/* ---------- articles ---------- */
const artDir=path.join(ROOT,"content","articles");
const ARTICLES=fs.readdirSync(artDir).filter(f=>f.endsWith(".html")).map(f=>{const r=fs.readFileSync(path.join(artDir,f),"utf8");const m=r.match(/^<!--meta\s*([\s\S]*?)-->/);if(!m)throw new Error("No meta in "+f);const meta=JSON.parse(m[1]);meta.body=r.slice(m[0].length);meta.slug=f.replace(/\.html$/,"");return meta;}).sort((a,b)=>b.date.localeCompare(a.date)||a.slug.localeCompare(b.slug));
function tokens(html){
  const res=t=>t.startsWith("@")?pick[t.slice(1)]:BY[t];
  return html
   .replace(/\{\{n\}\}/g,String(FUNDS.length)).replace(/\{\{total_aum\}\}/g,fAum(TOTAL)).replace(/\{\{avg_exp\}\}/g,fExp(AVGEXP))
   .replace(/\{\{table\}\}/g,()=>`<div class="tbl">${fundTable(byAum)}</div>`)
   .replace(/\{\{chart:(aum|fees|cost|timeline|overlap)\}\}/g,(m,k)=>({aum:chartAum,fees:chartFees,cost:chartCost,timeline:chartTimeline,overlap:chartOverlap})[k]())
   .replace(/\{\{holdings:([A-Z]+)\}\}/g,(m,t)=>BY[t]?holdBars(BY[t]):"")
   .replace(/\{\{bars:(\{.*?\})\}\}/g,(m,j)=>{const o=JSON.parse(j);return bars({title:o.title,rows:o.rows,fmt:v=>(o.pre||"")+v.toLocaleString("en-US")+(o.suf||""),note:o.note,src:o.src});})
   .replace(/\{\{s:(\d+)\}\}/g,(m,n)=>`<sup class="cite"><a href="#src-${n}">[${n}]</a></sup>`)
   .replace(/\{\{n_pairs\}\}/g,String(PAIRS.length))
   .replace(/\{\{list\}\}/g,()=>byAum.map((f,i)=>`<h3>${i+1}. ${tlink(f)}: ${esc(f.name)}</h3><p><strong>${esc(f.issuer)}</strong> &middot; ${f.prof?esc(f.prof.style):""} &middot; ${live(f,"aum",fAum)} in assets &middot; ${live(f,"exp",fExp)} expense ratio &middot; launched ${fDateL(f.inception)||"n/a"}</p>${f.prof?`<p>${esc(f.prof.about)}</p><p><strong>Worth knowing:</strong> ${esc(f.prof.watch)}</p>`:""}<p><a href="/etf/${f.slug}">Full ${f.ticker} profile and live price &rarr;</a></p>`).join(""))
   .replace(/\{\{(link|aum|exp|inc|name):([@A-Z.a-z]+)\}\}/g,(m,k,t)=>{const f=res(t);if(!f)return t.startsWith("@")?"":"$"+t;return k==="link"?tlink(f):k==="aum"?live(f,"aum",fAum):k==="exp"?live(f,"exp",fExp):k==="inc"?fDateL(f.inception):esc(f.name);});
}
for(const a of ARTICLES){
  const url="/"+a.slug;
  a.html=tokens(a.body);
  if(/\{\{/.test(a.html))throw new Error("Unresolved token in "+a.slug+": "+a.html.match(/\{\{.{0,80}/)[0]);
  if(/—|–/.test(a.html.replace(/<[^>]+>/g,"").replace(/—(?=\s*<)/g,"")))console.warn("Dash found in",a.slug);
  // table of contents from the h2s
  const toc=[];a.html=a.html.replace(/<h2>([\s\S]*?)<\/h2>/g,(m,t)=>{const id=slugify(t.replace(/<[^>]+>/g,""));toc.push([id,t.replace(/<[^>]+>/g,"")]);return `<h2 id="${id}">${t}</h2>`;});
  a.words=a.html.replace(/<[^>]+>/g," ").split(/\s+/).filter(Boolean).length;
  a.mins=Math.max(3,Math.round(a.words/230));
}
for(const a of ARTICLES){
  const url="/"+a.slug;
  const toc=[...a.html.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map(m=>[m[1],m[2].replace(/<[^>]+>/g,"")]);
  const more=ARTICLES.filter(x=>x!==a);
  out[a.slug+".html"]=page({title:a.seo+" | PhotonicsETFs",desc:a.dek,canonical:url,type:"article",active:"/blog",faq:a.faq,
    ld:{"@context":"https://schema.org","@graph":[{"@type":"Article",headline:a.title,description:a.dek,datePublished:a.date,dateModified:NOW.toISOString().slice(0,10),wordCount:a.words,author:{"@type":"Person",name:"Benjie Siegel",url:SITE+"/about"},publisher:{"@type":"Organization",name:"Dividend Empire LLC"},image:OG,mainEntityOfPage:SITE+url},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Photonics ETFs",item:SITE+"/"},{"@type":"ListItem",position:2,name:"Guides",item:SITE+"/blog"},{"@type":"ListItem",position:3,name:a.title,item:SITE+url}]}]}},
  `<div class="phead"><div class="wrap"><div class="crumbs"><a href="/">Home</a> / <a href="/blog">Guides</a></div><span class="badge c" style="--c:${a.color};--ci:${a.color}">${esc(a.tag)}</span><h1>${esc(a.title)}</h1><p class="lede">${esc(a.dek)}</p><p class="crumbs" style="margin:14px 0 0">By Benjie Siegel &middot; ${fDateL(a.date)} &middot; ${a.mins} min read &middot; Live data</p></div></div>
${slot(advSlot)}
<div class="wrap" style="position:relative;z-index:2;padding-bottom:40px"><div class="layout"><article>
${toc.length>2?`<nav class="toc" aria-label="In this guide"><b>In this guide</b><ol>${toc.map(([id,t])=>`<li><a href="#${id}">${esc(t)}</a></li>`).join("")}${a.faq?`<li><a href="#faq">Frequently asked questions</a></li>`:""}</ol></nav>`:""}
<div class="prose">${a.html}</div>
${a.faq?`<section class="faq" id="faq" style="padding:20px 0 0"><h2 class="h2">Frequently asked questions</h2>${a.faq.map(([q,x])=>`<h3>${esc(q)}</h3><p>${esc(x)}</p>`).join("")}</section>`:""}
${a.sources?`<section class="srcs" id="sources"><h2 class="h2">Sources</h2><ol>${a.sources.map(([t,u],i)=>`<li id="src-${i+1}"><a href="${esc(u)}" target="_blank" rel="noopener nofollow">${esc(t)}</a></li>`).join("")}</ol></section>`:""}
<h2 class="h2">Keep reading</h2><div class="cards">${more.slice(0,3).map(postCard).join("")}</div>
<p class="note">${DISC}</p></article>
<aside class="side">${sideBoxes()}<div class="box"><h3>More guides</h3>${more.map(x=>`<a class="ln" href="/${x.slug}">${esc(x.short||x.title)}</a>`).join("")}</div></aside></div></div>
${slot(proSlot,"From our network")}`);
}
function postCard(a){return `<a class="post" href="/${a.slug}" style="--c:${a.color}"><div class="meta"><span class="tag">${esc(a.tag)}</span><span class="date">${fDate(a.date)}</span></div><h3>${esc(a.title)}</h3><p>${esc(a.dek)}</p><span class="go">Read the guide &middot; ${a.mins} min &rarr;</span></a>`;}
function sideBoxes(skip){return `<div class="box"><h3>Photonics ETFs</h3>${byAum.filter(f=>f.ticker!==skip).map(f=>`<a class="ln" href="/etf/${f.slug}"><b>$${f.ticker}</b> <span style="float:right;font-family:var(--mono);font-size:13px">${live(f,"aum",fAum)}</span></a>`).join("")}</div>
<div class="box pro"><h3>TopDividendETFsPRO</h3><p>Our premium terminal: 160+ income ETFs with grades, tax treatment, payout schedules and advanced filters.</p><a class="btn" href="${PRO}" target="_blank" rel="noopener" data-ga="side-pro">Go PRO &rarr;</a></div>`;}

/* ---------- home ---------- */
const prism=`<div class="prism-stage" id="stage"><svg class="prism-svg" viewBox="0 0 700 440" preserveAspectRatio="xMidYMid meet" role="img" aria-label="A white beam entering a prism and splitting into seven colored bands, each labeled with a photonics focus area">
<defs><linearGradient id="wht" x1="0" x2="1"><stop offset="0" stop-color="#F2F6FF" stop-opacity="0"/><stop offset="1" stop-color="#F2F6FF" stop-opacity=".95"/></linearGradient><filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<g class="in-beam" filter="url(#soft)"><line x1="0" y1="118" x2="182" y2="118" stroke="url(#wht)" stroke-width="3"/></g><polygon class="prism-body" points="198,48 262,182 134,182"/><g filter="url(#soft)" id="fan"></g><g id="fanLabels"></g></svg></div>`;
const homeRows=FUNDS.map(f=>`<tr style="--c:${f.fo.c};--ci:${f.fo.ci}" data-t="${f.ticker}" tabindex="0"><td class="l"><a class="tk" href="/etf/${f.slug}">$${f.ticker}</a></td><td class="l"><span class="nm">${esc(f.name)}</span></td><td class="l"><span class="prov">${esc(f.issuer)}</span></td><td class="l"><span class="fx">${f.fo.label}</span></td><td class="num">${fAum(f.aum)}</td><td class="num">${fExp(f.exp)}</td><td class="dt">${fDate(f.inception)}</td></tr>`).join("");
const present=FOCUS.filter(f=>FUNDS.some(x=>x.focus===f.id));
const homeFaq=[
 ["What is a photonics ETF?","A photonics ETF holds companies whose business depends on light-based technology: lasers, optical transceivers, fiber-optic networking, photonic chips and the lithography tools that use light to make semiconductors."],
 [`How many photonics ETFs are there?`,`We currently track ${FUNDS.length} dedicated photonics ETFs, all launched in 2026, holding about ${fAum(TOTAL)} combined.`],
 ["What is the largest photonics ETF?",`${pick.largest.ticker} (${pick.largest.name}) is the largest on our list with about ${fAum(pick.largest.aum)} in assets.`],
 ["What is the cheapest photonics ETF?",`${pick.cheapest.ticker} has the lowest expense ratio on our list at ${fExp(pick.cheapest.exp)} a year.`],
 ["Why are photonics ETFs linked to AI?","AI data centers move huge amounts of data between chips. Optical links carry that data with light, using less power and reaching farther than copper, so optical component makers have become key AI infrastructure suppliers."]];
out["index.html"]=page({title:`Photonics ETFs ${YEAR}: Every Photonics ETF Ranked, Tracked and Explained | PhotonicsETFs`,desc:`Compare all ${FUNDS.length} photonics ETFs (${FUNDS.map(f=>f.ticker).join(", ")}) side by side with live AUM, expense ratios, launch dates and prices. Lasers, optics, fiber and AI optical interconnect.`,canonical:"/",active:"",faq:homeFaq,
  ld:{"@context":"https://schema.org","@graph":[{"@type":"WebSite",name:"PhotonicsETFs",url:SITE+"/",publisher:{"@type":"Organization",name:"Dividend Empire LLC",email:EMAIL}},{"@type":"ItemList",name:"Photonics ETFs",itemListElement:FUNDS.map((f,i)=>({"@type":"ListItem",position:i+1,url:`${SITE}/etf/${f.slug}`,name:`${f.ticker} ${f.name}`}))}]},
  extra:`<script>window.PH_FUNDS=${JSON.stringify(FUNDS.map(({ticker,name,issuer,focus,aum,exp,inception,curated})=>({ticker,name,issuer,focus,aum,exp,inception,curated})))};window.PH_SHEET=${JSON.stringify(SHEET)};</script>`},
`<div class="hero"><canvas id="fibers" aria-hidden="true"></canvas><div class="wrap"><div class="hgrid"><div class="hcopy">
<div class="eyebrow"><span class="live"></span>Live data &middot; updated daily</div>
<h1>Every photonics ETF, <span class="split">ranked &amp; explained</span></h1>
<p class="lede">Photonics is the layer under the AI trade: the lasers that etch the wafer, the optics that inspect it and the fiber that moves the tokens. <strong>Here is every dedicated photonics ETF</strong>, with live assets, fees and prices, and a plain-English read on what each one really owns.</p>
<div class="hbtns"><a class="btn primary" href="#rankings">View the ETFs</a><a class="btn ghost" href="/best-photonics-etfs">Read the guide</a></div>
<div class="hstats"><div><b>${FUNDS.length}</b><span>Photonics ETFs</span></div><div><b>${fAum(TOTAL)}</b><span>Combined AUM</span></div><div><b>${fExp(AVGEXP)}</b><span>Avg. expense</span></div></div>
</div>${prism}</div></div><a class="scrollcue" href="#rankings" aria-label="Scroll to the ETF list"><span>THE LIST</span><i></i></a></div>
${slot(advSlot)}
<section id="rankings" style="padding-top:0"><div class="wrap">
<div class="shead rv"><div><h2>All photonics ETFs</h2><p>Every fund built around photonics, in our curated order. Click a row for the full profile and live price, click a header to sort, or search by ticker, fund or provider.</p></div></div>
<div class="controls rv"><label class="search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input type="search" id="q" placeholder="Search ticker, fund name or provider" aria-label="Search ETFs"></label>
<select class="sel" id="focusSel" aria-label="Filter by focus area"><option value="all">ALL FOCUS AREAS</option>${present.map(f=>`<option value="${f.id}">${f.name.toUpperCase()}</option>`).join("")}</select>
<select class="sel" id="sortSel" aria-label="Sort ETFs"><option value="curated">SORT &middot; CURATED</option><option value="aum">SORT &middot; AUM</option><option value="exp">SORT &middot; EXPENSE RATIO</option><option value="inception">SORT &middot; LAUNCH DATE</option><option value="ticker">SORT &middot; TICKER</option><option value="issuer">SORT &middot; PROVIDER</option></select>
<button class="clearbtn" id="clear" type="button">RESET</button></div>
${ADVISORY}
<div class="tablewrap rv"><div class="scroller"><table class="ptable"><thead><tr><th class="l" data-s="ticker">Ticker<span class="ar">&#8597;</span></th><th class="l" data-s="name">Fund name<span class="ar">&#8597;</span></th><th class="l" data-s="issuer">Provider<span class="ar">&#8597;</span></th><th class="l" data-s="focus">Focus<span class="ar">&#8597;</span></th><th data-s="aum">AUM<span class="ar">&#8597;</span></th><th data-s="exp">Expense ratio<span class="ar">&#8597;</span></th><th data-s="inception">Launched<span class="ar">&#8597;</span></th></tr></thead><tbody id="tbody">${homeRows}</tbody></table></div>
<div class="tfoot"><span id="shown">SHOWING ${FUNDS.length} OF ${FUNDS.length} ETFs</span><span id="feedState">DATA AS OF ${fDate(NOW.toISOString().slice(0,10)).toUpperCase()} &middot; NOT INVESTMENT ADVICE</span></div></div>
<p class="tnote rv"><b>How this list is built:</b> funds are included when photonics is the core of their strategy, not a side mention in a prospectus. Inclusion is never a buy or sell signal and the order is not a ranking of quality. The colored edge on each row marks its focus area on the spectrum. Figures come from our data sheet, refresh daily and can lag the issuer, so always verify with the fund's own materials.</p>
</div></section>

<section id="explore" style="padding-top:0"><div class="wrap"><div class="shead rv"><div><h2>Explore the site</h2><p>Six ways into the data, depending on what you came here to figure out.</p></div></div>
<div class="cards rv">${[["/#rankings","THE LIST",`All ${FUNDS.length} photonics ETFs`,"Live assets, fees and launch dates in one sortable table.","#00D4E8"],["/compare/","HEAD TO HEAD",`${PAIRS.length} side-by-side comparisons`,"Any two funds lined up on fees, size, strategy and price.","#7B2FF7"],["/holdings","INSIDE THE FUNDS","The stocks photonics ETFs own","Top holdings for every fund and which names overlap the most.","#38E08A"],["/blog","GUIDES",`${ARTICLES.length} plain-English guides`,"From what photonics is to risks, income funds and co-packaged optics.","#F5C518"],["/glossary","GLOSSARY","Photonics terms, decoded","Transceivers, CPO, indium phosphide, EML and the rest in one place.","#FF8A2B"],["/advertise","FOR ISSUERS","Sponsor PhotonicsETFs","One sponsor per placement, in front of investors researching this exact theme.","#FF3B4E"]].map(([h,k,t,d,c])=>`<a class="card" href="${h}" style="--c:${c}"><div class="wl">${k}</div><h3>${t}</h3><p>${d}</p><span class="go">Open &rarr;</span></a>`).join("")}</div></div></section>

<section id="compare" style="padding-top:0"><div class="wrap"><div class="shead rv"><div><h2>Compare photonics ETFs</h2><p>Line up any two funds on fees, size, launch date, strategy and live price.</p></div><a class="pill" href="/compare/">All comparisons &rarr;</a></div>
<div class="chips rv">${PAIRS_POP.slice(0,12).map(([a,b])=>`<a class="pill" href="${pairUrl(a,b)}">${a.ticker} vs ${b.ticker}</a>`).join("")}</div></div></section>

<section id="spectrum" style="padding-top:0"><div class="wrap"><div class="shead rv"><div><h2>The photonics spectrum</h2><p>Photonics is not one industry. These are the seven corners of it we track, each marked with its own wavelength color.</p></div></div>
<div class="cards rv">${FOCUS.map(f=>`<div class="card" style="--c:${f.c}"><div class="wl">${f.wl} NM &middot; ${FUNDS.filter(x=>x.focus===f.id).length} ETF${FUNDS.filter(x=>x.focus===f.id).length===1?"":"s"}</div><h3>${f.name}</h3><p>${f.desc}</p></div>`).join("")}</div></div></section>

${slot(proSlot,"From our network")}
<section id="research" style="padding-top:0"><div class="wrap"><div class="shead rv"><div><h2>Photonics ETF guides</h2><p>Plain-English research on photonics ETFs and the technology behind them, with live numbers.</p></div><a class="pill" href="/blog">All guides &rarr;</a></div>
<div class="cards rv">${ARTICLES.slice(0,6).map(postCard).join("")}</div></div></section>

<section id="faq" style="padding-top:0"><div class="wrap"><div class="shead"><div><h2>Photonics ETF FAQ</h2></div></div><div class="faq">${homeFaq.map(([q,a])=>`<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}</div></div></section>`);

/* ---------- ETF pages ---------- */
function rankOf(f,key,asc){const l=FUNDS.filter(x=>x[key]!=null).sort((a,b)=>asc?a[key]-b[key]:b[key]-a[key]);const i=l.indexOf(f);return i<0?null:`#${i+1} of ${l.length}`;}
const FLAGTXT={swaps:["Uses swaps","Part or all of the exposure comes through total return swaps with a bank instead of shares held directly."],private:["Holds private companies","Some positions are private companies valued by estimate, not a daily market price."],china:["China-listed exposure","Holds or references stocks listed in mainland China."],leveraged:["Leveraged, resets daily","Targets a multiple of the one-day move. Not built for long holding periods."],income:["Options income","Sells options to generate distributions. Payouts are not guaranteed."],hybrid:["Hybrid theme","Photonics is only part of the fund."]};
const money=v=>"$"+Math.round(v).toLocaleString("en-US");
for(const f of FUNDS){
  const others=byAum.filter(x=>x!==f),i=byAum.indexOf(f),prev=byAum[(i-1+byAum.length)%byAum.length],next=byAum[(i+1)%byAum.length];
  const p=f.prof||{style:"",about:`${f.name} is a ${f.fo.name.toLowerCase()} focused ETF from ${f.issuer}.`,watch:"Check the issuer's website for the latest holdings and strategy details."};
  const flags=(p.flags||[]).filter(k=>FLAGTXT[k]);
  const lev=flags.includes("leveraged");
  const cheaperThan=FUNDS.filter(x=>x.exp!=null&&f.exp!=null&&x.exp>f.exp).length,nExp=FUNDS.filter(x=>x.exp!=null).length;
  const share=f.aum&&TOTAL?f.aum/TOTAL*100:null;
  const ov=others.map(o=>[o,shared(f,o)]).filter(x=>x[1].length).sort((a,b)=>b[1].length-a[1].length);
  const h=p.holdings;
  const top3=h?h.rows.slice(0,3).reduce((s,r)=>s+r[2],0):null;
  const faq=[[`What is ${f.ticker}?`,`${f.ticker} is the ${f.name}, a photonics-focused ETF from ${f.issuer}. ${p.about}`],
   [`What is ${f.ticker}'s expense ratio?`,f.exp!=null?`${f.ticker} charges ${fExp(f.exp)} a year, about $${(f.exp*100).toFixed(0)} for every $10,000 invested. That ranks ${rankOf(f,"exp",true)} photonics ETFs, cheapest first.`:"Check the fund's prospectus for its current expense ratio."],
   [`How big is ${f.ticker}?`,f.aum!=null?`${f.ticker} has about ${fAum(f.aum)} in assets under management, ${rankOf(f,"aum")} photonics ETFs by size.`:"Assets are not available yet."],
   [`When did ${f.ticker} launch?`,f.inception?`${f.ticker} launched on ${fDateL(f.inception)}${p.exchange?` and trades on ${p.exchange}`:""}.`:"Check the issuer's website for the launch date."],
   ...(h&&!lev?[[`What does ${f.ticker} hold?`,`As of ${h.asOf}, the largest positions were ${h.rows.slice(0,5).map(r=>r[0]).join(", ")}. ${h.note||""} Holdings change, so check the issuer's website for the current list.`]]:[]),
   [`Is ${f.ticker} actively managed or an index fund?`,/index/i.test(p.style||"")?`${f.ticker} is an index fund. It tracks the ${p.index}.`:lev?`${f.ticker} is a leveraged fund that targets a multiple of the daily move of its underlying strategy. It does not track a traditional index.`:`${f.ticker} is actively managed, so a portfolio manager chooses the holdings and their sizes instead of following an index.`],
   [`Does ${f.ticker} pay a dividend?`,p.dist?`Distribution schedule: ${p.dist}. ${flags.includes("income")?"Distributions are the point of this fund, but they are not guaranteed and can include return of capital.":"Photonics companies mostly reinvest their cash, so growth-focused photonics ETFs pay little or nothing. Check the issuer's distribution history for actual payments."}`:"Check the issuer's website for the distribution history."],
   ...(flags.includes("swaps")?[[`Why does ${f.ticker} use swaps?`,`Swaps let a fund get the return of a stock or index without holding the shares directly, which can be useful for foreign stocks or leverage. The trade-off is counterparty risk: the fund depends on the bank on the other side of the swap.`]]:[]),
   ...(ov.length?[[`Which photonics ETF is most similar to ${f.ticker}?`,`Based on published top holdings, ${f.ticker} shares the most names with ${ov[0][0].ticker} (${ov[0][1].slice(0,4).join(", ")}). You can compare them side by side on our ${f.ticker} vs ${ov[0][0].ticker} page.`]]:[]),
   [`How do I buy ${f.ticker}?`,`${f.ticker} trades like a stock${p.exchange?` on ${p.exchange}`:""}. You can buy it in most brokerage accounts by searching the ticker ${f.ticker}. Newer, smaller ETFs can have wide bid-ask spreads, so many investors use limit orders.`],
   [`Is ${f.ticker} a good investment?`,"We do not make buy or sell recommendations. Compare its strategy, fees and size with the other photonics ETFs and read the prospectus before deciding."]];
  const facts=[["Ticker","$"+f.ticker],["Fund name",esc(f.name)],["Provider",esc(f.issuer)],["Exchange",esc(p.exchange||"n/a")],["Launched",fDateL(f.inception)||"n/a"],["Management",esc(p.style||"n/a")],["Index tracked",esc(p.index||"n/a")],["Focus",f.fo.name],["AUM",live(f,"aum",fAum)],["Expense ratio",live(f,"exp",fExp)],["Number of holdings",esc(p.nHoldings||"n/a")],["Distributions",esc(p.dist||"n/a")]];
  const tocL=[["overview","Overview"],["facts","Key facts"],["strategy","Strategy"],...(h?[["holdings","Holdings"]]:[]),["fees","Fees"],["size","Size"],...(p.fit?[["fit","Who it fits"]]:[]),...(p.risks?[["risks","Risks"]]:[]),["compare","Compare"],["faq","FAQ"]];
  out[`etf/${f.slug}.html`]=page({title:`${f.ticker} ETF: ${f.name} Price, AUM and Expense Ratio | PhotonicsETFs`,desc:`${f.ticker} (${f.name}) from ${f.issuer}: live price, ${fAum(f.aum)} AUM, ${fExp(f.exp)} expense ratio, launched ${fDate(f.inception)}. What it holds and how it compares with every other photonics ETF.`,canonical:`/etf/${f.slug}`,active:"/#rankings",faq,
    ld:{"@context":"https://schema.org","@type":"WebPage",name:`${f.ticker} ETF`,url:`${SITE}/etf/${f.slug}`,dateModified:NOW.toISOString().slice(0,10),about:{"@type":"FinancialProduct",name:f.name,alternateName:f.ticker,category:"Exchange-traded fund",provider:{"@type":"Organization",name:f.issuer}},breadcrumb:{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Photonics ETFs",item:SITE+"/"},{"@type":"ListItem",position:2,name:f.ticker,item:`${SITE}/etf/${f.slug}`}]}}},
`<div class="phead"><div class="wrap"><div class="crumbs"><a href="/">Photonics ETFs</a> / ${f.ticker}</div>
<div class="layout"><div><span class="badge c" style="--c:${f.fo.c};--ci:${f.fo.ci}">${f.fo.name.toUpperCase()}</span>${p.style?`<span class="badge">${esc(p.style.toUpperCase())}</span>`:""}${lev?`<span class="badge warn">LEVERAGED</span>`:""}
<h1>$${f.ticker} <span style="color:var(--dim);font-weight:500">${esc(f.name)}</span></h1><p class="lede">${esc(f.issuer)} &middot; launched ${fDateL(f.inception)||"n/a"}${f.age!=null?` (${age(f)} ago)`:""}</p>
<div class="tickers" aria-label="Jump to another photonics ETF">${byAum.map(x=>`<a href="/etf/${x.slug}"${x===f?' aria-current="page"':""}>$${x.ticker}</a>`).join("")}</div></div>
<div class="tvbox"><div class="k"><span>${f.ticker} live price</span><span>Since launch</span></div><div data-tv="${f.ticker}">Loading live price...</div></div></div></div></div>
<div class="wrap" style="position:relative;z-index:2;padding:30px var(--gut) 40px"><div class="layout"><div>
<nav class="onpage" aria-label="On this page">${tocL.map(([id,t])=>`<a href="#${id}">${t}</a>`).join("")}</nav>
<div class="stats" id="overview"><div><div class="k">AUM</div><div class="v">${live(f,"aum",fAum)}</div><div class="s">${rankOf(f,"aum")||""} by size</div></div><div><div class="k">Expense ratio</div><div class="v">${live(f,"exp",fExp)}</div><div class="s">${f.exp!=null?`$${(f.exp*100).toFixed(0)} a year per $10K`:""}</div></div><div><div class="k">Launched</div><div class="v">${fDate(f.inception)}</div><div class="s">${f.age!=null?age(f)+" of history":""}</div></div><div><div class="k">Provider</div><div class="v" style="font-size:18px">${esc(f.issuer)}</div><div class="s">${esc(p.style||"")}</div></div><div><div class="k">Focus</div><div class="v" style="font-size:18px">${f.fo.label}</div><div class="s">${f.fo.wl} nm on our spectrum</div></div><div><div class="k">Fee rank</div><div class="v">${rankOf(f,"exp",true)||"—"}</div><div class="s">Cheapest first</div></div></div>
<h2 class="h2">${f.ticker} at a glance</h2><div class="prose"><p>${esc(p.about)}</p>
<ul class="take">${[f.aum!=null?`<strong>Size:</strong> about ${fAum(f.aum)} in assets, ${rankOf(f,"aum")} photonics ETFs${share!=null&&share>=1?`, or roughly ${share.toFixed(0)}% of all the money in the funds we track`:""}.`:"",f.exp!=null?`<strong>Cost:</strong> ${fExp(f.exp)} a year, ${cheaperThan===nExp-1?"the lowest fee on the list":cheaperThan===0?"the highest fee on the list":`cheaper than ${cheaperThan} of the other ${nExp-1} funds`}. The group average is ${fExp(AVGEXP)}.`:"",`<strong>How it is run:</strong> ${esc(p.style||"n/a")}${p.index&&/index/i.test(p.style||"")?`, tracking the ${esc(p.index)}`:""}.`,h&&!lev&&top3?`<strong>Concentration:</strong> the three largest positions add up to about ${top3.toFixed(0)}% of the fund (${esc(h.rows.slice(0,3).map(r=>r[0]).join(", "))}).`:"",f.age!=null?`<strong>Track record:</strong> ${age(f)} of trading history, so there is no long-term record to judge yet.`:""].filter(Boolean).map(x=>`<li>${x}</li>`).join("")}</ul>
${flags.length?`<div class="flags">${flags.map(k=>`<div><b>${FLAGTXT[k][0]}</b><span>${FLAGTXT[k][1]}</span></div>`).join("")}</div>`:""}
<h3>Worth knowing</h3><p>${esc(p.watch)}</p></div>
<h2 class="h2" id="facts">${f.ticker} key facts</h2><dl class="kv">${facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
<h2 class="h2" id="strategy">How ${f.ticker} invests</h2><div class="prose">${(p.strategy||[]).map(x=>`<p>${esc(x)}</p>`).join("")}${lev?`<h3>Why 2x daily is not 2x over time</h3><div class="kvt"><div class="kvt-h"><span>What happens</span><span>Unleveraged fund</span><span>2x daily fund</span></div><div><span>Down 10% one day, up 10% the next</span><span>-1.0%</span><span>-4.0%</span></div><div><span>Ten days alternating -5% and +5%</span><span>-1.2%</span><span>-4.9%</span></div><div><span>Up 5% two days in a row</span><span>+10.3%</span><span>+21.0%</span></div></div><p>These are simple math examples, not forecasts. They show why a leveraged fund can lose ground in a choppy market even when the fund it follows ends up close to flat, and why it can do better than double in a steady trend.</p>`:""}${p.source?`<p>Read the prospectus and the latest holdings on the <a href="${esc(p.source)}" target="_blank" rel="noopener nofollow">${esc(f.issuer)} website</a>.</p>`:""}</div>
${h?`<h2 class="h2" id="holdings">What ${f.ticker} holds</h2>${holdBars(f)}<div class="prose">${lev?"":`<p>${top3?`The top three positions make up about ${top3.toFixed(0)}% of ${f.ticker}. `:""}${ov.length?`Its published top holdings overlap most with ${ov.slice(0,3).map(([o,n])=>`<a href="${pairUrl(f,o)}">${o.ticker}</a> (${n.length} shared name${n.length===1?"":"s"})`).join(", ")}. `:""}See <a href="/holdings">every stock the photonics ETFs own</a> and how much they overlap.</p>`}</div>`:`<h2 class="h2" id="holdings">What ${f.ticker} holds</h2><div class="prose"><p>${f.ticker} holds ${esc(p.nHoldings||"a mix of positions")} tied to photonics companies instead of a simple stock basket, and the issuer had not published a full holdings breakdown when we last checked. See the <a href="${esc(p.source)}" target="_blank" rel="noopener nofollow">issuer's page</a> for the current list.</p></div>`}
<h2 class="h2" id="fees">${f.ticker} fees</h2><div class="prose"><p>${f.exp!=null?`${f.ticker} charges ${fExp(f.exp)} a year. On a $10,000 position that is about ${money(f.exp*100)} a year, ${money(f.exp*500)} over five years and ${money(f.exp*1000)} over ten, before any gains or losses. The same $10,000 in the cheapest photonics ETF (${pick.cheapest.ticker} at ${fExp(pick.cheapest.exp)}) would cost ${money(pick.cheapest.exp*1000)} over ten years, and the most expensive (${pick.priciest.ticker} at ${fExp(pick.priciest.exp)}) would cost ${money(pick.priciest.exp*1000)}.`:"Check the prospectus for the current expense ratio."}</p></div>${chartFees(f.ticker)}
<h2 class="h2" id="size">${f.ticker} size</h2><div class="prose"><p>${f.aum!=null?`With about ${fAum(f.aum)} in assets, ${f.ticker} ranks ${rankOf(f,"aum")} photonics ETFs. ${f.aum<25e6?"That is small. Small funds can trade with wider bid-ask spreads, and issuers sometimes close funds that do not gather assets, so it is worth checking the spread and using limit orders.":f.aum<150e6?"That is a mid-sized fund for this young category: big enough to trade without much trouble, but still far from the multi-billion dollar funds in broader tech.":"That puts it among the largest funds in this young category, which usually means tighter spreads and more daily volume."}`:"Asset data is not available yet."}</p></div>${chartAum(f.ticker)}
${p.fit?`<h2 class="h2" id="fit">Who ${f.ticker} may fit</h2><div class="fitgrid"><div class="fit yes"><h3>It may fit if</h3><ul>${p.fit.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div><div class="fit no"><h3>It may not fit if</h3><ul>${(p.notfit||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div></div><p class="note" style="margin-top:10px">General education only, not a recommendation. Your own goals, timeline and risk tolerance decide what fits.</p>`:""}
${p.risks?`<h2 class="h2" id="risks">${f.ticker} risks to understand</h2><div class="prose"><ul>${p.risks.map(x=>`<li>${esc(x)}</li>`).join("")}<li>Like every fund on this site, ${f.ticker} is a new, single-theme ETF. Photonics stocks fell hard in October 2026, with several of the biggest names dropping 10% or more in a day. Read <a href="/photonics-etf-risks">our guide to photonics ETF risks</a> before sizing a position.</li></ul></div>`:""}
<h2 class="h2" id="compare">${f.ticker} vs. every other photonics ETF</h2>${fundTable([f].concat(others),f.ticker)}
<h3 class="h3">Head-to-head comparisons</h3><div class="chips">${others.map(o=>`<a class="pill" href="${pairUrl(f,o)}">${f.ticker} vs ${o.ticker}</a>`).join("")}</div>
<section class="faq" id="faq" style="padding:10px 0 0"><h2 class="h2">${f.ticker} FAQ</h2>${faq.map(([q,a])=>`<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}</section>
<h2 class="h2">Guides that help with ${f.ticker}</h2><div class="cards">${ARTICLES.filter(a=>(a.for||[]).includes(f.ticker)).concat(ARTICLES.filter(a=>!(a.for||[]).includes(f.ticker))).slice(0,3).map(postCard).join("")}</div>
<nav class="pnav" aria-label="More photonics ETFs"><a href="/etf/${prev.slug}"><span>&larr; Previous</span><b>$${prev.ticker}</b> ${esc(prev.issuer)}</a><a href="/etf/${next.slug}"><span>Next &rarr;</span><b>$${next.ticker}</b> ${esc(next.issuer)}</a></nav>
<p class="note">${DISC}</p></div>
<aside class="side">${sideBoxes(f.ticker)}<div class="box"><h3>Guides</h3>${ARTICLES.map(a=>`<a class="ln" href="/${a.slug}">${esc(a.short||a.title)}</a>`).join("")}</div></aside></div></div>
${slot(advSlot)}`);
}
out["etf.html"]=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Photonics ETF profile | PhotonicsETFs</title><meta name="robots" content="noindex"><link rel="canonical" href="${SITE}/"><script>var t=(new URLSearchParams(location.search).get("symbol")||new URLSearchParams(location.search).get("t")||"").toLowerCase().replace(/[^a-z0-9]/g,"");location.replace(t?"/etf/"+t:"/");</script></head><body><a href="/">PhotonicsETFs</a></body></html>`;

/* ---------- compare ---------- */
for(const [a,b] of PAIRS){
  const rows=[["Provider",x=>esc(x.issuer)],["Focus",x=>x.fo.name],["Management",x=>esc(x.prof?.style||"—")],["AUM",x=>live(x,"aum",fAum),x=>x.aum,1],["Expense ratio",x=>live(x,"exp",fExp),x=>x.exp,0],["Yearly fee on $10,000",x=>x.exp!=null?"$"+(x.exp*100).toFixed(0):"—",x=>x.exp,0],["Launched",x=>fDate(x.inception)]];
  const win=(get,hi)=>{const va=get(a),vb=get(b);if(va==null||vb==null||va===vb)return null;return (hi?va>vb:va<vb)?a.ticker:b.ticker;};
  const cheaper=win(x=>x.exp,0),bigger=win(x=>x.aum,1),older=a.inception&&b.inception?(a.inception<b.inception?a:b):null;
  const url=pairUrl(a,b);
  const faq=[[`What is the difference between ${a.ticker} and ${b.ticker}?`,`${a.ticker} is the ${a.name} from ${a.issuer} (${a.fo.name.toLowerCase()}), while ${b.ticker} is the ${b.name} from ${b.issuer} (${b.fo.name.toLowerCase()}). They differ in strategy, fees and size.`],
   [`Which is cheaper, ${a.ticker} or ${b.ticker}?`,cheaper?`${cheaper} has the lower expense ratio: ${fExp(BY[cheaper].exp)} vs ${fExp((cheaper===a.ticker?b:a).exp)}.`:`They charge the same expense ratio, or data is not available.`],
   [`Which is bigger, ${a.ticker} or ${b.ticker}?`,bigger?`${bigger} has more assets: ${fAum(BY[bigger].aum)} vs ${fAum((bigger===a.ticker?b:a).aum)}.`:"Asset data is not available for both funds."]];
  out[`compare/${a.slug}-vs-${b.slug}.html`]=page({title:`${a.ticker} vs ${b.ticker}: Photonics ETF Comparison (Fees, AUM, Strategy) | PhotonicsETFs`,desc:`${a.ticker} vs ${b.ticker} side by side: expense ratio, AUM, launch date, strategy and live prices for two photonics ETFs. ${a.name} vs ${b.name}.`,canonical:url,active:"/compare/",faq},
`<div class="phead"><div class="wrap"><div class="crumbs"><a href="/">Photonics ETFs</a> / <a href="/compare/">Compare</a></div><h1>$${a.ticker} vs $${b.ticker}</h1><p class="lede">${esc(a.name)} vs. ${esc(b.name)}: fees, size, strategy and live prices side by side.</p></div></div>
<div class="wrap" style="position:relative;z-index:2;padding:30px var(--gut) 40px"><div class="layout"><div>
<div class="stats" style="grid-template-columns:1fr 1fr"><div class="tvbox" style="border:0;border-radius:0"><div class="k"><span>${a.ticker}</span><a href="/etf/${a.slug}">Profile &rarr;</a></div><div data-tv="${a.ticker}">Loading...</div></div><div class="tvbox" style="border:0;border-radius:0"><div class="k"><span>${b.ticker}</span><a href="/etf/${b.slug}">Profile &rarr;</a></div><div data-tv="${b.ticker}">Loading...</div></div></div>
<h2 class="h2">Side by side</h2><div class="tw"><table class="dtable fixed"><thead><tr><th class="l">Metric</th><th>$${a.ticker}</th><th>$${b.ticker}</th></tr></thead><tbody>${rows.map(([l,fm,get,hi])=>{const w=get?win(get,hi):null;return `<tr><td class="l">${l}</td><td${w===a.ticker?' class="win"':""}>${fm(a)}</td><td${w===b.ticker?' class="win"':""}>${fm(b)}</td></tr>`;}).join("")}</tbody></table></div>
<div class="prose" style="margin-top:22px"><h2>The short version</h2><p>${cheaper?`<strong>${cheaper}</strong> is cheaper to own, at ${fExp(BY[cheaper].exp)} a year versus ${fExp((cheaper===a.ticker?b:a).exp)}. `:""}${bigger?`<strong>${bigger}</strong> is the bigger fund, with ${fAum(BY[bigger].aum)} in assets. `:""}${older?`<strong>${older.ticker}</strong> has been around longer, launching on ${fDateL(older.inception)}.`:""}</p>
<h3>${a.ticker}</h3><p>${esc(a.prof?.about||"")} ${esc(a.prof?.watch||"")}</p><h3>${b.ticker}</h3><p>${esc(b.prof?.about||"")} ${esc(b.prof?.watch||"")}</p>
<p>Lower fees and more assets are helpful, but they are not the whole story. The bigger question is which strategy matches what you want to own. This comparison is not a recommendation to buy or sell either fund.</p></div>
${a.prof?.holdings&&b.prof?.holdings?`<h2 class="h2">Holdings: ${a.ticker} vs ${b.ticker}</h2><div class="prose"><p>${shared(a,b).length?`Based on published top holdings, the two funds share ${shared(a,b).length} name${shared(a,b).length===1?"":"s"}: ${esc(shared(a,b).join(", "))}.`:`Their published top holdings do not share a single name, so these two funds give you very different portfolios.`}</p></div><div class="two">${holdBars(a)}${holdBars(b)}</div>`:""}
<section class="faq" style="padding:10px 0 0"><h2 class="h2">FAQ</h2>${faq.map(([q,x])=>`<h3>${esc(q)}</h3><p>${esc(x)}</p>`).join("")}</section>
<h2 class="h2">More comparisons</h2><div class="chips">${PAIRS.filter(p=>p[0]!==a||p[1]!==b).filter(p=>p.includes(a)||p.includes(b)).map(([x,y])=>`<a class="pill" href="${pairUrl(x,y)}">${x.ticker} vs ${y.ticker}</a>`).join("")}</div>
<p class="note">${DISC}</p></div><aside class="side">${sideBoxes()}</aside></div></div>${slot(advSlot)}`);
}
out["compare/index.html"]=page({title:"Compare Photonics ETFs Side by Side | PhotonicsETFs",desc:`Head-to-head comparisons of every photonics ETF: ${PAIRS_POP.slice(0,6).map(([a,b])=>`${a.ticker} vs ${b.ticker}`).join(", ")} and more.`,canonical:"/compare/",active:"/compare/"},
`<div class="phead"><div class="wrap"><div class="crumbs"><a href="/">Photonics ETFs</a> / Compare</div><h1>Compare photonics ETFs</h1><p class="lede">Every photonics ETF matched up head to head: ${PAIRS.length} comparisons covering fees, size, launch dates, strategy and live prices.</p></div></div>
<section><div class="wrap">${fundTable(byAum)}<h2 class="h2">All matchups</h2><div class="cards">${PAIRS_POP.map(([a,b])=>`<a class="card" href="${pairUrl(a,b)}" style="--c:${a.fo.c}"><div class="wl">${a.fo.label.toUpperCase()} vs ${b.fo.label.toUpperCase()}</div><h3>${a.ticker} vs ${b.ticker}</h3><p>${esc(a.issuer)} vs ${esc(b.issuer)} &middot; ${fExp(a.exp)} vs ${fExp(b.exp)}</p></a>`).join("")}</div></div></section>`);

/* ---------- blog + static pages ---------- */
out["blog.html"]=page({title:"Photonics ETF Guides and Research | PhotonicsETFs",desc:"Plain-English guides to photonics ETFs, optical interconnect, lasers and the companies inside these funds, with live data.",canonical:"/blog",active:"/blog"},
`<div class="phead"><div class="wrap"><div class="crumbs"><a href="/">Home</a> / Guides</div><h1>Photonics ETF guides</h1><p class="lede">Research on photonics ETFs and the technology behind them, written in plain English with live numbers.</p></div></div>
<section><div class="wrap"><div class="cards">${ARTICLES.map(postCard).join("")}</div></div></section>`);
const simple=(file,title,desc,h1,lede,html)=>{out[file+".html"]=page({title:title+" | PhotonicsETFs",desc,canonical:"/"+file,active:"/"+file},`<div class="phead"><div class="wrap"><h1>${h1}</h1>${lede?`<p class="lede">${lede}</p>`:""}</div></div><section><div class="wrap"><div class="prose">${html}</div></div></section>`);};
simple("about","About PhotonicsETFs","PhotonicsETFs.com tracks every ETF built around photonics with live data. Published by Dividend Empire LLC.","About PhotonicsETFs","One place to track, compare and understand every photonics ETF.",
`<p>PhotonicsETFs.com tracks every exchange-traded fund built around photonics: lasers, optical components, fiber-optic networking, AI optical interconnect and the light-based tools used to make chips. In 2026 a wave of new photonics funds launched within a few months of each other, and there was no simple place to compare them. This site is that place.</p>
<p>Every fund has its own profile with live assets, fees, launch date and price, plus side-by-side comparisons against every other photonics ETF. Fund data lives in our own data sheet and refreshes daily.</p>
<p>PhotonicsETFs is part of the Dividend Empire network, alongside <a href="https://topetfs.com/">TopETFs.com</a>, <a href="https://topdividendetfs.com/">TopDividendETFs.com</a>, <a href="${PRO}">TopDividendETFsPRO</a>, <a href="https://weeklyetfs.com/">WeeklyETFs.com</a> and more. The network was founded by Benjie Siegel, a self-taught investor with more than ten years of experience.</p>
<p>Nothing on this site is investment advice. Some placements are paid sponsorships from ETF issuers and are always labeled. Questions, corrections or partnership ideas: <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>`);
{
const MAILTO=`mailto:${EMAIL}?subject=${encodeURIComponent("PhotonicsETFs sponsorship")}`;
const contact=`<div class="contact" id="contact"><div><span class="k">Get in touch</span><h2>Tell us which fund you want in front of photonics investors</h2><p>Email us the ticker and the dates you have in mind. We reply with the open placements and a flat monthly rate.</p></div><div class="contact-act"><a class="mailbig" href="${MAILTO}" data-ga="advertise-email">${EMAIL}</a><div class="contact-btns"><a class="btn primary" href="${MAILTO}" data-ga="advertise-email-btn">Email us</a><button class="btn ghost" type="button" data-copy="${EMAIL}">Copy address</button></div></div></div>`;
out["advertise.html"]=page({title:"Advertise on PhotonicsETFs: Reach Photonics ETF Investors | PhotonicsETFs",desc:`Sponsor the only site built around photonics ETFs. A niche, high-intent audience researching ${FUNDS.map(f=>f.ticker).slice(0,5).join(", ")} and every other photonics fund. One sponsor per placement, sold directly.`,canonical:"/advertise",active:"/advertise"},
`<div class="phead adv-hero"><div class="wrap"><div class="crumbs"><a href="/">Home</a> / Advertise</div><span class="badge c" style="--c:#38E08A;--ci:#63EBA6">FOR ETF ISSUERS</span>
<h1>The most targeted place to reach <span class="split">photonics ETF investors</span></h1>
<p class="lede">PhotonicsETFs.com does one thing: it tracks every photonics ETF. Nobody lands here by accident. Every visitor is already researching this exact theme, comparing these exact funds and deciding which one to own.</p>
<div class="hbtns" style="margin-top:22px"><a class="btn primary" href="${MAILTO}" data-ga="advertise-hero-email">Request placements</a><a class="btn ghost" href="#placements">See the placements</a></div>
<div class="adv-stats"><div><b>${FUNDS.length}</b><span>Photonics ETFs tracked</span></div><div><b>${fAum(TOTAL)}</b><span>Assets in those funds</span></div><div><b>${PAIRS.length}</b><span>Head-to-head pages</span></div><div><b>${ARTICLES.length}</b><span>Long-form guides</span></div><div><b>85K+</b><span>Followers on X</span></div></div>
</div></div>
<section><div class="wrap">
<div class="shead"><div><h2>Super niche. Very high intent.</h2><p>A broad finance site sells you impressions. This site sells you the small group of people who are already shopping for a photonics fund.</p></div></div>
<div class="cards"><div class="card" style="--c:#00D4E8"><div class="wl">01 &middot; INTENT</div><h3>They arrive searching by ticker</h3><p>Visitors come in on searches like a fund's ticker, "photonics ETF" or one fund versus another. That is the last step before a buy decision, not casual reading.</p></div>
<div class="card" style="--c:#38E08A"><div class="wl">02 &middot; FOCUS</div><h3>One theme, zero waste</h3><p>There is no crypto, no credit cards and no general market news here. Every page is about photonics funds, so every impression lands on someone who cares about the category.</p></div>
<div class="card" style="--c:#F5C518"><div class="wl">03 &middot; TIMING</div><h3>A brand-new category</h3><p>Every photonics ETF launched in 2026. Investors have not picked their fund yet, and the first few names they see repeatedly are the ones they remember.</p></div>
<div class="card" style="--c:#FF8A2B"><div class="wl">04 &middot; SCARCITY</div><h3>One sponsor per placement</h3><p>We sell each position to a single sponsor, directly. No ad networks, no rotation with competitors and no programmatic clutter around your fund.</p></div></div>
</div></section>
<section style="padding-top:0"><div class="wrap"><div class="shead"><div><h2>Who you reach</h2><p>The audience is small on purpose. These are the readers a photonics fund actually wants.</p></div></div>
<div class="who"><div><h3>Self-directed investors</h3><p>People who buy ETFs in their own brokerage accounts and want to see fees, size and holdings before they do.</p></div><div><h3>Advisors and analysts</h3><p>Professionals doing due diligence on a new theme who need every fund on one page.</p></div><div><h3>AI infrastructure followers</h3><p>Readers who already own chip and data center names and are looking for the next layer of the trade.</p></div><div><h3>Income investors from our network</h3><p>The Dividend Empire audience across TopDividendETFs, WeeklyETFs and DevotedDividend on X.</p></div></div>
<div class="prose" style="margin-top:26px;max-width:none"><h3>What they do here</h3><ul class="take"><li><strong>Compare funds head to head.</strong> ${PAIRS.length} comparison pages line up any two photonics ETFs on fees, size, strategy and holdings.</li><li><strong>Read full fund profiles.</strong> Each of the ${FUNDS.length} funds has a deep profile with live price, holdings, fee math and risks.</li><li><strong>Study the theme.</strong> ${ARTICLES.length} long-form guides explain photonics, co-packaged optics, risks and income funds.</li><li><strong>Search by ticker.</strong> The site-wide search sends them straight to the fund they came for.</li></ul></div></div></section>
<section style="padding-top:0" id="placements"><div class="wrap"><div class="shead"><div><h2>Placements</h2><p>Flat monthly pricing, clearly labeled, with your approved creative and disclosures.</p></div></div>
<div class="adv-grid"><div class="plc"><span class="k">MOST VISIBLE</span><h3>Homepage banner</h3><p>The first thing visitors see after the hero, directly above the table of every photonics ETF.</p><ul><li>728 x 90 banner or native text card</li><li>Links to your fund page</li><li>Exclusive: one sponsor</li></ul></div>
<div class="plc"><span class="k">WIDEST REACH</span><h3>Site-wide banner</h3><p>Your fund on every fund profile, every comparison page and every guide, including competitor profiles.</p><ul><li>${FUNDS.length+PAIRS.length+ARTICLES.length}+ pages</li><li>Top and bottom positions</li><li>Exclusive: one sponsor</li></ul></div>
<div class="plc"><span class="k">DEEPEST</span><h3>Sponsored deep dive</h3><p>A long-form, clearly labeled article on your fund with live data embedded, written in plain English and kept on the site.</p><ul><li>Featured in Guides and search</li><li>Compliance review before publishing</li><li>Promoted across our network</li></ul></div>
<div class="plc"><span class="k">AMPLIFY</span><h3>Social and video</h3><p>Features on our X accounts, including DevotedDividend with 85K+ followers, and on our YouTube channels.</p><ul><li>Posts built around your fund's data</li><li>Sponsored tags and disclosures</li><li>Bundle with any site placement</li></ul></div>
<div class="plc"><span class="k">NETWORK</span><h3>Dividend Empire bundle</h3><p>Extend the same campaign to TopETFs, TopDividendETFs, WeeklyETFs, MonthlyETFs and the rest of the network.</p><ul><li>One contract, one invoice</li><li>Placement matched to each site</li><li>Best value per month</li></ul></div>
<div class="plc"><span class="k">YOUR IDEA</span><h3>Custom</h3><p>A launch-week takeover, a comparison feature or something we have not thought of. If it helps investors, we will build it.</p><ul><li>Scoped with you</li><li>Fast turnaround</li><li>Always labeled</li></ul></div></div>
<div class="sponsor" style="padding-bottom:0"><div class="lbl">What the banner position looks like</div><div class="slot"><div><b>Your photonics ETF here</b><span>Your headline, your ticker and a link to your fund page.</span></div><em>LEARN MORE &rarr;</em></div></div>
</div></section>
<section style="padding-top:0"><div class="wrap"><div class="shead"><div><h2>How it works</h2></div></div>
<ol class="steps"><li><b>1</b><h3>Email us</h3><p>Send the fund and timing. We reply with what is open and a flat monthly rate.</p></li><li><b>2</b><h3>Send creative</h3><p>Banner, logo and approved language. We can draft copy for your compliance team to review.</p></li><li><b>3</b><h3>Go live</h3><p>Once you approve it, the placement goes live, labeled as sponsored.</p></li><li><b>4</b><h3>Get a report</h3><p>We track clicks on every placement and can share the numbers with you.</p></li></ol>
</div></section>
<section style="padding-top:0"><div class="wrap"><div class="two"><div class="box"><h3>Our standards</h3><p class="bp">Sponsored content is always labeled. We use your approved language, include your disclosures and send creative for compliance review before it goes live. Fund data stays accurate and neutral for every fund on the list, sponsor or not, and sponsorship never changes the order of the table.</p></div>
<div class="box"><h3>Partners across our network</h3><p class="bp">Issuers who have sponsored or partnered across the Dividend Empire network include:</p><div class="chips">${["REX Shares","VistaShares","VegaShares","IncomeShares","Liquid Strategies","Tuttle Capital","GraniteShares"].map(x=>`<span class="pill">${x}</span>`).join("")}</div></div></div>
${contact}
</div></section>`);
}
simple("disclaimer","Disclaimer","Important information about the data and content on PhotonicsETFs.com.","Disclaimer","",
`<p>${DISC}</p><p>PhotonicsETFs.com and Dividend Empire LLC are not registered investment advisors or broker-dealers. Inclusion of a fund on this site is not an endorsement or recommendation. Fund descriptions summarize public information from issuers and may not reflect the most recent holdings or strategy changes.</p><p>Some placements on this site are paid sponsorships from ETF issuers. Sponsored placements are labeled, and sponsors do not control fund data or editorial content.</p><p>Leveraged ETFs seek a multiple of daily returns and reset daily. They are not suitable for most long-term investors.</p>`);
simple("privacy-policy","Privacy Policy","How PhotonicsETFs.com handles visitor data.","Privacy policy",`Last updated ${fDateL(NOW.toISOString().slice(0,10))}`,
`<p>PhotonicsETFs.com is operated by Dividend Empire LLC. We do not ask you to create an account and we do not sell personal information.</p><h2>Analytics</h2><p>We may use Google Analytics to understand how visitors use the site. Google Analytics uses cookies to collect information such as pages visited, time on site and general location. You can opt out with the Google Analytics opt-out browser add-on.</p><h2>Third-party content</h2><p>Price charts are provided by TradingView and fonts by Google Fonts. These services may collect technical information such as your IP address under their own privacy policies.</p><h2>Contact</h2><p>Questions about this policy: <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>`);
simple("terms-of-use","Terms of Use","Terms for using PhotonicsETFs.com.","Terms of use","",
`<p>By using PhotonicsETFs.com you agree to these terms. The site and its content are provided "as is" for informational and educational purposes only, without warranties of any kind.</p><p>Nothing on this site is investment, financial, tax or legal advice. You are solely responsible for your investment decisions. Dividend Empire LLC is not liable for any losses arising from the use of this site or its data.</p><p>Content on this site is owned by Dividend Empire LLC. You may share links and short quotes with attribution. Do not copy or republish the site or its data without permission.</p><p>Contact: <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>`);
out["404.html"]=page({title:"Page not found | PhotonicsETFs",desc:"That page does not exist.",canonical:"/404"},`<div class="phead"><div class="wrap"><h1>That beam missed the target</h1><p class="lede">The page you are looking for moved or never existed.</p><p style="margin-top:20px"><a class="btn primary" href="/">See every photonics ETF</a></p></div></div>`);

/* ---------- holdings ---------- */
out["holdings.html"]=page({title:`Photonics ETF Holdings: The Stocks Inside Every Photonics ETF | PhotonicsETFs`,desc:`See the top holdings of every photonics ETF (${HFUNDS.map(f=>f.ticker).join(", ")}) and which photonics stocks, like Lumentum, Coherent and Ciena, show up in the most funds.`,canonical:"/holdings",active:"/holdings",
  ld:{"@context":"https://schema.org","@type":"WebPage",name:"Photonics ETF holdings",url:SITE+"/holdings",breadcrumb:{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Photonics ETFs",item:SITE+"/"},{"@type":"ListItem",position:2,name:"Holdings",item:SITE+"/holdings"}]}}},
`<div class="phead"><div class="wrap"><div class="crumbs"><a href="/">Photonics ETFs</a> / Holdings</div><span class="badge c" style="--c:#38E08A;--ci:#63EBA6">INSIDE THE FUNDS</span><h1>The stocks photonics ETFs own</h1><p class="lede">Top holdings for every photonics ETF, plus the ${STOCKS.length} companies behind them and how many funds hold each one. Two funds with the same theme can own very different things.</p></div></div>
<div class="wrap" style="position:relative;z-index:2;padding:30px var(--gut) 40px"><div class="layout"><div>
<nav class="onpage" aria-label="On this page"><a href="#overlap">Most-held stocks</a><a href="#by-fund">Holdings by fund</a><a href="#all-stocks">All ${STOCKS.length} stocks</a></nav>
<h2 class="h2" id="overlap">The most widely held photonics stocks</h2><div class="prose"><p>${STOCKS.slice(0,3).map(s=>`<strong>${esc(s.name)}</strong> appears in the published top holdings of ${s.in.length} of the ${HFUNDS.length} funds`).join(", ")}. If you own more than one photonics ETF, these are the names you are most likely doubling up on.</p></div>
${bars({title:"Number of photonics ETFs holding each stock in their top positions",rows:STOCKS.filter(s=>s.in.length>1).map(s=>[s.name,s.in.length,`#s-${slugify(s.name)}`]),fmt:v=>v+" funds",src:"issuer holdings files and StockAnalysis, dates shown under each fund below"})}
<h2 class="h2" id="by-fund">Top holdings by fund</h2><div class="prose"><p>Each chart shows the fund's largest positions as a share of the fund, with the date of the snapshot. Funds that use swaps are shown by total exposure.</p></div>
${HFUNDS.map(f=>`<h3 class="h3" id="f-${f.slug}"><a href="/etf/${f.slug}">$${f.ticker}</a> ${esc(f.name)}</h3>${holdBars(f)}`).join("")}
${FUNDS.filter(f=>!HFUNDS.includes(f)).length?`<div class="prose"><p>${FUNDS.filter(f=>!HFUNDS.includes(f)).map(f=>`<a href="/etf/${f.slug}">$${f.ticker}</a>`).join(" and ")} use swaps or options instead of a regular stock basket, so they are left out of the overlap count. Their profiles explain what they hold.</p></div>`:""}
<h2 class="h2" id="all-stocks">Every stock, and which funds hold it</h2><div class="stks">${STOCKS.map(stockCard).join("")}</div>
<p class="note">Holdings are snapshots of each fund's largest published positions on the dates shown, not complete portfolios, and they change often. A stock missing from a fund's list here may still be a smaller holding. ${DISC}</p></div>
<aside class="side">${sideBoxes()}<div class="box"><h3>Guides</h3>${ARTICLES.map(a=>`<a class="ln" href="/${a.slug}">${esc(a.short||a.title)}</a>`).join("")}</div></aside></div></div>${slot(advSlot)}`);

/* ---------- glossary ---------- */
const GL=[...GLOSSARY].sort((a,b)=>a[0].localeCompare(b[0]));
out["glossary.html"]=page({title:"Photonics Glossary: Optical and Photonics ETF Terms Explained | PhotonicsETFs",desc:"Plain-English definitions of the terms you run into when researching photonics ETFs: transceivers, co-packaged optics, silicon photonics, indium phosphide, EML, total return swaps and more.",canonical:"/glossary",active:"/glossary",
  ld:{"@context":"https://schema.org","@type":"DefinedTermSet",name:"Photonics glossary",url:SITE+"/glossary",hasDefinedTerm:GL.map(([t,d])=>({"@type":"DefinedTerm",name:t,description:d,url:`${SITE}/glossary#${slugify(t)}`}))}},
`<div class="phead"><div class="wrap"><div class="crumbs"><a href="/">Photonics ETFs</a> / Glossary</div><span class="badge c" style="--c:#FF8A2B;--ci:#FFA85C">REFERENCE</span><h1>Photonics glossary</h1><p class="lede">${GL.length} terms you will run into when you research photonics ETFs, explained without the jargon.</p></div></div>
<div class="wrap" style="position:relative;z-index:2;padding:30px var(--gut) 40px"><div class="layout"><div>
<nav class="onpage" aria-label="Jump to a letter">${[...new Set(GL.map(g=>g[0][0].toUpperCase()))].map(l=>`<a href="#l-${l}">${l}</a>`).join("")}</nav>
<dl class="gloss">${GL.map(([t,d,l],i)=>`${i===0||GL[i-1][0][0].toUpperCase()!==t[0].toUpperCase()?`<div class="gl-l" id="l-${t[0].toUpperCase()}">${t[0].toUpperCase()}</div>`:""}<div id="${slugify(t)}"><dt>${esc(t)}</dt><dd>${esc(d)}${l?` <a href="${l[1]}">${esc(l[0])} &rarr;</a>`:""}</dd></div>`).join("")}</dl>
<p class="note">${DISC}</p></div>
<aside class="side">${sideBoxes()}<div class="box"><h3>Guides</h3>${ARTICLES.map(a=>`<a class="ln" href="/${a.slug}">${esc(a.short||a.title)}</a>`).join("")}</div></aside></div></div>${slot(advSlot)}`);

/* ---------- search index (loaded by the header search) ---------- */
const SIDX=[
 ...byAum.map(f=>({g:"ETF",t:"$"+f.ticker,s:f.name,u:`/etf/${f.slug}`,k:[f.ticker,f.name,f.issuer,f.fo.name,f.prof?.style||"",f.prof?.index||""].join(" "),x:fAum(f.aum)+" · "+fExp(f.exp)})),
 ...ARTICLES.map(a=>({g:"Guide",t:a.title,s:a.tag,u:"/"+a.slug,k:[a.title,a.seo,a.dek,a.kw||""].join(" ")})),
 ...PAIRS_POP.map(([a,b])=>({g:"Compare",t:`${a.ticker} vs ${b.ticker}`,s:`${a.issuer} vs ${b.issuer}`,u:pairUrl(a,b),k:`${a.ticker} ${b.ticker} ${b.ticker} vs ${a.ticker} compare versus`})),
 ...STOCKS.map(s=>({g:"Stock",t:s.name+(s.ticker&&/^[A-Z]+$/.test(s.ticker)?" $"+s.ticker:""),s:`Held by ${s.in.map(x=>x[0].ticker).join(", ")}`,u:`/holdings#s-${slugify(s.name)}`,k:[s.name,s.ticker,"stock holdings"].join(" ")})),
 ...GL.map(([t,d])=>({g:"Glossary",t,s:d.length>80?d.slice(0,78).replace(/\s+\S*$/,"")+"...":d,u:`/glossary#${slugify(t)}`,k:t})),
 ...[["All photonics ETFs","The full live table","/#rankings","list table ranking top best etfs"],["Compare photonics ETFs",`All ${PAIRS.length} matchups`,"/compare/","compare versus vs"],["Photonics ETF holdings","What every fund owns","/holdings","holdings stocks overlap"],["Photonics glossary",`${GL.length} terms explained`,"/glossary","glossary terms definitions"],["All guides","Research and explainers","/blog","guides blog articles research"],["Advertise","Sponsor PhotonicsETFs","/advertise","advertise sponsor sponsorship contact"],["About","Who runs this site","/about","about contact benjie"]].map(([t,s2,u,k])=>({g:"Page",t,s:s2,u,k}))];
out["assets/search.json"]=JSON.stringify(SIDX);

/* ---------- sitemap, robots, misc ---------- */
const today=NOW.toISOString().slice(0,10);
const urls=["/","/compare/","/blog","/holdings","/glossary","/about","/advertise",...FUNDS.map(f=>`/etf/${f.slug}`),...PAIRS.map(([a,b])=>pairUrl(a,b)),...ARTICLES.map(a=>"/"+a.slug),"/disclaimer","/privacy-policy","/terms-of-use"];
out["sitemap.xml"]=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`;
out["robots.txt"]=`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
out["CNAME"]="photonicsetfs.com\n";
out[".nojekyll"]="";
out["favicon.svg"]=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#7B2FF7"/><stop offset=".35" stop-color="#2B6BFF"/><stop offset=".55" stop-color="#00D4E8"/><stop offset=".75" stop-color="#38E08A"/><stop offset="1" stop-color="#FF3B4E"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="#05070E"/><circle cx="16" cy="16" r="10" fill="url(#g)"/><circle cx="16" cy="16" r="5.5" fill="#05070E"/></svg>`;
for(const [f,c] of Object.entries(out)){const p=path.join(ROOT,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,c);}
console.log(`Built ${Object.keys(out).length} files: ${FUNDS.length} funds, ${PAIRS.length} comparisons, ${ARTICLES.length} guides.`);
