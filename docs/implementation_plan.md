# Plan de Implementación: Agregar Modalidad y Lugar a los Eventos

Este plan describe la incorporación de los campos **Modalidad** (Presencial, Virtual, Híbrido) y **Lugar / Ubicación** en el formulario de creación de eventos, en la base de datos (PostgreSQL), en los datos simulados de desarrollo y en todas las vistas pertinentes de la interfaz de usuario.

---

## Preguntas Abiertas

> [!NOTE]
> No hay preguntas críticas pendientes. Se ha diseñado la solución con las mejores prácticas visuales e interactivas, incluyendo placeholders dinámicos según la modalidad seleccionada y badges de colores distintivos.

---

## Cambios Propuestos

### Base de Datos y Servicios de Datos

#### [MODIFY] [schema.sql](file:///c:/Users/angel/Desktop/Develop/Web%2520all%2520projects/Gestion_de_reservas/schema.sql)
- Agregar las columnas `modality` y `location` a la tabla `events`.
- Actualizar las inserciones iniciales (seeds) para incluir modalidad y ubicación en los eventos de demostración:
  - **Taller Avanzado de React y UX**: Presencial, en "Sala de Juntas B (Piso 3)".
  - **Cine Forum: El Dilema de las Redes Sociales**: Presencial, en "Auditorio Principal".
  - **Webinar: El Futuro de la IA en la Productividad Diaria**: Virtual, en "Enlace de Microsoft Teams".

#### [MODIFY] [api.ts](file:///c:/Users/angel/Desktop/Develop/Web%2520all%2520projects/Gestion_de_reservas/src/services/api.ts)
- Actualizar los datos de prueba del array `MOCK_EVENTS` para incorporar los nuevos campos (`modality` y `location`) con valores reales alineados a los de `schema.sql`.

---

### Aplicación Frontend (React)

#### [MODIFY] [App.tsx](file:///c:/Users/angel/Desktop/Develop/Web%2520all%2520projects/Gestion_de_reservas/src/App.tsx)
1. **Importaciones**: Importar el icono `MapPin` de la librería `lucide-react`.
2. **Datos Iniciales**: Actualizar `INITIAL_EVENTS` para reflejar la modalidad y ubicación correspondientes en cada evento predefinido.
3. **Estados del Formulario**:
   - Crear variables de estado: `formModality` (por defecto `"Presencial"`) y `formLocation` (vacío por defecto).
4. **Funciones del Formulario**:
   - `handleSaveEvent`: Adjuntar los campos `modality` y `location` en el payload enviado al guardar el evento. Si el lugar está vacío, asignar un valor por defecto apropiado según la modalidad (ej. "Enlace Virtual" para Virtual o "Instalaciones de la Empresa" para Presencial).
   - `startEditEvent`: Cargar la modalidad y el lugar del evento que se edita en las variables de estado correspondientes (con fallbacks en caso de eventos antiguos sin estos campos).
   - `resetAdminForm`: Reiniciar los estados de la modalidad y del lugar a sus valores predeterminados.
5. **Excel Import Logic**:
   - Actualizar `handleImportExcelData` para extraer y guardar los campos de modalidad y lugar (`modalidad` y `lugar`/`ubicacion` en español o inglés) desde las filas de Excel.
6. **Formulario UI (Panel de Administración)**:
   - Añadir una nueva fila con dos columnas:
     - **Modalidad** (Dropdown/Select): Opciones "Presencial", "Virtual", "Híbrido".
     - **Lugar / Enlace** (Input tipo text): Cambiar dinámicamente el `placeholder` según la modalidad activa para guiar al usuario administrador (ej. *"Ej. Sala A, Piso 2"* vs. *"Ej. Enlace de Teams / Zoom"*).
7. **Visualización en Tarjetas del Catálogo (Landing/Público)**:
   - Mostrar un badge estilizado y con color de acuerdo con la modalidad en la parte superior de la imagen de cada tarjeta:
     - **Presencial**: Verde esmeralda (`bg-emerald-600/90 text-white`).
     - **Virtual**: Azul cian (`bg-cyan-600/90 text-white`).
     - **Híbrido**: Naranja/Ámbar (`bg-amber-600/90 text-white`).
   - Mostrar la ubicación al lado de la información del facilitador, utilizando el icono `MapPin`.
8. **Visualización en el Detalle del Modal de Reservas**:
   - Reemplazar el texto estático de la modalidad por los datos dinámicos del evento actual (`selectedEventForModal.modality` y `selectedEventForModal.location`), usando los iconos correspondientes para mantener el diseño visual premium.
9. **Visualización en las Tarjetas de la Consola de Administración**:
   - Incluir una fila adicional pequeña de información de modalidad y lugar dentro de la tarjeta de evento del listado administrativo.

---

## Plan de Verificación

### Pruebas Manuales
- **Creación de Eventos**: Crear un evento nuevo seleccionando cada una de las modalidades y agregando una ubicación. Comprobar que aparezca en el listado con la modalidad (badge de color adecuado) y la ubicación indicadas.
- **Edición de Eventos**: Hacer clic en editar en un evento existente, comprobar que cargue su modalidad y ubicación en los campos del formulario, cambiar sus valores y guardar. Confirmar la actualización.
- **Detalle de Reserva**: Abrir el modal de reservas de un evento creado/modificado y verificar que muestre su modalidad y ubicación exactas en lugar de textos fijos.
- **Importación de Excel**: Subir un archivo de Excel de prueba y validar que, si contiene columnas de modalidad/lugar, se capturen correctamente.
- **Persistencia**: Recargar la página y verificar que se mantengan los cambios en el almacenamiento local (`localStorage`).
