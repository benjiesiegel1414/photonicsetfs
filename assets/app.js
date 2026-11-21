/* PhotonicsETFs.com front end. Pages are pre-rendered by scripts/build.mjs;
   this file adds the live data refresh, sorting/search, the prism, the fiber field
   and the TradingView price widgets. */
(function(){
"use strict";
var D=document,FOCUS=window.PH_FOCUS||[],FBY={};FOCUS.forEach(function(f){FBY[f.id]=f;});
var reduced=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
function ga(n,p){if(typeof gtag==="function"){try{gtag("event",n,p||{});}catch(e){}}}

/* rail */
var rf=D.getElementById("railFill");
if(rf)addEventListener("scroll",function(){var h=D.documentElement.scrollHeight-innerHeight;rf.style.width=(h>0?scrollY/h*100:0)+"%";},{passive:true});
/* burger */
var bg=D.getElementById("burger"),nv=D.getElementById("nav");
if(bg&&nv){bg.addEventListener("click",function(){var hd=D.querySelector("header.site");if(hd)D.documentElement.style.setProperty("--hh",hd.getBoundingClientRect().bottom+"px");var o=nv.classList.toggle("open");D.body.style.overflow=o?"hidden":"";bg.setAttribute("aria-expanded",String(o));bg.textContent=o?"✕":"☰";});
  nv.addEventListener("click",function(e){if(e.target.closest("a")&&nv.classList.contains("open")){nv.classList.remove("open");D.body.style.overflow="";bg.setAttribute("aria-expanded","false");bg.textContent="☰";}});}
/* copy buttons */
D.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-copy]");if(!b)return;var v=b.getAttribute("data-copy"),done=function(){var t=b.textContent;b.textContent="Copied";setTimeout(function(){b.textContent=t;},1600);};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(v).then(done,function(){});else{var ta=D.createElement("textarea");ta.value=v;D.body.appendChild(ta);ta.select();try{D.execCommand("copy");done();}catch(x){}D.body.removeChild(ta);}});

/* ---------- site search (predictive) ---------- */
(function(){var q=D.getElementById("sq"),dd=D.getElementById("sdd");if(!q||!dd)return;
  var IDX=null,loading=null,sel=-1,items=[];
  function load(){if(IDX)return Promise.resolve(IDX);if(!loading)loading=fetch("/assets/search.json").then(function(r){return r.json();}).then(function(j){j.forEach(function(e){e._t=e.t.toLowerCase().replace(/\$/g,"");e._k=(e.t+" "+(e.s||"")+" "+(e.k||"")).toLowerCase();});IDX=j;return j;}).catch(function(){IDX=[];return IDX;});return loading;}
  function h(x){return String(x==null?"":x).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function hl(t,w){var out=h(t);w.forEach(function(x){if(x.length<2)return;var i=out.toLowerCase().indexOf(x);if(i>-1&&out.slice(0,i).lastIndexOf("<")<=out.slice(0,i).lastIndexOf(">"))out=out.slice(0,i)+"<mark>"+out.slice(i,i+x.length)+"</mark>"+out.slice(i+x.length);});return out;}
  var GW={ETF:40,Compare:8,Guide:14,Stock:12,Glossary:6,Page:4};
  function score(e,raw,w){var sc=0,t=e._t;if(t===raw)sc+=200;else if(t.indexOf(raw)===0)sc+=120;else if(t.indexOf(raw)>-1)sc+=60;
    for(var i=0;i<w.length;i++){var x=w[i],ti=t.indexOf(x);if(ti===0||(ti>0&&/[\s(]/.test(t[ti-1])))sc+=30;else if(ti>-1)sc+=14;else if(e._k.indexOf(" "+x)>-1||e._k.indexOf(x)===0)sc+=9;else if(e._k.indexOf(x)>-1)sc+=4;else return 0;}
    return sc?sc+(GW[e.g]||0):0;}
  function row(e,w){return '<a role="option" href="'+e.u+'"><span class="sk">'+e.g+'</span><span class="st"><b>'+hl(e.t,w)+'</b>'+(e.s?'<span>'+h(e.s)+'</span>':'')+'</span>'+(e.x?'<span class="sx">'+h(e.x)+'</span>':'')+'</a>';}
  function show(){var raw=q.value.trim().toLowerCase().replace(/\$/g,""),w=raw.split(/\s+/).filter(Boolean),html="";
    if(!IDX){dd.innerHTML='<div class="se">Loading...</div>';open();return;}
    if(!raw){html='<div class="sg">Photonics ETFs</div>'+IDX.filter(function(e){return e.g==="ETF";}).map(function(e){return row(e,[]);}).join("")+'<div class="sg">Popular</div>'+IDX.filter(function(e){return e.g==="Guide";}).slice(0,3).concat(IDX.filter(function(e){return e.g==="Page";}).slice(1,4)).map(function(e){return row(e,[]);}).join("");}
    else{var r=IDX.map(function(e){return [score(e,raw,w),e];}).filter(function(x){return x[0]>0;}).sort(function(a,b){return b[0]-a[0];});var cmpCap=/\bvs?\b/.test(raw)||w.length>1?8:2,cc=0;r=r.filter(function(x){if(x[1].g!=="Compare")return true;return ++cc<=cmpCap;}).slice(0,9);
      html=r.length?r.map(function(x){return row(x[1],w);}).join(""):'<div class="se">No matches for "'+h(q.value.trim())+'". Try a ticker like LYTE, a stock like Lumentum or a topic like fees.</div>';}
    dd.innerHTML=html;items=[].slice.call(dd.querySelectorAll("a"));sel=raw&&items.length?0:-1;mark();open();}
  function mark(){items.forEach(function(a,i){a.classList.toggle("on",i===sel);});if(sel>-1&&items[sel])items[sel].scrollIntoView({block:"nearest"});}
  function open(){dd.hidden=false;q.setAttribute("aria-expanded","true");}
  function close(){dd.hidden=true;q.setAttribute("aria-expanded","false");}
  function refresh(){load().then(function(){if(D.activeElement===q)show();});if(!IDX)show();}
  q.addEventListener("focus",refresh);q.addEventListener("input",refresh);
  q.addEventListener("keydown",function(e){if(e.key==="ArrowDown"){e.preventDefault();if(items.length){sel=(sel+1)%items.length;mark();}}
    else if(e.key==="ArrowUp"){e.preventDefault();if(items.length){sel=(sel-1+items.length)%items.length;mark();}}
    else if(e.key==="Enter"){e.preventDefault();var a=items[sel>-1?sel:0];if(a&&q.value.trim())go(a);}
    else if(e.key==="Escape"){close();q.blur();}});
  function go(a){ga("site_search_click",{search_term:q.value.trim().slice(0,60),result:a.getAttribute("href")});location.href=a.getAttribute("href");close();}
  dd.addEventListener("mousedown",function(e){e.preventDefault();});
  dd.addEventListener("click",function(e){var a=e.target.closest("a");if(a){e.preventDefault();go(a);}});
  q.form&&q.form.addEventListener("submit",function(e){e.preventDefault();});
  D.addEventListener("click",function(e){if(!e.target.closest(".hsearch"))close();});
  D.addEventListener("keydown",function(e){if(e.key==="/"&&!/input|textarea|select/i.test((D.activeElement||{}).tagName||"")){e.preventDefault();q.focus();}});
})();
/* reveal */
setTimeout(function(){D.querySelectorAll(".rv").forEach(function(el){el.classList.add("seen");});},2500);
if("IntersectionObserver" in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("seen");io.unobserve(e.target);}});},{threshold:.1,rootMargin:"0px 0px -40px 0px"});D.querySelectorAll(".rv").forEach(function(el){io.observe(el);});}
else D.querySelectorAll(".rv").forEach(function(el){el.classList.add("seen");});
/* outbound + sponsor tracking */
D.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("[data-ga]");if(a)ga("promo_click",{placement:a.getAttribute("data-ga"),site:"photonicsetfs"});});

