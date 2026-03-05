# CONTEXTO GLOBAL

**"La Banda"** es una plataforma integral (ecosistema nocturno) que conecta bares, boliches y marcas afines en la ciudad.
- **Problema Resuelto:** Fragmentación de la información nocturna y falta de fidelización cruzada.
- **Solución:** Permite descubrir lugares, ganar puntos por consumos y canjearlos por beneficios exclusivos. Provee a los comercios de métricas exactas sobre su clientela y un sistema robusto de validación antifraude.
- **Usuarios Finales:**
  - **Clubbers (B2C):** Jóvenes y adultos que usan la PWA para ver la agenda, sumar puntos mediante escaneo de QRs y acceder a beneficios.
  - **Staff B2B (Mozos, Cajeros, Seguridad):** Usan la PWA de negocios para validar DNIs en puerta, ingresar tickets de consumo, tomar foto-evidencia y generar QRs dinámicos.
  - **Owners B2B (Dueños y Marcas):** Acceden a un panel web para monitorear analíticas, auditar operaciones y configurar promociones.

---

# AGENTES DE IA ESPECIALIZADOS

## [AGENTE: CORE BACKEND]
**Responsabilidad:** Orquestar la lógica de negocio, REST APIs, integración con base de datos y procesamiento de analíticas.
**Tecnologías:** Node.js, Express (v5.2), TypeScript, MongoDB, Mongoose (v9.2), Zod.
**Reglas Estrictas:**
1. **Tipado Estricto y Validación:** Prohibido el uso de `any`. Todos los endpoints de Express deben validar el `body`, `params` y `query` obligatoriamente utilizando middlewares contra esquemas de Zod antes de ejecutar lógica de controladores.
2. **Encapsulamiento Lógico:** Mantén los controladores en la carpeta `/controllers/` limpios y delgados. Delega la lógica de negocio compleja a servicios o utilidades en `/utils/` o modelos en `/models/`.
3. **Manejo Centralizado de Errores:** Implementa un middleware global de errores que estandarice respuestas y evite la fuga de stack-traces al cliente. Captura asincronía limpiamente.
4. **Nomenclatura Unificada:** Aplica `kebab-case` para archivos e importaciones, `PascalCase` para clases (ej. Modelos) y `camelCase` para instancias, variables locales y funciones.
5. **Autonomía Zero-Trust:** Asume que cualquier payload que viene del frontend es hostil. Valida integridad de datos, límites y estados exclusivamente del lado del servidor.

## FLUJO DE TRABAJO Y ARQUITECTURA DE REFERENCIA (SERVER)
El agente debe replicar la arquitectura basándose en los componentes provistos (ej. `AuthController`, `authRoute`, middlewares) siguiendo estos pasos modulares para el desarrollo de cada EndPoint:

1. **Definición de Modelos (`/src/models/`):** Utiliza Mongoose con interfaces TypeScript (`Document`, `Schema`, `model`). Encapsula la lógica relacionada a los datos directamente en el modelo utilizando hooks de Mongoose (ej. `.pre('save')` para hashear passwords con bcrypt) antes de almacenarlos.
2. **Definición de Rutas y Middlewares de Validación (`/src/routes/`):** Las rutas mapean EndPoints HTTP (ej. `router.post`) a los controladores. *Requisito Estricto:* Antes de llegar al controlador, los datos entrantes (`body`, `params`) deben validarse al nivel de la ruta utilizando `express-validator` (ej. `body('email').isEmail()`) seguido de un Middleware genérico (`handleInputErrors`) para frenar el Request en caso de fallas de esquema tempranas.
3. **Controladores Delgados (`/src/controllers/`):** El Controlador (estructurado en clases con métodos `static async`) sólo recibe el Request validado, invoca mutaciones a Mongoose, y responde la estructura JSON (`res.status(x).json()`). Toda la asincronía y las lecturas/escrituras en base de datos ocurren aquí empaquetados obligatoriamente dentro de un bloque `try-catch`. 
4. **Utilerías Aisladas (`/src/utils/`):** Delega la lógica de negocio repetitiva y compleja (envío de emails, generadores de JWTs con `jsonwebtoken`, encripción por `bcrypt` de contraseñas u OTPs) a funciones simples y reutilizables en utilerías. No escribas lógica de tokenización o hashing dentro del Controlador.
5. **Operaciones Persistentes Atómicas:** Para escrituras simultaneas a múltiples colecciones (ej. Guardar `User` y además su token `Token`), inicializa objetos de instancia de Clase y resuélvelos en lote con `await Promise.allSettled([user.save(), token.save()])`. Si el motor transaccional de Mongoose está en uso para esa operación, envuélvelo en `session`.
6. **Manejo de Sesiones (Cookies + JWT):** Retorna autenticaciones inyectando la firma criptográfica (JWT) directamente como Cookie `HttpOnly` y `Secure` usando `res.cookie(...)` en el servidor, limitando la exposición del token firmado a ataques `XSS` en el cliente. Limpia las sesiones con `res.clearCookie()` en el logout.

