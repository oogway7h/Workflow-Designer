import { Component, inject, signal, computed, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../../core/services/profile.service';
import {
  LucideAngularModule,
  ChevronRight, ChevronLeft, CheckCircle,
  LayoutDashboard, Inbox, Bot,
  Users, Building2, Shield, PenTool, Sparkles, GitBranch,
  ClipboardList, BellRing, FileCheck
} from 'lucide-angular';

import type { LucideIconData } from 'lucide-angular/icons/types';

interface TourStep { icon: LucideIconData; title: string; description: string; }

const STEPS_ADMIN: TourStep[] = [
  {
    icon: LayoutDashboard,
    title: '¡Bienvenido, Administrador! 🎉',
    description: 'Tu dashboard muestra KPIs globales: políticas activas, usuarios registrados, departamentos e instancias en curso. Tendrás visibilidad completa del sistema.',
  },
  {
    icon: Users,
    title: 'Gestión de Usuarios 👥',
    description: 'Desde el menú "Usuarios" puedes crear, editar y desactivar usuarios. Asigna roles (ADMIN, MANAGER, DESIGNER, EMPLOYEE) y departamentos a cada persona.',
  },
  {
    icon: Building2,
    title: 'Departamentos y Roles 🏢',
    description: 'Administra los departamentos de tu organización y define los permisos de cada rol. Esto controla qué puede ver y hacer cada tipo de usuario.',
  },
  {
    icon: Shield,
    title: 'Supervisión de Políticas 📊',
    description: 'Puedes ver todas las políticas del sistema sin importar quién las creó. El gráfico de torta en tu dashboard muestra la distribución por estado.',
  },
  {
    icon: Bot,
    title: 'Asistente de IA 🤖',
    description: 'El asistente flotante en la esquina inferior derecha responde preguntas sobre el sistema, genera reportes y te ayuda a entender los flujos.',
  },
];

const STEPS_DESIGNER: TourStep[] = [
  {
    icon: GitBranch,
    title: '¡Bienvenido, Diseñador! 🎨',
    description: 'Tu espacio es el Diseñador de Políticas. Aquí construyes flujos de trabajo UML 2.5 con nodos de actividad, decisiones, forks, señales y objetos.',
  },
  {
    icon: PenTool,
    title: 'Editor de Diagramas ✏️',
    description: 'Arrastra nodos desde el panel izquierdo al canvas. Usa la herramienta "Conectar" para unir nodos con flechas sólidas (control) o punteadas (objeto). Haz doble clic en un nodo para editar su formulario dinámico.',
  },
  {
    icon: Sparkles,
    title: 'Generación con IA ✨',
    description: 'Usa el botón "Generar con IA" en el diseñador y describe el proceso en lenguaje natural. La IA construirá automáticamente el diagrama UML completo por ti.',
  },
  {
    icon: Users,
    title: 'Colaboración en Tiempo Real 🔗',
    description: 'Comparte tu política con otros diseñadores usando el botón "Compartir". Verás los cursores de tus colaboradores en tiempo real mientras editan juntos.',
  },
  {
    icon: Bot,
    title: 'Asistente de IA 🤖',
    description: 'El asistente flotante puede explicarte conceptos UML, sugerir mejoras a tus flujos y ayudarte a definir condiciones de transición.',
  },
];

const STEPS_MANAGER: TourStep[] = [
  {
    icon: LayoutDashboard,
    title: '¡Bienvenido, Gestor! 📋',
    description: 'Tu dashboard muestra las políticas que administras, instancias activas y solicitudes pendientes de aprobación. Tienes control sobre los flujos asignados a tu área.',
  },
  {
    icon: ClipboardList,
    title: 'Solicitudes Entrantes 📥',
    description: 'El panel "Solicitudes" muestra peticiones externas o internas que esperan que inicies un nuevo flujo. Puedes aceptarlas y asignarlas al proceso correspondiente.',
  },
  {
    icon: Inbox,
    title: 'Bandeja de Tareas 📬',
    description: 'Aquí aparecen las tareas que están en tu turno dentro de un flujo activo. Completa los formularios dinámicos para avanzar el proceso al siguiente paso.',
  },
  {
    icon: FileCheck,
    title: 'Aprobación de Políticas ✅',
    description: 'Antes de que una política pueda ejecutarse, el gestor asignado debe revisarla. Puedes aprobar, rechazar o solicitar cambios desde la vista de políticas.',
  },
  {
    icon: Bot,
    title: 'Asistente de IA 🤖',
    description: 'El asistente flotante puede resumirte el estado de tus procesos activos, explicar decisiones tomadas en el historial y ayudarte a tomar decisiones.',
  },
];

const STEPS_EMPLOYEE: TourStep[] = [
  {
    icon: LayoutDashboard,
    title: '¡Bienvenido al Sistema! 👋',
    description: 'Tu dashboard muestra un resumen de tus tareas pendientes y el estado de los procesos en los que participas. Todo lo que necesitas está a un clic de distancia.',
  },
  {
    icon: Inbox,
    title: 'Tu Bandeja de Tareas 📬',
    description: 'Esta es tu área principal de trabajo. Aquí aparecen las tareas que te han sido asignadas dentro de flujos activos. Haz clic en una tarea para ver su formulario.',
  },
  {
    icon: FileCheck,
    title: 'Formularios Dinámicos 📝',
    description: 'Cada tarea puede tener un formulario diferente según lo definido en la política. Rellena los campos y envía para avanzar el proceso al siguiente responsable.',
  },
  {
    icon: BellRing,
    title: 'Notificaciones 🔔',
    description: 'Recibirás notificaciones cuando se te asigne una nueva tarea o cuando el estado de un proceso cambie. Revisa el ícono de campana en la barra superior.',
  },
  {
    icon: Bot,
    title: 'Asistente de IA 🤖',
    description: 'El asistente flotante puede explicarte en qué consiste cada tarea, qué datos necesitas ingresar y cuál es el siguiente paso esperado en el proceso.',
  },
];

const STEPS_DEFAULT: TourStep[] = [
  {
    icon: LayoutDashboard,
    title: '¡Bienvenido al Motor de Workflows! 🎉',
    description: 'Este es tu panel de control principal. Aquí encontrarás un resumen de toda la actividad del sistema y tus métricas más importantes.',
  },
  {
    icon: Inbox,
    title: 'Tu Bandeja de Tareas 📋',
    description: 'Aquí encontrarás todas las tareas pendientes que requieren tu atención. Podrás completar formularios y avanzar los flujos de trabajo.',
  },
  {
    icon: Bot,
    title: 'Asistente de IA 🤖',
    description: 'En la esquina inferior derecha encontrarás nuestro Asistente de IA flotante. Úsalo para obtener ayuda, analizar procesos o resolver dudas.',
  },
];

function stepsForRole(role: string | null | undefined): TourStep[] {
  switch (role?.toUpperCase()) {
    case 'ADMIN':    return STEPS_ADMIN;
    case 'DESIGNER': return STEPS_DESIGNER;
    case 'MANAGER':  return STEPS_MANAGER;
    case 'EMPLOYEE': return STEPS_EMPLOYEE;
    default:         return STEPS_DEFAULT;
  }
}

@Component({
  selector: 'app-tour-overlay',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
         (click)="skip()">

      <!-- Modal card - stop click propagation -->
      <div class="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-8 text-center"
           (click)="$event.stopPropagation()">

        <!-- Step indicator -->
        <div class="flex justify-center gap-2 mb-6">
          @for (step of steps(); track $index) {
            <div class="h-2 rounded-full transition-all duration-300"
                 [class.w-8]="current() === $index"
                 [class.w-2]="current() !== $index"
                 [class.bg-primary]="current() === $index"
                 [class.bg-muted]="current() !== $index">
            </div>
          }
        </div>

        <!-- Icon -->
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <lucide-icon [img]="currentStep().icon" [size]="32" class="text-primary" />
        </div>

        <!-- Content -->
        <h2 class="text-xl font-bold text-foreground mb-3">{{ currentStep().title }}</h2>
        <p class="text-sm text-muted-foreground leading-relaxed mb-8">{{ currentStep().description }}</p>

        <!-- Actions -->
        <div class="flex items-center justify-between">
          <button (click)="skip()"
            class="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
            Saltar tour
          </button>

          <div class="flex items-center gap-2">
            @if (current() > 0) {
              <button (click)="prev()"
                class="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors">
                <lucide-icon [img]="ChevronLeftIcon" [size]="16" /> Anterior
              </button>
            }
            @if (current() < steps().length - 1) {
              <button (click)="next()"
                class="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                Siguiente <lucide-icon [img]="ChevronRightIcon" [size]="16" />
              </button>
            } @else {
              <button (click)="finish()"
                class="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors">
                <lucide-icon [img]="CheckCircleIcon" [size]="16" /> ¡Empezar!
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TourOverlayComponent {
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly CheckCircleIcon = CheckCircle;

  private readonly profileService = inject(ProfileService);

  readonly done = output<void>();
  readonly role = input<string | null>(null);

  steps = computed(() => stepsForRole(this.role()));
  current = signal(0);

  currentStep() {
    return this.steps()[this.current()];
  }

  next(): void {
    if (this.current() < this.steps().length - 1) {
      this.current.update(v => v + 1);
    }
  }

  prev(): void {
    if (this.current() > 0) {
      this.current.update(v => v - 1);
    }
  }

  skip(): void {
    this.markDone();
  }

  finish(): void {
    this.markDone();
  }

  private markDone(): void {
    this.profileService.completeTour().subscribe({ error: () => {} });
    this.done.emit();
  }
}
