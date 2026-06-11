import os
import csv
import random
from faker import Faker

fake = Faker('es_ES')

# Policy definitions matching exactly the DB policies (original + seeded)
ALL_POLICIES = [
    {
        "uuid": "000a3793-827e-4616-84f9-0a23863e0a35",
        "name": "Solicitud de vacaciones",
        "description": "En esta política se indica el flujo de actividades a seguir para conseguir que se apruebe una solicitud de vacaciones",
        "keywords": ["vacaciones", "días libres", "pedir vacaciones", "descanso anual", "tomarme unos días", "solicitud de descanso", "feriado", "vacación", "ausencia por vacaciones", "permiso de descanso"]
    },
    {
        "uuid": "111e9d86-cbd2-45ff-a809-4072bbe6a4d0",
        "name": "contratacion",
        "description": "El departamento de Recursos Humanos (RRHH) recibe solicitudes de contratación de los distintos departamentos.",
        "keywords": ["contratar", "nuevo empleado", "incorporación", "entrevistar candidatos", "selección de personal", "reclutamiento", "puesto vacante", "nueva vacante", "contratación de personal", "contratar funcionario"]
    },
    {
        "uuid": "6720c739-1916-432b-b392-e698dcfd8112",
        "name": "contratar nuevo personal",
        "description": "Flujo alternativo para contratar nuevo personal en la empresa.",
        "keywords": ["contratar nuevo personal", "ingreso de personal", "reclutar postulantes", "evaluar currículums", "entrevista técnica", "contrato de trabajo nuevo"]
    },
    {
        "uuid": "bd9966b2-5fa2-4a4b-b924-59e817a5e756",
        "name": "Compra de productos informaticos",
        "description": "En esta política se detallan los pasos para poder hacer la solicitud de compra de equipos informáticos",
        "keywords": ["comprar computadoras", "adquisición de laptops", "compra de software", "equipos informáticos", "teclado y mouse", "licencia de office", "monitores nuevos", "adquirir hardware", "compra de pc"]
    },
    {
        "uuid": "439df689-d1cf-41c3-883c-1b7713fe68e5",
        "name": "Reembolso de Gastos de Viaje",
        "description": "Proceso para solicitar el reembolso de gastos incurridos durante viajes de representación.",
        "keywords": ["reembolso de gastos", "viáticos del viaje", "devolver plata del taxi", "gasto de hotel", "rendición de cuentas", "pasajes de avión", "reintegro de dinero", "facturas de viaje", "devolución de viáticos"]
    },
    {
        "uuid": "993a46fb-a0b2-4d2c-88eb-11ab1c3d4e8c",
        "name": "Solicitud de Equipamiento de Hardware",
        "description": "Flujo para solicitar equipos informáticos como laptops, monitores o periféricos.",
        "keywords": ["solicitar laptop", "nuevo monitor", "hardware de trabajo", "computadora portátil", "pedir mouse y teclado", "cargador de laptop", "pantalla adicional", "insumos de computación"]
    },
    {
        "uuid": "a7b21cc3-d8cf-48af-8bb0-22cba4567e9b",
        "name": "Evaluación de Desempeño Anual",
        "description": "Proceso anual para la evaluación de desempeño y establecimiento de objetivos corporativos.",
        "keywords": ["evaluación de desempeño", "revisión anual", "objetivos del año", "autoevaluación", "calificar rendimiento", "feedback del jefe", "evaluar empleado", "desempeño laboral", "revisión de metas"]
    },
    {
        "uuid": "2c3d4e5f-6a7b-8c9d-0e1f-2a3b4c5d6e7f",
        "name": "Pago de Facturas a Proveedores",
        "description": "Gestión y autorización del pago de facturas pendientes a proveedores externos de la organización.",
        "keywords": ["pagar factura", "transferencia a proveedor", "pago pendiente", "factura de servicios", "proveedores", "abonar cuenta", "orden de pago", "comprobante de egreso", "pagar proveedor"]
    },
    {
        "uuid": "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
        "name": "Instalación de Licencia de Software",
        "description": "Solicitud e instalación de licencias de software comercial o herramientas internas aprobadas.",
        "keywords": ["instalar software", "licencia de photoshop", "activar windows", "software corporativo", "instalar programa", "licencia de antivirus", "desplegar herramienta", "instalar licencia"]
    },
    {
        "uuid": "4c5d6e7f-8a9b-0c1d-2e3f-4a5b6c7d8e9f",
        "name": "Solicitud de Acceso a Servidores",
        "description": "Flujo para solicitar credenciales y accesos a bases de datos o servidores de producción de TI.",
        "keywords": ["acceso a servidor", "permisos de base de datos", "entrar a producción", "credenciales vpn", "acceso ssh", "permiso de lectura bd", "acceso a aws", "cuenta de servidor", "permisos de red"]
    },
    {
        "uuid": "5c6d7e8f-9a0b-1c2d-3e4f-5a6b7c8d9e0f",
        "name": "Aprobación de Presupuesto Mensual",
        "description": "Revisión y aprobación de la asignación presupuestaria mensual para cada área organizativa.",
        "keywords": ["presupuesto mensual", "partida presupuestaria", "aprobar presupuesto de área", "gasto mensual", "límite de presupuesto", "fondos mensuales", "aprobar costos", "aprobar presupuesto"]
    },
    {
        "uuid": "6c7d8e9f-0a1b-2c3d-4e5f-6a7b8c9d0e1f",
        "name": "Capacitación y Formación de Personal",
        "description": "Solicitud de cursos, certificaciones o programas de formación académica patrocinados por la empresa.",
        "keywords": ["curso de capacitación", "certificación profesional", "pagar curso", "beca de estudio", "formación de empleados", "taller de desarrollo", "entrenamiento", "financiar certificación"]
    },
    {
        "uuid": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
        "name": "Onboarding de Nuevos Colaboradores",
        "description": "Proceso de inducción, firma de contratos y preparación del equipamiento de TI para nuevos ingresos.",
        "keywords": ["onboarding", "inducción de ingreso", "bienvenida nuevo empleado", "correo corporativo nuevo", "baja o alta laboral", "bienvenida colaborador", "inducción de personal"]
    },
    {
        "uuid": "8c9d0e1f-2a3b-4c5d-6e7f-8a9b0c1d2e3f",
        "name": "Aprobación de Contratos Comerciales",
        "description": "Flujo de revisión de condiciones comerciales, validación financiera y firma final de contratos con clientes.",
        "keywords": ["contrato comercial", "firmar contrato con cliente", "borrador de contrato", "acuerdo comercial", "revisión legal del contrato", "firma de convenio", "aprobar contrato de ventas"]
    },
    {
        "uuid": "9c0d1e2f-3a4b-5c6d-7e8f-9a0b1c2d3e4f",
        "name": "Liquidación y Desvinculación de Personal",
        "description": "Proceso formal para dar de baja a un empleado, revocar accesos y pagar su liquidación legal.",
        "keywords": ["liquidación laboral", "despido de empleado", "baja de usuario", "revocar accesos baja", "renuncia de trabajador", "finiquito", "desvinculación", "despedir personal"]
    },
    {
        "uuid": "0e1f2a3b-4c5d-6e7f-8a9b-0c1d2e3f4a5b",
        "name": "Solicitud de Adelanto de Sueldo",
        "description": "Solicitud excepcional de adelanto de remuneración mensual por causas justificadas.",
        "keywords": ["adelanto de sueldo", "anticipo de salario", "adelantar nómina", "préstamo sobre sueldo", "necesito adelanto dinero", "anticipar remuneración", "adelanto de sueldo urgente"]
    },
    {
        "uuid": "f5ba7581-b2ac-4b3a-830e-64ab112f975a",
        "name": "Actualización de Manual de Procedimientos",
        "description": "Proceso corporativo para auditar, documentar y actualizar manuales de procesos internos.",
        "keywords": ["manual de procedimientos", "actualizar manual", "procedimientos internos", "auditar procesos", "redactar manual", "actualizacion de procesos"]
    },
    {
        "uuid": "31ece703-f961-4e8e-a5c5-cd5c5b47e3db",
        "name": "Resolución de Incidencias de Clientes Críticos",
        "description": "Flujo de escalamiento técnico y de operaciones para solucionar quejas de clientes de alto impacto.",
        "keywords": ["reclamo de cliente", "incidencia critica", "cliente enojado", "escalar reclamo", "compensacion comercial", "solucionar incidencia", "soporte tecnico cliente"]
    }
]

