import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-[100px] w-full gap-4" 
         [ngClass]="{'absolute inset-0 bg-background/80 backdrop-blur-sm z-50': fullScreen}">
      <!-- Custom Pacman SVG -->
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" class="text-primary pacman3351" viewBox="50 0 500 300"
           [style.width]="getSizeInPx()" [style.height]="getSizeInPx()">
        <!--In order to externalize the SVG for use as an object, we have to put all the necessary styling inline here.-->
        <style>
          .pacman3351-dot {
              fill: currentColor;
          }

          .pacman3351-open,
          .pacman3351-mouth-top,
          .pacman3351-mouth-bottom {
              fill: currentColor;
          }

          .pacman3351-mouth-top,
          .pacman3351-mouth-bottom {
              animation-duration: 175ms;
              animation-timing-function: linear;
              animation-direction: alternate;
              animation-iteration-count: infinite;
              transform-origin: calc(300px/2) 150px; /* center of circle */
          }

          .pacman3351-mouth-top {
              animation-name: rotate3351-counterclockwise;
          }

          .pacman3351-mouth-bottom {
              animation-name: rotate3351-clockwise;
          }

          @keyframes rotate3351-counterclockwise {
              100% {
                  transform: rotate(-30deg);
              }
          }

          @keyframes rotate3351-clockwise {
              100% {
                  transform: rotate(30deg);
              }
          }

          .pacman3351-dot {
              animation-name: dot3351-motion;
              animation-duration: 600ms;
              animation-timing-function: linear;
              animation-iteration-count: infinite;
          }

          @keyframes dot3351-motion {
              100% {
                  transform: translateX(-100px); /* distance between dots */
              }
          }
        </style>
        <circle class="pacman3351-dot" cx="250" cy="50%" r="10"/>
        <circle class="pacman3351-dot" cx="350" cy="50%" r="10"/>
        <circle class="pacman3351-dot" cx="450" cy="50%" r="10"/>
        <circle class="pacman3351-dot" cx="550" cy="50%" r="10"/>
        <circle class="pacman3351-dot" cx="650" cy="50%" r="10"/>
        <!--Create arcs covering 45°, so there's a little overlap with animations of 30°.-->
        <path class="pacman3351-mouth-bottom" d="
          M 150,150
          L 220.4,221.0
          A 100 100 0 0 0 250,150
          Z"/>
        <path class="pacman3351-mouth-top" d="
          M 150,150 
          L 220.4,79.0
          A 100 100 0 0 1 250,150
          Z"/>
        <path class="pacman3351-open" d="
          M 150,150
          L 236.6,100
          A 100 100 0 1 0 236.6,200
          Z"/>
      </svg>
    </div>
  `
})
export class LoaderComponent {
  @Input() text?: string;
  @Input() fullScreen = false;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  getSizeInPx(): string {
    switch (this.size) {
      case 'small': return '48px';
      case 'large': return '128px';
      case 'medium':
      default: return '80px'; /* Aumenté el tamaño por defecto porque el pacman suele ocupar más espacio que el spinner normal */
    }
  }
}