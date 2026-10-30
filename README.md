# EDGIM

App web para llevar el control del gimnasio: series, repeticiones y peso por ejercicio, rutina con base científica, dieta, cardio, fotos de progreso y un rango de fuerza estilo ejército medieval.

Es una página estática (HTML, CSS y JavaScript, sin instalar nada). Funciona en el celular y en la computadora.

## Qué incluye

- **Entreno**: registra kg y reps por serie. Cada ejercicio tiene dos variantes (por ejemplo, curl libre o en polea). Muestra lo que hiciste la última vez, tu mejor serie, el descanso entre series y avisa cuándo subir peso.
- **Cardio diario**: cumple una de dos metas, pasos (8,000 por defecto) o minutos (30 por defecto), con racha de días.
- **Ejercicios**: más de 50 ejercicios comunes y los que tú crees, con historial y gráfica de 1RM estimado.
- **Rutina**:
  - Prioridades musculares del 1 al 4, split a elegir y músculo con el que empieza la semana.
  - Programa de 1 a 6 meses con progresión semanal y descargas configurables.
  - Edición completa de días y ejercicios.
  - Biblioteca de artículos (links, PDF y notas) y una biblioteca científica con 19 estudios.
- **Dieta**:
  - Calorías y macros calculados con tus datos.
  - Menú con pesos de comida ya cocida y piezas (tortillas, pan, fruta, huevo).
  - Hasta 2 snacks y alimentos a elegir.
  - Botón para cambiar cada platillo.
- **Progreso**: fotos con fecha y peso, comparación lado a lado, coach con IA que analiza tus fotos y te dice qué porcentaje llevas hacia tu físico ideal, y gráfica de peso.
- **Rango**: de Campesino de leva a Rey, según tu fuerza relativa en banca, sentadilla, peso muerto, press militar y dominadas.

## Cómo usarla

Ábrela desde su link de GitHub Pages (pasos abajo), en el celular o en la computadora.

No abras `index.html` con doble clic: el navegador no guarda bien los datos cuando la página se abre como archivo.

## Publicarla con GitHub Pages

1. En GitHub crea un repositorio nuevo, por ejemplo `edgim`.
2. Entra a **Add file → Upload files** y arrastra todos los archivos de esta carpeta. El `.gitignore` y el `.nojekyll` pueden no verse en el explorador de Windows; no pasa nada si no se suben.
3. Da clic en **Commit changes**.
4. Ve a **Settings → Pages**. En *Source* elige **Deploy from a branch**, rama **main**, carpeta **/ (root)**, y guarda.
5. En uno o dos minutos tu app queda en `https://TU-USUARIO.github.io/edgim/`. Ábrela en el celular y usa **Agregar a pantalla de inicio**.

## Inicio de sesión (cuentas para varias personas)

Con cuentas, cada persona entra con su correo y contraseña. Sus datos y fotos se guardan en su cuenta y se sincronizan entre el celular y la computadora. Nadie puede ver los datos de otra persona.

Usa [Supabase](https://supabase.com) (plan gratis). Se configura una sola vez:

1. Crea una cuenta en supabase.com y un **New project**. Anota la contraseña de la base de datos, aunque EDGIM no la usa.
2. Entra a **SQL Editor → New query**, pega todo el archivo `supabase-setup.sql` y da clic en **Run**. Esto crea la tabla, el espacio para las fotos y las reglas para que cada quien vea solo lo suyo.
3. Ve a **Project Settings → API** y copia el **Project URL** y la **anon public key**. Pégalos en `config.js`:
   ```js
   window.EDGIM_CONFIG = {
     supabaseUrl: "https://TU-PROYECTO.supabase.co",
     supabaseAnonKey: "eyJhbGciOi...",
   };
   ```
4. Ve a **Authentication → URL Configuration**:
   - **Site URL**: el link de tu app, por ejemplo `https://TU-USUARIO.github.io/edgim/`
   - **Redirect URLs**: agrega ese mismo link
5. Sube el `config.js` actualizado a GitHub.

Listo: al abrir la app aparece la pantalla para **Entrar** o **Crear cuenta**. Al crear una cuenta llega un correo de confirmación. También funciona **Olvidé mi contraseña**.

- La *anon public key* puede ser pública: la protegen las reglas de `supabase-setup.sql`. **Nunca** pongas la *service_role key* en `config.js`.
- Si dejas `config.js` vacío, la app funciona sin cuentas, con los datos solo en ese navegador.
- La primera vez que entras, si el navegador ya tenía datos (entrenos, fotos), la app pregunta si quieres pasarlos a tu cuenta.
- La API key de Claude nunca se sube: se queda solo en el navegador de cada persona.
- El plan gratis de Supabase incluye 500 MB de base de datos y 1 GB para fotos. Cada foto pesa unos 300 KB.

## Privacidad

- **Sin cuentas** (`config.js` vacío): tus datos se guardan **solo en el navegador** de cada dispositivo. Cualquiera puede abrir el link, pero ve la app vacía. Para pasar tus datos a otro dispositivo usa **Ajustes → Descargar respaldo** y luego **Restaurar respaldo**.
- **Con cuentas**: tus datos y fotos van a tu cuenta de Supabase, protegidos para que solo tú los veas. Al cerrar sesión se borra la copia de ese navegador.
- **Nunca subas tu API key ni tus respaldos (`edgim-respaldo-*.json`) al repositorio.** El `.gitignore` ya los excluye.

## Funciones con Claude (opcional)

El coach de fotos, la creación de rutinas con tus artículos, el ajuste de descargas y el menú con IA usan la API de Anthropic. Pega tu API key en **Rutina → ⚙ Ajustes**. Se guarda solo en tu navegador y cada consulta consume saldo de tu cuenta de Anthropic.

## Archivos

| Archivo | Para qué sirve |
| --- | --- |
| `index.html` | Estructura de la página y barra de pestañas |
| `styles.css` | Diseño, colores y tema claro/oscuro |
| `data.js` | Ejercicios, alimentos y biblioteca científica |
| `app.js` | Toda la lógica de la app |
| `auth.js` | Inicio de sesión y sincronización con Supabase |
| `config.js` | Datos de tu proyecto de Supabase (vacío = sin cuentas) |
| `supabase-setup.sql` | Tabla, almacenamiento de fotos y reglas de seguridad |
