# Verlyx Hub - Guía de Despliegue Web

## 🌐 Resumen

Verlyx Hub ahora soporta **Flutter Web**, permitiendo acceder a la aplicación desde cualquier navegador moderno.

---

## 🚀 Inicio Rápido

### Opción 1: Desarrollo Local (Recomendado para empezar)

```powershell
# Ejecutar en modo desarrollo
.\run-web.ps1

# O manualmente
cd verlyx_hub_flutter
flutter run -d chrome
```

### Opción 2: Build de Producción

```powershell
# Construir para producción
.\run-web.ps1 -Build -Release

# Los archivos estarán en: verlyx_hub_flutter/build/web/
```

---

## 📋 Requisitos Previos

1. **Flutter SDK 3.24+** con soporte web habilitado
2. **Chrome** (para desarrollo)
3. **Backend corriendo** (NestJS en puerto 3000)
4. **Supabase** configurado

### Habilitar Web en Flutter

```powershell
flutter config --enable-web
flutter doctor
```

---

## ⚙️ Configuración

### 1. Variables de Entorno

Crea el archivo `.env` en `verlyx_hub_flutter/`:

```env
APP_NAME=Verlyx Hub
APP_ENV=production

# Tu backend desplegado
API_BASE_URL=https://api.verlyx.com/api

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### 2. CORS en Backend

El backend ya tiene CORS configurado. Solo asegúrate de que `CORS_ORIGIN` incluya tu dominio web:

```env
# En verlyx_hub_backend/.env
CORS_ORIGIN=http://localhost:8080,https://app.verlyx.com
```

---

## 🏗️ Opciones de Despliegue

### A. Vercel (Recomendado - Gratis)

1. **Construir la app:**
   ```powershell
   cd verlyx_hub_flutter
   flutter build web --release
   ```

2. **Desplegar:**
   ```powershell
   # Instalar Vercel CLI
   npm i -g vercel
   
   # Desplegar
   cd build/web
   vercel
   ```

3. **Configurar dominio** en el dashboard de Vercel

---

### B. Firebase Hosting (Recomendado para Firebase users)

1. **Instalar Firebase CLI:**
   ```powershell
   npm install -g firebase-tools
   firebase login
   ```

2. **Inicializar proyecto:**
   ```powershell
   cd verlyx_hub_flutter
   firebase init hosting
   # Seleccionar: build/web como directorio público
   # Configurar como SPA: Yes
   ```

3. **Construir y desplegar:**
   ```powershell
   flutter build web --release
   firebase deploy --only hosting
   ```

---

### C. Netlify

1. **Construir:**
   ```powershell
   flutter build web --release
   ```

2. **Arrastrar `build/web/`** a [netlify.com/drop](https://app.netlify.com/drop)

3. O usar CLI:
   ```powershell
   npm i -g netlify-cli
   cd build/web
   netlify deploy --prod
   ```

---

### D. Docker + Nginx

1. **Crear Dockerfile:**

```dockerfile
# Dockerfile.web
FROM nginx:alpine

# Copiar build de Flutter
COPY verlyx_hub_flutter/build/web /usr/share/nginx/html

# Configuración de Nginx para SPA
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. **Construir y ejecutar:**
   ```powershell
   flutter build web --release
   docker build -f Dockerfile.web -t verlyx-hub-web .
   docker run -p 80:80 verlyx-hub-web
   ```

---

## 🔧 Optimizaciones para Producción

### 1. Web Renderers

- **CanvasKit** (default): Mejor para gráficos complejos, más grande (~2MB)
- **HTML**: Más ligero, mejor para SEO, menos features

```powershell
# CanvasKit (recomendado)
flutter build web --web-renderer canvaskit

# HTML (más ligero)
flutter build web --web-renderer html

# Auto (Flutter decide)
flutter build web --web-renderer auto
```

### 2. Compresión

Asegúrate de que tu servidor habilite gzip/brotli:

```nginx
# nginx.conf
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### 3. Cache Headers

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## 🐛 Troubleshooting

### Error: "No devices found"
```powershell
flutter config --enable-web
flutter doctor -v
```

### Error: "CORS blocked"
Asegúrate de que el backend permita tu origen:
```typescript
// main.ts
app.enableCors({
  origin: ['http://localhost:8080', 'https://tu-dominio.com'],
  credentials: true,
});
```

### Error: "SharedPreferences not available"
El código ya está adaptado para usar `SharedPreferences` en web en lugar de `FlutterSecureStorage`.

### Pantalla blanca
Revisa la consola del navegador (F12) para errores de JavaScript.

---

## 📱 Características Web-Específicas

| Feature | Estado | Notas |
|---------|--------|-------|
| Responsive Layout | ✅ | Adaptable a desktop/tablet/mobile |
| PWA | ✅ | Instalable como app |
| Hot Reload | ✅ | Durante desarrollo |
| Deep Linking | ✅ | go_router compatible |
| Local Storage | ✅ | SharedPreferences en web |
| File Upload | ✅ | file_picker compatible |
| Notifications | ⚠️ | Usar Web Push API |
| Pagos | ✅ | Redirect flow de MercadoPago |

---

## 📊 Stack Completo de Producción

```
                    ┌─────────────────────┐
                    │   CloudFlare CDN    │
                    │   (SSL + Cache)     │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
    ┌─────▼─────┐       ┌─────▼──────┐      ┌─────▼─────┐
    │  Vercel   │       │   NestJS   │      │ Supabase  │
    │ (Flutter  │       │  Backend   │      │    DB     │
    │   Web)    │       │   (API)    │      │ + Auth    │
    └───────────┘       └────────────┘      └───────────┘
    app.verlyx.com      api.verlyx.com      *.supabase.co
```

---

## ✅ Checklist de Despliegue

- [ ] Backend desplegado y accesible
- [ ] Variables de entorno configuradas
- [ ] CORS habilitado para dominio de producción
- [ ] Build de producción generado
- [ ] Probado en Chrome, Firefox, Safari, Edge
- [ ] PWA manifest configurado
- [ ] SSL/HTTPS habilitado
- [ ] Analytics configurado (opcional)
- [ ] Error tracking configurado (Sentry, opcional)

---

## 🎉 ¡Listo!

Tu aplicación Verlyx Hub ahora está disponible en la web. Los usuarios pueden acceder desde cualquier navegador moderno sin necesidad de instalar nada.

**URLs sugeridas:**
- Frontend Web: `https://app.verlyx.com`
- Backend API: `https://api.verlyx.com`
- Docs: `https://docs.verlyx.com`
