### MEJORAR LAS VISTAS DE LAS PASTALLAS

quiero que cambies algunas cosas de estas pantallas porque no es lo optimo para en cuanto a facilidad de uso.

### GESTOR

**_Políticas asignadas_**: cuando en una politica se asigna a un funcionario una actividad deberia mostrase en la tarjeta de la actividad el nombre del funcionario en la parte inferior en la tarjeta. Tambien cuando se le da al boton de "Asignar funcionario" aqui deberia mostrarse solo los que tengan el rol de funcionario en ese departamento, pero eso no se esta filtrando así.

**_Iniciar instancia_**: cuando se le de al boton de iniciar instancia en lugar de toast que sale en la parte inferior quiero que me salga un check en el centro de la pantalla que me indique que se inició la instancia de esa politica, esto con el fin de darle protagonismo a eso que es muy importante.

**_Instancias activas_**: en los detalles de la actividad en el campo que sea boolean en lugar de poner false o true pon algo como CONFIRMADO(true) O NEGADO(false)

**_Historial_**: arregla este componente, muestra tarjetas pero estan vacias este es el json donde se muestran los historiales(el enpoint al que apuntas deberia ser api/workflow/instance/{instanceUuid}/history):

```json
[
  {
    "instanceId": "string",
    "taskName": "string",
    "action": "string",
    "completedBy": "string",
    "timestamp": "2026-04-25T16:15:01.175Z"
  }
]
```

### FUNCIONARIO

**_Bandeja de Entrada_**: la tarjeta debe mostrar el nombre de la actividad que se asigno y la politica a la que pertenece esa actividad, esos detalles de abajo de "flujo de trabajo", "instancia" y el otro de fecha, quitalos. Que toda la tarjeta sirva como el boton para "Completar" para mayor facilidad de uso.

**_Completar actividad_**: si en completar actividad lo que hay que poner es un texto que en lugar de ser un input o lo que haya ahora sea un text area para mejor visibilidad de lo que se escribe, si la decision es un boolean que haya opciones de CONFIRMADO(check), NEGADO(no ckeck) porque lo que hay ahora solo es un check que si lo marco es true y si no lo marco false.
Al darle al boton de "Completar Tarea" deberia salir un check grande en el centro de la pantalla estilo modal que me indique se hizo la tarea, dandole la relevancia que esa accion merece en lugar de la alerta que sale.

### LOADER

quiero que unifiques todos los lugares en lo que se muestra que se esta cargando algo o un loader con este componente
import { Component } from "@angular/core";
import { TitleCasePipe } from "@angular/common";
import {
KENDO_INDICATORS,
LoaderType,
LoaderThemeColor,
LoaderSize,
} from "@progress/kendo-angular-indicators";

@Component({
selector: "my-app",
imports: [KENDO_INDICATORS, TitleCasePipe],
template: `     <div class="example">
      <div class="wrap">
        @for (loader of loaders; track loader) {
        <div class="example-item">
          <div class="example-item-title">{{ loader.type | titlecase }}</div>
          <div class="k-block">
            <kendo-loader
              [type]="loader.type"
              [themeColor]="loader.themeColor"
              [size]="loader.size"
            >
            </kendo-loader>
          </div>
        </div>
        }
      </div>
    </div>
  `,
styles: [
`
.wrap {
display: flex;
align-items: center;
margin: 0 -10px;
}
.example-item {
flex: 0 0 33%;
padding: 10px;
}
.example-item-title {
margin-bottom: 10px;
text-align: center;
}
.k-block {
display: flex;
align-items: center;
justify-content: center;
min-height: 80px;
}
`,
],
})
export class AppComponent {
public loaders = [
{
type: <LoaderType>"pulsing",
themeColor: <LoaderThemeColor>"primary",
size: <LoaderSize>"medium",
},
{
type: <LoaderType>"infinite-spinner",
themeColor: <LoaderThemeColor>"secondary",
size: <LoaderSize>"medium",
},
{
type: <LoaderType>"converging-spinner",
themeColor: <LoaderThemeColor>"info",
size: <LoaderSize>"medium",
},
];
}

pero solo el "converging-spinner"
