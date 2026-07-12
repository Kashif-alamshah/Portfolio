const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // boot overlay
  const boot = document.getElementById('boot');
  function dismissBoot(){ boot.classList.add('hide'); }
  if(reduceMotion){ dismissBoot(); } else {
    setTimeout(dismissBoot, 2000);
    document.getElementById('skipBoot').addEventListener('click', dismissBoot);
    boot.addEventListener('click', dismissBoot);
  }

  // scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {threshold:0.1});
  revealEls.forEach(el=>io.observe(el));

  // terminal line-by-line reveal
  const lines = document.querySelectorAll('.reveal-line');
  const termIO = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(!e.isIntersecting) return;
      lines.forEach((l, i)=> setTimeout(()=> l.classList.add('in'), reduceMotion ? 0 : i*90));
      termIO.disconnect();
    });
  }, {threshold:0.3});
  if(lines.length) termIO.observe(document.getElementById('termBody'));

  // draw-on loss curve
  window.addEventListener('load', ()=>{
    ['trainPath','valPath'].forEach((id, idx)=>{
      const path = document.getElementById(id);
      if(!path) return;
      const len = path.getTotalLength();
      if(reduceMotion){ path.style.strokeDasharray = id==='valPath' ? '6 5' : 'none'; return; }
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.getBoundingClientRect();
      path.style.transition = `stroke-dashoffset ${1.4 + idx*0.3}s cubic-bezier(.2,.7,.2,1) ${.2 + idx*0.25}s`;
      requestAnimationFrame(()=>{ path.style.strokeDashoffset = 0; });
      if(id === 'valPath'){
        setTimeout(()=>{ path.style.strokeDasharray = '6 5'; }, (1.4+idx*0.3)*1000 + 300);
      }
    });
  });

  // tiny rotating wireframe icosahedron — "checkpoint" icon
  (function initIco(){
    const wrap = document.getElementById('icoWrap');
    if(!wrap || typeof THREE === 'undefined') return;
    const size = 64;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 3.2;
    const renderer = new THREE.WebGLRenderer({alpha:true, antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    wrap.appendChild(renderer.domElement);

    const geo = new THREE.IcosahedronGeometry(1.15, 0);
    const wireframe = new THREE.WireframeGeometry(geo);
    const line = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({color:0xffb454, transparent:true, opacity:0.85}));
    scene.add(line);

    const dotGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({color:0x5ec8ea});
    geo.attributes.position && (function(){
      const pos = geo.attributes.position;
      const seen = new Set();
      for(let i=0;i<pos.count;i+=3){
        const key = `${pos.getX(i).toFixed(2)}_${pos.getY(i).toFixed(2)}_${pos.getZ(i).toFixed(2)}`;
        if(seen.has(key)) continue;
        seen.add(key);
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(pos.getX(i), pos.getY(i), pos.getZ(i));
        line.add(dot);
      }
    })();

    function animate(){
      requestAnimationFrame(animate);
      line.rotation.y += 0.012;
      line.rotation.x += 0.006;
      renderer.render(scene, camera);
    }
    if(reduceMotion){ renderer.render(scene, camera); } else { animate(); }
  })();

  // side rails — ambient "signal field" filling the wide-viewport gutters
  (function initSideRails(){
    if(typeof THREE === 'undefined' || reduceMotion) return;
    const mq = window.matchMedia('(min-width: 1300px)');
    const rails = [
      {el: document.getElementById('railLeft'), colorA:0xffb454, colorB:0x5ec8ea, seed:1},
      {el: document.getElementById('railRight'), colorA:0x5ec8ea, colorB:0xffb454, seed:2}
    ];
    const instances = [];

    function build(rail){
      const el = rail.el;
      if(!el) return null;
      const canvas = el.querySelector('canvas');
      const w = el.clientWidth || 180, h = window.innerHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-w/2, w/2, h/2, -h/2, 1, 1000);
      camera.position.z = 200;

      const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);

      const group = new THREE.Group();
      scene.add(group);

      const COUNT = 14;
      const nodes = [];
      const geo = new THREE.SphereGeometry(3.2, 10, 10);
      const matA = new THREE.MeshBasicMaterial({color:rail.colorA, transparent:true, opacity:0.85});
      const matB = new THREE.MeshBasicMaterial({color:rail.colorB, transparent:true, opacity:0.85});

      for(let i=0;i<COUNT;i++){
        const mesh = new THREE.Mesh(geo, i % 3 === 0 ? matB : matA);
        mesh.position.set((Math.random()-0.5) * w * 0.7, Math.random()*h - h/2, (Math.random()-0.5)*40);
        mesh.userData.speed = 6 + Math.random()*10;
        group.add(mesh);
        nodes.push(mesh);
      }

      const lineMat = new THREE.LineBasicMaterial({color:0x4a5578, transparent:true, opacity:0.4});
      const lines = [];
      for(let i=0;i<nodes.length;i++){
        for(let j=i+1;j<nodes.length;j++){
          if(Math.random() < 0.14){
            const geoLine = new THREE.BufferGeometry().setFromPoints([nodes[i].position, nodes[j].position]);
            const ln = new THREE.Line(geoLine, lineMat);
            group.add(ln);
            lines.push({line: ln, a: nodes[i], b: nodes[j]});
          }
        }
      }

      let raf;
      function animate(){
        raf = requestAnimationFrame(animate);
        nodes.forEach(n=>{
          n.position.y += n.userData.speed * 0.02;
          if(n.position.y > h/2 + 10) n.position.y = -h/2 - 10;
        });
        lines.forEach(({line, a, b})=>{
          const positions = line.geometry.attributes.position;
          positions.setXYZ(0, a.position.x, a.position.y, a.position.z);
          positions.setXYZ(1, b.position.x, b.position.y, b.position.z);
          positions.needsUpdate = true;
        });
        renderer.render(scene, camera);
      }
      animate();

      return {
        resize(){
          const nw = el.clientWidth || 180, nh = window.innerHeight;
          camera.left = -nw/2; camera.right = nw/2; camera.top = nh/2; camera.bottom = -nh/2;
          camera.updateProjectionMatrix();
          renderer.setSize(nw, nh);
        },
        destroy(){
          cancelAnimationFrame(raf);
          renderer.dispose();
        }
      };
    }

    function sync(){
      if(mq.matches && instances.length === 0){
        rails.forEach(rail=>{
          const inst = build(rail);
          if(inst) instances.push(inst);
        });
      } else if(!mq.matches && instances.length){
        instances.forEach(i=>i.destroy());
        instances.length = 0;
      }
    }
    sync();
    mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync);
    window.addEventListener('resize', ()=> instances.forEach(i=>i.resize()));
  })();