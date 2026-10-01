/* ===================== Data ===================== */
const CATEGORIES = {
  Food:          {icon:"🍴", color:"#f5a53a"},
  Travel:        {icon:"✈️", color:"#3b82f6"},
  Shopping:      {icon:"🛍️", color:"#8b5cf6"},
  Bills:         {icon:"🧾", color:"#22b08a"},
  Entertainment: {icon:"🎬", color:"#ec5b8c"},
  Other:         {icon:"📦", color:"#94a3b8"}
};
const DEFAULT_STATE = {
  name:"User",
  income:25000,
  expenses:[
    {date:"2025-09-27", category:"Food",     amount:500},
    {date:"2025-09-26", category:"Travel",   amount:1200},
    {date:"2025-09-25", category:"Shopping", amount:2000},
    {date:"2025-09-24", category:"Bills",    amount:1000},
    {date:"2025-09-20", category:"Food",     amount:4500},
    {date:"2025-09-18", category:"Travel",   amount:1300},
    {date:"2025-09-15", category:"Shopping", amount:1125},
    {date:"2025-09-10", category:"Bills",    amount:875}
  ]
};
const KEY = "pocketsmart-state";
let state = load();
let showAll = false;

function load(){
  try{ const s = JSON.parse(localStorage.getItem(KEY)); if(s && Array.isArray(s.expenses)) return s; }catch(e){}
  return structuredClone(DEFAULT_STATE);
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }

/* ===================== Helpers ===================== */
const $ = id => document.getElementById(id);
const fmt = n => "₹ " + Number(n).toLocaleString("en-IN", {maximumFractionDigits:2});
const total = () => state.expenses.reduce((s,e)=>s+e.amount,0);
function byCategory(){
  const t = {}; state.expenses.forEach(e => t[e.category] = (t[e.category]||0) + e.amount);
  return t;
}

/* ===================== Render ===================== */
function render(){
  document.querySelectorAll(".uname").forEach(n => n.textContent = state.name);
  const spent = total();
  $("incomeVal").textContent  = fmt(state.income);
  $("expenseVal").textContent = fmt(spent);
  $("balanceVal").textContent = fmt(state.income - spent);
  $("donutTotal").textContent = fmt(spent);
  renderDonut(spent); renderRecent(); renderTips();
}

function renderDonut(spent){
  const svg = $("donutSvg"), legend = $("legend");
  svg.innerHTML = ""; legend.innerHTML = "";
  const r = 77, c = 2*Math.PI*r, cx = 95;
  const cats = Object.entries(byCategory()).sort((a,b)=>b[1]-a[1]);
  const track = document.createElementNS("http://www.w3.org/2000/svg","circle");
  track.setAttribute("cx",cx); track.setAttribute("cy",cx); track.setAttribute("r",r);
  track.setAttribute("fill","none"); track.setAttribute("stroke","#eef2f5"); track.setAttribute("stroke-width",32);
  svg.appendChild(track);
  let offset = 0;
  cats.forEach(([name,val])=>{
    const share = val/spent, len = share*c;
    const arc = document.createElementNS("http://www.w3.org/2000/svg","circle");
    arc.setAttribute("cx",cx); arc.setAttribute("cy",cx); arc.setAttribute("r",r);
    arc.setAttribute("fill","none"); arc.setAttribute("stroke",CATEGORIES[name].color);
    arc.setAttribute("stroke-width",32);
    arc.setAttribute("stroke-dasharray",`${Math.max(len-2,0)} ${c}`);
    arc.setAttribute("stroke-dashoffset",-offset);
    svg.appendChild(arc); offset += len;
    const li = document.createElement("li");
    li.innerHTML = `<span class="dot" style="background:${CATEGORIES[name].color}"></span><span>${name}</span><span class="pct">${Math.round(share*100)}%</span>`;
    legend.appendChild(li);
  });
  if(!cats.length) legend.innerHTML = '<li class="empty">No expenses yet</li>';
}

function renderRecent(){
  const body = $("recentBody");
  const sorted = [...state.expenses].sort((a,b)=> b.date.localeCompare(a.date));
  const rows = showAll ? sorted : sorted.slice(0,4);
  $("viewAll").textContent = showAll ? "Show less" : "View All →";
  if(!rows.length){ body.innerHTML = '<tr><td colspan="3" class="empty">Add your first expense to see it here.</td></tr>'; return; }
  body.innerHTML = rows.map(e => {
    const c = CATEGORIES[e.category];
    return `<tr><td>${e.date}</td>
      <td><span class="cat"><i style="background:${c.color}22">${c.icon}</i>${e.category}</span></td>
      <td>${fmt(e.amount)}</td></tr>`;
  }).join("");
}

