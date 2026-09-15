// ============================================================
// Cesium Sandcastle - 6GB VRAM OPTIMIZED VERSION
// Google Photorealistic 3D Tiles + First-Person + Gamepad
// Hardware: 6GB VRAM / 64GB RAM
// Location: Messe München (Riem, Munich)
// ============================================================

console.log("=== Script Starting (6GB VRAM Optimized) ===");

// ==================== CONFIGURATION ====================
const CONFIG = {
  startPosition: {
    lon: 11.69012051487545,
    lat: 48.135516764631035,
    heightEllipsoidal: 615,   // ~565 m ground (ellipsoidal) + ~50 m AGL; tweak vertically here
    heading: 90,              // looking east
    pitch: -10,
    roll: 0
  },
  timeZone: "Europe/Berlin",
  locationLabel: "Messe München",
  performanceProfile: "6GB_VRAM",

  viewer: {
    targetFrameRate: 60,
  },

  // TUNED FOR 6GB VRAM - HIGH QUALITY
  tileset: {
    memoryMB: 2048,              // 2GB instead of 512MB
    maxSSE: 8.0,                 // LOWER for better quality (was 6.0)
    minSSE: 6.0,                 // LOWER (was 12.0)
    dynamicSSEDensity: 0.00028,  // Finer
    dynamicSSEFactor: 4.0,
    skipLOD: true,
    baseScreenSpaceError: 512,   // HALVED for detail (was 1024)
    skipScreenSpaceErrorFactor: 12, // Less skipping (was 16)
    skipLevels: 1,
    cullReqMultiplier: 8.0,      // Reduced for more tiles (was 10.0)
    foveatedConeSize: 0.2        // SMALLER for more detail (was 0.3)
  },

  controls: {
    baseMoveSpeed: 8.0,
    speedMultiplier: 4.0,
    mouseSensitivity: 0.005,
    gamepadMoveSpeed: 12.0,
    gamepadSensitivity: 0.05,
    gamepadDeadzone: 0.15,
    invertRightStickX: true,
    invertRightStickY: true
  },

  adaptive: {
    enabled: true,
    targetFPS: 55,
    targetFrameTime: 18,
    checkIntervalSec: 1.5,
    emaAlpha: 0.3,

    // QUALITY PRESETS for 6GB VRAM
    presets: {
      ultra: { sse: 2.0, resScale: 1.0, memoryMB: 2048 },   // BEST quality
      high: { sse: 4.0, resScale: 1.0, memoryMB: 2048 },    // Very good
      medium: { sse: 8.0, resScale: 0.95, memoryMB: 1536 }, // Good
      low: { sse: 16.0, resScale: 0.85, memoryMB: 1024 }    // Performance
    },

    thresholds: {
      ultra: { minFPS: 58, maxFrameTime: 17 },
      high: { minFPS: 52, maxFrameTime: 19 },
      medium: { minFPS: 45, maxFrameTime: 22 },
      low: { minFPS: 0, maxFrameTime: 999 }
    },

    hysteresisFPS: 3,
    hysteresisTime: 3000,

    sseStep: 0.5,
    resScaleStep: 0.05,
    minSSE: 1.5,
    maxSSE: 20.0,
    minResScale: 0.7,            // HIGHER (was 0.5)
    maxResScale: 1.0
  }
};

// ==================== UTILITY FUNCTIONS ====================
const Utils = {
  clamp: (val, min, max) => Math.max(min, Math.min(max, val)),
  applyDeadzone: (value, threshold) => Math.abs(value) < threshold ? 0 : value,
  formatTime: (h, m, s) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`,

  // Converts a JS Date instant into hours/minutes/seconds of the target time zone.
  // Uses Intl -> daylight saving time (CEST/CET) is handled automatically.
  toZonedHMS: (date, timeZone) => {
    const parts = new Intl.DateTimeFormat('de-DE', {
      timeZone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).formatToParts(date).reduce((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
    return {
      h: Number(parts.hour) % 24, // guard against '24' at midnight in some locales
      m: Number(parts.minute),
      s: Number(parts.second)
    };
  }
};

// ==================== SYSTEMS ====================

// Loading System
const LoadingSystem = {
  container: null,
  progressBar: null,
  statusText: null,

  create() {
    this.container = document.createElement("div");
    this.container.style.cssText = `
      position:absolute; top:0; left:0; width:100%; height:100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display:flex; align-items:center; justify-content:center; 
      z-index:10000; color:white; font-family:Arial,sans-serif;
      transition:opacity 0.5s;
    `;
    this.container.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:48px; margin-bottom:8px;">🚀</div>
        <h2 style="margin:6px 0;">High Performance Mode</h2>
        <p style="margin:6px 0; opacity:0.9;">6GB VRAM Optimized • Google 3D Tiles</p>
        <div style="width:320px; height:8px; background: rgba(255,255,255,0.2); border-radius:4px; margin:18px auto; overflow:hidden;">
          <div id="loading-progress-bar" style="width:0%; height:100%; background:white; transition:width 0.25s;"></div>
        </div>
        <p id="loading-status" style="font-size:14px; opacity:0.9;">Initializing...</p>
      </div>
    `;
    document.body.appendChild(this.container);
    this.progressBar = document.getElementById("loading-progress-bar");
    this.statusText = document.getElementById("loading-status");
    return this;
  },

  update(percent, status) {
    const pct = Utils.clamp(percent, 0, 100);
    if (this.progressBar) this.progressBar.style.width = `${pct}%`;
    if (this.statusText && status) this.statusText.textContent = status;
  },

  hide() {
    setTimeout(() => {
      if (this.container) this.container.style.opacity = "0";
      setTimeout(() => {
        if (this.container && this.container.remove) this.container.remove();
      }, 500);
    }, 500);
  }
};

