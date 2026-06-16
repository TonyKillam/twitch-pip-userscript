// ==UserScript==
// @name         Twitch Custom PiP Button (Max Quality & Stable Icon)
// @namespace    https://greasyfork.org
// @version      5.1.0
// @description  Adds a stable native PiP button with hotkey 'P', locks Twitch background quality, and forces Source resolution on startup.
// @author       JynxziologyOnTiktok
// @match        https://*.twitch.tv/*
// @icon         https://static.wixstatic.com/media/6ab2a5_1e90c33df9464d23bfaf286e9234e561~mv2.png/v1/crop/x_136,y_26,w_273,h_501/fill/w_108,h_197,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/LogoTrans.png
// @grant        none
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // --- FEATURE 1: ANTI-DOWNSCALE PROTECTION ---
    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: false });
    Object.defineProperty(document, 'hidden', { value: false, writable: false });
    document.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);

    let pipBtn = null;
    let qualityForced = false;

    // --- FEATURE 2: FORCE SOURCE RESOLUTION ---
    // Finds Twitch's internal video state tracker and forces the highest quality array item
    function forceSourceQuality() {
        if (qualityForced) return;

        // Search the web elements to find Twitch's underlying React Player Core
        const playerContainer = document.querySelector('.video-player__container');
        if (!playerContainer) return;

        // Retrieve internal site properties attached by Twitch
        const reactKey = Object.keys(playerContainer).find(key => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$'));
        if (!reactKey) return;

        try {
            // Traverse up to find the active internal player function instance
            let currentContainer = playerContainer[reactKey];
            let twitchPlayer = null;

            while (currentContainer) {
                if (currentContainer.memoizedProps && currentContainer.memoizedProps.player) {
                    twitchPlayer = currentContainer.memoizedProps.player;
                    break;
                }
                currentContainer = currentContainer.return;
            }

            // Once the internal API player instance is located, set the quality string
            if (twitchPlayer && typeof twitchPlayer.getQualities === 'function') {
                const qualities = twitchPlayer.getQualities();
                if (qualities && qualities.length > 0) {
                    // Twitch places "Source" (or the highest value) as the first index item [0]
                    const sourceQuality = qualities[0].group;
                    twitchPlayer.setQuality(sourceQuality);
                    qualityForced = true; // Prevents the script from overwriting your manual changes later
                }
            }
        } catch (error) {
            console.debug('Waiting for Twitch internal player engine to finish booting...');
        }
    }

    // --- FEATURE 3: PIP BUTTON ACTIONS ---
    async function togglePiP() {
        const video = document.querySelector('video');
        if (!video) return;
        
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await video.requestPictureInPicture();
            }
        } catch (error) {
            console.error('Twitch PiP Error:', error);
        }
    }

    function createPipButton() {
        if (pipBtn) return pipBtn;

        pipBtn = document.createElement('button');
        pipBtn.id = 'tm-pip-btn';
        pipBtn.className = 'tw-align-items-center tw-align-middle tw-border-radius-medium tw-button-icon tw-button-icon--secondary tw-core-button tw-core-button--icon tw-inline-flex tw-interactive';
        pipBtn.setAttribute('aria-label', 'Picture-in-Picture (P)');
        pipBtn.title = 'Watch in Picture-in-Picture (Press P)';
        
        pipBtn.style.marginLeft = '6px';
        
        pipBtn.innerHTML = `
            <span class="tw-button-icon__icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M19 11h-8v6h8v-6zm4 8V5c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 0H3V5h18v14z"/>
                </svg>
            </span>
        `;

        pipBtn.addEventListener('click', (e) => {
            e.preventDefault();
            togglePiP();
        });

        return pipBtn;
    }

    function checkAndInject() {
        // Build the PiP Icon layout
        const controlBar = document.querySelector('.player-controls__right-control-group');
        if (controlBar && !document.getElementById('tm-pip-btn')) {
            const btn = createPipButton();
            controlBar.appendChild(btn);
        }
        
        // Simultaneously attempt to check and lock stream quality parameters
        forceSourceQuality();
    }

    // Reset our toggle lock if the user navigates to a totally new stream page
    window.addEventListener('popstate', () => { qualityForced = false; });
    window.addEventListener('hashchange', () => { qualityForced = false; });

    // Keyboard Shortcut Listener (Press P)
    document.addEventListener('keydown', (e) => {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        if (e.key.toLowerCase() === 'p') {
            e.preventDefault();
            togglePiP();
        }
    });

    // Main layout mutation hub
    const observer = new MutationObserver(() => {
        checkAndInject();
    });

    window.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        checkAndInject();
    });
})();
