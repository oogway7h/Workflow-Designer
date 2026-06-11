import { Component, Input, Output, EventEmitter, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-image-editor',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      background: hsl(var(--muted));
    }
    .image-editor-toolbar {
      background: hsl(var(--card));
      border-bottom: 1px solid hsl(var(--border));
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .tool-btn {
      padding: 6px 12px;
      font-size: 12px;
      border: 1px solid hsl(var(--border));
      border-radius: 6px;
      background: hsl(var(--secondary));
      color: hsl(var(--secondary-foreground));
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .tool-btn:hover {
      background: hsl(var(--accent));
      border-color: hsl(var(--primary));
    }
    .tool-btn.active {
      background: hsl(var(--primary));
      border-color: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
    }
    .tool-separator {
      width: 1px;
      height: 24px;
      background: hsl(var(--border));
      margin: 0 4px;
    }
    .canvas-area {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
      padding: 2rem;
      position: relative;
    }
    canvas {
      max-width: 100%;
      max-height: 100%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      cursor: crosshair;
    }
    .controls-panel {
      background: hsl(var(--card));
      border-top: 1px solid hsl(var(--border));
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-shrink: 0;
    }
    .slider-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .slider-group label {
      font-size: 11px;
      color: hsl(var(--muted-foreground));
      min-width: 60px;
    }
    .slider-group input[type="range"] {
      width: 120px;
      accent-color: hsl(var(--primary));
    }
    .slider-group .value {
      font-size: 11px;
      color: hsl(var(--foreground));
      min-width: 30px;
      text-align: right;
    }
    .color-picker {
      width: 28px;
      height: 28px;
      border: 2px solid hsl(var(--border));
      border-radius: 4px;
      cursor: pointer;
      background: none;
      padding: 0;
    }
  `],
  template: `
    <div class="image-editor-toolbar">
      <button class="tool-btn" [class.active]="activeTool === 'select'" (click)="setTool('select')" title="Seleccionar">
        <lucide-icon name="mouse-pointer" class="h-3.5 w-3.5"></lucide-icon> Seleccionar
      </button>
      <div class="tool-separator"></div>
      <button class="tool-btn" (click)="rotateImage(-90)" title="Rotar izquierda">
        <lucide-icon name="rotate-ccw" class="h-3.5 w-3.5"></lucide-icon>
      </button>
      <button class="tool-btn" (click)="rotateImage(90)" title="Rotar derecha">
        <lucide-icon name="rotate-cw" class="h-3.5 w-3.5"></lucide-icon>
      </button>
      <button class="tool-btn" (click)="flipHorizontal()" title="Voltear horizontal">
        <lucide-icon name="flip-horizontal" class="h-3.5 w-3.5"></lucide-icon>
      </button>
      <button class="tool-btn" (click)="flipVertical()" title="Voltear vertical">
        <lucide-icon name="flip-vertical" class="h-3.5 w-3.5"></lucide-icon>
      </button>
      <div class="tool-separator"></div>
      <button class="tool-btn" [class.active]="activeTool === 'draw'" (click)="setTool('draw')" title="Dibujar">
        <lucide-icon name="pencil" class="h-3.5 w-3.5"></lucide-icon> Dibujar
      </button>
      <button class="tool-btn" [class.active]="activeTool === 'text'" (click)="setTool('text')" title="Texto">
        <lucide-icon name="type" class="h-3.5 w-3.5"></lucide-icon> Texto
      </button>
      <input type="color" class="color-picker" [(value)]="drawColor" (input)="onColorChange($event)" title="Color">
      <div class="tool-separator"></div>
      <button class="tool-btn" (click)="undo()" title="Deshacer">
        <lucide-icon name="undo-2" class="h-3.5 w-3.5"></lucide-icon>
      </button>
      <button class="tool-btn" (click)="redo()" title="Rehacer">
        <lucide-icon name="redo-2" class="h-3.5 w-3.5"></lucide-icon>
      </button>
      <button class="tool-btn" (click)="resetImage()" title="Restablecer">
        <lucide-icon name="refresh-cw" class="h-3.5 w-3.5"></lucide-icon> Reset
      </button>
    </div>

    <div class="canvas-area">
      <canvas 
        #editorCanvas
        (mousedown)="onMouseDown($event)"
        (mousemove)="onMouseMove($event)"
        (mouseup)="onMouseUp($event)"
        (click)="onCanvasClick($event)">
      </canvas>
    </div>

    <div class="controls-panel">
      <div class="slider-group">
        <label>Brillo</label>
        <input type="range" min="-100" max="100" [value]="brightness" (input)="onBrightnessChange($event)">
        <span class="value">{{ brightness }}</span>
      </div>
      <div class="slider-group">
        <label>Contraste</label>
        <input type="range" min="-100" max="100" [value]="contrast" (input)="onContrastChange($event)">
        <span class="value">{{ contrast }}</span>
      </div>
      <div class="slider-group">
        <label>Grosor</label>
        <input type="range" min="1" max="20" [value]="brushSize" (input)="onBrushSizeChange($event)">
        <span class="value">{{ brushSize }}px</span>
      </div>
    </div>
  `
})
export class ImageEditorComponent implements AfterViewInit, OnDestroy {
  @Input() fileUrl = '';
  @Output() imageModified = new EventEmitter<Blob>();

  @ViewChild('editorCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  activeTool: 'select' | 'draw' | 'text' = 'select';
  drawColor = '#ff0000';
  brightness = 0;
  contrast = 0;
  brushSize = 3;

  private ctx!: CanvasRenderingContext2D;
  private originalImage: HTMLImageElement | null = null;
  private isDrawing = false;
  private history: ImageData[] = [];
  private historyIndex = -1;
  private rotation = 0;
  private flippedH = false;
  private flippedV = false;

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    if (this.fileUrl) {
      this.loadImage(this.fileUrl);
    }
  }

  ngOnDestroy() {
    // Cleanup
  }

  private loadImage(url: string) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.originalImage = img;
      this.rotation = 0;
      this.flippedH = false;
      this.flippedV = false;
      this.brightness = 0;
      this.contrast = 0;
      this.drawImageToCanvas();
      this.saveToHistory();
    };
    img.src = url;
  }

  private drawImageToCanvas() {
    if (!this.originalImage) return;

    const canvas = this.canvasRef.nativeElement;
    const img = this.originalImage;

    // Handle rotation dimensions
    const useSwapped = this.rotation === 90 || this.rotation === 270;
    canvas.width = useSwapped ? img.height : img.width;
    canvas.height = useSwapped ? img.width : img.height;

    this.ctx.save();
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Move to center
    this.ctx.translate(canvas.width / 2, canvas.height / 2);

    // Apply rotation
    this.ctx.rotate((this.rotation * Math.PI) / 180);

    // Apply flips
    const scaleX = this.flippedH ? -1 : 1;
    const scaleY = this.flippedV ? -1 : 1;
    this.ctx.scale(scaleX, scaleY);

    // Apply brightness/contrast via filter
    this.ctx.filter = `brightness(${100 + this.brightness}%) contrast(${100 + this.contrast}%)`;

    // Draw centered
    this.ctx.drawImage(img, -img.width / 2, -img.height / 2);
    this.ctx.restore();
  }

  private saveToHistory() {
    const canvas = this.canvasRef.nativeElement;
    // Truncate forward history
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(this.ctx.getImageData(0, 0, canvas.width, canvas.height));
    this.historyIndex = this.history.length - 1;

    // Limit history size
    if (this.history.length > 30) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  setTool(tool: 'select' | 'draw' | 'text') {
    this.activeTool = tool;
    const canvas = this.canvasRef.nativeElement;
    canvas.style.cursor = tool === 'draw' ? 'crosshair' : tool === 'text' ? 'text' : 'default';
  }

  // --- Drawing ---
  onMouseDown(event: MouseEvent) {
    if (this.activeTool !== 'draw') return;
    this.isDrawing = true;
    const { x, y } = this.getCanvasCoords(event);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.strokeStyle = this.drawColor;
    this.ctx.lineWidth = this.brushSize;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isDrawing || this.activeTool !== 'draw') return;
    const { x, y } = this.getCanvasCoords(event);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  onMouseUp(event: MouseEvent) {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.ctx.closePath();
      this.saveToHistory();
    }
  }

  onCanvasClick(event: MouseEvent) {
    if (this.activeTool !== 'text') return;
    const { x, y } = this.getCanvasCoords(event);
    const text = prompt('Escribe el texto:');
    if (text) {
      this.ctx.font = `${this.brushSize * 4}px Arial`;
      this.ctx.fillStyle = this.drawColor;
      this.ctx.fillText(text, x, y);
      this.saveToHistory();
    }
  }

  private getCanvasCoords(event: MouseEvent): { x: number; y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  // --- Transforms ---
  rotateImage(degrees: number) {
    this.rotation = (this.rotation + degrees + 360) % 360;
    this.drawImageToCanvas();
    this.saveToHistory();
  }

  flipHorizontal() {
    this.flippedH = !this.flippedH;
    this.drawImageToCanvas();
    this.saveToHistory();
  }

  flipVertical() {
    this.flippedV = !this.flippedV;
    this.drawImageToCanvas();
    this.saveToHistory();
  }

  // --- Adjustments ---
  onBrightnessChange(event: Event) {
    this.brightness = parseInt((event.target as HTMLInputElement).value);
    this.drawImageToCanvas();
    // Re-apply drawings from history if any, by restoring last history state
    // For simplicity, we redraw the base image with new filters
  }

  onContrastChange(event: Event) {
    this.contrast = parseInt((event.target as HTMLInputElement).value);
    this.drawImageToCanvas();
  }

  onBrushSizeChange(event: Event) {
    this.brushSize = parseInt((event.target as HTMLInputElement).value);
  }

  onColorChange(event: Event) {
    this.drawColor = (event.target as HTMLInputElement).value;
  }

  // --- History ---
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.ctx.putImageData(this.history[this.historyIndex], 0, 0);
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.ctx.putImageData(this.history[this.historyIndex], 0, 0);
    }
  }

  resetImage() {
    this.rotation = 0;
    this.flippedH = false;
    this.flippedV = false;
    this.brightness = 0;
    this.contrast = 0;
    this.drawImageToCanvas();
    this.saveToHistory();
  }

  /** Returns the current canvas as a Blob */
  getImageBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = this.canvasRef.nativeElement;
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      }, 'image/png');
    });
  }
}
