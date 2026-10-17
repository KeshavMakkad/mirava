// @ts-nocheck
/* eslint-disable */
/**
 * Lost Legends of Bharat — WebGL2 heritage adventure, ported from legacy/game.html.
 * The engine is kept verbatim as an imperative module; changes vs. legacy:
 *  - DOM lookups are scoped to `appRoot`, all listeners/timers/RAF/audio are torn down on cleanup.
 *  - Progress (was localStorage 'mirava-lost-legends-3d-v2') lives in the Mirava state API.
 *  - The 'virasat:complete' event is replaced by ctx.submitScore('lost-legends', ...).
 */
export function initLostLegends(appRoot, ctx, hooks = {}) {
  const STORE_KEY = 'mirava-lost-legends-3d-v2';
  const cleanups = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  const timers = new Set();
  const setTimeout = (fn, ms) => {
    const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
  };
  let disposed = false, resizeObs = null, pendingSave = null, saveTimer = 0, submitted = false;
  const flushSave = () => {
    if (saveTimer) { window.clearTimeout(saveTimer); saveTimer = 0; }
    if (pendingSave) { const v = pendingSave; pendingSave = null; ctx.saveState(STORE_KEY, v); }
  };
  const queueRemoteSave = (snap) => {
    pendingSave = snap;
    if (!saveTimer) saveTimer = window.setTimeout(() => { saveTimer = 0; flushSave(); }, 1500);
  };
  const submitCompletion = (detail) => {
    if (submitted) return;
    submitted = true;
    ctx.submitScore('lost-legends', {
      score: detail.xp, time_taken_seconds: detail.seconds, completed: true,
      meta: { stars: detail.stars, lamps: detail.lamps },
    }).then((res) => {
      if (!res || disposed) return;
      hooks.onScore?.(res);
      const badges = (res.new_badges || []).map((b) => `${b.icon || '✦'} ${b.name}`).join(', ');
      notify(`+${res.xp_earned} Mirava XP`, badges ? `New badge${res.new_badges.length > 1 ? 's' : ''}: ${badges}` : `Total: ${res.total_xp} XP. Best Chronicle: ${res.best_score} XP.`, 6);
    });
  };

const $=id=>appRoot.querySelector('#'+id);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2;
const coarse=matchMedia('(pointer:coarse)').matches, STORE='mirava-lost-legends-3d-v2';
let reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,quality=coarse?0:1;
const canvas=$('scene'),root=$('app');
let gl,showcase=false;
try{gl=canvas.getContext('webgl2',{antialias:!coarse,alpha:true,powerPreference:'high-performance'});}catch(e){}
if(!gl){$('loading').hidden=true;$('title').hidden=true;$('error').hidden=false;return;}

// A small instanced WebGL2 renderer. All geometry, lighting, shadows and audio are generated here.
const vertex=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNorm;
layout(location=2) in mat4 aModel;
layout(location=6) in vec4 aTint;
uniform mat4 uVP;uniform mat4 uLight;
out vec3 vWorld;out vec3 vNormal;out vec4 vTint;out vec4 vShadow;
void main(){vec4 p=aModel*vec4(aPos,1.);vWorld=p.xyz;
vec3 s2=vec3(dot(aModel[0].xyz,aModel[0].xyz),dot(aModel[1].xyz,aModel[1].xyz),dot(aModel[2].xyz,aModel[2].xyz));
vNormal=normalize(mat3(aModel)*(aNorm/max(s2,vec3(.00001))));vTint=aTint;vShadow=uLight*p;gl_Position=uVP*p;}`;
const fragment=`#version 300 es
precision highp float;
in vec3 vWorld;in vec3 vNormal;in vec4 vTint;in vec4 vShadow;
uniform sampler2D uShadow;uniform vec3 uEye;uniform float uTime;uniform float uShadowTexel;
out vec4 outColor;
float hash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
void main(){vec3 n=normalize(vNormal);vec3 light=normalize(vec3(-.48,.81,.34));vec3 view=normalize(uEye-vWorld);
vec3 sc=vShadow.xyz/vShadow.w*.5+.5;float shadow=0.;float bias=max(.0015,.0035*(1.-dot(n,light)));
if(sc.x>0.&&sc.x<1.&&sc.y>0.&&sc.y<1.&&sc.z<1.){for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float d=texture(uShadow,sc.xy+vec2(float(x),float(y))*uShadowTexel).r;shadow+=sc.z-bias>d?1.:0.;}shadow/=9.;}
float diffuse=max(dot(n,light),0.);float hemi=n.y*.5+.5;
vec3 base=vTint.rgb;float grain=(hash(floor(vWorld*34.))-.5)*.018;
vec3 lit=(base+grain)*(mix(vec3(.25,.32,.33),vec3(.47,.53,.51),hemi)+vec3(.69,.58,.43)*diffuse*(1.-shadow*.72));
if(vTint.a>.5&&vTint.a<1.5){lit=base*(1.05+.09*sin(uTime*2.+vWorld.x*2.));}
if(vTint.a>1.5){vec3 wn=normalize(n+vec3(sin(vWorld.x*3.+uTime*1.7)*.12,0.,cos(vWorld.z*3.7+uTime*1.3)*.12));float fres=pow(1.-max(dot(wn,view),0.),3.);float spec=pow(max(dot(reflect(-light,wn),view),0.),65.);float rip=sin(vWorld.x*5.+uTime*1.9+sin(vWorld.z*3.))*sin(vWorld.z*6.-uTime*1.4);lit=mix(base*.8,vec3(.6,.82,.72),fres*.65)+spec*.65+rip*.025;}
float fog=smoothstep(72.,190.,length(uEye-vWorld));lit=mix(lit,vec3(.45,.57,.44),fog*.88);lit=clamp(lit,0.,1.);outColor=vec4(lit,1.);}`;
const shadowFragment=`#version 300 es
precision highp float;in vec4 vTint;void main(){if(vTint.a>.5)discard;}`;
function program(v,f){const p=gl.createProgram();for(const [type,src] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);gl.deleteShader(s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));const u={};for(const name of ['uVP','uLight','uShadow','uEye','uTime','uShadowTexel'])u[name]=gl.getUniformLocation(p,name);return {p,u};}
function identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
function perspective(fov,aspect,n,f){const t=1/Math.tan(fov/2);return new Float32Array([t/aspect,0,0,0,0,t,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0]);}
function ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);}
function norm(v){const l=Math.hypot(...v)||1;return v.map(x=>x/l);}function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function lookAt(e,t){const z=norm(e.map((v,i)=>v-t[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,e),-dot(y,e),-dot(z,e),1]);}
function inverse(a){const o=new Float32Array(16),m=Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>c<4?a[c*4+r]:(c-4===r?1:0)));for(let c=0;c<4;c++){let k=c;for(let r=c+1;r<4;r++)if(Math.abs(m[r][c])>Math.abs(m[k][c]))k=r;[m[k],m[c]]=[m[c],m[k]];const d=m[c][c];if(Math.abs(d)<1e-12)return identity();for(let j=0;j<8;j++)m[c][j]/=d;for(let r=0;r<4;r++)if(r!==c){const q=m[r][c];for(let j=0;j<8;j++)m[r][j]-=q*m[c][j];}}for(let r=0;r<4;r++)for(let c=0;c<4;c++)o[c*4+r]=m[r][c+4];return o;}
function transformPoint(m,x,y,z,w=1){const p=[m[0]*x+m[4]*y+m[8]*z+m[12]*w,m[1]*x+m[5]*y+m[9]*z+m[13]*w,m[2]*x+m[6]*y+m[10]*z+m[14]*w,m[3]*x+m[7]*y+m[11]*z+m[15]*w];return p;}
const batches=new Map(), colorCache=new Map();let staticMode=true;
function rgb(h){if(colorCache.has(h))return colorCache.get(h);const c=parseInt(h.replace('#',''),16),a=[(c>>16&255)/255,(c>>8&255)/255,(c&255)/255];colorCache.set(h,a);return a;}
function makeMesh(name,arr){const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW);const b={count:arr.length/6,static:[],dynamic:new Float32Array(2048*20),n:0};function slot(){const vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,vb);for(let i=0;i<2;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,24,i*12);}const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);for(let i=0;i<4;i++){gl.enableVertexAttribArray(2+i);gl.vertexAttribPointer(2+i,4,gl.FLOAT,false,80,i*16);gl.vertexAttribDivisor(2+i,1);}gl.enableVertexAttribArray(6);gl.vertexAttribPointer(6,4,gl.FLOAT,false,80,64);gl.vertexAttribDivisor(6,1);return{vao,buf,count:0};}b.s=slot();b.d=slot();batches.set(name,b);}
function tri(out,a,b,c,na,nb=na,nc=na){out.push(...a,...na,...b,...nb,...c,...nc);}
function createGeometry(){
 let a=[];for(const [n,u,v] of [[[1,0,0],[0,0,-1],[0,1,0]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[1,0,0],[0,0,-1]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]]]){const p=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>n.map((q,i)=>(q+x*u[i]+y*v[i])*.5));tri(a,p[0],p[1],p[2],n);tri(a,p[0],p[2],p[3],n);}makeMesh('box',a);
 for(const [name,top,segments] of [['cyl',1,16],['cone',0,16],['roof',0,4]]){a=[];for(let i=0;i<segments;i++){const t=i/segments*TAU,s=(i+1)/segments*TAU,p=[Math.cos(t),-.5,Math.sin(t)],q=[Math.cos(s),-.5,Math.sin(s)],r=[top*Math.cos(t),.5,top*Math.sin(t)],u=[top*Math.cos(s),.5,top*Math.sin(s)],n=norm([Math.cos(t),1-top,Math.sin(t)]),m=norm([Math.cos(s),1-top,Math.sin(s)]);tri(a,p,r,u,n,n,m);tri(a,p,u,q,n,m,m);tri(a,[0,-.5,0],p,q,[0,-1,0]);if(top)tri(a,[0,.5,0],u,r,[0,1,0]);}makeMesh(name,a);}
 a=[];const rings=9,segments=16;for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const point=(y,x)=>[Math.sin(y/rings*Math.PI)*Math.cos(x/segments*TAU),Math.cos(y/rings*Math.PI),Math.sin(y/rings*Math.PI)*Math.sin(x/segments*TAU)];let p=point(j,i),q=point(j,i+1),r=point(j+1,i),s=point(j+1,i+1);tri(a,p,q,s,p,q,s);tri(a,p,s,r,p,s,r);}makeMesh('sphere',a);
 a=[];for(let i=0;i<32;i++)for(let j=0;j<6;j++){const at=(u,v)=>{const t=u/32*TAU,s=v/6*TAU;return{p:[(1+.065*Math.cos(s))*Math.cos(t),.065*Math.sin(s),(1+.065*Math.cos(s))*Math.sin(t)],n:[Math.cos(s)*Math.cos(t),Math.sin(s),Math.cos(s)*Math.sin(t)]};};const p=at(i,j),q=at(i+1,j),r=at(i,j+1),s=at(i+1,j+1);tri(a,p.p,s.p,q.p,p.n,s.n,q.n);tri(a,p.p,r.p,s.p,p.n,r.n,s.n);}makeMesh('ring',a);
}
function inst(name,x,y,z,sx,sy,sz,color,ry=0,rx=0,rz=0,kind=0){const b=batches.get(name);let a,i;if(staticMode){a=b.static;i=a.length;}else{if((b.n+1)*20>b.dynamic.length){const next=new Float32Array(b.dynamic.length*2);next.set(b.dynamic);b.dynamic=next;}a=b.dynamic;i=b.n++*20;}
 const cy=Math.cos(ry),yy=Math.sin(ry),cx=Math.cos(rx),xx=Math.sin(rx),cz=Math.cos(rz),zz=Math.sin(rz),c=rgb(color);
 a[i]= (cy*cz+yy*xx*zz)*sx;a[i+1]=cx*zz*sx;a[i+2]=(-yy*cz+cy*xx*zz)*sx;a[i+3]=0;
 a[i+4]=(-cy*zz+yy*xx*cz)*sy;a[i+5]=cx*cz*sy;a[i+6]=(yy*zz+cy*xx*cz)*sy;a[i+7]=0;
 a[i+8]=yy*cx*sz;a[i+9]=-xx*sz;a[i+10]=cy*cx*sz;a[i+11]=0;
 a[i+12]=x;a[i+13]=y;a[i+14]=z;a[i+15]=1;a[i+16]=c[0];a[i+17]=c[1];a[i+18]=c[2];a[i+19]=kind;
}
const box=(x,y,z,sx,sy,sz,c,ry=0,rx=0,rz=0,k=0)=>inst('box',x,y,z,sx,sy,sz,c,ry,rx,rz,k);
const sphere=(x,y,z,sx,sy,sz,c,k=0)=>inst('sphere',x,y,z,sx,sy,sz,c,0,0,0,k);
let mainProgram,depthProgram,shadowFB,shadowTexture,shadowSize;
const lightVP=mul(ortho(-76,76,-76,76,1,230),lookAt([-62,105,45],[0,0,0]));
function initRenderer(){mainProgram=program(vertex,fragment);depthProgram=program(vertex,shadowFragment);createGeometry();shadowSize=coarse?1024:2048;shadowTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,shadowTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,shadowSize,shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);shadowFB=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFB);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTexture,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('A depth-buffer could not be created.');gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);}
function commitStatic(){for(const b of batches.values()){b.s.count=b.static.length/20;gl.bindBuffer(gl.ARRAY_BUFFER,b.s.buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(b.static),gl.STATIC_DRAW);b.static.length=0;}staticMode=false;}
function uploadDynamic(){for(const b of batches.values()){b.d.count=b.n;if(b.n){gl.bindBuffer(gl.ARRAY_BUFFER,b.d.buf);gl.bufferData(gl.ARRAY_BUFFER,b.dynamic.subarray(0,b.n*20),gl.DYNAMIC_DRAW);}}}
function drawBatches(){for(const b of batches.values())for(const slot of (showcase?[b.d]:[b.s,b.d]))if(slot.count){gl.bindVertexArray(slot.vao);gl.drawArraysInstanced(gl.TRIANGLES,0,b.count,slot.count);}}
let viewProj=identity(),invView=identity(),eye=[20,23,28],camTarget=[0,1,0],yaw=.35,pitch=.66,distance=17,firstPerson=false,width=1,height=1;
function resize(){const r=root.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);const dpr=Math.min(devicePixelRatio||1,quality===0?1:quality===1?1.5:2);const w=Math.round(width*dpr),h=Math.round(height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
function render(t){uploadDynamic();gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFB);gl.viewport(0,0,shadowSize,shadowSize);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(depthProgram.p);gl.uniformMatrix4fv(depthProgram.u.uVP,false,lightVP);gl.uniformMatrix4fv(depthProgram.u.uLight,false,lightVP);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);drawBatches();gl.disable(gl.POLYGON_OFFSET_FILL);
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(mainProgram.p);gl.uniformMatrix4fv(mainProgram.u.uVP,false,viewProj);gl.uniformMatrix4fv(mainProgram.u.uLight,false,lightVP);gl.uniform3fv(mainProgram.u.uEye,eye);gl.uniform1f(mainProgram.u.uTime,t);gl.uniform1f(mainProgram.u.uShadowTexel,1/shadowSize);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,shadowTexture);gl.uniform1i(mainProgram.u.uShadow,0);drawBatches();gl.bindVertexArray(null);}

// Six individual vector character illustrations; no font file is embedded.
const BRAHMI={"ka": "<svg viewBox=\"13 -779 728 844\" aria-label=\"Brahmi ka\" role=\"img\"><path transform=\"scale(1,-1)\" d=\"M332 0V333H78V412H332V714H422V412H676V333H422V0Z\"/></svg>", "ga": "<svg viewBox=\"-16 -779 691 844\" aria-label=\"Brahmi ga\" role=\"img\"><path transform=\"scale(1,-1)\" d=\"M284 714H375L610 0H510L329 599L148 0H49Z\"/></svg>", "da": "<svg viewBox=\"33 -779 416 844\" aria-label=\"Brahmi da\" role=\"img\"><path transform=\"scale(1,-1)\" d=\"M98 0V189H129Q175 189 212.0 208.0Q249 227 271.5 261.5Q294 296 294 341Q294 408 248.0 450.5Q202 493 129 493H98V714H187V563Q272 556 329 493Q384 432 384 339Q384 281 359.5 233.5Q335 186 291.0 156.0Q247 126 187 119V0Z\"/></svg>", "na": "<svg viewBox=\"-16 -779 570 844\" aria-label=\"Brahmi na\" role=\"img\"><path transform=\"scale(1,-1)\" d=\"M314 714V80H489V0H49V80H224V714Z\"/></svg>", "ma": "<svg viewBox=\"13 -779 672 856\" aria-label=\"Brahmi ma\" role=\"img\"><path transform=\"scale(1,-1)\" d=\"M347 -12Q246 -12 191.0 37.0Q136 86 136 174Q136 241 169.0 294.5Q202 348 272 394Q208 432 165.0 470.5Q122 509 100.0 557.5Q78 606 78 674V714H168V674Q168 612 194.0 570.5Q220 529 261.5 499.5Q303 470 349 442Q396 470 437.0 500.0Q478 530 504.0 571.0Q530 612 530 674V714H620V674Q620 606 598.0 558.0Q576 510 533.0 472.0Q490 434 427 395Q499 348 530.5 294.0Q562 240 562 174Q562 85 506.5 36.5Q451 -12 347 -12ZM347 72Q404 72 435.5 98.0Q467 124 467 178Q467 229 439.0 270.5Q411 312 351 350Q290 312 260.5 270.5Q231 229 231 178Q231 125 262.0 98.5Q293 72 347 72Z\"/></svg>", "ra": "<svg viewBox=\"52 -779 220 844\" aria-label=\"Brahmi ra\" role=\"img\"><path transform=\"scale(1,-1)\" d=\"M117 0V714H207V0Z\"/></svg>"};

// -----------------------------------------------------------------------------
// Heritage content. Historical anchors are short paraphrases of the listed
// primary sources. All characters, routes, dilemmas and replicas are fictional.
// -----------------------------------------------------------------------------
const SOURCES={
 dholavira:['UNESCO: Dholavira','https://whc.unesco.org/en/list/1645/'],
 mithila:['Government of Bihar: Madhubani painting','https://madhubani.nic.in/handicraft/'],
 ashoka:['ASI: Bharat SHRI inscriptions','https://bharatshri.asi.gov.in/gallery?lang=en'],
 ajanta:['UNESCO: Ajanta Caves','https://whc.unesco.org/en/list/242/'],
 hampi:['UNESCO: Hampi','https://whc.unesco.org/en/list/241/'],
 konark:['UNESCO: Sun Temple, Konarak','https://whc.unesco.org/en/list/246/'],
 nalanda:['UNESCO: Nalanda Mahavihara','https://whc.unesco.org/en/list/1502/'],
 brahmi:['Unicode: Brahmi character names','https://www.unicode.org/charts/nameslist/n_11000.html']
};
const SITES=[
 {id:'mithila',name:'Mithila Grove',region:'Bihar / Living traditions',x:-27,z:23,color:'#c68b52',npc:'Tara, the painter',job:'memory',challenge:'The painter\'s memory',clue:'Follow the hand-painted cloths to the west.',fact:'Madhubani, also called Mithila painting, uses linework, bright colours, patterns and motifs drawn from nature and mythology.',period:'Living tradition',relic:'The painted leaf'},
 {id:'ashoka',name:'Ashoka\'s Pillar',region:'Mauryan inscriptions',x:-37,z:-10,color:'#c8b981',npc:'Dev, the reader',job:'scripts',challenge:'Voices from the Stones',clue:'Look for the tall pillar in the north-west.',fact:'Ashokan inscriptions preserve messages in different languages and scripts. ASI records Prakrit-Brahmi examples as well as Greek and Aramaic inscriptions.',period:'3rd century BCE',relic:'The reader\'s tablet'},
 {id:'ajanta',name:'Ajanta Caves',region:'Maharashtra / Rock-cut art',x:-18,z:-36,color:'#797958',npc:'Mira, the conservator',job:'lens',challenge:'The Time Lens',clue:'The cliff with three doorways is in the north.',fact:'Ajanta contains Buddhist rock-cut monuments, paintings and sculptures, with early caves and later richly decorated additions.',period:'2nd century BCE - 6th century CE',relic:'The mural fragment'},
 {id:'dholavira',name:'Dholavira Reservoirs',region:'Gujarat / Harappan planning',x:20,z:-33,color:'#ccb67d',npc:'Asha, the field keeper',job:'water',challenge:'Water for a city',clue:'Follow the pale stone terraces in the north-east.',fact:'Dholavira shows sophisticated Harappan urban planning, reservoirs, drainage, stone construction and evidence of interregional exchange.',period:'3rd - mid-2nd millennium BCE',relic:'The reservoir stone'},
 {id:'hampi',name:'Hampi Pavilion',region:'Karnataka / Vijayanagara',x:38,z:-2,color:'#bca775',npc:'Ravi, the musician',job:'rhythm',challenge:'The rhythm of stone',clue:'Listen for the pavilion beyond the eastern bridge.',fact:'Hampi preserves remains of the Vijayanagara capital, including temples, palaces, market streets and water structures. This game\'s music is an original electronic composition.',period:'14th - 16th centuries CE',relic:'The resonant pillar'},
 {id:'konark',name:'Konark Sun Court',region:'Odisha / Stone architecture',x:27,z:31,color:'#c39057',npc:'Leela, the caretaker',job:'rings',challenge:'Turn toward the sun',clue:'Find the great carved wheel in the south-east.',fact:'The 13th-century Sun Temple at Konark is conceived as the chariot of Surya, with elaborate carved wheels. The linked-ring lock here is invented.',period:'13th century CE',relic:'The sun-wheel medallion'},
 {id:'nalanda',name:'Nalanda Courtyard',region:'Bihar / A place of learning',x:-7,z:43,color:'#ae6e48',npc:'Saraswati, keeper of stories',job:'quiz',challenge:'The gathering of knowledge',clue:'The brick courtyard and its tower are to the south.',fact:'Nalanda\'s archaeological remains include stupas, shrines and residential and educational buildings from a long-lived monastic and scholastic institution.',period:'3rd century BCE - 13th century CE',relic:'The scholar\'s folio'}
];
const ARTS=[
 {id:'seal',name:'A seal-like tablet',group:'Exchange & evidence',type:'seal',era:'Harappan-inspired game replica',source:'dholavira',evidence:[['Cut grooves','Repeated carved marks look intentional. A pattern alone does not tell us what a sign means.'],['Worn edge','The edge shows use or wear. That does not by itself identify the owner.'],['Find context','The fictional excavation notebook places it near a storage area with weights. Context makes an exchange-related use plausible.']],question:'Which conclusion respects the evidence?',options:['We have translated the name of its owner.','It may relate to marking or exchange, but its exact message is unknown.','All seals were identical and had one meaning.'],answer:1,lesson:'Compare an object with its find context. Do not invent a translation for unfamiliar signs.'},
 {id:'pot',name:'A pottery fragment',group:'Materials & daily life',type:'pot',era:'Fictional teaching specimen',source:'dholavira',evidence:[['Curved profile','The surviving curve suggests that this piece came from a rounded vessel.'],['Painted band','A band repeats across the surface; decoration is evidence, but does not identify one person.'],['Broken edge','The cross-section shows fired clay. The original size would need more measurements and comparable finds.']],question:'What is supported by these observations?',options:['It is a fragment of a ceramic vessel; its original contents are not established.','It belonged to a king and held precious jewels.','Its painted band gives an exact year.'],answer:0,lesson:'Describe material, shape and uncertainty before assigning a story to an object.'},
 {id:'coin',name:'A worn token',group:'Objects & interpretation',type:'coin',era:'Fictional teaching specimen',source:'ashoka',evidence:[['Round form','The small, flattened form could be held, exchanged or carried.'],['Raised mark','The surviving emblem may help comparison, but it is not a complete inscription.'],['Missing context','The notebook has no reliable find location. We must record that gap, not guess around it.']],question:'What should a careful investigator do next?',options:['Announce a ruler and date immediately.','Polish away the surface until it is shiny.','Document it and compare securely dated examples before claiming a date.'],answer:2,lesson:'Missing context limits certainty. Documentation and comparison are stronger than a confident guess.'}
];
const STORIES=[
 {title:'When the reservoir runs low',speaker:'Leela brings a village council together.',text:'The next rains are uncertain. There is enough stored water for a short period, but families, fields and a damaged channel all need attention.',choices:[['Share drinking water first, repair the leak, then agree on a ration.','Asha organises the repair with you. The council records a common schedule.',[2,2,1]],['Give the fields a larger share to protect the next harvest.','Farmers are relieved, but households request a separate reserve. Future food and immediate needs must both be considered.',[0,-1,3]],['Hold most water in reserve until the rains are clearer.','Storage lasts longer, but some immediate needs go unmet. The council asks when reserves should be released.',[1,-2,0]]],link:'Water structures matter together with maintenance, allocation and collective decisions. This scenario is invented, not a recorded ancient policy.'},
 {title:'A mural and its missing corner',speaker:'Mira asks for your judgement.',text:'Visitors find a damaged painting hard to understand. A volunteer offers to repaint the missing area from imagination.',choices:[['Repaint it so the image looks complete.','The image looks clearer, but visitors cannot distinguish old work from your new interpretation.',[0,-1,1]],['Preserve the surviving surface; show a separately labelled digital interpretation.','Mira creates a comparison panel. Visitors see what survives and what has been imagined.',[1,3,2]],['Cover it entirely so nobody sees the damage.','The surface is hidden from view, but an opportunity to explain its history is lost.',[1,0,-1]]],link:'The Time Lens keeps surviving evidence separate from interpretation. Real conservation requires qualified expertise.'},
 {title:'The price of a living tradition',speaker:'Tara returns from the marketplace.',text:'A trader asks Tara for many paintings very quickly and wants to remove the artist names. The order would bring income, but it could change the work and its credit.',choices:[['Accept immediately and remove the names.','The order brings quick work, but artists lose visible authorship and control.',[0,-1,2]],['Refuse all future trade.','The designs stay under the artists\' control, but one possible source of income disappears.',[0,1,-1]],['Negotiate fair time, pay and artist credit.','The order is smaller but the artists retain credit and agree on what they can make.',[1,3,2]]],link:'Living heritage involves people, skill, livelihoods and agency, not only objects in a museum.'}
];
const LENS_POINTS=[
 {name:'The colonnade',look:'Compare the surviving bases with a possible arrangement of pillars above them.',question:'What can a row of surviving bases support?',answers:['A hypothesis about where columns stood.','Proof of the exact colour of every column.'],answer:0,lesson:'The bases can constrain a reconstruction, but missing details still need evidence.'},
 {name:'The painted chamber',look:'Compare the muted chamber with our colourful interpretation. The pattern is original artwork.',question:'Is the complete painted wall a photograph of ancient Ajanta?',answers:['Yes, every part is known exactly.','No. It is a labelled, heritage-inspired interpretation.'],answer:1,lesson:'Original surviving paintings and a game artist\'s imagined completion must not be confused.'},
 {name:'The roof line',look:'Observe how a complete upper structure changes the silhouette, even though the surviving lower plan is the same.',question:'How should an uncertain reconstruction be presented?',answers:['With its assumptions and uncertainty clearly identified.','As an exact historical fact because it looks convincing.'],answer:0,lesson:'A plausible visual model is not automatically a verified reconstruction.'}
];
const QUIZ=[
 ['Which clue is strongest when studying an object?',['Only how beautiful it looks','Its material together with a recorded find context','An exciting story someone guesses'],1],
 ['Dholavira especially highlights which engineering theme?',['Reservoirs and water management','Electric power stations','Railway signalling'],0],
 ['What does the Time Lens show?',['A literal recording from the past','The same historical year at every place','A labelled artistic interpretation beside imagined ruins'],2],
 ['Mithila painting is also known as ...',['Madhubani painting','A modern computer code','A kind of reservoir'],0],
 ['Why should a trader compare routes?',['Only the shortest line matters','Terrain, water and supplies affect the journey','Every route costs the same'],1],
 ['What was important at Nalanda?',['Organised learning and monastic life','Motor manufacturing','Satellite launches'],0],
 ['What belongs in a good Living Codex?',['Only a score','Certain-sounding guesses','Evidence, connections, sources and uncertainty'],2]
];
const FRAGMENTS=[
 ['Patterns shared across generations','A painted cloth records a living tradition.','mithila'],
 ['Messages made public','A reader compares syllables with an inscription key.','ashoka'],
 ['Stories on a cave wall','Pigment and rock hold evidence; missing parts remain uncertain.','ajanta'],
 ['A city plans for scarce water','Reservoirs and channels connect people and resources.','dholavira'],
 ['A marketplace of many journeys','A pavilion, music and market streets evoke a Vijayanagara setting.','hampi'],
 ['The sun becomes stone','A carved wheel connects architecture with Surya\'s chariot.','konark'],
 ['Knowledge travels with people','A courtyard brings learners and teachers together.','nalanda']
];
const C={sand:'#c6ad76',light:'#dfcc93',edge:'#e3cf97',dark:'#82734f',gold:'#e4bf67',slate:'#324b36',wet:'#73cbb7',bark:'#6c573b',leaf:'#557c47',brick:'#b6794c'};
function icon(type){const paths={
 sun:'<circle cx="32" cy="32" r="12"/><circle cx="32" cy="32" r="7"/><path d="M32 3v12m0 34v12M3 32h12m34 0h12M11 11l9 9m24 24 9 9M11 53l9-9m24-24 9-9"/>',
 fish:'<path d="M9 32Q29 8 48 32 29 56 9 32Zm39 0 12-13v26ZM19 24q8 8 0 16m7-21q13 13 0 26"/><circle cx="15" cy="31" r="1"/>',
 leaf:'<path d="M12 53Q3 18 53 9q7 43-41 44ZM12 53 47 15M23 42l-5-16m13 9-2-17m8 11 13-1M21 44l18 0"/>',
 bird:'<path d="M10 45q10-6 9-19Q19 9 35 17l9 8 12 1-10 6q0 23-29 20Zm11-10q17-19 17 5M10 45l-6 9m18-2-3 9m12-10 2 10"/><circle cx="32" cy="23" r="1"/>',
 flower:'<circle cx="32" cy="32" r="6"/><path d="M28 25Q13 4 32 4q19 0 4 21m3 3q21-15 21 4t-21 4m-3 3q15 21-4 21t-4-21m-3-3Q4 51 4 32t21-4"/>',
 pot:'<path d="M22 7h20v7H22zm3 7v9Q4 40 17 55q15 6 30 0 13-15-8-32v-9M14 38h36M13 44h38M16 49h32"/>',
 wheel:'<circle cx="32" cy="32" r="25"/><circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="5"/><path d="M32 7v20m0 10v20M7 32h20m10 0h20M14 14l14 14m8 8 14 14M14 50l14-14m8-8 14-14"/>',
 book:'<path d="M6 11h18q8 0 8 7 0-7 8-7h18v40H40q-8 0-8 5-1-5-8-5H6zm26 7v38M12 22h13m-13 8h13m-13 8h13m14-16h13m-13 8h13m-13 8h13"/>',
 seal:'<rect x="9" y="9" width="46" height="46" rx="3"/><path d="M17 16v8m0-4h8m5-4 4 8 4-8m6 0v8M17 37h26l5 10H21zm8 0-5-6m21 6 6-6M26 47v5m15-5v5"/>',
 coin:'<circle cx="32" cy="32" r="25"/><circle cx="32" cy="32" r="21"/><path d="M32 16 47 32 32 48 17 32ZM23 32h18m-9-9v18"/>'
};return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[type]||paths.book}</svg>`;}
function sourceLink(id){const s=SOURCES[id];return s?`<a href="${s[1]}" target="_blank" rel="noopener noreferrer">${s[0]} &#8599;</a>`:'';}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

