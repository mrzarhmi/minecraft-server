/**
 * Mija's Minecraft Servers — Dedicated Server Hub Engine
 * Pure Vanilla JavaScript (ES6+)
 */

document.addEventListener("DOMContentLoaded", () => {
    initThemeManager();
    initAudioSynthesizer();
    initParticleCanvas();
    initClipboardCopy();
    initServerStatusTracker();
    initDynamicYear();
    initModpackTabs();
    initScreenshotLightbox();
    initTutorialClipboard();
});

/* ==========================================================================
   1. Theme Management (Shared with Portal via localStorage: 'mr_theme')
   ========================================================================== */
function initThemeManager() {
    const themeToggleBtn = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");
    const htmlRoot = document.documentElement;

    function applyTheme(theme) {
        htmlRoot.setAttribute("data-theme", theme);
        const isDark = theme === "dark";
        if (themeIcon) {
            themeIcon.textContent = isDark ? "☀️" : "🌙";
            themeIcon.setAttribute("title", isDark ? "Switch to Light Mode" : "Switch to Dark Mode");
        }
        localStorage.setItem("mr_theme", theme);
    }

    const savedTheme = localStorage.getItem("mr_theme") || "dark";
    applyTheme(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            const currentTheme = htmlRoot.getAttribute("data-theme") || "dark";
            const nextTheme = currentTheme === "dark" ? "light" : "dark";
            applyTheme(nextTheme);

            if (window.soundFX && window.soundFX.enabled) {
                window.soundFX.playTone(520, "sine", 0.08);
            }
        });
    }
}

/* ==========================================================================
   2. Web Audio API Sound Synthesizer (Zero External Dependencies)
   ========================================================================== */
function initAudioSynthesizer() {
    const soundToggleBtn = document.getElementById("sound-toggle");
    const soundIcon = document.getElementById("sound-icon");
    let audioCtx = null;

    const savedSound = localStorage.getItem("mr_sound");
    let isSoundEnabled = savedSound === null ? true : savedSound === "true";

    function updateSoundUI(enabled) {
        if (soundIcon) soundIcon.textContent = enabled ? "🔊" : "🔇";
        if (soundToggleBtn) {
            soundToggleBtn.setAttribute(
                "title",
                enabled ? "Disable UI Sound Effects" : "Enable UI Sound Effects"
            );
        }
    }

    updateSoundUI(isSoundEnabled);

    function getAudioContext() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function unlockAudio() {
        if (isSoundEnabled) getAudioContext();
        window.removeEventListener("pointerdown", unlockAudio);
        window.removeEventListener("keydown", unlockAudio);
    }
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    window.soundFX = {
        get enabled() {
            return isSoundEnabled;
        },
        playTone(freq = 440, type = "sine", duration = 0.08, gainVol = 0.05) {
            if (!isSoundEnabled) return;
            try {
                const ctx = getAudioContext();
                if (!ctx) return;

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(freq, ctx.currentTime);

                gain.gain.setValueAtTime(gainVol, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start();
                osc.stop(ctx.currentTime + duration);
            } catch (err) {
                console.debug("Audio play silenced:", err);
            }
        },
    };

    if (soundToggleBtn) {
        soundToggleBtn.addEventListener("click", () => {
            isSoundEnabled = !isSoundEnabled;
            localStorage.setItem("mr_sound", String(isSoundEnabled));
            updateSoundUI(isSoundEnabled);

            if (isSoundEnabled) {
                getAudioContext();
                window.soundFX.playTone(660, "triangle", 0.12, 0.08);
            }
        });
    }
}

/* ==========================================================================
   3. Interactive Emerald & Nether Ambient Particle Canvas
   ========================================================================== */
function initParticleCanvas() {
    const canvas = document.getElementById("ambient-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener("resize", () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const mouse = { x: null, y: null, radius: 140 };
    window.addEventListener("mousemove", (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    window.addEventListener("mouseleave", () => {
        mouse.x = null;
        mouse.y = null;
    });

    const particles = [];
    const count = Math.min(Math.floor((width * height) / 18000), 65);

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 2 + 1;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.density = Math.random() * 20 + 10;
            const colors = [
                "rgba(52, 211, 153, ",   // Emerald
                "rgba(168, 85, 247, ",   // Nether Purple
                "rgba(56, 189, 248, ",   // Cyan
            ];
            this.baseColor = colors[Math.floor(Math.random() * colors.length)];
            this.alpha = Math.random() * 0.45 + 0.2;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.baseColor + this.alpha + ")";
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.baseColor + "0.6)";
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;

            if (mouse.x !== null && mouse.y !== null) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.hypot(dx, dy);

                if (distance < mouse.radius) {
                    const force = (mouse.radius - distance) / mouse.radius;
                    const dirX = (dx / distance) * force * this.density * 0.25;
                    const dirY = (dy / distance) * force * this.density * 0.25;
                    this.x -= dirX;
                    this.y -= dirY;
                }
            }
        }
    }

    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach((p) => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animate);
    }
    animate();
}