// UI System
const UISystem = {
  elements: {},

  createBox({ top = null, bottom = null, left = null, right = null, minWidth = 120, id = null } = {}) {
    const el = document.createElement("div");
    if (id) el.id = id;
    el.style.cssText = `
      position:absolute; background:rgba(0,0,0,0.85); color:white;
      padding:10px; font-family:'Courier New',monospace; border-radius:8px;
      z-index:1000; min-width:${minWidth}px;
      ${top !== null ? `top:${top}px;` : ''}
      ${bottom !== null ? `bottom:${bottom}px;` : ''}
      ${left !== null ? `left:${left}px;` : ''}
      ${right !== null ? `right:${right}px;` : ''}
    `;
    document.body.appendChild(el);
    return el;
  },

  init() {
    // FPS Counter
    const fpsBox = this.createBox({ bottom: 10, right: 10, minWidth: 80, id: 'fps-box' });
    fpsBox.innerHTML = `
      <div style="font-size:11px;opacity:0.7;margin-bottom:2px;">FPS</div>
      <div id="fps-counter" style="font-size:28px;">--</div>
      <div id="frame-time" style="font-size:10px;opacity:0.6;margin-top:2px;">-- ms</div>
    `;
    this.elements.fpsCounter = document.getElementById("fps-counter");
    this.elements.frameTime = document.getElementById("frame-time");

    // Memory Display - NEW for 6GB version
    const memBox = this.createBox({ bottom: 10, right: 110, minWidth: 140, id: 'mem-box' });
    memBox.innerHTML = `
      <div style="font-size:11px;opacity:0.7;margin-bottom:2px;">VRAM</div>
      <div id="mem-counter" style="font-size:16px;">-- MB</div>
      <div id="mem-limit" style="font-size:9px;opacity:0.6;margin-top:2px;">Limit: 2048 MB</div>
    `;
    this.elements.memCounter = document.getElementById("mem-counter");
    this.elements.memLimit = document.getElementById("mem-limit");

    // Time Display
    const timeBox = this.createBox({ top: 10, left: 340, minWidth: 180, id: 'time-box' });
    timeBox.innerHTML = `
      <div style="font-size:12px;opacity:0.7;margin-bottom:3px;">München Local Time</div>
      <div id="current-time" style="font-size:24px;">--:--:--</div>
      <div id="time-period" style="font-size:11px;opacity:0.6;margin-top:3px;">--</div>
    `;
    this.elements.currentTime = document.getElementById("current-time");
    this.elements.timePeriod = document.getElementById("time-period");

    // Control Panel
    const panel = document.createElement("div");
    panel.style.cssText = `
      position:absolute; top:10px; left:10px; background:rgba(0,0,0,0.85);
      color:white; padding:15px; font-family:Arial,sans-serif; font-size:13px;
      border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.3); z-index:1000; width:320px;
    `;
    panel.innerHTML = `
      <strong style="color:#4FC3F7;font-size:15px;">📍 Messe München</strong><br>
      <span style="color:#4CAF50;font-size:11px;">🚀 ${CONFIG.performanceProfile} • HIGH Quality</span><br><br>
      <button id="toggle-fp-btn" style="width:100%;padding:10px;margin-bottom:10px;background:#4CAF50;color:white;border:none;border-radius:5px;cursor:pointer;font-weight:bold;font-size:14px;">🎮 Activate First-Person (C)</button>
      <button id="toggle-shadows-btn" style="width:100%;padding:10px;margin-bottom:10px;background:#FF5722;color:white;border:none;border-radius:5px;cursor:pointer;font-weight:bold;font-size:14px;">🌑 Disable Shadows (X)</button>
      <button id="cycle-quality-btn" style="width:100%;padding:10px;margin-bottom:10px;background:#9C27B0;color:white;border:none;border-radius:5px;cursor:pointer;font-weight:bold;font-size:14px;">🎚️ Quality: HIGH (Q)</button>
      <div id="mode-status" style="padding:8px;border-radius:3px;background:rgba(158,158,158,0.3);margin-bottom:8px;">
        <strong>Mode:</strong> <span id="mode-text">Normal</span>
      </div>
      <div id="gamepad-status" style="padding:8px;border-radius:3px;background:rgba(255,152,0,0.2);">
        <strong style="color:#FF9800;">🎮 No controller</strong>
        <button id="detect-gamepad-btn" style="float:right;padding:2px 8px;background:#2196F3;color:white;border:none;border-radius:3px;cursor:pointer;font-size:11px;">Detect</button>
      </div>
      <details style="margin-top:10px;">
        <summary style="cursor:pointer;font-weight:bold;">⌨️ Controls</summary>
        <div style="margin-left:10px;font-size:11px;line-height:1.6;margin-top:5px;">
          <strong>Keyboard:</strong><br>
          C - Toggle First-Person<br>
          X - Toggle Shadows<br>
          Q - Cycle Quality (ULTRA→HIGH→MED→LOW)<br>
          R - Reset to Auto Quality<br>
          P - Log camera pose (console)<br>
          WASD - Move<br>
          Q/E - Up/Down<br>
          Shift - Speed Boost<br><br>
          <strong>Controller:</strong><br>
          A - Toggle First-Person<br>
          X - Toggle Shadows<br>
          Left Stick - Move<br>
          Right Stick - Look<br>
          Triggers - Up/Down<br>
          B - Speed Boost
        </div>
      </details>
    `;
    document.body.appendChild(panel);

    this.elements.toggleFpBtn = document.getElementById("toggle-fp-btn");
    this.elements.toggleShadowsBtn = document.getElementById("toggle-shadows-btn");
    this.elements.cycleQualityBtn = document.getElementById("cycle-quality-btn");
    this.elements.modeStatus = document.getElementById("mode-status");
    this.elements.modeText = document.getElementById("mode-text");
    this.elements.gamepadStatus = document.getElementById("gamepad-status");
    this.elements.detectGamepadBtn = document.getElementById("detect-gamepad-btn");
  },

  updateFps(fps, frameTime) {
    if (this.elements.fpsCounter) {
      this.elements.fpsCounter.textContent = fps;
      const color = (fps >= 60) ? "#4CAF50" : (fps >= 45) ? "#FFC107" : "#f44336";
      this.elements.fpsCounter.style.color = color;
    }
    if (this.elements.frameTime && frameTime !== undefined) {
      this.elements.frameTime.textContent = `${frameTime.toFixed(1)} ms`;
    }
  },

  updateMemory(usedMB, limitMB) {
    if (this.elements.memCounter) {
      this.elements.memCounter.textContent = `${usedMB.toFixed(0)} MB`;
      const pct = (usedMB / limitMB) * 100;
      const color = (pct < 70) ? "#4CAF50" : (pct < 90) ? "#FFC107" : "#FF5722";
      this.elements.memCounter.style.color = color;
    }
  },

  updateTime(h, m, s) {
    if (this.elements.currentTime) {
      this.elements.currentTime.textContent = Utils.formatTime(h, m, s);
    }
    if (this.elements.timePeriod) {
      const period = (h >= 6 && h < 12) ? "🌅 Morning"
        : (h >= 12 && h < 17) ? "☀️ Afternoon"
        : (h >= 17 && h < 20) ? "🌆 Evening" : "🌙 Night";
      this.elements.timePeriod.textContent = period;
    }
  },

  updateQuality(quality, isManual) {
    console.log(`Quality: ${quality.toUpperCase()} (${isManual ? 'MANUAL' : 'AUTO'})`);

    if (this.elements.cycleQualityBtn) {
      this.elements.cycleQualityBtn.textContent = `🎚️ Quality: ${quality.toUpperCase()} (Q)`;
    }
  },

  updateSse(sse) {
    console.log(`SSE: ${sse.toFixed(2)}`);
  },

  updateResScale(scale) {
    console.log(`Resolution Scale: ${scale.toFixed(2)}x`);
  }
};