// -----------------------------------------------------------------------------
// Procedural, instanced 3D heritage park. Original voxel-like scenery; no assets.
// -----------------------------------------------------------------------------
const colliders=[];
function solid(x,z,sx,sz){colliders.push({x,z,sx:sx/2,sz:sz/2});}
function column(x,y,z,h=4,c=C.sand){box(x,y+.14,z,.84,.28,.84,C.dark);box(x,y+.35,z,.65,.18,.65,C.light);box(x,y+h*.5+.3,z,.36,h-.25,.36,c);box(x,y+h+.2,z,.72,.2,.72,C.light);box(x,y+h+.36,z,.96,.15,.96,C.dark);}
function tree(x,z,s=1){box(x,1.5*s,z,.55*s,3*s,.55*s,C.bark);box(x-.7*s,2.9*s,z,2.5*s,1.8*s,2.2*s,'#587c45');box(x+.6*s,3.4*s,z-.45*s,2.2*s,1.5*s,2.4*s,'#729250');box(x,4.3*s,z,2*s,1.2*s,2*s,'#85a563');box(x,5*s,z,.9*s,.4*s,.9*s,'#99ad68');solid(x,z,.7*s,.7*s);}
function pot(x,y,z,s=.5){inst('cyl',x,y+s*.55,z,s*.65,s,s*.65,'#ba8050');inst('cyl',x,y+s*1.1,z,s*.48,.12,s*.48,C.light);inst('cyl',x,y+s*1.17,z,s*.36,.02,s*.36,'#403c26');}
function house(x,z,s=1,c=C.brick,ry=0){box(x,.8*s,z,3*s,1.6*s,2.5*s,c);box(x,1.65*s,z,3.35*s,.2*s,2.85*s,C.dark);for(let k=0;k<3;k++)box(x,(1.84+k*.16)*s,z,(3.2-k*.62)*s,.19*s,(2.7-k*.48)*s,C.sand);box(x,.7*s,z+1.26*s,.58*s,1.3*s,.025,'#35402c');box(x+.9*s,.95*s,z+1.27*s,.42*s,.43*s,.03,'#d9bf74');box(x+.9*s,.95*s,z+1.29*s,.05,.43*s,.02,C.dark);}
function pillarBase(s){box(s.x,.14,s.z,14,.28,14,C.dark);box(s.x,.29,s.z,13.5,.15,13.5,C.light);for(let x=-5;x<=5;x+=2)for(let z=-5;z<=5;z+=2)box(s.x+x,.375,s.z+z,1.95,.025,1.95,((x+z)%4)?C.light:C.sand);}
function buildWorld(){
 staticMode=true;colliders.length=0;
 box(0,-3.1,2,210,.6,210,'#548b7b',0,0,0,2);
 box(0,-1.9,2,124,3.4,124,'#716f46');box(0,-.48,2,122,.55,122,'#8c9560');box(0,-.12,2,120,.2,120,'#6f9256');
 for(let i=0;i<13;i++){const a=i/13*TAU;const x=Math.cos(a)*88,z=Math.sin(a)*84;for(let k=0;k<4;k++)box(x,-2+k*3,z,26-k*5,3.2,26-k*5,i%2?'#6b875b':'#7a9261');}
 // A shallow, invented river. Stepping-stone routes act as bridges.
 for(let z=-59;z<63;z+=2){const x=8+Math.sin(z*.065)*6;box(x,-.035,z,6,.08,2.08,'#6fa79a',0,0,0,2);for(const side of [-1,1])box(x+side*3.2,.035,z,.55,.2,2.1,'#a5a775');}
 for(const s of SITES){const len=Math.hypot(s.x,s.z-5);for(let d=2;d<len;d+=1.8){const f=d/len,x=s.x*f,z=5+(s.z-5)*f;box(x,.085,z,2.05,.2,2.05,'#b4ad7b');if(Math.floor(d/1.8)%5===0)for(const sign of [-1,1]){const px=x+sign*2*(s.z-5)/len,pz=z-sign*2*s.x/len;box(px,.16,pz,.48,.32,.48,C.dark);box(px,.7,pz,.1,1,.1,C.gold);sphere(px,1.25,pz,.13,.18,.13,'#e9cf87',1);}}}
 // Central garden, with a seven-point memory mosaic.
 inst('cyl',0,.16,5,5.5,.32,5.5,C.sand);inst('ring',0,.34,5,4.5,.7,4.5,C.gold);
 for(let j=0;j<7;j++){const a=j/7*TAU;box(Math.sin(a)*3.5,.345,5+Math.cos(a)*3.5,.9,.03,.9,C.dark,a);}
 box(0,.5,1.3,1.2,1,1.2,C.dark);inst('cyl',0,1.1,1.3,.7,.25,.7,C.light);sphere(0,1.5,1.3,.21,.3,.21,C.gold,1);
 for(const s of SITES){pillarBase(s);
  // Low surviving foundations are persistent. The Time Lens builds above them.
  if(s.id==='mithila'){
   for(const [x,z] of [[-4,-3],[4,-3],[-4,3]]){house(s.x+x,s.z+z,.9,x<0?'#ad7148':'#b2975c');solid(s.x+x,s.z+z,2.8,2.3);}
   for(let i=0;i<5;i++){box(s.x-2+i,.6,s.z-5.3,.76,.4,.15,i%2?'#c98b4c':'#727c47');pot(s.x+3.8,.4,s.z+3.5,.55);}
  } else if(s.id==='ashoka'){
   box(s.x,.55,s.z,2.8,.5,2.8,C.dark);inst('cyl',s.x,5.15,s.z,.52,8.8,.52,C.sand);inst('cyl',s.x,9.7,s.z,.82,.45,.82,C.light);inst('cyl',s.x,10.1,s.z,.63,.36,.63,C.dark);for(let i=0;i<4;i++){const a=i/4*TAU;box(s.x+Math.cos(a)*.4,10.55,s.z+Math.sin(a)*.4,.46,.6,.5,C.sand,a);}solid(s.x,s.z,1.3,1.3);
   for(let i=0;i<6;i++)box(s.x,3.6+i*.17,s.z+.526,.53,.023,.017,C.dark);
  } else if(s.id==='ajanta'){
   box(s.x,3.3,s.z-3.4,17,6.6,7.5,'#697154');box(s.x-1,7,s.z-4.2,14,1.2,6.5,'#7a8261');box(s.x+2,8,s.z-5,9,1,5,'#839369');
   for(const x of [-5,0,5]){box(s.x+x,2.3,s.z+.38,3.3,3.9,.07,'#1d3427');column(s.x+x-1.7,.4,s.z+.7,3.8,C.dark);column(s.x+x+1.7,.4,s.z+.7,3.8,C.dark);box(s.x+x,4.55,s.z+.7,3.9,.42,.6,C.sand);box(s.x+x,.65,s.z+1.1,3.2,.25,1.5,C.sand);}
   solid(s.x,s.z-3.5,17,7);
  } else if(s.id==='dholavira'){
   for(let k=0;k<4;k++){const size=12-k*1.75,h=2.05-k*.4;for(const side of [-1,1]){box(s.x+side*size/2,h/2+.38,s.z-.8,.8,h,size+.8,C.sand);box(s.x,h/2+.38,s.z-.8+side*size/2,size,.0+h,.8,k%2?C.light:C.sand);}}
   box(s.x,.5,s.z-.8,5.9,.08,5.9,'#548f7b',0,0,0,2);
   for(const side of [-1,1]){for(let k=0;k<5;k++)box(s.x+side*4.2,.5+k*.28,s.z+7.5-k*.4,1.4,.6+k*.22,.43,C.light);column(s.x+side*6.6,.4,s.z-6.3,4);}
   solid(s.x,s.z-.8,12.6,12.6);
  } else if(s.id==='hampi'){
   for(const x of [-4.7,0,4.7])for(const z of [-4,0,4])column(s.x+x,.4,s.z+z,4.1,C.sand);
   for(const side of [-1,1]){box(s.x+side*5.8,.6,s.z,1,.4,11,C.dark);for(let j=0;j<3;j++){pot(s.x+side*7.8,.1,s.z-4+j*3,.6);}}
  } else if(s.id==='konark'){
   for(let k=0;k<5;k++)box(s.x,.6+k*.65,s.z-2,8-k*.85,.7,7-k*.6,k%2?C.sand:s.color);
   box(s.x,4,s.z-2,2.9,2,2.7,C.sand);for(let k=0;k<4;k++)box(s.x,5.2+k*.35,s.z-2,3.4-k*.6,.4,3.2-k*.55,C.dark);
   for(const dx of [-3,3]){inst('ring',s.x+dx,1.45,s.z+1.56,1.1,1.2,1.1,C.gold,0,Math.PI/2);for(let k=0;k<8;k++){const a=k/8*TAU;box(s.x+dx+Math.sin(a)*.52,1.45+Math.cos(a)*.52,s.z+1.58,.09,1.1,.13,C.light,0,0,-a);}}
   solid(s.x,s.z-2,8,7);
  } else if(s.id==='nalanda'){
   for(const side of [-1,1]){box(s.x+side*5.9,.9,s.z,1.1,1.05,11,C.brick);box(s.x+side*5.9,1.52,s.z,1.3,.2,11.4,C.sand);}
   box(s.x,1,s.z-5.5,11,1.2,1,C.brick);for(let k=0;k<5;k++)box(s.x,.7+k*.8,s.z-3.6,5-k*.65,.8,4.5-k*.55,k%2?'#aa673f':'#bd8050');
   for(let i=-4;i<=4;i+=2){box(s.x+i,.51,s.z+3,1.5,.22,1.8,C.brick);box(s.x+i,.66,s.z+3,1.1,.07,1.4,C.light);}solid(s.x,s.z-3.6,5,4.5);
  }
  // Interaction courtyards remain unobstructed, in front of each landmark.
  inst('cyl',s.x,.1,s.z+8.4,2.5,.2,2.5,C.sand);box(s.x-2,1,s.z+8.3,.5,1.8,.5,C.dark);box(s.x-2,2,s.z+8.3,.9,.2,.9,C.light);
 }
 let r=9283;const rand=()=>{r=(r*1664525+1013904223)>>>0;return r/4294967296;};
 for(let i=0;i<110;i++){let x=(rand()-.5)*114,z=(rand()-.5)*114+2;if(Math.hypot(x,z-5)<9||Math.abs(x-(8+Math.sin(z*.065)*6))<5||SITES.some(s=>Math.hypot(x-s.x,z-s.z)<12))continue;
  let road=false;for(const s of SITES){const dx=s.x,dz=s.z-5,t=clamp((x*dx+(z-5)*dz)/(dx*dx+dz*dz),0,1);if(Math.hypot(x-dx*t,z-(5+dz*t))<3.5)road=true;}if(!road)tree(x,z,.55+rand()*.55);
 }
 for(let i=0;i<95;i++){const x=(rand()-.5)*115,z=(rand()-.5)*113+2;if(SITES.some(s=>Math.hypot(x-s.x,z-s.z)<10)||Math.hypot(x,z-5)<7)continue;box(x,.15,z,.35,.3,.35,i%3?'#a4ad6a':'#dcc889');}
 commitStatic();
}
function drawReconstruction(s,t){const a=t;if(a<.01)return;
 if(s.id==='hampi'){box(s.x,4.8*a+.35,s.z,12,.32,11.3,C.light);box(s.x,5.08*a+.35,s.z,12.6,.2,11.9,C.dark);for(let k=0;k<3;k++)box(s.x,5.5*a+.35+k*.35*a,s.z,9.5-k*2,.45*a,8.7-k*1.8,C.sand);}
 if(s.id==='ajanta'){for(let j=-1;j<=1;j++){box(s.x+j*5,2.3,s.z+.46,2.8,3.4*a,.05,'#c18b52');for(let k=0;k<4;k++){box(s.x+j*5-1+k*.66,2.2,s.z+.5,.25,1.35*a,.06,k%2?'#dcb66d':'#577c5d');sphere(s.x+j*5-.95+k*.64,3.2,s.z+.51,.16,.16,.04,C.gold);}}}
 if(s.id==='nalanda'){for(const sign of [-1,1]){for(let j=0;j<4;j++)column(s.x+sign*5.3,.4,s.z-4+j*2.7,2.7*a,C.brick);box(s.x+sign*5.3,3.55*a+.35,s.z,2.5,.24,11.4,C.sand);}box(s.x,3.55*a+.35,s.z-5.5,11.5,.24,2.5,C.sand);}
 if(s.id==='dholavira'){for(const sign of [-1,1])box(s.x+sign*6.6,4.8*a+.4,s.z-2,1,.2,10,C.light);box(s.x,.52,s.z-.8,5.9,.12,5.9,C.wet,0,0,0,2);}
 if(s.id==='mithila'){for(let i=0;i<6;i++){box(s.x-3+i,2.9*a,s.z+2.3,.84,.8*a,.09,i%2?'#d5b355':'#a45440',0,0,Math.sin(i)*.13);}}
}
function avatar(x,y,z,a,walk,tunic='#e6d29b',flying=false){const ca=Math.cos(a),sa=Math.sin(a),w=Math.sin(walk)*.38;const part=(name,px,py,pz,sx,sy,sz,c,rx=0,rz=0)=>inst(name,x+ca*px+sa*pz,y+py,z-sa*px+ca*pz,sx,sy,sz,c,a,rx,rz);
 part('box',-.17,.35,0,.22,.62,.27,'#314132',w);part('box',.17,.35,0,.22,.62,.27,'#314132',-w);part('box',-.17,.1,.09,.26,.2,.42,'#554630',w);part('box',.17,.1,.09,.26,.2,.42,'#554630',-w);
 part('box',0,.9,0,.63,.6,.42,tunic);part('box',0,.61,0,.67,.12,.46,'#ae8b4f');part('box',0,.98,-.3,.43,.46,.18,'#647146');part('box',-.42,.92,0,.19,.6,.23,tunic,flying?-1.15:-w,flying?.3:0);part('box',.42,.92,0,.19,.6,.23,tunic,flying?-1.15:w,flying?-.3:0);
 part('box',0,1.5,0,.48,.5,.43,'#b78b60');part('box',0,1.74,-.03,.52,.16,.48,'#483c2c');part('box',0,1.77,0,.8,.06,.67,'#c7ac6c');part('box',0,1.92,-.03,.5,.25,.43,'#d8c082');part('box',-.105,1.52,.224,.04,.055,.013,'#253526');part('box',.105,1.52,.224,.04,.055,.013,'#253526');part('box',0,1.24,.06,.67,.12,.49,C.gold);part('box',.17,1.02,.245,.15,.4,.045,'#cb9843');
}
const SCROLLS=SITES.map((s,i)=>({x:s.x*.57+(i%2?2.8:-2.8),z:5+(s.z-5)*.57,title:s.name,site:s.id})).concat([{x:-3,z:12,title:'Evidence before certainty',site:'dholavira'},{x:18,z:16,title:'A map across time',site:'nalanda'},{x:-19,z:0,title:'The people behind the craft',site:'mithila'},{x:2,z:-16,title:'A shared resource',site:'dholavira'},{x:44,z:17,title:'A journey needs water',site:'hampi'}]);
function drawWorldDynamics(dt,time){
 eraBlend=mix(eraBlend,S.era?1:0,reduced?1:1-Math.exp(-3*dt));
 SITES.forEach((s,i)=>{drawReconstruction(s,eraBlend);const on=!!S.lamps[s.id];inst('cyl',s.x-2,2.16,s.z+8.3,.42,.16,.42,C.dark);sphere(s.x-2,2.55+(on?Math.sin(time*2+i)*.06:0),s.z+8.3,.21,.35,.21,on?C.gold:'#738064',on?1:0);if(on){inst('ring',s.x-2,2.2,s.z+8.3,.57,.5,.57,C.gold,0,0,0,1);for(let j=0;j<3;j++){const a=time*.5+j*TAU/3;sphere(s.x-2+Math.cos(a)*.55,2.7+Math.sin(time+j)*.2,s.z+8.3+Math.sin(a)*.55,.03,.03,.03,C.gold,1);}}
  avatar(s.x+.85,.18,s.z+8.6,-.5,0,i%2?'#b1874d':'#79926a');
 });
 avatar(-1.7,.32,5,.4,0,'#b79e73');
 if(!firstPerson||mode==='title')avatar(player.x,player.y,player.z,player.angle,player.walk,'#e6d29b',S.fly);
 SCROLLS.forEach((s,i)=>{if(S.scrolls.includes(i))return;const y=1.12+(reduced?0:Math.sin(time*1.5+i)*.14);box(s.x,y,s.z,.35,.48,.12,C.gold,time*.6+i,0,.15,1);inst('cyl',s.x,.12,s.z,.42,.14,.42,C.dark);});
 // A ghostly caravan walks the safe eastern route after delivery.
 if(S.trade){const x=31+Math.sin(time*.08)*4,z=12+Math.cos(time*.08)*6;box(x,.9,z,1.5,1.1,.8,'#b99860');for(const dx of [-.5,.5])for(const dz of [-.25,.25])box(x+dx,.36,z+dz,.14,.7,.14,'#927542');box(x+.68,1.6,z,.3,.75,.3,'#b99860');box(x+.87,1.95,z,.65,.3,.32,'#b99860');box(x,1.6,z,.6,.3,.7,'#777c4b');}
 if(S.city&&mode!=='build'){for(let r=0;r<6;r++)for(let c=0;c<6;c++){const type=S.cityBoard[r*6+c];if(type>=4&&type<=6){const x=31+c*1.25,z=-48+r*1.25;house(x,z,.32,type===6?'#c4ab77':'#b18354');}}}
 if(mode==='celebration'||S.complete){const count=quality?55:22;for(let i=0;i<count;i++){const a=i*2.399,timeOffset=time*.35+i;const r=3+(i%11)*.7,x=Math.cos(a+time*.04)*r,z=5+Math.sin(a+time*.04)*r,y=1+((timeOffset%6+6)%6);box(x,y,z,.065,.17,.02,i%3?C.gold:'#b1dec1',time,0,time,1);}}
}

