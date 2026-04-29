// ==UserScript==
// @name         Raven Tracker
// @namespace    http://tampermonkey.net/
// @version      0.0.2
// @description  Wyświetla listę graczy Raven na poziomie 114
// @author       Dracena
// @match        *.margonem.pl/*
// @grant        GM_xmlhttpRequest
// @connect      public-api.margonem.pl
// @connect      discord.com
// @updateURL    https://raw.githubusercontent.com/dracena351/margonem-addons/main/raven-tracker.user.js
// @downloadURL  https://raw.githubusercontent.com/dracena351/margonem-addons/main/raven-tracker.user.js
// ==/UserScript==
 
(function() {
    "use strict";
 
    const RAVEN_PLAYERS = [
      "Wilhelm Tell","Couch Lock","eter borderlajn","Donald John Trump","Oskarinho Senior","Bartosz Bartłomiej","Ahmed odpalaj",
      "Kathe","Sethalia","Riyou Reaper","Shadow x Hajer","Estamin I","Traps","Infame","Miła Mag","Taerion","skibidi kasza","Niliye",
      "Wariat nie człowiek","Stasiu Łodyga","Ptyś Morderca","Jęcząca Kindziola","Celka","Bibiowskyy","Nestie","Szefunio Neło","okno szyba",
      "Mr Deduś","Admirał Jachaś","Darenty","tonciu heparyna","Shemui","Narumii","Wojownik pod unik","Zabakane Oko","Sir Godin","Magua my beloved",
      "Baulus","Abby","Beraz","Cayero","Meffsky","Tatsuin","K a r p i u","Ofensywny Żuraw","Łysy Koxx","Pit stop","dwutonowy tir","M-ino-L","Aro The Bee",
      "Sevagoth","Furrina","Wolnyy","Tsubasa Hanekawa","chat gpt","Dark of Woriors","Vardagen","Los Badzioros","Zabawka Gucia","Żona Burmistrza","szalomka","Sotolii"
    ];
 
    const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1492564015287636082/Bk7WlAxDsYzuqcfByNOt0MWQ8ZAwE7U5eMHqqg-ubAzML76y67s5_twsPHDSLRn-JFL_";
    const WATCH_LEVEL = 114;
    const NOTIFICATION_THRESHOLD = 5;
 
    let lastSentCount = 0;
    let isDragging = false;
    let trackerX = parseFloat(localStorage.getItem("margonem-tracker-x")) || 0;
    let trackerY = parseFloat(localStorage.getItem("margonem-tracker-y")) || 0;
    let dragOffsetX = 0, dragOffsetY = 0;
    let notificationActive = false;
 
    // === Discord ===
 
    function sendDiscordNotification(players) {
        if (players.length < 3) return;
 
        const message = `💀 Raven 114 (${players.length}): ${players.map(p => p.n).join(", ")}`;
 
        GM_xmlhttpRequest({
            method: "POST",
            url: DISCORD_WEBHOOK,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({ content: message })
        });
    }
 
    // === Drag & Drop ===
 
    function onTrackerMouseDown(e) {
        if (e.target.tagName === "BUTTON" || e.target.closest("button")) return;
        const header = document.getElementById("tracker-header");
        if (header && header.contains(e.target)) {
            isDragging = true;
            const tracker = document.getElementById("player-tracker");
            const transform = window.getComputedStyle(tracker).transform;
            if (transform && transform !== "none") {
                const matrix = new DOMMatrix(transform);
                trackerX = matrix.m41;
                trackerY = matrix.m42;
            }
            dragOffsetX = e.clientX - trackerX;
            dragOffsetY = e.clientY - trackerY;
            tracker.classList.add("dragging");
            e.preventDefault();
        }
    }
 
    function onMouseMove(e) {
        if (isDragging) {
            e.preventDefault();
            trackerX = e.clientX - dragOffsetX;
            trackerY = e.clientY - dragOffsetY;
            const tracker = document.getElementById("player-tracker");
            tracker.style.setProperty("transform", `translate(${trackerX}px, ${trackerY}px)`, "important");
            tracker.style.transition = "none";
        }
    }
 
    function onMouseUp() {
        if (isDragging) {
            const tracker = document.getElementById("player-tracker");
            tracker.style.transition = "";
            tracker.classList.remove("dragging");
            localStorage.setItem("margonem-tracker-x", trackerX.toString());
            localStorage.setItem("margonem-tracker-y", trackerY.toString());
        }
        isDragging = false;
    }
 
    function resetPosition() {
        trackerX = 0;
        trackerY = 0;
        const tracker = document.getElementById("player-tracker");
        tracker.style.setProperty("transform", "translate(0px, 0px)", "important");
        localStorage.setItem("margonem-tracker-x", "0");
        localStorage.setItem("margonem-tracker-y", "0");
    }
 
    function checkTrackerPosition() {
        const tracker = document.getElementById("player-tracker");
        const rect = tracker.getBoundingClientRect();
        if (rect.right < 0 || rect.left > window.innerWidth ||
            rect.bottom < 0 || rect.top > window.innerHeight) {
            resetPosition();
        }
    }
 
    // === Notification pulse ===
 
    function updateNotification(hasManyPlayers) {
        const tracker = document.getElementById("player-tracker");
        if (hasManyPlayers && !notificationActive) {
            tracker.classList.add("notification-active");
            notificationActive = true;
        } else if (!hasManyPlayers && notificationActive) {
            tracker.classList.remove("notification-active");
            notificationActive = false;
        }
    }
 
    // === API fetch ===
 
    function fetchNCPlayers() {
        const refreshBtn = document.getElementById("refresh-btn");
        if (refreshBtn) refreshBtn.disabled = true;
 
        GM_xmlhttpRequest({
            method: "GET",
            url: "https://public-api.margonem.pl/info/online/tarhuna.json",
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache"
            },
            anonymous: true,
            onload: function(response) {
                if (refreshBtn) refreshBtn.disabled = false;
                try {
                    if (response.responseText.trim().startsWith("<")) {
                        throw new Error("Otrzymano HTML zamiast JSON");
                    }
 
                    const data = JSON.parse(response.responseText);
                    const players = data.filter(p =>
                        RAVEN_PLAYERS.includes(p.n) && p.l == WATCH_LEVEL
                    );
 
                    // Wyślij Discord tylko gdy zmieni się liczba graczy
                    if (players.length !== lastSentCount) {
                        sendDiscordNotification(players);
                        lastSentCount = players.length;
                    }
 
                    updateNotification(players.length >= NOTIFICATION_THRESHOLD);
                    renderContent(players);
 
                } catch (error) {
                    if (refreshBtn) refreshBtn.disabled = false;
                    console.error("Raven Tracker error:", error);
                    const content = document.getElementById("tracker-content");
                    content.innerHTML = `<div style="color:#e55;padding:4px 0;font-size:11px;">Błąd: ${error.message}</div>`;
                }
            },
            onerror: function() {
                if (refreshBtn) refreshBtn.disabled = false;
                document.getElementById("tracker-content").innerHTML =
                    '<div style="color:#e55;font-size:11px;">Błąd połączenia z API</div>';
            }
        });
    }
 
    // === Render ===
 
    function renderContent(players) {
        const content = document.getElementById("tracker-content");
        content.innerHTML = "";
 
        const row = document.createElement("div");
        row.style.cssText = "display:flex;gap:6px;margin-bottom:2px;align-items:flex-start;";
 
        const lbl = document.createElement("span");
        lbl.textContent = `${WATCH_LEVEL} (${players.length}):`;
        lbl.style.cssText = "color:#999;min-width:56px;white-space:nowrap;flex-shrink:0;";
 
        const names = document.createElement("span");
        names.style.cssText = "color:#fff;word-break:break-word;font-size:11px;";
        names.textContent = players.length > 0 ? players.map(p => p.n).join(", ") : "—";
        if (players.length === 0) names.style.color = "#555";
 
        row.appendChild(lbl);
        row.appendChild(names);
 
        const ts = document.createElement("div");
        ts.style.cssText = "color:#444;font-size:10px;margin-top:6px;";
        ts.textContent = new Date().toLocaleTimeString();
 
        content.appendChild(row);
        content.appendChild(ts);
    }
 
    // === UI Init ===
 
    function initUI() {
        const tracker = document.createElement("div");
        tracker.id = "player-tracker";
        tracker.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 240px;
            background: #1a1a1a;
            color: #ccc;
            border-radius: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 12px;
            border: 1px solid #333;
            overflow: hidden;
        `;
 
        const header = document.createElement("div");
        header.id = "tracker-header";
        header.style.cssText = `
            padding: 6px 10px;
            background: #222;
            cursor: move;
            user-select: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #333;
        `;
 
        const title = document.createElement("span");
        title.id = "tracker-title";
        title.textContent = `Raven Tracker 114`;
        title.style.cssText = "color:#eee;font-weight:600;font-size:12px;";
 
        const refreshBtn = document.createElement("button");
        refreshBtn.id = "refresh-btn";
        refreshBtn.innerHTML = "&#x21BB; Odśwież";
        refreshBtn.style.cssText = `
            background: #2d2d2d;
            color: #ccc;
            border: 1px solid #444;
            padding: 2px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-family: Arial, sans-serif;
        `;
        refreshBtn.onmouseover = () => refreshBtn.style.background = "#3a3a3a";
        refreshBtn.onmouseout = () => refreshBtn.style.background = "#2d2d2d";
 
        header.appendChild(title);
        header.appendChild(refreshBtn);
 
        const content = document.createElement("div");
        content.id = "tracker-content";
        content.style.cssText = `
            padding: 8px 10px;
            background: #1a1a1a;
            min-height: 40px;
        `;
        content.innerHTML = '<div style="color:#555;font-size:11px;">Ładowanie...</div>';
 
        tracker.appendChild(header);
        tracker.appendChild(content);
        document.body.appendChild(tracker);
 
        const style = document.createElement("style");
        style.textContent = `
            @keyframes alert-pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(255,69,58,0); border-color: #333; }
                50% { box-shadow: 0 0 8px 2px rgba(255,69,58,0.5); border-color: rgba(255,69,58,0.8); }
            }
            #player-tracker.notification-active { animation: alert-pulse 2s ease-in-out infinite; }
            #player-tracker.dragging { animation: none !important; }
        `;
        document.head.appendChild(style);
 
        header.addEventListener("mousedown", onTrackerMouseDown);
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        header.addEventListener("selectstart", e => e.preventDefault());
        refreshBtn.addEventListener("click", fetchNCPlayers);
        document.addEventListener("dblclick", function(e) {
            const h = document.getElementById("");
            if (h && h.contains(e.target)) resetPosition();
        });
    }
 
    window.addEventListener("load", function() {
        initUI();
 
        const tracker = document.getElementById("player-tracker");
        if (trackerX !== 0 || trackerY !== 0) {
            tracker.style.setProperty("transform", `translate(${trackerX}px, ${trackerY}px)`, "important");
        }
 
        checkTrackerPosition();
        fetchNCPlayers();
        setInterval(fetchNCPlayers, 300000);
    });
 
    window.addEventListener("resize", checkTrackerPosition);
 
})();