# The 8 allowed departments
ALLOWED_DEPARTMENTS = [
    "e6edcb81-4782-44f0-af6d-1e9e184c77ba", # Gerencia
    "17775f19-8c66-41b3-bd38-919b0fe10b8f", # RRHH
    "f036cecc-192b-4e1e-bdc2-c95608f24fe9", # Tecnologías de la Información
    "5fd7b0ae-2619-4038-a52e-26a0576c4819", # Finanzas y Contabilidad
    "f5ba7581-b2ac-4b3a-830e-64ab112f975a", # Organización y Métodos
    "5f56f693-5a38-4ca2-96c0-7bba750fc7a6", # Legal
    "31ece703-f961-4e8e-a5c5-cd5c5b47e3db", # Atención al cliente
    "390714b2-977f-4e5c-bd1e-5f282ff785ef"  # Operaciones
]

# Common tasks names from policies (used for Bottleneck task_id)
COMMON_TASKS = [
    "Inicio del Proceso", "Inicio de la solicitud", "Registrar Recibos",
    "Revisión Contable", "Aprobación de Pago", "Presentar Requerimiento",
    "Evaluación Técnica", "Aprobación Presupuesto", "Entrega del Equipo",
    "Autoevaluación", "Feedback de Manager", "Consolidación de RRHH",
    "Verificar Factura", "Autorización Gerencia", "Procesar Transferencia",
    "Especificar Licencia", "Verificar Stock", "Instalar Licencia",
    "Especificar Servidores", "Revisión de Seguridad", "Habilitar Permisos",
    "Consolidar Gastos", "Revisión Gerencial", "Aprobar Presupuesto",
    "Detallar Curso", "Validar Capacitación", "Aprobación Costos",
    "Preparar Firma", "Setup Tecnológico", "Reunión Bienvenida",
    "Subir Borrador", "Validar Comercial", "Firma Director",
    "Iniciar Baja", "Cerrar Accesos", "Pago de Liquidación",
    "Solicitar Adelanto", "Validar Elegibilidad", "Dispersión de Fondos",
    "Enviar solicitud de vacaciones", "Aprobación del manager", "Validación de RRHH"
]