// -----------------------------------------------------------------------------
// State, safe local persistence, menus, navigation and reward progression.
// -----------------------------------------------------------------------------
function freshState(){const board=Array(36).fill(0);board[12]=7;board[33]=1;return {version:2,guide:false,lamps:{},visited:[],scrolls:[],artifacts:[false,false,false],artClean:[0,0,0],artSeen:[0,0,0],city:false,cityBoard:board,choices:[],council:[5,5,5],lensDone:[false,false,false],scriptRound:0,trade:false,chronicle:false,complete:false,awards:[],xp:0,seconds:0,era:false,fly:false,player:{x:0,y:.32,z:9},waterRot:null};}
let S=freshState(),saved=null,storageOK=true,started=false;
function validatedSave(data){
 if(!data||data.version!==2||typeof data!=='object')return null;
 const s=freshState();for(const k of ['guide','city','trade','chronicle','complete','era','fly'])s[k]=data[k]===true;
 if(data.lamps&&typeof data.lamps==='object')for(const site of SITES){const v=data.lamps[site.id];if(Number.isInteger(v)&&v>=1&&v<=3)s.lamps[site.id]=v;}
 const arr=(a,n,fn)=>Array.isArray(a)&&a.length===n&&a.every(fn);
 for(const k of ['artifacts','lensDone'])if(arr(data[k],3,v=>typeof v==='boolean'))s[k]=data[k];
 if(arr(data.artClean,3,v=>Number.isFinite(v)&&v>=0&&v<=1))s.artClean=data.artClean;
 if(arr(data.artSeen,3,v=>Number.isInteger(v)&&v>=0&&v<=7))s.artSeen=data.artSeen;
 if(arr(data.cityBoard,36,v=>Number.isInteger(v)&&v>=0&&v<=7)){s.cityBoard=data.cityBoard;s.cityBoard[12]=7;s.cityBoard[33]=1;}
 if(Array.isArray(data.choices)&&data.choices.length<=3&&data.choices.every(v=>Number.isInteger(v)&&v>=0&&v<3))s.choices=data.choices;
 if(arr(data.council,3,v=>Number.isFinite(v)))s.council=data.council.map(v=>clamp(v,0,20));
 s.scriptRound=Number.isInteger(data.scriptRound)?clamp(data.scriptRound,0,3):0;
 for(const k of ['xp','seconds'])s[k]=Number.isFinite(data[k])?clamp(data[k],0,1e8):0;
 for(const k of ['visited','awards'])if(Array.isArray(data[k]))s[k]=[...new Set(data[k].filter(v=>typeof v==='string'&&v.length<100))].slice(0,100);
 if(Array.isArray(data.scrolls))s.scrolls=[...new Set(data.scrolls.filter(v=>Number.isInteger(v)&&v>=0&&v<SCROLLS.length))];
 if(data.player&&[data.player.x,data.player.z,data.player.y].every(Number.isFinite))s.player={x:clamp(data.player.x,-56,56),z:clamp(data.player.z,-55,60),y:clamp(data.player.y,0,22)};
 if(arr(data.waterRot,16,v=>Number.isInteger(v)&&v>=0&&v<4))s.waterRot=data.waterRot;
 return s;
}
/* Progress is loaded from the Mirava API after init (see loadRemote below). */
let mode='title',modalKind='',currentSite=null,paused=null,eraBlend=0,elapsedClock=0;
let player={x:0,y:.32,z:9,angle:Math.PI,walk:0,vy:0},nearest=null,moveTarget=null;
let simTime=0,toastUntil=0,lastSave=0,failed=false,raf=0,frame=0,celebrationTime=0;
let stageYaw=.45,stagePitch=.42,stageZoom=1,artifactIndex=0,artifactTool='rotate',cityTool=1,lensIndex=0,lensSeen=[0,0,0];
const keys=new Set();let stickX=0,stickY=0,stickID=null,drag=null,stageDrag=null;
function resetInput(){keys.clear();stickX=stickY=0;moveTarget=null;drag=stageDrag=null;stickID=null;$('thumb').style.transform='translate(0,0)';}
function snapshot(){return {...S,player:{x:player.x,y:player.y,z:player.z}};}
function save(){if(!started)return;try{const snap=snapshot();queueRemoteSave(snap);saved=structuredClone(snap);storageOK=true;}catch(e){storageOK=false;}if($('saveState'))$('saveState').textContent=storageOK?(ctx.me?'Saved to your account':'Session only: sign in to save'):'Session only: could not save';}
function award(key,xp){if(S.awards.includes(key))return;S.awards.push(key);S.xp+=xp;save();updateHUD();}
function setWorld(){mode='world';showcase=false;modalKind='';paused=null;syncUI();updateHUD();canvas.focus({preventScroll:true});}
function syncUI(){
 $('modalPause').hidden=modalKind==='pause'||!started;$('title').hidden=mode!=='title';$('hud').hidden=mode!=='world';$('labels').hidden=mode!=='world';$('modal').hidden=mode!=='modal';$('activity').hidden=!['artifact','build','lens'].includes(mode);$('reticle').hidden=!firstPerson;resetInput();updateAudio();
}
function setModal(kind,html,large=false){mode='modal';showcase=false;modalKind=kind;$('dialog').classList.toggle('large',large);$('modalBody').innerHTML=html;syncUI();setTimeout(()=>{if(mode==='modal')$('closeModal').focus({preventScroll:true});},20);}
function head(tag,title,intro=''){return `<div class="eyebrow">${tag}</div><h2 id="modalTitle">${title}</h2>${intro?`<p class="dialog-intro">${intro}</p>`:''}`;}
function btn(action,text,cls='',disabled=false){return `<button class="btn ${cls}" data-act="${action}" ${disabled?'disabled':''}>${text}</button>`;}
function feedback(text,bad=false,id='feedback'){const el=$(id);if(el){el.className='feedback'+(bad?' bad':'');el.hidden=false;el.innerHTML=text;}else notify(bad?'Look once more':'A new connection',text);}
function notify(title,text,seconds=4){$('toastTitle').textContent=title;$('toastText').textContent=text;$('toast').classList.add('show');toastUntil=performance.now()+seconds*1000;$('live').textContent=title+'. '+text;}
function taskList(){return [
 ['memory','Mithila\'s painted memory','Match eight pairs of original nature motifs.','mithila',!!S.lamps.mithila],
 ['scripts','Voices from the Stones','Read three rounds of Brahmi practice syllables.','ashoka',S.scriptRound>=3],
 ['lens','The Time Lens','Compare three features in both eras.','ajanta',S.lensDone.every(Boolean)],
 ['water','Water for a city','Route the spring through the required basins.','dholavira',!!S.lamps.dholavira],
 ['artifact','The Archaeologist\'s Eye','Inspect three replicas and support an inference.','dholavira',S.artifacts.every(Boolean)],
 ['build','Rebuild the Lost City','Connect homes, water, roads, a market and learning.','dholavira',S.city],
 ['rhythm','The rhythm of stone','Play an original pattern in four lanes.','hampi',!!S.lamps.hampi],
 ['trade','The Forgotten Trade Routes','Deliver goods while managing water and terrain.','hampi',S.trade],
 ['rings','Turn toward the sun','Align three mechanically linked rings.','konark',!!S.lamps.konark],
 ['story','Echoes of the Past','Make three choices and examine their consequences.','konark',S.choices.length===3],
 ['quiz','The gathering of knowledge','Bring your discoveries to Nalanda.','nalanda',!!S.lamps.nalanda],
 ['chronicle','The Missing Chronicle','Match seven recovered fragments to place and period.','nalanda',S.chronicle]
 ];}
