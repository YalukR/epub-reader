# Epub Reader

Un lector de libros EPUB para Android, hecho como práctica personal para entender cómo funciona un lector de EPUB por dentro: parseo del formato, extracción de metadata/portada, almacenamiento local con SQLite nativo, y manejo de archivos en el filesystem del dispositivo vía Capacitor.

## Nota honesta sobre este proyecto

Este código fue desarrollado en parte con ayuda de IA (asistencia para escribir componentes, depurar errores y resolver problemas de integración con plugins nativos de Capacitor). No es un proyecto pulido ni una referencia de arquitectura perfecta — hay partes desordenadas, decisiones que podrían estar mejor organizadas, y seguramente algún que otro parche apresurado.

Dicho esto: **funciona**. La app importa EPUBs, extrae su metadata y portada, los guarda en una base de datos SQLite local (funcionando tanto en web como en Android nativo), y permite leerlos. Si estás buscando código para aprender de él, tómalo con esa expectativa: útil y funcional, no un ejemplo de mejores prácticas al 100%.

Si encuentras algo raro, contribuciones y correcciones son bienvenidas.

## Funcionalidades

- Importar archivos `.epub` desde el dispositivo.
- Extracción automática de título, autor y portada del libro.
- Biblioteca local con vista en grid.
- Lectura del EPUB integrada (via `epub.js`).
- Progreso de lectura y marcadores guardados en base de datos local.
- Tema claro/oscuro.
- Funciona tanto en navegador (para desarrollo) como en APK de Android (SQLite nativo).

## Stack técnico

- **Angular** (standalone components, signals)
- **Capacitor** — puente nativo para Android
- **@capacitor-community/sqlite** — base de datos SQLite (nativa en Android, WASM/`jeep-sqlite` en web)
- **@capacitor/filesystem** — almacenamiento de archivos EPUB y portadas
- **epub.js** — parseo y renderizado de EPUB
- **PrimeNG** — componentes de UI
- **Tailwind CSS**

## Instalación y desarrollo

```bash
# Clonar el repo
git clone https://github.com/YalukR/epub-reader.git
cd epub-reader

# Instalar dependencias
npm install

# Correr en navegador (modo desarrollo)
npm start
```

### Compilar para Android

```bash
npx cap sync android
cd android
./gradlew assembleDebug
```

El APK generado queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

> **Nota:** si es la primera vez que compilas, asegúrate de correr `npx cap sync android` después de cualquier `npm install`, o el plugin de SQLite puede no registrarse correctamente en el build nativo.

## Esquema de base de datos

La app usa tres tablas principales: `books`, `reading_progress` y `bookmarks`, con claves foráneas y `ON DELETE CASCADE` para mantener todo sincronizado al borrar un libro.

## Licencia

Este proyecto está licenciado bajo **GPL-3.0**. Puedes usarlo, modificarlo y distribuirlo libremente, siempre que cualquier trabajo derivado también se mantenga open source bajo la misma licencia. Ver el archivo [LICENSE](./LICENSE) para el texto completo.

## Contribuciones

Este es un proyecto personal/de aprendizaje, así que no esperes revisiones súper rigurosas de PRs, pero si quieres proponer una mejora, corregir un bug o sugerir algo, los issues y pull requests son bienvenidos.
