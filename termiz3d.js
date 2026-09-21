/* ============================================================
   termiz3d.js — Surxondaryo viloyati (Termez) 3D modeli
   Ma'lumot: data/termiz-geo.js (geoBoundaries, ODbL 1.0)
   Kutubxona: Three.js r128 (CDN)
   ============================================================ */
(function () {
  'use strict';

  var GEO = window.TERMEZ_GEO;
  var $ = function (id) { return document.getElementById(id); };

  /* --- Kutubxona/ma'lumot tekshiruvi --- */
  if (typeof THREE === 'undefined' || !GEO) {
    var errBox = $('error');
    errBox.hidden = false;
    errBox.innerHTML = '<b>3D model yuklanmadi</b>' +
      '<div>Sabab: ' + (typeof THREE === 'undefined' ? 'Three.js kutubxonasi yuklanmadi (internet kerak)' : 'geo ma\'lumot fayli topilmadi') + '</div>' +
      '<div><code>data/termiz-geo.js</code> fayli mavjudligini tekshiring.</div>';
    return;
  }

  /* ============================================================
     1) PROYEKSIYA va YORDAMCHI FUNKSIYALAR
     ============================================================ */
  var CENTER = { lon: GEO.region.center[0], lat: GEO.region.center[1] };
  var K = 60;                                                   // 1 daraja = 60 birlik
  var LAT_SCALE = Math.cos(CENTER.lat * Math.PI / 180);         // uzunlik siqilishi

  // lon/lat -> Shape tekisligi koordinatalari (1 birlik ≈ 1.85 km)
  function project(lon, lat) {
    return [(lon - CENTER.lon) * LAT_SCALE * K, (lat - CENTER.lat) * K];
  }
  function projectXZ(lon, lat) {
    var p = project(lon, lat);
    return new THREE.Vector3(p[0], 0, -p[1]);                   // shimol -> -Z
  }

  // Yopiq halqadan THREE.Shape yasash (oxirgi takror nuqta olib tashlanadi)
  function ringToShape(ring) {
    var pts = ring.slice();
    var a = pts[0], b = pts[pts.length - 1];
    if (pts.length > 1 && a[0] === b[0] && a[1] === b[1]) pts.pop();
    var shape = new THREE.Shape();
    pts.forEach(function (p, i) {
      var q = project(p[0], p[1]);
      if (i === 0) shape.moveTo(q[0], q[1]); else shape.lineTo(q[0], q[1]);
    });
    shape.closePath();
    return shape;
  }

  // Sferik yuzani km² da hisoblash
  function ringAreaKm2(ring) {
    var R = 6371, total = 0;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      total += (ring[i][0] - ring[j][0]) * Math.PI / 180 *
        (2 + Math.sin(ring[i][1] * Math.PI / 180) + Math.sin(ring[j][1] * Math.PI / 180));
    }
    return Math.abs(total * R * R / 2);
  }

  function areaOf(rings) {
    return rings.reduce(function (s, r) { return s + ringAreaKm2(r); }, 0);
  }

  function fmt(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  // Barqaror rang palitrasi (oltin-mis-bronza; och ranglardan qochamiz — yorug'likda oqarib ketadi)
  var PALETTE = ['#e0a02a', '#a5661a', '#e8bc4c', '#8a5216', '#d18f22',
                 '#c9a63c', '#9c6415', '#7d4a13', '#e6b833', '#b07c1c',
                 '#d8a94a', '#8f5c14', '#c98f2a', '#a8701a'];

  function colorAt(i) {
    return new THREE.Color(PALETTE[i % PALETTE.length]);
  }

  /* ============================================================
     2) SAHNA, KAMERA, RENDERER
     ============================================================ */
  var canvas = $('scene');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;   // kuchli yorug'likda oqarib ketmasin
  renderer.toneMappingExposure = 1.35;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060402);
  scene.fog = new THREE.Fog(0x060402, 420, 950);

  var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 2000);
  camera.position.set(0, 128, 168);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.75;
  controls.minDistance = 60;
  controls.maxDistance = 620;
  controls.maxPolarAngle = Math.PI * 0.49;   // yerdan pastga tushmasin
  controls.minPolarAngle = Math.PI * 0.06;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;
  controls.target.set(0, 0, 0);

  /* ============================================================
     3) YORUG'LIK
     ============================================================ */
  scene.add(new THREE.HemisphereLight(0xffe9bd, 0x120c02, 0.42));
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  var sun = new THREE.DirectionalLight(0xfff0cf, 0.85);
  sun.position.set(140, 210, 120);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 520;
  sun.shadow.camera.left = -115;
  sun.shadow.camera.right = 115;
  sun.shadow.camera.top = 115;
  sun.shadow.camera.bottom = -115;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 1.2;
  scene.add(sun);

  var rimLight = new THREE.DirectionalLight(0xffb347, 0.45);
  rimLight.position.set(-160, 90, -140);
  scene.add(rimLight);

  var glowLight = new THREE.PointLight(0xffd28a, 0.32, 500);
  glowLight.position.set(0, 120, 0);
  scene.add(glowLight);

  /* --- Yer tekisligi (grid) --- */
  var grid = new THREE.GridHelper(700, 44, 0x4a3810, 0x1d1608);
  grid.position.y = -9;
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  scene.add(grid);

  /* Guruhlar */
  var baseGroup = new THREE.Group();      // asosiy plita
  var districtGroup = new THREE.Group();  // tumanlar
  var cityGroup = new THREE.Group();      // shahar belgilari
  var outlineGroup = new THREE.Group();   // chegara chizig'i
  scene.add(baseGroup, districtGroup, cityGroup, outlineGroup);
  /* ============================================================
     4) VILOYAT ASOSI (plita) va TUMANLAR (3D ekstruziya)
     ============================================================ */
  var BASE_H = 7;                                  // plita qalinligi
  var baseMat = new THREE.MeshStandardMaterial({
    color: 0x2a1e08, roughness: 0.85, metalness: 0.25
  });

  // --- Asosiy plita: viloyat konturi bo'yicha ekstruziya ---
  GEO.region.rings.forEach(function (ring) {
    var geo = new THREE.ExtrudeGeometry(ringToShape(ring), {
      depth: BASE_H, bevelEnabled: false, curveSegments: 1
    });
    var mesh = new THREE.Mesh(geo, baseMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -BASE_H;        // yuqori yuzasi y = 0
    mesh.receiveShadow = true;
    baseGroup.add(mesh);
  });

  // --- Yupqa "tuproq" qatlami: tumanlar orasidagi choklarni yopadi ---
  var terrainMat = new THREE.MeshStandardMaterial({
    color: 0x4a3410, roughness: 0.95, metalness: 0.05
  });
  GEO.region.rings.forEach(function (ring) {
    var geo = new THREE.ExtrudeGeometry(ringToShape(ring), {
      depth: 0.25, bevelEnabled: false, curveSegments: 1
    });
    var mesh = new THREE.Mesh(geo, terrainMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.23;          // yuqori yuzasi y = 0.02
    mesh.receiveShadow = true;
    baseGroup.add(mesh);
  });

  // --- Chegara chizig'i (viloyat konturi, yorqin) ---
  GEO.region.rings.forEach(function (ring) {
    var pts = ring.slice(0, ring.length - 1).map(function (p) {
      var q = project(p[0], p[1]);
      return new THREE.Vector3(q[0], 0.35, -q[1]);
    });
    var line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts.concat([pts[0].clone()])),
      new THREE.LineBasicMaterial({ color: 0xffd97a, transparent: true, opacity: 0.95 })
    );
    outlineGroup.add(line);
  });

  // --- Tumanlar ---
  var districts = [];   // { name, area, color, meshes[], center, top }
  var totalPoints = 0;

  GEO.districts.forEach(function (d, index) {
    var color = colorAt(index);
    var mat = new THREE.MeshStandardMaterial({
      color: color, roughness: 0.62, metalness: 0.2,
      emissive: color.clone().multiplyScalar(0.1), flatShading: false
    });

    // Balandlik tuman maydoniga qarab (kichik tuman — balandroq ko'rinadi)
    var area = areaOf(d.rings);
    var h = 2.2 + 1.9 * (1 - Math.min(area, 4000) / 4000);

    var meshes = [];
    d.rings.forEach(function (ring) {
      var geo = new THREE.ExtrudeGeometry(ringToShape(ring), {
        depth: h, bevelEnabled: false, curveSegments: 1
      });
      var mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.06;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.districtIndex = districts.length;
      districtGroup.add(mesh);
      meshes.push(mesh);
    });

    totalPoints += d.rings.reduce(function (s, r) { return s + r.length; }, 0);

    districts.push({
      name: d.name,
      area: area,
      color: color,
      colorHex: '#' + color.getHexString(),
      meshes: meshes,
      center: new THREE.Vector3(project(d.center[0], d.center[1])[0], h, -project(d.center[0], d.center[1])[1]),
      height: h,
      material: mat
    });
  });

  var regionArea = areaOf(GEO.region.rings);
  /* ============================================================
     5) SHAHAR BELGILARI (pin) va HTML YORLIQLAR
     ============================================================ */
  var labelLayer = $('labels');
  var districtLabels = [];
  var cityLabels = [];
  var pulses = [];

  function nearestDistrict(lon, lat) {
    var p = project(lon, lat);
    var best = null, bestD = Infinity;
    districts.forEach(function (d) {
      var dx = d.center.x - p[0];
      var dz = d.center.z - (-p[1]);
      var dist = dx * dx + dz * dz;
      if (dist < bestD) { bestD = dist; best = d; }
    });
    return best;
  }

  function addLabel(text, cls, worldPos) {
    var node = document.createElement('div');
    node.className = 'label ' + cls;
    node.textContent = text;
    labelLayer.appendChild(node);
    return { el: node, pos: worldPos };
  }

  // --- Shahar pinlari ---
  var districtByName = {};
  districts.forEach(function (d) { districtByName[d.name.toLowerCase()] = d; });

  GEO.cities.forEach(function (c) {
    var d = (c.district && districtByName[String(c.district).toLowerCase()]) || nearestDistrict(c.lon, c.lat);
    var p = project(c.lon, c.lat);
    var baseY = (d ? d.height : 0) + 0.15;
    var isCap = !!c.capital;
    var pinH = isCap ? 20 : 11;
    var pinW = isCap ? 4 : 2.6;

    var group = new THREE.Group();
    group.position.set(p[0], baseY, -p[1]);

    var cone = new THREE.Mesh(
      new THREE.ConeGeometry(pinW, pinH, 4),
      new THREE.MeshStandardMaterial({
        color: isCap ? 0xffcf5c : 0xf3e6c4,
        emissive: isCap ? 0xa8760c : 0x5c4a18,
        metalness: 0.15, roughness: 0.45, flatShading: true
      })
    );
    cone.position.y = pinH / 2;
    cone.rotation.y = Math.PI / 4;
    cone.castShadow = true;
    group.add(cone);

    // Pulsatsiya halqasi
    var ring = new THREE.Mesh(
      new THREE.RingGeometry(pinW * 1.9, pinW * 2.25, 36),
      new THREE.MeshBasicMaterial({
        color: isCap ? 0xffb429 : 0xc08a1e,
        transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.25;
    group.add(ring);
    pulses.push(ring);

    // Poytaxt uchun yorug'lik ustuni
    if (isCap) {
      var beam = new THREE.Mesh(
        new THREE.CylinderGeometry(1.0, 1.7, 46, 14, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xffd97a, transparent: true, opacity: 0.1, side: THREE.DoubleSide
        })
      );
      beam.position.y = 23;
      group.add(beam);
    }

    cityGroup.add(group);

    // Shahar nomi tuman nomi bilan bir xil bo'lsa, yorliq takrorlanmasin
    var duplicate = d && d.name === c.name;
    if (!duplicate || isCap) {
      var label = addLabel(c.name, isCap ? 'capital' : 'city', group.position.clone().add(new THREE.Vector3(0, pinH + 3.5, 0)));
      cityLabels.push(label);
    } else {
      cityLabels.push(null);
    }
  });

  // --- Tuman yorliqlari ---
  districts.forEach(function (d) {
    districtLabels.push(addLabel(d.name, 'district', d.center.clone().add(new THREE.Vector3(0, 4.5, 0))));
  });

  /* ============================================================
     6) TUMANLAR RO'YXATI (legend) va STATISTIKA
     ============================================================ */
  var listEl = $('districtList');
  districts.forEach(function (d, i) {
    var li = document.createElement('li');
    li.dataset.index = i;
    li.innerHTML = '<span class="dot" style="background:' + d.colorHex + '"></span>' +
      '<span>' + d.name + '</span><small>' + fmt(d.area) + ' km²</small>';
    li.addEventListener('click', function () { selectDistrict(i); });
    listEl.appendChild(li);
  });

  $('statDistricts').textContent = districts.length;
  $('statArea').textContent = fmt(regionArea);
  $('statPoints').textContent = fmt(totalPoints);
/* ============================================================
     7) TANLASH, HOVER va KAMERA FOKUSI
     ============================================================ */
  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2(-10, -10);
  var hovered = -1;
  var selected = -1;
  var camAnim = null;
  var tooltip = $('tooltip');

  var cityEntries = [];   // balandlik slayderi uchun
  cityGroup.children.forEach(function (group) {
    cityEntries.push({ group: group, baseY: group.position.y });
  });

  function idleEmissive(d) { return d.color.clone().multiplyScalar(0.06); }

  function hoverOn(i) {
    if (i < 0 || i === selected) return;
    districts[i].material.emissive.copy(districts[i].color.clone().multiplyScalar(0.42));
  }

  function hoverOff(i) {
    if (i < 0 || i === selected) return;
    districts[i].material.emissive.copy(idleEmissive(districts[i]));
  }

  function resetHighlight() {
    districts.forEach(function (d) { d.material.emissive.copy(idleEmissive(d)); });
  }

  function showRegionInfo() {
    $('infoName').textContent = GEO.region.name;
    $('infoText').textContent = 'Viloyat markazi — Termez shahri. 3D modelda tumanni bosib tanlang yoki ro\'yxatdan foydalaning.';
    $('infoArea').textContent = 'Maydon: ≈ ' + fmt(regionArea) + ' km²';
    $('infoCenter').textContent = 'Tumanlar: ' + districts.length;
  }

  function selectDistrict(i) {
    // Ro'yxatda belgilash
    Array.prototype.forEach.call(listEl.children, function (li, idx) {
      li.classList.toggle('selected', idx === i);
    });

    if (i === selected || i < 0) {
      // Tanlashni bekor qilish
      selected = -1;
      resetHighlight();
      showRegionInfo();
      focusOn(new THREE.Vector3(0, 0, 0), 235);
      return;
    }

    selected = i;
    var d = districts[i];

    districts.forEach(function (x, idx) {
      x.material.emissive.copy(idx === i
        ? x.color.clone().multiplyScalar(0.6)
        : x.color.clone().multiplyScalar(0.02));
    });

    $('infoName').textContent = d.name + ' tumani';
    $('infoText').textContent = 'Surxondaryo viloyati tarkibidagi tuman. Modelda ' +
      d.meshes.length + ' poligon, balandligi ' + d.height.toFixed(1) + ' birlik.';
    $('infoArea').textContent = 'Maydon: ≈ ' + fmt(d.area) + ' km²';
    $('infoCenter').textContent = 'Poligon: ' + d.meshes.length;

    focusOn(d.center, 130);
  }

  function focusOn(point, distance) {
    var target = new THREE.Vector3(point.x, 0, point.z);
    var dir = new THREE.Vector3().subVectors(camera.position, controls.target);
    dir.y = Math.max(dir.y, 40);
    dir.normalize().multiplyScalar(distance);
    camAnim = {
      fromTarget: controls.target.clone(),
      toTarget: target,
      fromPos: camera.position.clone(),
      toPos: target.clone().add(dir),
      t: 0
    };
    controls.autoRotate = false;
    $('btnRotate').classList.remove('active');
  }

  /* --- Sichqoncha harakati: hover + tooltip --- */
  function updatePointer(e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  canvas.addEventListener('pointermove', function (e) {
    updatePointer(e);
    tooltip.style.left = (e.clientX + 16) + 'px';
    tooltip.style.top = (e.clientY + 14) + 'px';
  });

  canvas.addEventListener('pointerleave', function () {
    pointer.set(-10, -10);
    tooltip.classList.remove('show');
    hoverOff(hovered);
    hovered = -1;
  });

  canvas.addEventListener('pointerdown', function (e) {
    updatePointer(e);
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(districtGroup.children, false);
    if (hits.length) {
      selectDistrict(hits[0].object.userData.districtIndex);
    } else {
      selectDistrict(-1);
    }
  });

  function checkHover() {
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(districtGroup.children, false);
    var idx = hits.length ? hits[0].object.userData.districtIndex : -1;

    if (idx !== hovered) {
      hoverOff(hovered);
      hoverOn(idx);
      hovered = idx;
    }

    if (idx >= 0) {
      var d = districts[idx];
      tooltip.innerHTML = '<b>' + d.name + '</b> · ' + fmt(d.area) + ' km²';
      tooltip.classList.add('show');
      canvas.style.cursor = 'pointer';
    } else {
      tooltip.classList.remove('show');
      canvas.style.cursor = 'grab';
    }
  }
/* ============================================================
     8) TUGMALAR va BALANDLIK SLAYDERI
     ============================================================ */
  var labelsVisible = true;

  function toggleBtn(id, onChange) {
    var btn = $(id);
    btn.addEventListener('click', function () {
      var active = btn.classList.toggle('active');
      onChange(active);
    });
  }

  toggleBtn('btnRotate', function (on) { controls.autoRotate = on; });
  toggleBtn('btnLabels', function (on) { labelsVisible = on; });
  toggleBtn('btnCities', function (on) { cityGroup.visible = on; });
  toggleBtn('btnOutline', function (on) { outlineGroup.visible = on; });

  $('btnReset').addEventListener('click', function () {
    selectDistrict(-1);
    camAnim = null;
    controls.target.set(0, 0, 0);
    camera.position.set(0, 128, 168);
    controls.autoRotate = true;
    $('btnRotate').classList.add('active');
    showRegionInfo();
  });

  $('heightRange').addEventListener('input', function () {
    var s = parseFloat(this.value);
    $('heightValue').textContent = s.toFixed(1) + 'x';
    districtGroup.scale.y = s;

    cityLabels.forEach(function (lbl, i) {
      var entry = cityEntries[i];
      var baseY = entry.baseY * s;
      entry.group.position.y = baseY;
      if (lbl) lbl.pos.y = baseY + (GEO.cities[i].capital ? 20 : 11) + 3.5;
    });

    districts.forEach(function (d, i) {
      districtLabels[i].pos.y = d.height * s + 4.5;
    });
  });

  /* ============================================================
     9) YORLIQLARNI EKRANGA JOYLASH
     ============================================================ */
  var tmpA = new THREE.Vector3();
  var tmpB = new THREE.Vector3();

  function placeLabel(item, visible) {
    if (!visible) { item.el.style.display = 'none'; return; }

    tmpA.copy(item.pos).applyMatrix4(camera.matrixWorldInverse);
    if (tmpA.z > -1) { item.el.style.display = 'none'; return; }

    tmpB.copy(item.pos).project(camera);
    if (tmpB.x < -1.08 || tmpB.x > 1.08 || tmpB.y < -1.08 || tmpB.y > 1.08) {
      item.el.style.display = 'none';
      return;
    }

    item.el.style.display = 'block';
    item.el.style.left = ((tmpB.x * 0.5 + 0.5) * window.innerWidth).toFixed(1) + 'px';
    item.el.style.top = ((-tmpB.y * 0.5 + 0.5) * window.innerHeight).toFixed(1) + 'px';
  }

  /* ============================================================
     10) ANIMATSIYA TSIKLI
     ============================================================ */
  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();

    // Shahar pinlari pulsatsiyasi
    for (var i = 0; i < pulses.length; i++) {
      var ring = pulses[i];
      var phase = (t * 0.8 + i * 0.4) % 1;
      var s = 1 + phase * 1.1;
      ring.scale.set(s, s, s);
      ring.material.opacity = Math.max(0, 0.3 * (1 - phase));
    }

    // Kamera animatsiyasi (tumanga uchish)
    if (camAnim) {
      camAnim.t = Math.min(1, camAnim.t + 0.028);
      var e = 1 - Math.pow(1 - camAnim.t, 3);
      controls.target.lerpVectors(camAnim.fromTarget, camAnim.toTarget, e);
      camera.position.lerpVectors(camAnim.fromPos, camAnim.toPos, e);
      if (camAnim.t >= 1) camAnim = null;
    }

    controls.update();
    checkHover();

    var cityVisible = cityGroup.visible && labelsVisible;
    for (var j = 0; j < cityLabels.length; j++) {
      if (cityLabels[j]) placeLabel(cityLabels[j], cityVisible);
    }
    for (var k = 0; k < districtLabels.length; k++) placeLabel(districtLabels[k], labelsVisible);

    renderer.render(scene, camera);
  }

  /* ============================================================
     11) O'LCHAM O'ZGARISHI va ISHGA TUSHIRISH
     ============================================================ */
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  showRegionInfo();
  renderer.render(scene, camera);
  setTimeout(function () { $('loading').classList.add('hide'); }, 250);
  animate();

  /* Tashqi foydalanish va test uchun ochiq API */
  window.TERMEZ_3D = {
    scene: scene, camera: camera, renderer: renderer, controls: controls,
    baseGroup: baseGroup, districtGroup: districtGroup,
    cityGroup: cityGroup, outlineGroup: outlineGroup, grid: grid,
    districts: districts, selectDistrict: selectDistrict,
    stats: { regionArea: regionArea, districtCount: districts.length, points: totalPoints }
  };
})();