/* prism fan */
(function(){var g=D.getElementById("fan"),gl=D.getElementById("fanLabels"),st=D.getElementById("stage");if(!g||!st)return;
  var NS="http://www.w3.org/2000/svg";
  FOCUS.forEach(function(f,i){var y2=118+232-i*28;
    var ln=D.createElementNS(NS,"line");ln.setAttribute("x1",230);ln.setAttribute("y1",118);ln.setAttribute("x2",452);ln.setAttribute("y2",y2);ln.setAttribute("stroke",f.c);ln.setAttribute("stroke-width","2.8");ln.setAttribute("class","band-line");ln.style.animationDelay=(.45+i*.07)+"s";g.appendChild(ln);
    var t=D.createElementNS(NS,"text");t.setAttribute("x",466);t.setAttribute("y",y2+5);t.setAttribute("fill",f.ci);t.setAttribute("font-family","'JetBrains Mono',monospace");t.setAttribute("font-size","15");t.style.animationDelay=(.85+i*.07)+"s";t.textContent=f.label;gl.appendChild(t);});
  setTimeout(function(){st.classList.add("lit");},reduced?0:200);})();

/* fiber field */
(function(){var cv=D.getElementById("fibers");if(reduced||!cv||!cv.getContext)return;var ctx=cv.getContext("2d");if(!ctx)return;
  var W,H,S=[],raf,run=true,C=FOCUS.map(function(f){return f.c;});
  function size(){var r=cv.parentElement.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;cv.width=W*d;cv.height=H*d;cv.style.width=W+"px";cv.style.height=H+"px";ctx.setTransform(d,0,0,d,0,0);S=[];
    var n=Math.max(4,Math.round(H/95));for(var i=0;i<n;i++){var p=[];for(var k=0;k<2+Math.floor(Math.random()*3);k++)p.push({x:Math.random()*W,v:.35+Math.random()*.75});S.push({y0:H/(n+1)*(i+1)+(Math.random()*30-15),amp:22+Math.random()*40,f:.0022+Math.random()*.0026,ph:Math.random()*6.28,c:C[i%C.length],p:p});}}
  function y(s,x){return s.y0+Math.sin(x*s.f+s.ph)*s.amp;}
  function draw(){ctx.clearRect(0,0,W,H);S.forEach(function(s){ctx.beginPath();for(var x=0;x<=W;x+=9){x?ctx.lineTo(x,y(s,x)):ctx.moveTo(x,y(s,x));}ctx.strokeStyle="rgba(124,138,174,.09)";ctx.lineWidth=1;ctx.stroke();
    s.p.forEach(function(p){p.x+=p.v;if(p.x>W+60)p.x=-60;ctx.beginPath();for(var t=0;t<34;t+=4){t?ctx.lineTo(p.x-t,y(s,p.x-t)):ctx.moveTo(p.x,y(s,p.x));}var gr=ctx.createLinearGradient(p.x-34,0,p.x,0);gr.addColorStop(0,"rgba(0,0,0,0)");gr.addColorStop(1,s.c);ctx.strokeStyle=gr;ctx.lineWidth=1.6;ctx.globalAlpha=.45;ctx.stroke();ctx.globalAlpha=1;
      ctx.beginPath();ctx.arc(p.x,y(s,p.x),1.9,0,6.28);ctx.fillStyle=s.c;ctx.shadowBlur=12;ctx.shadowColor=s.c;ctx.fill();ctx.shadowBlur=0;});});if(run)raf=requestAnimationFrame(draw);}
  size();draw();addEventListener("resize",function(){clearTimeout(cv._t);cv._t=setTimeout(size,180);});
  D.addEventListener("visibilitychange",function(){run=!D.hidden;if(run)draw();else cancelAnimationFrame(raf);});})();

