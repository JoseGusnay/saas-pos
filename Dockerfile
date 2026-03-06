# Etapa 1: Construcción (Build)
FROM node:20-alpine AS build

WORKDIR /app

# Copiar dependencias y lockfile
COPY package*.json ./

# Instalar usando ci para asegurar limpieza y rapidez
RUN npm install

# Copiar el código fuente
COPY . .

# Compilar la aplicación en modo producción
RUN npm run build -- --configuration production

# Etapa 2: Producción con Nginx
FROM nginx:1.25-alpine

# Borramos la web por defecto de nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiamos nuestra configuración de Nginx adaptada para Angular (SPA)
COPY nginx-custom.conf /etc/nginx/conf.d/default.conf

# Copiamos los archivos estáticos desde la etapa de build
# Nota: Ajusta 'saas-pos' si en tu angular.json el output path es diferente
COPY --from=build /app/dist/saas-pos/browser /usr/share/nginx/html

# Exponer el puerto
EXPOSE 80

# Comando para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