function allReady(){return taskList().every(t=>t[4]);}
function updateHUD(){
 $('lampStrip').innerHTML=SITES.map(s=>`<i title="${escapeHTML(s.name)}" class="lamp-dot ${S.lamps[s.id]?'on':''}"></i>`).join('')+`<span>${Object.keys(S.lamps).length}/7</span>`;
 const next=taskList().find(t=>!t[4]);$('objTag').textContent=S.complete?'KEEPER OF BHARAT':allReady()?'THE FINAL GATHERING':'THE FADING LAMPS';$('objTitle').textContent=S.complete?'A living legacy':!S.guide?'Meet the story keeper':next?next[1]:'Bring the lamps together';
 $('objText').textContent=S.complete?'Keep exploring, improve your stars and fill the museum.':!S.guide?'Dadi Saraswati is waiting in the central garden.':next?next[2]+' Visit '+SITES.find(s=>s.id===next[3]).name+'.':'Return to Saraswati in the central garden for the celebration.';
 $('xpText').textContent=`${S.xp} XP / Level ${1+Math.floor(S.xp/250)}`;$('saveState').textContent=storageOK?'Saved on this device':'Session only: storage blocked';
 $('flyBtn').classList.toggle('active',S.fly);$('flyBtn').textContent=S.fly?'Land [F]':'Fly [F]';$('lensBtn').classList.toggle('active',S.era);$('eraBadge').textContent=S.era?'PAST / ARTISTIC INTERPRETATION':'PRESENT / IMAGINED RUINS';
}
function startNew(){S=freshState();started=true;player={x:0,y:.32,z:9,angle:Math.PI,walk:0,vy:0};eraBlend=0;firstPerson=false;resetCamera();save();tutorial();}
function continueJourney(){if(!saved)return;S=validatedSave(saved);started=true;player={...S.player,angle:Math.PI,walk:0,vy:0};eraBlend=S.era?1:0;resetCamera();setWorld();notify('Welcome back','Your lamps, museum discoveries and city have been restored.');}
function tutorial(){setModal('tutorial',head('A letter from Dadi Saraswati','The past needs a keeper.','"Our seven lamps are fading, and the Chronicle of Bharat has lost its pages. Restore the lamps, listen to people, and connect the stories they leave behind."')+`<div class="tasklist"><div class="task"><span class="dot">1</span><div><b>Explore freely.</b><small>WASD / arrows or touch joystick. Drag the view to look; E to interact.</small></div></div><div class="task"><span class="dot">2</span><div><b>Discover, do not just memorise.</b><small>Study replicas, build a town, plan a caravan and compare the Time Lens.</small></div></div><div class="task"><span class="dot">3</span><div><b>Your journal connects everything.</b><small>J opens the Living Codex. Q shows progress. M lets you travel to any site.</small></div></div></div><div class="note"><b>Take to the sky:</b> F toggles flight. Space rises; Shift descends. On foot, Space jumps and Shift runs. V changes between third-person and first-person views. T changes the Time Lens.</div><p class="fine">The landscape brings different places and periods together in a fictional heritage park. No route is a real historical itinerary. Sound is optional; all challenges work without it.</p><div class="actions">${btn('enter','Enter the valley &#8599;','primary wide')}</div>`);}
function resetCamera(){yaw=.35;pitch=.62;distance=17;camTarget=[player.x,player.y+.7,player.z];}
function teleport(id){const s=SITES.find(v=>v.id===id);player.x=s?s.x:0;player.z=s?s.z+11.3:8;player.y=.2;S.fly=false;player.vy=0;player.angle=Math.PI;resetCamera();setWorld();if(s&&!S.visited.includes(id)){S.visited.push(id);award('visit-'+id,25);}save();notify(s?s.name:'The keeper\'s garden',s?'Approach the keeper or press E nearby.':'Dadi Saraswati is beside the central mosaic.');}
function openMap(){setModal('map',head('The explorer\'s atlas','Seven places. Many centuries.','Choose a destination to fast travel. This is an imaginary park map, not the geographic layout of India.')+`<div class="card-grid">${SITES.map((s,i)=>`<article class="card ${S.lamps[s.id]?'done':''}"><span class="num">0${i+1}</span><span class="tiny-art">${icon(['leaf','seal','flower','pot','bird','wheel','book'][i])}</span><h3>${s.name}</h3><p>${s.region}</p><div class="completion">${S.lamps[s.id]?'':''}${S.lamps[s.id]?`${S.lamps[s.id]} / 3 stars &middot; lamp restored`:S.visited.includes(s.id)?'Discovered &middot; lamp waiting':'A new place to explore'}</div>${btn('travel:'+s.id,'Travel here &#8599;','small')}</article>`).join('')}</div><div class="actions">${btn('travel:hub','Keeper\'s garden')}${btn('world','Back to exploring','primary')}</div>`,true);}
function openQuests(){setModal('quests',head('Your journey','The lamps &amp; the Chronicle.','Every challenge below has its own rules and rewards. Activities remain available after completion.')+`<div class="tasklist">${taskList().map((t,i)=>`<div class="task ${t[4]?'done':''}"><span class="dot">${t[4]?'&#10003;':i+1}</span><div><b>${t[1]}</b><small>${t[2]}</small></div>${btn('travel:'+t[3],t[4]?'Revisit':'Go','small')}</div>`).join('')}</div><div class="note">The Living Codex fills automatically as you learn. Complete the archaeological collection to unlock its museum display. Floating golden folios add optional discoveries.</div><div class="actions">${btn('codex','Open Living Codex')}${btn('world','Keep exploring','primary')}</div>`,true);}
function siteMenu(id){const s=SITES.find(v=>v.id===id);if(!s)return;currentSite=id;if(!S.visited.includes(id)){S.visited.push(id);award('visit-'+id,25);}let extra='';
 if(id==='dholavira')extra=`<div class="card"><div class="eyebrow">Discovery 01</div><h3>The Archaeologist's Eye</h3><p>Rotate three 3D replicas, reveal clues and test an evidence-based inference.</p>${btn('artifact:0',S.artifacts.every(Boolean)?'Revisit replicas':'Open excavation case','small',!S.lamps.dholavira)}</div><div class="card"><div class="eyebrow">Discovery 02</div><h3>Rebuild the Lost City</h3><p>Place real 3D buildings. Give a fictional settlement water and road access.</p>${btn('build',S.city?'Revisit your city':'Open city planner','small',!S.lamps.dholavira)}</div>`;
 if(id==='hampi')extra=`<div class="card"><div class="eyebrow">Discovery 07</div><h3>The Forgotten Trade Routes</h3><p>Travel with a caravan, compare routes and manage scarce water.</p>${btn('trade',S.trade?'Plan another caravan':'Meet the trader','small')}</div>`;
 if(id==='konark')extra=`<div class="card"><div class="eyebrow">Discovery 03</div><h3>Echoes of the Past</h3><p>Three dilemmas. Different consequences. No single score replaces judgement.</p>${btn('story',S.choices.length===3?'Read your decisions':'Join the council','small')}</div>`;
 if(id==='nalanda')extra=`<div class="card"><div class="eyebrow">Discovery 04</div><h3>The Missing Chronicle</h3><p>Seven lamp fragments belong to seven places and periods. Reconnect them.</p>${btn('chronicle','Open the evidence board','small',Object.keys(S.lamps).length<7)}</div><div class="card"><div class="eyebrow">Discovery 06</div><h3>The Living Codex</h3><p>Your personal museum, with illustrations, a timeline and sources.</p>${btn('codex','Enter the museum','small')}</div>`;
 setModal('site',head(s.region,s.name,`<b>${s.npc}:</b> ${s.fact}${id==='dholavira'&&S.choices.length?' The council still discusses your water decision: '+STORIES[0].choices[S.choices[0]][1]:''}${id==='hampi'&&S.trade?' Your caravan has reached the harbour; the market has a new story to tell.':''}`)+`<div class="card-grid"><div class="card ${S.lamps[id]?'done':''}"><div class="eyebrow">Heritage lamp</div><h3>${s.challenge}</h3><p>${S.lamps[id]?`Restored with ${S.lamps[id]} stars. Replay to improve your result.`:'Complete this challenge to restore the lamp and recover a Chronicle fragment.'}</p>${btn(s.job,S.lamps[id]?'Play again':'Begin challenge','primary small')}</div>${extra}</div>${id==='dholavira'&&!S.lamps.dholavira?'<div class="note">Restore the reservoir lamp to unlock the excavation case and settlement fragments.</div>':''}<p class="fine" style="margin-top:18px">All scenes and challenges are original artistic interpretations. ${sourceLink(s.id)}</p><div class="actions">${btn('world','Return to the world')}</div>`,true);save();
}
function guideMenu(){S.guide=true;save();setModal('guide',head('Dadi Saraswati / keeper of stories',S.complete?'The story goes on.':allReady()?'You have brought them home.':'Every lamp is a promise.',S.complete?'Your Chronicle is whole. There are still quiet corners to explore and a museum to revisit.':allReady()?'The seven lamps shine. The replicas are documented, the city is connected, the caravan has arrived, and your choices have become part of the Chronicle.':'"A place is more than its stones. Listen to its people, follow its water, read its marks, and ask what you really know."')+`<div class="stat-row"><div class="stat"><b>${Object.keys(S.lamps).length}/7</b><small>lamps restored</small></div><div class="stat"><b>${taskList().filter(t=>t[4]).length}/12</b><small>journey milestones</small></div><div class="stat"><b>${S.scrolls.length}/12</b><small>optional folios</small></div></div><div class="actions">${allReady()&&!S.complete?btn('finale','Light the final gathering','primary'):btn('quests','See my journey','primary')}${btn('codex','My Living Codex')}${btn('world','Back to the garden')}</div>`);}
function restoreLamp(id,stars=3){const was=S.lamps[id]||0;S.lamps[id]=Math.max(was,stars);award('lamp-'+id,150);save();const s=SITES.find(v=>v.id===id);tone(523,.25);setTimeout(()=>tone(659,.3),140);setTimeout(()=>tone(784,.5),280);
 setModal('reward',`<div class="reward-modal"><div class="reward-emblem">&#10022;</div>${head(was?'A story revisited':'A lamp restored',s.name+' remembers.',`You earned ${stars} of 3 stars. ${was?'Your best result is kept.':'A new fragment has joined the Chronicle.'}`)}<div class="note">${s.fact}</div><p class="fine">${sourceLink(id)}</p><div class="actions">${btn('site:'+id,'Explore this place','primary')}${btn('quests','What comes next?')}${btn('world','Return to the world')}</div></div>`);}
function openCodex(tab='museum'){
 const count=Object.keys(S.lamps).length+S.artifacts.filter(Boolean).length+S.scrolls.length;
 let body='';
 if(tab==='museum'){
  body=`<div class="note"><b>${count} discoveries recorded.</b> ${S.artifacts.every(Boolean)?'Special exhibition unlocked: Evidence before certainty. Three replicas, three carefully limited conclusions.':'Complete all three artifact investigations to unlock the Evidence before certainty exhibition.'}</div>`;
  body+=(S.choices.length?`<div class="card"><div class="eyebrow">Echoes of the Past / your living record</div><h3>The council remembers.</h3><p>${S.choices.map((c,i)=>STORIES[i].choices[c][1]).join(' ')}</p>${btn('story','Read my decisions','small')}</div>`:'');
  body+=`<div class="card-grid">${ARTS.map((a,i)=>`<article class="card ${S.artifacts[i]?'done':''}"><div class="museum-entry">${icon(a.type)}<div><time>${a.era}</time><h3>${S.artifacts[i]?a.name:'An unopened display'}</h3><p>${S.artifacts[i]?a.lesson:'Investigate this replica in the Archaeologist\'s Eye at Dholavira.'}</p>${S.artifacts[i]?btn('artifact:'+i,'View in 3D','small'):''}</div></div></article>`).join('')}${SITES.map((s,i)=>`<article class="card ${S.lamps[s.id]?'done':''}"><div class="museum-entry">${icon(['leaf','seal','flower','pot','bird','wheel','book'][i])}<div><time>${s.period}</time><h3>${s.name}</h3><p>${S.lamps[s.id]?s.fact:'Restore this place\'s lamp to record its heritage connection.'}</p>${S.lamps[s.id]?sourceLink(s.id):''}</div></div></article>`).join('')}</div>`;
 } else if(tab==='timeline'){
  const order=[3,1,2,6,5,4,0];body=`<div class="note">A thematic journey across time, not seven places that existed in the same form in one historical year. Broad date ranges describe the sites, not exact dates for these invented replicas.</div><div class="timeline">${order.map(i=>{const s=SITES[i];return `<article><small>${s.period}</small><h3>${s.name}</h3><p>${S.lamps[s.id]?s.fact:'This chapter is waiting for its lamp.'}</p></article>`;}).join('')}</div>`;
 } else if(tab==='field'){
  body=`<div class="card-grid">${SCROLLS.map((s,i)=>`<article class="card ${S.scrolls.includes(i)?'done':''}"><div class="eyebrow">Field folio ${i+1} / 12</div><h3>${S.scrolls.includes(i)?s.title:'Still out in the world'}</h3><p>${S.scrolls.includes(i)?SITES.find(v=>v.id===s.site).fact:'Look for a floating golden folio beside the paths. Approach it to collect it.'}</p>${S.scrolls.includes(i)?sourceLink(s.site):''}</article>`).join('')}</div>`;
 } else {
 body=`<div class="note"><b>Historical anchors and game fiction are different.</b> The primary sources below support the short site descriptions. Our geography, characters, replicas, story, trade network, city rules, motifs, music and reconstruction geometry are invented for learning.</div><p class="muted">The Time Lens does not show an exact ancient photograph or a surveyed model of present ruins. Brahmi lessons use six standardised character forms and invented practice sequences, not a transcription of an Ashokan edict. The artifact conclusions are exercises in reasoning from the supplied fictional evidence.</p><div class="source-links">${Object.keys(SOURCES).map(sourceLink).join('')}</div><div class="rule"></div><p class="fine">The original WebGL2 foundation and interaction approach come from the supplied Monsoon Keepers HTML. Artwork, geometry and audio are generated in this file. Six vector character illustrations were outlined from Noto Sans Brahmi (Noto Project, SIL Open Font License 1.1); no font software or font file is embedded. Optional speech uses a locally installed browser voice only, and is never labelled an authentic ancient pronunciation. Browser storage keeps progress on this browser, not across devices.</p>`;
 }
 setModal('codex',head('Discovery 06 / a personal museum','The Living Codex.','Objects become meaningful when we connect them to evidence, people, places and time.')+`<div class="tabs">${['museum','timeline','field','sources'].map(t=>btn('codex:'+t,{museum:'Museum',timeline:'Timeline',field:'Field folios',sources:'Sources & context'}[t],`small ${tab===t?'active':''}`)).join('')}</div>${body}<div class="actions">${btn('world','Return to the world','primary')}</div>`,true);
}
function pauseGame(){if(!started||mode==='title'||modalKind==='pause'||failed)return;
 paused={mode,showcase,modalKind,html:$('modalBody').innerHTML,large:$('dialog').classList.contains('large')};
 setModal('pause',head('A moment of stillness','Your journey is paused.','Completed discoveries and city changes are saved to your Mirava account.')+`<div class="actions">${btn('resume','Resume journey','primary')}${btn('quests','Journey journal')}${btn('codex','Living Codex')}</div><div class="settings"><div class="row"><span>Original synthesised sound</span>${btn('sound',sound?'Sound on':'Sound off','small')}</div><div class="row"><span>Render quality</span>${btn('quality',['Eco','Balanced','High'][quality],'small')}</div><div class="row"><span>Gentler movement &amp; effects</span>${btn('motion',reduced?'On':'Off','small')}</div></div><div class="note">WASD / arrows move &middot; drag to look &middot; E interacts &middot; F flies &middot; Space rises / jumps &middot; Shift descends / runs &middot; T changes era &middot; V changes view &middot; M atlas &middot; J museum &middot; Q journey &middot; P pauses any activity.</div><div class="actions">${btn('title','Title screen','small')}${btn('restart','Restart journey','small danger')}</div>`);save();
}
function resumeGame(){if(!paused){setWorld();return;}const p=paused;paused=null;mode=p.mode;showcase=p.showcase;modalKind=p.modalKind;if(mode==='modal'){$('modalBody').innerHTML=p.html;$('dialog').classList.toggle('large',p.large);}syncUI();}
function finalGathering(){if(!allReady()){openQuests();return;}mode='celebration';showcase=false;celebrationTime=0;player={x:0,y:.32,z:8,angle:Math.PI,walk:0,vy:0};S.fly=false;S.era=true;syncUI();notify('The lamps burn bright again','A little care. A living legacy.',6);for(let i=0;i<7;i++)setTimeout(()=>tone(261.63*Math.pow(2,i/6),.9,.04),i*230);}
function showEnding(){S.complete=true;save();const stars=Object.values(S.lamps).reduce((a,b)=>a+b,0);setModal('ending',`<div class="reward-modal"><div class="reward-emblem">&#10022;</div>${head('The Chronicle is whole','Keeper of Bharat.','The lamps shine, the city has water, and the stories have found each other. You did more than find the past. You asked how to care for it.')}<div class="stat-row"><div class="stat"><b>${stars}/21</b><small>heritage stars</small></div><div class="stat"><b>${S.xp}</b><small>experience points</small></div><div class="stat"><b>${Math.floor(S.seconds/60)}m</b><small>time exploring</small></div></div><p class="muted">All eight discovery systems completed. Your choices, three artifact investigations, rebuilt town and recovered Chronicle are saved to your Mirava account.</p><div class="actions">${btn('world','Stay in the world','primary')}${btn('codex','Visit my museum')}${btn('restart','Start again','small')}</div></div>`);
 const detail={game:'lost-legends-of-bharat-3d',completed:true,lamps:7,stars,xp:S.xp,seconds:Math.floor(S.seconds)};submitCompletion(detail);
}

// -----------------------------------------------------------------------------
// Seven different heritage challenges and the expanded narrative systems.
// -----------------------------------------------------------------------------
let memory=null,water=null,rings=null,quiz=null,rhythm=null,scriptAnswer=[],scriptHint=false,scriptErrors=0,storyChoicePending=null,trade=null,chroniclePlace=Array(7).fill(''),chronicleEra=Array(7).fill('');
function openMemory(){memory={cards:shuffle(['sun','fish','leaf','bird','flower','pot','wheel','book'].flatMap(x=>[x,x])),flipped:[],matched:new Set(),moves:0,delay:0,win:0};setModal('memory',head('Mithila / the first lamp','The painter\'s memory.','Find eight pairs. These original nature motifs are inspired by pattern-based art; they are not copies of historical paintings.')+`<div class="row" style="margin-top:17px"><span class="pill" id="memoryStatus">0 / 8 pairs</span><span class="fine" id="memoryMoves">0 moves</span></div><div class="memory-grid" id="memoryGrid"></div><div class="actions">${btn('memory','Restart board','small')}${btn('world','Return to world','small')}</div>`);paintMemory();}
function paintMemory(){if(!memory||!$('memoryGrid'))return;$('memoryGrid').innerHTML=memory.cards.map((type,i)=>{const matched=memory.matched.has(i),visible=matched||memory.flipped.includes(i);return `<button class="memory-card ${visible?'flipped':''} ${matched?'matched':''}" data-act="match:${i}" aria-label="${visible?type:'Covered motif '+(i+1)}" ${matched?'disabled':''}>${visible?icon(type):'&#10022;'}</button>`;}).join('');$('memoryStatus').textContent=memory.matched.size/2+' / 8 pairs';$('memoryMoves').textContent=memory.moves+' moves';}
function flipCard(i){if(!memory||memory.flipped.length>=2||memory.matched.has(i)||memory.flipped.includes(i))return;memory.flipped.push(i);tone(310+i*14,.09,.035);if(memory.flipped.length===2){memory.moves++;const [a,b]=memory.flipped;if(memory.cards[a]===memory.cards[b]){memory.matched.add(a);memory.matched.add(b);memory.flipped=[];tone(620,.16,.035);if(memory.matched.size===16)memory.win=.65;}else memory.delay=.8;}paintMemory();}
const DIRS=[[0,-1],[1,0],[0,1],[-1,0]],WATER_PATH=[[0,0],[1,0],[1,1],[0,1],[0,2],[1,2],[2,2],[2,1],[2,0],[3,0],[3,1],[3,2],[3,3]],WATER_CHECKS=[8,2];
function rotateMask(mask,r){r&=3;return ((mask<<r)|(mask>>(4-r)))&15;}
function direction(a,b){return DIRS.findIndex(([x,z])=>b[0]-a[0]===x&&b[1]-a[1]===z);}
function openWater(){const solutions=new Map();WATER_PATH.forEach((p,i)=>{const en=i===0?0:direction(p,WATER_PATH[i-1]),out=i===WATER_PATH.length-1?2:direction(p,WATER_PATH[i+1]);solutions.set(p[1]*4+p[0],(1<<en)|(1<<out));});water={tiles:[],wet:new Set(),checks:0,reached:false,turns:0,hinted:false};for(let i=0;i<16;i++){const sol=solutions.get(i)||(i%2?3:5),base=sol===5||sol===10?5:3,rot=S.waterRot?S.waterRot[i]:(i*3+1)%4;water.tiles.push({base,rot,sol});}evaluateWater();if(water.reached&&water.checks===2&&!S.lamps.dholavira)water.tiles[0].rot=(water.tiles[0].rot+1)%4;
 setModal('water',head('Dholavira / the reservoir lamp','Water for a city.','Turn each channel clockwise. Connect the top-left spring to the bottom-right outlet through both gold-ring basins.')+`<div class="row" style="margin-top:16px"><span class="pill">SPRING &#8595; / tile 1</span><span class="fine">Outlet &#8595; / tile 16</span></div><div class="pipe-grid" id="pipeGrid" style="grid-template-columns:repeat(4,1fr)"></div><div class="row"><span class="completion" id="waterStatus"></span>${btn('waterHint','A little guidance','small')}</div><div id="feedback" hidden></div><div class="note">The moving channels are a game mechanism. Dholavira's real reservoirs and drainage show sophisticated water management, not rotating puzzle stones.</div>`);paintWater();}
