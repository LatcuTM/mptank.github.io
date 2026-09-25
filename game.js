(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const TAU = Math.PI * 2;
  const $ = (id) => document.getElementById(id);

  const modeData = {
    duel: { label: "DUEL", roster: 1, total: 2, versus: "1v1" },
    squad: { label: "SQUAD", roster: 2, total: 4, versus: "2v2" },
    warfront: { label: "WARFRONT", roster: 4, total: 8, versus: "4v4" }
  };
  const arenaData = {
    foundry: { label: "FOUNDRY RUN", walls: [{x: 280,y: 145,w: 180,h: 42},{x: 740,y: 145,w: 180,h: 42},{x: 280,y: 513,w: 180,h: 42},{x: 740,y: 513,w: 180,h: 42},{x: 540,y: 255,w: 120,h: 190}], color: "#28444b" },
    bunker: { label: "BUNKER GRID", walls: [{x: 185,y: 120,w: 250,h: 38},{x: 765,y: 120,w: 250,h: 38},{x: 185,y: 542,w: 250,h: 38},{x: 765,y: 542,w: 250,h: 38},{x: 370,y: 285,w: 120,h: 130},{x: 710,y: 285,w: 120,h: 130}], color: "#3a4350" },
    sandline: { label: "SANDLINE", walls: [{x: 210,y: 180,w: 160,h: 32},{x: 830,y: 180,w: 160,h: 32},{x: 210,y: 488,w: 160,h: 32},{x: 830,y: 488,w: 160,h: 32},{x: 480,y: 160,w: 240,h: 30},{x: 480,y: 510,w: 240,h: 30}], color: "#5a4c35" }
  };
  const colors = { blue: "#4cc8df", blueLight: "#8bf0f7", red: "#ef6e64", redLight: "#ff9b8d", ink: "#eaf2f3", muted: "#8d9da2" };
  const controls = [
    {up:"KeyW",down:"KeyS",left:"KeyA",right:"KeyD",fire:"Space",label:"WASD",fireLabel:"SPACE"},
    {up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight",fire:"Enter",label:"ARROWS",fireLabel:"ENTER"},
    {up:"KeyI",down:"KeyK",left:"KeyJ",right:"KeyL",fire:"KeyU",label:"IJKL",fireLabel:"U"},
    {up:"KeyT",down:"KeyG",left:"KeyF",right:"KeyH",fire:"KeyY",label:"TFGH",fireLabel:"Y"},
    {up:"KeyR",down:"KeyV",left:"KeyF",right:"KeyB",fire:"KeyN",label:"RFVB",fireLabel:"N"},
    {up:"KeyY",down:"KeyN",left:"KeyH",right:"KeyM",fire:"KeyU",label:"YHNM",fireLabel:"U"},
    {up:"Digit8",down:"Digit5",left:"Digit4",right:"Digit6",fire:"Digit0",label:"8456",fireLabel:"0"},
    {up:"Numpad8",down:"Numpad5",left:"Numpad4",right:"Numpad6",fire:"Numpad0",label:"NUMPAD",fireLabel:"0"}
  ];
  const names = ["VANGUARD", "SENTINEL", "RIPTIDE", "HAMMER", "WRAITH", "BULLDOG", "NOMAD", "TITAN"];
  const keys = new Set();
  let selectedMode = "duel", selectedBattle = "bots", selectedArena = "foundry";
  let game = null, animationId = 0, lastTime = 0, matchStart = 0, elapsed = 0;
  const network = { peer: null, role: null, roomId: "", playerId: null, connection: null, connections: new Map(), broadcastTimer: 0 };

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function random(min, max) { return min + Math.random() * (max - min); }
  function formatTime(seconds) { const m = Math.floor(seconds / 60).toString().padStart(2, "0"); const s = Math.floor(seconds % 60).toString().padStart(2, "0"); return `${m}:${s}`; }

  function showScreen(id) { ["lobby", "game", "results"].forEach((screen) => $(screen).classList.toggle("is-hidden", screen !== id)); }
  function updateLobbyMeta() { const data = modeData[selectedMode]; $("playersCount").textContent = data.total; }

  document.querySelectorAll(".mode-card").forEach((card) => card.addEventListener("click", () => {
    selectedMode = card.dataset.mode;
    document.querySelectorAll(".mode-card").forEach((item) => item.classList.toggle("is-selected", item === card));
    updateLobbyMeta();
  }));
  document.querySelectorAll("[data-battle]").forEach((button) => button.addEventListener("click", () => {
    selectedBattle = button.dataset.battle;
    document.querySelectorAll("[data-battle]").forEach((item) => item.classList.toggle("is-selected", item === button));
    $("onlinePanel").classList.toggle("is-hidden", selectedBattle !== "online");
  }));
  $("mapSelect").addEventListener("change", (event) => { selectedArena = event.target.value; });
  $("launchButton").addEventListener("click", () => selectedBattle === "online" ? (network.role === "host" ? startHostMatch() : setNetworkStatus("CREATE A ROOM OR JOIN ONE FIRST", "error")) : startMatch());
  $("hostButton").addEventListener("click", createRoom);
  $("joinButton").addEventListener("click", joinRoom);
  $("rematchButton").addEventListener("click", () => selectedBattle === "online" ? (network.role === "host" ? startHostMatch() : setNetworkStatus("THE HOST MUST START THE REMATCH", "error")) : startMatch());
  $("lobbyButton").addEventListener("click", () => { stopGame(); disconnectNetwork(); showScreen("lobby"); });
  $("quitButton").addEventListener("click", () => { stopGame(); disconnectNetwork(); showScreen("lobby"); });
  window.addEventListener("keydown", (event) => { keys.add(event.code); if (event.code === "Escape" && game) { stopGame(); disconnectNetwork(); showScreen("lobby"); } if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault(); });
  window.addEventListener("keyup", (event) => keys.delete(event.code));

  function setNetworkStatus(message, state = "") { const status = $("networkStatus"); status.textContent = message; status.className = `network-status${state ? ` is-${state}` : ""}`; }
  function cleanName(value) { const name = String(value || "").replace(/[^a-z0-9 _-]/gi, "").trim().slice(0, 12).toUpperCase(); return name || "VANGUARD"; }
  function playerName() { return cleanName($("playerName").value); }
  function roomCode() { return `IC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`; }
  function disconnectNetwork() { if (network.peer) network.peer.destroy(); network.peer = null; network.role = null; network.roomId = ""; network.playerId = null; network.connection = null; network.connections.clear(); }
  function requirePeer() { if (!window.Peer) { setNetworkStatus("PEERJS DID NOT LOAD // CHECK YOUR CONNECTION", "error"); return null; } return window.Peer; }
  function createRoom() {
    const Peer = requirePeer(); if (!Peer) return; disconnectNetwork(); const id = roomCode(); setNetworkStatus("OPENING SECURE ROOM...");
    network.role = "host"; network.roomId = id; network.peer = new Peer(id);
    network.peer.on("open", () => { $("hostButton").textContent = id; $("roomInput").value = id; setNetworkStatus(`ROOM ${id} READY // SEND THE CODE TO YOUR FRIEND`, "good"); startHostMatch(); });
    network.peer.on("connection", (connection) => setupHostConnection(connection));
    network.peer.on("error", (error) => setNetworkStatus(`ROOM ERROR // ${error.type || "CONNECTION FAILED"}`, "error"));
  }
  function joinRoom() {
    const Peer = requirePeer(); if (!Peer) return; const id = $("roomInput").value.trim().toUpperCase(); if (!id) { setNetworkStatus("ENTER A ROOM CODE FIRST", "error"); return; }
    disconnectNetwork(); network.role = "client"; network.roomId = id; setNetworkStatus(`CONNECTING TO ${id}...`); network.peer = new Peer();
    network.peer.on("open", () => { network.connection = network.peer.connect(id, { reliable: true }); setupClientConnection(network.connection); });
    network.peer.on("error", (error) => setNetworkStatus(`JOIN FAILED // ${error.type || "CHECK THE CODE"}`, "error"));
  }
  function setupHostConnection(connection) {
    connection.on("open", () => { network.connections.set(connection.peer, connection); connection.send({ type: "welcome", mode: selectedMode, arena: selectedArena }); });
    connection.on("data", (message) => { if (message.type === "join") assignRemotePlayer(connection, message.name); if (message.type === "input" && game) { const tank = game.tanks.find((item) => item.id === message.playerId && item.connId === connection.peer); if (tank) tank.input = message.input; } });
    connection.on("close", () => { const tank = game && game.tanks.find((item) => item.connId === connection.peer); if (tank) { tank.remote = false; tank.human = false; tank.connId = null; tank.input = { x: 0, y: 0, fire: false }; } network.connections.delete(connection.peer); });
    connection.on("error", () => network.connections.delete(connection.peer));
  }
  function setupClientConnection(connection) {
    network.connection = connection;
    connection.on("open", () => { connection.send({ type: "join", name: playerName() }); setNetworkStatus("CONNECTED // WAITING FOR HOST", "good"); });
    connection.on("data", (message) => handleClientMessage(message));
    connection.on("close", () => setNetworkStatus("HOST CONNECTION LOST // RETURN TO LOBBY", "error"));
    connection.on("error", () => setNetworkStatus("NETWORK ERROR // TRY AGAIN", "error"));
  }
  function assignRemotePlayer(connection, requestedName) {
    if (!game) { connection.send({ type: "error", message: "Host has not deployed yet." }); return; }
    const tank = game.tanks.find((item) => item.team === "blue" && !item.remote && item.id !== 0) || game.tanks.find((item) => !item.remote && item.id !== 0);
    if (!tank) { connection.send({ type: "error", message: "This room is full." }); return; }
    tank.human = true; tank.remote = true; tank.connId = connection.peer; tank.name = cleanName(requestedName); tank.input = { x: 0, y: 0, fire: false }; connection.send({ type: "init", playerId: tank.id, snapshot: serializeGame() }); setNetworkStatus(`ROOM ${network.roomId} // ${network.connections.size} REMOTE PLAYER(S)`, "good"); broadcastState();
  }
  function serializeGame() { return { mode: game.mode, arena: game.arena, elapsed, tanks: game.tanks.map((tank) => ({ id: tank.id, team: tank.team, x: tank.x, y: tank.y, angle: tank.angle, health: tank.health, alive: tank.alive, human: tank.human, name: tank.name, kills: tank.kills })), shells: game.shells.map((shell) => ({ x: shell.x, y: shell.y, angle: shell.angle, team: shell.team })), particles: game.particles.slice(-60).map((particle) => ({ x: particle.x, y: particle.y, life: particle.life, size: particle.size, color: particle.color })) }; }
  function broadcastState() { if (network.role !== "host" || !game) return; const snapshot = { type: "state", snapshot: serializeGame() }; network.connections.forEach((connection) => { if (connection.open) connection.send(snapshot); }); }
  function handleClientMessage(message) {
    if (message.type === "init") { network.playerId = message.playerId; loadClientGame(message.snapshot); setNetworkStatus(`CONNECTED // YOU ARE ${game.tanks.find((tank) => tank.id === network.playerId).name}`, "good"); showScreen("game"); renderRoster(); renderLegend(); animationId = requestAnimationFrame(loop); }
    if (message.type === "state" && game) applySnapshot(message.snapshot);
    if (message.type === "finish") finishMatch(message.winner, true);
    if (message.type === "error") setNetworkStatus(message.message, "error");
  }
  function loadClientGame(snapshot) { game = { mode: snapshot.mode, arena: snapshot.arena, tanks: [], shells: [], particles: [], winner: null, over: false, countdown: 0, onlineClient: true }; applySnapshot(snapshot); matchStart = performance.now() - snapshot.elapsed * 1000; lastTime = performance.now(); $("matchLabel").textContent = `// ${modeData[snapshot.mode].label} / ${arenaData[snapshot.arena].label}`; $("arenaLabel").textContent = arenaData[snapshot.arena].label; }
  function applySnapshot(snapshot) { if (!game) return; game.mode = snapshot.mode; game.arena = snapshot.arena; elapsed = snapshot.elapsed; game.tanks = snapshot.tanks.map((item) => ({ ...item, r: 20, spawnX: item.x, spawnY: item.y, cool: 0, flash: 0, hit: 0, control: controls[item.id] || controls[0], remote: item.id !== network.playerId })); game.shells = snapshot.shells.map((item) => ({ ...item, speed: 0, life: .2 })); game.particles = snapshot.particles; }

  function startMatch() { disconnectNetwork(); initializeMatch(false); }
  function startHostMatch() { initializeMatch(true); }
  function initializeMatch(onlineHost) {
    stopGame();
    const data = modeData[selectedMode];
    game = { mode: selectedMode, arena: selectedArena, humanOnly: selectedBattle === "local", onlineHost, tanks: [], shells: [], particles: [], sparks: [], winner: null, over: false, countdown: 3, toast: null };
    const blueSpawns = getSpawns("blue", data.roster), redSpawns = getSpawns("red", data.roster);
    for (let i = 0; i < data.roster; i++) {
      game.tanks.push(makeTank(i, "blue", blueSpawns[i], game.humanOnly || i === 0, controls[i]));
      game.tanks.push(makeTank(data.roster + i, "red", redSpawns[i], game.humanOnly ? true : false, controls[data.roster + i]));
    }
    game.tanks[0].name = playerName();
    matchStart = performance.now(); lastTime = matchStart; elapsed = 0;
    $("matchLabel").textContent = `// ${data.label} / ${arenaData[selectedArena].label}`;
    $("arenaLabel").textContent = arenaData[selectedArena].label;
    renderRoster(); renderLegend(); showScreen("game");
    $("countdown").classList.remove("is-hidden"); $("countdown").textContent = "3";
    setTimeout(() => { if (game) $("countdown").textContent = "2"; }, 700);
    setTimeout(() => { if (game) $("countdown").textContent = "1"; }, 1400);
    setTimeout(() => { if (game) { game.countdown = 0; $("countdown").classList.add("is-hidden"); showToast("LIVE // ELIMINATE ENEMY TEAM", 1900); } }, 2100);
    animationId = requestAnimationFrame(loop);
  }
  function stopGame() { if (animationId) cancelAnimationFrame(animationId); animationId = 0; game = null; keys.clear(); }

  function getSpawns(team, count) {
    const cx = team === "blue" ? 120 : W - 120;
    if (count === 1) return [{x: cx, y: H / 2}];
    const gap = count === 2 ? 170 : 125, start = H / 2 - ((count - 1) * gap) / 2;
    return Array.from({length: count}, (_, i) => ({ x: cx, y: start + i * gap }));
  }
  function makeTank(index, team, spawn, human, control) {
    return { id: index, team, x: spawn.x, y: spawn.y, spawnX: spawn.x, spawnY: spawn.y, r: 20, angle: team === "blue" ? 0 : Math.PI, health: 100, alive: true, human, remote: false, connId: null, input: { x: 0, y: 0, fire: false }, control, cool: 0, respawn: 0, flash: 0, kills: 0, hit: 0, name: names[index] || `UNIT-${index + 1}` };
  }

  function loop(now) {
    if (!game) return;
    const dt = Math.min((now - lastTime) / 1000, .035); lastTime = now;
    if (!game.over && game.countdown === 0) { if (game.onlineClient) sendClientInput(); else { elapsed = (now - matchStart - 2100) / 1000; update(dt); } }
    draw(); renderRoster(); $("matchClock").textContent = formatTime(Math.max(0, elapsed));
    if (!game.over) animationId = requestAnimationFrame(loop);
  }

  function update(dt) {
    for (const tank of game.tanks) {
      if (!tank.alive) { tank.respawn -= dt; if (tank.respawn <= 0 && selectedMode !== "duel") respawnTank(tank); continue; }
      tank.cool = Math.max(0, tank.cool - dt); tank.flash = Math.max(0, tank.flash - dt); tank.hit = Math.max(0, tank.hit - dt);
      const intent = tank.remote ? tank.input : tank.human ? humanIntent(tank) : botIntent(tank, dt);
      if (intent.x || intent.y) {
        const length = Math.hypot(intent.x, intent.y) || 1, speed = tank.human ? 165 : 128;
        tank.x += intent.x / length * speed * dt; tank.y += intent.y / length * speed * dt; tank.angle = Math.atan2(intent.y, intent.x);
        resolveTank(tank);
      }
      if (intent.fire && tank.cool <= 0) fireShell(tank);
    }
    for (const shell of game.shells) { shell.x += Math.cos(shell.angle) * shell.speed * dt; shell.y += Math.sin(shell.angle) * shell.speed * dt; shell.life -= dt; if (shell.life <= 0 || shell.x < -20 || shell.x > W + 20 || shell.y < -20 || shell.y > H + 20) shell.dead = true; if (!shell.dead && hitWall(shell.x, shell.y, 4)) { shell.dead = true; burst(shell.x, shell.y, "wall"); } if (!shell.dead) { for (const tank of game.tanks) { if (!tank.alive || tank.team === shell.team) continue; if (Math.hypot(tank.x - shell.x, tank.y - shell.y) < tank.r + 5) { damageTank(tank, shell); shell.dead = true; break; } } } }
    game.shells = game.shells.filter((shell) => !shell.dead);
    for (const particle of game.particles) { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.life -= dt; particle.vx *= .97; particle.vy *= .97; }
    game.particles = game.particles.filter((particle) => particle.life > 0);
    const blueAlive = game.tanks.some((tank) => tank.team === "blue" && tank.alive), redAlive = game.tanks.some((tank) => tank.team === "red" && tank.alive);
    if (!blueAlive || !redAlive) finishMatch(blueAlive ? "blue" : "red");
    if (game.onlineHost && performance.now() - network.broadcastTimer > 50) { network.broadcastTimer = performance.now(); broadcastState(); }
  }
  function humanIntent(tank) { const c = tank.control; return { x: (keys.has(c.right) ? 1 : 0) - (keys.has(c.left) ? 1 : 0), y: (keys.has(c.down) ? 1 : 0) - (keys.has(c.up) ? 1 : 0), fire: keys.has(c.fire) }; }
  function sendClientInput() { if (!network.connection || !network.connection.open || !game || network.playerId === null) return; const tank = game.tanks.find((item) => item.id === network.playerId); if (tank) network.connection.send({ type: "input", playerId: network.playerId, input: humanIntent(tank) }); }
  function botIntent(tank, dt) {
    const enemies = game.tanks.filter((other) => other.team !== tank.team && other.alive); if (!enemies.length) return {x:0,y:0,fire:false};
    let target = enemies[0]; for (const enemy of enemies) if (Math.hypot(enemy.x - tank.x, enemy.y - tank.y) < Math.hypot(target.x - tank.x, target.y - tank.y)) target = enemy;
    const dx = target.x - tank.x, dy = target.y - tank.y, distance = Math.hypot(dx, dy); const orbit = Math.sin(performance.now() / 900 + tank.id) * .55;
    const moveX = dx / (distance || 1) - dy / (distance || 1) * orbit, moveY = dy / (distance || 1) + dx / (distance || 1) * orbit;
    const fire = distance < 620 && Math.random() < dt * 1.8; return { x: distance > 265 ? moveX : -moveY * .7, y: distance > 265 ? moveY : moveX * .7, fire };
  }
  function resolveTank(tank) {
    tank.x = clamp(tank.x, 28, W - 28); tank.y = clamp(tank.y, 28, H - 28);
    for (const wall of arenaData[game.arena].walls) { const nearestX = clamp(tank.x, wall.x, wall.x + wall.w), nearestY = clamp(tank.y, wall.y, wall.y + wall.h); const dx = tank.x - nearestX, dy = tank.y - nearestY, dist = Math.hypot(dx, dy); if (dist < tank.r) { if (dist === 0) { tank.x += tank.x < wall.x + wall.w / 2 ? -2 : 2; } else { tank.x += dx / dist * (tank.r - dist); tank.y += dy / dist * (tank.r - dist); } } }
    for (const other of game.tanks) { if (other === tank || !other.alive) continue; const dx = tank.x - other.x, dy = tank.y - other.y, dist = Math.hypot(dx, dy), min = tank.r + other.r - 4; if (dist < min && dist > 0) { const push = (min - dist) / 2; tank.x += dx / dist * push; tank.y += dy / dist * push; } }
  }
  function hitWall(x, y, radius) { return arenaData[game.arena].walls.some((wall) => x + radius > wall.x && x - radius < wall.x + wall.w && y + radius > wall.y && y - radius < wall.y + wall.h); }
  function fireShell(tank) { tank.cool = .72; const muzzle = 29; game.shells.push({ x: tank.x + Math.cos(tank.angle) * muzzle, y: tank.y + Math.sin(tank.angle) * muzzle, angle: tank.angle, speed: 510, life: 1.5, team: tank.team, owner: tank }); tank.flash = .09; burst(tank.x + Math.cos(tank.angle) * 29, tank.y + Math.sin(tank.angle) * 29, "muzzle"); }
  function damageTank(tank, shell) { tank.health -= 34; tank.hit = .16; burst(shell.x, shell.y, "hit"); if (tank.health <= 0) { tank.health = 0; tank.alive = false; tank.respawn = selectedMode === "duel" ? 999 : 2.8; shell.owner.kills++; burst(tank.x, tank.y, "destroy"); showToast(`${shell.owner.name} // TARGET DISABLED`, 1200); } }
  function respawnTank(tank) { tank.alive = true; tank.health = 100; tank.x = tank.spawnX + random(-18, 18); tank.y = tank.spawnY + random(-28, 28); burst(tank.x, tank.y, "spawn"); }
  function burst(x, y, type) { const palette = type === "hit" ? [colors.gold, "#fff5c2"] : type === "destroy" ? [colors.red, colors.gold, "#fff5c2"] : [colors.blue, colors.blueLight, "#fff"]; const count = type === "destroy" ? 24 : type === "muzzle" ? 7 : 10; for (let i = 0; i < count; i++) { const angle = random(0, TAU), speed = type === "destroy" ? random(40, 160) : random(25, 95); game.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: random(.18, type === "destroy" ? .85 : .42), size: random(1, type === "destroy" ? 4 : 2.5), color: palette[Math.floor(Math.random() * palette.length)] }); } }
  function showToast(text, duration) { if (!game) return; const toast = $("gameToast"); toast.textContent = text; toast.classList.remove("is-hidden"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.add("is-hidden"), duration); }

  function draw() { ctx.clearRect(0, 0, W, H); drawArena(); for (const shell of game.shells) drawShell(shell); for (const tank of game.tanks) drawTank(tank); for (const particle of game.particles) drawParticle(particle); }
  function drawArena() {
    const arena = arenaData[game.arena]; ctx.fillStyle = game.arena === "sandline" ? "#2a281f" : "#0c1b24"; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = .17; ctx.strokeStyle = game.arena === "sandline" ? "#d6ae67" : "#6a9da5"; ctx.lineWidth = 1; for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(139, 240, 247, .27)"; ctx.strokeRect(16, 16, W - 32, H - 32);
    for (const wall of arena.walls) { ctx.fillStyle = "rgba(1, 8, 14, .45)"; ctx.fillRect(wall.x + 7, wall.y + 8, wall.w, wall.h); ctx.fillStyle = arena.color; ctx.fillRect(wall.x, wall.y, wall.w, wall.h); ctx.strokeStyle = "rgba(185, 214, 211, .32)"; ctx.strokeRect(wall.x + .5, wall.y + .5, wall.w - 1, wall.h - 1); ctx.globalAlpha = .2; ctx.strokeStyle = colors.ink; for (let x = wall.x + 16; x < wall.x + wall.w; x += 34) { ctx.beginPath(); ctx.moveTo(x, wall.y); ctx.lineTo(x, wall.y + wall.h); ctx.stroke(); } ctx.globalAlpha = 1; }
    const gradient = ctx.createRadialGradient(600, 350, 10, 600, 350, 280); gradient.addColorStop(0, "rgba(76, 200, 223, .09)"); gradient.addColorStop(1, "rgba(76, 200, 223, 0)"); ctx.fillStyle = gradient; ctx.fillRect(180, 70, 840, 560);
  }
  function drawShell(shell) { ctx.save(); ctx.translate(shell.x, shell.y); ctx.rotate(shell.angle); ctx.fillStyle = "#fff4c2"; ctx.shadowColor = colors.gold; ctx.shadowBlur = 12; ctx.fillRect(-7, -2, 14, 4); ctx.restore(); }
  function drawParticle(particle) { ctx.globalAlpha = clamp(particle.life * 3, 0, 1); ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, particle.size, particle.size); ctx.globalAlpha = 1; }
  function drawTank(tank) {
    if (!tank.alive) { ctx.save(); ctx.globalAlpha = .22; ctx.strokeStyle = tank.team === "blue" ? colors.blue : colors.red; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(tank.spawnX, tank.spawnY, 23, 0, TAU); ctx.stroke(); ctx.restore(); return; }
    const primary = tank.team === "blue" ? colors.blue : colors.red, light = tank.team === "blue" ? colors.blueLight : colors.redLight;
    ctx.save(); ctx.translate(tank.x, tank.y); ctx.rotate(tank.angle); if (tank.hit > 0) ctx.globalAlpha = .55;
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(-19, -15, 40, 34); ctx.fillStyle = primary; ctx.fillRect(-18, -15, 36, 30); ctx.fillStyle = "#0a151e"; ctx.fillRect(-15, -12, 30, 5); ctx.fillRect(-15, 7, 30, 5); ctx.fillStyle = light; ctx.fillRect(-12, -10, 24, 3); ctx.fillRect(-12, 7, 24, 3); ctx.fillStyle = primary; ctx.fillRect(-9, -11, 18, 22); ctx.strokeStyle = "rgba(234,242,243,.45)"; ctx.lineWidth = 1; ctx.strokeRect(-9, -11, 18, 22); ctx.fillStyle = light; ctx.fillRect(3, -3, 26, 6); ctx.fillStyle = "#09131c"; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); ctx.strokeStyle = light; ctx.stroke(); ctx.fillStyle = light; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill(); if (tank.flash > 0) { ctx.fillStyle = "#fff1ad"; ctx.shadowColor = colors.gold; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(30, 0, 7 + tank.flash * 25, 0, TAU); ctx.fill(); } ctx.restore();
    ctx.save(); ctx.translate(tank.x, tank.y); ctx.fillStyle = "rgba(3, 10, 17, .7)"; ctx.fillRect(-24, -34, 48, 3); ctx.fillStyle = primary; ctx.fillRect(-24, -34, 48 * (tank.health / 100), 3); ctx.fillStyle = "rgba(234,242,243,.8)"; ctx.font = "600 8px Space Grotesk"; ctx.textAlign = "center"; ctx.fillText(tank.name, 0, -39); if (tank.human) { ctx.fillStyle = light; ctx.font = "700 7px Space Grotesk"; ctx.fillText("YOU", 0, 35); } ctx.restore();
  }

  function renderRoster() { if (!game) return; ["blue", "red"].forEach((team) => { const container = $(team + "Roster"); container.innerHTML = ""; game.tanks.filter((tank) => tank.team === team).forEach((tank) => { const entry = document.createElement("div"); entry.className = `roster-entry${tank.alive ? "" : " is-dead"}`; entry.innerHTML = `<div class="roster-name"><span>${tank.name}</span><span class="status">${tank.alive ? (tank.human ? "YOU" : "CPU") : "DOWN"}</span></div><div class="health-track"><div class="health-fill" style="width:${tank.health}%"></div></div>`; container.appendChild(entry); }); }); $("blueScore").textContent = game.tanks.filter((tank) => tank.team === "blue" && !tank.alive).length; $("redScore").textContent = game.tanks.filter((tank) => tank.team === "red" && !tank.alive).length; }
  function renderLegend() { if (!game) return; const active = game.tanks.filter((tank) => tank.human); $("controlsLegend").innerHTML = active.map((tank) => `<span class="control-chip"><strong>${tank.name}</strong> <em>${tank.control.label}</em> MOVE / <em>${tank.control.fireLabel}</em> FIRE</span>`).join(""); }
  function finishMatch(winner, fromNetwork = false) { if (!game || game.over) return; game.over = true; game.winner = winner; if (game.onlineHost && !fromNetwork) { network.connections.forEach((connection) => { if (connection.open) connection.send({ type: "finish", winner }); }); } game.tanks.filter((tank) => tank.team === winner).forEach((tank) => { if (tank.alive) burst(tank.x, tank.y, "spawn"); }); setTimeout(() => { if (!game) return; const data = modeData[game.mode], arena = arenaData[game.arena]; $("resultKicker").textContent = winner.toUpperCase() + " SQUAD"; $("resultKicker").className = `result-kicker ${winner === "blue" ? "blue-text" : "red-text"}`; $("resultTitle").textContent = winner === "blue" ? "ARENA SECURED" : "LINE BROKEN"; $("resultSummary").textContent = winner === "blue" ? "The opposition has been fully neutralized." : "Red command owns the battlefield. Rally and rematch."; $("resultTime").textContent = formatTime(elapsed); $("resultMode").textContent = data.versus; $("resultArena").textContent = arena.label; showScreen("results"); }, 800); }
})();
