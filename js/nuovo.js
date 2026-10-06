/* a ogni cambio pagina si compare direttamente in cima, senza scorrere */
(function(){
  try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(e){}
  function inCima(){if(location.hash)return;window.scrollTo({top:0,left:0,behavior:'instant'})}
  inCima();window.addEventListener('DOMContentLoaded',inCima);window.addEventListener('pageshow',inCima);
  /* lo scorrimento morbido resta solo per i link interni alla stessa pagina */
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;
    var id=a.getAttribute('href').slice(1);var t=id&&document.getElementById(id);if(!t)return;
    e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#'+id);
  });
})();
/* Flayris: lettere ritagliate, fogli strappati, giostre e menu */

(function(){
  var stella='<svg viewBox="0 0 24 24"><path d="M12 0c.8 6.4 5.6 11.2 12 12-6.4.8-11.2 5.6-12 12-.8-6.4-5.6-11.2-12-12C6.4 11.2 11.2 6.4 12 0z"/></svg>';
  document.querySelectorAll('.scintilla').forEach(function(s){s.innerHTML=stella});

  /* lettere ritagliate: tutte viola come nel riferimento, cambiano solo carattere e taglio */
  function rng(seed){return function(){seed=(seed*9301+49297)%233280;return seed/233280}}
  var font=["'Alfa Slab One'","'DM Serif Display'"];
  document.querySelectorAll('[data-ritaglio]').forEach(function(el){
    var r=rng(+el.dataset.seme||1),html='';
    if(!el.getAttribute('aria-label'))el.setAttribute('aria-label',el.textContent);
    el.dataset.ritaglio.split(' ').forEach(function(parola){
      html+='<span class="parola" aria-hidden="true">';
      for(var i=0;i<parola.length;i++){
        var x=r(),tipo=x<.62?'':(x<.84?' nudo':' cava');
        html+='<span class="l'+tipo+'" style="--f:'+font[Math.floor(r()*2)]+';--r:'+((r()*5-2.5).toFixed(1))+'deg;--y:'+((r()*.08-.04).toFixed(2))+'em">'+parola[i]+'</span>';
      }
      html+='</span>';
    });
    el.innerHTML=html;
  });

  /* bordi strappati */
  function strappo(el,seed){
    var r=rng(seed),pts=[],n=46,i;
    for(i=0;i<=n;i++)pts.push((i/n*100).toFixed(2)+'% '+(r()*2.2).toFixed(2)+'%');
    for(i=n;i>=0;i--)pts.push((i/n*100).toFixed(2)+'% '+(100-r()*2.2).toFixed(2)+'%');
    el.style.clipPath='polygon('+pts.join(',')+')';
  }
  document.querySelectorAll('.strappato').forEach(function(el,i){strappo(el,41+i*17)});


  /* giostre a cerchio: tre copie dei lavori, e quando arrivi a una copia esterna
     la giostra salta senza farsi vedere alla copia centrale, così non finisce mai */
  document.querySelectorAll('.giostra-box').forEach(function(box){
    var g=box.querySelector('.giostra'),orig=[].slice.call(g.children),n=orig.length;
    function copia(s){var c=s.cloneNode(true);c.setAttribute('aria-hidden','true');c.setAttribute('tabindex','-1');return c}
    orig.slice().reverse().forEach(function(s){g.insertBefore(copia(s),g.firstChild)});
    orig.forEach(function(s){g.appendChild(copia(s))});
    var schede=[].slice.call(g.children);
    function centro(){
      var r=g.getBoundingClientRect(),m=r.left+r.width/2,best=0,d=1e9;
      schede.forEach(function(s,k){var b=s.getBoundingClientRect(),x=Math.abs(b.left+b.width/2-m);if(x<d){d=x;best=k}});
      schede.forEach(function(s,k){s.classList.toggle('attiva',k===best)});
      return best;
    }
    function vai(k,liscio){var s=schede[k];g.scrollTo({left:s.offsetLeft-(g.clientWidth-s.offsetWidth)/2,behavior:liscio?'smooth':'instant'})}
    function riporta(){
      var k=centro();
      if(k>=n&&k<2*n)return;
      var nuovo=k<n?k+n:k-n;
      g.classList.add('salto');
      g.scrollLeft+=schede[nuovo].offsetLeft-schede[k].offsetLeft;
      centro();
      requestAnimationFrame(function(){requestAnimationFrame(function(){g.classList.remove('salto')})});
    }
    var t,fermo;
    g.addEventListener('scroll',function(){
      cancelAnimationFrame(t);t=requestAnimationFrame(centro);
      clearTimeout(fermo);fermo=setTimeout(riporta,140);
    },{passive:true});
    box.querySelector('.giostra-freccia.prima').addEventListener('click',function(){vai(centro()-1,true)});
    box.querySelector('.giostra-freccia.dopo').addEventListener('click',function(){vai(centro()+1,true)});
    schede.forEach(function(s,k){s.addEventListener('click',function(e){if(!s.classList.contains('attiva')){e.preventDefault();vai(k,true)}})});
    function inizio(){g.classList.add('salto');vai(n+Math.floor(n/2),false);centro();requestAnimationFrame(function(){g.classList.remove('salto')})}
    inizio();addEventListener('load',inizio);addEventListener('resize',inizio);
  });

  /* menu sul telefono */
  var testata=document.getElementById('testata'),bottone=testata&&testata.querySelector('.apri-menu');
  if(bottone){
  bottone.addEventListener('click',function(){var a=testata.classList.toggle('aperto');bottone.setAttribute('aria-expanded',a)});
  testata.querySelectorAll('#voci a').forEach(function(a){a.addEventListener('click',function(){testata.classList.remove('aperto');bottone.setAttribute('aria-expanded','false')})});
  }
})();
/* testata trasparente in cima alla pagina, velata quando si scorre */
(function(){
  var t=document.getElementById('testata');if(!t)return;
  function controlla(){t.classList.toggle('scorso',window.scrollY>10)}
  controlla();window.addEventListener('scroll',controlla,{passive:true});
})();