def generate_data(policies, users, instances, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    
    # Merge fetched policies with our rich policies definitions to ensure all 16 are represented
    policy_map = {p["uuid"]: p for p in ALL_POLICIES}
    for p in policies:
        p_uuid = p.get('uuid')
        if p_uuid and p_uuid in policy_map:
            # Keep keywords and enrich with real name
            policy_map[p_uuid]["name"] = p.get("name", policy_map[p_uuid]["name"])
            policy_map[p_uuid]["description"] = p.get("description", policy_map[p_uuid]["description"])
    
    final_policies = list(policy_map.values())
    
    # 1. NLP Training Data
    print(f"Generating NLP data for {len(final_policies)} policies...")
    nlp_file = os.path.join(output_dir, "nlp_training_data.csv")
    with open(nlp_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['text', 'policy_id'])
        
        templates = [
            "Necesito iniciar el trámite de {kw}",
            "Quiero solicitar {kw}",
            "Cómo hago para pedir {kw}",
            "Ayuda con {kw}",
            "Trámite de {kw} por favor",
            "Deseo tramitar {kw}",
            "Requiero {kw} urgente",
            "Me gustaría iniciar el proceso de {kw}",
            "{kw} es lo que busco",
            "Quiero abrir una solicitud para {kw}",
            "Por favor, necesito {kw}",
            "Quisiera gestionar {kw} para este mes",
            "Me hace falta iniciar {kw}",
            "Abrir solicitud de {kw}",
            "Iniciar flujo para {kw}",
            "Tengo un problema con {kw}",
            "Cómo puedo solicitar {kw}",
            "Deseo registrar {kw}"
        ]
        
        # Collect real phrases from instances history
        real_phrases_by_policy = {}
        for inst in instances:
            p_id = inst.get('policyId')
            if not p_id: continue
            if p_id not in real_phrases_by_policy:
                real_phrases_by_policy[p_id] = []
                
            idata = inst.get('instanceData', {})
            for key, val in idata.items():
                if isinstance(val, str) and len(val) > 10:
                    real_phrases_by_policy[p_id].append(val)
            
            history = inst.get('history', [])
            for h in history:
                fdata = h.get('formDataAtStep', {})
                for key, val in fdata.items():
                    if isinstance(val, str) and len(val) > 10:
                        real_phrases_by_policy[p_id].append(val)
        
        for p in final_policies:
            pol_id = p["uuid"]
            name = p["name"]
            keywords = p.get("keywords", [name])
            
            # Generate about 120 samples per policy
            count = 0
            for kw in keywords:
                for template in templates:
                    if count >= 120:
                        break
                    # Write base template
                    writer.writerow([template.format(kw=kw.lower()), pol_id])
                    count += 1
                    
                    if count < 120:
                        # Write with employee name variation
                        writer.writerow([f"{template.format(kw=kw.lower())} para {fake.name()}", pol_id])
                        count += 1
            
            # Real phrases (from DB instances)
            real_phrases = real_phrases_by_policy.get(pol_id, [])
            for phrase in real_phrases:
                writer.writerow([phrase, pol_id])
                count += 1
                for _ in range(3):
                    noise = f" {fake.word()} " if random.random() < 0.3 else ""
                    writer.writerow([phrase + noise, pol_id])
                    count += 1
                
    # 2. Bottleneck Training Data
    print("Generating Bottleneck data using only allowed departments...")
    bottle_file = os.path.join(output_dir, "bottleneck_training_data.csv")
    with open(bottle_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['department_id', 'day_of_week', 'hour_of_day', 'duration_hours', 'task_id', 'is_anomaly'])
        
        # Use allowed departments
        departments = ALLOWED_DEPARTMENTS
        
        # Normal data: duration between 0.5 and 8.0 hours
        for _ in range(6000):
            writer.writerow([
                random.choice(departments),
                random.randint(0, 6),         # Day of week
                random.randint(8, 18),        # Working hours
                round(random.uniform(0.5, 8.0), 2),
                random.choice(COMMON_TASKS),
                False
            ])
            
        # Anomalous data: duration between 24.0 and 120.0 hours, or off hours
        for _ in range(600):
            # Sometimes normal duration but off hours/weekend, sometimes long duration
            is_long_duration = random.random() < 0.8
            duration = round(random.uniform(24.0, 120.0), 2) if is_long_duration else round(random.uniform(1.0, 8.0), 2)
            hour = random.randint(0, 7) if not is_long_duration else random.randint(0, 23)
            day = random.choice([0, 6]) if not is_long_duration else random.randint(0, 6)
            
            writer.writerow([
                random.choice(departments),
                day,
                hour,
                duration,
                random.choice(COMMON_TASKS),
                True
            ])
            
    # 3. Completion Predictor Training Data
    print("Generating Completion data...")
    comp_file = os.path.join(output_dir, "completion_training_data.csv")
    with open(comp_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['policy_id', 'activity_id', 'employee_id', 'pending_tasks', 'completion_hours'])
        
        pol_ids = [p["uuid"] for p in final_policies]
        
        emp_ids = [u.get('uuid') for u in users if u.get('uuid')]
        # Add some mock employee IDs if users is empty
        if len(emp_ids) < 5:
            emp_ids = ["e121cbea-1209-4fe7-ad22-6cf09caf5b95", "bebe41a9-85fc-43f3-a125-5c7f72b0898d", "e1c69265-87e8-417b-b13a-2ae72c53d4e3", "4cd6a83f-a8b6-4b56-854d-5d3693ec4ab4", "u_mock_1", "u_mock_2"]
            
        # Generate completion data for all 16 policies
        for _ in range(6000):
            pol_id = random.choice(pol_ids)
            # Find the policy in our list
            p_def = next(p for p in final_policies if p["uuid"] == pol_id)
            
            # Select a random activity node name or uuid from that policy
            # We seed the database with specific nodes. Let's pick a random node uuid
            nodes = p_def.get("activityNodes", [])
            if nodes:
                node = random.choice(nodes)
                activity_id = node.get("uuid")
                # Sometimes use node name as activity_id to support both
                if random.random() < 0.3:
                    activity_id = node.get("name")
            else:
                activity_id = random.choice(COMMON_TASKS)
                
            pending = random.randint(0, 15)
            
            # Base time depends on policy complexity. E.g. hardware/budget takes longer
            if "Hardware" in p_def["name"] or "Presupuesto" in p_def["name"] or "Contratos" in p_def["name"]:
                base_time = random.uniform(4.0, 10.0)
            elif "Vacaciones" in p_def["name"] or "Adelanto" in p_def["name"]:
                base_time = random.uniform(1.0, 3.0)
            else:
                base_time = random.uniform(2.0, 6.0)
                
            # Time scales linearly with pending tasks + random noise
            time_add = pending * 0.75
            noise = random.uniform(-1.0, 1.0)
            comp_hours = max(0.5, base_time + time_add + noise)
            
            writer.writerow([
                pol_id,
                activity_id,
                random.choice(emp_ids),
                pending,
                round(comp_hours, 2)
            ])
            
    print(f"Data generation complete. Saved to {output_dir}")

if __name__ == "__main__":
    # If run standalone
    dummy_policies = ALL_POLICIES
    dummy_users = [
        {"uuid": "e121cbea-1209-4fe7-ad22-6cf09caf5b95", "departmentId": "e6edcb81-4782-44f0-af6d-1e9e184c77ba"},
        {"uuid": "bebe41a9-85fc-43f3-a125-5c7f72b0898d", "departmentId": "17775f19-8c66-41b3-bd38-919b0fe10b8f"},
        {"uuid": "e1c69265-87e8-417b-b13a-2ae72c53d4e3", "departmentId": "f036cecc-192b-4e1e-bdc2-c95608f24fe9"},
        {"uuid": "4cd6a83f-a8b6-4b56-854d-5d3693ec4ab4", "departmentId": "5fd7b0ae-2619-4038-a52e-26a0576c4819"}
    ]
    dummy_instances = []
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'deeplearning', 'training_data')
    generate_data(dummy_policies, dummy_users, dummy_instances, output_dir)
