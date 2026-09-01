import "./style.css";
import { jsPDF } from "jspdf";

const STORAGE_KEY = "iqg_documents_v1";
const SETTINGS_KEY = "iqg_settings_v1";

const defaultDoc = () => ({
  type: "invoice",
  number: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  currency: "USD",
  business: { name: "", email: "", phone: "", address: "" },
  customer: { name: "", email: "", phone: "", address: "" },
  items: [{ description: "", quantity: 1, price: 0 }],
  tax: 0,
  discount: 0,
  notes: "",
  terms: "Payment is due by the due date shown above.",
  accent: "#2563eb"
});

let doc = loadDraft();
let saved = loadSaved();
let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
if (settings.business) doc.business = { ...doc.business, ...settings.business };

const root = document.querySelector("#root");

function esc(v="") {
  return String(v).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}
function money(n) {
  const code = doc.currency || "USD";
  try { return new Intl.NumberFormat(undefined, { style:"currency", currency:code }).format(Number(n)||0); }
  catch { return `${code} ${(Number(n)||0).toFixed(2)}`; }
}
function totals() {
  const subtotal = doc.items.reduce((s, i) => s + (Number(i.quantity)||0) * (Number(i.price)||0), 0);
  const discount = Math.min(subtotal, Number(doc.discount)||0);
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * ((Number(doc.tax)||0)/100);
  return { subtotal, discount, tax, total: taxable + tax };
}
function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function loadDraft() {
  try { return JSON.parse(localStorage.getItem("iqg_draft_v1")) || defaultDoc(); } catch { return defaultDoc(); }
}
function saveDraft() {
  localStorage.setItem("iqg_draft_v1", JSON.stringify(doc));
}
function field(label, key, value, type="text", placeholder="") {
  return `<label class="field"><span>${label}</span><input data-key="${key}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}"></label>`;
}
function render() {
  const t = totals();
  root.innerHTML = `
    <div class="app">
      <header class="topbar">
        <div class="brand"><div class="brandmark">✓</div><div><strong>InvoiceFlow</strong><small>Invoices & quotes made simple</small></div></div>
        <div class="top-actions">
          <button class="ghost" id="newDoc">New</button>
          <button class="ghost" id="saveDoc">Save</button>
          <button class="primary" id="download">Download PDF</button>
        </div>
      </header>

      <main class="layout">
        <section class="editor">
          <div class="page-title"><div><h1>${doc.type === "invoice" ? "Create invoice" : "Create quote"}</h1><p>Fill in the details and your document updates instantly.</p></div>
            <div class="segmented">
              <button class="${doc.type==="invoice"?"active":""}" data-type="invoice">Invoice</button>
              <button class="${doc.type==="quote"?"active":""}" data-type="quote">Quote</button>
            </div>
          </div>

          <div class="card">
            <h2>Document details</h2>
            <div class="grid three">
              ${field(doc.type==="invoice"?"Invoice #":"Quote #","number",doc.number)}
              ${field("Issue date","issueDate",doc.issueDate,"date")}
              ${field(doc.type==="invoice"?"Due date":"Valid until","dueDate",doc.dueDate,"date")}
            </div>
            <div class="grid two">
              <label class="field"><span>Currency</span><select data-key="currency">${["USD","CAD","EUR","GBP","AUD"].map(x=>`<option ${doc.currency===x?"selected":""}>${x}</option>`).join("")}</select></label>
              <label class="field"><span>Accent color</span><input data-key="accent" type="color" value="${esc(doc.accent)}"></label>
            </div>
          </div>

          <div class="card">
            <h2>From</h2>
            <div class="grid two">
              ${field("Business name","business.name",doc.business.name,"text","Your business")}
              ${field("Email","business.email",doc.business.email,"email","you@example.com")}
              ${field("Phone","business.phone",doc.business.phone,"text","(555) 555-5555")}
              ${field("Address","business.address",doc.business.address,"text","123 Main St, City, State")}
            </div>
          </div>

          <div class="card">
            <h2>Bill to</h2>
            <div class="grid two">
              ${field("Customer name","customer.name",doc.customer.name,"text","Customer or company")}
              ${field("Email","customer.email",doc.customer.email,"email","customer@example.com")}
              ${field("Phone","customer.phone",doc.customer.phone,"text","")}
              ${field("Address","customer.address",doc.customer.address,"text","Customer address")}
            </div>
          </div>

          <div class="card">
            <div class="card-head"><h2>Items</h2><button class="small-btn" id="addItem">+ Add item</button></div>
            <div class="items-head"><span>Description</span><span>Qty</span><span>Price</span><span></span></div>
            ${doc.items.map((it,i)=>`
              <div class="item-row">
                <input data-item="${i}" data-prop="description" value="${esc(it.description)}" placeholder="Service or product">
                <input data-item="${i}" data-prop="quantity" type="number" min="0" step="1" value="${it.quantity}">
                <input data-item="${i}" data-prop="price" type="number" min="0" step="0.01" value="${it.price}">
                <button class="delete" data-remove="${i}" aria-label="Remove item">×</button>
              </div>`).join("")}
            <div class="totals-editor">
              <div><span>Subtotal</span><strong>${money(t.subtotal)}</strong></div>
              <div><label>Discount <input data-key="discount" type="number" min="0" step="0.01" value="${doc.discount}"></label><strong>−${money(t.discount)}</strong></div>
              <div><label>Tax <input data-key="tax" type="number" min="0" step="0.01" value="${doc.tax}"> %</label><strong>${money(t.tax)}</strong></div>
              <div class="grand"><span>Total</span><strong>${money(t.total)}</strong></div>
            </div>
          </div>

          <div class="card">
            <h2>Notes & payment terms</h2>
            <label class="field"><span>Notes</span><textarea data-key="notes" rows="3" placeholder="Thank you for your business!">${esc(doc.notes)}</textarea></label>
            <label class="field"><span>Payment terms</span><textarea data-key="terms" rows="3">${esc(doc.terms)}</textarea></label>
          </div>

          <div class="card saved-card">
            <div class="card-head"><h2>Saved documents</h2><span class="muted">${saved.length} saved</span></div>
            ${saved.length ? saved.slice().reverse().map((s,idx)=>`
              <div class="saved-row">
                <div><strong>${esc(s.number)}</strong><span>${esc(s.type)} · ${esc(s.customer?.name || "No customer")} · ${moneyFor(s.total,s.currency)}</span></div>
                <div><button class="small-btn" data-load="${saved.length-1-idx}">Open</button><button class="delete" data-delete="${saved.length-1-idx}">×</button></div>
              </div>`).join("") : `<p class="muted">Saved documents stay on this device. Nothing is uploaded.</p>`}
          </div>
        </section>

        <aside class="preview-wrap">
          <div class="preview-tools"><span>Live preview</span><button class="ghost" id="print">Print</button></div>
          <div id="invoicePreview" class="paper" style="--accent:${esc(doc.accent)}">
            <div class="paper-top">
              <div><div class="logo-box">${doc.business.name ? esc(doc.business.name.slice(0,1).toUpperCase()) : "I"}</div><h3>${esc(doc.business.name || "Your Business")}</h3><p>${esc(doc.business.email)}${doc.business.email && doc.business.phone ? " · " : ""}${esc(doc.business.phone)}</p><p>${esc(doc.business.address)}</p></div>
              <div class="doc-label"><div>${doc.type==="invoice"?"INVOICE":"QUOTE"}</div><strong>${esc(doc.number)}</strong><span>Issued ${esc(formatDate(doc.issueDate))}</span><span>${doc.type==="invoice"?"Due":"Valid until"} ${esc(formatDate(doc.dueDate))}</span></div>
            </div>
            <div class="bill">
              <div><small>${doc.type==="invoice"?"BILL TO":"PREPARED FOR"}</small><strong>${esc(doc.customer.name || "Customer name")}</strong><span>${esc(doc.customer.email)}</span><span>${esc(doc.customer.phone)}</span><span>${esc(doc.customer.address)}</span></div>
            </div>
            <table><thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>
              ${doc.items.map(i=>`<tr><td>${esc(i.description || "Item or service")}</td><td>${i.quantity}</td><td>${money(i.price)}</td><td>${money((Number(i.quantity)||0)*(Number(i.price)||0))}</td></tr>`).join("")}
            </tbody></table>
            <div class="paper-bottom">
              <div class="notes"><strong>Notes</strong><p>${esc(doc.notes || "Thank you for your business!")}</p><strong>Terms</strong><p>${esc(doc.terms)}</p></div>
              <div class="summary"><div><span>Subtotal</span><b>${money(t.subtotal)}</b></div>${t.discount?`<div><span>Discount</span><b>−${money(t.discount)}</b></div>`:""}<div><span>Tax</span><b>${money(t.tax)}</b></div><div class="total"><span>Total</span><b>${money(t.total)}</b></div></div>
            </div>
            <div class="paper-footer">Generated with InvoiceFlow</div>
          </div>
        </aside>
      </main>
    </div>`;
  bind();
}
function moneyFor(n,c="USD") {
  try { return new Intl.NumberFormat(undefined,{style:"currency",currency:c}).format(n||0); } catch { return `${c} ${(n||0).toFixed(2)}`; }
}
function formatDate(d) {
  if (!d) return "";
  const x = new Date(d+"T00:00:00");
  return isNaN(x) ? d : x.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
}
function setNested(path,value) {
  const parts=path.split(".");
  if(parts.length===1) doc[path]=value;
  else doc[parts[0]][parts[1]]=value;
  saveDraft();
}
function bind() {
  document.querySelectorAll("[data-key]").forEach(el => el.addEventListener("input", e => {
    let v=e.target.value;
    if (["tax","discount"].includes(e.target.dataset.key)) v=Number(v)||0;
    if(e.target.type==="color") v=e.target.value;
    setNested(e.target.dataset.key,v);
    render();
  }));
  document.querySelectorAll("[data-item]").forEach(el=>el.addEventListener("input",e=>{
    const i=Number(e.target.dataset.item), p=e.target.dataset.prop;
    doc.items[i][p]=["quantity","price"].includes(p)?Number(e.target.value)||0:e.target.value;
    saveDraft(); render();
  }));
  document.querySelectorAll("[data-type]").forEach(b=>b.onclick=()=>{doc.type=b.dataset.type; doc.number=(doc.type==="invoice"?"INV-":"QUO-")+new Date().getFullYear()+"-"+String(Date.now()).slice(-5); saveDraft(); render();});
  document.getElementById("addItem").onclick=()=>{doc.items.push({description:"",quantity:1,price:0});saveDraft();render();};
  document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{if(doc.items.length>1)doc.items.splice(Number(b.dataset.remove),1);saveDraft();render();});
  document.getElementById("newDoc").onclick=()=>{if(confirm("Start a new document? Unsaved changes will be replaced.")){doc=defaultDoc(); if(settings.business)doc.business={...doc.business,...settings.business}; saveDraft();render();}};
  document.getElementById("saveDoc").onclick=()=>{const t=totals(); const copy=JSON.parse(JSON.stringify({...doc,total:t.total})); const idx=saved.findIndex(x=>x.number===copy.number); if(idx>=0)saved[idx]=copy;else saved.push(copy);localStorage.setItem(STORAGE_KEY,JSON.stringify(saved)); alert("Document saved on this device."); render();};
  document.querySelectorAll("[data-load]").forEach(b=>b.onclick=()=>{doc=JSON.parse(JSON.stringify(saved[Number(b.dataset.load)]));saveDraft();render();});
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{if(confirm("Delete this saved document?")){saved.splice(Number(b.dataset.delete),1);localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));render();}});
  document.getElementById("download").onclick=downloadPDF;
  document.getElementById("print").onclick=()=>window.print();
}
function downloadPDF() {
  const t=totals(), pdf=new jsPDF({unit:"pt",format:"letter"});
  const margin=42, width=528;
  const accent=doc.accent || "#2563eb";
  pdf.setTextColor(25,32,44); pdf.setFont("helvetica","bold"); pdf.setFontSize(25);
  pdf.text(doc.type==="invoice"?"INVOICE":"QUOTE", margin, 58);
  pdf.setFontSize(10); pdf.setFont("helvetica","normal"); pdf.setTextColor(90,99,112);
  pdf.text(doc.number, margin, 77);
  pdf.text(`Issued: ${formatDate(doc.issueDate)}`, width+margin, 58, {align:"right"});
  pdf.text(`${doc.type==="invoice"?"Due":"Valid until"}: ${formatDate(doc.dueDate)}`, width+margin, 73, {align:"right"});
  pdf.setFillColor(accent); pdf.roundedRect(margin,92,42,42,8,8,"F");
  pdf.setTextColor(255,255,255); pdf.setFont("helvetica","bold"); pdf.setFontSize(18); pdf.text((doc.business.name||"I").slice(0,1).toUpperCase(),margin+21,120,{align:"center"});
  pdf.setTextColor(25,32,44); pdf.setFontSize(13); pdf.text(doc.business.name||"Your Business",92,106);
  pdf.setFont("helvetica","normal");pdf.setFontSize(9);pdf.setTextColor(90,99,112);
  pdf.text(doc.business.email||"",92,120); pdf.text(doc.business.phone||"",92,133);
  pdf.setFont("helvetica","bold");pdf.setTextColor(25,32,44);pdf.setFontSize(9);pdf.text("BILL TO",margin,166);
  pdf.setFontSize(12);pdf.text(doc.customer.name||"Customer",margin,184);
  pdf.setFont("helvetica","normal");pdf.setFontSize(9);pdf.setTextColor(90,99,112);
  [doc.customer.email,doc.customer.phone,doc.customer.address].filter(Boolean).forEach((x,i)=>pdf.text(x,margin,199+i*13));
  let y=255;
  pdf.setFillColor(245,247,250);pdf.roundedRect(margin,y,width,26,4,4,"F");
  pdf.setTextColor(70,78,90);pdf.setFont("helvetica","bold");pdf.text("DESCRIPTION",margin+10,y+17);pdf.text("QTY",365,y+17);pdf.text("PRICE",410,y+17);pdf.text("TOTAL",500,y+17,{align:"right"});
  y+=26;pdf.setFont("helvetica","normal");
  doc.items.forEach(i=>{pdf.setTextColor(35,42,53);pdf.text(i.description||"Item or service",margin+10,y+20);pdf.text(String(i.quantity),365,y+20);pdf.text(money(i.price),410,y+20);pdf.text(money((i.quantity||0)*(i.price||0)),500,y+20,{align:"right"});pdf.setDrawColor(230,233,238);pdf.line(margin,y+30,margin+width,y+30);y+=38;});
  y+=15; const sx=350;
  pdf.setTextColor(90,99,112);pdf.text("Subtotal",sx,y);pdf.setTextColor(30,36,47);pdf.text(money(t.subtotal),500,y,{align:"right"});y+=18;
  if(t.discount){pdf.setTextColor(90,99,112);pdf.text("Discount",sx,y);pdf.text("−"+money(t.discount),500,y,{align:"right"});y+=18;}
  pdf.text("Tax",sx,y);pdf.text(money(t.tax),500,y,{align:"right"});y+=25;
  pdf.setFillColor(accent);pdf.roundedRect(sx-10,y-17,160,38,6,6,"F");pdf.setTextColor(255,255,255);pdf.setFont("helvetica","bold");pdf.text("TOTAL",sx,y+7);pdf.text(money(t.total),500,y+7,{align:"right"});
  y+=65;pdf.setTextColor(35,42,53);pdf.setFontSize(10);pdf.text("Notes",margin,y);pdf.setFont("helvetica","normal");pdf.setTextColor(90,99,112);pdf.setFontSize(9);
  const wrap=(text,w)=>pdf.splitTextToSize(text||"",w);
  let lines=wrap(doc.notes||"Thank you for your business!",300);pdf.text(lines,margin,y+16);
  y+=18+lines.length*12;pdf.setTextColor(35,42,53);pdf.setFont("helvetica","bold");pdf.text("Terms",margin,y);pdf.setFont("helvetica","normal");pdf.setTextColor(90,99,112);pdf.text(wrap(doc.terms||"",300),margin,y+16);
  pdf.setFontSize(8);pdf.setTextColor(150,156,166);pdf.text("Generated with InvoiceFlow",margin,750);
  pdf.save(`${doc.number || "document"}.pdf`);
}
render();