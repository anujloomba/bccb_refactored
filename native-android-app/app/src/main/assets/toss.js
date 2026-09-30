/*
 * The toss: an animated coin flip between the two captains, then the winner chooses to bat or bowl.
 * Results are kept per group on this device and, for administrators, published to the group.
 */
(function () {
    'use strict';

    const Core = window.GameDayCore;
    if (!Core) return;

    const FLIP_DURATION_MS = 2100;
    const FLIP_TURNS = 5;
    const mounts = new WeakMap();

    function app() {
        return window.cricketApp || null;
    }

    function groupKey() {
        const cricketApp = app();
        const groupId = cricketApp && cricketApp.authManager ? cricketApp.authManager.getCurrentGroupId() : 'local';
        return `bccb-toss-${groupId}`;
    }

    function escapeHtml(value) {
        return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[character]));
    }

    function teamName(team) {
        const cricketApp = app();
        return cricketApp && typeof cricketApp.getTeamDisplayName === 'function'
            ? cricketApp.getTeamDisplayName(team)
            : team.name || 'Team';
    }

    function captainName(team) {
        return (team.captain && team.captain.name) || team.captainName || (team.players && team.players[0] && team.players[0].name) || 'Captain';
    }

    function storedToss() {
        try {
            return JSON.parse(localStorage.getItem(groupKey()) || 'null');
        } catch (error) {
            return null;
        }
    }

    function savedSignature() {
        try {
            const saved = JSON.parse(localStorage.getItem('savedTeams') || 'null');
            return Array.isArray(saved) && saved.length === 2 ? Core.teamSignature(saved) : null;
        } catch (error) {
            return null;
        }
    }

    function prefersReducedMotion() {
        return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function coinHtml(teams) {
        return `
            <div class="gd-coin-stage">
                <div class="gd-coin-toss" data-toss-coin-wrap>
                    <div class="gd-coin" data-toss-coin>
                        <div class="gd-coin-face gd-coin-front"><strong>${escapeHtml(Core.initials(captainName(teams[0])))}</strong><small>${escapeHtml(teamName(teams[0]))}</small></div>
                        <div class="gd-coin-face gd-coin-back"><strong>${escapeHtml(Core.initials(captainName(teams[1])))}</strong><small>${escapeHtml(teamName(teams[1]))}</small></div>
                    </div>
                </div>
                <div class="gd-coin-shadow"></div>
            </div>`;
    }

    function shareStatusHtml(toss) {
        const cricketApp = app();
        const isAdmin = Boolean(cricketApp && cricketApp.authManager && cricketApp.authManager.isAdmin());
        if (toss.shareStatus === 'shared') return '✅ Shared with the group on Game Day';
        if (toss.shareStatus === 'sharing') return '📡 Sharing with the group…';
        if (toss.shareStatus === 'failed') {
            return '⚠️ Could not share with the group. <button type="button" class="gd-link" data-toss-action="share">Try again</button>';
        }
        return isAdmin ? '📱 Saved on this phone' : '📱 Saved on this phone. Sign in as administrator to share tosses with the group.';
    }

    function render(container) {
        const mount = mounts.get(container);
        if (!mount) return;
        const { teams, stage, toss } = mount;
        const names = teams.map(teamName);
        let body;

        if (stage === 'unsaved') {
            body = `
                <p class="gd-subtle">Save these teams, then flip the coin to decide who bats first.</p>`;
        } else if (stage === 'idle' || stage === 'flipping') {
            body = `
                ${coinHtml(teams)}
                <p class="gd-subtle gd-small">${escapeHtml(captainName(teams[0]))} vs ${escapeHtml(captainName(teams[1]))}. The winning captain chooses to bat or bowl.</p>
                <button type="button" class="toss-btn" data-toss-action="flip"${stage === 'flipping' ? ' disabled' : ''}>${stage === 'flipping' ? 'Flipping…' : '🪙 Toss'}</button>`;
        } else if (stage === 'choose') {
            body = `
                ${coinHtml(teams)}
                <div class="gd-toss-result">
                    <div class="gd-toss-winner">🎉 ${escapeHtml(names[mount.winnerIndex])} won the toss!</div>
                    <p class="gd-subtle">${escapeHtml(captainName(teams[mount.winnerIndex]))}, what will it be?</p>
                    <div class="gd-toss-choices">
                        <button type="button" class="btn btn-success" data-toss-action="decide" data-decision="bat">🏏 Bat first</button>
                        <button type="button" class="btn btn-primary" data-toss-action="decide" data-decision="bowl">🎯 Bowl first</button>
                    </div>
                </div>`;
        } else {
            const tossedAt = new Date(toss.tossedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            body = `
                <div class="gd-toss-result">
                    <div class="gd-toss-final">🪙 ${escapeHtml(Core.tossSummary(toss))}</div>
                    <div class="gd-toss-meta">Tossed at ${escapeHtml(tossedAt)} · ${shareStatusHtml(toss)}</div>
                    <div class="gd-toss-actions">
                        <button type="button" class="gd-chip-btn" data-toss-action="retoss">↺ Toss again</button>
                    </div>
                </div>`;
        }

        container.innerHTML = `
            <div class="glass-card gd-toss-card fade-in">
                <h3>🪙 The toss</h3>
                ${body}
            </div>`;

        if (stage === 'choose') {
            const coin = container.querySelector('[data-toss-coin]');
            if (coin) coin.style.transform = `rotateY(${mount.winnerIndex === 1 ? 180 : 0}deg)`;
        }
    }

    function mountToss(container, teams) {
        if (!container || !Array.isArray(teams) || teams.length !== 2) return;
        const signature = Core.teamSignature(teams);
        const previous = storedToss();
        let stage = savedSignature() === signature ? 'idle' : 'unsaved';
        let toss = null;
        if (previous && previous.signature === signature) {
            stage = 'done';
            toss = previous;
        }
        mounts.set(container, { teams, signature, stage, toss, winnerIndex: null });
        render(container);
    }

    function flip(container) {
        const mount = mounts.get(container);
        if (!mount || mount.stage === 'flipping') return;
        mount.stage = 'flipping';
        mount.winnerIndex = Core.flipCoin();
        render(container);

        const coin = container.querySelector('[data-toss-coin]');
        const wrap = container.querySelector('[data-toss-coin-wrap]');
        const finalRotation = FLIP_TURNS * 360 + (mount.winnerIndex === 1 ? 180 : 0);
        if (prefersReducedMotion() || !coin || !wrap) {
            mount.stage = 'choose';
            render(container);
            return;
        }
        coin.style.transition = 'none';
        coin.style.transform = 'rotateY(0deg)';
        void coin.offsetWidth;
        coin.style.transition = '';
        wrap.classList.add('gd-tossing');
        coin.style.transform = `rotateY(${finalRotation}deg)`;
        setTimeout(() => {
            if (mounts.get(container) !== mount || mount.stage !== 'flipping') return;
            mount.stage = 'choose';
            render(container);
            if (navigator.vibrate) navigator.vibrate(60);
        }, FLIP_DURATION_MS);
    }

    async function share(container) {
        const mount = mounts.get(container);
        const cricketApp = app();
        if (!mount || !mount.toss || !cricketApp || !cricketApp.authManager.isAdmin()) return;
        if (!window.GameDay || typeof window.GameDay.api !== 'function') return;
        mount.toss.shareStatus = 'sharing';
        render(container);
        try {
            const target = window.GameDay.tossTarget ? window.GameDay.tossTarget() : null;
            const payload = {
                teams: mount.toss.teams,
                winnerIndex: mount.toss.winnerIndex,
                decision: mount.toss.decision,
                tossedAt: mount.toss.tossedAt,
                signature: mount.toss.signature
            };
            await window.GameDay.api('/tosses', {
                method: 'PUT',
                admin: true,
                body: target ? { toss: payload, gameDayId: target.id } : { toss: payload }
            });
            mount.toss.shareStatus = 'shared';
            cricketApp.showNotification('🪙 Toss shared with the group');
            if (window.GameDay.refresh) window.GameDay.refresh();
        } catch (error) {
            console.warn('Could not share the toss.', error);
            mount.toss.shareStatus = 'failed';
        }
        localStorage.setItem(groupKey(), JSON.stringify(mount.toss));
        render(container);
    }

    function decide(container, decision) {
        const mount = mounts.get(container);
        if (!mount || mount.stage !== 'choose') return;
        const cricketApp = app();
        const isAdmin = Boolean(cricketApp && cricketApp.authManager && cricketApp.authManager.isAdmin());
        mount.toss = {
            teams: mount.teams.map(team => ({
                name: teamName(team),
                captainName: captainName(team),
                players: (team.players || []).map(player => player.name)
            })),
            winnerIndex: mount.winnerIndex,
            decision,
            tossedAt: new Date().toISOString(),
            signature: mount.signature,
            shareStatus: isAdmin ? 'sharing' : 'local'
        };
        mount.stage = 'done';
        localStorage.setItem(groupKey(), JSON.stringify(mount.toss));
        render(container);
        if (isAdmin) share(container);
    }

    function retoss(container) {
        const mount = mounts.get(container);
        if (!mount) return;
        if (!window.confirm('Toss again? The current result will be replaced.')) return;
        localStorage.removeItem(groupKey());
        mount.toss = null;
        mount.stage = 'idle';
        flip(container);
    }

    document.addEventListener('click', event => {
        const button = event.target.closest('[data-toss-action]');
        if (!button || button.disabled) return;
        const container = button.closest('[data-toss-slot]');
        if (!container) return;
        event.preventDefault();
        event.stopPropagation();
        const action = button.dataset.tossAction;
        if (action === 'flip') flip(container);
        if (action === 'decide') decide(container, button.dataset.decision);
        if (action === 'retoss') retoss(container);
        if (action === 'share') share(container);
    });

    window.BCCBToss = {
        slotHtml: () => '<div class="gd-toss-slot" data-toss-slot></div>',
        mount: mountToss,
        mountIn: (root, teams) => {
            const slot = root ? root.querySelector('[data-toss-slot]') : null;
            if (slot) mountToss(slot, teams);
        }
    };
})();
