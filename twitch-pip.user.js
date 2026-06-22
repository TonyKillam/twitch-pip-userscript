// ==UserScript==
// @name         Twitch & Cineby PiP Booster (Max Quality & Hotkey)
// @namespace    https://greasyfork.org
// @version      6.0.0
// @description  Adds stable native PiP via 'P' hotkey for Twitch and Cineby.sc, plus premium quality controls for Twitch.
// @author       JynxziologyOnTiktok
// @match        https://*.twitch.tv/*
// @match        https://*.cineby.sc/*
// @match        https://*.cineby.app/*
// @icon         https://static.wixstatic.com/media/6ab2a5_1e90c33df9464d23bfaf286e9234e561~mv2.png/v1/crop/x_136,y_26,w_273,h_501/fill/w_108,h_197,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/LogoTrans.png
// @grant        none
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const isTwitch = window.location.hostname.includes('twitch.tv');

    // --- TWITCH ONLY: ANTI-DOWNSCALE PROTECTION ---
    if (isTwitch) {
        Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: false });
        Object.defineProperty(document, 'hidden', { value: false, writable: false });
        document.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);
    }

    let pipBtn = null;
    let qualityForced = false;

    // --- TWITCH ONLY: FORCE SOURCE RESOLUTION ---
    function forceSourceQuality() {
        if (!isTwitch || qualityForced) return;

        const playerContainer = document.querySelector('.video-player__container');
        if (!playerContainer) return;

        const reactKey = Object.keys(playerContainer).find(key => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$'));
        if (!reactKey) return;

        try {
            let currentContainer = playerContainer[reactKey];
            let twitchPlayer = null;

            while (currentContainer) {
                if (currentContainer.memoizedProps && currentContainer.memoizedProps.player) {
                    twitchPlayer = currentContainer.memoizedProps.player;
                    break;
                }
                currentContainer = currentContainer.return;
            }

            if (twitchPlayer && typeof twitchPlayer.getQualities === 'function') {
                const qualities = twitchPlayer.getQualities();
                if (qualities && qualities.length > 0) {
                    const sourceQuality = qualities[0].group;
                    twitchPlayer.setQuality(sourceQuality);
                    qualityForced = true;
                }
            }
        } catch (error) {
            console.debug('Waiting for Twitch core engine...');
        }
    }

    // --- GLOBAL: FIND ANY PLAYING VIDEO (Handles buried Iframes) ---
    function findActiveVideoElement() {
        // First look in the main page frame
        let video = document.querySelector('video');
        if (video) return video;

        // If not found, dive into any movie streaming player iframes
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
            try {
                const iframeVideo = iframe.contentWindow.document.querySelector('video');
                if (iframeVideo) return iframeVideo;
            } catch (e) {
                // Blocks cross-origin security errors from third-party hosts safely
            }
        }
        return null;
    }

    // --- GLOBAL: PIP ACTION HOOK ---
    async function togglePiP() {
        const video = findActiveVideoElement();
        if (!video) return;
        
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await video.requestPictureInPicture();
            }
        } catch (error) {
            console.error('Video PiP Error:', error);
        }
    }

    // --- TWITCH ONLY: RENDER CUSTOM BUTTON ---
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
        if (isTwitch) {
            const controlBar = document.querySelector('.player-controls__right-control-group');
            if (controlBar && !document.getElementById('tm-pip-btn')) {
                const btn = createPipButton();
                controlBar.appendChild(btn);
            }
            forceSourceQuality();
        }
    }

    // Reset toggle logic on page jumps
    window.addEventListener('popstate', () => { qualityForced = false; });
    window.addEventListener('hashchange', () => { qualityForced = false; });

    // --- GLOBAL: KEYBOARD SHORTCUT LISTENER (Press P) ---
    document.addEventListener('keydown', (e) => {
        const target = e.target;
        // Safety: Do not toggle if the user is typing in a movie search box or chat panel
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        if (e.key.toLowerCase() === 'p') {
            e.preventDefault();
            togglePiP();
        }
    });

    // High-performance background layout monitor
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