/* ==========================================================================
   4. Clipboard Copy System with Visual & Audio Feedback
   ========================================================================== */
function initClipboardCopy() {
    const SERVER_ADDRESS = "mija.ddns.net";

    function copyToClipboard(triggerBtn, labelElem, defaultText = "Copy") {
        function triggerSuccess() {
            if (labelElem) labelElem.textContent = "Copied! ✓";
            if (triggerBtn) triggerBtn.classList.add("copied");

            if (window.soundFX && window.soundFX.enabled) {
                window.soundFX.playTone(880, "sine", 0.12, 0.08);
            }

            setTimeout(() => {
                if (labelElem) labelElem.textContent = defaultText;
                if (triggerBtn) triggerBtn.classList.remove("copied");
            }, 2200);
        }

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(SERVER_ADDRESS).then(triggerSuccess).catch(() => {
                fallbackCopy(triggerSuccess);
            });
        } else {
            fallbackCopy(triggerSuccess);
        }
    }

    function fallbackCopy(onSuccess) {
        try {
            const input = document.createElement("input");
            input.value = SERVER_ADDRESS;
            input.style.position = "fixed";
            input.style.opacity = "0";
            document.body.appendChild(input);
            input.select();
            document.execCommand("copy");
            document.body.removeChild(input);
        } catch (e) {
            console.warn("Fallback copy failed:", e);
        }
        if (onSuccess) onSuccess();
    }

    // Hero Copy Button & Box
    const heroBtn = document.getElementById("btn-copy-hero-ip");
    const heroBox = document.getElementById("hero-ip-box");
    const heroLabel = document.getElementById("hero-copy-text");

    if (heroBtn) {
        heroBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            copyToClipboard(heroBtn, heroLabel, "Copy Server IP");
        });
    }
    if (heroBox) {
        heroBox.addEventListener("click", () => {
            copyToClipboard(heroBtn, heroLabel, "Copy Server IP");
        });
        heroBox.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                copyToClipboard(heroBtn, heroLabel, "Copy Server IP");
            }
        });
    }

    // How to Join Step Copy
    const stepCopyBox = document.getElementById("step-copy-box");
    const stepBadge = document.getElementById("step-copy-badge");
    if (stepCopyBox) {
        stepCopyBox.addEventListener("click", () => {
            copyToClipboard(stepBadge, stepBadge, "Copy");
        });
        stepCopyBox.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                copyToClipboard(stepBadge, stepBadge, "Copy");
            }
        });
    }

    // CTA Bottom Banner Copy
    const ctaCopyBox = document.getElementById("cta-copy-box");
    const ctaBtn = document.getElementById("btn-cta-copy");
    const ctaLabel = document.getElementById("cta-copy-label");
    if (ctaBtn) {
        ctaBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            copyToClipboard(ctaBtn, ctaLabel, "Copy IP");
        });
    }
    if (ctaCopyBox) {
        ctaCopyBox.addEventListener("click", () => {
            copyToClipboard(ctaBtn, ctaLabel, "Copy IP");
        });
        ctaCopyBox.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                copyToClipboard(ctaBtn, ctaLabel, "Copy IP");
            }
        });
    }
}

/* ==========================================================================
   5. Real-Time Server Diagnostic Status & Player Roster Engine
   ========================================================================== */
