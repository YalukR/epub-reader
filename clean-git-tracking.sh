#!/usr/bin/env bash
set -e

# ── Script para limpiar archivos que no deberían estar versionados ──────
# Corre esto desde la raíz del proyecto (donde está la carpeta .git)

echo "Verificando que estás en la raíz de un repo git..."
if [ ! -d ".git" ]; then
  echo "ERROR: no se encontró una carpeta .git aquí. Corre este script desde la raíz del proyecto."
  exit 1
fi

# Lista de rutas a destrackear (si existen en git, se quitan del índice
# pero se conservan en tu disco local, salvo que ya estén en .gitignore)
PATHS_TO_UNTRACK=(
  "android/app/build"
  "android/build"
  "android/.gradle"
  "android/local.properties"
  "android/app/src/main/assets/public"
  "android/app/src/main/assets/capacitor.config.json"
  "android/app/src/main/assets/capacitor.plugins.json"
  "android/captures"
  "node_modules"
  "dist"
)

echo ""
echo "Actualizando .gitignore..."
GITIGNORE_ADDITIONS="
# Capacitor / Android
android/app/build/
android/build/
android/.gradle/
android/local.properties
android/app/src/main/assets/public/
android/app/src/main/assets/capacitor.config.json
android/app/src/main/assets/capacitor.plugins.json
android/captures/
*.keystore
*.jks
google-services.json
.env
"

# Solo agrega el bloque si no existe ya (evita duplicados si corres el script dos veces)
if ! grep -q "Capacitor / Android" .gitignore 2>/dev/null; then
  echo "$GITIGNORE_ADDITIONS" >> .gitignore
  echo "  -> Bloque de Capacitor/Android agregado a .gitignore"
else
  echo "  -> .gitignore ya tenía el bloque de Capacitor/Android, no se duplicó"
fi

echo ""
echo "Destrackeando archivos/carpetas pesados o sensibles (se conservan en disco)..."
for path in "${PATHS_TO_UNTRACK[@]}"; do
  if git ls-files --error-unmatch "$path" > /dev/null 2>&1 || git ls-files "$path" | grep -q .; then
    echo "  -> Destrackeando: $path"
    git rm -r --cached "$path" > /dev/null 2>&1 || true
  else
    echo "  -> Ya no estaba trackeado (o no existe): $path"
  fi
done

echo ""
echo "Preparando commit..."
git add .gitignore
git add -A

echo ""
echo "Cambios listos para commitear:"
git status --short

echo ""
read -p "¿Confirmas el commit y push? (s/n): " CONFIRM
if [[ "$CONFIRM" == "s" || "$CONFIRM" == "S" ]]; then
  git commit -m "Remove build artifacts and local config from tracking"
  git push
  echo ""
  echo "Listo. Revisa tu repo en GitHub para confirmar que ya no aparecen esos archivos."
else
  echo ""
  echo "Cancelado. Los cambios quedaron en el staging (git status) por si quieres revisarlos antes de commitear a mano."
fi

echo ""
echo "IMPORTANTE: estos archivos siguen existiendo en commits anteriores del historial."
echo "Si llegaste a subir un .keystore real o un google-services.json con datos reales,"
echo "avísame: ese caso necesita revocar/regenerar las credenciales, no solo borrarlas."
