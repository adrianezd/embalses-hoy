// Embalses de España hoy: pinta datos.json (lo genera actualizar.py cada semana).
var D = null, orden = { campo: 'p', asc: false };

function n(v, dec) { return v.toLocaleString('es-ES', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); }
function color(p) { return p >= 60 ? 'var(--bueno)' : p >= 35 ? 'var(--medio)' : 'var(--malo)'; }
function dif(a, b) { var d = a - b; return (d >= 0 ? '+' : '') + n(d, 1) + ' puntos ahora'; }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function grafica(serie) {
  var W = 700, H = 220, pad = 28;
  var x = function (i) { return pad + i / (serie.length - 1) * (W - pad - 6); };
  var y = function (p) { return H - 22 - p / 100 * (H - 34); };
  var pts = serie.map(function (s, i) { return x(i).toFixed(1) + ',' + y(s[1]).toFixed(1); });
  var lineas = [0, 25, 50, 75, 100].map(function (p) {
    return '<line x1="' + pad + '" x2="' + W + '" y1="' + y(p) + '" y2="' + y(p) + '" stroke="currentColor" opacity=".12"/><text x="0" y="' + (y(p) + 4) + '" font-size="11" fill="currentColor" opacity=".6">' + p + '%</text>';
  }).join('');
  var anyos = '', visto = {};
  serie.forEach(function (s, i) {
    var a = s[0].slice(0, 4);
    if (!visto[a] && s[0].slice(5, 7) === '01') { visto[a] = 1; anyos += '<text x="' + x(i) + '" y="' + (H - 4) + '" font-size="11" fill="currentColor" opacity=".6" text-anchor="middle">' + a + '</text>'; }
  });
  document.getElementById('grafica').innerHTML = lineas + anyos +
    '<polygon points="' + x(0) + ',' + y(0) + ' ' + pts.join(' ') + ' ' + x(serie.length - 1) + ',' + y(0) + '" fill="var(--accent)" opacity=".15"/>' +
    '<polyline points="' + pts.join(' ') + '" fill="none" stroke="var(--accent)" stroke-width="2"/>';
}

function tablaCuencas() {
  var filas = D.cuencas.slice().sort(function (a, b) { return b.p - a.p; });
  document.getElementById('cuencas').innerHTML = '<tr><th>Cuenca</th><th class="n">Agua</th><th class="n">Hace un año</th><th></th></tr>' +
    filas.map(function (c) {
      return '<tr><td>' + esc(c.n) + '</td><td class="n"><b>' + n(c.p, 1) + ' %</b></td><td class="n">' + n(c.y, 1) + ' %</td>' +
        '<td style="width:30%"><div class="barrita"><div style="width:' + c.p + '%;background:' + color(c.p) + '"></div></div></td></tr>';
    }).join('');
}

function tablaEmbalses() {
  var q = document.getElementById('buscar').value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  var cu = document.getElementById('filtroCuenca').value;
  var filas = D.embalses.filter(function (e) {
    return (!cu || e.c === cu) && (!q || e.n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').indexOf(q) >= 0);
  }).sort(function (a, b) {
    var va = a[orden.campo], vb = b[orden.campo];
    if (typeof va === 'string') return orden.asc ? va.localeCompare(vb) : vb.localeCompare(va);
    return orden.asc ? (va || 0) - (vb || 0) : (vb || 0) - (va || 0);
  });
  var cab = [['n', 'Embalse'], ['p', 'Lleno'], ['a', 'hm³'], ['s', 'Semana'], ['y', 'Hace un año']];
  document.getElementById('embalses').innerHTML = '<tr>' + cab.map(function (c, i) {
    return '<th data-c="' + c[0] + '"' + (i ? ' class="n"' : '') + '>' + c[1] + (orden.campo === c[0] ? (orden.asc ? ' ▲' : ' ▼') : '') + '</th>';
  }).join('') + '</tr>' + filas.slice(0, 120).map(function (e) {
    return '<tr><td>' + esc(e.n) + '<br><small style="color:var(--muted)">' + esc(e.c) + '</small></td>' +
      '<td class="n" style="color:' + color(e.p) + '"><b>' + n(e.p, 0) + ' %</b></td>' +
      '<td class="n">' + n(e.a) + ' / ' + n(e.t) + '</td>' +
      '<td class="n">' + (e.s == null ? '' : (e.s > 0 ? '+' : '') + n(e.s, 0)) + '</td>' +
      '<td class="n">' + (e.y == null ? '' : n(e.y, 0) + ' %') + '</td></tr>';
  }).join('') + (filas.length > 120 ? '<tr><td colspan="5" style="color:var(--muted)">Y ' + (filas.length - 120) + ' más. Usa el buscador.</td></tr>' : '');
  document.querySelectorAll('#embalses th').forEach(function (th) {
    th.onclick = function () {
      var c = th.dataset.c;
      orden = { campo: c, asc: orden.campo === c ? !orden.asc : c === 'n' };
      tablaEmbalses();
    };
  });
}

fetch('datos.json').then(function (r) { return r.json(); }).then(function (d) {
  D = d;
  var N = d.nacional;
  document.getElementById('fecha').textContent = 'Boletín del ' + new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('pct').textContent = n(N.p, 1) + ' %';
  document.getElementById('pct').style.color = color(N.p);
  document.getElementById('barra').style.width = N.p + '%';
  document.getElementById('hm3').textContent = n(N.a) + ' de ' + n(N.t) + ' hm³';
  document.getElementById('anyo').textContent = n(N.y, 1) + ' %';
  document.getElementById('anyoDif').textContent = dif(N.p, N.y);
  document.getElementById('media').textContent = n(N.m10, 1) + ' %';
  document.getElementById('mediaDif').textContent = dif(N.p, N.m10);
  document.getElementById('semana').textContent = (N.s > 0 ? '+' : '') + n(N.s);
  grafica(d.serie);
  tablaCuencas();
  var sel = document.getElementById('filtroCuenca');
  d.cuencas.forEach(function (c) { var o = document.createElement('option'); o.value = o.textContent = c.n; sel.appendChild(o); });
  tablaEmbalses();
}).catch(function () {
  document.getElementById('fecha').textContent = 'No se han podido cargar los datos. Recarga en un rato.';
});
document.getElementById('buscar').addEventListener('input', tablaEmbalses);
document.getElementById('filtroCuenca').addEventListener('change', tablaEmbalses);
