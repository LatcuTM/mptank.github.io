(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const TAU = Math.PI * 2;
  const $ = (id) => document.getElementById(id);

  const modeData = {
    duel:   { label: "DUEL",         roster: 1, total: 2,  versus: "1v1" },
    squad:  { label: "SQUAD",        roster: 2, total: 4,  versus: "2v2" },
    triple: { label: "FREE FOR ALL", roster: 1, total: 16, versus: "FFA", ffa: true }
  };

  const arenaData = {
    foundry:  { label: "FOUNDRY RUN", walls: [{x:280,y:145,w:180,h:42},{x:740,y:145,w:180,h:42},{x:280,y:513,w:180,h:42},{x:740,y:513,w:180,h:42},{x:540,y:255,w:120,h:190}], color:"#28444b" },
    bunker:   { label: "BUNKER GRID", walls: [{x:185,y:120,w:250,h:38},{x:765,y:120,w:250,h:38},{x:185,y:542,w:250,h:38},{x:765,y:542,w:250,h:38},{x:370,y:285,w:120,h:130},{x:710,y:285,w:120,h:130}], color:"#3a4350" },
    sandline: { label: "SANDLINE",    walls: [{x:210,y:180,w:160,h:32},{x:830,y:180,w:160,h:32},{x:210,y:488,w:160,h:32},{x:830,y:488,w:160,h:32},{x:480,y:160,w:240,h:30},{x:480,y:510,w:240,h:30}], color:"#5a4c35" }
  };

  const colors = { blue:"#4cc8df", blueLight:"#8bf0f7", red:"#ef6e64", redLight:"#ff9b8d", ink:"#eaf2f3", muted:"#8d9da2", gold:"#efbd60" };

  // 16 distinct vibrant tactical colors for up to 16 players in FFA
  const ffaColors = [
    { key: "blue",     name: "BLUE",     primary: "#4cc8df", light: "#8bf0f7" },
    { key: "red",      name: "RED",      primary: "#ef6e64", light: "#ff9b8d" },
    { key: "gold",     name: "GOLD",     primary: "#efbd60", light: "#ffe09a" },
    { key: "green",    name: "GREEN",    primary: "#52d68a", light: "#a3f7c4" },
    { key: "purple",   name: "PURPLE",   primary: "#b678f5", light: "#e2c4ff" },
    { key: "orange",   name: "ORANGE",   primary: "#f28b49", light: "#ffbf97" },
    { key: "pink",     name: "PINK",     primary: "#f36ba5", light: "#ffb4d6" },
    { key: "cyan",     name: "CYAN",     primary: "#38d9b9", light: "#8ef9e3" },
    { key: "lime",     name: "LIME",     primary: "#a4e837", light: "#d0ff84" },
    { key: "magenta",  name: "MAGENTA",  primary: "#e040fb", light: "#f38eff" },
    { key: "indigo",   name: "INDIGO",   primary: "#536dfe", light: "#97a8ff" },
    { key: "ruby",     name: "RUBY",     primary: "#ff1744", light: "#ff7597" },
    { key: "amber",    name: "AMBER",    primary: "#ffab00", light: "#ffd768" },
    { key: "teal",     name: "TEAL",     primary: "#00bfa5", light: "#64ffda" },
    { key: "lavender", name: "LAVENDER", primary: "#7c4dff", light: "#b47cff" },
    { key: "coral",    name: "CORAL",    primary: "#ff6e40", light: "#ff9e80" }
  ];

  const teamColors = {};
  ffaColors.forEach(c => { teamColors[c.key] = { primary: c.primary, light: c.light }; });

  // 16 perimeter and open-pocket spawn positions for FFA arenas
  const ffaSpawns = [
    { x: 110,  y: 110, angle: Math.PI * 0.25 },
    { x: 1090, y: 590, angle: -Math.PI * 0.75 },
    { x: 1090, y: 110, angle: Math.PI * 0.75 },
    { x: 110,  y: 590, angle: -Math.PI * 0.25 },
    { x: 600,  y: 85,  angle: Math.PI * 0.5 },
    { x: 600,  y: 615, angle: -Math.PI * 0.5 },
    { x: 100,  y: 350, angle: 0 },
    { x: 1100, y: 350, angle: Math.PI },
    { x: 110,  y: 230, angle: Math.PI * 0.1 },
    { x: 110,  y: 470, angle: -Math.PI * 0.1 },
    { x: 1090, y: 230, angle: Math.PI * 0.9 },
    { x: 1090, y: 470, angle: -Math.PI * 0.9 },
    { x: 380,  y: 85,  angle: Math.PI * 0.5 },
    { x: 820,  y: 85,  angle: Math.PI * 0.5 },
    { x: 380,  y: 615, angle: -Math.PI * 0.5 },
    { x: 820,  y: 615, angle: -Math.PI * 0.5 }
  ];

  const controls = [
    {up:"KeyW",    down:"KeyS",     left:"KeyA",     right:"KeyD",     fire:"Space",   label:"WASD",   fireLabel:"SPACE"},
    {up:"ArrowUp", down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight",fire:"Enter",  label:"ARROWS", fireLabel:"ENTER"},
    {up:"KeyI",    down:"KeyK",     left:"KeyJ",     right:"KeyL",     fire:"KeyU",    label:"IJKL",   fireLabel:"U"},
    {up:"KeyT",    down:"KeyG",     left:"KeyF",     right:"KeyH",     fire:"KeyY",    label:"TFGH",   fireLabel:"Y"},
    {up:"KeyR",    down:"KeyV",     left:"KeyF",     right:"KeyB",     fire:"KeyN",    label:"RFVB",   fireLabel:"N"},
    {up:"KeyY",    down:"KeyN",     left:"KeyH",     right:"KeyM",     fire:"KeyU",    label:"YHNM",   fireLabel:"U"},
    {up:"Digit8",  down:"Digit5",   left:"Digit4",   right:"Digit6",   fire:"Digit0",  label:"8456",   fireLabel:"0"},
    {up:"Numpad8", down:"Numpad5",  left:"Numpad4",  right:"Numpad6",  fire:"Numpad0", label:"NUMPAD", fireLabel:"0"}
  ];

  const names = [
    "VANGUARD","SENTINEL","RIPTIDE","HAMMER","WRAITH","BULLDOG","NOMAD","TITAN",
    "STRIKER","GHOST","BLAZE","VIPER","PHANTOM","RAZOR","APEX","VALKYRIE"
  ];

  const keys = new Set();
  const mouse = { x: W/2, y: H/2, down: false, active: false };
  let selectedMode = "triple", selectedBattle = "bots", selectedArena = "foundry";
  let game = null, animationId = 0, lastTime = 0, matchStart = 0, elapsed = 0;
  const network = { role:null, roomId:"", playerId:null, connection:null, connections:new Map(), broadcastTimer:0, socket:null, pendingTimer:null };

  // Stores remote players who connected to host: connId → { name, connId }
  const waitingPlayers = new Map();

  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
  function random(min,max){ return min+Math.random()*(max-min); }
  function formatTime(seconds){ const m=Math.floor(seconds/60).toString().padStart(2,"0"); const s=Math.floor(seconds%60).toString().padStart(2,"0"); return `${m}:${s}`; }

  function showScreen(id){
    ["lobby","waiting","game","results"].forEach((screen)=> {
      const el = $(screen);
      if (el) el.classList.toggle("is-hidden", screen !== id);
    });
  }

  function updateLobbyMeta(){
    const data = modeData[selectedMode] || modeData.triple;
    $("playersCount").textContent = selectedMode === "triple" ? "UP TO 16" : data.total;
  }

  // ── Name Helpers (Strict 12-char limit) ────────────────────────────────────
  function cleanName(value){
    const name = String(value || "").replace(/[^a-z0-9 _-]/gi,"").trim().slice(0, 12).toUpperCase();
    return name || "VANGUARD";
  }

  function playerName(){
    const waitInput = $("waitPlayerName");
    const mainInput = $("playerName");
    const raw = waitInput && waitInput.value ? waitInput.value : (mainInput ? mainInput.value : "VANGUARD");
    return cleanName(raw);
  }

  function updateNameEverywhere(newName){
    const clean = cleanName(newName);
    if($("playerName") && document.activeElement !== $("playerName")) $("playerName").value = clean;
    if($("waitPlayerName") && document.activeElement !== $("waitPlayerName")) $("waitPlayerName").value = clean;

    if(network.role === "host"){
      broadcastLobbyState();
      if(game){
        const hostTank = game.tanks.find(t => t.id === 0);
        if(hostTank){ hostTank.name = clean; broadcastState(); }
      }
    } else if(network.role === "client" && network.connection && network.connection.open){
      network.connection.send({ type: "name-change", name: clean });
    }
  }

  // ── Lobby event listeners ────────────────────────────────────────────────
  document.querySelectorAll(".mode-card").forEach((card)=>{
    card.addEventListener("click",()=>{
      selectedMode = card.dataset.mode;
      document.querySelectorAll(".mode-card").forEach((item)=>item.classList.toggle("is-selected", item===card));
      updateLobbyMeta();
      if(network.role === "host") broadcastLobbyState();
    });
  });

  document.querySelectorAll("[data-battle]").forEach((button)=>{
    button.addEventListener("click",()=>{
      selectedBattle = button.dataset.battle;
      document.querySelectorAll("[data-battle]").forEach((item)=>item.classList.toggle("is-selected", item===button));
      $("onlinePanel").classList.toggle("is-hidden", selectedBattle !== "online");
      $("launchButton").querySelector("span").textContent = selectedBattle === "online" ? "CREATE ROOM" : "DEPLOY TO ARENA";
    });
  });

  $("mapSelect").addEventListener("change",(event)=>{
    selectedArena = event.target.value;
    if(network.role === "host") broadcastLobbyState();
  });

  $("roomInput").addEventListener("input",(event)=>{ event.target.value = event.target.value.replace(/\D/g,"").slice(0,6); });
  $("launchButton").addEventListener("click",()=> selectedBattle === "online" ? createRoom() : startMatch());
  $("hostButton").addEventListener("click", createRoom);
  $("joinButton").addEventListener("click", joinRoom);

  // Live Name Input Listeners (Updates immediately on input and change, max 12 chars)
  const waitNameInput = $("waitPlayerName");
  if(waitNameInput){
    waitNameInput.addEventListener("input", (e) => {
      e.target.value = e.target.value.slice(0, 12);
      updateNameEverywhere(e.target.value);
    });
    waitNameInput.addEventListener("change", (e) => {
      updateNameEverywhere(e.target.value);
    });
  }

  const mainNameInput = $("playerName");
  if(mainNameInput){
    mainNameInput.addEventListener("input", (e) => {
      e.target.value = e.target.value.slice(0, 12);
      if(waitNameInput && document.activeElement !== waitNameInput) waitNameInput.value = e.target.value;
    });
    mainNameInput.addEventListener("change", (e) => {
      updateNameEverywhere(e.target.value);
    });
  }

  $("gameRoomCode").addEventListener("click", async()=>{
    const code = $("gameRoomCode").textContent;
    if(code === "—") return;
    try {
      await navigator.clipboard.writeText(code);
      showToast("ROOM CODE COPIED // SEND IT TO YOUR FRIENDS", 1800);
    } catch {
      showToast(`ROOM CODE // ${code}`, 2200);
    }
  });

  $("waitStartButton").addEventListener("click",()=>{
    if(network.role === "host") startHostMatch();
  });

  $("waitLeaveButton").addEventListener("click",()=>{
    stopGame();
    disconnectNetwork();
    waitingPlayers.clear();
    showScreen("lobby");
  });

  $("rematchButton").addEventListener("click",()=>{
    if(selectedBattle === "online"){
      if(network.role === "host"){
        startHostMatch();
      } else {
        if(network.connection && network.connection.open){
          network.connection.send({ type: "rematch-request", name: playerName() });
        }
        setNetworkStatus("REMATCH REQUESTED // WAITING FOR HOST", "good");
        $("rematchButton").textContent = "WAITING FOR HOST...";
      }
    } else {
      startMatch();
    }
  });

  $("lobbyButton").addEventListener("click",()=>{
    stopGame();
    disconnectNetwork();
    waitingPlayers.clear();
    showScreen("lobby");
  });

  $("quitButton").addEventListener("click",()=>{
    stopGame();
    disconnectNetwork();
    waitingPlayers.clear();
    showScreen("lobby");
  });

  window.addEventListener("keydown",(event)=>{
    keys.add(event.code);
    if(event.code === "Escape" && game){
      stopGame();
      disconnectNetwork();
      waitingPlayers.clear();
      showScreen("lobby");
    }
    if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(event.code)) event.preventDefault();
  });
  window.addEventListener("keyup",(event)=>keys.delete(event.code));

  function updateMousePosition(event){
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left) / rect.width * W;
    mouse.y = (event.clientY - rect.top) / rect.height * H;
    mouse.active = true;
  }
  canvas.addEventListener("mousemove", updateMousePosition);
  canvas.addEventListener("mousedown",(event)=>{
    if(event.button === 0){
      updateMousePosition(event);
      mouse.down = true;
      event.preventDefault();
    }
  });
  window.addEventListener("mouseup",()=>{ mouse.down = false; });
  canvas.addEventListener("mouseleave",()=>{ mouse.active = false; mouse.down = false; });

  // ── Network Status ────────────────────────────────────────────────────────
  function setNetworkStatus(message, state=""){
    const status = $("networkStatus");
    if(status){ status.textContent = message; status.className = `network-status${state?` is-${state}`:""}`; }
    const ws = $("waitNetworkStatus");
    if(ws){ ws.textContent = message; ws.className = `network-status${state?` is-${state}`:""}`; }
  }

  function roomCode(){ return String(Math.floor(100000+Math.random()*900000)); }

  function setRoomBadge(code){
    const box = $("gameRoomBox");
    if(box) box.classList.toggle("is-hidden", !code);
    const label = $("gameRoomCode");
    if(label) label.textContent = code || "—";
  }

  function disconnectNetwork(){
    if(network.pendingTimer) clearTimeout(network.pendingTimer);
    if(network.socket) network.socket.close();
    network.socket = null;
    network.role = null;
    network.roomId = "";
    network.playerId = null;
    network.connection = null;
    network.connections.clear();
    setRoomBadge("");
  }

  // ── Authoritative Waiting Room Sync ───────────────────────────────────────
  function getLobbyPlayersList(){
    const list = [{ name: playerName(), connId: "HOST", isHost: true }];
    waitingPlayers.forEach(p => {
      list.push({ name: p.name, connId: p.connId, isHost: false });
    });
    return list;
  }

  function broadcastLobbyState(){
    if(network.role !== "host") return;
    const players = getLobbyPlayersList();
    const payload = {
      type: "lobby-state",
      roomId: network.roomId,
      mode: selectedMode,
      arena: selectedArena,
      players: players
    };
    network.connections.forEach(conn => {
      if(conn.open) conn.send(payload);
    });
    renderWaitingRoom(players, true);
  }

  function renderWaitingRoom(players, isHost){
    const list = $("waitPlayerList");
    if(!list) return;
    list.innerHTML = "";

    const localName = playerName();

    // Keep name input synchronized without hijacking user focus
    const waitInput = $("waitPlayerName");
    if(waitInput && document.activeElement !== waitInput){
      waitInput.value = localName;
    }

    players.forEach(p => {
      const isLocal = isHost ? p.isHost : (p.name === localName && !p.isHost);
      const entry = document.createElement("div");
      entry.className = `wait-player-entry${p.isHost ? " wait-host" : ""}`;

      let badgesHtml = `<div class="wait-player-badges">`;
      if(p.isHost) {
        badgesHtml += `<span class="wait-player-badge">HOST</span>`;
      } else {
        badgesHtml += `<span class="wait-player-badge wait-badge-ready">READY</span>`;
      }
      if(isLocal) {
        badgesHtml += `<span class="wait-player-badge wait-badge-you">YOU</span>`;
      }
      badgesHtml += `</div>`;

      entry.innerHTML = `<span class="wait-player-name">${p.name}</span>${badgesHtml}`;
      list.appendChild(entry);
    });

    const isFFA = selectedMode === "triple";
    const maxSlots = isFFA ? 16 : (modeData[selectedMode] ? modeData[selectedMode].total : 4);
    $("waitPlayerCount").textContent = isFFA ? `${players.length} / ${maxSlots} COMBATANTS` : `${players.length} / ${maxSlots} PLAYERS`;
    $("waitRoomCode").textContent = network.roomId || "——————";

    const startBtn = $("waitStartButton");
    if(startBtn) startBtn.classList.toggle("is-hidden", !isHost);

    setNetworkStatus(isHost ? `ROOM ${network.roomId} READY // PRESS START WHEN READY` : "IN LOBBY // WAITING FOR HOST TO START", "good");
    showScreen("waiting");
  }

  // ── Network Creation & Connection (LAN) ───────────────────────────────────
  function createRoom(){ createLanRoom(); }

  function joinRoom(){
    const id = $("roomInput").value.replace(/\D/g,"").slice(0,6);
    $("roomInput").value = id;
    if(!/^\d{6}$/.test(id)){
      setNetworkStatus("ENTER THE 6-DIGIT ROOM CODE FIRST", "error");
      return;
    }
    joinLanRoom(id);
  }

  function lanSocketUrl(){
    if(!window.WebSocket || location.protocol === "file:" || !location.host) return null;
    return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
  }

  function createLanAdapter(socket, peerId, hostSide){
    const handlers = {};
    return {
      peer: peerId,
      open: false,
      on(event, callback){ handlers[event] = callback; },
      send(data){
        if(socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "send", to: hostSide ? peerId : undefined, data }));
        }
      },
      close(){ socket.close(); },
      emit(event, data){ if(handlers[event]) handlers[event](data); }
    };
  }

  function createLanRoom(){
    const url = lanSocketUrl();
    if(!url){ setNetworkStatus("LAN NEEDS LOCAL SERVER // RUN NPM START", "error"); return; }
    disconnectNetwork();
    const id = roomCode();
    network.role = "host";
    network.roomId = id;
    setNetworkStatus(`OPENING LAN ROOM ${id}...`);
    network.socket = new WebSocket(url);

    network.socket.onopen = () => network.socket.send(JSON.stringify({ type: "host", room: id }));

    network.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if(message.type === "host-ready"){
        $("hostButton").textContent = id;
        $("roomInput").value = id;
        setRoomBadge(id);
        waitingPlayers.clear();
        broadcastLobbyState();
      }
      if(message.type === "peer-join"){
        const connection = createLanAdapter(network.socket, message.peerId, true);
        network.connections.set(message.peerId, connection);
        setupHostConnection(connection);
        connection.open = true;
        connection.emit("open");
      }
      if(message.type === "data"){
        const connection = network.connections.get(message.from);
        if(connection) connection.emit("data", message.data);
      }
      if(message.type === "peer-leave"){
        const connection = network.connections.get(message.peerId);
        if(connection) connection.emit("close");
        network.connections.delete(message.peerId);
      }
      if(message.type === "server-error") setNetworkStatus(`LAN ERROR // ${message.message}`, "error");
    };

    network.socket.onerror = () => setNetworkStatus("LAN SERVER UNREACHABLE // RUN NPM START", "error");
    network.socket.onclose = () => { if(network.role === "host") setNetworkStatus("LAN SERVER CLOSED", "error"); };
  }

  function joinLanRoom(id){
    const url = lanSocketUrl();
    if(!url){ setNetworkStatus("LAN NEEDS LOCAL SERVER // RUN NPM START", "error"); return; }
    disconnectNetwork();
    network.role = "client";
    network.roomId = id;
    setNetworkStatus(`CONNECTING TO LAN ROOM ${id}...`);
    network.socket = new WebSocket(url);

    network.socket.onopen = () => network.socket.send(JSON.stringify({ type: "join", room: id }));

    network.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if(message.type === "joined"){
        const connection = createLanAdapter(network.socket, "LAN-HOST", false);
        setupClientConnection(connection);
        connection.open = true;
        connection.emit("open");
        setNetworkStatus("CONNECTED TO LAN // ENTERING LOBBY", "good");
      }
      if(message.type === "data") network.connection && network.connection.emit("data", message.data);
      if(message.type === "server-error") setNetworkStatus(`LAN ERROR // ${message.message}`, "error");
    };

    network.socket.onerror = () => setNetworkStatus("LAN SERVER UNREACHABLE // OPEN THE LOCAL URL", "error");
    network.socket.onclose = () => { if(!game || game.onlineClient) setNetworkStatus("LAN SERVER CLOSED", "error"); };
  }

  function setupHostConnection(connection){
    connection.on("open",()=>{
      network.connections.set(connection.peer, connection);
    });

    connection.on("data",(message)=>{
      if(message.type === "join"){
        const name = cleanName(message.name);
        waitingPlayers.set(connection.peer, { name, connId: connection.peer });
        broadcastLobbyState();

        if(game && !game.over){
          assignRemotePlayer(connection, name);
        }
      }

      if(message.type === "name-change"){
        const clean = cleanName(message.name);
        const wp = waitingPlayers.get(connection.peer);
        if(wp){
          wp.name = clean;
          broadcastLobbyState();
        }
        if(game){
          const tank = game.tanks.find(t => t.connId === connection.peer);
          if(tank){
            tank.name = clean;
            broadcastState();
          }
        }
      }

      if(message.type === "rematch-request"){
        showToast(`${cleanName(message.name)} REQUESTED REMATCH!`, 2000);
      }

      if(message.type === "input" && game){
        const tank = game.tanks.find((item) => item.id === message.playerId && item.connId === connection.peer);
        if(tank) tank.input = message.input;
      }
    });

    connection.on("close",()=>{
      const tank = game && game.tanks.find((item) => item.connId === connection.peer);
      if(tank){
        tank.remote = false;
        tank.human = false;
        tank.connId = null;
        tank.input = { x: 0, y: 0, fire: false };
      }
      waitingPlayers.delete(connection.peer);
      network.connections.delete(connection.peer);
      broadcastLobbyState();
    });

    connection.on("error",()=>{
      waitingPlayers.delete(connection.peer);
      network.connections.delete(connection.peer);
      broadcastLobbyState();
    });
  }

  function setupClientConnection(connection){
    network.connection = connection;
    connection.on("open",()=>{
      connection.send({ type: "join", name: playerName() });
      setNetworkStatus("CONNECTED // WAITING FOR LOBBY UPDATE", "good");
    });
    connection.on("data",(message)=> handleClientMessage(message));
    connection.on("close",()=> setNetworkStatus("HOST CONNECTION LOST // RETURN TO LOBBY", "error"));
    connection.on("error",()=> setNetworkStatus("NETWORK ERROR // TRY AGAIN", "error"));
  }

  // Assign or dynamically spawn a tank for a remote player (up to 16 players)
  function assignRemotePlayer(connection, requestedName){
    if(!game) return;
    const cleanReqName = cleanName(requestedName);

    // 1. Check if this connection already has an assigned tank
    let tank = game.tanks.find(t => t.connId === connection.peer);

    // 2. If not, check for an available CPU bot tank
    if(!tank){
      tank = game.tanks.find(t => !t.human && t.id !== 0);
    }

    // 3. In FFA, dynamically spawn a new tank if under 16 total
    if(!tank && game.ffa && game.tanks.length < 16){
      const newId = game.tanks.length;
      const spawn = ffaSpawns[newId % ffaSpawns.length];
      const colorObj = ffaColors[newId % ffaColors.length];
      tank = makeTank(newId, `ffa_${newId}`, spawn, true, controls[0]);
      tank.ffaColor = colorObj.key;
      tank.angle = spawn.angle;
      game.tanks.push(tank);
    }

    if(!tank){
      connection.send({ type: "error", message: "Match is at maximum capacity (16 players)." });
      return;
    }

    tank.human = true;
    tank.remote = true;
    tank.connId = connection.peer;
    tank.name = cleanReqName;
    tank.input = { x: 0, y: 0, fire: false };

    connection.send({ type: "init", playerId: tank.id, snapshot: serializeGame() });
    showToast(`${tank.name} ENTERED THE BATTLE!`, 1600);
    broadcastState();
  }

  function serializeGame(){
    return {
      mode: game.mode,
      arena: game.arena,
      elapsed,
      ffa: game.ffa,
      targetKills: game.targetKills || 10,
      tanks: game.tanks.map((tank) => ({
        id: tank.id,
        team: tank.team,
        ffaColor: tank.ffaColor,
        x: tank.x,
        y: tank.y,
        angle: tank.angle,
        health: tank.health,
        alive: tank.alive,
        respawn: tank.respawn,
        human: tank.human,
        name: tank.name,
        kills: tank.kills
        ,rapidUntil: tank.rapidUntil || 0
        ,freezeUntil: tank.freezeUntil || 0
        ,speedUntil: tank.speedUntil || 0
      })),
      shells: game.shells.map((shell) => ({
        x: shell.x,
        y: shell.y,
        angle: shell.angle,
        team: shell.team,
        ownerId: shell.ownerId
      })),
      healthDrops: game.healthDrops,
      particles: game.particles.slice(-60).map((particle) => ({
        x: particle.x,
        y: particle.y,
        life: particle.life,
        size: particle.size,
        color: particle.color
      }))
    };
  }

  function broadcastState(){
    if(network.role !== "host" || !game) return;
    const snapshot = { type: "state", snapshot: serializeGame() };
    network.connections.forEach((connection) => {
      if(connection.open) connection.send(snapshot);
    });
  }

  function handleClientMessage(message){
    if(message.type === "lobby-state"){
      network.roomId = message.roomId || network.roomId;
      if(message.mode) { selectedMode = message.mode; updateLobbyMeta(); }
      if(message.arena) selectedArena = message.arena;
      renderWaitingRoom(message.players || [], false);
    }

    if(message.type === "init"){
      network.playerId = message.playerId;
      setRoomBadge(network.roomId);
      loadClientGame(message.snapshot);
      const myTank = game.tanks.find((t) => t.id === network.playerId);
      setNetworkStatus(`CONNECTED // YOU ARE ${myTank ? myTank.name : "DEPLOYED"}`, "good");
      showScreen("game");
      renderRoster();
      renderLegend();
      if(!animationId) animationId = requestAnimationFrame(loop);
    }

    if(message.type === "state" && game){
      applySnapshot(message.snapshot);
    }

    if(message.type === "finish"){
      finishMatch(message.winner, true);
    }

    if(message.type === "error"){
      setNetworkStatus(message.message, "error");
    }
  }

  function loadClientGame(snapshot){
    stopGame();
    game = {
      mode: snapshot.mode,
      arena: snapshot.arena,
      ffa: !!snapshot.ffa,
      targetKills: snapshot.targetKills || 10,
      tanks: [],
      shells: [],
      healthDrops: [],
      particles: [],
      winner: null,
      over: false,
      countdown: 0,
      onlineClient: true
    };
    applySnapshot(snapshot);
    matchStart = performance.now() - snapshot.elapsed * 1000;
    lastTime = performance.now();
    const data = modeData[snapshot.mode] || modeData.triple;
    $("matchLabel").textContent = `// ${data.label} / ${arenaData[snapshot.arena].label}`;
    $("arenaLabel").textContent = arenaData[snapshot.arena].label;
    const objLabel = $("objectiveLabel");
    if(objLabel) objLabel.textContent = game.ffa ? "FIRST TO 10 KILLS // RESPAWN ACTIVE" : "ELIMINATE ENEMY TEAM";
    $("arenaLayout").classList.toggle("is-ffa", game.ffa);
    $("goldTeam").classList.add("is-hidden");
  }

  function applySnapshot(snapshot){
    if(!game) return;
    game.mode = snapshot.mode;
    game.arena = snapshot.arena;
    game.ffa = !!snapshot.ffa;
    game.targetKills = snapshot.targetKills || 10;
    elapsed = snapshot.elapsed;

    game.tanks = snapshot.tanks.map((item) => ({
      ...item,
      r: 20,
      spawnX: item.x,
      spawnY: item.y,
      cool: 0,
      flash: 0,
      hit: 0,
      ffaColor: item.ffaColor || item.team,
      control: item.id === network.playerId ? controls[0] : controls[item.id] || controls[0],
      remote: item.id !== network.playerId
    }));
    game.shells = snapshot.shells.map((item) => ({ ...item, speed: 0, life: 0.2 }));
    game.healthDrops = snapshot.healthDrops || [];
    game.particles = snapshot.particles || [];
  }

  // ── Match Initialisation ──────────────────────────────────────────────────
  function startMatch(){ disconnectNetwork(); initializeMatch(false); }
  function startHostMatch(){ initializeMatch(true); }

  function initializeMatch(onlineHost){
    stopGame();
    const data = modeData[selectedMode] || modeData.triple;
    const isFFA = !!data.ffa;
    game = {
      mode: selectedMode,
      arena: selectedArena,
      humanOnly: selectedBattle === "local",
      ffa: isFFA,
      onlineHost,
      tanks: [],
      shells: [],
      healthDrops: [],
      nextDropAt: 20,
      particles: [],
      sparks: [],
      winner: null,
      over: false,
      countdown: 3,
      toast: null,
      targetKills: 10
    };

    if(isFFA){
      // Gather all human players: host + waiting remote players
      const humans = [{ name: playerName(), connId: null, isHost: true }];
      if(onlineHost){
        waitingPlayers.forEach(p => {
          humans.push({ name: p.name, connId: p.connId, isHost: false });
        });
      }

      // Populate up to 16 tanks (at least 6 bots if solo/few players)
      const totalTanks = Math.min(16, Math.max(humans.length, selectedBattle === "bots" ? 6 : humans.length));

      for(let i = 0; i < totalTanks; i++){
        const spawn = ffaSpawns[i % ffaSpawns.length];
        const isHuman = i < humans.length;
        const colorObj = ffaColors[i % ffaColors.length];
        const tank = makeTank(i, `ffa_${i}`, spawn, isHuman, controls[i] || controls[0]);
        tank.ffaColor = colorObj.key;
        tank.angle = spawn.angle;

        if(isHuman){
          const h = humans[i];
          tank.name = cleanName(h.name);
          if(!h.isHost && onlineHost){
            tank.remote = true;
            tank.connId = h.connId;
          }
        } else {
          tank.name = names[i % names.length] || `UNIT-${i+1}`;
          tank.remote = false;
        }
        game.tanks.push(tank);
      }

      // Deploy init payload to each connected player
      if(onlineHost && network.connections.size > 0){
        network.connections.forEach(connection => {
          const playerTank = game.tanks.find(t => t.connId === connection.peer);
          if(playerTank && connection.open){
            connection.send({
              type: "init",
              playerId: playerTank.id,
              snapshot: serializeGame()
            });
          }
        });
      }
    } else {
      // Duel or Squad (team mode)
      const teams = ["blue", "red"];
      let tankId = 0;
      for(const team of teams){
        const spawns = getSpawns(team, data.roster);
        for(let i = 0; i < data.roster; i++){
          const human = game.humanOnly ? true : tankId === 0;
          const tank = makeTank(tankId, team, spawns[i], human, controls[tankId] || controls[0]);
          tank.ffaColor = team;
          game.tanks.push(tank);
          tankId++;
        }
      }
      game.tanks[0].name = playerName();

      if(onlineHost && network.connections.size > 0){
        network.connections.forEach(connection => {
          const stored = waitingPlayers.get(connection.peer);
          assignRemotePlayer(connection, stored ? stored.name : "");
        });
      }
    }

    matchStart = performance.now();
    lastTime = matchStart;
    elapsed = 0;

    $("matchLabel").textContent = `// ${data.label} / ${arenaData[selectedArena].label}`;
    $("arenaLabel").textContent = arenaData[selectedArena].label;
    const objLabel = $("objectiveLabel");
    if(objLabel) objLabel.textContent = isFFA ? "FIRST TO 10 KILLS // RESPAWN ACTIVE" : "ELIMINATE ENEMY TEAM";
    $("arenaLayout").classList.toggle("is-ffa", isFFA);
    $("goldTeam").classList.add("is-hidden");

    setRoomBadge(onlineHost ? network.roomId : "");
    renderRoster();
    renderLegend();
    showScreen("game");

    $("countdown").classList.remove("is-hidden");
    $("countdown").textContent = "3";
    setTimeout(() => { if(game) $("countdown").textContent = "2"; }, 700);
    setTimeout(() => { if(game) $("countdown").textContent = "1"; }, 1400);
    setTimeout(() => {
      if(game){
        game.countdown = 0;
        $("countdown").classList.add("is-hidden");
        showToast(isFFA ? "LIVE // FREE FOR ALL — 10 KILLS TO WIN" : "LIVE // ELIMINATE ENEMY TEAM", 1900);
      }
    }, 2100);

    animationId = requestAnimationFrame(loop);
  }

  function stopGame(){
    if(animationId) cancelAnimationFrame(animationId);
    animationId = 0;
    game = null;
    keys.clear();
  }

  function getSpawns(team, count){
    const cx = team === "blue" ? 120 : W - 120;
    if(count === 1) return [{ x: cx, y: H / 2 }];
    const gap = count === 2 ? 170 : 125, start = H / 2 - ((count - 1) * gap) / 2;
    return Array.from({ length: count }, (_, i) => ({ x: cx, y: start + i * gap }));
  }

  function makeTank(index, team, spawn, human, control){
    const colorKey = ffaColors[index % ffaColors.length].key;
    const angle = spawn.angle !== undefined ? spawn.angle : (colorKey === "blue" ? 0 : Math.PI);
    return {
      id: index,
      team,
      ffaColor: colorKey,
      x: spawn.x,
      y: spawn.y,
      spawnX: spawn.x,
      spawnY: spawn.y,
      r: 20,
      angle,
      health: 100,
      alive: true,
      human,
      remote: false,
      connId: null,
      input: { x: 0, y: 0, fire: false },
      control,
      cool: 0,
      respawn: 0,
      flash: 0,
      kills: 0,
      hit: 0,
      rapidUntil: 0,
      freezeUntil: 0,
      speedUntil: 0,
      name: names[index % names.length] || `UNIT-${index + 1}`
    };
  }

  // ── Game Loop ─────────────────────────────────────────────────────────────
  function loop(now){
    if(!game) return;
    const dt = Math.min((now - lastTime) / 1000, 0.035);
    lastTime = now;

    if(!game.over && game.countdown === 0){
      if(game.onlineClient) sendClientInput();
      else {
        elapsed = (now - matchStart - 2100) / 1000;
        update(dt);
      }
    }

    draw();
    renderRoster();
    $("matchClock").textContent = formatTime(Math.max(0, elapsed));
    if(!game.over) animationId = requestAnimationFrame(loop);
  }

  function update(dt){
    if(elapsed >= game.nextDropAt){
      spawnHealthDrop();
      game.nextDropAt += 20;
    }

    for(const tank of game.tanks){
      if(!tank.alive){
        tank.respawn -= dt;
        // FFA and Squad respawn when timer runs out
        if(tank.respawn <= 0 && game.mode !== "duel"){
          respawnTank(tank);
        }
        continue;
      }

      tank.cool = Math.max(0, tank.cool - dt);
      tank.flash = Math.max(0, tank.flash - dt);
      tank.hit = Math.max(0, tank.hit - dt);
      const now = performance.now() / 1000;
      const frozen = (tank.freezeUntil || 0) > now;

      const intent = tank.remote ? tank.input : tank.human ? humanIntent(tank) : botIntent(tank, dt);
      if(tank.remote && Number.isFinite(intent.angle)) tank.angle = intent.angle;
      if(tank.human && !tank.remote && Number.isFinite(intent.angle)) tank.angle = intent.angle;

      if(frozen){ intent.x = 0; intent.y = 0; intent.fire = false; }
      if(intent.x || intent.y){
        const length = Math.hypot(intent.x, intent.y) || 1;
        const speed = (tank.human ? 165 : 128) * ((tank.speedUntil || 0) > now ? 2 : 1);
        tank.x += intent.x / length * speed * dt;
        tank.y += intent.y / length * speed * dt;
        if(!tank.human) tank.angle = Math.atan2(intent.y, intent.x);
        resolveTank(tank);
      }

      if(intent.fire && tank.cool <= 0) fireShell(tank);

      for(const drop of game.healthDrops){
        if(drop.active && Math.hypot(tank.x - drop.x, tank.y - drop.y) < tank.r + 13){
          drop.active = false;
          applyDrop(tank, drop);
        }
      }
    }

    for(const shell of game.shells){
      shell.x += Math.cos(shell.angle) * shell.speed * dt;
      shell.y += Math.sin(shell.angle) * shell.speed * dt;
      shell.life -= dt;
      if(shell.life <= 0 || shell.x < -20 || shell.x > W + 20 || shell.y < -20 || shell.y > H + 20) shell.dead = true;
      if(!shell.dead && hitWall(shell.x, shell.y, 4)){
        shell.dead = true;
        burst(shell.x, shell.y, "wall");
      }
      if(!shell.dead){
        for(const tank of game.tanks){
          if(!tank.alive) continue;
          // FFA: hit everyone except owner; Team mode: hit opposing team
          if(game.ffa){
            if(tank.id === shell.ownerId) continue;
          } else {
            if(tank.team === shell.team) continue;
          }
          if(Math.hypot(tank.x - shell.x, tank.y - shell.y) < tank.r + 5){
            damageTank(tank, shell);
            shell.dead = true;
            break;
          }
        }
      }
    }
    game.shells = game.shells.filter((shell) => !shell.dead);

    for(const particle of game.particles){
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      particle.vx *= 0.97;
      particle.vy *= 0.97;
    }
    game.particles = game.particles.filter((particle) => particle.life > 0);

    // Win condition check
    if(!game.over){
      if(game.ffa){
        // In FFA, first to targetKills wins (handled immediately in damageTank).
        // If 3 minutes pass (180s), highest kills wins!
        if(elapsed >= 180){
          const sorted = [...game.tanks].sort((a, b) => b.kills - a.kills);
          finishMatch(sorted[0].ffaColor);
        }
      } else {
        const livingTeams = [...new Set(game.tanks.filter((t) => t.alive).map((t) => t.team))];
        if(livingTeams.length <= 1) finishMatch(livingTeams[0] || "blue");
      }
    }

    if(game.onlineHost && performance.now() - network.broadcastTimer > 50){
      network.broadcastTimer = performance.now();
      broadcastState();
    }
  }

  function humanIntent(tank){
    const c = tank.control;
    const angle = mouse.active ? Math.atan2(mouse.y - tank.y, mouse.x - tank.x) : tank.angle;
    return {
      x: (keys.has(c.right) ? 1 : 0) - (keys.has(c.left) ? 1 : 0),
      y: (keys.has(c.down) ? 1 : 0) - (keys.has(c.up) ? 1 : 0),
      fire: mouse.down || keys.has(c.fire),
      angle
    };
  }

  function sendClientInput(){
    if(!network.connection || !network.connection.open || !game || network.playerId === null) return;
    const tank = game.tanks.find((item) => item.id === network.playerId);
    if(tank) network.connection.send({ type: "input", playerId: network.playerId, input: humanIntent(tank) });
  }

  function spawnHealthDrop(){
    for(let attempt = 0; attempt < 30; attempt++){
      const x = random(65, W - 65), y = random(65, H - 65);
      if(hitWall(x, y, 16) || game.healthDrops.some((drop) => drop.active && Math.hypot(drop.x - x, drop.y - y) < 80)) continue;
      const kind = ["health", "rapid", "freeze", "speed"][Math.floor(Math.random() * 4)];
      game.healthDrops.push({ x, y, kind, active: true });
      showToast(`${dropLabel(kind)} DEPLOYED`, 1400);
      return;
    }
  }

  function dropLabel(kind){ return ({ health: "REPAIR CELL // +38 HP", rapid: "OVERDRIVE // 2X FIRE RATE", freeze: "CRYO TRAP // FREEZE 3 SEC", speed: "BOOST CELL // 2X SPEED 10 SEC" })[kind] || "POWER-UP"; }
  function applyDrop(tank, drop){
    const now = performance.now() / 1000;
    if(drop.kind === "health") tank.health = Math.min(100, tank.health + 38);
    if(drop.kind === "rapid") tank.rapidUntil = now + 15;
    if(drop.kind === "freeze") tank.freezeUntil = now + 3;
    if(drop.kind === "speed") tank.speedUntil = now + 10;
    burst(drop.x, drop.y, drop.kind === "health" ? "heal" : "power");
    if(tank.human) showToast(`${tank.name} // ${dropLabel(drop.kind)} SECURED`, 1300);
  }

  function botIntent(tank, dt){
    const enemies = game.ffa
      ? game.tanks.filter((other) => other.id !== tank.id && other.alive)
      : game.tanks.filter((other) => other.team !== tank.team && other.alive);
    if(!enemies.length) return { x: 0, y: 0, fire: false };

    let target = enemies[0];
    for(const enemy of enemies){
      if(Math.hypot(enemy.x - tank.x, enemy.y - tank.y) < Math.hypot(target.x - tank.x, target.y - tank.y)) target = enemy;
    }
    const dx = target.x - tank.x, dy = target.y - tank.y, distance = Math.hypot(dx, dy);
    const orbit = Math.sin(performance.now() / 900 + tank.id) * 0.55;
    const moveX = dx / (distance || 1) - dy / (distance || 1) * orbit;
    const moveY = dy / (distance || 1) + dx / (distance || 1) * orbit;
    const fire = distance < 620 && Math.random() < dt * 1.8;
    return { x: distance > 265 ? moveX : -moveY * 0.7, y: distance > 265 ? moveY : moveX * 0.7, fire };
  }

  function resolveTank(tank){
    tank.x = clamp(tank.x, 28, W - 28);
    tank.y = clamp(tank.y, 28, H - 28);
    for(const wall of arenaData[game.arena].walls){
      const nearestX = clamp(tank.x, wall.x, wall.x + wall.w);
      const nearestY = clamp(tank.y, wall.y, wall.y + wall.h);
      const dx = tank.x - nearestX, dy = tank.y - nearestY, dist = Math.hypot(dx, dy);
      if(dist < tank.r){
        if(dist === 0){
          tank.x += tank.x < wall.x + wall.w / 2 ? -2 : 2;
        } else {
          tank.x += dx / dist * (tank.r - dist);
          tank.y += dy / dist * (tank.r - dist);
        }
      }
    }
    for(const other of game.tanks){
      if(other === tank || !other.alive) continue;
      const dx = tank.x - other.x, dy = tank.y - other.y, dist = Math.hypot(dx, dy), min = tank.r + other.r - 4;
      if(dist < min && dist > 0){
        const push = (min - dist) / 2;
        tank.x += dx / dist * push;
        tank.y += dy / dist * push;
      }
    }
  }

  function hitWall(x, y, radius){
    return arenaData[game.arena].walls.some((wall) => x + radius > wall.x && x - radius < wall.x + wall.w && y + radius > wall.y && y - radius < wall.y + wall.h);
  }

  function fireShell(tank){
    tank.cool = (tank.rapidUntil || 0) > performance.now() / 1000 ? 0.36 : 0.72;
    const muzzle = 29;
    game.shells.push({
      x: tank.x + Math.cos(tank.angle) * muzzle,
      y: tank.y + Math.sin(tank.angle) * muzzle,
      angle: tank.angle,
      speed: 510,
      life: 1.5,
      team: tank.team,
      ownerId: tank.id,
      owner: tank
    });
    tank.flash = 0.09;
    burst(tank.x + Math.cos(tank.angle) * 29, tank.y + Math.sin(tank.angle) * 29, "muzzle");
  }

  function damageTank(tank, shell){
    tank.health -= 34;
    tank.hit = 0.16;
    burst(shell.x, shell.y, "hit");

    if(tank.health <= 0){
      tank.health = 0;
      tank.alive = false;
      // In duel: 1-life elimination; In FFA and Squad: 2.2s respawn timer
      tank.respawn = selectedMode === "duel" ? 999 : 2.2;
      shell.owner.kills++;
      burst(tank.x, tank.y, "destroy");

      if(game.ffa){
        showToast(`${shell.owner.name} ELIMINATED ${tank.name} [${shell.owner.kills}/${game.targetKills || 10}]`, 1500);
        if(shell.owner.kills >= (game.targetKills || 10)){
          finishMatch(shell.owner.ffaColor);
        }
      } else {
        showToast(`${shell.owner.name} // TARGET DISABLED`, 1200);
      }
    }
  }

  function respawnTank(tank){
    tank.alive = true;
    tank.health = 100;

    // In FFA, pick spawn furthest from nearest live enemy
    if(game.ffa && ffaSpawns.length > 0){
      let bestSpot = ffaSpawns[Math.floor(Math.random() * ffaSpawns.length)];
      let maxMinDist = -1;
      ffaSpawns.forEach(pos => {
        let minDist = 999999;
        game.tanks.forEach(other => {
          if(other !== tank && other.alive){
            const d = Math.hypot(other.x - pos.x, other.y - pos.y);
            if(d < minDist) minDist = d;
          }
        });
        if(minDist > maxMinDist){
          maxMinDist = minDist;
          bestSpot = pos;
        }
      });
      tank.x = bestSpot.x;
      tank.y = bestSpot.y;
      tank.angle = bestSpot.angle;
    } else {
      tank.x = tank.spawnX + random(-18, 18);
      tank.y = tank.spawnY + random(-28, 28);
    }

    tank.cool = 0.35;
    tank.flash = 0.45;
    burst(tank.x, tank.y, "spawn");
    if(tank.human && (tank.id === network.playerId || (!game.onlineClient && tank.id === 0))){
      showToast("RE-DEPLOYED // SYSTEMS ONLINE", 1200);
    }
  }

  function burst(x, y, type){
    const palette = type === "hit" ? [colors.gold, "#fff5c2"]
      : type === "destroy" ? [colors.red, colors.gold, "#fff5c2"]
      : type === "heal" ? ["#8bf0a6", "#d8ffe2", "#fff"]
      : type === "power" ? ["#d88bff", "#ffe09a", "#fff"]
      : [colors.blue, colors.blueLight, "#fff"];
    const count = type === "destroy" ? 24 : type === "muzzle" ? 7 : 10;
    for(let i = 0; i < count; i++){
      const angle = random(0, TAU);
      const speed = type === "destroy" ? random(40, 160) : random(25, 95);
      game.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: random(0.18, type === "destroy" ? 0.85 : 0.42),
        size: random(1, type === "destroy" ? 4 : 2.5),
        color: palette[Math.floor(Math.random() * palette.length)]
      });
    }
  }

  function showToast(text, duration){
    if(!game) return;
    const toast = $("gameToast");
    if(!toast) return;
    toast.textContent = text;
    toast.classList.remove("is-hidden");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.add("is-hidden"), duration);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  function draw(){
    ctx.clearRect(0, 0, W, H);
    drawArena();
    for(const drop of game.healthDrops || []) drawHealthDrop(drop);
    for(const shell of game.shells) drawShell(shell);
    for(const tank of game.tanks) drawTank(tank);
    for(const particle of game.particles) drawParticle(particle);
  }

  function drawArena(){
    const arena = arenaData[game.arena];
    ctx.fillStyle = game.arena === "sandline" ? "#2a281f" : "#0c1b24";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.17;
    ctx.strokeStyle = game.arena === "sandline" ? "#d6ae67" : "#6a9da5";
    ctx.lineWidth = 1;
    for(let x = 0; x < W; x += 48){
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for(let y = 0; y < H; y += 48){
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(139, 240, 247, .27)";
    ctx.strokeRect(16, 16, W - 32, H - 32);

    for(const wall of arena.walls){
      ctx.fillStyle = "rgba(1, 8, 14, .45)";
      ctx.fillRect(wall.x + 7, wall.y + 8, wall.w, wall.h);
      ctx.fillStyle = arena.color;
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.strokeStyle = "rgba(185, 214, 211, .32)";
      ctx.strokeRect(wall.x + 0.5, wall.y + 0.5, wall.w - 1, wall.h - 1);
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = colors.ink;
      for(let x = wall.x + 16; x < wall.x + wall.w; x += 34){
        ctx.beginPath(); ctx.moveTo(x, wall.y); ctx.lineTo(x, wall.y + wall.h); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    const gradient = ctx.createRadialGradient(600, 350, 10, 600, 350, 280);
    gradient.addColorStop(0, "rgba(76, 200, 223, .09)");
    gradient.addColorStop(1, "rgba(76, 200, 223, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(180, 70, 840, 560);
  }

  function drawShell(shell){
    ctx.save();
    ctx.translate(shell.x, shell.y);
    ctx.rotate(shell.angle);
    ctx.fillStyle = "#fff4c2";
    ctx.shadowColor = colors.gold;
    ctx.shadowBlur = 12;
    ctx.fillRect(-7, -2, 14, 4);
    ctx.restore();
  }

  function drawHealthDrop(drop){
    if(!drop.active) return;
    const dropColors = { health: ["#8bf0a6", "#8bf0a6"], rapid: ["#efbd60", "#ffe09a"], freeze: ["#78cfff", "#c7f2ff"], speed: ["#d88bff", "#efc7ff"] };
    const palette = dropColors[drop.kind] || dropColors.health;
    const pulse = 1 + Math.sin(performance.now() / 180) * 0.08;
    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = palette[0];
    ctx.shadowBlur = 18;
    ctx.fillStyle = `${palette[0]}33`;
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.fill();
    ctx.strokeStyle = palette[0];
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.stroke();
    ctx.fillStyle = palette[1];
    if(drop.kind === "rapid"){ ctx.fillRect(-3, -8, 6, 16); ctx.fillRect(2, -8, 4, 7); }
    else if(drop.kind === "freeze"){ ctx.fillRect(-2, -8, 4, 16); ctx.fillRect(-8, -2, 16, 4); ctx.rotate(Math.PI / 4); ctx.fillRect(-2, -8, 4, 16); ctx.fillRect(-8, -2, 16, 4); }
    else if(drop.kind === "speed"){ ctx.beginPath(); ctx.moveTo(5, -9); ctx.lineTo(-7, 0); ctx.lineTo(0, 1); ctx.lineTo(-5, 9); ctx.lineTo(8, -1); ctx.lineTo(1, -2); ctx.closePath(); ctx.fill(); }
    else { ctx.fillRect(-3, -8, 6, 16); ctx.fillRect(-8, -3, 16, 6); }
    ctx.restore();
  }

  function drawParticle(particle){
    ctx.globalAlpha = clamp(particle.life * 3, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    ctx.globalAlpha = 1;
  }

  function drawTank(tank){
    const colorKey = tank.ffaColor || tank.team;
    const palette = teamColors[colorKey] || teamColors.blue;
    const primary = palette.primary, light = palette.light;

    if(!tank.alive){
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = primary;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.arc(tank.spawnX, tank.spawnY, 23, 0, TAU); ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.angle);
    if(tank.hit > 0) ctx.globalAlpha = 0.55;

    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(-19, -15, 40, 34);
    ctx.fillStyle = primary; ctx.fillRect(-18, -15, 36, 30);
    ctx.fillStyle = "#0a151e"; ctx.fillRect(-15, -12, 30, 5); ctx.fillRect(-15, 7, 30, 5);
    ctx.fillStyle = light; ctx.fillRect(-12, -10, 24, 3); ctx.fillRect(-12, 7, 24, 3);
    ctx.fillStyle = primary; ctx.fillRect(-9, -11, 18, 22);
    ctx.strokeStyle = "rgba(234,242,243,.45)"; ctx.lineWidth = 1; ctx.strokeRect(-9, -11, 18, 22);
    ctx.fillStyle = light; ctx.fillRect(3, -3, 26, 6);
    ctx.fillStyle = "#09131c"; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
    ctx.strokeStyle = light; ctx.stroke();
    ctx.fillStyle = light; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill();

    if(tank.flash > 0){
      ctx.fillStyle = "#fff1ad";
      ctx.shadowColor = colors.gold;
      ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(30, 0, 7 + tank.flash * 25, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // Overhead Health & Name Tag
    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.fillStyle = "rgba(3, 10, 17, .7)";
    ctx.fillRect(-24, -34, 48, 3);
    ctx.fillStyle = primary;
    ctx.fillRect(-24, -34, 48 * (tank.health / 100), 3);
    ctx.fillStyle = "rgba(234,242,243,.8)";
    ctx.font = "600 8px Space Grotesk";
    ctx.textAlign = "center";
    ctx.fillText(tank.name, 0, -39);

    const isSelf = game.onlineClient ? (tank.id === network.playerId) : (tank.id === 0);
    if(isSelf){
      ctx.fillStyle = light;
      ctx.font = "700 7px Space Grotesk";
      ctx.fillText("YOU", 0, 35);
    }
    ctx.restore();
  }

  // ── HUD & Sidebars ────────────────────────────────────────────────────────
  function renderRoster(){
    if(!game) return;

    if(game.ffa){
      // FREE FOR ALL MODE: Left is YOUR TANK, Right is LEADERBOARD
      const selfId = game.onlineClient ? network.playerId : 0;
      const myTank = game.tanks.find(t => t.id === selfId) || game.tanks[0];

      // Left Sidebar: YOUR UNIT
      const blueContainer = $("blueRoster");
      if(blueContainer && myTank){
        const myPalette = teamColors[myTank.ffaColor] || teamColors.blue;
        blueContainer.innerHTML = `
          <div class="roster-entry">
            <div class="roster-name">
              <span><i class="roster-dot" style="background:${myPalette.primary}"></i>${myTank.name}</span>
              <span class="status" style="color:${myPalette.primary}">${myTank.alive ? "ACTIVE" : `RESPAWN in ${Math.max(0, myTank.respawn).toFixed(1)}s`}</span>
            </div>
            <div class="health-track"><div class="health-fill" style="width:${myTank.health}%;background:${myPalette.primary}"></div></div>
          </div>
        `;
      }
      $("blueScore").textContent = `${myTank ? myTank.kills : 0} KILLS`;
      const blueHdr = $("blueTeamSidebar").querySelector(".team-header span");
      if(blueHdr) blueHdr.innerHTML = `<i class="team-dot" style="background:${(teamColors[myTank?.ffaColor]||teamColors.blue).primary}"></i> YOUR UNIT`;

      // Right Sidebar: LEADERBOARD sorted by kills
      const redContainer = $("redRoster");
      if(redContainer){
        redContainer.innerHTML = "";
        const sorted = [...game.tanks].sort((a, b) => b.kills - a.kills);
        sorted.forEach(tank => {
          const pal = teamColors[tank.ffaColor] || teamColors.blue;
          const isMe = tank.id === selfId;
          const entry = document.createElement("div");
          entry.className = `roster-entry${tank.alive ? "" : " is-dead"}`;
          entry.innerHTML = `
            <div class="roster-name">
              <span><i class="roster-dot" style="background:${pal.primary}"></i>${tank.name}</span>
              <span class="roster-kills">${tank.kills} K</span>
            </div>
            <div class="health-track"><div class="health-fill" style="width:${tank.health}%;background:${pal.primary}"></div></div>
            ${!tank.alive ? `<div class="roster-respawn">RESPAWN in ${Math.max(0, tank.respawn).toFixed(1)}s</div>` : ""}
          `;
          redContainer.appendChild(entry);
        });
      }
      $("redScore").textContent = "GOAL: 10";
      const redHdr = $("redTeamSidebar").querySelector(".team-header span");
      if(redHdr) redHdr.innerHTML = `<i class="team-dot" style="background:${colors.gold}"></i> LEADERBOARD`;
    } else {
      // TEAM MODES (Duel / Squad)
      ["blue", "red"].forEach((team) => {
        const container = $(team + "Roster");
        if(!container) return;
        container.innerHTML = "";
        game.tanks.filter((tank) => tank.team === team).forEach((tank) => {
          const entry = document.createElement("div");
          entry.className = `roster-entry${tank.alive ? "" : " is-dead"}`;
          entry.innerHTML = `<div class="roster-name"><span>${tank.name}</span><span class="status">${tank.alive ? (tank.human ? "YOU" : "CPU") : "DOWN"}</span></div><div class="health-track"><div class="health-fill" style="width:${tank.health}%"></div></div>`;
          container.appendChild(entry);
        });
      });
      $("blueScore").textContent = game.tanks.filter((tank) => tank.team === "blue" && !tank.alive).length;
      $("redScore").textContent = game.tanks.filter((tank) => tank.team === "red" && !tank.alive).length;
      const blueHdr = $("blueTeamSidebar").querySelector(".team-header span");
      if(blueHdr) blueHdr.innerHTML = `<i class="team-dot"></i> BLUE SQUAD`;
      const redHdr = $("redTeamSidebar").querySelector(".team-header span");
      if(redHdr) redHdr.innerHTML = `<i class="team-dot"></i> RED SQUAD`;
    }
  }

  function renderLegend(){
    if(!game) return;
    const active = game.tanks.filter((tank) => tank.human && (game.onlineClient ? tank.id === network.playerId : true));
    $("controlsLegend").innerHTML = active.map((tank) => `<span class="control-chip"><strong>${tank.name}</strong> <em>${tank.control.label}</em> MOVE / <em>${tank.control.fireLabel}</em> FIRE</span>`).join("");
  }

  // ── Match Finish ──────────────────────────────────────────────────────────
  function finishMatch(winner, fromNetwork = false){
    if(!game || game.over) return;
    game.over = true;
    game.winner = winner;

    if(game.onlineHost && !fromNetwork){
      network.connections.forEach((connection) => {
        if(connection.open) connection.send({ type: "finish", winner });
      });
    }

    const winnerTank = game.ffa
      ? game.tanks.find(t => t.ffaColor === winner)
      : null;

    const winningTanks = game.ffa
      ? (winnerTank ? [winnerTank] : [])
      : game.tanks.filter(t => t.team === winner);

    winningTanks.forEach(tank => {
      if(tank.alive) burst(tank.x, tank.y, "spawn");
    });

    setTimeout(() => {
      if(!game) return;
      const data = modeData[game.mode] || modeData.triple;
      const arena = arenaData[game.arena];

      if(game.ffa){
        const winnerName = winnerTank ? winnerTank.name : "ARENA CHAMPION";
        const winnerColor = winnerTank ? (teamColors[winnerTank.ffaColor] || teamColors.gold).primary : colors.gold;
        $("resultKicker").textContent = `VICTORY // ${winnerName}`;
        $("resultKicker").style.color = winnerColor;
        $("resultKicker").className = "result-kicker";
        $("resultTitle").textContent = "ARENA CHAMPION";
        $("resultSummary").textContent = `${winnerName} conquered the Free For All with ${winnerTank ? winnerTank.kills : 10} kills.`;
      } else {
        const winnerName = winner === "blue" ? "BLUE" : "RED";
        $("resultKicker").textContent = `${winnerName} SQUAD`;
        $("resultKicker").style.color = "";
        $("resultKicker").className = `result-kicker ${winner === "blue" ? "blue-text" : "red-text"}`;
        $("resultTitle").textContent = winner === "blue" ? "ARENA SECURED" : "LINE BROKEN";
        $("resultSummary").textContent = winner === "blue"
          ? "The opposition has been fully neutralized."
          : "Red command owns the battlefield. Rally and rematch.";
      }

      $("resultTime").textContent = formatTime(elapsed);
      $("resultMode").textContent = data.versus;
      $("resultArena").textContent = arena.label;

      if(selectedBattle === "online" && network.role === "client"){
        $("rematchButton").textContent = "WAITING FOR HOST...";
      } else {
        $("rematchButton").textContent = "REMATCH";
      }
      showScreen("results");
    }, 800);
  }
})();
