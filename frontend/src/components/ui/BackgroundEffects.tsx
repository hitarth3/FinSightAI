import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

export const BackgroundEffects: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle Object Model
    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      alpha: number;
      decay: number;
    }

    const particles: Particle[] = [];
    const maxParticles = 22;

    const createParticle = (xVal?: number, yVal?: number): Particle => {
      return {
        x: xVal ?? Math.random() * width,
        y: yVal ?? Math.random() * height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.5 + 0.1,
        decay: Math.random() * 0.002 + 0.0005
      };
    };

    // Seed initial particles
    for (let i = 0; i < maxParticles; i++) {
      particles.push(createParticle());
    }

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw and update particles
      particles.forEach((p, idx) => {
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        
        // Color shifts based on theme — kept subtle, no per-particle glow blur
        if (theme === 'dark-fintech') {
          const color = idx % 2 === 0 ? '0, 212, 255' : '124, 58, 237';
          ctx.fillStyle = `rgba(${color}, ${p.alpha * 0.6})`;
        } else {
          ctx.fillStyle = `rgba(14, 165, 233, ${p.alpha * 0.4})`;
        }
        ctx.shadowBlur = 0;

        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};
