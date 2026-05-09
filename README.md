# Calendario de Tareas

Aplicación web de calendario y gestión de tareas construida con [Astro](https://astro.build) y [Tailwind CSS](https://tailwindcss.com).

## Características

- 📅 Vistas de mes, semana y día con navegación por teclado
- 🏷️ Sistema de etiquetas con colores personalizables
- 🔄 Tareas recurrentes (diarias, semanales, mensuales)
- 🔍 Búsqueda y filtro de tareas completadas
- 🌙 Modo oscuro
- 📤 Exportación e importación de tareas (JSON)
- 🔔 Notificaciones del navegador para recordatorios
- 🖱️ Drag & drop para reorganizar tareas entre días
- 💾 Persistencia en localStorage

## Estructura del proyecto

```text
/
├── public/
│   └── favicon.svg           # Icono del sitio
├── src/
│   ├── components/           # Componentes Astro
│   │   ├── CalendarPanel.astro
│   │   ├── Header.astro
│   │   ├── Modals.astro
│   │   └── Sidebar.astro
│   ├── layouts/
│   │   └── Layout.astro      # Layout principal con meta tags y SEO
│   ├── pages/
│   │   └── index.astro       # Página principal
│   ├── scripts/
│   │   └── calendar.ts       # Lógica de la aplicación en TypeScript
│   └── styles/
│       └── global.css        # Estilos globales, variables CSS, dark mode
└── package.json
```

## Comandos

| Comando           | Acción                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Instala dependencias                        |
| `npm run dev`     | Inicia servidor de desarrollo en `localhost:4321` |
| `npm run build`   | Construye el sitio para producción          |
| `npm run preview` | Previsualiza la build local                 |

## Requisitos

- Node.js >= 22.12.0