/* ===================== AI tips (local rules; swap for Gemini, see askGemini) ===================== */
function renderTips(){
  const spent = total(), cats = byCategory(), tips = [];
  const share = n => spent ? (cats[n]||0)/spent : 0;
  if(spent > state.income){
    tips.push({i:"⚠️", bg:"#fdeeee", t:"You've spent more than your income", d:"Pause non-essential purchases until next month's income arrives."});
  }
  if(share("Shopping") >= .2){
    tips.push({i:"🛍️", bg:"#efe8fd", t:"Your shopping expenses are a bit high this month.", d:"Consider setting a monthly limit and review non-essential purchases."});
  }
  if(share("Food") <= .45 && cats.Food){
    tips.push({i:"🍴", bg:"#fdf0dc", t:"Food expenses are within a good range.", d:"Keep it up! You're managing your food budget well."});
  } else if(share("Food") > .45){
    tips.push({i:"🍴", bg:"#fdf0dc", t:"Food is taking up a big share of your spending.", d:"Try planning meals and cooking at home a few more days a week."});
  }
  const flex = (cats.Shopping||0) + (cats.Entertainment||0);
  const lo = Math.round(flex*.10/100)*100, hi = Math.round(flex*.15/100)*100;
  if(flex > 0){
    tips.push({i:"💲", bg:"#dff3ec", t:"You can save more!",
      d:`Try to reduce 10–15% from your shopping and entertainment budget to save around ${fmt(lo)} – ${fmt(hi)}.`});
  }
  if(!tips.length) tips.push({i:"✨", bg:"#dff3ec", t:"Add a few expenses to get tips", d:"Recommendations appear once you have spending data."});
  $("tips").innerHTML = tips.slice(0,4).map(x =>
    `<li><div class="t-ico" style="background:${x.bg}">${x.i}</div><div><strong>${x.t}</strong><span>${x.d}</span></div></li>`).join("");
}

/* ===================== Ask Gemini =====================
   Offline answers below. To use the real Gemini API, call it from a backend
   (never put your API key in front-end code) and return the text here. */
async function askGemini(q){
  const spent = total(), cats = Object.entries(byCategory()).sort((a,b)=>b[1]-a[1]);
  if(q === "plan"){
    const i = state.income;
    return `Suggested monthly plan for ${fmt(i)}:\n• Needs (50%): ${fmt(i*.5)}\n• Wants (30%): ${fmt(i*.3)}\n• Savings (20%): ${fmt(i*.2)}`;
  }
  if(q === "most"){
    if(!cats.length) return "No expenses yet.";
    const [n,v] = cats[0];
    return `${n} is your biggest category: ${fmt(v)} (${Math.round(v/spent*100)}% of spending).`;
  }
  const left = state.income - spent;
  return `You have ${fmt(left)} left this month.\n• Set a monthly limit for shopping and entertainment.\n• Move ${fmt(Math.max(left,0)*.5)} to savings as soon as income arrives.\n• Review recurring bills for anything you can cut.`;
}
document.querySelectorAll(".chip").forEach(b => b.addEventListener("click", async () => {
  const box = $("answer"); box.style.display = "block"; box.textContent = "Thinking…";
  box.textContent = await askGemini(b.dataset.q);
}));

/* ===================== Events ===================== */
// categories dropdown
$("category").innerHTML = Object.entries(CATEGORIES).map(([n,c])=>`<option value="${n}">${c.icon}  ${n}</option>`).join("");

$("expenseForm").addEventListener("submit", e => {
  e.preventDefault();
  const msg = $("formMsg"), amt = parseFloat($("amount").value), date = $("date").value, inc = $("income").value;
  const fail = t => { msg.className = "msg err"; msg.textContent = t; };
  if(!(amt > 0)) return fail("Enter an expense amount greater than 0.");
  if(!date)      return fail("Choose the date of the expense.");
  if(inc !== ""){
    const v = parseFloat(inc);
    if(!(v >= 0)) return fail("Income must be 0 or more.");
    state.income = v;
  }
  state.expenses.push({date, category:$("category").value, amount:amt});
  save(); render();
  $("amount").value = ""; $("income").value = "";
  msg.className = "msg ok"; msg.textContent = "Expense saved.";
});

$("editIncome").addEventListener("click", () => {
  const v = prompt("Enter your monthly income (₹):", state.income);
  if(v === null) return;
  const n = parseFloat(v);
  if(n >= 0){ state.income = n; save(); render(); } else alert("Please enter a valid amount.");
});
document.querySelectorAll("[data-focus]").forEach(b => b.addEventListener("click", () => {
  $("addExpense").scrollIntoView({behavior:"smooth"}); $("amount").focus({preventScroll:true});
}));
$("viewAll").addEventListener("click", () => { showAll = !showAll; renderRecent(); });

// sidebar navigation
document.querySelectorAll(".nav button[data-target]").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".nav button").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  $(b.dataset.target).scrollIntoView({behavior:"smooth", block:"start"});
}));

// settings
const dlg = $("settings");
function openSettings(){ $("nameInput").value = state.name; dlg.showModal(); }
$("settingsNav").addEventListener("click", openSettings);
$("userBtn").addEventListener("click", openSettings);
$("saveSettings").addEventListener("click", () => {
  state.name = $("nameInput").value.trim() || "User"; save(); render(); dlg.close();
});
$("resetData").addEventListener("click", () => {
  if(confirm("Reset all data back to the sample data?")){ state = structuredClone(DEFAULT_STATE); save(); render(); dlg.close(); }
});
dlg.addEventListener("click", e => { if(e.target === dlg) dlg.close(); });

render();