function evaluateWater(){water.wet=new Set();water.reached=false;water.checks=0;let idx=0,en=0;for(let n=0;n<17;n++){const mask=rotateMask(water.tiles[idx].base,water.tiles[idx].rot);if(!(mask&(1<<en))||water.wet.has(idx))break;water.wet.add(idx);if(WATER_CHECKS.includes(idx))water.checks++;const ex=[0,1,2,3].find(d=>d!==en&&(mask&(1<<d)));const c=idx%4+DIRS[ex][0],r=Math.floor(idx/4)+DIRS[ex][1];if(c<0||c>3||r<0||r>3){water.reached=idx===15&&ex===2;break;}idx=r*4+c;en=(ex+2)%4;}}
function paintWater(){evaluateWater();if(!$('pipeGrid'))return;$('pipeGrid').innerHTML=water.tiles.map((t,i)=>{const mask=rotateMask(t.base,t.rot);return `<button class="pipe-tile ${water.wet.has(i)?'wet':''}" data-act="pipe:${i}" aria-label="Turn channel ${i+1}${WATER_CHECKS.includes(i)?', required basin':''}"><svg viewBox="0 0 80 80">${DIRS.map(([dx,dy],d)=>mask&(1<<d)?`<path d="M40 40L${40+dx*40} ${40+dy*40}"/>`:'').join('')}${WATER_CHECKS.includes(i)?'<circle cx="40" cy="40" r="16" style="stroke:#e4bf67;stroke-width:3"/>':''}</svg><small>${i+1}</small></button>`;}).join('');$('waterStatus').textContent=`${water.checks} / 2 basins - ${water.reached?'Outlet connected':'Outlet dry'}`;}
function turnWater(i){if(!water)return;water.tiles[i].rot=(water.tiles[i].rot+1)%4;water.turns++;S.waterRot=water.tiles.map(t=>t.rot);tone(380,.08,.03);paintWater();save();if(water.reached&&water.checks===2)restoreLamp('dholavira',water.hinted?2:3);}
function waterHint(){const i=WATER_PATH.map(([c,r])=>r*4+c).find(i=>rotateMask(water.tiles[i].base,water.tiles[i].rot)!==water.tiles[i].sol);if(i===undefined){feedback('The route is ready.');return;}water.hinted=true;const t=water.tiles[i],n=[1,2,3].find(n=>rotateMask(t.base,t.rot+n)===t.sol);feedback(`Try turning channel <b>${i+1}</b> clockwise <b>${n}</b> ${n===1?'time':'times'}. Follow the water from the spring.`);}
function openRings(){rings={v:[4,3,5],turns:0,hints:0};setModal('rings',head('Konark / the sun lamp','Turn toward the sun.','Bring all three sun markers to the top. Every turn moves the selected ring AND the next ring by one eighth of a circle.')+`<div class="rings-wrap" id="ringsArt"></div><div class="rings-buttons">${btn('ring:0','Outer')}${btn('ring:1','Middle')}${btn('ring:2','Inner')}</div><p class="fine" style="text-align:center;margin-top:10px">Outer + middle / middle + inner / inner + outer</p><div class="actions">${btn('ringHint','A little guidance','small')}${btn('rings','Reset rings','small')}</div><div id="feedback" hidden></div><div class="note">This invented mechanism is inspired by carved wheel imagery, not an ancient lock or an astronomical model.</div>`);paintRings();}
function paintRings(){if(!$('ringsArt'))return;$('ringsArt').innerHTML=`<svg viewBox="0 0 330 330" role="img" aria-label="Three rings with sun markers"><path d="M165 6v36" stroke="#e4bf67" stroke-width="2"/>${[130,94,58].map((r,i)=>`<circle cx="165" cy="165" r="${r}" fill="none" stroke="#e4bf673f" stroke-width="17"/><circle cx="165" cy="165" r="${r}" fill="none" stroke="#e4bf67" stroke-width="1"/>${Array.from({length:8},(_,k)=>{const a=k*TAU/8;return `<circle cx="${165+Math.sin(a)*r}" cy="${165-Math.cos(a)*r}" r="2" fill="#c8af6e"/>`;}).join('')}<g transform="rotate(${rings.v[i]*45} 165 165)"><circle cx="165" cy="${165-r}" r="10" fill="${rings.v[i]?'#e4bf67':'#a8dcbe'}"/><circle cx="165" cy="${165-r}" r="5" stroke="#233722" fill="none"/></g>`).join('')}<text x="165" y="164" text-anchor="middle" fill="#e4bf67" font-family="Georgia" font-size="22">${rings.v.filter(v=>v===0).length}/3</text><text x="165" y="185" text-anchor="middle" fill="#b9c6ae" font-family="system-ui" font-size="9">ALIGNED</text></svg>`;}
function turnRing(i){rings.v[i]=(rings.v[i]+1)%8;rings.v[(i+1)%3]=(rings.v[(i+1)%3]+1)%8;rings.turns++;tone(300+i*100,.1,.03);paintRings();if(rings.v.every(v=>v===0))restoreLamp('konark',rings.hints?2:3);}
function ringHint(){const q=[[rings.v,[]]],seen=new Set([rings.v.join(',')]);let answer=[];while(q.length){const [v,path]=q.shift();if(v.every(n=>n===0)){answer=path;break;}for(let i=0;i<3;i++){const n=[...v];n[i]=(n[i]+1)%8;n[(i+1)%3]=(n[(i+1)%3]+1)%8;const key=n.join(',');if(!seen.has(key)){seen.add(key);q.push([n,[...path,i]]);}}}rings.hints++;feedback(`One route to alignment starts with the <b>${['outer','middle','inner'][answer[0]]}</b> ring. There are ${answer.length} turns in this route from the current position.`);}
function openQuiz(){quiz={i:0,score:0,answered:false};renderQuiz();}
function renderQuiz(){const q=QUIZ[quiz.i];setModal('quiz',head('Nalanda / question '+(quiz.i+1)+' of 7','The gathering of knowledge.','Take your time. Five correct answers restore this lamp; seven earn all three stars.')+`<h3 style="margin-top:24px;font-size:24px">${q[0]}</h3><div class="choice-list">${q[1].map((a,i)=>`<button class="choice" data-act="quizAnswer:${i}">${a}</button>`).join('')}</div><div id="feedback" hidden></div><div id="quizNext" class="actions"></div>`);}
function answerQuiz(i){if(quiz.answered)return;quiz.answered=true;const q=QUIZ[quiz.i],good=i===q[2];if(good)quiz.score++;appRoot.querySelectorAll('[data-act^="quizAnswer:"]').forEach(el=>el.disabled=true);feedback(good?'That fits the evidence.':'The stronger answer is: '+q[1][q[2]],!good);$('quizNext').innerHTML=btn('quizNext',quiz.i===6?'See my result':'Next question','primary');}
function nextQuiz(){if(++quiz.i<7){quiz.answered=false;renderQuiz();}else if(quiz.score>=5)restoreLamp('nalanda',quiz.score===7?3:quiz.score===6?2:1);else setModal('quizResult',head('A scholar keeps asking','A few stories to revisit.',`You answered ${quiz.score} of 7 correctly. The Codex can help connect the evidence before another attempt.`)+`<div class="actions">${btn('quiz','Try again','primary')}${btn('codex','Read the Codex')}${btn('world','Return')}</div>`);}
function openRhythm(practice=false){rhythm={time:0,running:false,practice,step:0,hits:0,errors:0,notes:Array.from({length:16},(_,i)=>({lane:[0,2,1,3,0,1,2,3,2,0,3,1,0,2,3,1][i],at:2.2+i*.55,hit:false,miss:false})),done:false};setModal('rhythm',head('Hampi / the music lamp','The rhythm of stone.',practice?'Untimed practice: follow the highlighted lane. Complete the 16-note pattern at your own pace for up to two stars.':'Press D, F, J or K as a note reaches the gold line. Hit at least 8 of 16 notes. Sound is optional.')+`<div class="row" style="margin-top:15px"><span class="pill" id="rhythmScore">0 / 16 notes</span><span class="fine" id="rhythmCaption">${practice?'Practice mode':'Ready when you are'}</span></div><div class="rhythm-track" id="rhythmTrack">${[0,1,2,3].map(i=>`<div class="rhythm-lane" id="lane${i}"></div>`).join('')}<div class="hitline"></div></div><div class="rhythm-controls">${['D','F','J','K'].map((k,i)=>btn('beat:'+i,k)).join('')}</div><div class="actions">${btn('rhythmStart',practice?'Begin practice':'Start the pattern','primary')}${btn('sound',sound?'Sound on':'Sound off','small')}${btn(practice?'rhythm':'rhythmPractice',practice?'Timed challenge':'Untimed practice','small')}</div><p class="fine" style="margin-top:15px">Original synthesised notes, not a recorded historical performance. Do not strike heritage structures in the real world.</p>`);}
function startRhythm(){rhythm.running=true;rhythm.time=0;const b=appRoot.querySelector('[data-act="rhythmStart"]');if(b)b.disabled=true;if(rhythm.practice)paintRhythm();}
function hitBeat(lane){if(!rhythm?.running||rhythm.done)return;const b=appRoot.querySelector(`[data-act="beat:${lane}"]`);if(b){b.classList.add('flash');setTimeout(()=>b.isConnected&&b.classList.remove('flash'),130);}tone([261.63,329.63,392,523.25][lane],.2,.05);if(rhythm.practice){if(rhythm.notes[rhythm.step].lane===lane){rhythm.notes[rhythm.step].hit=true;rhythm.hits++;rhythm.step++;if(rhythm.step===16){finishRhythm();return;}}else rhythm.errors++;paintRhythm();return;}const candidate=rhythm.notes.filter(n=>!n.hit&&!n.miss&&n.lane===lane&&Math.abs(n.at-rhythm.time)<.24).sort((a,b)=>Math.abs(a.at-rhythm.time)-Math.abs(b.at-rhythm.time))[0];if(candidate){candidate.hit=true;rhythm.hits++;}else rhythm.errors++;paintRhythm();}
function paintRhythm(){if(!$('rhythmTrack'))return;const h=$('rhythmTrack').clientHeight-40;for(let lane=0;lane<4;lane++){$('lane'+lane).innerHTML=rhythm.practice?(rhythm.running&&rhythm.notes[rhythm.step]?.lane===lane?`<div class="rhythm-note" style="top:${h-6}px"></div>`:''):rhythm.notes.filter(n=>n.lane===lane&&!n.hit&&!n.miss&&n.at-rhythm.time<=2&&n.at-rhythm.time>=-.24).map(n=>`<div class="rhythm-note" style="top:${h-(n.at-rhythm.time)*h/2-6}px"></div>`).join('');}$('rhythmScore').textContent=`${rhythm.hits} / 16 notes`;$('rhythmCaption').textContent=rhythm.practice?(rhythm.running?'Next: '+['D','F','J','K'][rhythm.notes[rhythm.step]?.lane??0]:'Practice mode'):rhythm.running?'Follow the gold line':'Ready when you are';}
function finishRhythm(){rhythm.done=true;rhythm.running=false;if(rhythm.hits>=8)restoreLamp('hampi',rhythm.practice?2:rhythm.hits>=14?3:rhythm.hits>=11?2:1);else setModal('rhythmResult',head('Listen. Try. Learn.','The pattern will wait.',`You found ${rhythm.hits} of 16 notes. Try again, or switch to untimed practice. Both can restore the lamp.`)+`<div class="actions">${btn('rhythm','Try timed again','primary')}${btn('rhythmPractice','Untimed practice')}${btn('world','Return')}</div>`);}
const SCRIPT_ROUNDS=[['ka','ma'],['na','ga','ra'],['da','ma','na','ka']];
let scriptReplayRound=null;
function scriptRound(){return scriptReplayRound!==null?scriptReplayRound:S.scriptRound;}
function openScripts(){if(S.scriptRound>=3){scriptAnswer=[];scriptHint=false;scriptErrors=0;setModal('scriptDone',head('Voices from the Stones','A reader\'s new skill.','You completed all three rounds. These were standardised Brahmi letters in invented practice sequences, not an inscription translation.')+`<div class="glyph-row">${Object.keys(BRAHMI).map(k=>`<span class="glyph-key">${BRAHMI[k]} ${k}</span>`).join('')}</div><div class="note">A script is not a language. Reading a real inscription also requires linguistic and historical context.</div><div class="actions">${btn('scriptReplay','Practise again','primary')}${btn('site:ashoka','Back to the pillar')}</div>`);return;}scriptAnswer=[];scriptHint=false;renderScripts();}
function renderScripts(){const round=scriptRound(),sequence=SCRIPT_ROUNDS[round],key=Object.keys(BRAHMI),shown=round===2&&!scriptHint?['ka','ga','ra']:key;setModal('scripts',head('Discovery 08 / reading '+(round+1)+' of 3','Voices from the Stones.','Use the supplied key to match the carved forms to modern transliteration. Tap syllables in the same left-to-right order.')+`<div class="glyph-row">${sequence.map(k=>`<span class="glyph">${BRAHMI[k]}</span>`).join('')}</div><div class="glyph-row">${shown.map(k=>`<span class="glyph-key">${BRAHMI[k]} ${k}</span>`).join('')}</div><div class="answer-slots" id="scriptSlots">${sequence.map((_,i)=>`<span>${scriptAnswer[i]||'?'}</span>`).join('')}</div><div class="word-bank">${key.map(k=>btn('syllable:'+k,k,'small')).join('')}</div><div class="actions">${btn('scriptCheck','Check the reading','primary')}${btn('scriptUndo','Undo','small')}${btn('scriptKey','Reveal full key','small')}${btn('speak','Hear syllables','small')}</div><div id="feedback" hidden></div><p class="fine" style="margin-top:17px">Invented practice sequences, not translated ancient messages. Character forms are normalised illustrations, not facsimiles of an edict. Audio, when a local voice is available, is a modern device reading. ${sourceLink('brahmi')}</p>`);}
function addSyllable(k){const length=SCRIPT_ROUNDS[scriptRound()].length;if(scriptAnswer.length>=length)return;scriptAnswer.push(k);$('scriptSlots').innerHTML=SCRIPT_ROUNDS[scriptRound()].map((_,i)=>`<span>${scriptAnswer[i]||'?'}</span>`).join('');}
function checkScript(){const seq=SCRIPT_ROUNDS[scriptRound()];if(scriptAnswer.join(',')!==seq.join(',')){scriptErrors++;feedback('Compare each shape with the key. Use Undo or reveal the full key; the sequence has '+seq.length+' syllables.',true);return;}if(scriptReplayRound!==null){scriptReplayRound++;if(scriptReplayRound===3){scriptReplayRound=null;restoreLamp('ashoka',scriptErrors?2:3);return;}}else{S.scriptRound++;award('script-'+S.scriptRound,40);save();if(S.scriptRound===3){restoreLamp('ashoka',scriptErrors?2:3);return;}}scriptAnswer=[];scriptHint=false;renderScripts();notify('Reading recorded','The next round reveals fewer hints.');}
function speakSyllables(){if(!('speechSynthesis'in window)){notify('No local voice available','The visual key contains everything needed to play.');return;}const voices=speechSynthesis.getVoices().filter(v=>v.localService&&/^en|^hi/i.test(v.lang));if(!voices.length){notify('No local voice available','Use the written transliteration. No online speech service is required.');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(SCRIPT_ROUNDS[scriptRound()].join(', '));u.voice=voices[0];u.lang=voices[0].lang;u.rate=.65;speechSynthesis.speak(u);}
function openStory(){storyChoicePending=null;if(S.choices.length>=3){setModal('storyDone',head('Discovery 03 / your decisions','Echoes that stay with you.','Your choices changed the council\'s shared record. These scenarios and indicators are game feedback, not historical measurements.')+`<div class="stat-row">${['Resources','Trust','Learning'].map((n,i)=>`<div class="stat"><b>${S.council[i]}</b><small>${n}</small></div>`).join('')}</div><div class="tasklist">${STORIES.map((s,i)=>`<div class="card"><div class="eyebrow">Decision ${i+1}</div><h3>${s.title}</h3><p><b>${s.choices[S.choices[i]][0]}</b></p><p>${s.choices[S.choices[i]][1]}</p></div>`).join('')}</div><div class="actions">${btn('codex','Your living record','primary')}${btn('world','Return to the world')}</div>`);return;}const i=S.choices.length,s=STORIES[i];setModal('story',head('Discovery 03 / council '+(i+1)+' of 3',s.title,s.speaker)+`<p style="margin-top:18px">${s.text}</p><div class="choice-list">${s.choices.map((c,n)=>`<button class="choice" data-act="storyChoice:${n}"><b>${c[0]}</b></button>`).join('')}</div><div id="feedback" hidden></div><div id="storyNext" class="actions"></div><div class="note">${s.link}</div>`);}
function chooseStory(i){if(storyChoicePending!==null)return;storyChoicePending=i;const s=STORIES[S.choices.length],c=s.choices[i];appRoot.querySelectorAll('[data-act^="storyChoice:"]').forEach(el=>{el.disabled=true;el.classList.toggle('selected',el.dataset.act==='storyChoice:'+i);});feedback(c[1]);$('storyNext').innerHTML=btn('storyCommit','Record this decision','primary');}
function commitStory(){if(storyChoicePending===null)return;const c=STORIES[S.choices.length].choices[storyChoicePending];for(let i=0;i<3;i++)S.council[i]=clamp(S.council[i]+c[2][i],0,20);S.choices.push(storyChoicePending);award('story-'+S.choices.length,70);save();openStory();}
const TRADE_NODES=[['Inland depot',40,135],['Oasis',125,60],['High pass',220,32],['River ford',242,160],['Craft town',355,80],['Harbour',455,167]];
const TRADE_EDGES=[{a:0,b:1,w:2,d:3,c:0,name:'Follow the valley'},{a:0,b:2,w:5,d:2,c:1,name:'Cross the exposed pass'},{a:1,b:3,w:1,d:2,c:0,name:'Follow the river'},{a:1,b:4,w:4,d:3,c:0,name:'Cross the dry plain'},{a:2,b:4,w:3,d:2,c:0,name:'Descend the pass'},{a:3,b:4,w:2,d:2,c:0,name:'Visit the craft market'},{a:3,b:5,w:5,d:4,c:0,name:'Take the river road'},{a:4,b:5,w:3,d:2,c:0,name:'Follow the coast'}];
function openTrade(){trade={node:0,water:6,cargo:5,coins:6,days:0,route:[0],replenished:[],sold:false};renderTrade();}
function tradeSVG(){return `<svg class="route-map" viewBox="0 0 500 215" role="img" aria-label="Fictional caravan route network"><path d="M6 206Q130 134 160 180T490 185" style="stroke:#699c88;stroke-width:10;stroke-dasharray:none"/>${TRADE_EDGES.map(e=>{const a=TRADE_NODES[e.a],b=TRADE_NODES[e.b];return `<path d="M${a[1]} ${a[2]}L${b[1]} ${b[2]}"/>`;}).join('')}${TRADE_NODES.map((n,i)=>`<circle cx="${n[1]}" cy="${n[2]}" r="${trade.node===i?10:7}" class="${trade.route.includes(i)?'visited':''}"/><text x="${n[1]}" y="${n[2]+22}" text-anchor="middle">${n[0]}</text>`).join('')}</svg>`;}
function renderTrade(){const n=TRADE_NODES[trade.node];setModal('trade',head('Discovery 07 / the caravan','The Forgotten Trade Routes.','Deliver at least three of your five craft bundles to the harbour. This fictional network uses invented distances, costs and goods to teach planning.')+tradeSVG()+`<div class="stat-row"><div class="stat"><b>${trade.water}/8</b><small>water</small></div><div class="stat"><b>${trade.cargo}</b><small>bundles</small></div><div class="stat"><b>${trade.coins}</b><small>coins / day ${trade.days}</small></div></div><div class="eyebrow">At ${n[0]}</div><div class="choice-list">${TRADE_EDGES.map((e,i)=>e.a===trade.node?`<button class="choice" data-act="route:${i}" ${trade.water<e.w?'disabled':''}><b>${e.name} &#8594; ${TRADE_NODES[e.b][0]}</b><small>${e.w} water &middot; ${e.d} days ${e.c?'&middot; lose 1 bundle on rough terrain':''}${trade.water<e.w?' &middot; not enough water':''}</small></button>`:'').join('')}</div><div class="actions">${[1,3,4].includes(trade.node)?btn('resupply','Buy 4 water / 1 coin','primary',trade.coins<1||trade.water===8):''}${trade.node===4?btn('sell','Trade 1 bundle / gain 2 coins','',trade.sold||trade.cargo<=3):''}${btn('trade','Start a new caravan','small')}</div><p class="fine" style="margin-top:15px">Oasis, river ford and craft town offer water. A shorter route is not automatically the most viable one.</p><div id="feedback" hidden></div>`);}
function chooseRoute(i){const e=TRADE_EDGES[i];if(e.a!==trade.node||trade.water<e.w)return;trade.water-=e.w;trade.days+=e.d;trade.cargo-=e.c;trade.node=e.b;trade.route.push(e.b);tone(450,.1,.03);if(e.b===5){if(trade.cargo>=3){S.trade=true;award('trade',160);save();setModal('tradeDone',head('A journey completed','The caravan arrives.',`You delivered ${trade.cargo} bundles in ${trade.days} days, with ${trade.water} water remaining.`)+`<div class="note">Your route: ${trade.route.map(i=>TRADE_NODES[i][0]).join(' &#8594; ')}.</div><p class="muted">Water stops, terrain and cargo all changed your decisions. Geography helps explain why exchange depends on more than a straight line between two places.</p><div class="actions">${btn('world','Back to Hampi','primary')}${btn('trade','Try another route')}${btn('codex','Record of discovery')}</div>`);}else feedback('The cargo was too depleted. Start a new caravan and protect at least three bundles.',true);}else renderTrade();}
function openChronicle(){if(Object.keys(S.lamps).length<7){notify('Seven fragments are needed','Restore all seven heritage lamps first.');return;}const periods=SITES.map(s=>s.period);setModal('chronicle',head('Discovery 04 / the evidence board','The Missing Chronicle.','Match every lamp fragment with its place and broad historical context. The Chronicle connects different eras, not one simultaneous ancient journey.')+`<div style="margin-top:20px">${FRAGMENTS.map((f,i)=>`<div class="evidence-row" id="evidence${i}"><div><b>0${i+1} / ${f[0]}</b><small>${f[1]}</small></div><div><select aria-label="Place for fragment ${i+1}" data-evidence="place:${i}"><option value="">Choose a place</option>${SITES.map(s=>`<option value="${s.id}" ${chroniclePlace[i]===s.id?'selected':''}>${s.name}</option>`).join('')}</select><select aria-label="Period for fragment ${i+1}" style="margin-top:6px;width:100%" data-evidence="era:${i}"><option value="">Choose a context</option>${periods.map((p,j)=>`<option value="${j}" ${chronicleEra[i]===String(j)?'selected':''}>${p}</option>`).join('')}</select></div></div>`).join('')}</div><div id="feedback" hidden></div><div class="actions">${btn('chronicleCheck','Reconstruct the Chronicle','primary')}${btn('codex:timeline','Consult the timeline')}</div>`,true);}
function checkChronicle(){let correct=0;FRAGMENTS.forEach((f,i)=>{const good=chroniclePlace[i]===f[2]&&chronicleEra[i]===String(SITES.findIndex(s=>s.id===f[2]));$('evidence'+i).style.borderLeft=good?'2px solid #a7ddc5':'2px solid #efae98';$('evidence'+i).style.paddingLeft='10px';if(good)correct++;});if(correct<7){feedback(`${correct} of 7 fragments have both the right place and context. Revisit the timeline for the others.`,true);return;}S.chronicle=true;award('chronicle',250);save();setModal('chronicleDone',head('The story comes together','Not one lost kingdom.<br>A shared inheritance.','The pages tell of people who painted, stored water, read, built, traded and taught across different places and centuries. Their connections are a theme, not proof that all these characters met.')+`<div class="note">${allReady()?'Every milestone is complete. Saraswati awaits in the central garden for the final gathering.':'The Chronicle is whole. Your journey journal shows which discoveries remain.'}</div><div class="actions">${btn(allReady()?'travel:hub':'quests',allReady()?'Return to Saraswati':'See remaining discoveries','primary')}${btn('codex','Open the museum')}</div>`);}

// -----------------------------------------------------------------------------
// Three genuine 3D workspaces: artifact inspection, construction and Time Lens.
// They share the WebGL renderer, with isolated instanced geometry for clarity.
// -----------------------------------------------------------------------------
let artifactBounds=null,cityHover=-1,cityResetArmed=false;
function setActivity(type,tag,title,caption){mode=type;showcase=true;modalKind='';$('activityTag').textContent=tag;$('activityTitle').textContent=title;$('activityCaption').textContent=caption;$('hotspots').innerHTML='';stageZoom=1;syncUI();}
function sideHeader(tag,title){return `<button class="close" style="right:56px;font-size:14px" data-act="pause" aria-label="Pause activity (P)">&#10074;&#10074;</button><button class="close" data-act="world" aria-label="Leave activity">&times;</button><div class="eyebrow">${tag}</div><h2>${title}</h2>`;}
function openArtifact(i=0){if(!S.lamps.dholavira){notify('The excavation case is sealed','Restore Dholavira\'s water lamp first.');return;}artifactIndex=clamp(i,0,2);artifactTool='rotate';stageYaw=.28;stagePitch=.02;setActivity('artifact','Discovery 01 / interactive 3D specimen','The Archaeologist\'s Eye.','Drag the object to rotate it. Select the brush to reveal its surface.');renderArtifactSide();}
function renderArtifactSide(){const a=ARTS[artifactIndex],clean=S.artClean[artifactIndex],seen=S.artSeen[artifactIndex],done=S.artifacts[artifactIndex];
 $('activitySide').innerHTML=sideHeader('Replica '+(artifactIndex+1)+' / 3',a.name)+`<p>${a.era}. A fictional teaching object, not a scanned museum artifact.</p><div class="tabs">${ARTS.map((v,i)=>btn('artifact:'+i,(S.artifacts[i]?'&#10003; ':'')+['Tablet','Pottery','Token'][i],`small ${i===artifactIndex?'active':''}`)).join('')}</div><div class="row"><span class="fine">Surface revealed</span><span class="completion" id="cleanPercent">${Math.round(clean*100)}%</span></div><div class="meter"><i id="cleanMeter" style="width:${clean*100}%"></i></div><div class="actions">${btn('artBrush','Gently brush','small',clean>=1)}${btn('artTool:rotate','Rotate','small '+(artifactTool==='rotate'?'active':''))}${btn('artTool:brush','Brush tool','small '+(artifactTool==='brush'?'active':''))}</div><div class="rule"></div><div class="eyebrow">Observe three clues</div><div class="choice-list">${a.evidence.map((e,i)=>`<button class="choice" data-act="evidence:${i}" ${clean<1?'disabled':''}><b>${seen&(1<<i)?'&#10003; ':''}${i+1}. ${e[0]}</b>${seen&(1<<i)?`<small>${e[1]}</small>`:''}</button>`).join('')}</div>${seen===7?`<div class="rule"></div><p style="color:var(--text)"><b>${a.question}</b></p><div class="choice-list">${a.options.map((text,i)=>`<button class="choice" data-act="artAnswer:${i}" ${done?'disabled':''}>${text}</button>`).join('')}</div>`:'<p class="fine" style="margin-top:12px">Reveal the surface, then inspect every clue before forming a conclusion.</p>'}<div id="artFeedback" ${done?'':'hidden'} class="feedback">${done?'Documented: '+a.lesson:''}</div>${done?`<div class="actions">${btn(artifactIndex<2?'artifact:'+(artifactIndex+1):'codex',artifactIndex<2?'Next replica &#8594;':'Open museum','primary wide')}</div>`:''}<p class="fine" style="margin-top:16px">Brush only the game replicas. Real objects should be handled and conserved by qualified specialists.</p>`;
 $('stageBottom').innerHTML=btn('artTurn:-1','&#8634; Turn left','small')+btn('artTurn:1','Turn right &#8635;','small')+btn('artZoom:1','Closer +','small')+btn('artZoom:-1','Further -','small');
 $('hotspots').innerHTML=clean>=1?a.evidence.map((e,i)=>`<button id="hot${i}" class="artifact-hotspot ${seen&(1<<i)?'seen':''}" data-act="evidence:${i}" aria-label="Inspect ${e[0]}">${i+1}</button>`).join(''):'';
}
function brushArtifact(amount=.21){const i=artifactIndex,before=S.artClean[i];S.artClean[i]=clamp(before+amount,0,1);if(S.artClean[i]===1&&before<1){renderArtifactSide();notify('Three clues are visible','Inspect each clue, then choose the most defensible conclusion.');save();}else{if($('cleanPercent'))$('cleanPercent').textContent=Math.round(S.artClean[i]*100)+'%';if($('cleanMeter'))$('cleanMeter').style.width=S.artClean[i]*100+'%';}}
function inspectEvidence(i){if(S.artClean[artifactIndex]<1)return;S.artSeen[artifactIndex]|=1<<i;renderArtifactSide();save();}
function answerArtifact(i){const a=ARTS[artifactIndex];if(S.artSeen[artifactIndex]!==7)return;if(i!==a.answer){feedback('That goes beyond the supplied evidence. Look again at what the clues establish and what they leave unknown.',true,'artFeedback');return;}S.artifacts[artifactIndex]=true;award('artifact-'+artifactIndex,120);save();tone(660,.3,.045);renderArtifactSide();}
function localArtifactPoint(x,y,z){const cp=Math.cos(stagePitch),sp=Math.sin(stagePitch),cy=Math.cos(stageYaw),sy=Math.sin(stageYaw),py=y*cp-z*sp,pz=y*sp+z*cp;return [x*cy+pz*sy,py+1.85,-x*sy+pz*cy];}
function artPart(name,x,y,z,sx,sy,sz,c,ry=0,rx=0,rz=0,k=0){const p=localArtifactPoint(x,y,z);inst(name,p[0],p[1],p[2],sx,sy,sz,c,stageYaw+ry,stagePitch+rx,rz,k);}
function makeSherd(){const out=[],sections=24,rings=10;const point=(i,j,back)=>{const a=-.92+i/sections*2.8,y=-.95+j/rings*1.9,r=1.07+.26*Math.sin(j/rings*Math.PI)-(back?.105:0);return {p:[Math.sin(a)*r,y,Math.cos(a)*r],n:norm([Math.sin(a)*(back?-1:1),0,Math.cos(a)*(back?-1:1)])};};for(const back of [false,true])for(let i=0;i<sections;i++)for(let j=0;j<rings;j++){const p=point(i,j,back),q=point(i+1,j,back),r=point(i,j+1,back),s=point(i+1,j+1,back);if(!back){tri(out,p.p,q.p,s.p,p.n,q.n,s.n);tri(out,p.p,s.p,r.p,p.n,s.n,r.n);}else{tri(out,p.p,s.p,q.p,p.n,s.n,q.n);tri(out,p.p,r.p,s.p,p.n,r.n,s.n);}}for(const side of [0,sections])for(let j=0;j<rings;j++){const a=point(side,j,false),b=point(side,j,true),c=point(side,j+1,true),d=point(side,j+1,false);tri(out,a.p,b.p,c.p,[0,0,1]);tri(out,a.p,c.p,d.p,[0,0,1]);}makeMesh('sherd',out);}
function drawArtifact(time){box(0,-.18,0,80,.2,80,'#203b2c');inst('cyl',0,.25,0,1.7,.5,1.7,'#526649');inst('cyl',0,.53,0,1.83,.1,1.83,C.dark);inst('ring',0,.59,0,1.65,.5,1.65,C.gold);
 const type=ARTS[artifactIndex].type;
 if(type==='seal'){
  artPart('box',0,0,0,2.6,2.35,.28,'#c7b17f');artPart('box',0,0,.151,2.31,2.06,.035,'#d6c28c');
  for(const s of [-1,1]){artPart('box',s*1.1,0,.18,.025,1.96,.02,C.dark);artPart('box',0,s*.96,.18,2.22,.025,.02,C.dark);}
  for(let i=0;i<5;i++){const x=-.84+i*.41;artPart('box',x,.64,.185,.055,.32,.035,C.dark);artPart('box',x,.65,.19,.22,.045,.03,C.dark,0,0,i%2?.5:0);}
  artPart('box',-.13,-.26,.188,1.1,.43,.04,'#6e7550');artPart('box',.57,-.08,.19,.39,.35,.045,'#6e7550');artPart('box',.72,.17,.19,.07,.36,.04,'#6e7550',0,0,-.4);
  for(const x of [-.52,.25])artPart('box',x,-.62,.19,.07,.35,.05,'#6e7550');artPart('box',-.77,-.13,.19,.39,.06,.035,'#6e7550',0,0,-.5);
  artPart('ring',0,.15,-.32,.46,.4,.46,C.dark,0,Math.PI/2);
  artPart('box',.99,-.65,.18,.05,.47,.025,C.dark,0,0,-.5);
 }else if(type==='pot'){
  artPart('sherd',0,0,-.45,1,1,1,'#bc8650');for(let j=0;j<16;j++){const a=-.8+j/16*2.5;artPart('box',Math.sin(a)*1.3,.48,Math.cos(a)*1.3-.44,.16,.055,.04,'#603d2d',a);artPart('box',Math.sin(a)*1.27,.66,Math.cos(a)*1.27-.44,.16,.035,.04,'#dfbe7f',a);artPart('box',Math.sin(a)*1.3,-.41,Math.cos(a)*1.3-.44,.08,.2,.055,j%2?'#704431':'#d6ac67',a,0,j%2?.45:-.45);}
 }else{
  artPart('cyl',0,0,0,1.13,.19,1.13,'#ad9763',0,Math.PI/2);artPart('ring',0,0,.12,1.01,.48,1.01,C.gold,0,Math.PI/2);
  for(let k=0;k<4;k++){const a=k*TAU/4;artPart('box',Math.sin(a)*.36,Math.cos(a)*.36,.15,.66,.065,.08,C.dark,0,0,-a+Math.PI/4);}artPart('box',0,0,.16,.1,.52,.07,C.gold);artPart('box',0,0,.16,.52,.1,.07,C.gold);
 }
 // Removing dust changes the actual model, not a static illustration.
 for(let j=0;j<35;j++)if(j/35>=S.artClean[artifactIndex]){const x=Math.sin(j*12.32)*.99,y=Math.cos(j*7.63)*.8;artPart('box',x,y,type==='pot'?.82:.21,.23+(j%3)*.06,.12+(j%4)*.025,.034,j%2?'#8e8158':'#9d8d5d',0,0,j*.7);}
}
const CITY_NAMES=['Empty','Road','Channel','Well','Home','Market','Learning','Spring'],CITY_COST=[0,2,3,8,10,14,14,0],CITY_SYMBOL=['.','+','~','O','H','M','L','S'],CITY_BUDGET=96;
function neighbors(i){const c=i%6,r=Math.floor(i/6);return DIRS.map(([x,y])=>[c+x,r+y]).filter(([x,y])=>x>=0&&x<6&&y>=0&&y<6).map(([x,y])=>y*6+x);}
function flood(start,allowed){const seen=new Set([start]),q=[start];while(q.length){const i=q.shift();for(const n of neighbors(i))if(!seen.has(n)&&allowed(S.cityBoard[n])){seen.add(n);q.push(n);}}return seen;}
function cityAnalysis(board=S.cityBoard){const road=flood(33,t=>t===1),water=flood(12,t=>[2,3,7].includes(t)),wells=[...water].filter(i=>board[i]===3),buildings=board.map((t,i)=>t>=4&&t<=6?i:-1).filter(i=>i>=0);let cost=0;board.forEach((t,i)=>{if(i!==12&&i!==33)cost+=CITY_COST[t];});const roadOK=buildings.length>0&&buildings.every(i=>neighbors(i).some(n=>road.has(n))),waterOK=buildings.length>0&&buildings.every(i=>wells.some(j=>Math.abs(i%6-j%6)+Math.abs(Math.floor(i/6)-Math.floor(j/6))<=4));const checks=[board.filter(t=>t===4).length>=2,board.includes(5),board.includes(6),roadOK,waterOK,cost<=CITY_BUDGET];return {road,water,wells,buildings,cost,checks,valid:checks.every(Boolean)};}
function openBuild(){if(!S.lamps.dholavira){notify('Settlement fragments are still hidden','Restore Dholavira\'s reservoir lamp first.');return;}stageYaw=.3;stagePitch=.83;cityTool=1;cityResetArmed=false;cityHover=-1;setActivity('build','Discovery 02 / a living 3D settlement','Rebuild the Lost City.','Select a building, then click a ground tile. Drag to orbit, or use the precise plan grid.');renderCitySide();}
function renderCitySide(){const a=cityAnalysis(),scroll=$('activitySide').scrollTop;
 $('activitySide').innerHTML=sideHeader('A planning challenge',S.city?'A connected settlement.':'Build for people.')+`<p>Two homes, one marketplace, one learning space. Every building needs a road to the gate and water from a connected well.</p><div class="row" style="margin-top:12px"><span class="pill">${CITY_BUDGET-a.cost} materials left</span><span class="fine">${a.cost} / ${CITY_BUDGET} used</span></div><div class="tool-grid">${[1,2,3,4,5,6,0].map(t=>`<button data-act="cityTool:${t}" class="${cityTool===t?'active':''}"><b>${t===0?'&#215;':CITY_SYMBOL[t]}</b>${t===0?'Remove':CITY_NAMES[t]}<small>${t===0?'Full refund':CITY_COST[t]+' materials'}</small></button>`).join('')}</div><div class="eyebrow">Precise plan / click any tile</div><div class="plan-grid" id="planGrid">${S.cityBoard.map((t,i)=>`<button class="${[2,3,7].includes(t)?'water':t===1?'road':t>=4?'building':''} ${i===12||i===33?'fixed':''}" data-act="cell:${i}" aria-label="Row ${Math.floor(i/6)+1} column ${i%6+1}: ${CITY_NAMES[t]}" title="${CITY_NAMES[t]}${i===33?' / fixed gate':''}">${i===33?'G':CITY_SYMBOL[t]}</button>`).join('')}</div><div class="checks">${['At least two homes','A marketplace','A learning space','Every building reaches gate roads','Every building supplied by a well','Within the material budget'].map((v,i)=>`<span class="${a.checks[i]?'ok':''}">${a.checks[i]?'&#10003;':'&#9675;'} ${v}</span>`).join('')}</div><div style="clear:both"></div><div class="note"><b>Water:</b> Spring S &#8594; channels ~ &#8594; well O. A connected well serves buildings within <b>4 grid steps</b>.<br><b>Roads:</b> H, M and L each need an adjacent + road connected to gate G.</div><div class="actions">${btn('cityApprove',S.city?'Plan approved &#10003;':'Test my settlement','primary wide',S.city)}${btn('cityHint','Planning hint','small')}${btn('cityReset',cityResetArmed?'Confirm clear plan':'Clear plan','small danger')}</div><div id="cityFeedback" hidden></div><p class="fine" style="margin-top:14px">This settlement and its service rules are invented. The learning space is a gameplay building, not a claimed identification at Dholavira.</p>`;
 $('activitySide').scrollTop=scroll;$('stageBottom').innerHTML=btn('cityView','Change view','small')+btn('stageZoom:1','Zoom +','small')+btn('stageZoom:-1','Zoom -','small');
}
function placeCity(i){if(i<0||i>=36)return;if(i===12||i===33){notify('A fixed anchor',i===12?'The spring supplies the water network.':'The gate anchors the road network.');return;}const cost=cityAnalysis().cost-CITY_COST[S.cityBoard[i]]+CITY_COST[cityTool];if(cost>CITY_BUDGET){feedback('Not enough materials. Remove a tile for a full refund before replacing it.',true,'cityFeedback');return;}if(S.cityBoard[i]===cityTool)return;S.cityBoard[i]=cityTool;S.city=false;cityResetArmed=false;tone(220+cityTool*45,.1,.025);renderCitySide();save();}
function approveCity(){const a=cityAnalysis();if(!a.valid){feedback('Not quite connected yet. The checklist identifies missing services. Water pipes and roads are separate networks.',true,'cityFeedback');return;}S.city=true;award('city',180);save();renderCitySide();feedback('Your settlement is connected. The approved buildings now appear as a miniature beside Dholavira in the world.',false,'cityFeedback');notify('A city comes to life','Homes, water, exchange and learning now form one working plan.');}
function clearCity(){if(!cityResetArmed){cityResetArmed=true;renderCitySide();return;}S.cityBoard=freshState().cityBoard;S.city=false;cityResetArmed=false;renderCitySide();save();}
function drawCity(time){const a=cityAnalysis();box(0,-.34,0,15,.6,15,C.dark);box(0,-.06,0,12.3,.13,12.3,C.sand);
 for(let i=0;i<36;i++){const x=(i%6-2.5)*1.8,z=(Math.floor(i/6)-2.5)*1.8,t=S.cityBoard[i];box(x,.03,z,1.72,.14,1.72,t===1?'#b7a775':'#7e9458');
  if(t===1){box(x,.112,z,1.2,.03,1.2,a.road.has(i)?C.light:C.dark);for(const dx of [-.36,.36])for(const dz of [-.36,.36])box(x+dx,.14,z+dz,.62,.03,.62,'#cab98a');}
  if(t===2){box(x,.13,z,1.37,.12,1.37,C.dark);box(x,.21,z,1.13,.035,1.13,a.water.has(i)?C.wet:'#394f37',0,0,0,a.water.has(i)?2:0);}
  if(t===3){inst('cyl',x,.48,z,.57,.7,.57,C.sand);inst('cyl',x,.84,z,.65,.16,.65,C.light);inst('cyl',x,.935,z,.46,.03,.46,a.water.has(i)?C.wet:'#354532',0,0,0,a.water.has(i)?2:0);for(const sign of [-1,1])box(x+sign*.53,1.2,z,.09,.95,.1,C.dark);box(x,1.67,z,1.35,.12,.14,C.dark);}
  if(t===4){house(x,z,.45,'#c58e57');}
  if(t===5){for(const dx of [-.58,.58])for(const dz of [-.46,.46])box(x+dx,.8,z+dz,.09,1.4,.09,C.dark);box(x,1.5,z,1.55,.15,1.35,'#c2a451');for(let j=0;j<4;j++)box(x-.54+j*.36,1.59,z,.18,.055,1.4,j%2?'#d8c577':'#a46843');box(x,.47,z,.96,.6,.75,C.brick);pot(x-.25,.79,z,.17);pot(x+.2,.79,z,.19);}
  if(t===6){box(x,.7,z,1.45,1.2,1.2,'#d2bb81');box(x,1.36,z,1.6,.17,1.4,C.dark);box(x,1.57,z,1.3,.3,1.2,C.light);box(x,.56,z+.615,.45,.93,.03,'#314b32');for(const dx of [-.49,.49])box(x+dx,.93,z+.62,.22,.28,.025,'#574e33');}
  if(t===7){box(x,.27,z,1.65,.4,1.65,C.dark);box(x,.49,z,1.39,.05,1.39,C.wet,0,0,0,2);sphere(x,.83+Math.sin(time*2)*.04,z,.15,.22,.15,'#ace6c7',1);}
  if(i===33){for(const sign of [-1,1])box(x+sign*.75,.7,z+.65,.17,1.3,.17,C.dark);box(x,1.43,z+.65,1.9,.15,.25,C.gold);}
  if(i===cityHover)inst('ring',x,.22,z,.82,.4,.82,C.gold,0,0,0,1);
 }
}
function openLens(){lensIndex=S.lensDone.findIndex(v=>!v);if(lensIndex<0)lensIndex=0;lensSeen=[0,0,0];stageYaw=.3;stagePitch=.56;lensSeen[lensIndex]|=S.era?2:1;setActivity('lens','Discovery 05 / compare and question','The Time Lens.','Look at the same artistic scene in two states. Neither state is a surveyed reconstruction.');renderLensSide();}
function renderLensSide(){const p=LENS_POINTS[lensIndex],ready=lensSeen[lensIndex]===3,done=S.lensDone[lensIndex];$('activitySide').innerHTML=sideHeader('Observation '+(lensIndex+1)+' / 3',p.name)+`<p>${p.look}</p><div class="tabs">${LENS_POINTS.map((v,i)=>btn('lensPoint:'+i,(S.lensDone[i]?'&#10003; ':'')+(i+1),`small ${i===lensIndex?'active':''}`)).join('')}</div><div class="note"><b>${S.era?'PAST / ARTISTIC INTERPRETATION':'PRESENT / IMAGINED RUINS'}</b><br>${S.era?'Missing details have been imagined by the game artist.':'A simplified scene evokes surviving structures; it is not a survey of the actual site.'}</div><div class="checks"><span class="${lensSeen[lensIndex]&1?'ok':''}">${lensSeen[lensIndex]&1?'&#10003;':'&#9675;'} Observe the present view</span><span class="${lensSeen[lensIndex]&2?'ok':''}">${lensSeen[lensIndex]&2?'&#10003;':'&#9675;'} Observe the imagined past</span></div><div class="actions">${btn('era:0','Present ruins','small '+(!S.era?'active':''))}${btn('era:1','Imagined past','small '+(S.era?'active':''))}</div><div class="rule"></div><p style="color:var(--text)"><b>${p.question}</b></p><div class="choice-list">${p.answers.map((a,i)=>`<button class="choice" data-act="lensAnswer:${i}" ${!ready||done?'disabled':''}>${a}</button>`).join('')}</div><div id="lensFeedback" class="feedback" ${done?'':'hidden'}>${done?p.lesson:''}</div>${done?`<div class="actions">${btn('lensPoint:'+((lensIndex+1)%3),'Next feature &#8594;','primary')}</div>`:''}<p class="fine" style="margin-top:15px">The real Ajanta paintings and sculptures are important works of Buddhist art. The patterns shown here are original game artwork. ${sourceLink('ajanta')}</p>`;
 $('stageBottom').innerHTML=btn('era:0','Present ruins','small '+(!S.era?'active':''))+btn('era:1','Imagined past','small '+(S.era?'active':''))+btn('stageZoom:1','Zoom +','small');}
function changeEra(era){S.era=era;if(mode==='lens'){lensSeen[lensIndex]|=era?2:1;renderLensSide();}updateHUD();save();}
function answerLens(i){if(lensSeen[lensIndex]!==3)return;const p=LENS_POINTS[lensIndex];if(i!==p.answer){feedback('Visual detail is not proof. Distinguish what a surviving feature supports from what an artist has imagined.',true,'lensFeedback');return;}S.lensDone[lensIndex]=true;award('lens-'+lensIndex,45);save();if(S.lensDone.every(Boolean)){restoreLamp('ajanta',3);}else{renderLensSide();feedback(p.lesson,false,'lensFeedback');}}
function drawLens(time,dt){eraBlend=mix(eraBlend,S.era?1:0,reduced?1:1-Math.exp(-3.6*dt));const e=eraBlend;box(0,-.2,0,25,.4,24,'#465d3e');box(0,.04,0,13,.3,10,C.dark);box(0,.22,0,12.5,.11,9.4,C.sand);
 for(let x=-5;x<=5;x+=2)for(let z=-3;z<=3;z+=2)box(x,.295,z,1.92,.027,1.92,C.light);
 for(const x of [-4.8,-1.6,1.6,4.8]){const h=.8+e*3.3;column(x,.3,-1.5,h,C.sand);if(e>.015)box(x,h+.82,-1.5,3.22,.32,2.35,C.light);}
 for(const side of [-1,1]){const h=1.3+e*2.9;box(side*5.8,.3+h/2,-1,.75,h,6.9,C.dark);for(let j=0;j<3;j++)box(side*5.8,1.68,-3.4+j*2,.9,.35,.92,C.sand);}
 box(0,1.95,-4.1,11.7,3.3,.8,'#696d4c');box(0,2.05,-3.66,6.8,2.2,.07,e>.5?'#b77f4f':'#817651');
 for(let i=0;i<8;i++){const x=-2.9+i*.83,h=.5+e*.75;box(x,1.75+h*.35,-3.6,.35,h,.04,i%2?'#556b49':'#c0a36b');sphere(x,2.75,-3.6,.15,.17,.025,e>.5?C.gold:'#938963');}
 if(e>.01){box(0,4.91*e+.3,-2.7,12.4,.35,3.5,C.dark);for(let i=0;i<4;i++)box(0,5.2*e+.3+i*.13*e,-2.7,11.8-i*1.4,.14,3.4-i*.38,C.sand);}
 const spots=[[-4.8,.44,-1.5],[0,1.1,-3.35],[0,5.4*e+.5,-2.7]],p=spots[lensIndex];inst('ring',p[0],p[1],p[2],lensIndex===1?1.2:.75,.6,lensIndex===1?1.2:.75,C.gold,0,lensIndex===1?Math.PI/2:0,0,1);
}

// -----------------------------------------------------------------------------
// Controls, camera, audio, lifecycle and the main simulation loop.
// -----------------------------------------------------------------------------
let audio=null,master=null,sound=false;
function initAudio(){if(audio)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audio=new AC();master=audio.createGain();master.gain.value=0;master.connect(audio.destination);}catch(e){audio=null;}}
function updateAudio(){if(master&&audio)master.gain.setTargetAtTime(sound&&!document.hidden&&modalKind!=='pause'?.5:0,audio.currentTime,.06);}
function tone(freq,duration=.2,volume=.06){if(!sound||!audio||!master||document.hidden)return;try{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(master);o.start();o.stop(t+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();};}catch(e){}}
function toggleSound(){initAudio();if(!audio){notify('Audio unavailable','Every challenge remains playable without sound.');return;}sound=!sound;if(sound)audio.resume().catch(()=>{});updateAudio();appRoot.querySelectorAll('[data-act="sound"]').forEach(b=>b.textContent=sound?'Sound on':'Sound off');}
function groundHeight(x,z){if(Math.hypot(x,z-5)<5.4)return .33;for(const s of SITES)if(Math.abs(x-s.x)<7&&Math.abs(z-s.z)<7)return .39;return .12;}
function canStand(x,z){if(S.fly)return true;return !colliders.some(c=>{if(Math.abs(x-c.x)>=c.sx+.25||Math.abs(z-c.z)>=c.sz+.25)return false;const inside=Math.abs(player.x-c.x)<c.sx+.25&&Math.abs(player.z-c.z)<c.sz+.25;return !inside||Math.hypot((x-c.x)/c.sx,(z-c.z)/c.sz)<Math.hypot((player.x-c.x)/c.sx,(player.z-c.z)/c.sz)-.00001;});}
function toggleFlight(){S.fly=!S.fly;player.vy=0;if(S.fly)player.y=Math.max(player.y,groundHeight(player.x,player.z)+1.7);notify(S.fly?'Flight enabled':'Returning to the ground',S.fly?'Space rises; Shift descends. On touch, use the arrow buttons.':'WASD moves, Shift runs and Space jumps.');updateHUD();save();}
function movePlayer(dt){let x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stickX,z=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+stickY,wx=0,wz=0,len=Math.hypot(x,z);
 if(len>.09){moveTarget=null;x/=Math.max(1,len);z/=Math.max(1,len);wx=x*Math.cos(yaw)+z*Math.sin(yaw);wz=-x*Math.sin(yaw)+z*Math.cos(yaw);}else if(moveTarget){const dx=moveTarget.x-player.x,dz=moveTarget.z-player.z,d=Math.hypot(dx,dz);if(d<.18)moveTarget=null;else{wx=dx/d*Math.min(1,d/.4);wz=dz/d*Math.min(1,d/.4);}}
 const speed=S.fly?12:keys.has('ShiftLeft')||keys.has('ShiftRight')?9:5.6,ox=player.x,oz=player.z,nx=clamp(player.x+wx*speed*dt,-56,56),nz=clamp(player.z+wz*speed*dt,-55,60);
 if(canStand(nx,player.z))player.x=nx;if(canStand(player.x,nz))player.z=nz;const moved=Math.hypot(player.x-ox,player.z-oz);
 if(moveTarget&&moved<.0001&&Math.hypot(wx,wz)>.1)moveTarget=null;
 const ground=groundHeight(player.x,player.z);
 if(S.fly){const up=keys.has('Space')?1:0,down=keys.has('ShiftLeft')||keys.has('ShiftRight')?1:0;player.y=clamp(player.y+(up-down)*7*dt,ground+.25,22);}else{player.vy-=16*dt;player.y+=player.vy*dt;if(player.y<=ground){player.y=ground;player.vy=0;}}
 if(moved>.001){const target=Math.atan2(wx,wz),diff=Math.atan2(Math.sin(target-player.angle),Math.cos(target-player.angle));player.angle+=diff*(1-Math.exp(-14*dt));player.walk+=moved*3;}else player.walk=mix(player.walk,Math.round(player.walk/Math.PI)*Math.PI,1-Math.exp(-10*dt));
 SCROLLS.forEach((s,i)=>{if(!S.scrolls.includes(i)&&Math.hypot(player.x-s.x,player.z-s.z)<1.5&&player.y<2.6){S.scrolls.push(i);award('scroll-'+i,30);notify('Field folio: '+s.title,'A heritage connection has been recorded in your Living Codex.');tone(880,.25,.04);save();}});
 SITES.forEach(s=>{if(!S.visited.includes(s.id)&&Math.hypot(player.x-s.x,player.z-s.z)<11){S.visited.push(s.id);award('visit-'+s.id,25);notify('Discovered: '+s.name,s.region);save();}});
 updateNearest();
}
function updateNearest(){nearest=null;let best=3.7;if(player.y<3.7){const d=Math.hypot(player.x+1.7,player.z-5);if(d<best){nearest='hub';best=d;}SITES.forEach(s=>{const d=Math.hypot(player.x-(s.x+.85),player.z-(s.z+8.6));if(d<best){nearest=s.id;best=d;}});}
 $('interactBtn').hidden=!nearest;$('touchE').disabled=!nearest;$('interactText').textContent=nearest==='hub'?'Speak with Saraswati':nearest?'Explore '+SITES.find(s=>s.id===nearest).name:'';
 const location=SITES.reduce((best,s)=>Math.hypot(player.x-s.x,player.z-s.z)<Math.hypot(player.x-best.x,player.z-best.z)?s:best,SITES[0]);$('locationName').textContent=Math.hypot(player.x-location.x,player.z-location.z)<17?location.name:'The keeper\'s valley';
}
function interact(){if(mode!=='world')return;updateNearest();if(nearest==='hub')guideMenu();else if(nearest)siteMenu(nearest);else notify('Find a keeper','Land and approach a person beside a lamp. E opens the place\'s activities.');}
function project(x,y,z){const p=transformPoint(viewProj,x,y,z);if(p[3]<=0)return null;return{x:(p[0]/p[3]*.5+.5)*width,y:(-p[1]/p[3]*.5+.5)*height};}
function planePoint(clientX,clientY,level=0){const r=canvas.getBoundingClientRect(),nx=(clientX-r.left)/r.width*2-1,ny=1-(clientY-r.top)/r.height*2,a=transformPoint(invView,nx,ny,-1),b=transformPoint(invView,nx,ny,1);for(let i=0;i<3;i++){a[i]/=a[3];b[i]/=b[3];}const dy=b[1]-a[1];if(Math.abs(dy)<1e-7)return null;const t=(level-a[1])/dy;if(t<0)return null;return{x:a[0]+(b[0]-a[0])*t,z:a[2]+(b[2]-a[2])*t};}
function cityCellAt(x,y){const p=planePoint(x,y,.15);if(!p)return -1;const c=Math.floor((p.x+5.4)/1.8),r=Math.floor((p.z+5.4)/1.8);return c>=0&&c<6&&r>=0&&r<6?r*6+c:-1;}
function cameraUpdate(dt,time){let target,cy=yaw,cp=pitch,dist=distance,px=0,py=0;
 if(mode==='title'){target=[20,1.4,-31];cy=-.63+(reduced?0:Math.sin(time*.06)*.05);cp=.72;dist=width<760?43:38;px=width<760?-.42:-.58;}
 else if(showcase){
  if(mode==='artifact'){const d=(width<760?12.2:8.2)/stageZoom;target=[0,1.85,0];eye=[0,2.6,d];}
  else{target=mode==='build'?[0,.6,0]:[0,2,-1.8];dist=(width<760?(mode==='build'?31:29):mode==='build'?20:20)/stageZoom;eye=[target[0]+Math.sin(stageYaw)*Math.cos(stagePitch)*dist,target[1]+Math.sin(stagePitch)*dist,target[2]+Math.cos(stageYaw)*Math.cos(stagePitch)*dist];}
  if(width<760)py=-.48;else px=390/width;
  const proj=perspective(.78,width/height,.1,210);proj[8]=px;proj[9]=py;viewProj=mul(proj,lookAt(eye,target));invView=inverse(viewProj);return;
 }else if(mode==='celebration'){target=[0,1.5,5];cy=reduced?.5:celebrationTime*.18;cp=.65;dist=27;}
 else if(firstPerson&&mode==='world'){eye=[player.x,player.y+1.65,player.z];target=[eye[0]-Math.sin(yaw)*Math.cos(pitch),eye[1]-Math.sin(pitch),eye[2]-Math.cos(yaw)*Math.cos(pitch)];viewProj=mul(perspective(.98,width/height,.08,210),lookAt(eye,target));invView=inverse(viewProj);return;}
 else{target=[player.x,player.y+.8,player.z];if(width/height<.8)dist*=1.25;}
 const ease=reduced?1:1-Math.exp(-6*dt);for(let i=0;i<3;i++)camTarget[i]=mix(camTarget[i],target[i],ease);eye=[camTarget[0]+Math.sin(cy)*Math.cos(cp)*dist,camTarget[1]+Math.sin(cp)*dist,camTarget[2]+Math.cos(cy)*Math.cos(cp)*dist];const proj=perspective(.8,width/height,.1,230);proj[8]=px;proj[9]=py;viewProj=mul(proj,lookAt(eye,camTarget));invView=inverse(viewProj);
}
function initLabels(){$('labels').innerHTML=SITES.map(s=>`<div id="label-${s.id}" class="world-label">${s.name}<small>KEEPER &amp; HERITAGE LAMP</small></div>`).join('')+'<div id="label-hub" class="world-label">Dadi Saraswati<small>KEEPER OF STORIES</small></div>';}
function updateLabels(){if(mode==='world'){for(const s of [...SITES,{id:'hub',name:'Saraswati',x:-1.7,z:-3.6}]){const el=$('label-'+s.id),z=s.z+8.6,p=project(s.x,3.7,z);if(!p||Math.hypot(player.x-s.x,player.z-z)>28||p.x<10||p.x>width-10||p.y<40||p.y>height-50){el.hidden=true;continue;}el.hidden=false;el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;}}
 if(mode==='artifact'){
  const corners=[];for(const x of [-1.35,1.35])for(const y of [-1.18,1.18])for(const z of [-.25,.5]){const w=localArtifactPoint(x,y,z),p=project(...w);if(p)corners.push(p);}if(corners.length)artifactBounds={left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))};
  [[-.8,.65,.29],[1,-.56,.26],[-.5,-.55,.29]].forEach((v,i)=>{const el=$('hot'+i);if(!el)return;const w=localArtifactPoint(...v),p=project(...w);if(p)el.style.transform=`translate(${p.x-15}px,${p.y-15}px)`;});
 }
}
function drawMinimap(){const ctx=$('minimap').getContext('2d'),m=v=>120+v*1.72;ctx.clearRect(0,0,240,240);ctx.save();ctx.beginPath();ctx.arc(120,120,116,0,TAU);ctx.clip();ctx.fillStyle='#192f23';ctx.fillRect(0,0,240,240);ctx.strokeStyle='#5b7960';ctx.lineWidth=1;
 SITES.forEach(s=>{ctx.beginPath();ctx.moveTo(m(0),m(5));ctx.lineTo(m(s.x),m(s.z));ctx.stroke();ctx.fillStyle=S.lamps[s.id]?'#e4bf67':'#88a481';ctx.fillRect(m(s.x)-4,m(s.z)-4,8,8);});ctx.beginPath();ctx.strokeStyle='#659d90';ctx.lineWidth=6;for(let z=-60;z<65;z++){const x=8+Math.sin(z*.065)*6;if(z===-60)ctx.moveTo(m(x),m(z));else ctx.lineTo(m(x),m(z));}ctx.stroke();ctx.fillStyle='#f7e8b4';ctx.beginPath();ctx.arc(m(player.x),m(player.z),5,0,TAU);ctx.fill();ctx.restore();ctx.fillStyle='#e4bf67';ctx.font='16px system-ui';ctx.textAlign='center';ctx.fillText('N',120,21);}
