import { Component, Input, Output, EventEmitter, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject, NgZone, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import * as XLSX from 'xlsx';
import { WebsocketService } from '../../../core/services/websocket.service';
import { AuthService } from '../../../core/services/auth.service';

declare var jspreadsheet: any;

@Component({
  selector: 'app-spreadsheet-editor',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }
    .spreadsheet-toolbar {
      background: hsl(var(--card));
      border-bottom: 1px solid hsl(var(--border));
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      z-index: 10;
    }
    .spreadsheet-toolbar button {
      padding: 4px 12px;
      font-size: 12px;
      border: 1px solid hsl(var(--border));
      border-radius: 4px;
      background: hsl(var(--secondary));
      color: hsl(var(--secondary-foreground));
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .spreadsheet-toolbar button:hover {
      background: hsl(var(--accent));
    }
    .spreadsheet-toolbar button.active {
      background: hsl(var(--primary) / 0.1);
      border-color: hsl(var(--primary));
      color: hsl(var(--primary));
    }
    .toolbar-divider {
      width: 1px;
      height: 20px;
      background: hsl(var(--border));
      margin: 0 4px;
    }
    .sheet-tabs {
      background: hsl(var(--muted));
      border-bottom: 1px solid hsl(var(--border));
      padding: 0 8px;
      display: flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }
    .sheet-tab {
      padding: 6px 16px;
      font-size: 12px;
      cursor: pointer;
      border: 1px solid transparent;
      border-bottom: none;
      border-radius: 4px 4px 0 0;
      background: transparent;
      color: hsl(var(--muted-foreground));
      transition: all 0.15s;
    }
    .sheet-tab:hover {
      background: hsl(var(--accent));
    }
    .sheet-tab.active {
      background: hsl(var(--card));
      border-color: hsl(var(--border));
      color: hsl(var(--foreground));
      font-weight: 500;
    }
    .spreadsheet-container {
      flex: 1;
      overflow: auto;
      background: hsl(var(--card));
      color: hsl(var(--foreground));
    }
    .formula-bar {
      background: hsl(var(--card));
      border-bottom: 1px solid hsl(var(--border));
      padding: 6px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      font-size: 12px;
      z-index: 9;
    }
    .formula-label {
      font-family: monospace;
      background: hsl(var(--muted));
      color: hsl(var(--muted-foreground));
      border: 1px solid hsl(var(--border));
      padding: 2px 8px;
      border-radius: 4px;
      min-width: 60px;
      text-align: center;
      user-select: none;
    }
    .formula-divider {
      width: 1px;
      height: 16px;
      background: hsl(var(--border));
    }
    .formula-icon {
      font-style: italic;
      font-weight: bold;
      color: hsl(var(--muted-foreground));
      user-select: none;
    }
    .formula-input {
      flex: 1;
      background: hsl(var(--muted) / 0.3);
      color: hsl(var(--foreground));
      border: 1px solid hsl(var(--border));
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
    }
    .formula-input:focus {
      outline: none;
      border-color: hsl(var(--primary));
      background: hsl(var(--card));
    }
    .toolbar-select {
      background: hsl(var(--card));
      color: hsl(var(--foreground));
      border: 1px solid hsl(var(--border));
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      cursor: pointer;
      outline: none;
      height: 28px;
    }
    .toolbar-select:hover {
      background: hsl(var(--accent));
    }
    .color-picker-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .color-picker-input {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }
    .toolbar-search-input {
      background: hsl(var(--muted) / 0.5);
      color: hsl(var(--foreground));
      border: 1px solid hsl(var(--border));
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      outline: none;
      width: 120px;
      height: 28px;
      transition: width 0.25s ease;
    }
    .toolbar-search-input:focus {
      border-color: hsl(var(--primary));
      background: hsl(var(--card));
      width: 180px;
    }
  `],
  template: `
    <div class="spreadsheet-toolbar flex flex-wrap gap-2 overflow-x-auto items-center">
      <span style="font-size: 12px; color: #6b7280; margin-right: 8px; font-weight: 600;">Planilla</span>
      
      <!-- Font Settings -->
      <div class="toolbar-divider"></div>
      <select (change)="onFontFamilyChange($event)" class="toolbar-select" title="Tipo de Letra">
        <option value="">Fuente</option>
        <option value="Calibri">Calibri</option>
        <option value="Arial">Arial</option>
        <option value="Arial Black">Arial Black</option>
        <option value="Helvetica">Helvetica</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Courier New">Courier New</option>
        <option value="Georgia">Georgia</option>
        <option value="Verdana">Verdana</option>
        <option value="Impact">Impact</option>
        <option value="Trebuchet MS">Trebuchet MS</option>
        <option value="Comic Sans MS">Comic Sans MS</option>
        <option value="monospace">Monospace</option>
      </select>

      <select (change)="onFontSizeChange($event)" class="toolbar-select" title="Tamaño de Letra">
        <option value="">Tamaño</option>
        <option value="8px">8</option>
        <option value="9px">9</option>
        <option value="10px">10</option>
        <option value="11px">11</option>
        <option value="12px">12</option>
        <option value="14px">14</option>
        <option value="16px">16</option>
        <option value="18px">18</option>
        <option value="20px">20</option>
        <option value="22px">22</option>
        <option value="24px">24</option>
        <option value="28px">28</option>
        <option value="36px">36</option>
        <option value="48px">48</option>
        <option value="72px">72</option>
      </select>

      <!-- Font styles -->
      <div class="toolbar-divider"></div>
      <button (click)="applyStyle('font-weight', 'bold')" title="Negrita"><b>B</b></button>
      <button (click)="applyStyle('font-style', 'italic')" title="Cursiva"><i>I</i></button>
      <button (click)="applyStyle('text-decoration', 'underline')" title="Subrayado"><u>U</u></button>
      <button (click)="applyStyle('text-decoration', 'line-through')" title="Tachado"><del>S</del></button>
      
      <!-- Colors -->
      <div class="toolbar-divider"></div>
      <div class="color-picker-wrapper" title="Color de Relleno">
        <button>
          <lucide-icon name="paint-bucket" class="h-3.5 w-3.5"></lucide-icon>
        </button>
        <input type="color" class="color-picker-input" (change)="onFillColorChange($event)" />
      </div>

      <div class="color-picker-wrapper" title="Color de Texto">
        <button>
          <lucide-icon name="type" class="h-3.5 w-3.5"></lucide-icon>
        </button>
        <input type="color" class="color-picker-input" (change)="onTextColorChange($event)" />
      </div>

      <!-- Borders & Format Cleaners -->
      <div class="toolbar-divider"></div>
      <select (change)="onBorderChange($event)" class="toolbar-select" title="Bordes">
        <option value="">Bordes</option>
        <option value="all">Todos los bordes</option>
        <option value="outer">Borde exterior</option>
        <option value="bottom">Borde inferior</option>
        <option value="top">Borde superior</option>
        <option value="left">Borde izquierdo</option>
        <option value="right">Borde derecho</option>
        <option value="none">Sin bordes</option>
      </select>

      <button (click)="clearStyles()" title="Borrar Formatos">
        <lucide-icon name="eraser" class="h-3.5 w-3.5 text-red-500"></lucide-icon>
      </button>

      <!-- Horizontal & Vertical Alignments -->
      <div class="toolbar-divider"></div>
      <button (click)="applyStyle('text-align', 'left')" title="Alinear a la Izquierda"><lucide-icon name="align-left" class="h-3 w-3"></lucide-icon></button>
      <button (click)="applyStyle('text-align', 'center')" title="Centrar"><lucide-icon name="align-center" class="h-3 w-3"></lucide-icon></button>
      <button (click)="applyStyle('text-align', 'right')" title="Alinear a la Derecha"><lucide-icon name="align-right" class="h-3 w-3"></lucide-icon></button>
      
      <button (click)="applyVerticalAlign('top')" title="Alinear Arriba">
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="4" x2="20" y2="4"></line>
          <rect x="6" y="9" width="12" height="11" rx="2"></rect>
          <polyline points="9 14 12 11 15 14"></polyline>
          <line x1="12" y1="11" x2="12" y2="17"></line>
        </svg>
      </button>
      <button (click)="applyVerticalAlign('middle')" title="Alinear al Medio">
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="12" x2="20" y2="12"></line>
          <rect x="6" y="4" width="12" height="5" rx="1"></rect>
          <rect x="6" y="15" width="12" height="5" rx="1"></rect>
        </svg>
      </button>
      <button (click)="applyVerticalAlign('bottom')" title="Alinear Abajo">
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="20" x2="20" y2="20"></line>
          <rect x="6" y="4" width="12" height="11" rx="2"></rect>
          <polyline points="9 10 12 13 15 10"></polyline>
          <line x1="12" y1="7" x2="12" y2="13"></line>
        </svg>
      </button>

      <!-- Merge & Wrap Text -->
      <div class="toolbar-divider"></div>
      <button (click)="toggleWrapText()" title="Ajustar Texto">
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M3 12h13a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H10"></path>
          <polyline points="13 17 10 20 13 23"></polyline>
          <line x1="3" y1="18" x2="6" y2="18"></line>
        </svg>
      </button>
      <button (click)="mergeCells()" title="Combinar Celdas"><lucide-icon name="combine" class="h-3 w-3"></lucide-icon></button>

      <!-- Number Formatting -->
      <div class="toolbar-divider"></div>
      <select (change)="onFormatChange($event)" class="toolbar-select" title="Formato de Número">
        <option value="">Formato (General)</option>
        <option value="number">Número (1,234.56)</option>
        <option value="currency">Moneda ($1,234.56)</option>
        <option value="percent">Porcentaje (12.34%)</option>
        <option value="date">Fecha (YYYY-MM-DD)</option>
        <option value="text">Texto</option>
      </select>

      <button (click)="formatCurrency()" title="Formato Moneda ($)">
        <lucide-icon name="dollar-sign" class="h-3.5 w-3.5"></lucide-icon>
      </button>
      <button (click)="formatPercent()" title="Formato Porcentaje (%)">
        <lucide-icon name="percent" class="h-3.5 w-3.5"></lucide-icon>
      </button>
      <button (click)="adjustDecimals(true)" title="Aumentar Decimales" style="font-family: monospace; font-weight: bold; font-size: 10px; padding: 4px 6px;">
        .00→
      </button>
      <button (click)="adjustDecimals(false)" title="Disminuir Decimales" style="font-family: monospace; font-weight: bold; font-size: 10px; padding: 4px 6px;">
        ←.0
      </button>

      <!-- Data Operations (Sorting & Clears) -->
      <div class="toolbar-divider"></div>
      <button (click)="sortColumn(true)" title="Ordenar A-Z (Ascendente)">
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 16 4 4 4-4"></path>
          <path d="M7 20V4"></path>
          <path d="M15 4h5l-5 6h5"></path>
          <path d="M15 14h5l-2.5 6Z"></path>
        </svg>
      </button>
      <button (click)="sortColumn(false)" title="Ordenar Z-A (Descendente)">
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 8 4-4 4 4"></path>
          <path d="M7 4v16"></path>
          <path d="M15 4h5l-2.5 6Z"></path>
          <path d="M15 14h5l-5 6h5"></path>
        </svg>
      </button>

      <button (click)="clearContents()" title="Borrar Contenido" class="text-amber-600">
        <lucide-icon name="trash-2" class="h-3.5 w-3.5"></lucide-icon>
      </button>
      <button (click)="clearAll()" title="Borrar Todo (Valores y Formatos)" class="text-red-600">
        <lucide-icon name="trash-2" class="h-3.5 w-3.5 font-bold"></lucide-icon>
      </button>

      <!-- Actions -->
      <div class="toolbar-divider"></div>
      <button (click)="undo()" title="Deshacer"><lucide-icon name="undo" class="h-3 w-3"></lucide-icon></button>
      <button (click)="redo()" title="Rehacer"><lucide-icon name="redo" class="h-3 w-3"></lucide-icon></button>

      <!-- Grid Alterations (Insert/Delete) -->
      <div class="toolbar-divider"></div>
      <select (change)="onGridAction($event)" class="toolbar-select" title="Acciones de Grilla">
        <option value="">Insertar / Eliminar</option>
        <option value="row-before">Insertar Fila Antes</option>
        <option value="row-after">Insertar Fila Después</option>
        <option value="col-before">Insertar Columna Antes</option>
        <option value="col-after">Insertar Columna Después</option>
        <option value="del-row">Eliminar Fila</option>
        <option value="del-col">Eliminar Columna</option>
      </select>

      <!-- Zoom Level -->
      <div class="toolbar-divider"></div>
      <select (change)="onZoomChange($event)" class="toolbar-select" title="Zoom">
        <option value="1">Zoom: 100%</option>
        <option value="0.75">75%</option>
        <option value="0.9">90%</option>
        <option value="1.1">110%</option>
        <option value="1.25">125%</option>
        <option value="1.5">150%</option>
      </select>

      <!-- Download File -->
      <div class="toolbar-divider"></div>
      <button (click)="downloadExcel()" title="Descargar como XLSX" class="bg-primary/15 text-primary border-primary/20 hover:bg-primary/25">
        <lucide-icon name="download" class="h-3.5 w-3.5"></lucide-icon>
        <span>Descargar</span>
      </button>

      <!-- Integrated Search -->
      <div class="flex items-center gap-1.5 ml-auto pl-4">
        <svg class="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          type="text" 
          class="toolbar-search-input" 
          placeholder="Buscar en hoja..." 
          (input)="onSearchInput($event)"
          title="Buscar"
        />
      </div>
    </div>

    <!-- Formula Bar -->
    <div class="formula-bar">
      <div class="formula-label">
        {{ selectedCellLabel }}
      </div>
      <div class="formula-divider"></div>
      <div class="formula-icon">fx</div>
      <input 
        type="text" 
        class="formula-input"
        [value]="formulaBarInputValue"
        (input)="onFormulaBarInput($event)"
        (keydown.enter)="onFormulaBarSubmit()"
        (blur)="onFormulaBarSubmit()"
        placeholder="Ingrese texto, número o fórmula (e.g. =SUM(A1:B2))"
      />
    </div>

    <div class="sheet-tabs" *ngIf="sheetNames.length > 1">
      <button 
        *ngFor="let name of sheetNames; let i = index"
        class="sheet-tab"
        [class.active]="i === activeSheetIndex"
        (click)="switchSheet(i)">
        {{ name }}
      </button>
    </div>
    <div #spreadsheetContainer class="spreadsheet-container"></div>
  `
})
export class SpreadsheetEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() fileUrl = '';
  @Input() fileName = '';
  @Input() uuid = '';
  @Output() dataChanged = new EventEmitter<any>();

  @ViewChild('spreadsheetContainer', { static: true }) containerRef!: ElementRef;

  private readonly wsService = inject(WebsocketService);
  private readonly authService = inject(AuthService);
  private readonly ngZone = inject(NgZone);

  sheetNames: string[] = [];
  activeSheetIndex = 0;
  private jspreadsheetInstance: any = null;
  private workbook: XLSX.WorkBook | null = null;
  private sheetsData: { data: any[][], columns: any[] }[] = [];
  
  private editingX: number | null = null;
  private editingY: number | null = null;

  selectedCellLabel = 'A1';
  selectedCellValue = '';
  formulaBarInputValue = '';
  selectedCellX: number | null = 0;
  selectedCellY: number | null = 0;
  private lastSelectionCoords: [number, number, number, number] | null = [0, 0, 0, 0];

  private wsSelectionSub: any = null;
  private wsCellChangeSub: any = null;
  private wsStructureSub: any = null;
  private remoteSelections = new Map<string, { x: number, y: number, outlineColor: string, labelEl?: HTMLElement }>();
  private isApplyingRemoteChange = false;
  private wsSyncSub: any = null;
  private pendingRemoteValues = new Map<string, any>();
  private hasRequestedState = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['fileUrl'] && changes['fileUrl'].currentValue && !changes['fileUrl'].firstChange) {
      this.loadExcelFromUrl(changes['fileUrl'].currentValue);
    }
  }

  ngAfterViewInit() {
    if (this.fileUrl) {
      this.loadExcelFromUrl(this.fileUrl);
    }
  }

  ngOnDestroy() {
    this.unsubscribeWebSockets();
    this.clearAllRemoteSelections();
    this.destroySpreadsheet();
  }

  async loadExcelFromUrl(url: string) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      this.workbook = XLSX.read(data, { type: 'array' });
      this.sheetNames = this.workbook.SheetNames;
      
      // Parse all sheets
      this.sheetsData = this.sheetNames.map(name => {
        const sheet = this.workbook!.Sheets[name];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

        // Ensure minimum size
        const minRows = Math.max(jsonData.length, 50);
        const maxCols = Math.max(...jsonData.map(row => row.length), 10);

        // Pad rows
        while (jsonData.length < minRows) {
          jsonData.push(new Array(maxCols).fill(''));
        }
        // Pad columns
        jsonData.forEach(row => {
          while (row.length < maxCols) {
            row.push('');
          }
        });

        const columns = [];
        for (let i = 0; i < maxCols; i++) {
          columns.push({ 
            title: XLSX.utils.encode_col(i), 
            width: 120 
          });
        }

        return { data: jsonData, columns };
      });

      this.renderSheet(0);
    } catch (err) {
      console.error('[SpreadsheetEditor] Error loading Excel:', err);
    }
  }

  private renderSheet(index: number) {
    this.activeSheetIndex = index;
    this.destroySpreadsheet();

    const sheetData = this.sheetsData[index];
    if (!sheetData) return;

    const container = this.containerRef.nativeElement;
    const jexcel = (window as any).jspreadsheet || (window as any).jexcel;

    if (!jexcel) {
      console.error('[SpreadsheetEditor] jspreadsheet/jexcel not loaded');
      return;
    }

    this.jspreadsheetInstance = jexcel(container, {
      data: sheetData.data,
      columns: sheetData.columns,
      minDimensions: [10, 50],
      tableOverflow: true,
      tableWidth: '100%',
      tableHeight: '100%',
      columnResize: true,
      rowResize: true,
      allowInsertRow: true,
      allowInsertColumn: true,
      allowDeleteRow: true,
      allowDeleteColumn: true,
      contextMenu: true,
      search: true, // enables search/filter
      formulas: true, // enables Excel-like formulas
      oneditionstart: (instance: any, cell: any, x: any, y: any) => {
        this.editingX = Number(x);
        this.editingY = Number(y);
        
        // Listen to keystrokes on the dynamic editor inside the cell
        // jspreadsheet-ce v4 uses <div contenteditable>, not <input>/<textarea>
        const editorInput = cell.querySelector('[contenteditable="true"], input, textarea');
        if (editorInput) {
          editorInput.addEventListener('input', (e: any) => {
            if (this.editingX !== null && this.editingY !== null) {
              const val = e.target.value !== undefined ? e.target.value : e.target.textContent;
              this.broadcastCellChange(this.editingX, this.editingY, val);
            }
          });
        }
      },
      oneditionend: (instance: any, cell: any, x: any, y: any, value: any, save: any) => {
        this.editingX = null;
        this.editingY = null;
      },
      onchange: (instance: any, cell: any, x: any, y: any, value: any) => {
        this.dataChanged.emit(true);

        // Sync Formula Bar if the change is in the active selected cell
        if (x === this.selectedCellX && y === this.selectedCellY) {
          this.selectedCellValue = value || '';
          this.formulaBarInputValue = value || '';
        }

        if (this.isApplyingRemoteChange) return;
        this.broadcastCellChange(x, y, value);
        this.reapplyRemoteSelections();

        // Apply any pending remote value that arrived while this cell was being edited
        const key = `${x},${y}`;
        if (this.pendingRemoteValues.has(key)) {
          const pendingVal = this.pendingRemoteValues.get(key);
          this.pendingRemoteValues.delete(key);
          setTimeout(() => {
            this.isApplyingRemoteChange = true;
            if (this.jspreadsheetInstance) {
              this.jspreadsheetInstance.setValueFromCoords(x, y, pendingVal);
              this.reapplyRemoteSelections();
            }
            setTimeout(() => {
              this.isApplyingRemoteChange = false;
            }, 0);
          }, 0);
        }
      },
      onselection: (instance: any, x1: any, y1: any, x2: any, y2: any) => {
        this.selectedCellX = x1;
        this.selectedCellY = y1;
        this.selectedCellLabel = XLSX.utils.encode_col(x1) + (y1 + 1);
        this.lastSelectionCoords = [
          Number(x1),
          Number(y1),
          Number(x2),
          Number(y2)
        ];
        
        // Retrieve the raw formula/value from the sheet
        const rawVal = this.jspreadsheetInstance ? this.jspreadsheetInstance.getValueFromCoords(x1, y1) : '';
        this.selectedCellValue = rawVal || '';
        this.formulaBarInputValue = rawVal || '';

        this.broadcastSelection(x1, y1);
      }
    });


    // Set initial formula bar values from A1 cell
    if (this.jspreadsheetInstance) {
      const initVal = this.jspreadsheetInstance.getValueFromCoords(0, 0);
      this.selectedCellX = 0;
      this.selectedCellY = 0;
      this.selectedCellLabel = 'A1';
      this.selectedCellValue = initVal || '';
      this.formulaBarInputValue = initVal || '';
      this.lastSelectionCoords = [0, 0, 0, 0];
    }

    this.setupWebSocketSubscriptions();
  }

  switchSheet(index: number) {
    // Save current sheet data before switching
    if (this.jspreadsheetInstance) {
      this.sheetsData[this.activeSheetIndex].data = this.jspreadsheetInstance.getData();
    }
    this.clearAllRemoteSelections();
    this.renderSheet(index);
  }

  private _applyStyleToCoords(coords: number[][], key: string, value: string) {
    if (!this.jspreadsheetInstance || !coords || coords.length === 0) return;
    const stylesObj: any = {};
    coords.forEach(c => {
      let colName = '';
      if (typeof window !== 'undefined' && (window as any)['jexcel']) {
          colName = (window as any)['jexcel'].getColumnNameFromId(c);
      } else {
          let letter = '';
          let temp = c[0];
          while (temp >= 0) {
              letter = String.fromCharCode(65 + (temp % 26)) + letter;
              temp = Math.floor(temp / 26) - 1;
          }
          colName = letter + (c[1] + 1);
      }
      stylesObj[colName] = `${key}: ${value}`;
    });
    this.jspreadsheetInstance.setStyle(stylesObj, null, null);
  }

  applyStyle(key: string, value: string) {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      if (selected && selected.length > 0) {
        // Toggle behavior for bold/italic/underline
        let currentValue = '';
        if (selected.length === 1) {
           const cell = this.jspreadsheetInstance.getCellFromCoords(selected[0][0], selected[0][1]);
           if (cell) {
             currentValue = cell.style[key as any] || '';
           }
        }

        const finalValue = (currentValue === value) ? '' : value;
        this._applyStyleToCoords(selected, key, finalValue);
      }
    }
  }

  mergeCells() {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      if (selected && selected.length > 1) {
        const col1 = Math.min(selected[0][0], selected[selected.length - 1][0]);
        const row1 = Math.min(selected[0][1], selected[selected.length - 1][1]);
        const col2 = Math.max(selected[0][0], selected[selected.length - 1][0]);
        const row2 = Math.max(selected[0][1], selected[selected.length - 1][1]);
        
        const colCount = col2 - col1 + 1;
        const rowCount = row2 - row1 + 1;
        this.jspreadsheetInstance.setMerge(XLSX.utils.encode_col(col1) + (row1 + 1), colCount, rowCount);
      }
    }
  }

  undo() {
    if (this.jspreadsheetInstance) this.jspreadsheetInstance.undo();
  }

  redo() {
    if (this.jspreadsheetInstance) this.jspreadsheetInstance.redo();
  }

  addRow() {
    if (this.jspreadsheetInstance) {
      this.jspreadsheetInstance.insertRow();
      this.broadcastStructure('insertRow', null);
    }
  }

  addColumn() {
    if (this.jspreadsheetInstance) {
      this.jspreadsheetInstance.insertColumn();
      this.broadcastStructure('insertColumn', null);
    }
  }

  deleteRow() {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      if (selected && selected.length > 0) {
        const rowIndex = selected[0][1];
        this.jspreadsheetInstance.deleteRow(rowIndex);
        this.broadcastStructure('deleteRow', rowIndex);
      }
    }
  }

  deleteColumn() {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      if (selected && selected.length > 0) {
        const colIndex = selected[0][0];
        this.jspreadsheetInstance.deleteColumn(colIndex);
        this.broadcastStructure('deleteColumn', colIndex);
      }
    }
  }

  private destroySpreadsheet() {
    if (this.jspreadsheetInstance) {
      try {
        const jexcel = (window as any).jspreadsheet || (window as any).jexcel;
        if (jexcel && typeof jexcel.destroy === 'function') {
          jexcel.destroy(this.containerRef.nativeElement);
        } else if (this.containerRef.nativeElement.jexcel && typeof this.containerRef.nativeElement.jexcel.destroy === 'function') {
          this.containerRef.nativeElement.jexcel.destroy();
        }
      } catch (e) {
        console.warn('[SpreadsheetEditor] Error destroying jspreadsheet instance:', e);
      }
      this.containerRef.nativeElement.innerHTML = '';
      this.jspreadsheetInstance = null;
    }
  }

  /** Returns the current spreadsheet data as an XLSX Blob for saving */
  getWorkbookBlob(): Blob {
    // Save current sheet data
    if (this.jspreadsheetInstance) {
      this.sheetsData[this.activeSheetIndex].data = this.jspreadsheetInstance.getData();
    }

    const wb = XLSX.utils.book_new();
    this.sheetsData.forEach((sheet, i) => {
      const ws = XLSX.utils.aoa_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(wb, ws, this.sheetNames[i] || `Hoja${i + 1}`);
    });

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  private setupWebSocketSubscriptions() {
    this.unsubscribeWebSockets();

    if (!this.uuid) {
      console.warn('[SpreadsheetEditor] No document UUID provided, skipping collaborative sync.');
      return;
    }

    const stompClient = this.wsService.getStompClient();

    // 1. Selection subscription
    this.wsSelectionSub = stompClient.watch(`/topic/spreadsheet/${this.uuid}/selection`).subscribe({
      next: (message: any) => {
        this.ngZone.run(() => {
          try {
            const payload = JSON.parse(message.body);
            this.handleRemoteSelection(payload);
          } catch (e) {
            console.error('[SpreadsheetEditor] Error parsing selection WS message:', e);
          }
        });
      }
    });

    // 2. Cell change subscription
    this.wsCellChangeSub = stompClient.watch(`/topic/spreadsheet/${this.uuid}/cell-change`).subscribe({
      next: (message: any) => {
        this.ngZone.run(() => {
          try {
            const payload = JSON.parse(message.body);
            this.handleRemoteCellChange(payload);
          } catch (e) {
            console.error('[SpreadsheetEditor] Error parsing cell change WS message:', e);
          }
        });
      }
    });

    // 3. Structure change subscription
    this.wsStructureSub = stompClient.watch(`/topic/spreadsheet/${this.uuid}/structure`).subscribe({
      next: (message: any) => {
        this.ngZone.run(() => {
          try {
            const payload = JSON.parse(message.body);
            this.handleRemoteStructure(payload);
          } catch (e) {
            console.error('[SpreadsheetEditor] Error parsing structure WS message:', e);
          }
        });
      }
    });

    // 4. State sync subscription (REQUEST_STATE / FULL_STATE)
    this.wsSyncSub = stompClient.watch(`/topic/spreadsheet/${this.uuid}/sync`).subscribe({
      next: (message: any) => {
        this.ngZone.run(() => {
          try {
            const payload = JSON.parse(message.body);
            this.handleSyncMessage(payload);
          } catch (e) {
            console.error('[SpreadsheetEditor] Error parsing sync WS message:', e);
          }
        });
      }
    });

    // Request full state from other users (they will respond with FULL_STATE)
    // Only on initial load, not on re-renders (e.g. after receiving FULL_STATE)
    if (!this.hasRequestedState) {
      this.requestFullState();
      this.hasRequestedState = true;
    }

    console.log('[SpreadsheetEditor] Subscribed to spreadsheet collaboration WebSockets for UUID:', this.uuid);
  }

  private unsubscribeWebSockets() {
    if (this.wsSelectionSub) {
      this.wsSelectionSub.unsubscribe();
      this.wsSelectionSub = null;
    }
    if (this.wsCellChangeSub) {
      this.wsCellChangeSub.unsubscribe();
      this.wsCellChangeSub = null;
    }
    if (this.wsStructureSub) {
      this.wsStructureSub.unsubscribe();
      this.wsStructureSub = null;
    }
    if (this.wsSyncSub) {
      this.wsSyncSub.unsubscribe();
      this.wsSyncSub = null;
    }
  }

  private broadcastSelection(x: number, y: number) {
    const user = this.authService.currentUser();
    if (!user || !this.uuid) return;
    try {
      this.wsService.getStompClient().publish({
        destination: `/app/spreadsheet/${this.uuid}/selection`,
        body: JSON.stringify({
          userId: user.uuid,
          userName: user.name || user.email,
          x,
          y,
          sheetIndex: this.activeSheetIndex
        })
      });
    } catch (e) {
      console.error('Error sending selection over WS:', e);
    }
  }

  private broadcastCellChange(x: number, y: number, value: any) {
    const user = this.authService.currentUser();
    if (!user || !this.uuid) return;
    try {
      this.wsService.getStompClient().publish({
        destination: `/app/spreadsheet/${this.uuid}/cell-change`,
        body: JSON.stringify({
          userId: user.uuid,
          x,
          y,
          value,
          sheetIndex: this.activeSheetIndex
        })
      });
    } catch (e) {
      console.error('Error sending cell change over WS:', e);
    }
  }

  private broadcastStructure(action: string, index: number | null, direction?: string) {
    const user = this.authService.currentUser();
    if (!user || !this.uuid) return;
    try {
      this.wsService.getStompClient().publish({
        destination: `/app/spreadsheet/${this.uuid}/structure`,
        body: JSON.stringify({
          userId: user.uuid,
          action,
          index,
          direction,
          sheetIndex: this.activeSheetIndex
        })
      });
    } catch (e) {
      console.error('Error sending structure over WS:', e);
    }
  }

  private handleRemoteSelection(payload: any) {
    const selfUser = this.authService.currentUser();
    if (!selfUser || payload.userId === selfUser.uuid) return;

    this.clearRemoteSelectionForUser(payload.userId);

    if (payload.x === null || payload.y === null || !this.jspreadsheetInstance) return;
    if (payload.sheetIndex !== undefined && payload.sheetIndex !== this.activeSheetIndex) return;

    try {
      const cell = this.jspreadsheetInstance.getCellFromCoords(payload.x, payload.y);
      if (cell) {
        const color = this.getUserColor(payload.userId);
        
        cell.style.outline = `2px solid ${color}`;
        cell.style.outlineOffset = '-2px';
        cell.style.position = 'relative';

        const label = document.createElement('div');
        label.className = `remote-selection-label-${payload.userId}`;
        label.innerText = payload.userName;
        label.style.position = 'absolute';
        label.style.top = '-14px';
        label.style.left = '0';
        label.style.backgroundColor = color;
        label.style.color = '#ffffff';
        label.style.fontSize = '9px';
        label.style.fontWeight = '600';
        label.style.padding = '1px 4px';
        label.style.borderRadius = '2px';
        label.style.zIndex = '50';
        label.style.pointerEvents = 'none';
        label.style.whiteSpace = 'nowrap';

        cell.appendChild(label);

        this.remoteSelections.set(payload.userId, {
          x: payload.x,
          y: payload.y,
          outlineColor: color,
          labelEl: label
        });
      }
    } catch (err) {
      console.error('Error drawing remote selection:', err);
    }
  }

  private reapplyRemoteSelections() {
    this.remoteSelections.forEach((prev, userId) => {
      if (!this.jspreadsheetInstance) return;
      try {
        const cell = this.jspreadsheetInstance.getCellFromCoords(prev.x, prev.y);
        if (cell && !cell.querySelector(`.remote-selection-label-${userId}`)) {
          cell.style.outline = `2px solid ${prev.outlineColor}`;
          cell.style.outlineOffset = '-2px';
          cell.style.position = 'relative';
          if (prev.labelEl) {
            cell.appendChild(prev.labelEl);
          }
        }
      } catch (err) {
        // Safe check
      }
    });
  }

  private clearRemoteSelectionForUser(userId: string) {
    const prev = this.remoteSelections.get(userId);
    if (prev && this.jspreadsheetInstance) {
      try {
        const cell = this.jspreadsheetInstance.getCellFromCoords(prev.x, prev.y);
        if (cell) {
          cell.style.outline = '';
          cell.style.outlineOffset = '';
          cell.style.position = '';
        }
        if (prev.labelEl) {
          prev.labelEl.remove();
        }
      } catch (err) {
        // Safe check
      }
      this.remoteSelections.delete(userId);
    }
  }

  private clearAllRemoteSelections() {
    if (this.remoteSelections) {
      Array.from(this.remoteSelections.keys()).forEach(userId => {
        this.clearRemoteSelectionForUser(userId);
      });
    }
  }

  private handleRemoteCellChange(payload: any) {
    const selfUser = this.authService.currentUser();
    if (!selfUser || payload.userId === selfUser.uuid) return;

    if (!this.jspreadsheetInstance) return;

    if (payload.sheetIndex !== undefined && payload.sheetIndex !== this.activeSheetIndex) {
      const sheet = this.sheetsData[payload.sheetIndex];
      if (sheet && sheet.data[payload.y]) {
        sheet.data[payload.y][payload.x] = payload.value;
      }
      return;
    }

    // If user is actively editing this cell, defer the remote change
    const targetX = Number(payload.x);
    const targetY = Number(payload.y);
    if (!isNaN(targetX) && !isNaN(targetY)) {
      if (this.editingX === targetX && this.editingY === targetY) {
        this.pendingRemoteValues.set(`${targetX},${targetY}`, payload.value);
        return;
      }
    }

    try {
      this.isApplyingRemoteChange = true;
      if (!isNaN(targetX) && !isNaN(targetY)) {
        this.jspreadsheetInstance.setValueFromCoords(targetX, targetY, payload.value);

        // Sync Formula Bar if the remote change is in our active selected cell
        if (targetX === this.selectedCellX && targetY === this.selectedCellY) {
          this.selectedCellValue = payload.value || '';
          this.formulaBarInputValue = payload.value || '';
        }
      }
      this.reapplyRemoteSelections();
    } catch (err) {
      console.error('Error applying remote cell change:', err);
    } finally {
      setTimeout(() => {
        this.isApplyingRemoteChange = false;
      }, 0);
    }
  }

  private handleRemoteStructure(payload: any) {
    const selfUser = this.authService.currentUser();
    if (!selfUser || payload.userId === selfUser.uuid) return;
    if (payload.sheetIndex !== undefined && payload.sheetIndex !== this.activeSheetIndex) return;
    if (!this.jspreadsheetInstance) return;

    try {
      this.isApplyingRemoteChange = true;
      if (payload.action === 'insertRow') {
        this.jspreadsheetInstance.insertRow();
      } else if (payload.action === 'insertRowBefore') {
        this.jspreadsheetInstance.insertRow(1, payload.index !== null ? payload.index : undefined, false);
      } else if (payload.action === 'insertRowAfter') {
        this.jspreadsheetInstance.insertRow(1, payload.index !== null ? payload.index : undefined, true);
      } else if (payload.action === 'insertColumn') {
        this.jspreadsheetInstance.insertColumn();
      } else if (payload.action === 'insertColumnBefore') {
        this.jspreadsheetInstance.insertColumn(1, payload.index !== null ? payload.index : undefined, false);
      } else if (payload.action === 'insertColumnAfter') {
        this.jspreadsheetInstance.insertColumn(1, payload.index !== null ? payload.index : undefined, true);
      } else if (payload.action === 'deleteRow') {
        if (payload.index !== null) this.jspreadsheetInstance.deleteRow(payload.index);
      } else if (payload.action === 'deleteColumn') {
        if (payload.index !== null) this.jspreadsheetInstance.deleteColumn(payload.index);
      } else if (payload.action === 'sort') {
        if (payload.index !== null) {
          this.jspreadsheetInstance.orderBy(payload.index, payload.direction === 'desc' ? 1 : 0);
        }
      }
    } catch (err) {
      console.error('Error applying remote structure:', err);
    } finally {
      this.isApplyingRemoteChange = false;
    }
  }

  onFormulaBarInput(event: any) {
    this.formulaBarInputValue = event.target.value;
  }

  onFormulaBarSubmit() {
    if (this.selectedCellX !== null && this.selectedCellY !== null && this.jspreadsheetInstance) {
      this.jspreadsheetInstance.setValueFromCoords(this.selectedCellX, this.selectedCellY, this.formulaBarInputValue);
      this.selectedCellValue = this.formulaBarInputValue;
      this.broadcastCellChange(this.selectedCellX, this.selectedCellY, this.formulaBarInputValue);
      this.dataChanged.emit(true);
    }
  }

  onFillColorChange(event: any) {
    const color = event.target.value;
    this.applyStyle('background-color', color);
  }

  onTextColorChange(event: any) {
    const color = event.target.value;
    this.applyStyle('color', color);
  }

  onFontFamilyChange(event: any) {
    const family = event.target.value;
    if (family) {
      this.applyStyle('font-family', family);
    }
  }

  onFontSizeChange(event: any) {
    const size = event.target.value;
    if (size) {
      this.applyStyle('font-size', size);
    }
  }

  formatCurrency() {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      if (selected && selected.length > 0) {
        selected.forEach((cellCoords: any) => {
          const x = cellCoords[0];
          const y = cellCoords[1];
          const val = this.jspreadsheetInstance.getValueFromCoords(x, y);
          const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) {
            const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
            this.jspreadsheetInstance.setValueFromCoords(x, y, formatted);
            this.broadcastCellChange(x, y, formatted);
          }
        });
        this.dataChanged.emit(true);
      }
    }
  }

  formatPercent() {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      if (selected && selected.length > 0) {
        selected.forEach((cellCoords: any) => {
          const x = cellCoords[0];
          const y = cellCoords[1];
          const val = this.jspreadsheetInstance.getValueFromCoords(x, y);
          const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) {
            const formatted = (num * 100).toFixed(2) + '%';
            this.jspreadsheetInstance.setValueFromCoords(x, y, formatted);
            this.broadcastCellChange(x, y, formatted);
          }
        });
        this.dataChanged.emit(true);
      }
    }
  }

  adjustDecimals(increase: boolean) {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      if (selected && selected.length > 0) {
        selected.forEach((cellCoords: any) => {
          const x = cellCoords[0];
          const y = cellCoords[1];
          const val = this.jspreadsheetInstance.getValueFromCoords(x, y);
          const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) {
            const valStr = num.toString();
            const dotIdx = valStr.indexOf('.');
            let decimals = dotIdx === -1 ? 0 : valStr.length - dotIdx - 1;
            decimals = increase ? decimals + 1 : Math.max(0, decimals - 1);
            const formatted = num.toFixed(decimals);
            this.jspreadsheetInstance.setValueFromCoords(x, y, formatted);
            this.broadcastCellChange(x, y, formatted);
          }
        });
        this.dataChanged.emit(true);
      }
    }
  }

  clearStyles() {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      if (selected && selected.length > 0) {
        const styles = ['font-weight', 'font-style', 'text-decoration', 'text-align', 'color', 'background-color', 'font-size', 'font-family', 'vertical-align', 'white-space', 'border', 'border-top', 'border-bottom', 'border-left', 'border-right'];
        styles.forEach(style => {
          this._applyStyleToCoords(selected, style, '');
        });
        this.dataChanged.emit(true);
      }
    }
  }

  applyVerticalAlign(align: string) {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      if (selected && selected.length > 0) {
        this._applyStyleToCoords(selected, 'vertical-align', align);
        this.dataChanged.emit(true);
      }
    }
  }

  toggleWrapText() {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      if (selected && selected.length > 0) {
        let isWrapped = false;
        const cell = this.jspreadsheetInstance.getCellFromCoords(selected[0][0], selected[0][1]);
        if (cell && cell.style.whiteSpace === 'normal') {
          isWrapped = true;
        }
        const newValue = isWrapped ? '' : 'normal';
        this._applyStyleToCoords(selected, 'white-space', newValue);
        this.dataChanged.emit(true);
      }
    }
  }

  onBorderChange(event: any) {
    const type = event.target.value;
    if (type) {
      this.applyBorders(type);
    }
    event.target.value = '';
  }

  applyBorders(type: string) {
    if (!this.jspreadsheetInstance) return;
    const selected = this.getSelectedCoords();
    if (!selected || selected.length === 0) return;

    const borderColor = 'hsl(var(--foreground) / 0.4)';

    if (type === 'none') {
      this._applyStyleToCoords(selected, 'border', '');
      this._applyStyleToCoords(selected, 'border-top', '');
      this._applyStyleToCoords(selected, 'border-bottom', '');
      this._applyStyleToCoords(selected, 'border-left', '');
      this._applyStyleToCoords(selected, 'border-right', '');
    } else if (type === 'all') {
      this._applyStyleToCoords(selected, 'border', `1px solid ${borderColor}`);
    } else if (type === 'bottom') {
      this._applyStyleToCoords(selected, 'border-bottom', `2px solid ${borderColor}`);
    } else if (type === 'top') {
      this._applyStyleToCoords(selected, 'border-top', `2px solid ${borderColor}`);
    } else if (type === 'left') {
      this._applyStyleToCoords(selected, 'border-left', `2px solid ${borderColor}`);
    } else if (type === 'right') {
      this._applyStyleToCoords(selected, 'border-right', `2px solid ${borderColor}`);
    } else if (type === 'outer') {
      const col1 = Math.min(...selected.map((c: any) => c[0]));
      const row1 = Math.min(...selected.map((c: any) => c[1]));
      const col2 = Math.max(...selected.map((c: any) => c[0]));
      const row2 = Math.max(...selected.map((c: any) => c[1]));

      for (let c = col1; c <= col2; c++) {
        for (let r = row1; r <= row2; r++) {
          const cellSelected = [[c, r]];
          if (r === row1) this._applyStyleToCoords(cellSelected, 'border-top', `2px solid ${borderColor}`);
          if (r === row2) this._applyStyleToCoords(cellSelected, 'border-bottom', `2px solid ${borderColor}`);
          if (c === col1) this._applyStyleToCoords(cellSelected, 'border-left', `2px solid ${borderColor}`);
          if (c === col2) this._applyStyleToCoords(cellSelected, 'border-right', `2px solid ${borderColor}`);
        }
      }
    }
    this.dataChanged.emit(true);
  }

  onFormatChange(event: any) {
    const format = event.target.value;
    if (format) {
      if (format === 'number') this.formatNumber();
      else if (format === 'currency') this.formatCurrency();
      else if (format === 'percent') this.formatPercent();
      else if (format === 'date') this.formatDate();
      else if (format === 'text') this.formatText();
    }
    event.target.value = '';
  }

  formatNumber() {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      if (selected && selected.length > 0) {
        selected.forEach((cellCoords: any) => {
          const x = cellCoords[0];
          const y = cellCoords[1];
          const val = this.jspreadsheetInstance.getValueFromCoords(x, y);
          const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) {
            const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
            this.jspreadsheetInstance.setValueFromCoords(x, y, formatted);
            this.broadcastCellChange(x, y, formatted);
          }
        });
        this.dataChanged.emit(true);
      }
    }
  }

  formatDate() {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      if (selected && selected.length > 0) {
        selected.forEach((cellCoords: any) => {
          const x = cellCoords[0];
          const y = cellCoords[1];
          const val = this.jspreadsheetInstance.getValueFromCoords(x, y);
          if (val) {
            const date = new Date(val);
            if (!isNaN(date.getTime())) {
              const formatted = date.toISOString().split('T')[0];
              this.jspreadsheetInstance.setValueFromCoords(x, y, formatted);
              this.broadcastCellChange(x, y, formatted);
            }
          }
        });
        this.dataChanged.emit(true);
      }
    }
  }

  formatText() {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      if (selected && selected.length > 0) {
        selected.forEach((cellCoords: any) => {
          const x = cellCoords[0];
          const y = cellCoords[1];
          const val = this.jspreadsheetInstance.getValueFromCoords(x, y);
          const formatted = String(val);
          this.jspreadsheetInstance.setValueFromCoords(x, y, formatted);
          this.broadcastCellChange(x, y, formatted);
        });
        this.dataChanged.emit(true);
      }
    }
  }

  sortColumn(ascending: boolean) {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      if (selected && selected.length > 0) {
        const colIndex = selected[0][0];
        this.jspreadsheetInstance.orderBy(colIndex, ascending ? 0 : 1);
        this.broadcastStructure('sort', colIndex, ascending ? 'asc' : 'desc');
        this.dataChanged.emit(true);
      }
    }
  }

  clearContents() {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      if (selected && selected.length > 0) {
        selected.forEach((cellCoords: any) => {
          const x = cellCoords[0];
          const y = cellCoords[1];
          this.jspreadsheetInstance.setValueFromCoords(x, y, '');
          this.broadcastCellChange(x, y, '');
        });
        this.dataChanged.emit(true);
      }
    }
  }

  clearAll() {
    if (this.jspreadsheetInstance) {
      this.clearContents();
      this.clearStyles();
    }
  }

  onGridAction(event: any) {
    const action = event.target.value;
    if (!action) return;
    if (action === 'row-before') this.addRowBefore();
    else if (action === 'row-after') this.addRowAfter();
    else if (action === 'col-before') this.addColumnBefore();
    else if (action === 'col-after') this.addColumnAfter();
    else if (action === 'del-row') this.deleteRow();
    else if (action === 'del-col') this.deleteColumn();
    event.target.value = '';
  }

  addRowBefore() {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      const rowIndex = (selected && selected.length > 0) ? selected[0][1] : 0;
      this.jspreadsheetInstance.insertRow(1, rowIndex, false);
      this.broadcastStructure('insertRowBefore', rowIndex);
    }
  }

  addRowAfter() {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      const rowIndex = (selected && selected.length > 0) ? selected[0][1] : 0;
      this.jspreadsheetInstance.insertRow(1, rowIndex, true);
      this.broadcastStructure('insertRowAfter', rowIndex);
    }
  }

  addColumnBefore() {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      const colIndex = (selected && selected.length > 0) ? selected[0][0] : 0;
      this.jspreadsheetInstance.insertColumn(1, colIndex, false);
      this.broadcastStructure('insertColumnBefore', colIndex);
    }
  }

  addColumnAfter() {
    if (this.jspreadsheetInstance) {
      const selected = this.getSelectedCoords();
      const colIndex = (selected && selected.length > 0) ? selected[0][0] : 0;
      this.jspreadsheetInstance.insertColumn(1, colIndex, true);
      this.broadcastStructure('insertColumnAfter', colIndex);
    }
  }

  onZoomChange(event: any) {
    const scale = event.target.value;
    if (this.containerRef && this.containerRef.nativeElement) {
      const jexcelTable = this.containerRef.nativeElement.querySelector('.jexcel');
      if (jexcelTable) {
        jexcelTable.style.zoom = scale;
      }
    }
  }

  onSearchInput(event: any) {
    if (this.jspreadsheetInstance) {
      this.jspreadsheetInstance.search(event.target.value);
    }
  }

  downloadExcel() {
    const blob = this.getWorkbookBlob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.fileName || 'planilla.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /** Get selected cell coordinates from the jspreadsheet instance.
   *  jspreadsheet-ce v4 does NOT have a getSelected() method.
   *  Uses highlighted DOM elements (data-x/data-y attributes) as primary source.
   *  Falls back to selectedCell property [x1,y1,x2,y2] which persists after
   *  toolbar button clicks (they trigger resetSelection(true) which clears
   *  highlighted but preserves selectedCell). */
  private getSelectedCoords(): [number, number][] {
    if (!this.jspreadsheetInstance) return [];

    // 1. Try highlighted DOM elements (direct DOM state)
    const highlighted = this.jspreadsheetInstance.highlighted;
    if (highlighted && highlighted.length > 0) {
      const coords: [number, number][] = [];
      for (const cell of highlighted) {
        const x = parseInt(cell.getAttribute('data-x'));
        const y = parseInt(cell.getAttribute('data-y'));
        if (!isNaN(x) && !isNaN(y)) {
          coords.push([x, y]);
        }
      }
      if (coords.length > 0) return coords;
    }

    // 2. Fallback: selectedCell persists after resetSelection(true) called by
    //    document-level mousedown listener when clicking toolbar buttons.
    const sc = this.jspreadsheetInstance.selectedCell;
    if (sc && sc.length >= 4) {
      const x1 = Math.min(sc[0], sc[2]);
      const y1 = Math.min(sc[1], sc[3]);
      const x2 = Math.max(sc[0], sc[2]);
      const y2 = Math.max(sc[1], sc[3]);
      const coords: [number, number][] = [];
      for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
          coords.push([x, y]);
        }
      }
      return coords;
    }

    // 3. Fallback: our tracked lastSelectionCoords from onselection callback
    //    which is never cleared by resetSelection().
    if (this.lastSelectionCoords && this.lastSelectionCoords.length >= 4) {
      const x1 = Math.min(this.lastSelectionCoords[0], this.lastSelectionCoords[2]);
      const y1 = Math.min(this.lastSelectionCoords[1], this.lastSelectionCoords[3]);
      const x2 = Math.max(this.lastSelectionCoords[0], this.lastSelectionCoords[2]);
      const y2 = Math.max(this.lastSelectionCoords[1], this.lastSelectionCoords[3]);
      const coords: [number, number][] = [];
      for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
          coords.push([x, y]);
        }
      }
      return coords;
    }

    return [];
  }

  private getUserColor(userId: string): string {
    const PRESET_COLORS = [
      '#3B82F6', // Blue
      '#10B981', // Emerald
      '#8B5CF6', // Violet
      '#F59E0B', // Amber
      '#EF4444', // Rose
      '#06B6D4', // Cyan
      '#EC4899', // Pink
      '#6366F1'  // Indigo
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PRESET_COLORS.length;
    return PRESET_COLORS[index];
  }

  private requestFullState() {
    if (!this.uuid) return;
    const user = this.authService.currentUser();
    if (!user) return;
    try {
      this.wsService.getStompClient().publish({
        destination: `/app/spreadsheet/${this.uuid}/sync`,
        body: JSON.stringify({
          type: 'REQUEST_STATE',
          userId: user.uuid
        })
      });
    } catch (e) {
      console.error('Error requesting full state:', e);
    }
  }

  private handleSyncMessage(payload: any) {
    const selfUser = this.authService.currentUser();
    if (!selfUser) return;

    if (payload.type === 'REQUEST_STATE' && payload.userId !== selfUser.uuid) {
      this.sendFullState();
    } else if (payload.type === 'FULL_STATE' && payload.userId !== selfUser.uuid) {
      this.applyFullState(payload);
    }
  }

  private sendFullState() {
    const user = this.authService.currentUser();
    if (!user || !this.uuid) return;

    // Save current sheet data from the live instance before sending
    if (this.jspreadsheetInstance) {
      this.sheetsData[this.activeSheetIndex].data = this.jspreadsheetInstance.getData();
    }

    try {
      this.wsService.getStompClient().publish({
        destination: `/app/spreadsheet/${this.uuid}/sync`,
        body: JSON.stringify({
          type: 'FULL_STATE',
          userId: user.uuid,
          sheets: this.sheetsData,
          activeSheetIndex: this.activeSheetIndex
        })
      });
    } catch (e) {
      console.error('Error sending full state:', e);
    }
  }

  private applyFullState(payload: any) {
    if (!payload.sheets) return;
    try {
      this.sheetsData = payload.sheets;
      const targetSheet = payload.activeSheetIndex !== undefined ? payload.activeSheetIndex : 0;
      this.renderSheet(targetSheet);
    } catch (err) {
      console.error('Error applying full state:', err);
    }
  }
}
