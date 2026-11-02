/* PlantReady resume export: builds a PDF and a Word (.docx) file in the browser. No outside libraries. */
(function(){
const W={R:[278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 761, 556, 556, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 556, 611, 556, 556, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 556, 500, 667, 278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500],B:[278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 761, 556, 611, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 611, 611, 611, 611, 278, 278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 611, 500, 667, 278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611, 722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278, 611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556]};
// ---------- shared ----------
const list=a=>Array.isArray(a)?a.filter(x=>x!=null&&String(x).trim()):[];
const s=v=>String(v??"").trim();
function sections(r){
  const out=[];
  const avail=[r.available&&("Available: "+s(r.available)),r.travel&&("Travel: "+s(r.travel)),r.schedule&&("Schedule: "+s(r.schedule))].filter(Boolean).join("   ·   ");
  if(s(r.summary)) out.push({h:"Summary",p:[s(r.summary)]});
  const ta=list(r.turnarounds).filter(t=>s(t.site)||s(t.role));
  if(ta.length) out.push({h:"Turnaround history",jobs:ta.map(t=>({left:[s(t.role),s(t.site)].filter(Boolean).join(" · "),right:s(t.dates),bullets:s(t.scope)?[s(t.scope)]:[]}))});
  const ex=list(r.experience).filter(j=>s(j.title)||s(j.company));
  if(ex.length) out.push({h:"Experience",jobs:ex.map(j=>({left:[s(j.title),s(j.company)].filter(Boolean).join(" · "),right:s(j.dates),bullets:list(j.bullets).map(s)}))});
  if(list(r.skills).length) out.push({h:"Skills",p:[list(r.skills).map(s).join("  ·  ")]});
  if(list(r.certifications).length) out.push({h:"Certifications & tickets",p:[list(r.certifications).map(s).join("  ·  ")]});
  if(list(r.education).length) out.push({h:"Education",p:list(r.education).map(s)});
  return {name:s(r.name)||"Your Name",headline:s(r.headline),contact:s(r.contact),avail,sections:out};
}

// ---------- PDF ----------
const UNI={8226:149,8211:150,8212:151,8217:146,8216:145,8220:147,8221:148,8230:133,8364:128,8482:153};
function enc(str){let o="";for(const ch of str){let c=ch.codePointAt(0);if(UNI[c])c=UNI[c];else if(c>255||(c>126&&c<160))c=63;if(c<32)c=32;o+=String.fromCharCode(c)}return o}
function width(str,font,size,tc=0){let t=0;for(const ch of str){const c=ch.charCodeAt(0);t+=(W[font][c-32]??556)}return t*size/1000+tc*str.length}
function wrap(str,font,size,maxW){
  const words=enc(str).split(/\s+/);const lines=[];let cur="";
  for(const w of words){const t=cur?cur+" "+w:w;if(width(t,font,size)<=maxW||!cur)cur=t;else{lines.push(cur);cur=w}}
  if(cur)lines.push(cur);return lines;
}
const esc=t=>t.replace(/[\\()]/g,m=>"\\"+m);
function pdf(r){
  const d=sections(r);
  const PW=612,PH=792,M=54,CW=PW-2*M;
  const pages=[];let ops=[];let y=PH-M;
  const ACC="0.706 0.29 0.02",INK="0.11 0.137 0.149",MUT="0.40 0.44 0.43";
  const newPage=()=>{pages.push(ops);ops=[];y=PH-M};
  const need=h=>{if(y-h<M)newPage()};
  const text=(t,x,font,size,color=INK,tc=0)=>ops.push(`BT /${font} ${size} Tf ${color} rg ${tc} Tc ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc(t)}) Tj ET`);
  const para=(str,font,size,lead,x=M,maxW=CW,color=INK)=>{for(const ln of wrap(str,font,size,maxW)){need(lead);y-=lead;text(ln,x,font,size,color)}};
  // header
  para(d.name,"B",22,24);
  if(d.headline){y-=2;para(d.headline,"B",12,16,M,CW,ACC)}
  if(d.contact) para(d.contact,"R",10,14,M,CW,MUT);
  if(d.avail) para(d.avail,"R",10,14,M,CW,MUT);
  y-=6;ops.push(`${ACC} RG 1.5 w ${M} ${y} m ${PW-M} ${y} l S`);y-=4;
  for(const sec of d.sections){
    need(40);y-=18;const h=enc(sec.h.toUpperCase());text(h,M,"B",9.5,MUT,1);
    y-=5;ops.push(`0.8 0.82 0.81 RG 0.6 w ${M} ${y} m ${PW-M} ${y} l S`);y-=2;
    for(const p of sec.p||[]){para(p,"R",10.5,14.5);y-=2}
    for(const j of sec.jobs||[]){
      need(34);y-=4;
      const right=enc(j.right),rw=width(right,"R",10);
      const leftLines=wrap(j.left,"B",10.5,CW-rw-12);
      leftLines.forEach((ln,i)=>{y-=14.5;text(ln,M,"B",10.5);if(i===0&&right)text(right,PW-M-rw,"R",10,MUT)});
      for(const b of j.bullets){
        const lines=wrap(b,"R",10.5,CW-14);
        lines.forEach((ln,i)=>{need(14.5);y-=14.5;if(i===0)text(enc("•"),M+2,"R",10.5,ACC);text(ln,M+14,"R",10.5)});
      }
      y-=3;
    }
  }
  pages.push(ops);
  // assemble
  const objs=[];const add=o=>{objs.push(o);return objs.length};
  const catalog=add(null),pagesId=add(null);
  const fR=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const fB=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const kids=[];
  for(const p of pages){
    const stream=p.join("\n");
    const c=add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /R ${fR} 0 R /B ${fB} 0 R >> >> /Contents ${c} 0 R >>`));
  }
  objs[catalog-1]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId-1]=`<< /Type /Pages /Kids [${kids.map(k=>k+" 0 R").join(" ")}] /Count ${kids.length} >>`;
  const info=add(`<< /Title (${esc(enc(d.name+" Resume"))}) /Producer (PlantReady) >>`);
  let out="%PDF-1.4\n";const offs=[];
  objs.forEach((o,i)=>{offs.push(out.length);out+=`${i+1} 0 obj\n${o}\nendobj\n`});
  const xref=out.length;
  out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+offs.map(o=>String(o).padStart(10,"0")+" 00000 n \n").join("");
  out+=`trailer\n<< /Size ${objs.length+1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes=new Uint8Array(out.length);for(let i=0;i<out.length;i++)bytes[i]=out.charCodeAt(i)&255;
  return new Blob([bytes],{type:"application/pdf"});
}

// ---------- DOCX ----------
const x=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const run=(t,o={})=>`<w:r><w:rPr>${o.b?"<w:b/>":""}${o.color?`<w:color w:val="${o.color}"/>`:""}${o.sz?`<w:sz w:val="${o.sz}"/>`:""}${o.caps?"<w:caps/><w:spacing w:val=\"20\"/>":""}</w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r>`;
function para(runs,o={}){
  const ppr=[o.after!=null?`<w:spacing w:before="${o.before||0}" w:after="${o.after}"/>`:"",o.ind?`<w:ind w:left="${o.ind}" w:hanging="${o.hang||0}"/>`:"",o.tab?`<w:tabs><w:tab w:val="right" w:pos="${o.tab}"/></w:tabs>`:"",o.border?`<w:pBdr><w:bottom w:val="single" w:sz="${o.border.sz}" w:space="2" w:color="${o.border.color}"/></w:pBdr>`:""].join("");
  return `<w:p><w:pPr>${ppr}</w:pPr>${runs}</w:p>`;
}
function docxXml(r){
  const d=sections(r);const ACC="B44A05",MUT="66706E";const TAB=10080;
  let b="";
  b+=para(run(d.name,{b:1,sz:44}),{after:40});
  if(d.headline)b+=para(run(d.headline,{b:1,color:ACC,sz:24}),{after:40});
  if(d.contact)b+=para(run(d.contact,{color:MUT,sz:20}),{after:20});
  if(d.avail)b+=para(run(d.avail,{color:MUT,sz:20}),{after:20});
  b+=para("",{after:80,border:{sz:12,color:ACC}});
  for(const sec of d.sections){
    b+=para(run(sec.h,{b:1,color:MUT,sz:19,caps:1}),{before:240,after:80,border:{sz:4,color:"D4D9D6"}});
    for(const p of sec.p||[])b+=para(run(p,{sz:21}),{after:60});
    for(const j of sec.jobs||[]){
      b+=para(run(j.left,{b:1,sz:21})+(j.right?`<w:r><w:tab/></w:r>`+run(j.right,{color:MUT,sz:20}):""),{before:100,after:40,tab:TAB});
      for(const t of j.bullets)b+=para(run("•\t",{color:ACC,sz:21})+run(t,{sz:21}),{after:30,ind:360,hang:360});
    }
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${b}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}
const STYLES=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:color w:val="1C2326"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
const CT=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
const RELS=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
const DRELS=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
// minimal ZIP (stored, no compression)
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=u=>{let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRC[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0};
function zip(files){
  const te=new TextEncoder();const parts=[];const central=[];let off=0;
  const u16=n=>[n&255,(n>>8)&255],u32=n=>[n&255,(n>>8)&255,(n>>16)&255,(n>>>24)&255];
  for(const [name,content] of files){
    const nb=te.encode(name),data=te.encode(content),crc=crc32(data);
    const head=[0x50,0x4b,3,4,...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0)];
    parts.push(new Uint8Array(head),nb,data);
    central.push(new Uint8Array([0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nb);
    off+=head.length+nb.length+data.length;
  }
  const cSize=central.reduce((a,p)=>a+p.length,0);
  const end=new Uint8Array([0x50,0x4b,5,6,...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(cSize),...u32(off),...u16(0)]);
  return new Blob([...parts,...central,end],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
function docx(r){return zip([["[Content_Types].xml",CT],["_rels/.rels",RELS],["word/document.xml",docxXml(r)],["word/_rels/document.xml.rels",DRELS],["word/styles.xml",STYLES]])}
const fileBase=r=>(s(r.name)||"Resume").replace(/^example:\s*/i,"").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_|_$/g,"")+"_Resume";
(typeof window!=="undefined"?window:globalThis).PR_EXPORT={pdf,docx,fileBase};
})();