function drawDynamics(dt,time){for(const b of batches.values())b.n=0;if(showcase){if(mode==='artifact')drawArtifact(time);if(mode==='build')drawCity(time);if(mode==='lens')drawLens(time,dt);}else drawWorldDynamics(dt,time);}
function modalTick(dt){if(modalKind==='memory'&&memory){if(memory.delay>0){memory.delay-=dt;if(memory.delay<=0){memory.flipped=[];paintMemory();}}if(memory.win>0){memory.win-=dt;if(memory.win<=0)restoreLamp('mithila',memory.moves<=12?3:memory.moves<=18?2:1);}}
 if(modalKind==='rhythm'&&rhythm?.running&&!rhythm.practice&&!rhythm.done){rhythm.time+=dt;rhythm.notes.forEach(n=>{if(!n.hit&&rhythm.time>n.at+.24)n.miss=true;});paintRhythm();if(rhythm.time>rhythm.notes[15].at+.6)finishRhythm();}}
let last=performance.now(),lastRender=0;
function loop(now){if(failed)return;raf=requestAnimationFrame(loop);const dt=clamp((now-last)/1000,0,.05);last=now;if(document.hidden)return;try{
 const active=mode==='world'||['artifact','build','lens','celebration'].includes(mode)||mode==='modal'&&!['pause','quests','map','codex','site','guide','reward','ending','tutorial'].includes(modalKind);
 if(active||mode==='title')simTime+=dt;if(started&&active)S.seconds+=dt;
 if(mode==='world')movePlayer(dt);if(mode==='modal')modalTick(dt);if(mode==='celebration'){celebrationTime+=dt;if(celebrationTime>=6)showEnding();}
 if(started&&now-lastSave>5000){lastSave=now;save();}if(now>toastUntil)$('toast').classList.remove('show');
 // Lower rendering frequency behind static reading screens, without advancing timers.
 if(mode==='modal'&&!['rhythm','memory'].includes(modalKind)&&now-lastRender<85)return;lastRender=now;
 if(frame++%45===0)resize();cameraUpdate(dt,simTime);drawDynamics(dt,simTime);render(simTime);updateLabels();if(mode==='world'&&frame%6===0)drawMinimap();
 }catch(e){fail(e);}}
