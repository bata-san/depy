const defaultDesign=t=>({type:t,name:t==='cpu'?'Frontier C1':t==='gpu'?'Frontier G1':'Frontier Station',market:'gaming',concept:'balanced',price:t==='cpu'?28000:t==='gpu'?46000:128000,values:Object.fromEntries(TYPES[t].params.map(p=>[p[0],p[4]])),tech:Object.fromEntries(TECH[t].map(x=>[x[0],x[2][0]])),parts:{cpu:'i5-4690k',gpu:'gtx970',memory:'ddr3',storage:'840evo',board:'z97',psu:'g550',case:'r5case'}});
const initial=()=>({year:2015,week:1,money:18000000,rp:180,brand:12,tab:'design',designType:'cpu',speed:1,designs:{cpu:defaultDesign('cpu'),gpu:defaultDesign('gpu'),pc:defaultDesign('pc')},research:{},staff:STAFF.slice(0,4).map((x,i)=>({id:uid(),role:x[0],name:['佐藤','高橋','鈴木','田中'][i],skill:x[3],level:1,fatigue:0})),projects:[],products:[],log:['2015年：小さな研究室からPC Frontier Labが始動した。'],marketEvent:null});
let state;try{state=JSON.parse(localStorage.getItem('pfl-save'))||initial()}catch{state=initial()}
let sceneApi=null,modal=null,toastTimer;
const save=()=>localStorage.setItem('pfl-save',JSON.stringify(state));
const current=()=>state.designs[state.designType];
const yearAvailable=p=>p.year<=state.year;
const partsOf=t=>PARTS.filter(p=>p.type===t&&yearAvailable(p));
const getPart=id=>PARTS.find(p=>p.id===id)||state.products.find(p=>p.id===id);
function limits(type,p){let max=p[3];if(type==='cpu'&&p[0]==='cores')max=Math.min(max,8+(state.research.cpuCore||0)*8);if(type==='cpu'&&p[0]==='clock')max=Math.min(max,4.5+(state.research.cpuClock||0)*.5);if(type==='gpu'&&p[0]==='units')max=Math.min(max,48+(state.research.gpuScale||0)*28);return[p[2],max]}
function techLocked(type,key,val){if(key==='layout'&&val==='チップレット'&&!state.research.chiplet)return true;if(key==='process'&&val==='10nm'&&!state.research.node10)return true;if(key==='process'&&['7nm','5nm','3nm'].includes(val)&&!state.research.node7)return true;if(key==='features'&&val==='RT対応'&&!state.research.rt)return true;if(key==='features'&&val==='RT+AI'&&!state.research.ai)return true;if((key==='memory'&&val==='DDR5')&&!state.research.ddr5)return true;return false}