function initServerStatusTracker() {
    const SERVER_ADDRESS = "mija.ddns.net";

    // Header Elements
    const headerPill = document.getElementById("header-status-pill");
    const headerDot = document.getElementById("header-dot");
    const headerStatusText = document.getElementById("header-status-text");
    const headerPlayerCount = document.getElementById("header-player-count");

    // Hero Elements
    const heroDot = document.getElementById("hero-dot");
    const heroStatusLabel = document.getElementById("hero-status-label");
    const heroVersionPill = document.getElementById("hero-version-pill");
    const heroPlayersInfo = document.getElementById("hero-players-info");

    // Diagnostic Elements
    const diagDot = document.getElementById("diag-dot");
    const diagStatusText = document.getElementById("diag-status-text");
    const diagPlayerFraction = document.getElementById("diag-player-fraction");
    const diagVersionText = document.getElementById("diag-version-text");
    const capacityPercentage = document.getElementById("capacity-percentage");
    const capacityFill = document.getElementById("capacity-fill");
    const diagMotdContent = document.getElementById("diag-motd-content");
    const lastUpdatedText = document.getElementById("last-updated-text");

    // Player List Elements
    const playersContainer = document.getElementById("players-container");
    const panelPlayerCountPill = document.getElementById("panel-player-count-pill");

    // Manual Refresh Button
    const refreshBtn = document.getElementById("btn-manual-refresh");
    let isFetching = false;

    async function fetchServerStatus() {
        if (isFetching) return;
        isFetching = true;

        if (refreshBtn) refreshBtn.classList.add("spinning");

        try {
            // Queries Java edition status via mcstatus.io API
            const response = await fetch(`https://api.mcstatus.io/v2/status/java/${SERVER_ADDRESS}`);
            const data = await response.json();

            const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

            if (data.online) {
                const onlineCount = data.players.online ?? 0;
                const maxCount = data.players.max ?? 20;
                const percentage = maxCount > 0 ? Math.min(100, Math.round((onlineCount / maxCount) * 100)) : 0;
                const motd = data.motd?.clean || "Welcome to Mija's Dedicated Minecraft SMP!";
                const version = data.version?.name_clean || "Paper 26.3";

                // Update Header
                if (headerPill) {
                    headerPill.className = "header-status-pill online";
                }
                if (headerStatusText) headerStatusText.textContent = "Online";
                if (headerPlayerCount) headerPlayerCount.textContent = `(${onlineCount}/${maxCount})`;

                // Update Hero
                if (heroDot) heroDot.className = "indicator online";
                if (heroStatusLabel) heroStatusLabel.textContent = "Server Online";
                if (heroVersionPill) heroVersionPill.textContent = version;
                if (heroPlayersInfo) heroPlayersInfo.textContent = `${onlineCount} / ${maxCount} Online`;

                // Update Diagnostic
                if (diagDot) diagDot.className = "indicator online";
                if (diagStatusText) diagStatusText.textContent = "Online & Operational";
                if (diagPlayerFraction) diagPlayerFraction.textContent = `${onlineCount} / ${maxCount}`;
                if (diagVersionText) diagVersionText.textContent = version;
                if (capacityPercentage) capacityPercentage.textContent = `${percentage}% Capacity`;
                if (capacityFill) capacityFill.style.width = `${percentage}%`;
                if (diagMotdContent) diagMotdContent.textContent = motd;
                if (lastUpdatedText) lastUpdatedText.textContent = `Synced at ${timestamp}`;

                // Update Player Roster List
                if (panelPlayerCountPill) panelPlayerCountPill.textContent = `${onlineCount} Online`;
                renderPlayerRoster(data.players.list || [], onlineCount);
            } else {
                // Server Offline
                if (headerPill) headerPill.className = "header-status-pill offline";
                if (headerStatusText) headerStatusText.textContent = "Offline";
                if (headerPlayerCount) headerPlayerCount.textContent = "";

                if (heroDot) heroDot.className = "indicator offline";
                if (heroStatusLabel) heroStatusLabel.textContent = "Server Offline";
                if (heroPlayersInfo) heroPlayersInfo.textContent = "0 / 20 Online";

                if (diagDot) diagDot.className = "indicator offline";
                if (diagStatusText) diagStatusText.textContent = "Server Offline / Unreachable";
                if (diagPlayerFraction) diagPlayerFraction.textContent = "0 / 20";
                if (capacityPercentage) capacityPercentage.textContent = "0% Capacity";
                if (capacityFill) capacityFill.style.width = "0%";
                if (diagMotdContent) diagMotdContent.textContent = "The server is currently offline or unreachable.";
                if (lastUpdatedText) lastUpdatedText.textContent = `Checked at ${timestamp}`;

                if (panelPlayerCountPill) panelPlayerCountPill.textContent = "0 Online";
                renderOfflineRoster();
            }
        } catch (err) {
            console.error("Status fetch error:", err);
            if (headerPill) headerPill.className = "header-status-pill offline";
            if (headerStatusText) headerStatusText.textContent = "Error";
            if (heroDot) heroDot.className = "indicator offline";
            if (heroStatusLabel) heroStatusLabel.textContent = "Connection Error";
            if (diagDot) diagDot.className = "indicator offline";
            if (diagStatusText) diagStatusText.textContent = "Error Querying API";
            if (diagMotdContent) diagMotdContent.textContent = "Unable to connect to mcstatus.io API.";
            renderOfflineRoster();
        } finally {
            isFetching = false;
            if (refreshBtn) {
                setTimeout(() => {
                    refreshBtn.classList.remove("spinning");
                }, 400);
            }
        }
    }

    function renderPlayerRoster(playerList, onlineCount) {
        if (!playersContainer) return;
        playersContainer.innerHTML = "";

        if (onlineCount === 0 || !playerList.length) {
            const emptyDiv = document.createElement("div");
            emptyDiv.className = "players-empty";
            emptyDiv.innerHTML = `
                <span style="font-size: 2rem;">🏕️</span>
                <strong>No players currently online</strong>
                <span style="font-size: 0.8rem; color: var(--text-tertiary);">Be the first one to log in and start mining!</span>
            `;
            playersContainer.appendChild(emptyDiv);
            return;
        }

        playerList.forEach((player) => {
            const rawName = player.name_clean || player.name_raw || "Adventurer";
            const item = document.createElement("div");
            item.className = "player-item";

            // Fallback avatar generator
            const avatarUrl = `https://mc-heads.net/avatar/${encodeURIComponent(rawName)}/32`;

            item.innerHTML = `
                <img src="${avatarUrl}" alt="${rawName}'s Minecraft skin" class="player-avatar" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22 viewBox=%220 0 32 32%22><rect width=%2232%22 height=%2232%22 fill=%22%2322c55e%22/></svg>'">
                <div class="player-info">
                    <span class="player-name">${escapeHTML(rawName)}</span>
                    <span class="player-status-tag">Active in SMP</span>
                </div>
            `;
            playersContainer.appendChild(item);
        });
    }

    function renderOfflineRoster() {
        if (!playersContainer) return;
        playersContainer.innerHTML = `
            <div class="players-empty">
                <span style="font-size: 2rem;">💤</span>
                <strong>Server is currently offline</strong>
                <span style="font-size: 0.8rem; color: var(--text-tertiary);">Player roster unavailable</span>
            </div>
        `;
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, (tag) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
        }[tag] || tag));
    }

    // Manual Refresh Event
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            if (window.soundFX && window.soundFX.enabled) {
                window.soundFX.playTone(720, "sine", 0.08);
            }
            fetchServerStatus();
        });
    }

    // Header Status Pill Click Sound
    if (headerPill) {
        headerPill.addEventListener("click", () => {
            if (window.soundFX && window.soundFX.enabled) {
                window.soundFX.playTone(580, "sine", 0.07);
            }
        });
    }

    // Initial check
    fetchServerStatus();

    // Auto-refresh every 60 seconds
    setInterval(fetchServerStatus, 60000);
}