function fail(e){failed=true;cancelAnimationFrame(raf);console.error(e);save();$('loading').hidden=true;$('title').hidden=true;$('hud').hidden=true;$('activity').hidden=true;$('modal').hidden=true;$('error').hidden=false;$('errorText').textContent='The 3D renderer could not continue. Reload to restore saved progress. A WebGL 2 browser with hardware acceleration is required.';}
function dispatch(action,el){const [name,arg]=action.split(':');switch(name){
 case 'world':setWorld();break;case 'enter':S.guide=true;setWorld();save();notify('Follow your curiosity','Start at Mithila, or open the atlas with M to choose any site.');break;
 case 'continue':continueJourney();break;case 'new':startNew();break;case 'restart':setModal('confirm',head('A new beginning','Start a fresh Chronicle?','This replaces the journey saved to your account, including your city, discoveries and choices.')+`<div class="actions">${btn('new','Start a new journey','primary')}${btn(started?'world':saved?'continue':'title','Keep my journey')}</div>`);break;
 case 'title':save();mode='title';showcase=false;$('continueBtn').hidden=!saved;syncUI();break;
 case 'pause':pauseGame();break;case 'resume':resumeGame();break;case 'sound':toggleSound();break;case 'quality':quality=(quality+1)%3;resize();if(el)el.textContent=['Eco','Balanced','High'][quality];break;case 'motion':reduced=!reduced;if(el)el.textContent=reduced?'On':'Off';break;
 case 'travel':teleport(arg);break;case 'site':siteMenu(arg);break;case 'map':openMap();break;case 'quests':openQuests();break;case 'codex':openCodex(arg||'museum');break;
 case 'memory':openMemory();break;case 'match':flipCard(Number(arg));break;case 'water':openWater();break;case 'pipe':turnWater(Number(arg));break;case 'waterHint':waterHint();break;
 case 'rings':openRings();break;case 'ring':turnRing(Number(arg));break;case 'ringHint':ringHint();break;
 case 'quiz':openQuiz();break;case 'quizAnswer':answerQuiz(Number(arg));break;case 'quizNext':nextQuiz();break;
 case 'rhythm':openRhythm(false);break;case 'rhythmPractice':openRhythm(true);break;case 'rhythmStart':startRhythm();break;case 'beat':hitBeat(Number(arg));break;
 case 'scripts':scriptReplayRound=null;scriptErrors=0;openScripts();break;case 'scriptReplay':scriptReplayRound=0;scriptErrors=0;scriptAnswer=[];scriptHint=false;renderScripts();break;
 case 'syllable':addSyllable(arg);break;case 'scriptCheck':checkScript();break;case 'scriptUndo':scriptAnswer.pop();$('scriptSlots').innerHTML=SCRIPT_ROUNDS[scriptRound()].map((_,i)=>`<span>${scriptAnswer[i]||'?'}</span>`).join('');break;case 'scriptKey':scriptHint=true;scriptErrors++;renderScripts();break;case 'speak':speakSyllables();break;
 case 'artifact':openArtifact(Number(arg)||0);break;case 'artTool':artifactTool=arg;renderArtifactSide();break;case 'artBrush':brushArtifact(.21);save();break;case 'evidence':inspectEvidence(Number(arg));break;case 'artAnswer':answerArtifact(Number(arg));break;case 'artTurn':stageYaw+=Number(arg)*.35;break;case 'artZoom':stageZoom=clamp(stageZoom+Number(arg)*.12,.65,1.45);break;
 case 'build':openBuild();break;case 'cityTool':cityTool=Number(arg);renderCitySide();break;case 'cell':placeCity(Number(arg));break;case 'cityApprove':approveCity();break;case 'cityReset':clearCity();break;case 'cityHint':feedback('Try a road spine in column 4 running north from G. Route the spring in row 3 through a channel in column 2 to a well in column 3. Put buildings alongside the road, within four grid steps of that well.',false,'cityFeedback');break;case 'cityView':stagePitch=stagePitch>.95?.7:1.27;break;
 case 'stageZoom':stageZoom=clamp(stageZoom+Number(arg)*.12,.65,1.5);break;
 case 'lens':openLens();break;case 'era':changeEra(arg==='1');break;case 'lensPoint':lensIndex=Number(arg);lensSeen[lensIndex]|=S.era?2:1;renderLensSide();break;case 'lensAnswer':answerLens(Number(arg));break;
 case 'story':openStory();break;case 'storyChoice':chooseStory(Number(arg));break;case 'storyCommit':commitStory();break;
 case 'trade':openTrade();break;case 'route':chooseRoute(Number(arg));break;case 'resupply':if(trade.coins>=1&&trade.water<8){trade.coins--;trade.water=Math.min(8,trade.water+4);renderTrade();}break;case 'sell':if(!trade.sold&&trade.cargo>3){trade.cargo--;trade.coins+=2;trade.sold=true;renderTrade();}break;
 case 'chronicle':openChronicle();break;case 'chronicleCheck':checkChronicle();break;case 'finale':finalGathering();break;
 }}