## [AGENTE: SEGURIDAD Y TRANSACCIONES]
**Responsabilidad:** Ejecutar el motor de puntos, validaciones antifraude offline/online, y proteger end-to-end la infraestructura.
**Tecnologías:** JWT (jsonwebtoken), Bcrypt, MongoDB/Mongoose (Session Transactions), Node.js, TypeScript.
**Reglas Estrictas:**
1. **Transacciones ACID Mandatorias:** Toda operación que modifique el balance de puntos o beneficios de un usuario debe envolverse en una transacción de Mongoose (`session.startTransaction()`). Ejecuta auto-rollback ante la mínima falla.
2. **Flujo Anti-Fraude B2B:** Imprime la validación obligatoria de 4 pasos para sumar consumos: Monto + Ticket (referencia) + Foto Evidencia + QR efímero.
3. **QR Dinámicos y Vida Útil:** Genera QRs transaccionales con una caducidad máxima estricta de 60 segundos. Invalida su uso tras el primer escaneo.
4. **Seguridad Zero-Trust:** Prohibido delegar la validación de geolocalización o de estado (vencimiento/duplicidad) al Frontend. El Backend siempre ejerce la validación final y absoluta.
5. **Gestión de Identidad Segura:** Almacena todos los passwords hasheados con Bcrypt. Maneja sesiones via JWT firmados asimétricamente, proveyendo endpoints de revocación y refresco seguro.

## [AGENTE: FRONTEND PWA]
**Responsabilidad:** Desarrollo de la interfaz de usuario, PWA B2C/B2B y Panel Web, enfocado en resiliencia offline y UX.
**Tecnologías:** React (v19.2), Vite, TypeScript, React Router (v7), Tailwind CSS (v4.2.1), Chakra UI (@chakra-ui/pin-input), TanStack React Query, Axios, React Hook Form, Zod.
**Reglas Estrictas:**
1. **Tipado Estricto Front-to-Back:** Prohibido usar `any`. Utiliza Zod obligatoriamente para la validación de formularios (React Hook Form) y validación de esquemas/DTOs en respuestas del backend (Axios/React Query).
2. **Resiliencia Offline-First:** Configura Service Workers e implementa estrategias de caché en LocalStorage/IndexedDB para garantizar la disponibilidad offline de información crítica (puntos, QR estático de entrada).
3. **Separación de Fetching y UI:** Encapsula toda la lógica de obtención/mutación de estado del servidor con TanStack React Query en hooks personalizados `/hooks`. Prohibido hacer fetch directo dentro de componentes de UI.
4. **Nomenclatura y Estructura:** Utiliza `kebab-case` para archivos y carpetas (`/views/auth/`), `PascalCase` para componentes y clases React, y `camelCase` para variables y funciones.
5. **Estilos Controlados:** Emplea Tailwind CSS como estándar y Chakra UI de manera aislada y exclusiva (ej. `@chakra-ui/pin-input`).

---

# ANTI-PATRONES PROHIBIDOS

1. **Confianza Ciega en el Client-Side:** Validar geolocalización o caducidad de códigos QR y promociones únicamente en la PWA frontend. El backend asume el control absoluto; el frontend es solo una vía de representación.
2. **Mutaciones Disjuntas en DB (No ACID):** Actualizar perfiles, agregar consumos o debitar puntos usando múltiples operaciones `Model.updateOne()` o `.save()` aisladas sin una sesión transaccional. Esto genera desincronización de saldos en caso de caída de un nodo o latencia.
3. **TypeScript Decorativo (`any` / Type-Casting Forzado):** Evadir el chequeo de tipos estático usando `any` o sobreescribiendo tipos (`as MyType`) sin una validación dinámica (Zod) subyacente. Los datos mutables o externos siempre deben parsearse, no castearse.

---

## Database Schema & Domain Knowledge

