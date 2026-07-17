<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HayGroup - Sistem Kasir & Keuangan</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<script>
tailwind.config={theme:{extend:{fontFamily:{sans:['Plus Jakarta Sans','sans-serif']},colors:{
dk:{950:'#060911',900:'#090C15',800:'#0F1220',700:'#141827',600:'#1A1F35',500:'#1E2440',400:'#2A3150'},
gd:{600:'#D97706',500:'#F59E0B',400:'#FBBF24',300:'#FDE68A'},
bike:'#10B981',pop:'#F97316',motret:'#EC4899'
}}}}
</script>
<style>
*{scrollbar-width:thin;scrollbar-color:#2A3150 transparent}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#2A3150;border-radius:3px}
body{font-family:'Plus Jakarta Sans',sans-serif;background:#090C15;color:#E2E8F0;overflow:hidden}
.sidebar-item{transition:all .2s}.sidebar-item:hover{background:rgba(245,158,11,.08)}
.sidebar-item.active{background:rgba(245,158,11,.12);border-right:3px solid #F59E0B;color:#FBBF24}
.card{background:#141827;border:1px solid #1E2440;border-radius:12px;transition:all .25s}
.card:hover{border-color:#2A3150;transform:translateY(-1px)}
.btn-primary{background:linear-gradient(135deg,#D97706,#F59E0B);color:#000;font-weight:700;border-radius:8px;transition:all .2s}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(245,158,11,.3)}
.btn-secondary{background:#1E2440;color:#E2E8F0;border:1px solid #2A3150;border-radius:8px;transition:all .2s}
.btn-secondary:hover{background:#2A3150;border-color:#3B4570}
.input-field{background:#0F1220;border:1px solid #1E2440;border-radius:8px;color:#E2E8F0;padding:8px 12px;transition:border .2s}
.input-field:focus{outline:none;border-color:#F59E0B}
.tab-btn{padding:8px 16px;border-radius:8px;cursor:pointer;transition:all .2s;font-weight:600;font-size:13px}
.tab-btn.active{background:rgba(245,158,11,.15);color:#FBBF24}
.tab-btn:not(.active){color:#64748B}.tab-btn:not(.active):hover{color:#94A3B8;background:rgba(255,255,255,.03)}
.product-card{cursor:pointer;transition:all .2s}.product-card:hover{transform:translateY(-2px);border-color:#F59E0B}
.product-card:active{transform:scale(.97)}
.badge{display:inline-flex;align-items:center;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700}
.toast{animation:slideIn .3s ease,fadeOut .3s ease 2.7s}
@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes fadeOut{to{opacity:0;transform:translateX(50%)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.fade-in{animation:fadeIn .35s ease}
.modal-overlay{background:rgba(0,0,0,.6);backdrop-filter:blur(4px)}
table{border-collapse:collapse}th{font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#64748B}
td,th{padding:10px 14px;text-align:left;border-bottom:1px solid #1E2440}
tr:hover td{background:rgba(255,255,255,.02)}
.glow-bike{box-shadow:0 0 30px rgba(16,185,129,.1)}.glow-pop{box-shadow:0 0 30px rgba(249,115,22,.1)}.glow-motret{box-shadow:0 0 30px rgba(236,72,153,.1)}
@media(max-width:768px){#sidebar{position:fixed;z-index:50;transform:translateX(-100%);transition:transform .3s}
#sidebar.open{transform:translateX(0)}#main{margin-left:0!important}}
</style>
</head>
<body>
<div id="app" class="flex h-screen">
<aside id="sidebar" class="w-60 h-screen bg-dk-800 border-r border-dk-500 flex flex-col flex-shrink-0 overflow-y-auto">
<div class="p-5 border-b border-dk-500">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-gd-600 to-gd-400 flex items-center justify-center">
<i class="fas fa-layer-group text-black text-lg"></i>
</div>
<div><div class="font-black text-lg text-gd-400 tracking-tight">HayGroup</div><div class="text-[10px] text-gray-500 font-semibold tracking-widest uppercase">Finance System</div></div>
</div>
</div>
<nav id="sidebar-nav" class="flex-1 py-3"></nav>
<div class="p-4 border-t border-dk-500">
<div class="text-[10px] text-gray-600 uppercase tracking-widest mb-2 font-bold">Cabang Aktif</div>
<select id="branch-selector" onchange="setBranch(this.value)" class="input-field w-full text-sm">
<option value="all">Semua Cabang</option>
<option value="haybike">HayBike</option>
<option value="haypop">HayPop</option>
<option value="haymotret">HayMotret</option>
</select>
</div>
</aside>
<main id="main" class="flex-1 flex flex-col overflow-hidden" style="margin-left:0">
<header id="topbar" class="h-14 bg-dk-800/80 backdrop-blur border-b border-dk-500 flex items-center px-6 justify-between flex-shrink-0">
<div class="flex items-center gap-3">
<button onclick="document.getElementById('sidebar').classList.toggle('open')" class="md:hidden text-gray-400"><i class="fas fa-bars"></i></button>
<h2 id="page-title" class="font-bold text-base"></h2>
</div>
<div class="flex items-center gap-3">
<span id="branch-badge" class="badge bg-gd-500/20 text-gd-400"><i class="fas fa-layer-group mr-1"></i>Semua Cabang</span>
<span class="text-xs text-gray-500" id="clock"></span>
</div>
</header>
<div id="content" class="flex-1 overflow-y-auto p-6"></div>
</main>
</div>
<div id="modal" class="fixed inset-0 z-50 hidden items-center justify-center modal-overlay" onclick="if(event.target===this)closeModal()">
<div id="modal-body" class="bg-dk-700 border border-dk-500 rounded-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"></div>
</div>
<div id="toasts" class="fixed top-4 right-4 z-[60] flex flex-col gap-2"></div>

<script>
// ============================================================
// DATA & KONFIGURASI
// ============================================================
const BRANCHES={
haybike:{name:'HayBike',icon:'fa-bicycle',color:'#10B981',type:'Toko Sepeda',desc:'Penjualan sepeda, sparepart & aksesoris'},
haypop:{name:'HayPop',icon:'fa-mug-hot',color:'#F97316',type:'Kafe & Dessert',desc:'Coffee, non-coffee, minuman sehat & es cream'},
haymotret:{name:'HayMotret',icon:'fa-camera',color:'#EC4899',type:'Studio Foto',desc:'Foto studio, cetak & framing'}
};

// Chart of Accounts - Standar IAI (PSAK)
const COA=[
{code:'1110',name:'Kas',type:'aset',sub:'Lancar',debit:true},
{code:'1120',name:'Bank',type:'aset',sub:'Lancar',debit:true},
{code:'1130',name:'Piutang Usaha',type:'aset',sub:'Lancar',debit:true},
{code:'1140',name:'Persediaan Barang',type:'aset',sub:'Lancar',debit:true},
{code:'1150',name:'Perlengkapan',type:'aset',sub:'Lancar',debit:true},
{code:'1210',name:'Aset Tetap - Peralatan',type:'aset',sub:'Tetap',debit:true},
{code:'1220',name:'Aset Tetap - Kendaraan',type:'aset',sub:'Tetap',debit:true},
{code:'1230',name:'Akumulasi Penyusutan',type:'aset',sub:'Tetap',debit:false},
{code:'2110',name:'Utang Usaha',type:'kewajiban',sub:'Jangka Pendek',debit:false},
{code:'2120',name:'Utang Gaji',type:'kewajiban',sub:'Jangka Pendek',debit:false},
{code:'3110',name:'Modal Disetor',type:'ekuitas',sub:'',debit:false},
{code:'3120',name:'Laba Ditahan',type:'ekuitas',sub:'',debit:false},
{code:'3130',name:'Laba Berjalan',type:'ekuitas',sub:'',debit:false},
{code:'4110',name:'Pendapatan Penjualan - HayBike',type:'pendapatan',sub:'',debit:false,branch:'haybike'},
{code:'4120',name:'Pendapatan Penjualan - HayPop',type:'pendapatan',sub:'',debit:false,branch:'haypop'},
{code:'4130',name:'Pendapatan Jasa - HayMotret',type:'pendapatan',sub:'',debit:false,branch:'haymotret'},
{code:'5110',name:'Harga Pokok Penjualan',type:'beban',sub:'',debit:true},
{code:'5210',name:'Beban Gaji',type:'beban',sub:'Operasional',debit:true},
{code:'5220',name:'Beban Sewa',type:'beban',sub:'Operasional',debit:true},
{code:'5230',name:'Beban Listrik & Air',type:'beban',sub:'Operasional',debit:true},
{code:'5240',name:'Beban Perlengkapan',type:'beban',sub:'Operasional',debit:true},
{code:'5250',name:'Beban Penyusutan',type:'beban',sub:'Operasional',debit:true},
{code:'5260',name:'Beban Pemasaran',type:'beban',sub:'Operasional',debit:true},
{code:'5270',name:'Beban Lain-lain',type:'beban',sub:'Lainnya',debit:true},
];

// Produk per cabang
const PRODUCTS={
haybike:[
{id:'hb1',name:'Sepeda Gunung Trail-X',cat:'Sepeda',price:4500000,cost:3200000,stock:8},
{id:'hb2',name:'Sepeda Lipat CityLite',cat:'Sepeda',price:2100000,cost:1500000,stock:12},
{id:'hb3',name:'Sepeda Road Veloce R7',cat:'Sepeda',price:7200000,cost:5400000,stock:5},
{id:'hb4',name:'Helm Mavic ProShield',cat:'Aksesoris',price:380000,cost:220000,stock:25},
{id:'hb5',name:'Sarung Tangan GripTech',cat:'Aksesoris',price:165000,cost:85000,stock:30},
{id:'hb6',name:'Pedal Platform Z',cat:'Sparepart',price:295000,cost:150000,stock:20},
{id:'hb7',name:'Rantai Shimano 9-Speed',cat:'Sparepart',price:195000,cost:110000,stock:18},
{id:'hb8',name:'Ban MTB 27.5 Kenda',cat:'Sparepart',price:245000,cost:140000,stock:22},
{id:'hb9',name:'Sadel Ergonomic Pro',cat:'Aksesoris',price:340000,cost:190000,stock:15},
{id:'hb10',name:'Pompa Floor Pro XL',cat:'Aksesoris',price:125000,cost:65000,stock:20},
],
haypop:[
{id:'hp1',name:'Espresso Classico',cat:'Coffee',price:18000,cost:5000,stock:999},
{id:'hp2',name:'Americano Fresco',cat:'Coffee',price:22000,cost:6000,stock:999},
{id:'hp3',name:'Cappuccino Velvet',cat:'Coffee',price:28000,cost:9000,stock:999},
{id:'hp4',name:'Caramel Latte',cat:'Coffee',price:32000,cost:11000,stock:999},
{id:'hp5',name:'Matcha Latte Premium',cat:'Non Coffee',price:28000,cost:9000,stock:999},
{id:'hp6',name:'Choco Bliss',cat:'Non Coffee',price:25000,cost:8000,stock:999},
{id:'hp7',name:'Thai Tea Royale',cat:'Non Coffee',price:22000,cost:7000,stock:999},
{id:'hp8',name:'Jahe Madu Remuh',cat:'Minuman Sehat',price:22000,cost:7000,stock:999},
{id:'hp9',name:'Kunyit Asam Segar',cat:'Minuman Sehat',price:20000,cost:6000,stock:999},
{id:'hp10',name:'Lemon Honey Boost',cat:'Minuman Sehat',price:24000,cost:8000,stock:999},
{id:'hp11',name:'Gelato Vanilla Bean',cat:'Es Cream',price:18000,cost:6000,stock:999},
{id:'hp12',name:'Sundae Caramel Crunch',cat:'Es Cream',price:28000,cost:10000,stock:999},
],
haymotret:[
{id:'hm1',name:'Paket Pas Foto 4R',cat:'Paket Foto',price:45000,cost:5000,stock:999},
{id:'hm2',name:'Paket Foto Keluarga',cat:'Paket Foto',price:350000,cost:40000,stock:999},
{id:'hm3',name:'Paket Foto Wisuda',cat:'Paket Foto',price:275000,cost:30000,stock:999},
{id:'hm4',name:'Paket Foto Prewedding',cat:'Paket Foto',price:1500000,cost:200000,stock:999},
{id:'hm5',name:'Paket Foto Produk',cat:'Paket Foto',price:200000,cost:25000,stock:999},
{id:'hm6',name:'Cetak Foto 4R',cat:'Cetak Foto',price:5000,cost:1500,stock:999},
{id:'hm7',name:'Cetak Foto 10R',cat:'Cetak Foto',price:28000,cost:8000,stock:999},
{id:'hm8',name:'Cetak Foto 20R',cat:'Cetak Foto',price:80000,cost:25000,stock:999},
{id:'hm9',name:'Frame Photo Standar',cat:'Framing',price:38000,cost:15000,stock:50},
{id:'hm10',name:'Frame Photo Premium',cat:'Framing',price:95000,cost:40000,stock:30},
]
};

const HAYPOP_CATS=['Coffee','Non Coffee','Minuman Sehat','Es Cream'];

// ============================================================
// STATE
// ============================================================
let S={
page:'dashboard',
branch:'all',
cart:[],
cartBranch:null,
posCategory:'all',
products:JSON.parse(JSON.stringify(PRODUCTS)),
transactions:[],
journals:[],
nextTxId:1,
nextJrId:1,
payMethod:'tunai',
payAmount:0,
};

// ============================================================
// INISIALISASI DATA CONTOH
// ============================================================
function initSampleData(){
const t=new Date();const d=(offset)=>{const x=new Date(t);x.setDate(x.getDate()-offset);return x.toISOString().split('T')[0]};

// Jurnal pembukaan
addJournal(d(60),'Modal awal pemilik',[{code:'1110',debit:150000000,credit:0},{code:'3110',debit:0,credit:150000000}]);
addJournal(d(58),'Pembelian persediaan awal HayBike',[{code:'1140',debit:48000000,credit:0},{code:'1110',debit:0,credit:48000000}]);
addJournal(d(57),'Pembelian persediaan awal HayPop',[{code:'1140',debit:12000000,credit:0},{code:'1110',debit:0,credit:12000000}]);
addJournal(d(56),'Pembelian perlengkapan HayMotret',[{code:'1150',debit:8000000,credit:0},{code:'1110',debit:0,credit:8000000}]);
addJournal(d(55),'Pembelian peralatan studio & toko',[{code:'1210',debit:35000000,credit:0},{code:'1110',debit:0,credit:35000000}]);
addJournal(d(54),'Pembayaran sewa gedung 3 bulan',[{code:'5220',debit:30000000,credit:0},{code:'1110',debit:0,credit:30000000}]);
addJournal(d(53),'Pembayaran gaji karyawan',[{code:'5210',debit:24000000,credit:0},{code:'1110',debit:0,credit:24000000}]);
addJournal(d(52),'Pembayaran listrik & air',[{code:'5230',debit:6500000,credit:0},{code:'1110',debit:0,credit:6500000}]);
addJournal(d(51),'Beban pemasaran launching',[{code:'5260',debit:5000000,credit:0},{code:'1110',debit:0,credit:5000000}]);
addJournal(d(50),'Beban penyusutan peralatan',[{code:'5250',debit:2900000,credit:0},{code:'1230',debit:0,credit:2900000}]);

// Transaksi penjualan contoh (30 hari terakhir)
const sampleSales=[
[d(28),'haybike',[{id:'hb4',qty:2}]],[d(27),'haypop',[{id:'hp3',qty:3},{id:'hp11',qty:2}]],[d(26),'haymotret',[{id:'hm2',qty:1}]],
[d(25),'haybike',[{id:'hb1',qty:1}]],[d(24),'haypop',[{id:'hp4',qty:2},{id:'hp5',qty:2}]],[d(23),'haymotret',[{id:'hm4',qty:1}]],
[d(22),'haybike',[{id:'hb7',qty:3},{id:'hb8',qty:2}]],[d(21),'haypop',[{id:'hp1',qty:5},{id:'hp8',qty:3}]],[d(20),'haymotret',[{id:'hm3',qty:2},{id:'hm6',qty:10}]],
[d(19),'haybike',[{id:'hb2',qty:2}]],[d(18),'haypop',[{id:'hp2',qty:4},{id:'hp12',qty:3}]],[d(17),'haymotret',[{id:'hm5',qty:1},{id:'hm9',qty:2}]],
[d(16),'haybike',[{id:'hb5',qty:4},{id:'hb10',qty:3}]],[d(15),'haypop',[{id:'hp6',qty:3},{id:'hp9',qty:2}]],[d(14),'haymotret',[{id:'hm1',qty:5},{id:'hm7',qty:3}]],
[d(13),'haybike',[{id:'hb3',qty:1}]],[d(12),'haypop',[{id:'hp3',qty:4},{id:'hp10',qty:3}]],[d(11),'haymotret',[{id:'hm8',qty:1},{id:'hm10',qty:1}]],
[d(10),'haybike',[{id:'hb6',qty:2},{id:'hb9',qty:1}]],[d(9),'haypop',[{id:'hp4',qty:3},{id:'hp11',qty:4}]],[d(8),'haymotret',[{id:'hm3',qty:1},{id:'hm2',qty:1}]],
[d(7),'haybike',[{id:'hb1',qty:1},{id:'hb4',qty:3}]],[d(6),'haypop',[{id:'hp5',qty:5},{id:'hp8',qty:4}]],[d(5),'haymotret',[{id:'hm4',qty:1}]],
[d(4),'haybike',[{id:'hb8',qty:4},{id:'hb7',qty:2}]],[d(3),'haypop',[{id:'hp1',qty:6},{id:'hp12',qty:2},{id:'hp7',qty:3}]],[d(2),'haymotret',[{id:'hm5',qty:2},{id:'hm6',qty:8}]],
[d(1),'haybike',[{id:'hb2',qty:1},{id:'hb10',qty:2}]],[d(1),'haypop',[{id:'hp2',qty:3},{id:'hp9',qty:2}]],[d(0),'haymotret',[{id:'hm1',qty:3},{id:'hm8',qty:1}]],
];

sampleSales.forEach(([date,branch,items])=>{
const prods=items.map(i=>{const p=PRODUCTS[branch].find(x=>x.id===i.id);return{...p,qty:i.qty}});
const total=prods.reduce((s,p)=>s+p.price*p.qty,0);
const cost=prods.reduce((s,p)=>s+p.cost*p.qty,0);
addTransaction(date,branch,prods,total,cost,'tunai');
});
}

// ============================================================
// FUNGSI AKUNTANSI
// ============================================================
function addJournal(date,desc,entries){
const id=S.nextJrId++;
S.journals.push({id,date,desc,entries});
}

function addTransaction(date,branch,items,total,cost,method){
const id=S.nextTxId++;
const inv='INV-'+String(id).padStart(5,'0');
S.transactions.push({id,date,branch,items,inv,total,cost,method});

// Jurnal penjualan: Debit Kas, Credit Pendapatan
const revCode=branch==='haybike'?'4110':branch==='haypop'?'4120':'4130';
addJournal(date,`Penjualan ${inv} - ${BRANCHES[branch].name}`,[
{code:'1110',debit:total,credit:0},
{code:revCode,debit:0,credit:total}
]);

// Jurnal HPP: Debit HPP, Credit Persediaan
if(cost>0){
addJournal(date,`HPP ${inv} - ${BRANCHES[branch].name}`,[
{code:'5110',debit:cost,credit:0},
{code:'1140',debit:0,credit:cost}
]);
}

// Kurangi stok
items.forEach(item=>{
const p=S.products[branch].find(x=>x.id===item.id||x.id===item.productId);
if(p&&p.stock<999)p.stock=Math.max(0,p.stock-(item.qty||1));
});
}

function getAccountBalance(code){
let bal=0;
S.journals.forEach(j=>{j.entries.forEach(e=>{if(e.code===code){const acc=COA.find(a=>a.code===code);
if(acc&&acc.debit)bal+=e.debit-e.credit;else bal+=e.credit-e.debit;}})});
return bal;
}

function getAccountBalancesByType(type){
return COA.filter(a=>a.type===type).map(a=>({code:a.code,name:a.name,balance:getAccountBalance(a.code),sub:a.sub,branch:a.branch}));
}

function getIncomeStatement(){
const pendapatan=getAccountBalancesByType('pendapatan');
const beban=getAccountBalancesByType('beban');
const totalPendapatan=pendapatan.reduce((s,a)=>s+a.balance,0);
const totalBeban=beban.reduce((s,a)=>s+a.balance,0);
const hpp=getAccountBalance('5110');
const labaKotor=totalPendapatan-hpp;
const bebanOps=totalBeban-hpp;
const labaBersih=labaKotor-bebanOps;
return{pendapatan,beban,totalPendapatan,hpp,labaKotor,bebanOps,labaBersih};
}

function getBalanceSheet(){
const asetLancar=getAccountBalancesByType('aset').filter(a=>a.sub==='Lancar');
const asetTetap=getAccountBalancesByType('aset').filter(a=>a.sub==='Tetap');
const totalAsetLancar=asetLancar.reduce((s,a)=>s+a.balance,0);
const totalAsetTetap=asetTetap.reduce((s,a)=>s+a.balance,0);
const totalAset=totalAsetLancar+totalAsetTetap;
const kewajiban=getAccountBalancesByType('kewajiban');
const totalKewajiban=kewajiban.reduce((s,a)=>s+a.balance,0);
const ekuitas=getAccountBalancesByType('ekuitas');
const labaBerjalan=getIncomeStatement().labaBersih;
const totalEkuitas=ekuitas.reduce((s,a)=>s+a.balance,0)+labaBerjalan;
return{asetLancar,asetTetap,totalAsetLancar,totalAsetTetap,totalAset,kewajiban,totalKewajiban,ekuitas,labaBerjalan,totalEkuitas,totalPasiva:totalKewajiban+totalEkuitas};
}

// ============================================================
// UTILITAS
// ============================================================
function fmt(n){return new Intl.NumberFormat('id-ID').format(n)}
function fmtRp(n){return'Rp '+fmt(n)}
function fmtDate(d){const p=d.split('-');return`${p[2]}/${p[1]}/${p[0]}`}

function toast(msg,type='success'){
const c=document.getElementById('toasts');
const colors={success:'bg-emerald-600',error:'bg-red-600',info:'bg-gd-600'};
const icons={success:'fa-check-circle',error:'fa-times-circle',info:'fa-info-circle'};
const el=document.createElement('div');
el.className=`toast ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-semibold`;
el.innerHTML=`<i class="fas ${icons[type]}"></i>${msg}`;
c.appendChild(el);setTimeout(()=>el.remove(),3000);
}

function openModal(html){
document.getElementById('modal-body').innerHTML=html;
document.getElementById('modal').classList.remove('hidden');
document.getElementById('modal').classList.add('flex');
}
function closeModal(){
document.getElementById('modal').classList.add('hidden');
document.getElementById('modal').classList.remove('flex');
}

// ============================================================
// NAVIGASI
// ============================================================
const NAV=[
{id:'dashboard',icon:'fa-gauge-high',label:'Dashboard'},
{id:'kasir',icon:'fa-cash-register',label:'Kasir (POS)'},
{id:'produk',icon:'fa-boxes-stacked',label:'Produk'},
{id:'transaksi',icon:'fa-receipt',label:'Transaksi'},
{id:'jurnal',icon:'fa-book',label:'Jurnal Umum',group:'Akuntansi'},
{id:'bukubesar',icon:'fa-book-open',label:'Buku Besar',group:'Akuntansi'},
{id:'neraca',icon:'fa-scale-balanced',label:'Neraca',group:'Akuntansi'},
{id:'labarugi',icon:'fa-chart-line',label:'Laba Rugi',group:'Akuntansi'},
{id:'aruskas',icon:'fa-money-bill-wave',label:'Arus Kas',group:'Akuntansi'},
];

function navigate(page){
S.page=page;
document.getElementById('sidebar').classList.remove('open');
renderSidebar();renderPage();
}
function setBranch(b){
S.branch=b;
const sel=document.getElementById('branch-selector');
if(sel)sel.value=b;
const bname=b==='all'?'Semua Cabang':BRANCHES[b].name;
const bcol=b==='all'?'bg-gd-500/20 text-gd-400':`bg-${b==='haybike'?'bike':b==='haypop'?'pop':'motret'}/20 text-${b==='haybike'?'bike':b==='haypop'?'pop':'motret'}`;
document.getElementById('branch-badge').className=`badge ${bcol}`;
document.getElementById('branch-badge').innerHTML=`<i class="fas ${b==='all'?'fa-layer-group':BRANCHES[b].icon} mr-1"></i>${bname}`;
renderPage();
}

function renderSidebar(){
const nav=document.getElementById('sidebar-nav');
let html='',lastGroup='';
NAV.forEach(n=>{
if(n.group&&n.group!==lastGroup){lastGroup=n.group;html+=`<div class="px-5 pt-4 pb-1 text-[10px] text-gray-600 uppercase tracking-widest font-bold">${n.group}</div>`}
const active=S.page===n.id?'active':'';
html+=`<div class="sidebar-item ${active} flex items-center gap-3 px-5 py-2.5 cursor-pointer text-sm" onclick="navigate('${n.id}')">
<i class="fas ${n.icon} w-5 text-center ${active?'text-gd-400':'text-gray-500'}"></i>
<span class="${active?'text-gd-400 font-bold':'text-gray-400 font-medium'}">${n.label}</span></div>`;
});
nav.innerHTML=html;
}

// ============================================================
// RENDER HALAMAN
// ============================================================
function renderPage(){
const content=document.getElementById('content');
const titles={dashboard:'Dashboard',kasir:'Kasir (POS)',produk:'Manajemen Produk',transaksi:'Riwayat Transaksi',jurnal:'Jurnal Umum',bukubesar:'Buku Besar',neraca:'Neraca (Balance Sheet)',labarugi:'Laporan Laba Rugi',aruskas:'Laporan Arus Kas'};
document.getElementById('page-title').textContent=titles[S.page]||'';
const renderers={dashboard:renderDashboard,kasir:renderKasir,produk:renderProduk,transaksi:renderTransaksi,jurnal:renderJurnal,bukubesar:renderBukuBesar,neraca:renderNeraca,labarugi:renderLabaRugi,aruskas:renderArusKas};
if(renderers[S.page])renderers[S.page](content);
}

// ---- DASHBOARD ----
function renderDashboard(el){
const txs=S.transactions.filter(t=>S.branch==='all'||t.branch===S.branch);
const totalRev=txs.reduce((s,t)=>s+t.total,0);
const totalCost=txs.reduce((s,t)=>s+t.cost,0);
const totalProfit=totalRev-totalCost;
const txCount=txs.length;
const bs=getBalanceSheet();

const branchCards=Object.entries(BRANCHES).map(([k,b])=>{
const bTxs=txs.filter(t=>t.branch===k);
const rev=bTxs.reduce((s,t)=>s+t.total,0);
const profit=bTxs.reduce((s,t)=>s+t.total-t.cost,0);
return`<div class="card p-5 border-l-4" style="border-left-color:${b.color}">
<div class="flex items-center justify-between mb-3">
<div class="flex items-center gap-2"><i class="fas ${b.icon}" style="color:${b.color}"></i><span class="font-bold text-sm">${b.name}</span></div>
<span class="badge text-xs" style="background:${b.color}22;color:${b.color}">${b.type}</span>
</div>
<div class="text-2xl font-black text-white mb-1">${fmtRp(rev)}</div>
<div class="text-xs text-gray-500 mb-3">Pendapatan</div>
<div class="flex justify-between text-xs"><span class="text-gray-500">Laba Kotor</span><span class="font-bold text-emerald-400">${fmtRp(profit)}</span></div>
<div class="flex justify-between text-xs mt-1"><span class="text-gray-500">Transaksi</span><span class="font-bold text-gray-300">${bTxs.length}</span></div>
</div>`}).join('');

// 5 transaksi terakhir
const recent=[...txs].sort((a,b)=>b.id-a.id).slice(0,5);
const recentHtml=recent.map(t=>`<tr>
<td class="text-xs text-gray-400">${fmtDate(t.date)}</td>
<td class="text-xs font-mono">${t.inv}</td>
<td><span class="badge text-[10px]" style="background:${BRANCHES[t.branch].color}22;color:${BRANCHES[t.branch].color}"><i class="fas ${BRANCHES[t.branch].icon} mr-1"></i>${BRANCHES[t.branch].name}</span></td>
<td class="text-sm font-bold text-white">${fmtRp(t.total)}</td>
<td class="text-xs text-emerald-400">+${fmtRp(t.total-t.cost)}</td>
</tr>`).join('');

el.innerHTML=`<div class="fade-in">
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
<div class="card p-5"><div class="text-xs text-gray-500 mb-1"><i class="fas fa-coins mr-1 text-gd-500"></i>Total Pendapatan</div><div class="text-2xl font-black text-gd-400">${fmtRp(totalRev)}</div></div>
<div class="card p-5"><div class="text-xs text-gray-500 mb-1"><i class="fas fa-arrow-trend-up mr-1 text-emerald-400"></i>Laba Kotor</div><div class="text-2xl font-black text-emerald-400">${fmtRp(totalProfit)}</div></div>
<div class="card p-5"><div class="text-xs text-gray-500 mb-1"><i class="fas fa-receipt mr-1 text-sky-400"></i>Total Transaksi</div><div class="text-2xl font-black text-white">${txCount}</div></div>
<div class="card p-5"><div class="text-xs text-gray-500 mb-1"><i class="fas fa-wallet mr-1 text-gd-400"></i>Saldo Kas</div><div class="text-2xl font-black text-white">${fmtRp(bs.totalAsetLancar+bs.totalAsetTetap)}</div></div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">${branchCards}</div>
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
<div class="card p-5"><h3 class="font-bold text-sm mb-3 text-gray-300">Pendapatan per Cabang</h3><canvas id="chart-rev-branch" height="220"></canvas></div>
<div class="card p-5"><h3 class="font-bold text-sm mb-3 text-gray-300">Tren 30 Hari Terakhir</h3><canvas id="chart-trend" height="220"></canvas></div>
</div>
<div class="card p-5"><h3 class="font-bold text-sm mb-3 text-gray-300">Transaksi Terbaru</h3>
<div class="overflow-x-auto"><table class="w-full"><thead><tr><th>Tanggal</th><th>No. Invoice</th><th>Cabang</th><th>Total</th><th>Laba</th></tr></thead><tbody>${recentHtml}</tbody></table></div>
</div></div>`;

setTimeout(()=>initDashboardCharts(),100);
}

function initDashboardCharts(){
// Pendapatan per cabang
const ctx1=document.getElementById('chart-rev-branch');
if(!ctx1)return;
const labels=Object.values(BRANCHES).map(b=>b.name);
const data=Object.keys(BRANCHES).map(k=>S.transactions.filter(t=>t.branch===k).reduce((s,t)=>s+t.total,0));
new Chart(ctx1,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:['#10B981','#F97316','#EC4899'],borderWidth:0,borderRadius:4}]},
options:{responsive:true,plugins:{legend:{position:'bottom',labels:{color:'#94A3B8',font:{size:11,family:'Plus Jakarta Sans'},padding:12}}}}});

// Tren 30 hari
const ctx2=document.getElementById('chart-trend');
if(!ctx2)return;
const days=[];const now=new Date();
for(let i=29;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);days.push(d.toISOString().split('T')[0])}
const dayLabels=days.map(d=>d.slice(5));
const bikeData=days.map(d=>S.transactions.filter(t=>t.branch==='haybike'&&t.date===d).reduce((s,t)=>s+t.total,0));
const popData=days.map(d=>S.transactions.filter(t=>t.branch==='haypop'&&t.date===d).reduce((s,t)=>s+t.total,0));
const motretData=days.map(d=>S.transactions.filter(t=>t.branch==='haymotret'&&t.date===d).reduce((s,t)=>s+t.total,0));
new Chart(ctx2,{type:'line',data:{labels:dayLabels,datasets:[
{label:'HayBike',data:bikeData,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,.1)',fill:true,tension:.4,pointRadius:0,borderWidth:2},
{label:'HayPop',data:popData,borderColor:'#F97316',backgroundColor:'rgba(249,115,22,.1)',fill:true,tension:.4,pointRadius:0,borderWidth:2},
{label:'HayMotret',data:motretData,borderColor:'#EC4899',backgroundColor:'rgba(236,72,153,.1)',fill:true,tension:.4,pointRadius:0,borderWidth:2},
]},options:{responsive:true,plugins:{legend:{labels:{color:'#94A3B8',font:{size:11,family:'Plus Jakarta Sans'}}}},
scales:{x:{ticks:{color:'#475569',font:{size:9},maxTicksLimit:10},grid:{color:'#1E244020'}},
y:{ticks:{color:'#475569',font:{size:10},callback:v=>v>=1000000?(v/1000000)+'jt':v>=1000?(v/1000)+'rb':v},grid:{color:'#1E244040'}}}}});
}

// ---- KASIR (POS) ----
function renderKasir(el){
const branch=S.cartBranch||'haybike';
const prods=S.products[branch];
const cats=branch==='haypop'?[...HAYPOP_CATS]:[...new Set(prods.map(p=>p.cat))];
const filtered=S.posCategory==='all'?prods:prods.filter(p=>p.cat===S.posCategory);
const cartTotal=S.cart.reduce((s,c)=>s+c.price*c.qty,0);

const branchTabs=Object.entries(BRANCHES).map(([k,b])=>`<button class="tab-btn ${branch===k?'active':''}" onclick="switchPOSBranch('${k}')" style="${branch===k?`background:${b.color}20;color:${b.color}`:''}" ><i class="fas ${b.icon} mr-1"></i>${b.name}</button>`).join('');

const catTabs=`<button class="tab-btn ${S.posCategory==='all'?'active':''}" onclick="setPOSCat('all')">Semua</button>`+cats.map(c=>`<button class="tab-btn ${S.posCategory===c?'active':''}" onclick="setPOSCat('${c}')">${c}</button>`).join('');

const prodCards=filtered.map(p=>`<div class="card product-card p-3 cursor-pointer" onclick="addToCart('${p.id}','${branch}')">
<div class="w-full h-24 rounded-lg mb-2 flex items-center justify-center" style="background:${BRANCHES[branch].color}15">
<i class="fas ${branch==='haybike'?'fa-bicycle':branch==='haypop'?'fa-mug-hot':'fa-camera'} text-3xl" style="color:${BRANCHES[branch].color}60"></i>
</div>
<div class="text-xs font-bold text-white truncate">${p.name}</div>
<div class="text-xs text-gray-500">${p.cat}</div>
<div class="flex justify-between items-center mt-1">
<span class="text-sm font-black" style="color:${BRANCHES[branch].color}">${fmtRp(p.price)}</span>
<span class="text-[10px] text-gray-600">Stok: ${p.stock}</span>
</div></div>`).join('');

const cartItems=S.cart.length===0?'<div class="text-center text-gray-600 py-10"><i class="fas fa-shopping-cart text-3xl mb-2"></i><div class="text-sm">Keranjang kosong</div></div>':
S.cart.map((c,i)=>`<div class="flex items-center gap-2 p-2 rounded-lg bg-dk-800/50">
<div class="flex-1 min-w-0"><div class="text-xs font-bold text-white truncate">${c.name}</div>
<div class="text-[10px] text-gray-500">${fmtRp(c.price)}</div></div>
<div class="flex items-center gap-1">
<button class="w-6 h-6 rounded bg-dk-500 text-gray-400 text-xs flex items-center justify-center hover:bg-dk-400" onclick="updateCartQty(${i},-1)">-</button>
<span class="text-xs font-bold w-6 text-center">${c.qty}</span>
<button class="w-6 h-6 rounded bg-dk-500 text-gray-400 text-xs flex items-center justify-center hover:bg-dk-400" onclick="updateCartQty(${i},1)">+</button>
</div>
<div class="text-xs font-bold text-white w-20 text-right">${fmtRp(c.price*c.qty)}</div>
<button class="text-red-400 hover:text-red-300 ml-1" onclick="removeFromCart(${i})"><i class="fas fa-times text-xs"></i></button>
</div>`).join('');

el.innerHTML=`<div class="fade-in flex gap-4 h-[calc(100vh-7rem)]">
<div class="flex-1 flex flex-col min-w-0">
<div class="flex gap-2 mb-3 flex-wrap">${branchTabs}</div>
<div class="flex gap-2 mb-3 flex-wrap">${catTabs}</div>
<div class="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-min content-start">${prodCards}</div>
</div>
<div class="w-80 flex-shrink-0 card p-4 flex flex-col">
<div class="flex items-center justify-between mb-3">
<h3 class="font-bold text-sm"><i class="fas fa-shopping-cart mr-1 text-gd-500"></i>Keranjang</h3>
<button class="text-[10px] text-red-400 hover:text-red-300" onclick="clearCart()"><i class="fas fa-trash mr-1"></i>Hapus Semua</button>
</div>
<div class="flex-1 overflow-y-auto space-y-2 mb-3">${cartItems}</div>
<div class="border-t border-dk-500 pt-3">
<div class="flex justify-between text-sm mb-1"><span class="text-gray-400">Subtotal</span><span class="font-bold">${fmtRp(cartTotal)}</span></div>
<div class="flex justify-between text-lg mb-3"><span class="text-gray-300 font-bold">Total</span><span class="font-black text-gd-400">${fmtRp(cartTotal)}</span></div>
<button class="btn-primary w-full py-3 text-sm ${cartTotal===0?'opacity-50 cursor-not-allowed':''}" onclick="openPayment()" ${cartTotal===0?'disabled':''}><i class="fas fa-credit-card mr-2"></i>Bayar</button>
</div></div></div>`;
}

function switchPOSBranch(b){S.cartBranch=b;S.cart=[];S.posCategory='all';renderPage()}
function setPOSCat(c){S.posCategory=c;renderPage()}
function addToCart(pid,branch){
const p=S.products[branch].find(x=>x.id===pid);if(!p)return;
if(S.cartBranch!==branch){S.cart=[];S.cartBranch=branch}
const existing=S.cart.find(c=>c.id===pid);
if(existing){existing.qty++}else{S.cart.push({...p,qty:1})}
renderPage();
}
function updateCartQty(i,delta){S.cart[i].qty=Math.max(1,S.cart[i].qty+delta);renderPage()}
function removeFromCart(i){S.cart.splice(i,1);renderPage()}
function clearCart(){S.cart=[];renderPage()}

function openPayment(){
const total=S.cart.reduce((s,c)=>s+c.price*c.qty,0);
S.payAmount=0;S.payMethod='tunai';
openModal(`<div class="p-6">
<div class="text-center mb-5">
<div class="w-14 h-14 rounded-2xl bg-gd-500/20 flex items-center justify-center mx-auto mb-3"><i class="fas fa-cash-register text-gd-400 text-xl"></i></div>
<h3 class="font-bold text-lg">Pembayaran</h3>
<div class="text-3xl font-black text-gd-400 mt-1">${fmtRp(total)}</div>
</div>
<div class="mb-4"><label class="text-xs text-gray-400 mb-1 block">Metode Pembayaran</label>
<div class="flex gap-2">
<button id="pm-tunai" class="flex-1 py-2 rounded-lg text-sm font-bold bg-gd-500/20 text-gd-400 border border-gd-500/30" onclick="setPayMethod('tunai')"><i class="fas fa-money-bill mr-1"></i>Tunai</button>
<button id="pm-transfer" class="flex-1 py-2 rounded-lg text-sm font-bold bg-dk-500 text-gray-400 border border-dk-400" onclick="setPayMethod('transfer')"><i class="fas fa-building-columns mr-1"></i>Transfer</button>
<button id="pm-qris" class="flex-1 py-2 rounded-lg text-sm font-bold bg-dk-500 text-gray-400 border border-dk-400" onclick="setPayMethod('qris')"><i class="fas fa-qrcode mr-1"></i>QRIS</button>
</div></div>
<div class="mb-4"><label class="text-xs text-gray-400 mb-1 block">Jumlah Dibayar</label>
<input type="number" id="pay-input" class="input-field w-full text-lg font-bold" placeholder="Masukkan jumlah..." oninput="S.payAmount=Number(this.value);updateChange()">
</div>
<div id="change-display" class="text-center py-2 rounded-lg bg-dk-800 mb-4 text-sm text-gray-500">Masukkan jumlah pembayaran</div>
<button class="btn-primary w-full py-3 text-sm" onclick="processPayment()"><i class="fas fa-check mr-2"></i>Konfirmasi Pembayaran</button>
</div>`);
}

function setPayMethod(m){
S.payMethod=m;
['tunai','transfer','qris'].forEach(x=>{
const el=document.getElementById('pm-'+x);
if(x===m){el.className='flex-1 py-2 rounded-lg text-sm font-bold bg-gd-500/20 text-gd-400 border border-gd-500/30'}
else{el.className='flex-1 py-2 rounded-lg text-sm font-bold bg-dk-500 text-gray-400 border border-dk-400'}
});
}

function updateChange(){
const total=S.cart.reduce((s,c)=>s+c.price*c.qty,0);
const paid=S.payAmount;
const el=document.getElementById('change-display');
if(paid>=total){el.innerHTML=`<span class="text-emerald-400 font-bold">Kembalian: ${fmtRp(paid-total)}</span>`}
else if(paid>0){el.innerHTML=`<span class="text-red-400 font-bold">Kurang: ${fmtRp(total-paid)}</span>`}
else{el.innerHTML='Masukkan jumlah pembayaran'}
}

function processPayment(){
const total=S.cart.reduce((s,c)=>s+c.price*c.qty,0);
if(S.payAmount<total){toast('Jumlah pembayaran kurang!','error');return}
const cost=S.cart.reduce((s,c)=>s+c.cost*c.qty,0);
const today=new Date().toISOString().split('T')[0];
addTransaction(today,S.cartBranch,S.cart.map(c=>({id:c.id,name:c.name,price:c.price,cost:c.cost,qty:c.qty})),total,cost,S.payMethod);
const inv='INV-'+String(S.transactions[S.transactions.length-1].id).padStart(5,'0');
S.cart=[];S.payAmount=0;
closeModal();
toast(`Transaksi ${inv} berhasil!`);
// Tampilkan struk
setTimeout(()=>showReceipt(inv),300);
renderPage();
}

function showReceipt(inv){
const tx=S.transactions.find(t=>t.inv===inv);if(!tx)return;
openModal(`<div class="p-6 text-center">
<div class="mb-4"><div class="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2"><i class="fas fa-check text-emerald-400 text-xl"></i></div>
<h3 class="font-bold text-lg text-emerald-400">Pembayaran Berhasil</h3></div>
<div class="bg-dk-800 rounded-xl p-4 text-left mb-4">
<div class="flex justify-between text-xs mb-2"><span class="text-gray-500">Invoice</span><span class="font-mono font-bold">${tx.inv}</span></div>
<div class="flex justify-between text-xs mb-2"><span class="text-gray-500">Cabang</span><span style="color:${BRANCHES[tx.branch].color}" class="font-bold">${BRANCHES[tx.branch].name}</span></div>
<div class="flex justify-between text-xs mb-2"><span class="text-gray-500">Metode</span><span class="font-bold capitalize">${tx.method}</span></div>
<div class="border-t border-dk-500 my-2"></div>
 ${tx.items.map(i=>`<div class="flex justify-between text-xs mb-1"><span class="text-gray-400">${i.name} x${i.qty}</span><span>${fmtRp(i.price*i.qty)}</span></div>`).join('')}
<div class="border-t border-dk-500 my-2"></div>
<div class="flex justify-between font-bold"><span>Total</span><span class="text-gd-400">${fmtRp(tx.total)}</span></div>
</div>
<button class="btn-secondary w-full py-2 text-sm" onclick="closeModal()">Tutup</button>
</div>`);
}

// ---- PRODUK ----
function renderProduk(el){
const branch=S.branch==='all'?'haybike':S.branch;
const prods=S.products[branch];
const cats=branch==='haypop'?[...HAYPOP_CATS]:[...new Set(prods.map(p=>p.cat))];
const filtered=S.posCategory==='all'?prods:prods.filter(p=>p.cat===S.posCategory);

const branchTabs=Object.entries(BRANCHES).map(([k,b])=>`<button class="tab-btn ${branch===k?'active':''}" onclick="S.branch='${k}';S.posCategory='all';renderPage()" style="${branch===k?`background:${b.color}20;color:${b.color}`:''}"><i class="fas ${b.icon} mr-1"></i>${b.name}</button>`).join('');

const catTabs=`<button class="tab-btn ${S.posCategory==='all'?'active':''}" onclick="S.posCategory='all';renderPage()">Semua</button>`+cats.map(c=>`<button class="tab-btn ${S.posCategory===c?'active':''}" onclick="S.posCategory='${c}';renderPage()">${c}</button>`).join('');

const rows=filtered.map(p=>`<tr>
<td class="text-sm font-bold text-white">${p.name}</td>
<td><span class="badge text-[10px]" style="background:${BRANCHES[branch].color}22;color:${BRANCHES[branch].color}">${p.cat}</span></td>
<td class="text-sm">${fmtRp(p.price)}</td>
<td class="text-sm text-gray-400">${fmtRp(p.cost)}</td>
<td class="text-sm font-bold ${p.stock<5?'text-red-400':p.stock<999?'text-emerald-400':'text-gray-500'}">${p.stock>=999?'∞':p.stock}</td>
<td class="text-sm text-gd-400 font-bold">${fmtRp(p.price-p.cost)} <span class="text-[10px] text-gray-600">(${Math.round((p.price-p.cost)/p.price*100)}%)</span></td>
</tr>`).join('');

el.innerHTML=`<div class="fade-in">
<div class="flex justify-between items-center mb-4">
<div class="flex gap-2 flex-wrap">${branchTabs}</div>
<button class="btn-primary px-4 py-2 text-sm" onclick="openAddProduct('${branch}')"><i class="fas fa-plus mr-1"></i>Tambah Produk</button>
</div>
<div class="flex gap-2 mb-4 flex-wrap">${catTabs}</div>
<div class="card overflow-hidden"><div class="overflow-x-auto"><table class="w-full">
<thead><tr><th>Nama Produk</th><th>Kategori</th><th>Harga Jual</th><th>Harga Modal</th><th>Stok</th><th>Margin</th></tr></thead>
<tbody>${rows}</tbody></table></div></div></div>`;
}

function openAddProduct(branch){
const cats=branch==='haypop'?HAYPOP_CATS:['Sepeda','Aksesoris','Sparepart'];
openModal(`<div class="p-6">
<h3 class="font-bold text-lg mb-4"><i class="fas fa-plus-circle text-gd-500 mr-2"></i>Tambah Produk - ${BRANCHES[branch].name}</h3>
<div class="space-y-3">
<div><label class="text-xs text-gray-400 mb-1 block">Nama Produk</label><input id="np-name" class="input-field w-full" placeholder="Masukkan nama produk"></div>
<div><label class="text-xs text-gray-400 mb-1 block">Kategori</label><select id="np-cat" class="input-field w-full">${cats.map(c=>`<option value="${c}">${c}</option>`).join('')}</select></div>
<div class="grid grid-cols-2 gap-3">
<div><label class="text-xs text-gray-400 mb-1 block">Harga Jual</label><input id="np-price" type="number" class="input-field w-full" placeholder="0"></div>
<div><label class="text-xs text-gray-400 mb-1 block">Harga Modal</label><input id="np-cost" type="number" class="input-field w-full" placeholder="0"></div>
</div>
<div><label class="text-xs text-gray-400 mb-1 block">Stok Awal</label><input id="np-stock" type="number" class="input-field w-full" placeholder="0" value="10"></div>
</div>
<button class="btn-primary w-full py-2.5 text-sm mt-4" onclick="saveProduct('${branch}')"><i class="fas fa-save mr-1"></i>Simpan Produk</button>
</div>`);
}

function saveProduct(branch){
const name=document.getElementById('np-name').value.trim();
const cat=document.getElementById('np-cat').value;
const price=Number(document.getElementById('np-price').value);
const cost=Number(document.getElementById('np-cost').value);
const stock=Number(document.getElementById('np-stock').value);
if(!name||!price||!cost){toast('Lengkapi semua data!','error');return}
const prefix=branch==='haybike'?'hb':branch==='haypop'?'hp':'hm';
const id=prefix+Date.now();
S.products[branch].push({id,name,cat,price,cost,stock});
closeModal();toast('Produk berhasil ditambahkan!');renderPage();
}

// ---- TRANSAKSI ----
function renderTransaksi(el){
let txs=[...S.transactions].sort((a,b)=>b.id-a.id);
if(S.branch!=='all')txs=txs.filter(t=>t.branch===S.branch);

const rows=txs.map(t=>`<tr>
<td class="text-xs text-gray-400">${fmtDate(t.date)}</td>
<td class="text-xs font-mono font-bold">${t.inv}</td>
<td><span class="badge text-[10px]" style="background:${BRANCHES[t.branch].color}22;color:${BRANCHES[t.branch].color}"><i class="fas ${BRANCHES[t.branch].icon} mr-1"></i>${BRANCHES[t.branch].name}</span></td>
<td class="text-xs text-gray-400">${t.items.map(i=>`${i.name} x${i.qty}`).join(', ')}</td>
<td class="text-sm font-bold text-white">${fmtRp(t.total)}</td>
<td class="text-xs text-emerald-400">${fmtRp(t.total-t.cost)}</td>
<td><span class="badge text-[10px] ${t.method==='tunai'?'bg-emerald-500/20 text-emerald-400':t.method==='transfer'?'bg-sky-500/20 text-sky-400':'bg-gd-500/20 text-gd-400'}">${t.method}</span></td>
</tr>`).join('');

el.innerHTML=`<div class="fade-in">
<div class="flex justify-between items-center mb-4">
<div class="text-sm text-gray-400">Total: <span class="font-bold text-white">${txs.length}</span> transaksi</div>
<div class="text-sm text-gray-400">Pendapatan: <span class="font-bold text-gd-400">${fmtRp(txs.reduce((s,t)=>s+t.total,0))}</span></div>
</div>
<div class="card overflow-hidden"><div class="overflow-x-auto"><table class="w-full">
<thead><tr><th>Tanggal</th><th>Invoice</th><th>Cabang</th><th>Item</th><th>Total</th><th>Laba</th><th>Metode</th></tr></thead>
<tbody>${rows}</tbody></table></div></div></div>`;
}

// ---- JURNAL UMUM ----
function renderJurnal(el){
let jnls=[...S.journals].sort((a,b)=>b.id-a.id);
if(S.branch!=='all'){
const revCodes={haybike:['4110'],haypop:['4120'],haymotret:['4130']};
const codes=revCodes[S.branch]||[];
jnls=jnls.filter(j=>j.entries.some(e=>codes.includes(e.code)));
}

const rows=jnls.map(j=>{
const entryRows=j.entries.map((e,i)=>`<tr class="${i>0?'border-t-0':''}">
<td class="text-xs ${i>0?'pt-0':''}">${i===0?fmtDate(j.date):''}</td>
<td class="text-xs ${i>0?'pt-0':''}">${i===0?j.desc:''}</td>
<td class="text-xs font-mono ${i>0?'pt-0 pl-8':''}">${COA.find(a=>a.code===e.code)?.name||e.code}</td>
<td class="text-xs text-right ${i>0?'pt-0':''}">${e.debit?fmtRp(e.debit):''}</td>
<td class="text-xs text-right ${i>0?'pt-0':''}">${e.credit?fmtRp(e.credit):''}</td>
</tr>`).join('');
return entryRows;
}).join('');

el.innerHTML=`<div class="fade-in">
<div class="flex justify-between items-center mb-4">
<div class="text-sm text-gray-400">Total: <span class="font-bold text-white">${jnls.length}</span> entri jurnal</div>
<button class="btn-primary px-4 py-2 text-sm" onclick="openAddJournal()"><i class="fas fa-plus mr-1"></i>Tambah Jurnal</button>
</div>
<div class="card overflow-hidden"><div class="overflow-x-auto"><table class="w-full">
<thead><tr><th>Tanggal</th><th>Keterangan</th><th>Akun</th><th class="text-right">Debit</th><th class="text-right">Kredit</th></tr></thead>
<tbody>${rows}</tbody></table></div></div></div>`;
}

function openAddJournal(){
const today=new Date().toISOString().split('T')[0];
const accOptions=COA.map(a=>`<option value="${a.code}">${a.code} - ${a.name}</option>`).join('');
openModal(`<div class="p-6">
<h3 class="font-bold text-lg mb-4"><i class="fas fa-plus-circle text-gd-500 mr-2"></i>Tambah Jurnal Manual</h3>
<div class="space-y-3">
<div><label class="text-xs text-gray-400 mb-1 block">Tanggal</label><input id="nj-date" type="date" class="input-field w-full" value="${today}"></div>
<div><label class="text-xs text-gray-400 mb-1 block">Keterangan</label><input id="nj-desc" class="input-field w-full" placeholder="Deskripsi jurnal"></div>
<div class="border-t border-dk-500 pt-3">
<div class="text-xs text-gray-400 mb-2 font-bold">DEBIT</div>
<select id="nj-d-acc" class="input-field w-full mb-2">${accOptions}</select>
<input id="nj-d-amt" type="number" class="input-field w-full" placeholder="Jumlah">
</div>
<div class="border-t border-dk-500 pt-3">
<div class="text-xs text-gray-400 mb-2 font-bold">KREDIT</div>
<select id="nj-c-acc" class="input-field w-full mb-2">${accOptions}</select>
<input id="nj-c-amt" type="number" class="input-field w-full" placeholder="Jumlah">
</div>
</div>
<button class="btn-primary w-full py-2.5 text-sm mt-4" onclick="saveJournal()"><i class="fas fa-save mr-1"></i>Simpan Jurnal</button>
</div>`);
}

function saveJournal(){
const date=document.getElementById('nj-date').value;
const desc=document.getElementById('nj-desc').value.trim();
const dAcc=document.getElementById('nj-d-acc').value;
const dAmt=Number(document.getElementById('nj-d-amt').value);
const cAcc=document.getElementById('nj-c-acc').value;
const cAmt=Number(document.getElementById('nj-c-amt').value);
if(!date||!desc||!dAmt||!cAmt){toast('Lengkapi semua data!','error');return}
if(dAmt!==cAmt){toast('Debit dan Kredit harus seimbang!','error');return}
addJournal(date,desc,[{code:dAcc,debit:dAmt,credit:0},{code:cAcc,debit:0,credit:cAmt}]);
closeModal();toast('Jurnal berhasil ditambahkan!');renderPage();
}

// ---- BUKU BESAR ----
function renderBukuBesar(el){
const selectedAcc=S._bbAcc||'1110';
const acc=COA.find(a=>a.code===selectedAcc);
const entries=[];
S.journals.forEach(j=>{j.entries.forEach(e=>{if(e.code===selectedAcc)entries.push({date:j.date,desc:j.desc,debit:e.debit,credit:e.credit})})});
let runBal=0;
const rows=entries.map(e=>{
if(acc.debit)runBal+=e.debit-e.credit;else runBal+=e.credit-e.debit;
return`<tr>
<td class="text-xs text-gray-400">${fmtDate(e.date)}</td>
<td class="text-xs">${e.desc}</td>
<td class="text-xs text-right">${e.debit?fmtRp(e.debit):'-'}</td>
<td class="text-xs text-right">${e.credit?fmtRp(e.credit):'-'}</td>
<td class="text-xs text-right font-bold ${runBal>=0?'text-white':'text-red-400'}">${fmtRp(runBal)}</td>
</tr>`}).join('');

const accOptions=COA.map(a=>`<option value="${a.code}" ${a.code===selectedAcc?'selected':''}>${a.code} - ${a.name}</option>`).join('');

el.innerHTML=`<div class="fade-in">
<div class="flex items-center gap-4 mb-4">
<select class="input-field text-sm" onchange="S._bbAcc=this.value;renderPage()">${accOptions}</select>
<div class="text-sm text-gray-400">Saldo: <span class="font-bold text-gd-400">${fmtRp(getAccountBalance(selectedAcc))}</span></div>
</div>
<div class="card overflow-hidden"><div class="overflow-x-auto"><table class="w-full">
<thead><tr><th>Tanggal</th><th>Keterangan</th><th class="text-right">Debit</th><th class="text-right">Kredit</th><th class="text-right">Saldo</th></tr></thead>
<tbody>${rows||'<tr><td colspan="5" class="text-center text-gray-600 py-8">Tidak ada entri</td></tr>'}</tbody></table></div></div></div>`;
}

// ---- NERACA ----
function renderNeraca(el){
const bs=getBalanceSheet();
const today=new Date().toISOString().split('T')[0];

const asetLancarRows=bs.asetLancar.map(a=>`<tr><td class="text-xs pl-6">${a.name}</td><td class="text-xs text-right">${fmtRp(a.balance)}</td></tr>`).join('');
const asetTetapRows=bs.asetTetap.map(a=>`<tr><td class="text-xs pl-6">${a.name}</td><td class="text-xs text-right">${fmtRp(a.balance)}</td></tr>`).join('');
const kewajibanRows=bs.kewajiban.map(a=>`<tr><td class="text-xs pl-6">${a.name}</td><td class="text-xs text-right">${fmtRp(a.balance)}</td></tr>`).join('');
const ekuitasRows=bs.ekuitas.map(a=>`<tr><td class="text-xs pl-6">${a.name}</td><td class="text-xs text-right">${fmtRp(a.balance)}</td></tr>`).join('');

const balanced=Math.abs(bs.totalAset-bs.totalPasiva)<1;

el.innerHTML=`<div class="fade-in">
<div class="flex justify-between items-center mb-4">
<div class="text-sm text-gray-400">Per: <span class="font-bold text-white">${fmtDate(today)}</span></div>
<span class="badge ${balanced?'bg-emerald-500/20 text-emerald-400':'bg-red-500/20 text-red-400'}">${balanced?'Neraca Seimbang':'Neraca Tidak Seimbang'}</span>
</div>
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
<div class="card p-5">
<h3 class="font-bold text-sm mb-3 text-gd-400"><i class="fas fa-building mr-1"></i>ASET</h3>
<table class="w-full"><thead><tr><th>Akun</th><th class="text-right">Saldo</th></tr></thead>
<tbody>
<tr><td class="text-xs font-bold">Aset Lancar</td><td></td></tr>
 ${asetLancarRows}
<tr class="border-t-2 border-dk-400"><td class="text-xs font-bold pl-4">Total Aset Lancar</td><td class="text-xs text-right font-bold text-white">${fmtRp(bs.totalAsetLancar)}</td></tr>
<tr><td class="text-xs font-bold mt-2">Aset Tetap</td><td></td></tr>
 ${asetTetapRows}
<tr class="border-t-2 border-dk-400"><td class="text-xs font-bold pl-4">Total Aset Tetap</td><td class="text-xs text-right font-bold text-white">${fmtRp(bs.totalAsetTetap)}</td></tr>
</tbody>
<tfoot><tr class="border-t-4 border-gd-500/30"><td class="font-bold text-sm py-2">TOTAL ASET</td><td class="text-right font-black text-lg text-gd-400">${fmtRp(bs.totalAset)}</td></tr></tfoot>
</table></div>

<div class="card p-5">
<h3 class="font-bold text-sm mb-3 text-gd-400"><i class="fas fa-scale-balanced mr-1"></i>Kewajiban & Ekuitas</h3>
<table class="w-full"><thead><tr><th>Akun</th><th class="text-right">Saldo</th></tr></thead>
<tbody>
<tr><td class="text-xs font-bold">Kewajiban</td><td></td></tr>
 ${kewajibanRows}
<tr class="border-t-2 border-dk-400"><td class="text-xs font-bold pl-4">Total Kewajiban</td><td class="text-xs text-right font-bold text-white">${fmtRp(bs.totalKewajiban)}</td></tr>
<tr><td class="text-xs font-bold mt-2">Ekuitas</td><td></td></tr>
 ${ekuitasRows}
<tr><td class="text-xs pl-6">Laba Berjalan</td><td class="text-xs text-right">${fmtRp(bs.labaBerjalan)}</td></tr>
<tr class="border-t-2 border-dk-400"><td class="text-xs font-bold pl-4">Total Ekuitas</td><td class="text-xs text-right font-bold text-white">${fmtRp(bs.totalEkuitas)}</td></tr>
</tbody>
<tfoot><tr class="border-t-4 border-gd-500/30"><td class="font-bold text-sm py-2">TOTAL PASIVA</td><td class="text-right font-black text-lg text-gd-400">${fmtRp(bs.totalPasiva)}</td></tr></tfoot>
</table></div>
</div></div>`;
}

// ---- LABA RUGI ----
function renderLabaRugi(el){
const is=getIncomeStatement();
const today=new Date();const period=`1 - ${today.getDate()} ${today.toLocaleDateString('id-ID',{month:'long',year:'numeric'})}`;

const pendapatanRows=is.pendapatan.filter(a=>a.balance>0).map(a=>`<tr><td class="text-xs pl-6">${a.name}</td><td class="text-xs text-right">${fmtRp(a.balance)}</td></tr>`).join('');
const bebanRows=is.beban.filter(a=>a.balance>0).map(a=>`<tr><td class="text-xs pl-6">${a.name}</td><td class="text-xs text-right">${fmtRp(a.balance)}</td></tr>`).join('');

el.innerHTML=`<div class="fade-in">
<div class="text-sm text-gray-400 mb-4">Periode: <span class="font-bold text-white">${period}</span></div>
<div class="card p-6 max-w-2xl">
<table class="w-full">
<thead><tr><th colspan="2" class="text-center text-gd-400 text-base font-black pb-4">LAPORAN LABA RUGI<br><span class="text-xs font-normal text-gray-500">HayGroup - Konsolidasi</span></th></tr></thead>
<tbody>
<tr><td class="text-sm font-bold py-2">Pendapatan</td><td></td></tr>
 ${pendapatanRows}
<tr class="border-t-2 border-dk-400"><td class="text-sm font-bold pl-4">Total Pendapatan</td><td class="text-sm text-right font-bold text-white">${fmtRp(is.totalPendapatan)}</td></tr>
<tr><td class="text-sm font-bold py-2 mt-2">Harga Pokok Penjualan</td><td class="text-sm text-right text-red-400">(${fmtRp(is.hpp)})</td></tr>
<tr class="border-t-2 border-dk-400 bg-emerald-500/5"><td class="text-sm font-bold py-2">Laba Kotor</td><td class="text-sm text-right font-bold text-emerald-400">${fmtRp(is.labaKotor)}</td></tr>
<tr><td class="text-sm font-bold py-2 mt-2">Beban Operasional</td><td></td></tr>
 ${bebanRows.filter(r=>!r.includes('5110'))}
<tr class="border-t-2 border-dk-400"><td class="text-sm font-bold pl-4">Total Beban Operasional</td><td class="text-sm text-right text-red-400">(${fmtRp(is.bebanOps)})</td></tr>
<tr class="border-t-4 border-gd-500/30 bg-gd-500/5"><td class="font-bold text-base py-3">LABA BERSIH</td><td class="text-right font-black text-xl ${is.labaBersih>=0?'text-emerald-400':'text-red-400'}">${fmtRp(is.labaBersih)}</td></tr>
</tbody></table></div></div>`;
}

// ---- ARUS KAS ----
function renderArusKas(el){
const kasDr=S.journals.reduce((s,j)=>{const e=j.entries.find(e=>e.code==='1110');return e?s+e.debit:0},0);
const kasCr=S.journals.reduce((s,j)=>{const e=j.entries.find(e=>e.code==='1110');return e?s+e.credit:0},0);

// Arus kas dari aktivitas operasional (pendapatan & beban)
const opIn=S.journals.reduce((s,j)=>{return s+j.entries.filter(e=>e.code.startsWith('4')&&e.credit).reduce((ss,e)=>ss+e.credit,0)},0);
const opOut=S.journals.reduce((s,j)=>{return s+j.entries.filter(e=>e.code.startsWith('5')&&e.debit).reduce((ss,e)=>ss+e.debit,0)},0);
const opNet=opIn-opOut;

// Aktivitas investasi (aset tetap)
const invOut=S.journals.reduce((s,j)=>{return s+j.entries.filter(e=>e.code.startsWith('12')&&e.debit).reduce((ss,e)=>ss+e.debit,0)},0);
const invIn=S.journals.reduce((s,j)=>{return s+j.entries.filter(e=>e.code.startsWith('12')&&e.credit).reduce((ss,e)=>ss+e.credit,0)},0);
const invNet=invIn-invOut;

// Aktivitas pendanaan (modal)
const finIn=S.journals.reduce((s,j)=>{return s+j.entries.filter(e=>e.code.startsWith('3')&&e.credit).reduce((ss,e)=>ss+e.credit,0)},0);
const finOut=S.journals.reduce((s,j)=>{return s+j.entries.filter(e=>e.code.startsWith('3')&&e.debit).reduce((ss,e)=>ss+e.debit,0)},0);
const finNet=finIn-finOut;

const saldoKas=getAccountBalance('1110');

el.innerHTML=`<div class="fade-in">
<div class="card p-6 max-w-2xl">
<table class="w-full">
<thead><tr><th colspan="2" class="text-center text-gd-400 text-base font-black pb-4">LAPORAN ARUS KAS<br><span class="text-xs font-normal text-gray-500">HayGroup - Konsolidasi</span></th></tr></thead>
<tbody>
<tr><td class="text-sm font-bold py-2 text-sky-400"><i class="fas fa-cog mr-1"></i>Aktivitas Operasional</td><td></td></tr>
<tr><td class="text-xs pl-6">Penerimaan dari pelanggan</td><td class="text-xs text-right text-emerald-400">${fmtRp(opIn)}</td></tr>
<tr><td class="text-xs pl-6">Pembayaran beban operasional</td><td class="text-xs text-right text-red-400">(${fmtRp(opOut)})</td></tr>
<tr class="border-t-2 border-dk-400"><td class="text-sm font-bold pl-4">Arus Kas Bersih - Operasional</td><td class="text-sm text-right font-bold ${opNet>=0?'text-emerald-400':'text-red-400'}">${fmtRp(opNet)}</td></tr>

<tr><td class="text-sm font-bold py-2 mt-3 text-amber-400"><i class="fas fa-chart-pie mr-1"></i>Aktivitas Investasi</td><td></td></tr>
<tr><td class="text-xs pl-6">Pembelian aset tetap</td><td class="text-xs text-right text-red-400">(${fmtRp(invOut)})</td></tr>
 ${invIn>0?`<tr><td class="text-xs pl-6">Penjualan aset tetap</td><td class="text-xs text-right text-emerald-400">${fmtRp(invIn)}</td></tr>`:''}
<tr class="border-t-2 border-dk-400"><td class="text-sm font-bold pl-4">Arus Kas Bersih - Investasi</td><td class="text-sm text-right font-bold ${invNet>=0?'text-emerald-400':'text-red-400'}">${fmtRp(invNet)}</td></tr>

<tr><td class="text-sm font-bold py-2 mt-3 text-purple-400"><i class="fas fa-hand-holding-dollar mr-1"></i>Aktivitas Pendanaan</td><td></td></tr>
<tr><td class="text-xs pl-6">Setoran modal</td><td class="text-xs text-right text-emerald-400">${fmtRp(finIn)}</td></tr>
 ${finOut>0?`<tr><td class="text-xs pl-6">Pengembalian modal</td><td class="text-xs text-right text-red-400">(${fmtRp(finOut)})</td></tr>`:''}
<tr class="border-t-2 border-dk-400"><td class="text-sm font-bold pl-4">Arus Kas Bersih - Pendanaan</td><td class="text-sm text-right font-bold ${finNet>=0?'text-emerald-400':'text-red-400'}">${fmtRp(finNet)}</td></tr>

<tr class="border-t-4 border-gd-500/30 bg-gd-500/5"><td class="font-bold text-base py-3">Kenaikan/(Penurunan) Kas Bersih</td><td class="text-right font-black text-xl ${opNet+invNet+finNet>=0?'text-emerald-400':'text-red-400'}">${fmtRp(opNet+invNet+finNet)}</td></tr>
<tr><td class="text-sm font-bold py-1">Saldo Kas Awal</td><td class="text-sm text-right">Rp 0</td></tr>
<tr class="border-t-2 border-dk-400"><td class="font-bold text-sm py-2">Saldo Kas Akhir</td><td class="text-right font-bold text-gd-400">${fmtRp(saldoKas)}</td></tr>
</tbody></table></div></div>`;
}

// ============================================================
// INISIALISASI APLIKASI
// ============================================================
function initClock(){
const update=()=>{const n=new Date();document.getElementById('clock').textContent=n.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})};
update();setInterval(update,1000);
}

document.addEventListener('DOMContentLoaded',()=>{
initSampleData();
renderSidebar();
setBranch('all');
navigate('dashboard');
initClock();
});
</script>
</body>
</html>
