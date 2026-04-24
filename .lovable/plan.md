## Objetivo
Sustituir el icono actual (Zap / rayo) por el nuevo **logo LCC** (edificio azul con check rojo) en toda la interfaz, manteniendo la integridad visual del logo.

## Cambios

### 1. Asset
- Guardar el archivo subido como `src/assets/logo-lcc.png`.
- Importarlo como módulo (`import logoLcc from "@/assets/logo-lcc.png"`) para que Vite lo procese.

### 2. `src/components/layout/Sidebar.tsx`
- Eliminar el contenedor con `bg-gradient-accent shadow-glow` y el icono `<Zap />`.
- Reemplazarlo por:
  ```tsx
  <img src={logoLcc} alt="SIEC Bridge LCC" className="h-9 w-9 object-contain" />
  ```
- Eliminar `Zap` del import de `lucide-react`.

### 3. `src/pages/Login.tsx`
- **Panel izquierdo (marca, fondo azul):** El logo tiene azul oscuro propio que se perdería sobre `bg-gradient-primary`. Solución: envolver el logo en un contenedor blanco redondeado (`bg-white rounded-lg p-1.5`) para que el logo conserve sus colores originales y resalte sobre el fondo azul.
- **Logo móvil (parte superior derecha):** Reemplazar el contenedor `bg-gradient-accent` + `<Zap />` por el `<img>` con el logo (sin fondo, ya que va sobre fondo claro).
- Eliminar `Zap` del import de `lucide-react`.

## Lo que NO cambia
- Tipografía, colores de la app, layout general, textos de marca ("SIEC Bridge LCC", "Centro de Control").
- Resto de iconos de navegación (LayoutDashboard, FileText, etc.).

## Resultado esperado
El logo LCC aparece nítido tanto en el sidebar (sobre fondo claro/oscuro) como en ambas variantes del login (panel azul de marca y cabecera móvil), conservando sus colores corporativos azul y rojo.