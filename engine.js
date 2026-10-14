(function (global) {
  'use strict';
  const W = 320, H = 200;
  const valid = (mask, x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[(y | 0) * W + (x | 0)] !== 0;
  function nearest(mask, x, y) {
    x = Math.max(0, Math.min(W - 1, Math.round(x))); y = Math.max(0, Math.min(H - 1, Math.round(y)));
    if (valid(mask, x, y)) return { x, y };
    let best = null, distance = Infinity;
    for (let i = 0; i < mask.length; i++) if (mask[i]) {
      const px = i % W, py = (i / W) | 0, d = (px - x) ** 2 + (py - y) ** 2;
      if (d < distance) { best = { x: px, y: py }; distance = d; }
    }
    return best;
  }
  function lineClear(mask, a, b) {
    const steps = Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 2);
    let last = a;
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i / steps : 0, p = { x: Math.round(a.x + (b.x - a.x) * t), y: Math.round(a.y + (b.y - a.y) * t) };
      if (!valid(mask, p.x, p.y)) return false;
      if (p.x !== last.x && p.y !== last.y && (!valid(mask, p.x, last.y) || !valid(mask, last.x, p.y))) return false;
      last = p;
    }
    return true;
  }
  function findPath(mask, start, goal) {
    const s = nearest(mask, start.x, start.y); if (!s) return [];
    const gx = Math.max(0, Math.min(319, Math.round(goal.x))), gy = Math.max(0, Math.min(199, Math.round(goal.y)));
    const previous = new Int32Array(W * H).fill(-1), queue = new Int32Array(W * H);
    const initial = s.y * W + s.x; previous[initial] = initial; queue[0] = initial;
    let head = 0, tail = 1, best = initial, bestDistance = Infinity;
    while (head < tail) {
      const index = queue[head++], x = index % W, y = (index / W) | 0, distance = (x - gx) ** 2 + (y - gy) ** 2;
      if (distance < bestDistance) { best = index; bestDistance = distance; } if (!distance) break;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
        const nx = x + dx, ny = y + dy, next = ny * W + nx;
        if (!valid(mask, nx, ny) || previous[next] !== -1) continue;
        if (dx && dy && (!valid(mask, x + dx, y) || !valid(mask, x, y + dy))) continue;
        previous[next] = index; queue[tail++] = next;
      }
    }
    const path = []; for (let i = best; i !== initial; i = previous[i]) path.push({ x: i % W, y: (i / W) | 0 }); path.push(s); path.reverse();
    const compact = [path[0]]; let anchor = 0;
    while (anchor < path.length - 1) { let next = anchor + 1; while (next + 1 < path.length && lineClear(mask, path[anchor], path[next + 1])) next++; compact.push(path[next]); anchor = next; }
    return compact;
  }
  const clone = x => JSON.parse(JSON.stringify(x));
  class Game {
    constructor(data, hooks = {}) {
      this.data = data; this.hooks = hooks; this.masks = {};
      for (const [id, room] of Object.entries(data.rooms)) this.masks[id] = Uint8Array.from(atob(room.navigationMask||room.mask), c => c.charCodeAt(0));
      this.reset();
    }
    reset() { this.state = { version: 1, room: 1, x: 40, y: 180, variables: Array(256).fill(0), inventory: [], selected: 0, objects: clone(this.data.objects), graphics: clone(this.data.graphics), animation: 'hombre.sca', visible: true, direction: 3 }; this.path = []; this.busy = false; this.epoch = (this.epoch || 0) + 1; this.warned = new Set(); }
    warn(text) { if (!this.warned.has(text)) { this.warned.add(text); this.hooks.notice?.(text); } }
    room() { return this.data.rooms[this.state.room]; }
    isGameOver() { return (this.data.deathRooms||[]).includes(this.state.room); }
    checkpoint() { if(!this.isGameOver()&&!this.state.completed)this.retryState=this.serialize(); }
    async retry() { if(!this.retryState||this.busy)return false;await this.restore(this.retryState);return true; }
    pixel() { const x = Math.max(0, Math.min(319, Math.round(this.state.x))), y = Math.max(0, Math.min(199, Math.round(this.state.y))); return this.masks[this.state.room][y * W + x]; }
    async enter(id, x, y, run = true) {
      if (!this.data.rooms[id]) { this.warn(`La escena ${id} no existe en los archivos originales.`); return false; }
      this.epoch++; this.path = []; this.travelled = 0; this.state.room = id;
      const p = nearest(this.masks[id], x, y) || { x: Math.max(0, Math.min(319,x)), y: Math.max(0,Math.min(199,y)) };
      this.state.x = p.x; this.state.y = p.y; this.hooks.room?.(this.room());
      if (run) await this.execute(this.room().commands, null, this.epoch); return true;
    }
    async start() { this.reset(); this.retryState=null; this.hooks.ending?.(false); await this.enter(this.data.initial.room, this.data.initial.x, this.data.initial.y); }
    hotspot(x, y) { return Object.values(this.state.objects).filter(o => o.room === this.state.room && !this.state.inventory.includes(o.id) && x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h).sort((a,b) => a.w*a.h-b.w*b.h)[0]; }
    mapEntrances() { return this.data.mapEntrances?.[this.state.room]||[]; }
    entranceAt(x,y) {
      const entries=this.mapEntrances();
      return entries.find(e=>Math.abs(x-e.x)<=e.w/2+2&&Math.abs(y-e.y)<=e.h/2+2)||entries.find(e=>x>=e.hit.x&&x<=e.hit.x+e.hit.w&&y>=e.hit.y&&y<=e.hit.y+e.hit.h);
    }
    walkToEntrance(entry) {
      if(this.busy||this.state.completed||this.isGameOver())return false;
      const mask=this.masks[this.state.room],safe=mask.slice();
      const hasActiveExit=nodes=>nodes.some(n=>n.op==='MI'||(n.body&&(!['IV','IT','IN','IO'].includes(n.op)||this.condition(n,null))&&hasActiveExit(n.body)));
      const blocked=new Set(this.room().commands.filter(n=>n.op==='IP'&&n.args[0]!==entry.region&&hasActiveExit(n.body||[])).map(n=>n.args[0]));
      for(let i=0;i<safe.length;i++)if(blocked.has(safe[i]))safe[i]=0;
      const start=Math.round(this.state.y)*W+Math.round(this.state.x);safe[start]=mask[start];
      const reachable=new Uint8Array(W*H),queue=new Int32Array(W*H);let head=0,tail=1;queue[0]=start;reachable[start]=1;
      while(head<tail){const i=queue[head++],x=i%W,y=Math.floor(i/W);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=ny*W+nx;if(valid(safe,nx,ny)&&!reachable[j]){reachable[j]=1;queue[tail++]=j;}}}
      const candidates=[];for(let i=0;i<mask.length;i++)if(mask[i]===entry.region&&reachable[i])candidates.push({x:i%W,y:Math.floor(i/W)});
      candidates.sort((a,b)=>Math.hypot(a.x-this.state.x,a.y-this.state.y)-Math.hypot(b.x-this.state.x,b.y-this.state.y));
      for(const target of candidates){
        const route=findPath(safe,this.state,target),end=route.at(-1);
        if(end&&mask[end.y*W+end.x]===entry.region){this.checkpoint();this.path=route.slice(1);this.hooks.notice?.('Yendo a '+entry.name+'…');return true;}
      }
      this.hooks.notice?.(this.state.room===10&&!this.state.variables[17]?'Para llegar por el agua necesitas aprender a nadar.':'No encuentro un camino desde aquí.');return false;
    }
    move(x, y) { if (this.busy || this.isGameOver() || this.state.completed || !this.state.visible) return; this.checkpoint(); this.path = findPath(this.masks[this.state.room], this.state, { x, y }).slice(1); }
    step(seconds) {
      if (this.busy || !this.path.length) return false;
      const previousX=this.state.x,previousY=this.state.y;
      let remaining = Math.min(seconds,.1) * (/mapa|coche|agua/.test(this.state.animation) ? 32 : 36);
      const initialRegion=this.pixel();
      while (remaining > 0 && this.path.length) {
        const p = this.path[0], dx = p.x-this.state.x, dy = p.y-this.state.y, dist = Math.hypot(dx,dy);
        if(dist<.001){this.path.shift();continue;}
        const horizontal=dx>0?0:1,vertical=dy>0?3:2;
        // Keep facing near a diagonal instead of flickering at each path corner.
        if(Math.abs(dx)>Math.abs(dy)*1.2)this.state.direction=horizontal;
        else if(Math.abs(dy)>Math.abs(dx)*1.2)this.state.direction=vertical;
        else if(this.state.direction!==horizontal&&this.state.direction!==vertical)this.state.direction=horizontal;
        const advance=Math.min(remaining,.5);
        if (dist <= advance) { this.state.x=p.x; this.state.y=p.y; this.path.shift(); remaining-=dist; }
        else { this.state.x+=dx/dist*advance; this.state.y+=dy/dist*advance; remaining-=advance; }
        // Stop at the first mask region change so even one-pixel exits fire before moving again.
        if(this.pixel()!==initialRegion)break;
      }
      const moved=Math.hypot(this.state.x-previousX,this.state.y-previousY);
      this.travelled=(this.travelled||0)+moved;
      return moved>0;
    }
    async tick() { if (this.busy || this.isGameOver() || this.state.completed) return; this.busy=true; try { await this.execute(this.room().commands,null,this.epoch); } finally { this.busy=false; } }
    async interact(target, used = this.state.selected) { if (this.busy || this.isGameOver() || this.state.completed) return; this.checkpoint();this.path=[]; this.busy=true; this.matched=false; try {
      if(used===4&&target===2&&this.state.inventory.includes(2)&&this.state.room!==2){this.state.documentReturn={room:this.state.room,x:this.state.x,y:this.state.y,visible:this.state.visible,animation:this.state.animation};await this.enter(2,41,158);this.matched=true;}
      else await this.execute(this.room().commands,{target,used},this.epoch);
      if(!this.matched&&used===4&&this.state.inventory.includes(target)){this.matched=true;await this.hooks.text?.(this.state.objects[target]?.name||'No veo nada especial.');}
      if (!this.matched) this.hooks.notice?.('No ocurre nada.');
    } finally { this.busy=false; this.hooks.inventory?.(); } }
    condition(node,event) {
      const [a,b]=node.args,s=this.state,v=s.variables;
      switch(node.op) {
        case 'IU': return !!event && event.used===a && event.target===b;
        case 'IV': return v[a]===b; case 'IT': return s.inventory.includes(a); case 'IN': return !s.inventory.includes(a);
        case 'IO': return s.objects[a]?.room===b; case 'IP': return this.pixel()===a; case 'IF': return this.pixel()!==a; case 'IY': return s.y>a;
        default:return false;
      }
    }
    async execute(nodes,event,epoch,depth=0) {
      if (depth>20) {this.warn('Cadena de escenas circular en los datos originales.');return;}
      for(const node of nodes) {
        if(epoch!==this.epoch)return;
        const [a,b,c]=node.args,s=this.state;
        if(node.body) { if(this.condition(node,event)) {if(node.op==='IU')this.matched=true;await this.execute(node.body,event,epoch,depth+1);} continue; }
        switch(node.op) {
          case 'OA': if(!s.inventory.includes(a))s.inventory.push(a);s.selected=a;this.hooks.inventory?.();break;
          case 'TP': await this.hooks.text?.(a);break;
          case 'VE':s.variables[a]=b;break;case 'VS':s.variables[a]+=b;break;case 'VR':s.variables[a]-=b;break;case 'VI':s.variables[a]++;break;case 'VD':s.variables[a]--;break;
          case 'GF':if(s.graphics[a])s.graphics[a].flag=b;break;case 'GP':if(s.graphics[a])Object.assign(s.graphics[a],{x:b,y:c});break;
          case 'CP':s.visible=!!a;break;case 'CA':s.animation=a.toLowerCase();break;case 'CE':if(a<4)s.direction=a;break;
          case 'CM':this.path=findPath(this.masks[s.room],s,{x:a,y:b}).slice(1);break;
          case 'MI': if(s.room===2&&a===1&&s.documentReturn){const back=s.documentReturn;delete s.documentReturn;await this.enter(back.room,back.x,back.y,false);s.visible=back.visible;s.animation=back.animation;return;}if(this.data.rooms[a]) {await this.enter(a,b,c,false);await this.execute(this.room().commands,null,this.epoch,depth+1);return;} this.warn(`La escena ${a} no existe en los archivos originales.`);break;
          case 'MC':await this.hooks.conversation?.(a,b);break;
          case 'CF':this.hooks.fade?.(a);break;
          case 'CC':case 'CR':break;
          case 'MA':await this.hooks.media?.('animation',a);break;
          case 'END':s.completed=true;s.selected=0;this.path=[];await this.hooks.ending?.(true);return;
          case 'SM':await this.hooks.media?.('music',a);break;
          case 'SS':await this.hooks.media?.('sound',a);break;
          default:this.warn(`Orden pendiente de adaptar: ${node.op}.`);return;
        }
      }
    }
    serialize() { return JSON.stringify(this.state); }
    async restore(json) {
      const s=JSON.parse(json);
      if(s.version!==1 || !this.data.rooms[s.room] || !Array.isArray(s.variables) || s.variables.length!==256 || !Array.isArray(s.inventory) || !Number.isFinite(s.x) || !Number.isFinite(s.y))throw new Error('Partida no válida');
      s.objects={...clone(this.data.objects),...s.objects};s.graphics={...clone(this.data.graphics),...s.graphics};
      // Geometry is asset data, not progress: keep improved hitboxes in older saves.
      for(const [id,obj] of Object.entries(s.objects))if(this.data.objects[id])for(const key of ['x','y','w','h','icon'])if(this.data.objects[id][key]!==undefined)obj[key]=this.data.objects[id][key];
      this.state=s;this.path=[];this.epoch++;this.hooks.room?.(this.room());this.hooks.inventory?.();this.hooks.ending?.(!!s.completed);
    }
  }
  global.Adventure={Game,findPath,nearest,lineClear,valid};
})(typeof window==='undefined'?globalThis:window);
