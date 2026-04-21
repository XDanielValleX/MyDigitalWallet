## Proyecto: MyDigitalWallet 💳

El desarrollo del segundo parcial para la asignatura de **Desarrollo Mobile**. El objetivo es construir una aplicación funcional de billetera digital utilizando **Ionic**, **Angular** y **Firebase**, integrando capacidades nativas mediante Capacitor.

---

## 📝 Descripción del Problema

Se requiere una aplicación que permita a los usuarios gestionar sus tarjetas de crédito/débito, realizar simulaciones de pagos y visualizar su historial de transacciones. La aplicación debe contar con un sistema de autenticación seguro, persistencia de datos en la nube y funcionalidades nativas avanzadas.

---

## 📐 Reglas de Negocio y Validación

Tras la revisión del proyecto, se han consolidado las siguientes reglas de negocio que rigen el comportamiento de la aplicación:

### 🔐 Autenticación y Registro

- **Perfil Completo**: El registro de nuevos usuarios exige obligatoriamente: Nombre, Apellido, Tipo y Número de Documento, País, Email y Contraseña.
- **Seguridad de Contraseña**: Se requiere una longitud mínima de 6 caracteres para las contraseñas basadas en email.
- **Single Sign-On (Google)**: Integración nativa con Google Auth; en el primer inicio de sesión se sincronizan automáticamente el nombre y email del usuario con Firestore.

### 🛡️ Seguridad y Biometría

- **Doble Factor Nativo**: El uso de biometría (Huella/FaceID) actúa como un segundo factor opcional pero recomendado para el acceso rápido y la autorización de pagos.
- **Enrolamiento Seguro**: Para vincular la biometría, el sistema exige una validación previa de la contraseña del usuario, garantizando que solo el dueño de la cuenta autorice el acceso rápido.
- **Persistencia de Credenciales**: Las credenciales se almacenan de forma limitada y encriptada a nivel de dispositivo mediante el plugin de biometría nativa.

### 💳 Gestión de Tarjetas

- **Validación de Integridad**: Implementación estricta del **Algoritmo de Luhn** para prevenir el registro de números erróneos.
- **Detección de Franquicia**: Identificación automática de marca mediante el BIN:
    - **Visa**: Empieza por `4`.
    - **Mastercard**: Rango `51-55` o `2221-2720`.
- **UX de Ingreso**: Formateo automático en bloques de 4 dígitos para el número y formato `MM/YY` para la expiración.

### 💸 Pagos y Transacciones

- **Autorización de Pagos**: Si el perfil tiene habilitada la biometría, cada pago requerirá una validación de identidad (Biometría o PIN del dispositivo) antes de procesarse.
- **Simulación de Datos**: Uso de `faker.js` para generar comercios y montos realistas en la interfaz de simulación de pagos.
- **Trazabilidad**: Registro detallado en Firestore por transacción (cardId, merchant, amount, date) para permitir el filtrado histórico por tarjeta.
- **Personalización con Emojis**: Los usuarios pueden asignar y reaccionar a sus gastos mediante Emojis con un **tap/click** sobre cualquier item del historial, integrando la librería `@ctrl/ngx-emoji-mart`.
- **Búsqueda por Fecha**: Filtrado dinámico de transacciones por día específico mediante el uso del **CalendarComponent**, facilitando el control de gastos diarios.
- **Notificaciones**: Envío de confirmación mediante notificaciones push nativas al concluir transacciones exitosas.

---

## 🔌 Plugins de Capacitor (Requeridos para el Examen)

Para el correcto funcionamiento de las características nativas y la resolución del examen, se han integrado los siguientes plugins:

- **Autenticación Biométrica**: `capacitor-native-biometric` \
  *Uso: Acceso seguro al perfil y validación de identidad mediante huella dactilar o FaceID.*
- **Google Sign-In**: `@capgo/capacitor-social-login` \
  *Uso: Autenticación social nativa para una experiencia de usuario fluida.*
- **Notificaciones Push**: `@capacitor/push-notifications` \
  *Uso: Recepción de alertas de transacciones y actualizaciones de cuenta.*
- **Feedback Táctil (Haptics)**: `@capacitor/haptics` \
  *Uso: Vibraciones sutiles al realizar pagos o confirmar acciones.*
- **Splash Screen**: `@capacitor/splash-screen` \
  *Uso: Pantalla de carga profesional al iniciar la aplicación.*
- **Toasts**: `@capacitor/toast` \
  *Uso: Mensajes de confirmación rápidos para el usuario.*

---

## 🚀 Servicio de Notificaciones (Backend)

Para la gestión de notificaciones push, se utiliza un servicio externo alojado en Railway.

**URL del Servicio:** https://sendnotificationfirebase-production.up.railway.app/

> [!IMPORTANT]
> **Gestión de Credenciales**: Es necesario subir las credenciales (archivo JSON de Firebase Admin SDK) en el link anterior para que el servicio pueda enviar las notificaciones.
> **Acceso al Frontend**: El link cuenta con un frontend donde se pueden gestionar las configuraciones. Solo pueden iniciar sesión correos con dominio `@unicolombo.edu.co`.

**Conexión desde la app (JWT):** Para que la app pueda enviar notificaciones a través del backend, debe obtener un JWT.

