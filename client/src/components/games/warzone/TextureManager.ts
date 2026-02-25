import * as THREE from 'three';

// Procedural texture generator for better visuals
export class TextureManager {
  private static textures: Map<string, THREE.Texture> = new Map();

  static createCanvasTexture(
    width: number,
    height: number,
    drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    drawFn(ctx, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  static getGroundTexture(): THREE.Texture {
    if (this.textures.has('ground')) return this.textures.get('ground')!;

    const texture = this.createCanvasTexture(512, 512, (ctx, w, h) => {
      // Base grass/dirt color
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, '#2d4a2e');
      gradient.addColorStop(0.5, '#3d5a3e');
      gradient.addColorStop(1, '#2a4028');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Add noise/texture
      for (let i = 0; i < 3000; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const shade = Math.random() * 40 - 20;
        ctx.fillStyle = `rgba(${45 + shade}, ${74 + shade}, ${46 + shade}, 0.3)`;
        ctx.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 4);
      }

      // Add some grass blades
      for (let i = 0; i < 500; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.strokeStyle = `rgba(${60 + Math.random() * 40}, ${100 + Math.random() * 50}, ${60 + Math.random() * 30}, 0.4)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.random() * 6 - 3, y - 5 - Math.random() * 8);
        ctx.stroke();
      }
    });
    
    texture.repeat.set(30, 30);
    this.textures.set('ground', texture);
    return texture;
  }

  static getConcreteTexture(): THREE.Texture {
    if (this.textures.has('concrete')) return this.textures.get('concrete')!;

    const texture = this.createCanvasTexture(256, 256, (ctx, w, h) => {
      // Base concrete color
      ctx.fillStyle = '#5a5a5a';
      ctx.fillRect(0, 0, w, h);

      // Add grain
      for (let i = 0; i < 2000; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const shade = Math.random() * 30 - 15;
        ctx.fillStyle = `rgba(${90 + shade}, ${90 + shade}, ${90 + shade}, 0.3)`;
        ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3);
      }

      // Add some cracks
      ctx.strokeStyle = 'rgba(40, 40, 40, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        let x = Math.random() * w;
        let y = Math.random() * h;
        ctx.moveTo(x, y);
        for (let j = 0; j < 5; j++) {
          x += Math.random() * 40 - 20;
          y += Math.random() * 40 - 20;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    });
    
    texture.repeat.set(4, 4);
    this.textures.set('concrete', texture);
    return texture;
  }

  static getMetalTexture(): THREE.Texture {
    if (this.textures.has('metal')) return this.textures.get('metal')!;

    const texture = this.createCanvasTexture(128, 128, (ctx, w, h) => {
      // Brushed metal gradient
      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, '#4a4a4a');
      gradient.addColorStop(0.3, '#6a6a6a');
      gradient.addColorStop(0.5, '#5a5a5a');
      gradient.addColorStop(0.7, '#6a6a6a');
      gradient.addColorStop(1, '#4a4a4a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Brushed lines
      ctx.strokeStyle = 'rgba(80, 80, 80, 0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < h; i += 2) {
        ctx.beginPath();
        ctx.moveTo(0, i + Math.random());
        ctx.lineTo(w, i + Math.random());
        ctx.stroke();
      }
    });
    
    this.textures.set('metal', texture);
    return texture;
  }

  static getBrickTexture(): THREE.Texture {
    if (this.textures.has('brick')) return this.textures.get('brick')!;

    const texture = this.createCanvasTexture(256, 256, (ctx, w, h) => {
      // Mortar background
      ctx.fillStyle = '#6a6a6a';
      ctx.fillRect(0, 0, w, h);

      // Draw bricks
      const brickW = 48;
      const brickH = 24;
      const gap = 4;
      
      for (let row = 0; row < h / (brickH + gap); row++) {
        const offset = row % 2 === 0 ? 0 : brickW / 2;
        for (let col = -1; col < w / (brickW + gap) + 1; col++) {
          const x = col * (brickW + gap) + offset;
          const y = row * (brickH + gap);
          
          // Random brick shade
          const shade = Math.random() * 30 - 15;
          ctx.fillStyle = `rgb(${140 + shade}, ${70 + shade / 2}, ${60 + shade / 2})`;
          ctx.fillRect(x + gap / 2, y + gap / 2, brickW, brickH);
          
          // Add texture to brick
          for (let i = 0; i < 20; i++) {
            ctx.fillStyle = `rgba(${120 + Math.random() * 40}, ${60 + Math.random() * 20}, ${50 + Math.random() * 20}, 0.2)`;
            ctx.fillRect(x + gap / 2 + Math.random() * brickW, y + gap / 2 + Math.random() * brickH, 3, 3);
          }
        }
      }
    });
    
    texture.repeat.set(2, 2);
    this.textures.set('brick', texture);
    return texture;
  }

  static getCrateTexture(): THREE.Texture {
    if (this.textures.has('crate')) return this.textures.get('crate')!;

    const texture = this.createCanvasTexture(128, 128, (ctx, w, h) => {
      // Wood base
      ctx.fillStyle = '#8b7355';
      ctx.fillRect(0, 0, w, h);

      // Wood grain
      for (let i = 0; i < 50; i++) {
        const y = Math.random() * h;
        ctx.strokeStyle = `rgba(${100 + Math.random() * 40}, ${80 + Math.random() * 30}, ${60 + Math.random() * 20}, 0.3)`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(w / 3, y + Math.random() * 10, (2 * w) / 3, y - Math.random() * 10, w, y);
        ctx.stroke();
      }

      // Metal edges
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, w - 8, h - 8);

      // Corner bolts
      ctx.fillStyle = '#666';
      [[10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    
    this.textures.set('crate', texture);
    return texture;
  }

  static getHealthPackTexture(): THREE.MeshStandardMaterial {
    const texture = this.createCanvasTexture(64, 64, (ctx, w, h) => {
      // Red background with gradient
      const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
      gradient.addColorStop(0, '#ff4444');
      gradient.addColorStop(1, '#aa2222');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // White cross
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w/2 - 6, 8, 12, h - 16);
      ctx.fillRect(8, h/2 - 6, w - 16, 12);

      // Border
      ctx.strokeStyle = '#881111';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, w - 4, h - 4);
    });

    return new THREE.MeshStandardMaterial({ 
      map: texture,
      emissive: new THREE.Color(0xff2222),
      emissiveIntensity: 0.3
    });
  }

  static getAmmoPackTexture(): THREE.MeshStandardMaterial {
    const texture = this.createCanvasTexture(64, 64, (ctx, w, h) => {
      // Yellow/gold background
      const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
      gradient.addColorStop(0, '#ffcc00');
      gradient.addColorStop(1, '#aa8800');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Bullet icon
      ctx.fillStyle = '#442200';
      ctx.fillRect(w/2 - 4, 10, 8, 30);
      ctx.beginPath();
      ctx.arc(w/2, 10, 4, 0, Math.PI, true);
      ctx.fill();
      ctx.fillRect(w/2 - 6, 40, 12, 14);

      // Border
      ctx.strokeStyle = '#886600';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, w - 4, h - 4);
    });

    return new THREE.MeshStandardMaterial({ 
      map: texture,
      emissive: new THREE.Color(0xffaa00),
      emissiveIntensity: 0.3
    });
  }

  static getGrenadePackTexture(): THREE.MeshStandardMaterial {
    const texture = this.createCanvasTexture(64, 64, (ctx, w, h) => {
      // Green background
      const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
      gradient.addColorStop(0, '#44cc44');
      gradient.addColorStop(1, '#228822');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Grenade icon
      ctx.fillStyle = '#224422';
      ctx.beginPath();
      ctx.ellipse(w/2, h/2 + 5, 14, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Handle
      ctx.fillStyle = '#333';
      ctx.fillRect(w/2 - 3, 8, 6, 12);
      ctx.fillRect(w/2 - 5, 6, 10, 4);

      // Border
      ctx.strokeStyle = '#116611';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, w - 4, h - 4);
    });

    return new THREE.MeshStandardMaterial({ 
      map: texture,
      emissive: new THREE.Color(0x22aa22),
      emissiveIntensity: 0.3
    });
  }

  static getGunMaterial(skin: string): THREE.MeshStandardMaterial {
    const colors: Record<string, string> = {
      normal: '#3a3a3a',
      gold: '#ffd700',
      camo: '#4a5d23',
      neon: '#00ffff'
    };

    const emissiveColors: Record<string, number> = {
      normal: 0x000000,
      gold: 0x332200,
      camo: 0x000000,
      neon: 0x00ffff
    };

    return new THREE.MeshStandardMaterial({
      color: colors[skin] || colors.normal,
      metalness: skin === 'gold' ? 0.9 : 0.7,
      roughness: skin === 'gold' ? 0.2 : 0.4,
      emissive: new THREE.Color(emissiveColors[skin] || 0),
      emissiveIntensity: skin === 'neon' ? 0.5 : 0.1
    });
  }
}
