// ==UserScript==
// @name         KP Tracker
// @namespace    http://tampermonkey.net/
// @version      2.1.1
// @description  Wyświetla listę graczy KP na 64 i 83
// @author       Dracena
// @match        *.margonem.pl/*
// @grant        GM_xmlhttpRequest
// @connect      public-api.margonem.pl
// @connect discord.com
// @updateURL    https://raw.githubusercontent.com/dracena351/margonem-addons/main/kptracker.user.js
// @downloadURL  https://raw.githubusercontent.com/dracena351/margonem-addons/main/kptracker.user.js
// ==/UserScript==


(function() {
    "use strict";
 
    let isDragging = false;
    let trackerX = parseFloat(localStorage.getItem("margonem-tracker-x")) || 0;
    let trackerY = parseFloat(localStorage.getItem("margonem-tracker-y")) || 0;
    let dragOffsetX = 0, dragOffsetY = 0;
 
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
        title.textContent = "KP Tracker";
        title.style.cssText = "color:#eee;font-weight:600;font-size:12px;";
 
        header.appendChild(title);
 
        const content = document.createElement("div");
        content.id = "tracker-content";
        content.style.cssText = `
            padding: 8px 10px;
            background: #1a1a1a;
            min-height: 40px;
        `;
        content.innerHTML = '<div style="color:#e55;font-size:11px;">01001110 01101111 00100000 01100001 01100011 01100011 01100101 01110011 01110011</div>';
 
        tracker.appendChild(header);
        tracker.appendChild(content);
        document.body.appendChild(tracker);
 
        const style = document.createElement("style");
        style.textContent = `
            #player-tracker.dragging { animation: none !important; }
        `;
        document.head.appendChild(style);
 
        header.addEventListener("mousedown", onTrackerMouseDown);
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        header.addEventListener("selectstart", e => e.preventDefault());
 
        document.addEventListener("dblclick", function(e) {
            const h = document.getElementById("tracker-header");
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
    });
 
    window.addEventListener("resize", checkTrackerPosition);
 
})();