/* ==========================================================================
   6. Dynamic Copyright Year
   ========================================================================== */
function initDynamicYear() {
    const yearSpan = document.getElementById("current-year");
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

/* ==========================================================================
   7. Modpack Setup Tab Switcher (Unofficial vs. CurseForge)
   ========================================================================== */
function initModpackTabs() {
    const tabButtons = document.querySelectorAll(".modpack-tab-btn");
    const tabPanels = document.querySelectorAll(".modpack-tab-content");

    if (!tabButtons.length || !tabPanels.length) return;

    function switchTab(targetId, playAudio = true) {
        tabButtons.forEach((btn) => {
            const isActive = btn.getAttribute("data-target") === targetId;
            btn.classList.toggle("active", isActive);
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });

        tabPanels.forEach((panel) => {
            const isMatch = panel.id === `tab-content-${targetId}`;
            if (isMatch) {
                panel.classList.add("active");
                panel.removeAttribute("hidden");
            } else {
                panel.classList.remove("active");
                panel.setAttribute("hidden", "true");
            }
        });

        localStorage.setItem("mr_modpack_tab", targetId);

        if (playAudio && window.soundFX && window.soundFX.enabled) {
            window.soundFX.playTone(560, "sine", 0.07, 0.06);
        }
    }

    tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-target");
            switchTab(target, true);
        });

        // Keyboard navigation (Arrow keys)
        btn.addEventListener("keydown", (e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                const target = btn.getAttribute("data-target") === "legacy" ? "curseforge" : "legacy";
                const targetBtn = document.querySelector(`.modpack-tab-btn[data-target="${target}"]`);
                if (targetBtn) {
                    targetBtn.focus();
                    switchTab(target, true);
                }
            }
        });
    });

    // Restore saved tab or default to 'legacy'
    const savedTab = localStorage.getItem("mr_modpack_tab") || "legacy";
    switchTab(savedTab, false);
}