// FPS Monitor
const FPSMonitor = {
  frameCount: 0,
  lastUpdate: 0,
  lastFrameTime: 0,
  currentFPS: 0,
  currentFrameTime: 0,
  intervalId: null,
  callback: null,
  frameTimeCallback: null,

  start(fpsCallback, frameTimeCallback) {
    this.callback = fpsCallback;
    this.frameTimeCallback = frameTimeCallback;
    this.lastUpdate = performance.now();
    this.lastFrameTime = performance.now();
    this.frameCount = 0;

    this.intervalId = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - this.lastUpdate) / 1000.0;
      this.currentFPS = Math.round(this.frameCount / Math.max(elapsed, 1e-6));
      this.frameCount = 0;
      this.lastUpdate = now;

      UISystem.updateFps(this.currentFPS, this.currentFrameTime);
      if (this.callback) this.callback(this.currentFPS);
    }, 1000);
  },

  tick() { 
    this.frameCount++;

    const now = performance.now();
    this.currentFrameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    if (this.frameTimeCallback) {
      this.frameTimeCallback(this.currentFrameTime);
    }
  }
};

// Adaptive System
const AdaptiveSystem = {
  tileset: null,
  viewer: null,
  lastCheck: 0,
  lastQualityChange: 0,
  emaFps: CONFIG.adaptive.targetFPS,
  emaFrameTime: CONFIG.adaptive.targetFrameTime,
  samples: [],
  frameTimeSamples: [],
  currentQuality: 'high',
  manualOverride: false,

  init(tileset, viewer) {
    this.tileset = tileset;
    this.viewer = viewer;
    this.applyQualityPreset('high');  // Start at HIGH
  },

  pushSample(fps) {
    this.samples.push({ t: Date.now(), fps });
    const cutoff = Date.now() - 5000;
    while (this.samples.length && this.samples[0].t < cutoff) {
      this.samples.shift();
    }
  },

  pushFrameTime(frameTime) {
    this.frameTimeSamples.push({ t: Date.now(), ft: frameTime });
    const cutoff = Date.now() - 5000;
    while (this.frameTimeSamples.length && this.frameTimeSamples[0].t < cutoff) {
      this.frameTimeSamples.shift();
    }
  },

  getAverageFPS() {
    if (!this.samples.length) return this.emaFps;
    let sum = 0;
    this.samples.forEach(s => sum += s.fps);
    return sum / this.samples.length;
  },

  getAverageFrameTime() {
    if (!this.frameTimeSamples.length) return this.emaFrameTime;
    let sum = 0;
    this.frameTimeSamples.forEach(s => sum += s.ft);
    return sum / this.frameTimeSamples.length;
  },

  applyQualityPreset(quality) {
    if (!this.tileset || !this.viewer) return;

    const preset = CONFIG.adaptive.presets[quality];
    if (!preset) return;

    this.tileset.maximumScreenSpaceError = preset.sse;
    this.viewer.resolutionScale = preset.resScale;
    this.tileset.maximumMemoryUsage = preset.memoryMB;

    this.currentQuality = quality;
    this.lastQualityChange = Date.now();

    console.log(`Quality: ${quality.toUpperCase()} (SSE: ${preset.sse}, ResScale: ${preset.resScale}, Memory: ${preset.memoryMB}MB)`);

    this.updateUI();
  },

  determineOptimalQuality(avgFps, avgFrameTime) {
    const thresholds = CONFIG.adaptive.thresholds;

    if (avgFps >= thresholds.ultra.minFPS && avgFrameTime <= thresholds.ultra.maxFrameTime) {
      return 'ultra';
    } else if (avgFps >= thresholds.high.minFPS && avgFrameTime <= thresholds.high.maxFrameTime) {
      return 'high';
    } else if (avgFps >= thresholds.medium.minFPS && avgFrameTime <= thresholds.medium.maxFrameTime) {
      return 'medium';
    } else {
      return 'low';
    }
  },

  update() {
    if (!CONFIG.adaptive.enabled || !this.tileset || !this.viewer || this.manualOverride) return;

    const now = performance.now();
    if ((now - this.lastCheck) / 1000.0 < CONFIG.adaptive.checkIntervalSec) return;
    this.lastCheck = now;

    if (!this.samples.length) return;

    const avgFps = this.getAverageFPS();
    const avgFrameTime = this.getAverageFrameTime();

    this.emaFps = CONFIG.adaptive.emaAlpha * avgFps + (1 - CONFIG.adaptive.emaAlpha) * this.emaFps;
    this.emaFrameTime = CONFIG.adaptive.emaAlpha * avgFrameTime + (1 - CONFIG.adaptive.emaAlpha) * this.emaFrameTime;

    const optimalQuality = this.determineOptimalQuality(this.emaFps, this.emaFrameTime);

    if (optimalQuality !== this.currentQuality) {
      const timeSinceLastChange = Date.now() - this.lastQualityChange;

      const qualityLevels = ['low', 'medium', 'high', 'ultra'];
      const currentIdx = qualityLevels.indexOf(this.currentQuality);
      const optimalIdx = qualityLevels.indexOf(optimalQuality);

      const isUpgrade = optimalIdx > currentIdx;

      if (isUpgrade || timeSinceLastChange >= CONFIG.adaptive.hysteresisTime) {
        this.applyQualityPreset(optimalQuality);
      }
    } else {
      this.fineTune();
    }
  },

  fineTune() {
    const fpsDelta = CONFIG.adaptive.targetFPS - this.emaFps;

    if (Math.abs(fpsDelta) < CONFIG.adaptive.hysteresisFPS) return;

    const currentSse = this.tileset.maximumScreenSpaceError;
    const currentResScale = this.viewer.resolutionScale;

    let newSse = currentSse;
    let newResScale = currentResScale;

    if (this.emaFps < CONFIG.adaptive.targetFPS - CONFIG.adaptive.hysteresisFPS) {
      newSse = Math.min(currentSse + CONFIG.adaptive.sseStep, CONFIG.adaptive.maxSSE);
      if (currentSse > 10) {
        newResScale = Math.max(currentResScale - CONFIG.adaptive.resScaleStep, CONFIG.adaptive.minResScale);
      }
    } else if (this.emaFps > CONFIG.adaptive.targetFPS + CONFIG.adaptive.hysteresisFPS) {
      newSse = Math.max(currentSse - CONFIG.adaptive.sseStep, CONFIG.adaptive.minSSE);
      if (currentSse < 5 && currentResScale < CONFIG.adaptive.maxResScale) {
        newResScale = Math.min(currentResScale + CONFIG.adaptive.resScaleStep, CONFIG.adaptive.maxResScale);
      }
    }

    if (Math.abs(newSse - currentSse) >= 0.01) {
      this.tileset.maximumScreenSpaceError = newSse;
      UISystem.updateSse(newSse);
    }

    if (Math.abs(newResScale - currentResScale) >= 0.01) {
      this.viewer.resolutionScale = newResScale;
      UISystem.updateResScale(newResScale);
    }
  },

  setManualQuality(quality) {
    this.manualOverride = true;
    this.applyQualityPreset(quality);
  },

  enableAuto() {
    this.manualOverride = false;
    console.log("Adaptive quality: AUTO enabled");
    this.updateUI();
  },

  cycleQuality() {
    const qualities = ['low', 'medium', 'high', 'ultra'];
    const currentIdx = qualities.indexOf(this.currentQuality);
    const nextIdx = (currentIdx + 1) % qualities.length;
    this.setManualQuality(qualities[nextIdx]);
  },

  updateUI() {
    UISystem.updateQuality(this.currentQuality, this.manualOverride);
    if (this.tileset) {
      UISystem.updateSse(this.tileset.maximumScreenSpaceError);
    }
    if (this.viewer) {
      UISystem.updateResScale(this.viewer.resolutionScale);
    }
  }
};

