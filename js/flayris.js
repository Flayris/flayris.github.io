/* Flayris: comportamenti comuni a tutte le pagine */

/* pannello dei commenti (ui-ticket-mcp): compare solo in locale, mai sul sito pubblicato */
(function(){
  var h = location.hostname;
  if(h !== 'localhost' && h !== '127.0.0.1') return;
  /* prima la copia sul computer (js/locale, fuori da git): da unpkg a volte ci mette un minuto
     e la pagina resta ferma ad aspettarlo; unpkg solo se la copia manca */
  function carica(src, riserva){
    var s = document.createElement('script');
    s.type = 'module';
    s.src = src;
    if(riserva) s.onerror = function(){ s.remove(); carica(riserva); };
    document.head.appendChild(s);
  }
  carica('js/locale/ui-ticket-panel.js', 'https://unpkg.com/ui-ticket-panel@1.6.1/dist/bundle.js');
  var p = document.createElement('review-panel');
  p.setAttribute('api-url', 'http://localhost:3200/api');
  document.body.appendChild(p);
})();

/* lingua: la scelta resta da una pagina all'altra; altrimenti italiano se il browser è in italiano */
(function(){
  var radice = document.documentElement;
  var titoli = {it: radice.dataset.titoloIt || document.title, en: radice.dataset.titoloEn || document.title};
  function imposta(l, salva){
    radice.setAttribute('data-lingua', l);
    radice.lang = l;
    document.title = titoli[l];
    document.querySelectorAll('.lingua button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.set === l ? 'true' : 'false'); });
    if (salva){
      try { localStorage.setItem('flayris-lingua', l); } catch(e){}
      try { sessionStorage.setItem('flayris-lingua', l); } catch(e){}
      try { window.name = 'flayris-lingua=' + l; } catch(e){}
    }
  }
  var iniziale = radice.getAttribute('data-lingua');
  if (iniziale !== 'it' && iniziale !== 'en') iniziale = 'it';
  imposta(iniziale, true);
  document.querySelectorAll('.lingua button').forEach(function(b){
    b.addEventListener('click', function(){ imposta(b.dataset.set, true); if (window.adattaLinea) window.adattaLinea(); });
  });
})();


(function(){
  var riduci = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* La linea del drago: una curva principale che scende lungo la pagina,
     con linee compagne e puntini che compaiono mentre scorri,
     come gli archi e le scintille attorno al logo */
  var svg = document.getElementById('drago');
  var gruppo = document.getElementById('segni');
  var scia = document.getElementById('scia');
  var NS = 'http://www.w3.org/2000/svg';
  var tratti = [], puntini = [];

  function caso(seme){ return function(){ seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; }; }
  function punto(c, t){
    var u = 1 - t;
    return {
      x: u*u*u*c[0].x + 3*u*u*t*c[1].x + 3*u*t*t*c[2].x + t*t*t*c[3].x,
      y: u*u*u*c[0].y + 3*u*u*t*c[1].y + 3*u*t*t*c[2].y + t*t*t*c[3].y
    };
  }
  function lerp(a, b, t){ return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t}; }
  function taglia(c, t0, t1){
    /* restituisce il pezzo di curva tra t0 e t1 */
    function dividi(c, t){
      var a = lerp(c[0], c[1], t), b = lerp(c[1], c[2], t), d = lerp(c[2], c[3], t);
      var e = lerp(a, b, t), f = lerp(b, d, t), g = lerp(e, f, t);
      return [[c[0], a, e, g], [g, f, d, c[3]]];
    }
    var destra = dividi(c, t0)[1];
    return dividi(destra, (t1 - t0) / (1 - t0))[0];
  }
  function sposta(c, dx, dy){ return c.map(function(p){ return {x: p.x + dx, y: p.y + dy}; }); }
  function d(cs){
    var s = 'M ' + cs[0][0].x + ' ' + cs[0][0].y;
    cs.forEach(function(c){ s += ' C ' + c[1].x + ' ' + c[1].y + ', ' + c[2].x + ' ' + c[2].y + ', ' + c[3].x + ' ' + c[3].y; });
    return s;
  }
  function nuovoTratto(cs, classe, y0, y1){
    var el = document.createElementNS(NS, 'path');
    el.setAttribute('d', d(cs));
    el.setAttribute('class', classe);
    gruppo.appendChild(el);
    var L = el.getTotalLength();
    el.style.strokeDasharray = L;
    el.style.strokeDashoffset = L;
    /* campiono la linea per sapere a che lunghezza tocca ogni altezza. I punti li calcolo
       dalle curve stesse: chiederli al browser con getPointAtLength su una pagina lunga
       (Luce supera i 60.000 px) bloccava tutto per decine di secondi */
    var campioni = [[0, cs[0][0].y]], fatto = 0, prec = cs[0][0];
    cs.forEach(function(c){
      for (var i = 1; i <= 10; i++){
        var pt = punto(c, i / 10);
        fatto += Math.hypot(pt.x - prec.x, pt.y - prec.y);
        campioni.push([fatto, pt.y]);
        prec = pt;
      }
    });
    /* riporto le lunghezze calcolate su quella vera del browser, così il tratteggio torna preciso */
    var scala = fatto ? L / fatto : 1;
    campioni.forEach(function(c){ c[0] *= scala; });
    tratti.push({el: el, L: L, campioni: campioni, mostrato: 0, meta: 0});
  }

  /* altezza della linea a una certa lunghezza, cercata tra i campioni */
  function altezzaA(s, lung){
    var c = s.campioni, a = 0, b = c.length - 1;
    if (lung <= c[0][0]) return c[0][1];
    if (lung >= c[b][0]) return c[b][1];
    while (b - a > 1){ var m = (a + b) >> 1; if (c[m][0] < lung) a = m; else b = m; }
    var t = (lung - c[a][0]) / ((c[b][0] - c[a][0]) || 1);
    return c[a][1] + (c[b][1] - c[a][1]) * t;
  }

  var altezzaDisegno = 0, larghezzaDisegno = 0;

  /* adatta l'area della linea all'altezza della pagina senza ridisegnarla */
  function adatta(){
    var w = document.documentElement.clientWidth;
    var h = document.body.scrollHeight;
    if (w !== larghezzaDisegno || h > altezzaDisegno - 60){ traccia(); return; }
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    aggiorna();
  }
  window.adattaLinea = adatta;

  function traccia(){
    /* ricordo fin dove era arrivata la linea, così ridisegnandola non riparte da capo */
    var yPrima = -Infinity;
    if (tratti.length){ yPrima = altezzaA(tratti[0], tratti[0].mostrato); }
    gruppo.innerHTML = ''; tratti = []; puntini = [];
    var r = caso(1313);
    var w = document.documentElement.clientWidth;
    var h = document.body.scrollHeight;
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    /* la geometria usa un'altezza arrotondata e abbondante: piccoli cambi di altezza
       della pagina (per esempio cambiando lingua) non la modificano */
    var H = (Math.ceil(h / 1500) + 1) * 1500;
    altezzaDisegno = H; larghezzaDisegno = w;
    scia.setAttribute('y2', H);
    var stretto = w < 820;
    var scarto = stretto ? 10 : 22;

    /* la linea principale: un'onda morbida che scende lungo la pagina e,
       dove attraversa il centro, fa un ricciolo come uno svolazzo a mano */
    var passo = stretto ? 700 : 1050;
    var amp = w * 0.33;
    var R = stretto ? 52 : 95;
    var fase = 0.6;
    function base(y){ return {x: w*0.5 + amp*Math.sin(y/passo*Math.PI + fase) + w*0.018*Math.sin(y/237 + 1.3) + 4*Math.sin(y/71), y: y}; }
    /* i riccioli cadono dove la linea attraversa il centro della pagina */
    var nodi = [];
    for (var k = 1; ; k++){ var yk = (k*Math.PI - fase)*passo/Math.PI; if (yk > H - 200) break; if (yk > 150 && k % 2 === 1) nodi.push(yk); }
    var punti = [], y = 0, lato = 1, ni = 0;
    while (y < H){
      var p = base(y);
      punti.push(p);
      if (ni < nodi.length && y >= nodi[ni] - 30){
        var q = base(y + 1), dx = q.x - p.x, dyy = q.y - p.y, L = Math.hypot(dx, dyy);
        var t = {x: dx/L, y: dyy/L}, n = {x: -t.y*lato, y: t.x*lato};
        var rr = R * (0.8 + r()*0.4), largo = 0.95 + r()*0.45, alto = 0.85 + r()*0.3, storto = (r() - 0.5)*0.35;
        for (var j = 1; j <= 16; j++){
          var th = j/16*Math.PI*2;
          var av = rr*largo*Math.sin(th + storto*Math.sin(th)) + rr*1.1*(j/16), la = rr*alto*(1 - Math.cos(th)) + rr*0.06*Math.sin(th*3);
          punti.push({x: p.x + t.x*av + n.x*la, y: p.y + t.y*av + n.y*la});
        }
        var fine = punti[punti.length-1];
        y = fine.y + 50;
        lato = -lato; ni++;
        continue;
      }
      y += 60;
    }
    
    if (punti[punti.length - 1].y < H) punti.push(base(H + 2));
    /* da punti a curve morbide (Catmull-Rom) */
    var curve = [];
    for (var k = 0; k < punti.length - 1; k++){
      var p0 = punti[Math.max(0, k - 1)], p1 = punti[k], p2 = punti[k + 1], p3 = punti[Math.min(punti.length - 1, k + 2)];
      curve.push([p1,
        {x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6},
        {x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6},
        p2]);
    }
    nuovoTratto(curve, 'principale', 0, H);

    /* linee compagne: tratti paralleli che accompagnano la linea per un pezzo */
    var giri = curve.length;
    for (var e = 2; e < giri; e += 9 + Math.round(r() * 6)){
      var lungo = 3 + Math.round(r() * 3);
      var pezzo = curve.slice(e, Math.min(giri, e + lungo));
      if (!pezzo.length) continue;
      var doppio = r() > 0.8 ? 2 : 1;
      var verso = r() > 0.5 ? 1 : -1;
      for (var q = 1; q <= doppio; q++){
        var dist = scarto * q * verso;
        var sp = pezzo.map(function(c){ return sposta(c, dist * 0.8, dist); });
        var ys = []; sp.forEach(function(c){ c.forEach(function(pt){ ys.push(pt.y); }); });
        nuovoTratto(sp, 'eco' + (q > 1 ? ' sottile' : ''), Math.min.apply(null, ys), Math.max.apply(null, ys));
      }
    }

    /* scintille: piccoli puntini vicino alla linea */
    var tot = Math.round(H / (stretto ? 600 : 420));
    for (var j = 0; j < tot; j++){
      var c = curve[Math.floor(r() * giri)];
      var pt = punto(c, r());
      var ang = r() * Math.PI * 2, raggio = 24 + r() * 56;
      var cx = Math.min(w - 8, Math.max(8, pt.x + Math.cos(ang) * raggio));
      var cy = pt.y + Math.sin(ang) * raggio;
      var dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
      dot.setAttribute('r', 1.4 + r() * 1.8);
      gruppo.appendChild(dot);
      puntini.push({el: dot, y: cy});
    }
    tratti.forEach(function(s){
      var fin = s.L;
      for (var k2 = 0; k2 < s.campioni.length; k2++){ if (s.campioni[k2][1] > yPrima){ fin = s.campioni[k2][0]; break; } }
      s.mostrato = yPrima === -Infinity ? 0 : fin;
    });
    disegna();
    aggiorna();
  }

  /* la meta di ogni linea è il bordo basso dello schermo; la linea la
     raggiunge con un piccolo ritardo, così si vede disegnarsi */
  function aggiorna(){
    var testa = window.scrollY + window.innerHeight + 2;
    tratti.forEach(function(s){
      var fin = s.L;
      for (var i = 0; i < s.campioni.length; i++){
        if (s.campioni[i][1] > testa){ fin = s.campioni[i][0]; break; }
      }
      s.meta = fin;
    });
    if (riduci){ tratti.forEach(function(s){ s.mostrato = s.meta; }); disegna(); }
    else if (!giro) giro = requestAnimationFrame(anima);
  }

  var giro = 0, prima = 0;
  function anima(ora){
    var dt = prima ? Math.min(64, ora - prima) : 16; prima = ora;
    var k = 1 - Math.pow(0.945, dt / 16), ancora = false;
    tratti.forEach(function(s){
      var diff = s.meta - s.mostrato;
      if (Math.abs(diff) > 0.5){ s.mostrato += diff * k; ancora = true; } else s.mostrato = s.meta;
    });
    disegna();
    if (ancora) giro = requestAnimationFrame(anima); else { giro = 0; prima = 0; }
  }

  function disegna(){
    tratti.forEach(function(s){ s.el.style.strokeDashoffset = s.L - s.mostrato; });
    /* le scintille si accendono quando la punta della linea principale le raggiunge */
    var princ = tratti[0], punta = 0;
    if (princ){ punta = altezzaA(princ, princ.mostrato); }
    puntini.forEach(function(p){ p.el.classList.toggle('acceso', riduci || punta > p.y - 40); });
  }

  window.addEventListener('scroll', aggiorna, {passive:true});
  window.addEventListener('resize', function(){ clearTimeout(adatta.t); adatta.t = setTimeout(adatta, 150); });
  window.addEventListener('load', adatta);
  traccia();

})();