/* TradingView live price */
(function(){var els=D.querySelectorAll("[data-tv]");if(!els.length)return;
  function tv(el){var s=D.createElement("script"),box=D.createElement("div"),w=D.createElement("div");box.className="tradingview-widget-container";w.className="tradingview-widget-container__widget";box.appendChild(w);
    s.async=true;s.src="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    s.text=JSON.stringify({symbol:el.getAttribute("data-tv"),width:"100%",height:210,locale:"en",dateRange:"ALL",colorTheme:"dark",isTransparent:true,autosize:true,trendLineColor:"rgba(0,212,232,1)",underLineColor:"rgba(0,212,232,0.14)",underLineBottomColor:"rgba(0,212,232,0)"});
    box.appendChild(s);el.innerHTML="";el.appendChild(box);}
  if("IntersectionObserver" in window){var o=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){o.unobserve(e.target);tv(e.target);}});},{rootMargin:"300px"});els.forEach(function(el){o.observe(el);});}else els.forEach(tv);})();

/* ---------- live data ---------- */
function splitCSV(line){var out=[],cur="",q=false;for(var i=0;i<line.length;i++){var ch=line[i];if(q){if(ch==='"'){if(line[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=ch;}else if(ch==='"')q=true;else if(ch===","){out.push(cur);cur="";}else cur+=ch;}out.push(cur);return out.map(function(v){return v.trim();});}
var AL={ticker:["symbol","ticker"],name:["name","etf name","fund name"],issuer:["issuer","etf provider","provider"],focus:["focus","category"],aum:["aum","assets"],exp:["expense","expense ratio","er"],inception:["inception","inception date","launch date"]};
function aum(v){var m=String(v||"").replace(/[$,\s]/g,"").match(/^(-?[\d.]+)([KMBT]?)$/i);if(!m)return null;return +m[1]*({K:1e3,M:1e6,B:1e9,T:1e12}[(m[2]||"M").toUpperCase()]);}
function pct(v){var n=parseFloat(String(v||"").replace(/[%\s]/g,""));return isNaN(n)?null:n;}
function dt(v){var m=String(v||"").trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);if(m){var y=+m[3];if(y<100)y+=2000;return y+"-"+("0"+m[1]).slice(-2)+"-"+("0"+m[2]).slice(-2);}m=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[0]:null;}
function parse(txt){var L=txt.replace(/^﻿/,"").trim().split(/\r?\n/),h=splitCSV(L.shift()).map(function(x){return x.toLowerCase();}),ix={};
  Object.keys(AL).forEach(function(k){ix[k]=-1;AL[k].some(function(a){var i=h.indexOf(a);if(i>-1){ix[k]=i;return true;}});});
  return L.map(function(l,i){var c=splitCSV(l),g=function(k){return ix[k]>-1?(c[ix[k]]||""):"";},t=g("ticker").replace(/\$/g,"").toUpperCase().trim(),f=g("focus").toLowerCase().trim();if(!t||!FBY[f])return null;
    return {ticker:t,name:g("name")||t,issuer:g("issuer"),focus:f,aum:aum(g("aum")),exp:pct(g("exp")),inception:dt(g("inception")),curated:i};}).filter(Boolean);}
var MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
var fmt={aum:function(v){return v==null?"—":v>=1e9?"$"+(v/1e9).toFixed(v>=1e10?1:2)+"B":v>=1e6?"$"+Math.round(v/1e6)+"M":"$"+Math.round(v/1e3)+"K";},exp:function(v){return v==null?"—":v.toFixed(2)+"%";},
  inception:function(s){if(!s)return "—";var p=s.split("-");return MON[+p[1]-1]+" "+(+p[2])+", "+p[0];}};
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}

var tbody=D.getElementById("tbody");
var FUNDS=(window.PH_FUNDS||[]).slice(),sortKey="curated",dir=1,focus="all";
function fill(){D.querySelectorAll("[data-live]").forEach(function(el){var p=el.getAttribute("data-live").split(":"),f=FUNDS.filter(function(x){return x.ticker===p[0];})[0];if(f&&f[p[1]]!=null&&fmt[p[1]])el.textContent=fmt[p[1]](f[p[1]]);});}
function render(){if(!tbody)return;var q=(D.getElementById("q")||{}).value||"";q=q.trim().toLowerCase();
  var rows=FUNDS.filter(function(f){if(focus!=="all"&&f.focus!==focus)return false;return !q||(f.ticker+" "+f.name+" "+f.issuer+" "+(FBY[f.focus]||{}).name).toLowerCase().indexOf(q)>-1;});
  rows.sort(function(a,b){var x=a[sortKey],y=b[sortKey];if(x==null&&y==null)return a.curated-b.curated;if(x==null)return 1;if(y==null)return -1;if(typeof x==="string")return x.localeCompare(y)*dir;return (x-y)*dir;});
  tbody.innerHTML=rows.length?rows.map(function(f){var fo=FBY[f.focus];return '<tr style="--c:'+fo.c+';--ci:'+fo.ci+'" data-t="'+f.ticker+'" tabindex="0"><td class="l"><a class="tk" href="/etf/'+f.ticker.toLowerCase()+'">$'+esc(f.ticker)+'</a></td><td class="l"><span class="nm">'+esc(f.name)+'</span></td><td class="l"><span class="prov">'+esc(f.issuer)+'</span></td><td class="l"><span class="fx">'+esc(fo.label)+'</span></td><td class="num">'+fmt.aum(f.aum)+'</td><td class="num">'+fmt.exp(f.exp)+'</td><td class="dt">'+fmt.inception(f.inception)+'</td></tr>';}).join(""):'<tr><td colspan="7"><div class="empty">Nothing matches that. Clear the search to see the full list.</div></td></tr>';
  var sh=D.getElementById("shown");if(sh)sh.textContent="SHOWING "+rows.length+" OF "+FUNDS.length+" ETFs";
  D.querySelectorAll(".ptable thead th").forEach(function(th){th.classList.toggle("on",th.getAttribute("data-s")===sortKey);});}
if(tbody){
  tbody.addEventListener("click",function(e){if(e.target.closest("a"))return;var tr=e.target.closest("tr[data-t]");if(tr){ga("etf_row_click",{ticker:tr.dataset.t});location.href="/etf/"+tr.dataset.t.toLowerCase();}});
  tbody.addEventListener("keydown",function(e){var tr=e.target.closest("tr[data-t]");if(e.key==="Enter"&&tr)location.href="/etf/"+tr.dataset.t.toLowerCase();});
  D.querySelectorAll(".ptable thead th").forEach(function(th){th.addEventListener("click",function(){var k=th.getAttribute("data-s");if(sortKey===k)dir*=-1;else{sortKey=k;dir=["ticker","name","issuer","focus"].indexOf(k)>-1?1:-1;}var ss=D.getElementById("sortSel");if(ss)ss.value=[].slice.call(ss.options).some(function(o){return o.value===k;})?k:"curated";render();});});
  var q=D.getElementById("q");if(q)q.addEventListener("input",render);
  var fs=D.getElementById("focusSel");if(fs)fs.addEventListener("change",function(){focus=fs.value;ga("focus_filter",{focus:focus});render();});
  var ss=D.getElementById("sortSel");if(ss)ss.addEventListener("change",function(){sortKey=ss.value;dir=(sortKey==="curated"||["ticker","issuer"].indexOf(sortKey)>-1)?1:-1;render();});
  var cl=D.getElementById("clear");if(cl)cl.addEventListener("click",function(){if(q)q.value="";focus="all";if(fs)fs.value="all";sortKey="curated";dir=1;if(ss)ss.value="curated";render();});
}
if(window.PH_SHEET&&window.fetch){var ctl=window.AbortController?new AbortController():null;if(ctl)setTimeout(function(){ctl.abort();},8000);
  fetch(window.PH_SHEET,ctl?{signal:ctl.signal}:{}).then(function(r){if(!r.ok)throw 0;return r.text();}).then(function(t){if(t.indexOf("<html")>-1)throw 0;var p=parse(t);if(!p.length)throw 0;
    var known={};FUNDS.forEach(function(f){known[f.ticker]=1;});FUNDS=p.filter(function(f){return known[f.ticker];}).concat(p.filter(function(f){return !known[f.ticker];}));
    render();fill();var st=D.getElementById("feedState");if(st)st.textContent="LIVE DATA · NOT INVESTMENT ADVICE";}).catch(function(){});}
})();