// Input System
const InputSystem = {
  state: {
    moveForward: false, moveBackward: false, moveLeft: false, moveRight: false,
    moveUp: false, moveDown: false, firstPersonMode: false,
    moveSpeed: CONFIG.controls.baseMoveSpeed, heading: 0, pitch: 0
  },
  gamepad: { index: -1, lastButtonA: false, lastButtonX: false },
  camera: null,
  canvas: null,
  controller: null,

  init(camera, canvas, controller) {
    this.camera = camera;
    this.canvas = canvas;
    this.controller = controller;
    this.state.heading = camera.heading;
    this.state.pitch = camera.pitch;

    document.addEventListener("keydown", (e) => this.onKeyDown(e));
    document.addEventListener("keyup", (e) => this.onKeyUp(e));
    document.addEventListener("mousemove", (e) => this.onMouseMove(e));
    document.addEventListener("pointerlockchange", () => this.onPointerLockChange());

    this.setupGamepad();
  },

  onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (k === "c") { e.preventDefault(); this.toggleFirstPerson(); return; }
    if (k === "x") { e.preventDefault(); ShadowSystem.toggle(); return; }
    if (k === "q") { e.preventDefault(); AdaptiveSystem.cycleQuality(); return; }
    if (k === "r") { e.preventDefault(); AdaptiveSystem.enableAuto(); return; }
    if (k === "p") { e.preventDefault(); this.logCameraPose(); return; }
    if (!this.state.firstPersonMode) return;

    switch (k) {
      case "w": e.preventDefault(); this.state.moveForward = true; break;
      case "s": e.preventDefault(); this.state.moveBackward = true; break;
      case "a": e.preventDefault(); this.state.moveLeft = true; break;
      case "d": e.preventDefault(); this.state.moveRight = true; break;
      case "q": e.preventDefault(); this.state.moveUp = true; break;
      case "e": e.preventDefault(); this.state.moveDown = true; break;
    }
    if (e.shiftKey) this.state.moveSpeed = CONFIG.controls.baseMoveSpeed * CONFIG.controls.speedMultiplier;
  },

  onKeyUp(e) {
    const k = e.key.toLowerCase();
    switch (k) {
      case "w": this.state.moveForward = false; break;
      case "s": this.state.moveBackward = false; break;
      case "a": this.state.moveLeft = false; break;
      case "d": this.state.moveRight = false; break;
      case "q": this.state.moveUp = false; break;
      case "e": this.state.moveDown = false; break;
    }
    if (!e.shiftKey) this.state.moveSpeed = CONFIG.controls.baseMoveSpeed;
  },

  // Logs the current camera pose to the console, ready to paste into CONFIG.
  logCameraPose() {
    const c = this.camera;
    const carto = Cesium.Cartographic.fromCartesian(c.positionWC);
    const pose = {
      lon: +Cesium.Math.toDegrees(carto.longitude).toFixed(6),
      lat: +Cesium.Math.toDegrees(carto.latitude).toFixed(6),
      height: +carto.height.toFixed(1),
      heading: +Cesium.Math.toDegrees(c.heading).toFixed(1),
      pitch: +Cesium.Math.toDegrees(c.pitch).toFixed(1),
      roll: +Cesium.Math.toDegrees(c.roll).toFixed(1)
    };
    console.log("=== CAMERA POSE (press P) ===");
    console.log(`startPosition: { lon: ${pose.lon}, lat: ${pose.lat}, height: ${pose.height} },`);
    console.log(`orientation: heading=${pose.heading}  pitch=${pose.pitch}  roll=${pose.roll}`);
    console.log(JSON.stringify(pose, null, 2));
    return pose;
  },

  onMouseMove(e) {
    if (!this.state.firstPersonMode || document.pointerLockElement !== this.canvas) return;
    this.state.heading -= e.movementX * CONFIG.controls.mouseSensitivity;
    this.state.pitch -= e.movementY * CONFIG.controls.mouseSensitivity;
    this.state.pitch = Utils.clamp(this.state.pitch, -Math.PI/2, Math.PI/2);
    this.camera.setView({ orientation: { heading: this.state.heading, pitch: this.state.pitch, roll: 0 }});
  },

  onPointerLockChange() {
    if (!document.pointerLockElement && this.state.firstPersonMode) {
      this.state.firstPersonMode = false;
      this.setDefaultControls(true);
      this.updateUI();
    }
  },

  toggleFirstPerson() {
    this.state.firstPersonMode = !this.state.firstPersonMode;
    if (this.state.firstPersonMode) {
      this.setDefaultControls(false);
      this.state.heading = this.camera.heading;
      this.state.pitch = this.camera.pitch;
      try { this.canvas.requestPointerLock(); } catch(e) {}
    } else {
      this.setDefaultControls(true);
      if (document.pointerLockElement === this.canvas) {
        try { document.exitPointerLock(); } catch(e) {}
      }
    }
    this.updateUI();
  },

  setDefaultControls(enabled) {
    this.controller.enableRotate = enabled;
    this.controller.enableTranslate = enabled;
    this.controller.enableZoom = enabled;
    this.controller.enableTilt = enabled;
    this.controller.enableLook = enabled;
  },

  updateUI() {
    const { modeStatus, modeText, toggleFpBtn } = UISystem.elements;
    if (!modeStatus || !modeText || !toggleFpBtn) return;

    if (this.state.firstPersonMode) {
      modeStatus.style.background = "rgba(76,175,80,0.5)";
      modeText.textContent = "First-Person ✓";
      modeText.style.color = "#4CAF50";
      toggleFpBtn.textContent = "🚶 Exit First-Person";
      toggleFpBtn.style.background = "#f44336";
    } else {
      modeStatus.style.background = "rgba(158,158,158,0.3)";
      modeText.textContent = "Normal";
      modeText.style.color = "#9E9E9E";
      toggleFpBtn.textContent = "🎮 Activate First-Person (C)";
      toggleFpBtn.style.background = "#4CAF50";
    }
  },

  setupGamepad() {
    [100, 500, 1000].forEach(d => setTimeout(() => this.scanGamepads(), d));
    setInterval(() => this.scanGamepads(), 700);

    window.addEventListener("gamepadconnected", (e) => {
      this.gamepad.index = e.gamepad.index;
      this.updateGamepadUI();
    });
    window.addEventListener("gamepaddisconnected", () => {
      this.gamepad.index = -1;
      this.updateGamepadUI();
    });
  },

  scanGamepads() {
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    let found = false;
    for (let i = 0; i < gps.length; i++) {
      if (gps[i]) {
        if (this.gamepad.index !== i) this.gamepad.index = i;
        found = true;
        break;
      }
    }
    if (!found && this.gamepad.index !== -1) this.gamepad.index = -1;
    this.updateGamepadUI();
  },

  updateGamepadUI() {
    const { gamepadStatus } = UISystem.elements;
    if (!gamepadStatus) return;

    if (this.gamepad.index !== -1) {
      const gp = navigator.getGamepads()[this.gamepad.index];
      const name = gp ? gp.id.substring(0, 25) : "Controller";
      gamepadStatus.innerHTML = `<strong style="color:#4CAF50;">🎮 ${name}</strong>
        <button id="detect-gamepad-btn" style="float:right;padding:2px 8px;background:#4CAF50;color:#fff;border:none;border-radius:3px;font-size:11px;">Connected</button>`;
      gamepadStatus.style.background = "rgba(76,175,80,0.3)";
    } else {
      gamepadStatus.innerHTML = `<strong style="color:#FF9800;">🎮 No controller</strong>
        <button id="detect-gamepad-btn" style="float:right;padding:2px 8px;background:#2196F3;color:#fff;border:none;border-radius:3px;font-size:11px;">Detect</button>`;
      gamepadStatus.style.background = "rgba(255,152,0,0.2)";
    }

    const btn = document.getElementById("detect-gamepad-btn");
    if (btn) {
      btn.onclick = (e) => {
        e.preventDefault();
        this.scanGamepads();
        if (this.gamepad.index === -1) {
          alert("Press any button on controller, then click OK");
          setTimeout(() => this.scanGamepads(), 100);
        }
      };
    }
  },

  processGamepad() {
    if (this.gamepad.index === -1) return;
    const gps = navigator.getGamepads();
    const gp = gps[this.gamepad.index];
    if (!gp) { this.gamepad.index = -1; return; }

    const aPressed = gp.buttons[0] && gp.buttons[0].pressed;
    if (aPressed && !this.gamepad.lastButtonA) this.toggleFirstPerson();
    this.gamepad.lastButtonA = aPressed;

    const xPressed = gp.buttons[2] && gp.buttons[2].pressed;
    if (xPressed && !this.gamepad.lastButtonX) ShadowSystem.toggle();
    this.gamepad.lastButtonX = xPressed;

    if (!this.state.firstPersonMode) return;

    const leftX = Utils.applyDeadzone(gp.axes[0] || 0, CONFIG.controls.gamepadDeadzone);
    const leftY = Utils.applyDeadzone(gp.axes[1] || 0, CONFIG.controls.gamepadDeadzone);

    let rightX = Utils.applyDeadzone(gp.axes[2] || 0, CONFIG.controls.gamepadDeadzone);
    let rightY = Utils.applyDeadzone(gp.axes[3] || 0, CONFIG.controls.gamepadDeadzone);
    if (CONFIG.controls.invertRightStickX) rightX = -rightX;
    if (CONFIG.controls.invertRightStickY) rightY = -rightY;

    let leftTrig = 0, rightTrig = 0;
    if (gp.buttons[6]) leftTrig = gp.buttons[6].value;
    if (gp.buttons[7]) rightTrig = gp.buttons[7].value;

    const boost = (gp.buttons[1] && gp.buttons[1].pressed) ? CONFIG.controls.speedMultiplier : 1.0;

    if (leftY !== 0) this.camera.moveForward(-leftY * CONFIG.controls.gamepadMoveSpeed * boost);
    if (leftX !== 0) this.camera.moveRight(leftX * CONFIG.controls.gamepadMoveSpeed * boost);
    if (rightTrig > 0.05) this.camera.moveUp(rightTrig * CONFIG.controls.gamepadMoveSpeed * boost);
    if (leftTrig > 0.05) this.camera.moveDown(leftTrig * CONFIG.controls.gamepadMoveSpeed * boost);

    if (rightX !== 0 || rightY !== 0) {
      this.state.heading -= rightX * CONFIG.controls.gamepadSensitivity;
      this.state.pitch -= rightY * CONFIG.controls.gamepadSensitivity;
      this.state.pitch = Utils.clamp(this.state.pitch, -Math.PI/2, Math.PI/2);
      this.camera.setView({ orientation: { heading: this.state.heading, pitch: this.state.pitch, roll: 0 }});
    }
  },

  update() {
    this.processGamepad();
    if (!this.state.firstPersonMode) return;

    if (this.state.moveForward) this.camera.moveForward(this.state.moveSpeed);
    if (this.state.moveBackward) this.camera.moveBackward(this.state.moveSpeed);
    if (this.state.moveLeft) this.camera.moveLeft(this.state.moveSpeed);
    if (this.state.moveRight) this.camera.moveRight(this.state.moveSpeed);
    if (this.state.moveUp) this.camera.moveUp(this.state.moveSpeed);
    if (this.state.moveDown) this.camera.moveDown(this.state.moveSpeed);
  }
};

