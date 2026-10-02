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
const top=active=>`<a class="skip" href="#main">Skip to content</a>
<div id="rail"><div id="railFill"></div></div>
<header class="site"><div class="wrap hbar">
<a class="mark" href="/" aria-label="PhotonicsETFs home"><span class="aperture" aria-hidden="true"></span><b>PHOTONICS<span>ETFs</span></b></a>
<button id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="nav">&#9776;</button>
<nav class="main" id="nav" aria-label="Primary">${NAV.map(([n,h])=>`<a href="${h}"${active===h?' aria-current="page"':""}>${n}</a>`).join("")}</nav>
</div></header>`;
const DISC=`PhotonicsETFs.com is published by Dividend Empire LLC for informational and educational purposes only and does not constitute investment, financial, tax or legal advice. Nothing here is a buy or sell signal. Fund data comes from our own data sheet and issuer materials, is refreshed daily and can be delayed, incomplete or incorrect. Always verify against the issuer's website and prospectus, do your own research and consult a licensed financial professional. Past performance does not guarantee future results. Investing involves risk, including possible loss of principal. Price charts are provided by TradingView and may be delayed.`;
const foot=()=>`
<div class="network" id="network"><div class="wrap"><div class="lbl">Our network</div><div class="chips">${NETWORK.map(([n,d])=>`<a class="pill" href="https://${d}/" target="_blank" rel="noopener">${n}</a>`).join("")}<a class="pill here" href="/">PhotonicsETFs</a></div></div></div>
<footer><div class="wrap">
<div class="fgrid">
<div class="fabout"><a class="mark" href="/"><span class="aperture" aria-hidden="true"></span><b>PHOTONICS<span>ETFs</span></b></a><p>Independent research and live data on every ETF built around photonics: lasers, optics, fiber, optical interconnect and the light-based tools that make chips. Part of the Dividend Empire network.</p></div>
<div><h4>Photonics ETFs</h4>${FUNDS.slice(0,8).map(f=>`<a href="/etf/${f.slug}">$${f.ticker} ${esc(f.issuer)}</a>`).join("")}</div>
<div><h4>Research</h4><a href="/#rankings">All photonics ETFs</a><a href="/compare/">Compare photonics ETFs</a><a href="/best-photonics-etfs">Best photonics ETFs</a><a href="/what-is-a-photonics-etf">What is a photonics ETF?</a><a href="/blog">All guides</a></div>
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
function fundTable(list,me){return `<div class="tw"><table class="dtable"><thead><tr><th class="l">ETF</th><th class="l">Provider</th><th class="l">Focus</th><th>AUM</th><th>Expense</th><th>Launched</th></tr></thead><tbody>${list.map(f=>`<tr${me&&f.ticker===me?' class="me"':""}><td class="l"><a href="/etf/${f.slug}"><b>$${f.ticker}</b></a> <span style="color:var(--dim)">${esc(f.name)}</span></td><td class="l">${esc(f.issuer)}</td><td class="l"><span class="fx" style="--c:${f.fo.c};--ci:${f.fo.ci}">${f.fo.label}</span></td><td>${live(f,"aum",fAum)}</td><td>${live(f,"exp",fExp)}</td><td>${fDate(f.inception)}</td></tr>`).join("")}</tbody></table></div>`;}
const out={};

/* ---------- articles ---------- */
const artDir=path.join(ROOT,"content","articles");
const ARTICLES=fs.readdirSync(artDir).filter(f=>f.endsWith(".html")).map(f=>{const r=fs.readFileSync(path.join(artDir,f),"utf8");const m=r.match(/^<!--meta\s*([\s\S]*?)-->/);if(!m)throw new Error("No meta in "+f);const meta=JSON.parse(m[1]);meta.body=r.slice(m[0].length);meta.slug=f.replace(/\.html$/,"");return meta;}).sort((a,b)=>b.date.localeCompare(a.date)||a.slug.localeCompare(b.slug));
function tokens(html){
  const res=t=>t.startsWith("@")?pick[t.slice(1)]:BY[t];
  return html
   .replace(/\{\{n\}\}/g,String(FUNDS.length)).replace(/\{\{total_aum\}\}/g,fAum(TOTAL)).replace(/\{\{avg_exp\}\}/g,fExp(AVGEXP))
   .replace(/\{\{table\}\}/g,()=>`<div class="tbl">${fundTable(byAum)}</div>`)
   .replace(/\{\{list\}\}/g,()=>byAum.map((f,i)=>`<h3>${i+1}. ${tlink(f)}: ${esc(f.name)}</h3><p><strong>${esc(f.issuer)}</strong> &middot; ${f.prof?esc(f.prof.style):""} &middot; ${live(f,"aum",fAum)} in assets &middot; ${live(f,"exp",fExp)} expense ratio &middot; launched ${fDateL(f.inception)||"n/a"}</p>${f.prof?`<p>${esc(f.prof.about)}</p><p><strong>Worth knowing:</strong> ${esc(f.prof.watch)}</p>`:""}<p><a href="/etf/${f.slug}">Full ${f.ticker} profile and live price &rarr;</a></p>`).join(""))
   .replace(/\{\{(link|aum|exp|inc|name):([@A-Z.a-z]+)\}\}/g,(m,k,t)=>{const f=res(t);if(!f)return t.startsWith("@")?"":"$"+t;return k==="link"?tlink(f):k==="aum"?live(f,"aum",fAum):k==="exp"?live(f,"exp",fExp):k==="inc"?fDateL(f.inception):esc(f.name);});
}
for(const a of ARTICLES){
  const url="/"+a.slug;
  a.html=tokens(a.body);
  if(/\{\{/.test(a.html))throw new Error("Unresolved token in "+a.slug);
  if(/—|–/.test(a.html.replace(/<[^>]+>/g,"").replace(/—(?=\s*<)/g,"")))console.warn("Dash found in",a.slug);
  const more=ARTICLES.filter(x=>x!==a);
  out[a.slug+".html"]=page({title:a.seo+" | PhotonicsETFs",desc:a.dek,canonical:url,type:"article",active:"/blog",faq:a.faq,
    ld:{"@context":"https://schema.org","@type":"Article",headline:a.title,description:a.dek,datePublished:a.date,dateModified:NOW.toISOString().slice(0,10),author:{"@type":"Person",name:"Benjie Siegel"},publisher:{"@type":"Organization",name:"Dividend Empire LLC"},image:OG,mainEntityOfPage:SITE+url}},
  `<div class="phead"><div class="wrap"><div class="crumbs"><a href="/">Home</a> / <a href="/blog">Guides</a></div><span class="badge c" style="--c:${a.color};--ci:${a.color}">${esc(a.tag)}</span><h1>${esc(a.title)}</h1><p class="lede">${esc(a.dek)}</p><p class="crumbs" style="margin:14px 0 0">By Benjie Siegel &middot; ${fDateL(a.date)} &middot; Live data</p></div></div>