/* I lavori arrivano fluttuando da posizioni sparse e si fermano al loro posto */
(function(){
  var riduci = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* in home i mucchi partono già sparsi; nelle pagine delle sezioni li sparpaglio qui */
  document.querySelectorAll('.muro, .singoli').forEach(function(m){ if (!riduci) m.classList.add('sparso'); });
  var mucchi = document.querySelectorAll('.sparso');
  var largo = document.documentElement.clientWidth;
  mucchi.forEach(function(m){
    m.querySelectorAll('.lavoro').forEach(function(l){
      /* lo spostamento di lato non porta mai il lavoro fuori dallo schermo per più di metà:
         sul telefono una foto stretta sul bordo finiva tutta fuori, la pagina la taglia
         e non "entrava" mai, restando invisibile */
      var b = l.getBoundingClientRect(), meta = b.width / 2;
      var dx = (Math.random() - .5) * 220, dy = 70 + Math.random() * 120, r = (Math.random() - .5) * 22;
      dx = Math.max(-b.left - meta + 20, Math.min(largo - b.right + meta - 20, dx));
      l.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + r + 'deg)';
    });
  });
  if (riduci || !('IntersectionObserver' in window)){
    mucchi.forEach(function(m){ m.classList.remove('sparso'); m.querySelectorAll('.lavoro').forEach(function(l){ l.style.transform = ''; }); });
    return;
  }
  /* ogni lavoro si posa quando entra nello schermo; quelli che entrano insieme arrivano uno dopo l'altro */
  var oss = new IntersectionObserver(function(voci){
    var n = 0;
    voci.forEach(function(v){
      if (!v.isIntersecting) return;
      var l = v.target;
      setTimeout(function(){ l.style.opacity = 1; l.style.transform = ''; }, Math.min(n++, 6) * 120);
      oss.unobserve(l);
    });
  }, {threshold:.05});
  mucchi.forEach(function(m){ m.querySelectorAll('.lavoro').forEach(function(l){ oss.observe(l); }); });
  /* sicurezza: quando un mucchio è sullo schermo da un paio di secondi, chi non è ancora
     arrivato si posa comunque, così nessun lavoro resta invisibile */
  var guarda = new IntersectionObserver(function(voci){
    voci.forEach(function(v){
      if (!v.isIntersecting) return;
      var m = v.target;
      guarda.unobserve(m);
      setTimeout(function(){
        m.querySelectorAll('.lavoro').forEach(function(l){
          if (l.style.transform){ l.style.opacity = 1; l.style.transform = ''; oss.unobserve(l); }
        });
      }, 2000);
    });
  }, {threshold:0});
  mucchi.forEach(function(m){ guarda.observe(m); });
})();