// Shadow System
const ShadowSystem = {
  enabled: true,  // Start with shadows ON
  viewer: null,
  scene: null,
  tileset: null,

  init(viewer, scene, tileset) {
    this.viewer = viewer;
    this.scene = scene;
    this.tileset = tileset;
  },

  toggle() {
    this.enabled = !this.enabled;
    this.viewer.shadows = this.enabled;
    this.viewer.terrainShadows = this.enabled ? Cesium.ShadowMode.ENABLED : Cesium.ShadowMode.DISABLED;
    if (this.scene.light) this.scene.light.intensity = this.enabled ? 2.0 : 0.5;
    if (this.tileset) {
      this.tileset.shadows = this.enabled ? Cesium.ShadowMode.ENABLED : Cesium.ShadowMode.DISABLED;
    }
    this.updateUI();
  },

  updateUI() {
    const btn = UISystem.elements.toggleShadowsBtn;
    if (!btn) return;
    if (this.enabled) {
      btn.textContent = "🌑 Disable Shadows (X)";
      btn.style.background = "#FF5722";
    } else {
      btn.textContent = "☀️ Enable Shadows (X)";
      btn.style.background = "#2196F3";
    }
  }
};

// ==================== MAIN APPLICATION ====================
(async function() {
  try {
    console.log("=== Starting Cesium (6GB VRAM Optimized) ===");

    // Create Viewer
    console.log("Creating viewer...");
    const viewer = new Cesium.Viewer("cesiumContainer", {
      timeline: true,
      animation: true,
      shadows: true,
      terrainShadows: Cesium.ShadowMode.ENABLED,
      targetFrameRate: CONFIG.viewer.targetFrameRate,
      useBrowserRecommendedResolution: false,
      msaaSamples: 2  // Increased for better quality
    });

    const scene = viewer.scene;
    const globe = scene.globe;
    const camera = viewer.camera;
    const canvas = scene.canvas;
    const controller = scene.screenSpaceCameraController;

    console.log("Viewer created successfully");

    // Increase GPU memory - IMPORTANT for 6GB VRAM
    if (scene.context && scene.context.cache) {
      scene.context.cache.maximumTextureMemoryUsage = 2048 * 1024 * 1024; // 2GB
      console.log("GPU Texture Cache: 2GB");
    }

    // Remove default imagery
    try { viewer.imageryLayers.removeAll(); } catch(e) {}

    // Configure globe
    globe.baseColor = Cesium.Color.fromCssColorString('#0a0a0a');
    globe.enableLighting = true;
    globe.dynamicAtmosphereLighting = true;
    globe.showGroundAtmosphere = true;  // ON for better visuals
    globe.tileCacheSize = 1000;         // INCREASED - uses 64GB RAM
    globe.maximumScreenSpaceError = 2;  // LOWER

    scene.skyAtmosphere.show = true;
    scene.highDynamicRange = true;
    scene.fxaa = true;
    scene.fog.enabled = true;
    scene.fog.density = 0.0001;  // Reduced

    // Loading screen
    const loadingScreen = LoadingSystem.create();
    loadingScreen.update(10, "Loading Google 3D Tiles (HIGH quality)...");

    // Configure skybox
    scene.skyBox = new Cesium.SkyBox({
      sources: {
        positiveX: 'https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_px.jpg',
        negativeX: 'https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_mx.jpg',
        positiveY: 'https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_py.jpg',
        negativeY: 'https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_my.jpg',
        positiveZ: 'https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_pz.jpg',
        negativeZ: 'https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_mz.jpg'
      }
    });

    scene.sun = new Cesium.Sun();
    scene.moon = new Cesium.Moon();
    scene.light = new Cesium.SunLight();
    scene.light.intensity = 2.0;  // INCREASED for shadows

    // Configure clock
    const start = Cesium.JulianDate.now();
    const stop = Cesium.JulianDate.addHours(start, 24, new Cesium.JulianDate());
    viewer.clock.startTime = start.clone();
    viewer.clock.stopTime = stop.clone();
    viewer.clock.currentTime = start.clone();
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 600;

    // Load Google 3D Tiles
    console.log("Loading Google Photorealistic 3D Tiles...");
    loadingScreen.update(30, "Creating tileset...");

    const tileset = await Cesium.createGooglePhotorealistic3DTileset({
      onlyUsingWithGoogleGeocoder: true
    });

    console.log("Tileset loaded");
    loadingScreen.update(60, "Optimizing for 6GB VRAM...");

    scene.primitives.add(tileset);

    // Configure tileset - TUNED FOR 6GB VRAM
    tileset.maximumScreenSpaceError = CONFIG.tileset.maxSSE;
    tileset.dynamicScreenSpaceError = true;
    tileset.dynamicScreenSpaceErrorDensity = CONFIG.tileset.dynamicSSEDensity;
    tileset.dynamicScreenSpaceErrorFactor = CONFIG.tileset.dynamicSSEFactor;
    tileset.skipLevelOfDetail = CONFIG.tileset.skipLOD;
    tileset.baseScreenSpaceError = CONFIG.tileset.baseScreenSpaceError;
    tileset.skipScreenSpaceErrorFactor = CONFIG.tileset.skipScreenSpaceErrorFactor;
    tileset.skipLevels = CONFIG.tileset.skipLevels;
    tileset.maximumMemoryUsage = CONFIG.tileset.memoryMB;
    tileset.cullWithChildrenBounds = true;
    tileset.cullRequestsWhileMoving = true;
    tileset.cullRequestsWhileMovingMultiplier = CONFIG.tileset.cullReqMultiplier;
    tileset.foveatedScreenSpaceError = true;
    tileset.foveatedConeSize = CONFIG.tileset.foveatedConeSize;
    tileset.shadows = Cesium.ShadowMode.ENABLED;

    // Enable aggressive preloading
    tileset.preloadWhenHidden = true;
    tileset.preloadFlightDestinations = true;
    tileset.immediatelyLoadDesiredLevelOfDetail = true;

    loadingScreen.update(90, "Finalizing...");
    console.log("Tileset configured for 6GB VRAM");
    console.log("Memory: 2GB, SSE: " + CONFIG.tileset.maxSSE);

    // Set camera position.
    // NOTE: fromDegrees height is ELLIPSOIDAL, not above-ground. Ground at the Messe
    // (Riem) sits at ~565 m ellipsoidal, so heightEllipsoidal ≈ ground + desired AGL.
    // Done synchronously (no runtime terrain sampling) so the view never jumps after load.
    camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        CONFIG.startPosition.lon,
        CONFIG.startPosition.lat,
        CONFIG.startPosition.heightEllipsoidal
      ),
      orientation: {
        heading: Cesium.Math.toRadians(CONFIG.startPosition.heading),
        pitch: Cesium.Math.toRadians(CONFIG.startPosition.pitch),
        roll: Cesium.Math.toRadians(CONFIG.startPosition.roll)
      }
    });

    // Initialize systems
    console.log("Initializing systems...");
    UISystem.init();
    InputSystem.init(camera, canvas, controller);
    ShadowSystem.init(viewer, scene, tileset);
    AdaptiveSystem.init(tileset, viewer);

    FPSMonitor.start(
      (fps) => AdaptiveSystem.pushSample(fps),
      (frameTime) => AdaptiveSystem.pushFrameTime(frameTime)
    );

    // Setup button handlers
    if (UISystem.elements.toggleFpBtn) {
      UISystem.elements.toggleFpBtn.onclick = () => InputSystem.toggleFirstPerson();
    }
    if (UISystem.elements.toggleShadowsBtn) {
      UISystem.elements.toggleShadowsBtn.onclick = () => ShadowSystem.toggle();
    }
    if (UISystem.elements.cycleQualityBtn) {
      UISystem.elements.cycleQualityBtn.onclick = () => AdaptiveSystem.cycleQuality();
    }

    // Setup loops
    scene.postRender.addEventListener(() => FPSMonitor.tick());

    viewer.clock.onTick.addEventListener(() => {
      InputSystem.update();
      AdaptiveSystem.update();

      const ct = viewer.clock.currentTime;
      const d = Cesium.JulianDate.toDate(ct);
      // Munich local time (Europe/Berlin) incl. correct daylight saving time
      const local = Utils.toZonedHMS(d, CONFIG.timeZone);
      UISystem.updateTime(local.h, local.m, local.s);

      // Update memory display
      if (tileset && tileset.statistics) {
        const stats = tileset.statistics;
        const usedBytes = stats.geometryByteLength + stats.texturesByteLength;
        const usedMB = usedBytes / (1024 * 1024);
        UISystem.updateMemory(usedMB, CONFIG.tileset.memoryMB);
      }
    });

    loadingScreen.update(100, "Ready!");
    loadingScreen.hide();

    console.log("=== Application Ready (6GB VRAM Mode) ===");
    console.log("Expected FPS: 50-55 (HIGH), 40-50 (ULTRA)");
    console.log("Press Q to cycle: ULTRA → HIGH → MEDIUM → LOW");
    console.log("Press X to toggle shadows");
    console.log("Press C for first-person mode");

    window.__cesium = { viewer, tileset, InputSystem, ShadowSystem, CONFIG };

  } catch (error) {
    console.error("=== ERROR ===");
    console.error("Message:", error?.message);
    console.error("Stack:", error?.stack);
    alert("Error: " + (error?.message || "Unknown"));
  }
})();