// ==UserScript==
// @name         Twitch Custom PiP Button (Max Quality & Stable Icon)
// @namespace    http://greasyfork.org
// @version      5.0
// @description  Adds a stable native PiP button with hotkey 'P' and blocks Twitch from dropping stream quality in the background.
// @author       JynxziologyOnTiktok
// @match        https://*.twitch.tv/*
// @icon         https://static.wixstatic.com/media/6ab2a5_1e90c33df9464d23bfaf286e9234e561~mv2.png/v1/crop/x_136,y_26,w_273,h_501/fill/w_108,h_197,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/LogoTrans.png
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- FEATURE 1: ANTI-DOWNSCALE PROTECTION ---
    // This tells Twitch that the browser tab is ALWAYS open and focused, blocking the 480p drop.
    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: false });
    Object.defineProperty(document, 'hidden', { value: false, writable: false });

    // Block hidden events from firing out to Twitch's servers
    document.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);

    let pipBtn = null;

    // Master function to turn PiP mode on or off
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
        const controlBar = document.querySelector('.player-controls__right-control-group');
        if (controlBar && !document.getElementById('tm-pip-btn')) {
            const btn = createPipButton();
            controlBar.appendChild(btn);
        }
    }

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

    // High-performance background layout monitor
    const observer = new MutationObserver(() => {
        checkAndInject();
    });

    // Wait until document body exists to track it
    window.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        checkAndInject();
    });
})();