/* immagini che non si caricano: resta la cornice scura, senza icona rotta */
document.querySelectorAll('.cornice img').forEach(function(img){
  img.addEventListener('error', function(){ img.setAttribute('data-rotta', ''); });
});

/* la lente: clic su un lavoro per vederlo grande, frecce per scorrere la stessa sezione */
(function(){
  var lente = document.getElementById('lente');
  if (!lente || !lente.showModal) return;
  var bottoni = Array.prototype.slice.call(document.querySelectorAll('[data-grande]'));
  var foto = lente.querySelector('img'), titolo = lente.querySelector('.lente-dida strong'), sotto = lente.querySelector('.lente-dida span'), conta = lente.querySelector('.lente-conta');
  var ora = 0;
  function lingua(){ return document.documentElement.getAttribute('data-lingua') || 'it'; }
  function mostra(i){
    ora = (i + bottoni.length) % bottoni.length;
    var b = bottoni[ora], l = lingua();
    foto.src = b.dataset.grande;
    foto.alt = b.querySelector('img').alt;
    titolo.textContent = b.dataset['titolo' + (l === 'it' ? 'It' : 'En')];
    sotto.textContent = b.dataset['serie' + (l === 'it' ? 'It' : 'En')] ? ' · ' + b.dataset['serie' + (l === 'it' ? 'It' : 'En')] : '';
    conta.textContent = (ora + 1) + ' / ' + bottoni.length;
  }
  bottoni.forEach(function(b, i){ b.addEventListener('click', function(){ mostra(i); lente.showModal(); }); });
  lente.querySelector('.chiudi').addEventListener('click', function(){ lente.close(); });
  lente.querySelector('.prima').addEventListener('click', function(){ mostra(ora - 1); });
  lente.querySelector('.dopo').addEventListener('click', function(){ mostra(ora + 1); });
  lente.addEventListener('keydown', function(e){
    if (e.key === 'ArrowLeft'){ mostra(ora - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight'){ mostra(ora + 1); e.preventDefault(); }
  });
  /* clic sullo sfondo per chiudere */
  lente.addEventListener('click', function(e){ if (e.target === lente || e.target.tagName === 'FIGURE') lente.close(); });
  /* scorrere col dito */
  var x0 = null;
  lente.addEventListener('touchstart', function(e){ x0 = e.touches[0].clientX; }, {passive:true});
  lente.addEventListener('touchend', function(e){
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) mostra(ora + (dx < 0 ? 1 : -1));
  });
})();