${slot(advSlot)}
<div class="wrap" style="position:relative;z-index:2;padding-bottom:40px"><div class="layout"><article><div class="prose">${a.html}</div>
${a.faq?`<section class="faq" style="padding:20px 0 0"><h2 class="h2">Frequently asked questions</h2>${a.faq.map(([q,x])=>`<h3>${esc(q)}</h3><p>${esc(x)}</p>`).join("")}</section>`:""}
<p class="note">${DISC}</p></article>
<aside class="side">${sideBoxes()}<div class="box"><h3>More guides</h3>${more.map(x=>`<a class="ln" href="/${x.slug}">${esc(x.title)}</a>`).join("")}</div></aside></div></div>
${slot(proSlot,"From our network")}`);
}
function sideBoxes(skip){return `<div class="box"><h3>Photonics ETFs</h3>${byAum.filter(f=>f.ticker!==skip).map(f=>`<a class="ln" href="/etf/${f.slug}"><b>$${f.ticker}</b> <span style="float:right;font-family:var(--mono);font-size:13px">${live(f,"aum",fAum)}</span></a>`).join("")}</div>
<div class="box pro"><h3>TopDividendETFsPRO</h3><p>Our premium terminal: 160+ income ETFs with grades, tax treatment, payout schedules and advanced filters.</p><a class="btn" href="${PRO}" target="_blank" rel="noopener" data-ga="side-pro">Go PRO &rarr;</a></div>`;}

/* ---------- home ---------- */
const prism=`<div class="prism-stage" id="stage"><svg class="prism-svg" viewBox="0 0 700 440" preserveAspectRatio="xMidYMid meet" role="img" aria-label="A white beam entering a prism and splitting into seven colored bands, each labeled with a photonics focus area">
<defs><linearGradient id="wht" x1="0" x2="1"><stop offset="0" stop-color="#F2F6FF" stop-opacity="0"/><stop offset="1" stop-color="#F2F6FF" stop-opacity=".95"/></linearGradient><filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<g class="in-beam" filter="url(#soft)"><line x1="0" y1="118" x2="182" y2="118" stroke="url(#wht)" stroke-width="3"/></g><polygon class="prism-body" points="198,48 262,182 134,182"/><g filter="url(#soft)" id="fan"></g><g id="fanLabels"></g></svg></div>`;
const homeRows=FUNDS.map(f=>`<tr style="--c:${f.fo.c};--ci:${f.fo.ci}" data-t="${f.ticker}" tabindex="0"><td class="l"><a class="tk" href="/etf/${f.slug}">$${f.ticker}</a></td><td class="l"><span class="nm">${esc(f.name)}</span></td><td class="l"><span class="prov">${esc(f.issuer)}</span></td><td class="l"><span class="fx">${f.fo.label}</span></td><td class="num">${fAum(f.aum)}</td><td class="num">${fExp(f.exp)}</td><td class="dt">${fDate(f.inception)}</td></tr>`).join("");
const present=FOCUS.filter(f=>FUNDS.some(x=>x.focus===f.id));
const ALPHA=[...FUNDS].sort((a,b)=>a.ticker.localeCompare(b.ticker));
const PAIRS=[];for(let i=0;i<ALPHA.length;i++)for(let j=i+1;j<ALPHA.length;j++)PAIRS.push([ALPHA[i],ALPHA[j]]);
// big-vs-big matchups first for display; URLs stay alphabetical so they never change
const PAIRS_POP=[...PAIRS].sort((p,q)=>((q[0].aum||0)+(q[1].aum||0))-((p[0].aum||0)+(p[1].aum||0)));
const pairUrl=(a,b)=>{const [x,y]=[a,b].sort((m,n)=>m.ticker.localeCompare(n.ticker));return `/compare/${x.slug}-vs-${y.slug}`;};
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

<section id="compare" style="padding-top:0"><div class="wrap"><div class="shead rv"><div><h2>Compare photonics ETFs</h2><p>Line up any two funds on fees, size, launch date, strategy and live price.</p></div><a class="pill" href="/compare/">All comparisons &rarr;</a></div>
<div class="chips rv">${PAIRS_POP.slice(0,12).map(([a,b])=>`<a class="pill" href="${pairUrl(a,b)}">${a.ticker} vs ${b.ticker}</a>`).join("")}</div></div></section>

<section id="spectrum" style="padding-top:0"><div class="wrap"><div class="shead rv"><div><h2>The photonics spectrum</h2><p>Photonics is not one industry. These are the seven corners of it we track, each marked with its own wavelength color.</p></div></div>
<div class="cards rv">${FOCUS.map(f=>`<div class="card" style="--c:${f.c}"><div class="wl">${f.wl} NM &middot; ${FUNDS.filter(x=>x.focus===f.id).length} ETF${FUNDS.filter(x=>x.focus===f.id).length===1?"":"s"}</div><h3>${f.name}</h3><p>${f.desc}</p></div>`).join("")}</div></div></section>

${slot(proSlot,"From our network")}
<section id="research" style="padding-top:0"><div class="wrap"><div class="shead rv"><div><h2>Photonics ETF guides</h2><p>Plain-English research on photonics ETFs and the technology behind them, with live numbers.</p></div><a class="pill" href="/blog">All guides &rarr;</a></div>
<div class="cards rv">${ARTICLES.map(a=>`<a class="post" href="/${a.slug}" style="--c:${a.color}"><div class="meta"><span class="tag">${esc(a.tag)}</span><span class="date">${fDate(a.date)}</span></div><h3>${esc(a.title)}</h3><p>${esc(a.dek)}</p><span class="go">Read the guide &rarr;</span></a>`).join("")}</div></div></section>

<section id="faq" style="padding-top:0"><div class="wrap"><div class="shead"><div><h2>Photonics ETF FAQ</h2></div></div><div class="faq">${homeFaq.map(([q,a])=>`<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}</div></div></section>`);

/* ---------- ETF pages ---------- */
function rankOf(f,key,asc){const l=FUNDS.filter(x=>x[key]!=null).sort((a,b)=>asc?a[key]-b[key]:b[key]-a[key]);const i=l.indexOf(f);return i<0?null:`#${i+1} of ${l.length}`;}
for(const f of FUNDS){
  const others=byAum.filter(x=>x!==f),i=byAum.indexOf(f),prev=byAum[(i-1+byAum.length)%byAum.length],next=byAum[(i+1)%byAum.length];
  const p=f.prof||{style:"",about:`${f.name} is a ${f.fo.name.toLowerCase()} focused ETF from ${f.issuer}.`,watch:"Check the issuer's website for the latest holdings and strategy details."};
  const faq=[[`What is ${f.ticker}?`,`${f.ticker} is the ${f.name}, a photonics-focused ETF from ${f.issuer}. ${p.about}`],
   [`What is ${f.ticker}'s expense ratio?`,f.exp!=null?`${f.ticker} charges ${fExp(f.exp)} a year, about $${(f.exp*100).toFixed(0)} for every $10,000 invested.`:"Check the fund's prospectus for its current expense ratio."],
   [`How big is ${f.ticker}?`,f.aum!=null?`${f.ticker} has about ${fAum(f.aum)} in assets under management, ${rankOf(f,"aum")} photonics ETFs by size.`:"Assets are not available yet."],
   [`When did ${f.ticker} launch?`,f.inception?`${f.ticker} launched on ${fDateL(f.inception)}.`:"Check the issuer's website for the launch date."],
   [`Is ${f.ticker} a good investment?`,"We do not make buy or sell recommendations. Compare its strategy, fees and size with the other photonics ETFs and read the prospectus before deciding."]];
  out[`etf/${f.slug}.html`]=page({title:`${f.ticker} ETF: ${f.name} Price, AUM and Expense Ratio | PhotonicsETFs`,desc:`${f.ticker} (${f.name}) from ${f.issuer}: live price, ${fAum(f.aum)} AUM, ${fExp(f.exp)} expense ratio, launched ${fDate(f.inception)}. What it holds and how it compares with every other photonics ETF.`,canonical:`/etf/${f.slug}`,active:"/#rankings",faq,
    ld:{"@context":"https://schema.org","@type":"WebPage",name:`${f.ticker} ETF`,url:`${SITE}/etf/${f.slug}`,about:{"@type":"FinancialProduct",name:f.name,alternateName:f.ticker,category:"Exchange-traded fund",provider:{"@type":"Organization",name:f.issuer}},breadcrumb:{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Photonics ETFs",item:SITE+"/"},{"@type":"ListItem",position:2,name:f.ticker,item:`${SITE}/etf/${f.slug}`}]}}},
`<div class="phead"><div class="wrap"><div class="crumbs"><a href="/">Photonics ETFs</a> / ${f.ticker}</div>
<div class="layout"><div><span class="badge c" style="--c:${f.fo.c};--ci:${f.fo.ci}">${f.fo.name.toUpperCase()}</span>${p.style?`<span class="badge">${esc(p.style.toUpperCase())}</span>`:""}${/2x|3x|leveraged/i.test(f.name+p.style)?`<span class="badge warn">LEVERAGED</span>`:""}
<h1>$${f.ticker} <span style="color:var(--dim);font-weight:500">${esc(f.name)}</span></h1><p class="lede">${esc(f.issuer)} &middot; launched ${fDateL(f.inception)||"n/a"}${f.age!=null?` (${age(f)} ago)`:""}</p></div>
<div class="tvbox"><div class="k"><span>${f.ticker} live price</span><span>Since launch</span></div><div data-tv="${f.ticker}">Loading live price...</div></div></div></div></div>
<div class="wrap" style="position:relative;z-index:2;padding:30px var(--gut) 40px"><div class="layout"><div>
<div class="stats"><div><div class="k">AUM</div><div class="v">${live(f,"aum",fAum)}</div><div class="s">${rankOf(f,"aum")||""} by size</div></div><div><div class="k">Expense ratio</div><div class="v">${live(f,"exp",fExp)}</div><div class="s">${f.exp!=null?`$${(f.exp*100).toFixed(0)} a year per $10K`:""}</div></div><div><div class="k">Launched</div><div class="v">${fDate(f.inception)}</div><div class="s">${f.age!=null?age(f)+" of history":""}</div></div><div><div class="k">Provider</div><div class="v" style="font-size:18px">${esc(f.issuer)}</div><div class="s">${esc(p.style||"")}</div></div><div><div class="k">Focus</div><div class="v" style="font-size:18px">${f.fo.label}</div><div class="s">${f.fo.wl} nm on our spectrum</div></div><div><div class="k">Fee rank</div><div class="v">${rankOf(f,"exp",true)||"—"}</div><div class="s">Cheapest first</div></div></div>
<h2 class="h2">What ${f.ticker} is</h2><div class="prose"><p>${esc(p.about)}</p><h3>Worth knowing</h3><p>${esc(p.watch)}</p>${p.source?`<p>Check the latest holdings and prospectus on the <a href="${esc(p.source)}" target="_blank" rel="noopener nofollow">${esc(f.issuer)} website</a>.</p>`:""}</div>
<h2 class="h2">${f.ticker} vs. every other photonics ETF</h2>${fundTable([f].concat(others),f.ticker)}
<h2 class="h2">Head-to-head comparisons</h2><div class="chips">${others.map(o=>`<a class="pill" href="${pairUrl(f,o)}">${f.ticker} vs ${o.ticker}</a>`).join("")}</div>
<section class="faq" style="padding:10px 0 0"><h2 class="h2">${f.ticker} FAQ</h2>${faq.map(([q,a])=>`<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}</section>
<nav class="pnav" aria-label="More photonics ETFs"><a href="/etf/${prev.slug}"><span>&larr; Previous</span><b>$${prev.ticker}</b> ${esc(prev.issuer)}</a><a href="/etf/${next.slug}"><span>Next &rarr;</span><b>$${next.ticker}</b> ${esc(next.issuer)}</a></nav>
<p class="note">${DISC}</p></div>
<aside class="side">${sideBoxes(f.ticker)}<div class="box"><h3>Guides</h3>${ARTICLES.map(a=>`<a class="ln" href="/${a.slug}">${esc(a.title)}</a>`).join("")}</div></aside></div></div>
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
<h2 class="h2">Side by side</h2><div class="tw"><table class="dtable"><thead><tr><th class="l">Metric</th><th>$${a.ticker}</th><th>$${b.ticker}</th></tr></thead><tbody>${rows.map(([l,fm,get,hi])=>{const w=get?win(get,hi):null;return `<tr><td class="l">${l}</td><td${w===a.ticker?' class="win"':""}>${fm(a)}</td><td${w===b.ticker?' class="win"':""}>${fm(b)}</td></tr>`;}).join("")}</tbody></table></div>
<div class="prose" style="margin-top:22px"><h2>The short version</h2><p>${cheaper?`<strong>${cheaper}</strong> is cheaper to own, at ${fExp(BY[cheaper].exp)} a year versus ${fExp((cheaper===a.ticker?b:a).exp)}. `:""}${bigger?`<strong>${bigger}</strong> is the bigger fund, with ${fAum(BY[bigger].aum)} in assets. `:""}${older?`<strong>${older.ticker}</strong> has been around longer, launching on ${fDateL(older.inception)}.`:""}</p>
<h3>${a.ticker}</h3><p>${esc(a.prof?.about||"")} ${esc(a.prof?.watch||"")}</p><h3>${b.ticker}</h3><p>${esc(b.prof?.about||"")} ${esc(b.prof?.watch||"")}</p>
<p>Lower fees and more assets are helpful, but they are not the whole story. The bigger question is which strategy matches what you want to own. This comparison is not a recommendation to buy or sell either fund.</p></div>
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
<section><div class="wrap"><div class="cards">${ARTICLES.map(a=>`<a class="post" href="/${a.slug}" style="--c:${a.color}"><div class="meta"><span class="tag">${esc(a.tag)}</span><span class="date">${fDate(a.date)}</span></div><h3>${esc(a.title)}</h3><p>${esc(a.dek)}</p><span class="go">Read the guide &rarr;</span></a>`).join("")}</div></div></section>`);
const simple=(file,title,desc,h1,lede,html)=>{out[file+".html"]=page({title:title+" | PhotonicsETFs",desc,canonical:"/"+file,active:"/"+file},`<div class="phead"><div class="wrap"><h1>${h1}</h1>${lede?`<p class="lede">${lede}</p>`:""}</div></div><section><div class="wrap"><div class="prose">${html}</div></div></section>`);};
simple("about","About PhotonicsETFs","PhotonicsETFs.com tracks every ETF built around photonics with live data. Published by Dividend Empire LLC.","About PhotonicsETFs","One place to track, compare and understand every photonics ETF.",
`<p>PhotonicsETFs.com tracks every exchange-traded fund built around photonics: lasers, optical components, fiber-optic networking, AI optical interconnect and the light-based tools used to make chips. In 2026 a wave of new photonics funds launched within a few months of each other, and there was no simple place to compare them. This site is that place.</p>
<p>Every fund has its own profile with live assets, fees, launch date and price, plus side-by-side comparisons against every other photonics ETF. Fund data lives in our own data sheet and refreshes daily.</p>
<p>PhotonicsETFs is part of the Dividend Empire network, alongside <a href="https://topetfs.com/">TopETFs.com</a>, <a href="https://topdividendetfs.com/">TopDividendETFs.com</a>, <a href="${PRO}">TopDividendETFsPRO</a>, <a href="https://weeklyetfs.com/">WeeklyETFs.com</a> and more. The network was founded by Benjie Siegel, a self-taught investor with more than ten years of experience.</p>
<p>Nothing on this site is investment advice. Some placements are paid sponsorships from ETF issuers and are always labeled. Questions, corrections or partnership ideas: <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>`);
simple("advertise","Advertise on PhotonicsETFs","Reach investors researching photonics ETFs. Sponsorships and partnerships for ETF issuers on PhotonicsETFs.com and the Dividend Empire network.","Put your fund in front of photonics investors","Everyone who lands here is researching photonics ETFs. There is no more targeted audience for a photonics fund.",
`<h2>Why sponsor PhotonicsETFs</h2><ul><li><strong>Pure intent.</strong> Visitors arrive searching for photonics ETFs by name, comparing funds and checking fees.</li><li><strong>Limited inventory.</strong> One sponsor placement per position, sold directly. No ad networks.</li><li><strong>The network behind it.</strong> PhotonicsETFs is part of the Dividend Empire network, including TopETFs, TopDividendETFs, WeeklyETFs and about 80K followers on X through DevotedDividend.</li></ul>
<h2>Placements</h2><ul><li><strong>Homepage banner</strong> above the photonics ETF table, seen before the data.</li><li><strong>Site-wide banner</strong> on every fund profile, comparison page and guide.</li><li><strong>Sponsored deep dive</strong> on your fund, clearly labeled, with live data embedded.</li><li><strong>Social and video</strong> features across our X accounts and YouTube channels.</li></ul>
<h2>Our standards</h2><p>Sponsored content is always labeled. We use your approved language, include disclosures and send creative for compliance review before it goes live. Fund data stays accurate and neutral for every fund on the list, sponsor or not.</p>
<h2>Partners across our network</h2><p>Issuers who have sponsored or partnered across the Dividend Empire network include REX Shares, VistaShares, VegaShares, IncomeShares, Liquid Strategies, Tuttle Capital and GraniteShares.</p>
<h2>Get in touch</h2><p><a class="mailbig" href="mailto:${EMAIL}?subject=${encodeURIComponent("PhotonicsETFs sponsorship")}" data-ga="advertise-email">${EMAIL}</a></p>`);
simple("disclaimer","Disclaimer","Important information about the data and content on PhotonicsETFs.com.","Disclaimer","",
`<p>${DISC}</p><p>PhotonicsETFs.com and Dividend Empire LLC are not registered investment advisors or broker-dealers. Inclusion of a fund on this site is not an endorsement or recommendation. Fund descriptions summarize public information from issuers and may not reflect the most recent holdings or strategy changes.</p><p>Some placements on this site are paid sponsorships from ETF issuers. Sponsored placements are labeled, and sponsors do not control fund data or editorial content.</p><p>Leveraged ETFs seek a multiple of daily returns and reset daily. They are not suitable for most long-term investors.</p>`);
simple("privacy-policy","Privacy Policy","How PhotonicsETFs.com handles visitor data.","Privacy policy",`Last updated ${fDateL(NOW.toISOString().slice(0,10))}`,
`<p>PhotonicsETFs.com is operated by Dividend Empire LLC. We do not ask you to create an account and we do not sell personal information.</p><h2>Analytics</h2><p>We may use Google Analytics to understand how visitors use the site. Google Analytics uses cookies to collect information such as pages visited, time on site and general location. You can opt out with the Google Analytics opt-out browser add-on.</p><h2>Third-party content</h2><p>Price charts are provided by TradingView and fonts by Google Fonts. These services may collect technical information such as your IP address under their own privacy policies.</p><h2>Contact</h2><p>Questions about this policy: <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>`);
simple("terms-of-use","Terms of Use","Terms for using PhotonicsETFs.com.","Terms of use","",
`<p>By using PhotonicsETFs.com you agree to these terms. The site and its content are provided "as is" for informational and educational purposes only, without warranties of any kind.</p><p>Nothing on this site is investment, financial, tax or legal advice. You are solely responsible for your investment decisions. Dividend Empire LLC is not liable for any losses arising from the use of this site or its data.</p><p>Content on this site is owned by Dividend Empire LLC. You may share links and short quotes with attribution. Do not copy or republish the site or its data without permission.</p><p>Contact: <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>`);
out["404.html"]=page({title:"Page not found | PhotonicsETFs",desc:"That page does not exist.",canonical:"/404"},`<div class="phead"><div class="wrap"><h1>That beam missed the target</h1><p class="lede">The page you are looking for moved or never existed.</p><p style="margin-top:20px"><a class="btn primary" href="/">See every photonics ETF</a></p></div></div>`);

/* ---------- sitemap, robots, misc ---------- */
const today=NOW.toISOString().slice(0,10);
const urls=["/","/compare/","/blog","/about","/advertise",...FUNDS.map(f=>`/etf/${f.slug}`),...PAIRS.map(([a,b])=>pairUrl(a,b)),...ARTICLES.map(a=>"/"+a.slug),"/disclaimer","/privacy-policy","/terms-of-use"];
out["sitemap.xml"]=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`;
out["robots.txt"]=`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
out["CNAME"]="photonicsetfs.com\n";
out[".nojekyll"]="";
out["favicon.svg"]=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#7B2FF7"/><stop offset=".35" stop-color="#2B6BFF"/><stop offset=".55" stop-color="#00D4E8"/><stop offset=".75" stop-color="#38E08A"/><stop offset="1" stop-color="#FF3B4E"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="#05070E"/><circle cx="16" cy="16" r="10" fill="url(#g)"/><circle cx="16" cy="16" r="5.5" fill="#05070E"/></svg>`;
for(const [f,c] of Object.entries(out)){const p=path.join(ROOT,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,c);}
console.log(`Built ${Object.keys(out).length} files: ${FUNDS.length} funds, ${PAIRS.length} comparisons, ${ARTICLES.length} guides.`);