- Si inicias sesión con **email/contraseña**, la app intentará autenticar automáticamente en el backend.
- Si inicias sesión con **Google**, abre **Perfil (avatar) → Push Notifications** y actívalas. Si la app no tiene JWT aún, te pedirá las credenciales del panel NotifyPro para guardarlo en el dispositivo y habilitar el envío de push al finalizar pagos.
- Al confirmar un pago, la app muestra una notificación local nativa inmediata y luego también intenta enviar el push al backend de Railway/NotifyPro para la entrega remota.

### Endpoints del Servicio

### 1. Autenticación (Login)

Permite obtener el token de acceso (JWT) para autorizar el envío de notificaciones.

- **URL:** `POST /user/login`
- **Body Ejemplo:**

```json
{
    "email": "usuario@unicolombo.edu.co",
    "password": "tu_password"
}
```

### 2. Enviar Notificación

Realiza el envío de la notificación push a través de Firebase Cloud Messaging.

- **URL:** `POST /notifications/`
- **Headers:** `Authorization: <JWT_TOKEN>`
- **Body Ejemplo:**

```json
{
    "token": "FCM_TOKEN_DEL_DISPOSITIVO",
    "notification": {
        "title": "Pago Exitoso",
        "body": "Has realizado un pago de $50,000"
    },
    "android": {
        "priority": "high",
        "data": {
            "key": "value"
        }
    }
}
```

---

## ✅ Lista de Chequeo (Checklist de Entrega)

### 📂 Estructura y Módulos

- [ ]  **AppModule**: Configuración principal de la aplicación (Firebase, Ionic, Angular).
- [ ]  **SharedModule**: Módulo para componentes reutilizables.
- [ ]  **CoreModule**: Módulo para servicios de Singleton y Guards.

### 📄 Páginas (Pages)

- [ ]  **Login**: Pantalla de acceso con validación de credenciales.
- [ ]  **Register**: Pantalla para creación de nuevos usuarios (Sincronización con Firestore).
- [ ]  **Home**: Dashboard principal con balance y lista de tarjetas.
- [ ]  **Add-Card**: Formulario para agregar nuevas tarjetas a la billetera.
- [ ]  **Payment**: Interfaz para realizar y simular pagos.

### 🧩 Componentes (Shared & Internal Components)

- [ ]  **CardComponent**: Representación visual de las tarjetas con estilos dinámicos por tipo (Visa/Mastercard).
- [ ]  **TransactionListComponent**: Lista categorizada de los últimos movimientos del usuario.
- [ ]  **TransactionItem**: Detalle individual de cada transacción (monto, fecha, icono).
- [ ]  **BalanceDisplay**: Sección superior que muestra el saldo total con opción de ocultar/mostrar.
- [ ]  **QuickActions**: Botones de acceso rápido para las funciones principales (Transferir, Recargar, Pagar).
- [ ]  **CustomInput**: Inputs personalizados con validaciones visuales y manejo de errores.
- [ ]  **PaymentSimulator**: Modal interactivo para procesar simulaciones de transacciones.
- [ ]  **SkeletonLoading**: Estados de carga para mejorar la experiencia del usuario (UX).
- [ ]  **CalendarComponent**: Selector de fechas personalizado para filtrado y visualización de historial.

### 🛡️ Seguridad (Guards & Auth)

- [ ]  **AuthGuard**: Protege las rutas privadas (Home, Payment, etc) de usuarios no autenticados.
- [ ]  **AutoLoginGuard**: Redirige al Home si el usuario ya tiene una sesión activa al entrar al Login.
- [ ]  **Biometric Lock**: Bloqueo de seguridad opcional mediante biometría.

### ⚙️ Servicios (Core Services)

- [ ]  **AuthService**: Gestión de autenticación con Firebase Auth (Login, Register, Logout).
- [ ]  **FirestoreService**: Operaciones CRUD base en Firebase Firestore.
- [ ]  **UserService**: Gestión de datos de perfil, saldos y preferencias del usuario.
- [ ]  **CardService**: Lógica de negocio para la gestión y validación de tarjetas (Algoritmo de Luhn).
- [ ]  **PaymentService**: Procesamiento de transacciones y lógica de simulación de pagos.
- [ ]  **NotificationService**: Centralización de alertas y feedback del sistema.
- [ ]  **ToastService**: Servicio especializado para mostrar mensajes flotantes (Toasts).
- [ ]  **DialogService**: Gestión de diálogos de confirmación interactivos (Aceptar/Cancelar).
- [ ]  **LoadingService**: Control centralizado de indicadores de carga (Overlay Spinners).
- [ ]  **ModalService**: Utilidad para la creación, apertura y cierre dinámico de modales.
- [ ]  **HttpService**: Servicio para la gestión de peticiones HTTP externas (Backend de Notificaciones).

---

## 🛠️ Tecnologías Utilizadas

- **Ionic Framework** (Mobile UI)
- **Angular** (Lógica de Aplicación)
- **Firebase** (Auth & Firestore)
- **Capacitor** (Native Bridge)
- **TypeScript**
- **SASS/CSS** (Diseño Premium)
- **ngx-emoji-mart** (Librería de Emojis)
- **Anime.js** (Animaciones Avanzadas)