/* ==========================================================================
   8. Tutorial Screenshot Lightbox Modal
   ========================================================================== */
function initScreenshotLightbox() {
    const modal = document.getElementById("screenshot-modal");
    const modalImg = document.getElementById("modal-image");
    const modalCaption = document.getElementById("modal-caption");
    const modalTitle = document.getElementById("modal-title");
    const modalCloseBtn = document.getElementById("modal-close");
    const modalBackdrop = document.getElementById("modal-backdrop");
    const frames = document.querySelectorAll(".screenshot-frame");

    if (!modal || !modalImg) return;

    function openModal(src, caption, title) {
        modalImg.src = src;
        modalImg.alt = caption || "Screenshot Preview";
        if (modalCaption) modalCaption.textContent = caption || "";
        if (modalTitle) modalTitle.textContent = title || "Screenshot Preview";

        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        if (window.soundFX && window.soundFX.enabled) {
            window.soundFX.playTone(640, "sine", 0.08, 0.05);
        }
    }

    function closeModal() {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";

        if (window.soundFX && window.soundFX.enabled) {
            window.soundFX.playTone(420, "sine", 0.06, 0.04);
        }
    }

    frames.forEach((frame) => {
        frame.addEventListener("click", () => {
            const src = frame.getAttribute("data-screenshot");
            const caption = frame.getAttribute("data-caption");
            const cardTitle = frame.closest(".tutorial-step-card")?.querySelector(".t-step-title")?.textContent || "Tutorial Step";
            if (src) {
                openModal(src, caption, cardTitle);
            }
        });
    });

    if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener("click", closeModal);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("open")) {
            closeModal();
        }
    });
}

/* ==========================================================================
   9. Tutorial Clipboard Helpers (IP Pills & Directory Paths)
   ========================================================================== */
function initTutorialClipboard() {
    const SERVER_ADDRESS = "mija.ddns.net";

    function copyTextWithFeedback(text, btnElem, defaultText = "Copy") {
        function triggerSuccess() {
            if (btnElem) {
                btnElem.textContent = "Copied! ✓";
                btnElem.classList.add("copied");
            }
            if (window.soundFX && window.soundFX.enabled) {
                window.soundFX.playTone(880, "sine", 0.12, 0.08);
            }
            setTimeout(() => {
                if (btnElem) {
                    btnElem.textContent = defaultText;
                    btnElem.classList.remove("copied");
                }
            }, 2000);
        }

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(triggerSuccess).catch(() => {
                fallbackCopy(text, triggerSuccess);
            });
        } else {
            fallbackCopy(text, triggerSuccess);
        }
    }

    function fallbackCopy(text, onSuccess) {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            if (onSuccess) onSuccess();
        } catch (e) {
            console.warn("Copy fallback failed:", e);
        }
    }

    // IP Pills in Tutorial Cards
    const ipPills = [
        document.getElementById("tut-copy-legacy"),
        document.getElementById("tut-copy-curseforge")
    ];

    ipPills.forEach((pill) => {
        if (!pill) return;
        const btn = pill.querySelector(".btn-pill-copy");
        pill.addEventListener("click", () => {
            copyTextWithFeedback(SERVER_ADDRESS, btn, "Copy IP");
        });
    });

    // Copy Mods Path
    const copyPathBtn = document.getElementById("btn-copy-modspath");
    if (copyPathBtn) {
        copyPathBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            copyTextWithFeedback("mods", copyPathBtn, "Copy");
        });
    }
}

