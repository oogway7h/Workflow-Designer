import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule, Sparkles, FileText, FileSpreadsheet, FileDown, Download, AlertTriangle, Play, CheckCircle } from 'lucide-angular';
import { DynamicReportsService, KpiItem } from '../../../core/services/dynamic-reports.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-reports-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <lucide-icon [img]="SparklesIcon" class="text-indigo-500 w-8 h-8 animate-pulse"></lucide-icon>
            Reportes e IA
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Genera reportes a medida y KPIs en tiempo real a partir de indicaciones en lenguaje natural (NLP).
          </p>
        </div>
      </div>

      <!-- Prompt Input Panel (Glassmorphism) -->
      <div class="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div class="absolute -right-16 -top-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl"></div>
        <div class="absolute -left-16 -bottom-16 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl"></div>

        <form (ngSubmit)="onGenerate()" class="space-y-6 relative z-10">
          <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              ¿Qué información necesitas hoy?
            </label>
            <textarea
              [(ngModel)]="prompt"
              name="prompt"
              rows="3"
              placeholder="Ej: Muestra todas las instancias del departamento de Legal del mes pasado con montos superiores a 10000 e indica el promedio..."
              class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:text-white"
              [disabled]="loading()"
            ></textarea>
          </div>

          <!-- Options -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <!-- Format Selector -->
            <div>
              <span class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Formato del Documento
              </span>
              <div class="flex flex-wrap gap-2">
                <button
                  *ngFor="let fmt of formats"
                  type="button"
                  (click)="selectedFormat.set(fmt.value)"
                  class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border transition-all"
                  [ngClass]="selectedFormat() === fmt.value 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'"
                  [disabled]="loading()"
                >
                  <lucide-icon [img]="fmt.icon" class="w-4 h-4"></lucide-icon>
                  {{ fmt.label }}
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="!prompt.trim() || loading()"
              class="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all transform hover:scale-[1.02] shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <lucide-icon *ngIf="!loading()" [img]="PlayIcon" class="w-4 h-4"></lucide-icon>
              <span *ngIf="loading()" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              {{ loading() ? 'Compilando Consulta...' : 'Generar Reporte' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Loading State (Skeleton) -->
      <div *ngIf="loading()" class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        <div class="bg-slate-100 dark:bg-slate-800/50 h-32 rounded-2xl"></div>
        <div class="bg-slate-100 dark:bg-slate-800/50 h-32 rounded-2xl"></div>
        <div class="bg-slate-100 dark:bg-slate-800/50 h-32 rounded-2xl"></div>
      </div>

      <!-- Result Panel -->
      <div *ngIf="result() && !loading()" class="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
        
        <!-- Document Info & Download -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                Listo
              </span>
              <h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ result()?.title }}</h2>
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ result()?.description }}</p>
          </div>

          <a
            [href]="result()?.downloadUrl"
            target="_blank"
            class="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-500/20"
          >
            <lucide-icon [img]="DownloadIcon" class="w-4 h-4"></lucide-icon>
            Descargar {{ selectedFormat().toUpperCase() }}
          </a>
        </div>

        <!-- KPIs Cards -->
        <div *ngIf="result()?.kpis && result()!.kpis.length > 0">
          <h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            Métricas Clave (KPIs)
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
              *ngFor="let kpi of result()?.kpis"
              class="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl group hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300 transform hover:-translate-y-1"
            >
              <!-- Decorative Ambient light -->
              <div class="absolute -right-8 -top-8 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl group-hover:scale-150 transition-all duration-500"></div>

              <div class="flex items-center justify-between mb-4">
                <span class="text-xs text-indigo-400 font-semibold tracking-wider uppercase bg-indigo-500/10 px-2 py-0.5 rounded-full">
                  KPI
                </span>
              </div>
              <div class="text-3xl font-extrabold tracking-tight mb-1">
                {{ formatKpiValue(kpi.value, kpi.format) }}
              </div>
              <p class="text-xs text-slate-400 font-medium leading-tight">
                {{ kpi.title }}
              </p>
            </div>
          </div>
        </div>

        <!-- Visualization and Data Table Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          <!-- Chart Card -->
          <div *ngIf="chartData() as chart" class="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-lg">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Visualización del Reporte
            </h3>
            
            <!-- Bar Chart -->
            <div *ngIf="chart.type === 'bar'" class="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              <div *ngFor="let bar of chart.bars">
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-600 dark:text-slate-400 font-medium truncate max-w-[200px]" [title]="bar.label">
                    {{ bar.label }}
                  </span>
                  <span class="font-bold text-slate-900 dark:text-white">
                    {{ bar.value }}
                  </span>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div class="bg-indigo-600 rounded-full h-2 transition-all duration-500" [style.width.%]="bar.pct"></div>
                </div>
              </div>
            </div>

            <!-- Pie Chart -->
            <div *ngIf="chart.type === 'pie'" class="flex flex-col sm:flex-row items-center justify-around gap-6">
              <svg width="160" height="160" viewBox="0 0 160 160" class="shrink-0">
                <path *ngFor="let slice of chart.slices" [attr.d]="slice.path" [attr.fill]="slice.fill" stroke="white" stroke-width="2"></path>
                <circle cx="80" cy="80" r="45" fill="white" class="dark:fill-slate-900"></circle>
              </svg>
              <div class="space-y-2 max-h-[200px] overflow-y-auto pr-1 shrink-0">
                <div *ngFor="let slice of chart.slices" class="flex items-center gap-2 text-xs">
                  <span class="h-2.5 w-2.5 rounded-full shrink-0" [style.background]="slice.fill"></span>
                  <span class="text-slate-600 dark:text-slate-400 truncate max-w-[120px]" [title]="slice.label">{{ slice.label }}</span>
                  <span class="font-bold text-slate-900 dark:text-white">{{ slice.value }} ({{ slice.percentage }}%)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Data Table Card -->
          <div [class]="chartData() ? 'lg:col-span-3' : 'lg:col-span-5'" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-lg overflow-hidden">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Detalle de los Datos
            </h3>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-800/20">
                    <th *ngFor="let col of result()?.columns" class="p-3 font-semibold">{{ col.label }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr *ngFor="let row of result()?.data" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    <td *ngFor="let col of result()?.columns" class="p-3 text-slate-700 dark:text-slate-300">
                      {{ row[col.key] }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      <!-- No Results / Empty State -->
      <div *ngIf="!result() && !loading()" class="text-center py-16 bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
        <div class="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <lucide-icon [img]="SparklesIcon" class="w-8 h-8"></lucide-icon>
        </div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">Empieza a preguntar</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Describe el tipo de reporte o datos corporativos que deseas extraer. 
        </p>
      </div>

    </div>
  `
})
export class ReportsPanelComponent implements OnInit {
  private reportsService = inject(DynamicReportsService);
  private route = inject(ActivatedRoute);

  readonly SparklesIcon = Sparkles;
  readonly FileTextIcon = FileText;
  readonly FileSpreadsheetIcon = FileSpreadsheet;
  readonly FileDownIcon = FileDown;
  readonly DownloadIcon = Download;
  readonly PlayIcon = Play;

  prompt = '';
  selectedFormat = signal<'pdf' | 'csv' | 'xlsx' | 'docx'>('pdf');
  loading = signal(false);
  result = signal<any | null>(null);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const voicePrompt = params['prompt'];
      if (voicePrompt && voicePrompt.trim()) {
        this.prompt = voicePrompt.trim();
        this.onGenerate();
      }
    });
  }

  chartData = computed(() => {
    const res = this.result();
    if (!res || !res.chart || !res.data || res.data.length === 0) return null;

    const chartConfig = res.chart;
    const xKey = chartConfig.x_key;
    const yKey = chartConfig.y_key;
    const type = chartConfig.type || 'bar';

    const rawData = res.data;
    const values = rawData.map((row: any) => {
      const val = parseFloat(row[yKey]);
      return isNaN(val) ? 0 : val;
    });

    const maxValue = Math.max(...values, 1);

    if (type === 'bar') {
      return {
        type: 'bar',
        bars: rawData.map((row: any) => {
          const label = row[xKey] ? row[xKey].toString() : 'Desconocido';
          const val = parseFloat(row[yKey]);
          const numVal = isNaN(val) ? 0 : val;
          const pct = Math.min(100, Math.round((numVal / maxValue) * 100));
          return { label, value: numVal, pct };
        })
      };
    } else if (type === 'pie') {
      const total = values.reduce((sum: number, v: number) => sum + v, 0);
      if (total === 0) return null;

      let startAngle = -Math.PI / 2;
      const slices = rawData.map((row: any, i: number) => {
        const label = row[xKey] ? row[xKey].toString() : 'Desconocido';
        const val = parseFloat(row[yKey]);
        const numVal = isNaN(val) ? 0 : val;
        const angle = (numVal / total) * 2 * Math.PI;
        const endAngle = startAngle + angle;

        const cx = 80, cy = 80, r = 70;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const largeArc = angle > Math.PI ? 1 : 0;
        const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;

        startAngle = endAngle;

        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];
        const fill = colors[i % colors.length];

        return {
          label,
          value: numVal,
          percentage: Math.round((numVal / total) * 100),
          path,
          fill
        };
      }).filter((s: any) => s.value > 0);

      return { type: 'pie', slices, total };
    }

    return null;
  });

  formats: { value: 'pdf' | 'csv' | 'xlsx' | 'docx'; label: string; icon: any }[] = [
    { value: 'pdf', label: 'PDF Documento', icon: FileText },
    { value: 'xlsx', label: 'Excel (XLSX)', icon: FileSpreadsheet },
    { value: 'docx', label: 'Word (DOCX)', icon: FileText },
    { value: 'csv', label: 'CSV Plano', icon: FileDown }
  ];

  onGenerate() {
    if (!this.prompt.trim() || this.loading()) return;

    this.loading.set(true);
    this.reportsService.generateReport(this.prompt.trim(), this.selectedFormat())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.result.set(res);
        },
        error: (err) => {
          console.error(err);
          // Opcional: mostrar una notificación de error en UI
        }
      });
  }

  formatKpiValue(value: string, format: string): string {
    const num = parseFloat(value);
    if (isNaN(num)) return value;

    switch (format?.toLowerCase()) {
      case 'currency':
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
      case 'percentage':
        return `${num.toFixed(1)}%`;
      case 'hours':
        return `${num.toFixed(1)} hrs`;
      case 'number':
      default:
        return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(num);
    }
  }
}
