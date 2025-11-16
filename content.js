console.log("Muckrake content script loaded");

function playSound(soundFile) {
    try {
        const audio = new Audio(chrome.runtime.getURL(`sounds/${soundFile}`));
        audio.volume = 0.5;
        audio.play().catch(err => console.log('Sound play failed:', err));
    } catch (error) {
        console.log('Sound not available:', error);
    }
}

function playTypewriterDing() {
    playSound('typewriter.wav');
}

function playHotOffPress() {
    playSound('hot-off-press.wav');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received message:", request);

    if (request.action === 'ping') {
        sendResponse({ status: 'ok' });
        return;
    }

    if (request.action === 'startListening') {
        console.log("Content script: UI says listening started");
        sendResponse({ status: 'ok', message: 'Content acknowledged start' });
        return;

    } else if (request.action === 'stopListening') {
        console.log("Content script: UI says listening stopped");
        sendResponse({ status: 'ok', message: 'Content acknowledged stop' });
        return;

    } else if (request.action === 'resultsReady') {
        console.log('Content script: Results ready!');
        displayResults(request.results);
        sendResponse({ status: 'shown' });
        return;
    }
});

function displayResults(results) {
    const existingOverlay = document.getElementById('muckrake-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    const totalClaims = results.length;
    const verifiedClaims = results.filter(r => r.verified === 'verified').length;
    const falseClaims = results.filter(r => r.verified === 'false').length;
    const uncertainClaims = results.filter(r => r.verified === 'uncertain').length;
    const needsContextClaims = results.filter(r => r.verified === 'needs-context').length;
    const unverifiedClaims = results.filter(r => r.verified === 'unverified').length;

    const verificationRate = verifiedClaims / totalClaims;
    const falseRate = falseClaims / totalClaims;

    let verdict, verdictClass;
    if (falseRate > 0.5) {
        verdict = "MOSTLY FALSE";
        verdictClass = "verdict-false";
    } else if (verificationRate > 0.5) {
        verdict = "MOSTLY VERIFIED";
        verdictClass = "verdict-verified";
    } else if (verificationRate === 0.5 || (verifiedClaims + uncertainClaims) / totalClaims >= 0.5) {
        verdict = "PARTIALLY VERIFIED";
        verdictClass = "verdict-partial";
    } else {
        verdict = "MOSTLY UNVERIFIED";
        verdictClass = "verdict-unverified";
    }

    const overlay = document.createElement('div');
    overlay.id = 'muckrake-overlay';
    overlay.className = 'muckrake-overlay';

    const panel = document.createElement('div');
    panel.className = 'muckrake-panel';

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let html = `
        <h1 class="muckrake-title">THE MUCKRAKE TIMES</h1>
        <div class="newspaper-subtitle">
            ${dateStr} • Fact-Checking Division • "Veritas Vincit"
        </div>
        
        <div class="verdict-banner ${verdictClass}">
            <h2 class="verdict-text">${verdict}</h2>
            <p class="verdict-stats">${verifiedClaims} verified, ${falseClaims} false, ${uncertainClaims} uncertain, ${needsContextClaims} need context, ${unverifiedClaims} unverified (${totalClaims} total claims examined)</p>
        </div>
        
        <h3 class="section-title">📰 Full Claims Analysis</h3>
        <div class="claims-container">
    `;

    results.forEach((result, index) => {
        let statusSymbol, statusText, claimClass;

        if (result.verified === 'verified') {
            statusSymbol = '✅';
            statusText = 'VERIFIED';
            claimClass = 'claim-verified';
        } else if (result.verified === 'false') {
            statusSymbol = '🚫';
            statusText = 'FALSE';
            claimClass = 'claim-false';
        } else if (result.verified === 'needs-context') {
            statusSymbol = '⚠️';
            statusText = 'NEEDS CONTEXT';
            claimClass = 'claim-needs-context';
        } else if (result.verified === 'uncertain') {
            statusSymbol = '❓';
            statusText = 'UNCERTAIN';
            claimClass = 'claim-uncertain';
        } else {
            statusSymbol = '❌';
            statusText = 'UNVERIFIED';
            claimClass = 'claim-unverified';
        }

        html += `
            <div class="claim-card ${claimClass}">
                <div class="claim-header">
                    <span class="claim-symbol">${statusSymbol}</span>
                    <div class="claim-content">
                        <p class="claim-text"><strong>${result.claim}</strong></p>
                        <p class="claim-status">${statusText}</p>
        `;


        if (result.sources.length > 0) {

            if (result.verified === 'false' && result.note) {
                html += `<p class="false-note">🚫 ${result.note}</p>`;
            } else if (result.verified === 'needs-context' && result.note) {
                html += `<p class="context-note">⚠️ ${result.note}</p>`;
            } else if (result.verified === 'uncertain') {
                html += `<p class="uncertain-note">⚠️ Sources found, but not from verified news outlets</p>`;
            }

            html += `<div class="sources-list">
                <div class="sources-header">Sources:</div>`;
            if (result.verified === 'uncertain') {
                html += `<p class="uncertain-note">⚠️ Sources found, but not from verified news outlets</p>`;
            }

            html += `<div class="sources-list">
                        <div class="sources-header">Sources:</div>`;
            result.sources.forEach((source, i) => {
                const sourceClass = source.trusted ? 'source-trusted' : 'source-untrusted';
                html += `
                    <div class="source-item ${sourceClass}">
                        <a href="${source.url}" target="_blank" class="source-link">
                            ${source.trusted ? '📰' : '🌐'} ${source.title}
                        </a>
                        <p class="source-meta">
                            ${source.source}${source.trusted ? ' (Verified News Outlet)' : ' (Unverified Source)'}
                        </p>
                    </div>
                `;
            });
            html += `</div>`;
        } else {
            html += `<p class="no-sources">No sources found to verify this claim.</p>`;
        }

        html += `
                    </div>
                </div>
            </div>
        `;
    });

    html += `
        </div>
        <div class="newspaper-ornament">✦ ✦ ✦</div>
        <button id="muckrake-close" class="close-btn">Close</button>
    `;

    panel.innerHTML = html;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    playHotOffPress();
    setTimeout(() => {
        playTypewriterDing();
    }, 600);

    document.getElementById('muckrake-close').addEventListener('click', () => {
        overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}