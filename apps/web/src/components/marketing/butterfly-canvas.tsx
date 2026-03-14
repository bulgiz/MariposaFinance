// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { useEffect, useRef } from "react";

const COLORS = {
  purple: { r: 192, g: 132, b: 252 },
  purpleDim: { r: 124, g: 58, b: 237 },
  gold: { r: 245, g: 183, b: 49 },
  goldLight: { r: 252, g: 211, b: 77 },
  white: { r: 232, g: 224, b: 240 },
} as const;

type Color = { r: number; g: number; b: number };

function lerpColor(a: Color, b: Color, t: number): Color {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

export function ButterflyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, time = 0;
    let mouseX = -1000, mouseY = -1000;
    let animId: number;

    function resize() {
      if (!canvas) return;
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      W = canvas.width = canvas.offsetWidth * devicePixelRatio;
      H = canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx!.scale(devicePixelRatio, devicePixelRatio);
    }
    resize();

    const onResize = () => resize();
    const onMouseMove = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; };
    window.addEventListener("resize", onResize);
    document.addEventListener("mousemove", onMouseMove);

    class Butterfly {
      x = 0; y = 0;
      flyAngle = 0; speed = 0;
      vx = 0; vy = 0;
      size = 0;
      wingPhase = 0; wingSpeed = 0;
      wobbleAmp = 0; wobbleFreq = 0; wobbleOffset = 0;
      perpX = 0; perpY = 0;
      opacity = 0; targetOpacity = 0; fadeIn = false;
      color1: Color = COLORS.purple; color2: Color = COLORS.white;
      trail: { x: number; y: number }[] = [];
      trailMax = 14;

      constructor() { this.reset(true); }

      reset(initial = false) {
        const cw = canvas!.offsetWidth, ch = canvas!.offsetHeight;
        this.flyAngle = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 0.5 + 0.3;
        this.vx = Math.cos(this.flyAngle) * this.speed;
        this.vy = Math.sin(this.flyAngle) * this.speed;
        this.size = Math.random() * 14 + 8;
        if (initial) {
          this.x = Math.random() * cw; this.y = Math.random() * ch;
        } else {
          const m = 60;
          if (Math.abs(this.vx) > Math.abs(this.vy)) {
            this.x = this.vx > 0 ? -m : cw + m; this.y = Math.random() * ch;
          } else {
            this.x = Math.random() * cw; this.y = this.vy > 0 ? -m : ch + m;
          }
        }
        this.wingPhase = Math.random() * Math.PI * 2;
        this.wingSpeed = Math.random() * 0.07 + 0.05;
        this.wobbleAmp = Math.random() * 0.4 + 0.1;
        this.wobbleFreq = Math.random() * 0.02 + 0.01;
        this.wobbleOffset = Math.random() * 1000;
        this.perpX = -Math.sin(this.flyAngle);
        this.perpY = Math.cos(this.flyAngle);
        this.opacity = initial ? Math.random() * 0.5 + 0.2 : 0;
        this.targetOpacity = Math.random() * 0.45 + 0.15;
        this.fadeIn = !initial;
        const isGold = Math.random() < 0.25;
        if (isGold) { this.color1 = COLORS.gold; this.color2 = COLORS.goldLight; }
        else { this.color1 = COLORS.purple; this.color2 = Math.random() < 0.5 ? COLORS.purpleDim : COLORS.white; }
        this.trail = [];
      }

      update() {
        const cw = canvas!.offsetWidth, ch = canvas!.offsetHeight;
        if (this.fadeIn && this.opacity < this.targetOpacity) {
          this.opacity += 0.005;
          if (this.opacity >= this.targetOpacity) this.fadeIn = false;
        }
        this.wingPhase += this.wingSpeed;
        const w = Math.sin((time + this.wobbleOffset) * this.wobbleFreq) * this.wobbleAmp;
        this.x += this.vx + this.perpX * w;
        this.y += this.vy + this.perpY * w;
        const dx = this.x - mouseX, dy = this.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150 && dist > 0) {
          const f = ((150 - dist) / 150) * 0.6;
          this.x += (dx / dist) * f; this.y += (dy / dist) * f;
        }
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.trailMax) this.trail.shift();
        const m = 100;
        if (this.x < -m || this.x > cw + m || this.y < -m || this.y > ch + m) this.reset(false);
      }

      draw() {
        if (!ctx || this.opacity <= 0.01) return;
        const alpha = this.opacity;
        if (this.trail.length > 2) {
          ctx.beginPath(); ctx.moveTo(this.trail[0].x, this.trail[0].y);
          for (let i = 1; i < this.trail.length; i++) ctx.lineTo(this.trail[i].x, this.trail[i].y);
          ctx.strokeStyle = `rgba(${this.color1.r},${this.color1.g},${this.color1.b},${alpha * 0.1})`;
          ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.flyAngle + Math.PI / 2);
        const wf = Math.sin(this.wingPhase);
        const ws = 0.25 + Math.abs(wf) * 0.75;
        const s = this.size;
        const c1 = lerpColor(this.color1, this.color2, 0.3);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.5);
        g.addColorStop(0, `rgba(${this.color1.r},${this.color1.g},${this.color1.b},${alpha * 0.2})`);
        g.addColorStop(1, `rgba(${this.color1.r},${this.color1.g},${this.color1.b},0)`);
        ctx.fillStyle = g; ctx.fillRect(-s * 2.5, -s * 2.5, s * 5, s * 5);
        // Left wing
        ctx.save(); ctx.scale(ws, 1);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-s * .6, -s * .7, -s * 1.3, -s * .6, -s * 1, -s * .05);
        ctx.bezierCurveTo(-s * 1.1, s * .15, -s * .5, s * .1, 0, 0);
        ctx.fillStyle = `rgba(${c1.r},${c1.g},${c1.b},${alpha * 0.7})`; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-s * .3, s * .15, -s * .85, s * .5, -s * .65, s * .55);
        ctx.bezierCurveTo(-s * .45, s * .6, -s * .15, s * .3, 0, 0);
        ctx.fillStyle = `rgba(${this.color1.r},${this.color1.g},${this.color1.b},${alpha * 0.55})`; ctx.fill();
        ctx.restore();
        // Right wing
        ctx.save(); ctx.scale(ws, 1);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.bezierCurveTo(s * .6, -s * .7, s * 1.3, -s * .6, s * 1, -s * .05);
        ctx.bezierCurveTo(s * 1.1, s * .15, s * .5, s * .1, 0, 0);
        ctx.fillStyle = `rgba(${c1.r},${c1.g},${c1.b},${alpha * 0.7})`; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.bezierCurveTo(s * .3, s * .15, s * .85, s * .5, s * .65, s * .55);
        ctx.bezierCurveTo(s * .45, s * .6, s * .15, s * .3, 0, 0);
        ctx.fillStyle = `rgba(${this.color1.r},${this.color1.g},${this.color1.b},${alpha * 0.55})`; ctx.fill();
        ctx.restore();
        // Body
        ctx.beginPath(); ctx.ellipse(0, 0, s * .06, s * .35, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color2.r},${this.color2.g},${this.color2.b},${alpha * 0.8})`; ctx.fill();
        // Antennae
        ctx.beginPath();
        ctx.moveTo(-s * .03, -s * .32); ctx.quadraticCurveTo(-s * .15, -s * .55, -s * .2, -s * .6);
        ctx.moveTo(s * .03, -s * .32); ctx.quadraticCurveTo(s * .15, -s * .55, s * .2, -s * .6);
        ctx.strokeStyle = `rgba(${this.color2.r},${this.color2.g},${this.color2.b},${alpha * 0.4})`;
        ctx.lineWidth = 0.7; ctx.stroke();
        ctx.restore();
      }
    }

    class Particle {
      x = 0; y = 0; size = 0;
      speedX = 0; speedY = 0;
      maxOpacity = 0; phase = 0; phaseSpeed = 0;
      color: Color = COLORS.purple;
      opacity = 0;

      constructor() { this.reset(); }
      reset() {
        const cw = canvas!.offsetWidth, ch = canvas!.offsetHeight;
        this.x = Math.random() * cw; this.y = Math.random() * ch;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.2;
        this.speedY = (Math.random() - 0.5) * 0.15 - 0.05;
        this.maxOpacity = Math.random() * 0.35 + 0.05;
        this.phase = Math.random() * Math.PI * 2;
        this.phaseSpeed = Math.random() * 0.02 + 0.005;
        this.color = Math.random() < 0.3 ? COLORS.gold : COLORS.purple;
      }
      update() {
        this.x += this.speedX + Math.sin(time * 0.001 + this.phase) * 0.1;
        this.y += this.speedY;
        this.phase += this.phaseSpeed;
        this.opacity = this.maxOpacity * (0.5 + Math.sin(this.phase) * 0.5);
        const cw = canvas!.offsetWidth, ch = canvas!.offsetHeight;
        if (this.x < -10 || this.x > cw + 10 || this.y < -10 || this.y > ch + 10) this.reset();
      }
      draw() {
        if (!ctx) return;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color.r},${this.color.g},${this.color.b},${this.opacity})`;
        ctx.fill();
      }
    }

    const butterflies = Array.from({ length: 18 }, () => new Butterfly());
    const particles = Array.from({ length: 80 }, () => new Particle());

    function animate() {
      time++;
      const cw = canvas!.offsetWidth, ch = canvas!.offsetHeight;
      ctx!.clearRect(0, 0, cw, ch);
      particles.forEach(p => { p.update(); p.draw(); });
      butterflies.forEach(b => { b.update(); b.draw(); });
      animId = requestAnimationFrame(animate);
    }
    animate();

    // suppress unused variable warnings
    void W; void H;

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1,
        pointerEvents: "none",
      }}
    />
  );
}