### 1. Usuarios (`users`)

Los usuarios son entidades independientes. No deben conocer bares, grupos ni puntos directamente.

```js
users {
  _id,
  name,
  lastName,
  birthdate,
  email,
  password,
  role,           // USER | OWNER | WAITER | ADMIN
  avatarUrl,
  isActive,
  createdAt,
  updatedAt
}
```

**Claves del diseño**
- El rol es global
- Los puntos no viven acá
- No hay arrays que crezcan sin límite

---

### 2. Bares (`bars`) — agregado raíz

El bar es el centro operativo del sistema. Todo lo que depende exclusivamente del bar se embebe.

```js
bars {
  _id,
  name,
  address,
  logoUrl,
  isActive,
  waiters: [
    {
      userId,
      isActive,
      assignedAt
    }
  ],
  createdAt
}
```

**Por qué embebido**
- Los mozos solo existen en el contexto del bar
- No se consultan globalmente
- Se accede siempre desde el bar

---

### 3. Grupos (`groups`) — agregado social

Los grupos son estables, pequeños y muy consultados. Sus relaciones se embeben.

```js
groups {
  _id,
  name,
  logoUrl,
  leaderId,
  inviteCode,
  members: [
    {
      userId,
      joinedAt
    }
  ],
  invitations: [
    {
      email,
      invitedBy,
      status,
      expiresAt,
      createdAt
    }
  ],
  createdAt
}
```

**Ventajas**
- Validar membresía sin lookup
- Crear salidas rápido
- Listar grupos por usuario con índice en `members.userId`

---

### 4. Puntos por bar (colecciones separadas)

Los puntos **NO** se embeben en usuarios ni grupos.

#### Usuario por bar

```js
userBarPoints {
  _id,
  userId,
  barId,
  totalPoints,
  updatedAt
}
```

#### Grupo por bar

```js
groupBarPoints {
  _id,
  groupId,
  barId,
  totalPoints,
  updatedAt
}
```

**Motivo**
- Rankings
- Queries por bar
- Actualizaciones frecuentes
- Índices `{ barId, userId }` y `{ barId, groupId }`

---

### 5. Salidas (`outings`) — agregado de evento

Las salidas son eventos acotados en tamaño. La asistencia se embebe.

```js
outings {
  _id,
  groupId,
  barId,
  leaderId,
  status,  // PENDING | ACTIVE | COMPLETED | CANCELLED
  scheduledFor,
  startedAt,
  qrToken,
  attendances: [
    {
      userId,
      confirmedAt
    }
  ],
  createdAt
}
```

- El número de asistentes es limitado
- Siempre se consulta junto a la salida
- Evita N+1 lookups

---

### 6. Sesiones de asistencia QR (`attendanceSessions`)

Las sesiones son efímeras pero auditables.

```js
attendanceSessions {
  _id,
  outingId,
  groupId,
  barId,
  waiterUserId,
  qrToken,
  status,
  expiresAt,
  createdAt
}
```

**Colección separada porque:**
- Expiran
- Se validan por token
- Pueden auditarse

---

### 7. Consumos (`consumptions`) — histórico

Nunca se embeben.

```js
consumptions {
  _id,
  outingId,
  groupId,
  barId,
  waiterUserId,
  amount,
  basePoints,
  multiplier,
  tableNumber,
  createdAt
}
```

**Son:**
- Registros financieros
- Base de puntos
- Crecientes sin límite

---

### 8. Promociones y canjes

#### Promociones (`promotions`)

```js
promotions {
  _id,
  barId,
  title,
  description,
  costPoints,
  stock,
  isActive,
  validUntil,
  createdAt
}
```

#### Canjes (`redemptions`)

```js
redemptions {
  _id,
  userId,
  groupId,
  promotionId,
  barId,
  pointsSpent,
  redeemedAt
}
```

**Separados porque:**
- Stock
- Control antifraude
- Reporting

---

### 9. Transacciones de puntos (`pointsTransactions`) — auditoría total

```js
pointsTransactions {
  _id,
  userId,
  groupId,
  barId,
  type,        // EARN | REDEEM
  amount,
  description,
  createdAt
}
```

> Nunca se recalcula, nunca se borra.

---

### 10. Misiones del bar (`barMissions`)

```js
barMissions {
  _id,
  barId,
  title,
  description,
  type,
  goal,
  unit,
  rewardPoints,
  isActive,
  validUntil
}
```
