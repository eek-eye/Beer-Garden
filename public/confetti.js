// Bar Chinesca: tiny self-hosted confetti + "¡Mesa verificada!" message (no external libraries)
// window.barCelebrate({ title, message, detail }) shows the message; the confetti is skipped
// when the visitor prefers reduced motion (prefers-reduced-motion: reduce).
(function() {
    'use strict';

    var COLORS = ['#d4a017', '#f2c14e', '#b0121b', '#ff2d95', '#2fd07a', '#fbeccb'];
    var DURATION = 3800; // ms of falling confetti
    var MESSAGE_MS = 8000; // the message closes by itself after this

    function reducedMotion() {
        try {
            return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (e) {
            return false;
        }
    }

    function burst() {
        var old = document.getElementById('barConfettiCanvas');
        if (old) old.remove();
        var canvas = document.createElement('canvas');
        canvas.id = 'barConfettiCanvas';
        canvas.className = 'bar-confetti-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.appendChild(canvas);
        var ctx = canvas.getContext('2d');
        if (!ctx) { canvas.remove(); return; }
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = 0, h = 0;
        function resize() {
            w = window.innerWidth; h = window.innerHeight;
            canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        resize();
        window.addEventListener('resize', resize);

        var count = Math.round(Math.min(180, Math.max(90, w / 5)));
        var pieces = [];
        for (var i = 0; i < count; i++) {
            var fromLeft = i % 2 === 0;
            var angle = (fromLeft ? -60 : -120) + (Math.random() * 40 - 20);
            var speed = 9 + Math.random() * 9;
            pieces.push({
                x: fromLeft ? -10 : w + 10,
                y: h * (0.55 + Math.random() * 0.25),
                vx: Math.cos(angle * Math.PI / 180) * speed,
                vy: Math.sin(angle * Math.PI / 180) * speed,
                size: 6 + Math.random() * 6,
                rot: Math.random() * Math.PI,
                vr: (Math.random() - 0.5) * 0.3,
                wobble: Math.random() * Math.PI * 2,
                color: COLORS[i % COLORS.length],
                round: Math.random() < 0.3
            });
        }

        var start = null;
        function frame(t) {
            if (start === null) start = t;
            var elapsed = t - start;
            ctx.clearRect(0, 0, w, h);
            var fade = elapsed > DURATION - 800 ? Math.max(0, (DURATION - elapsed) / 800) : 1;
            ctx.globalAlpha = fade;
            for (var j = 0; j < pieces.length; j++) {
                var p = pieces[j];
                p.vy += 0.28;           // gravity
                p.vx *= 0.985;          // air
                p.vy = Math.min(p.vy, 6);
                p.wobble += 0.12;
                p.x += p.vx + Math.sin(p.wobble) * 0.6;
                p.y += p.vy;
                p.rot += p.vr;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                if (p.round) {
                    ctx.beginPath(); ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2); ctx.fill();
                } else {
                    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2 * (0.4 + Math.abs(Math.cos(p.wobble))));
                }
                ctx.restore();
            }
            if (elapsed < DURATION) {
                window.requestAnimationFrame(frame);
            } else {
                window.removeEventListener('resize', resize);
                canvas.remove();
            }
        }
        window.requestAnimationFrame(frame);
    }

    function showMessage(opts) {
        var old = document.querySelector('.bar-celebrate');
        if (old) old.remove();
        var box = document.createElement('div');
        box.className = 'bar-celebrate';
        box.setAttribute('role', 'status');
        box.setAttribute('aria-live', 'polite');
        var inner = document.createElement('div');
        inner.className = 'bar-celebrate-card';
        var icon = document.createElement('div');
        icon.className = 'bar-celebrate-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '🎉';
        var title = document.createElement('p');
        title.className = 'bar-celebrate-title';
        title.textContent = opts.title || '¡Mesa verificada!';
        var msg = document.createElement('p');
        msg.className = 'bar-celebrate-message';
        msg.textContent = opts.message || 'Bienvenido a Bar Chinesca';
        inner.appendChild(icon); inner.appendChild(title); inner.appendChild(msg);
        if (opts.detail) {
            var detail = document.createElement('p');
            detail.className = 'bar-celebrate-detail';
            detail.textContent = opts.detail;
            inner.appendChild(detail);
        }
        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'btn btn-primary bar-celebrate-close';
        close.textContent = 'Cerrar';
        inner.appendChild(close);
        box.appendChild(inner);
        document.body.appendChild(box);
        var timer = null;
        function dismiss() {
            if (timer) clearTimeout(timer);
            document.removeEventListener('keydown', onKey);
            box.remove();
        }
        function onKey(e) { if (e.key === 'Escape') dismiss(); }
        close.addEventListener('click', dismiss);
        box.addEventListener('click', function(e) { if (e.target === box) dismiss(); });
        document.addEventListener('keydown', onKey);
        timer = setTimeout(dismiss, MESSAGE_MS);
        return box;
    }

    function celebrate(opts) {
        opts = opts || {};
        celebrate.count += 1;
        var calm = reducedMotion();
        document.documentElement.setAttribute('data-bar-celebrated', String(celebrate.count));
        showMessage(opts);
        if (!calm) burst();
        return !calm;
    }
    celebrate.count = 0;

    window.barCelebrate = celebrate;
})();