on(appRoot,'click',e=>{const el=e.target.closest('[data-act]');if(el&&!el.disabled){try{dispatch(el.dataset.act,el);}catch(err){fail(err);}}});
on(appRoot,'change',e=>{if(e.target.dataset.evidence){const [kind,i]=e.target.dataset.evidence.split(':');if(kind==='place')chroniclePlace[Number(i)]=e.target.value;else chronicleEra[Number(i)]=e.target.value;}});
$('startBtn').onclick=()=>saved?dispatch('restart'):startNew();$('continueBtn').onclick=continueJourney;$('mapBtn').onclick=openMap;$('minimap').onclick=openMap;$('journalBtn').onclick=()=>openCodex();$('questBtn').onclick=openQuests;$('pauseBtn').onclick=pauseGame;$('interactBtn').onclick=interact;$('touchE').onclick=interact;$('flyBtn').onclick=()=>{if(mode==='world')toggleFlight();};$('lensBtn').onclick=()=>changeEra(!S.era);
$('hintBtn').onclick=()=>{const task=taskList().find(t=>!t[4]);if(task)teleport(task[3]);else teleport('hub');};
$('closeModal').onclick=()=>modalKind==='pause'?resumeGame():setWorld();
function trapTab(e){const container=mode==='modal'?$('dialog'):['artifact','build','lens'].includes(mode)?$('activity'):null;if(!container)return;const nodes=[...container.querySelectorAll('button:not(:disabled),a[href],select,input')].filter(el=>el.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
on(window,'keydown',e=>{
 if(e.code==='Tab'){trapTab(e);return;}if(e.code==='Escape'){e.preventDefault();if(mode==='modal')modalKind==='pause'?resumeGame():setWorld();else if(['artifact','build','lens'].includes(mode))setWorld();else pauseGame();return;}
 if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
 if(e.code==='KeyP'&&!e.repeat){e.preventDefault();if(modalKind==='pause')resumeGame();else pauseGame();return;}
 if(mode==='modal'&&modalKind==='rhythm'){const i=['KeyD','KeyF','KeyJ','KeyK'].indexOf(e.code);if(i>=0){e.preventDefault();if(!e.repeat)hitBeat(i);}return;}
 if(mode==='lens'&&e.code==='KeyT'&&!e.repeat){changeEra(!S.era);return;}if(mode!=='world')return;
 if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}
 if(e.repeat)return;
 if(e.code==='Space'&&!S.fly&&player.y<=groundHeight(player.x,player.z)+.04)player.vy=6.2;
 if(e.code==='KeyE'){e.preventDefault();interact();}if(e.code==='KeyF')toggleFlight();if(e.code==='KeyT')changeEra(!S.era);if(e.code==='KeyV'){firstPerson=!firstPerson;pitch=firstPerson?.03:.62;$('reticle').hidden=!firstPerson;notify(firstPerson?'First-person view':'Explorer view','Drag the scene to look around.');}
 if(e.code==='KeyM')openMap();if(e.code==='KeyJ')openCodex();if(e.code==='KeyQ')openQuests();if(e.code==='KeyP')pauseGame();
});on(window,'keyup',e=>keys.delete(e.code));
on(canvas,'pointerdown',e=>{if(mode!=='world'||e.button!==0)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY,moved:false,type:e.pointerType};});
on(canvas,'pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(e.clientX-drag.ox,e.clientY-drag.oy)>6)drag.moved=true;if(drag.moved){yaw-=dx*.006;pitch=clamp(pitch+dy*.004,firstPerson?-1.1:.18,firstPerson?1.1:1.32);}drag.x=e.clientX;drag.y=e.clientY;});
on(canvas,'pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;if(!d.moved&&d.type!=='touch'&&!firstPerson){const p=planePoint(e.clientX,e.clientY,.12);if(p)moveTarget={x:clamp(p.x,-56,56),z:clamp(p.z,-55,60)};}if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);});
for(const event of ['pointercancel','lostpointercapture'])on(canvas,event,()=>drag=null);
on(canvas,'contextmenu',e=>e.preventDefault());on(canvas,'wheel',e=>{if(mode==='world'){e.preventDefault();distance=clamp(distance+e.deltaY*.012,7,32);}},{passive:false});
const stage=$('stageGesture');on(stage,'pointerdown',e=>{if(!showcase||e.button!==0)return;stage.setPointerCapture(e.pointerId);stageDrag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY,moved:false};});
on(stage,'pointermove',e=>{if(mode==='build')cityHover=cityCellAt(e.clientX,e.clientY);if(!stageDrag||stageDrag.id!==e.pointerId)return;const dx=e.clientX-stageDrag.x,dy=e.clientY-stageDrag.y,len=Math.hypot(dx,dy);if(Math.hypot(e.clientX-stageDrag.ox,e.clientY-stageDrag.oy)>5)stageDrag.moved=true;
 if(mode==='artifact'&&artifactTool==='brush'){const b=artifactBounds;if(b&&e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom)brushArtifact(len*.0022);}else if(stageDrag.moved){stageYaw-=dx*.008;stagePitch=clamp(stagePitch+dy*.005,mode==='artifact'?-.85:.25,mode==='artifact'?.85:1.34);}stageDrag.x=e.clientX;stageDrag.y=e.clientY;
});on(stage,'pointerup',e=>{if(!stageDrag||stageDrag.id!==e.pointerId)return;const d=stageDrag;stageDrag=null;if(!d.moved&&mode==='build')placeCity(cityCellAt(e.clientX,e.clientY));if(mode==='artifact')save();if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);});for(const event of ['pointercancel','lostpointercapture'])on(stage,event,()=>stageDrag=null);on(stage,'wheel',e=>{e.preventDefault();stageZoom=clamp(stageZoom-e.deltaY*.001,.65,1.5);},{passive:false});
const joystick=$('joystick');function moveStick(e){const r=joystick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,max=r.width*.31,len=Math.hypot(dx,dy),scale=len>max?max/len:1;stickX=dx*scale/max;stickY=dy*scale/max;$('thumb').style.transform=`translate(${dx*scale}px,${dy*scale}px)`;}
on(joystick,'pointerdown',e=>{if(mode!=='world')return;stickID=e.pointerId;joystick.setPointerCapture(e.pointerId);moveStick(e);});on(joystick,'pointermove',e=>{if(e.pointerId===stickID)moveStick(e);});for(const type of ['pointerup','pointercancel','lostpointercapture'])on(joystick,type,()=>{stickID=null;stickX=stickY=0;$('thumb').style.transform='translate(0,0)';});
for(const [id,key] of [['touchUp','Space'],['touchDown','ShiftLeft']]){const b=$(id);on(b,'pointerdown',e=>{if(mode!=='world')return;e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(key);if(key==='Space'&&!S.fly&&player.y<=groundHeight(player.x,player.z)+.04)player.vy=6.2;});for(const type of ['pointerup','pointercancel','lostpointercapture'])on(b,type,()=>keys.delete(key));}
on(window,'blur',()=>{resetInput();if(mode!=='title')pauseGame();});on(document,'visibilitychange',()=>{if(document.hidden){resetInput();pauseGame();save();}updateAudio();});on(window,'pagehide',save);
on(canvas,'webglcontextlost',e=>{e.preventDefault();fail(new Error('WebGL context lost'));});
function getProgress(){return {game:'lost-legends-of-bharat-3d',completed:S.complete,lamps:Object.keys(S.lamps).length,stars:Object.values(S.lamps).reduce((a,b)=>a+b,0),artifacts:S.artifacts.filter(Boolean).length,city:S.city,choices:S.choices.length,timeLens:S.lensDone.filter(Boolean).length,scriptRounds:S.scriptRound,trade:S.trade,chronicle:S.chronicle,folios:S.scrolls.length,xp:S.xp,seconds:Math.floor(S.seconds),mode};}
try{initRenderer();makeSherd();buildWorld();initLabels();resize();resizeObs=new ResizeObserver(resize);resizeObs.observe(root);$('continueBtn').hidden=!saved;$('loading').hidden=true;syncUI();raf=requestAnimationFrame(loop);}catch(e){fail(e);}
  // Load saved journey from the API (was synchronous localStorage).
  ctx.loadState(STORE_KEY).then((value) => {
    if (disposed || started || !value) return;
    try { saved = validatedSave(value); } catch (e) { saved = null; }
    const cont = $('continueBtn');
    if (cont && mode === 'title') cont.hidden = !saved;
  });

  return () => {
    disposed = true;
    try { if (started) save(); } catch (e) {}
    flushSave();
    failed = true;
    cancelAnimationFrame(raf);
    for (const id of timers) window.clearTimeout(id);
    timers.clear();
    for (const fn of cleanups.reverse()) fn();
    resizeObs?.disconnect();
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
    try { audio?.close(); } catch (e) {}
  };
}
