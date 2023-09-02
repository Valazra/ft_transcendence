# Dockerfile (./react-frontend/Dockerfile)

# Étape 1 : Construire l'application React
FROM node:lts AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Étape 2 : Déployer l'application React pour l'environnement de développement
FROM node:lts AS development
WORKDIR /app
COPY --from=build /app .
EXPOSE 3000
CMD ["npm", "start"]

# Étape 3 : Déployer l'application React pour l'environnement de production avec Nginx
FROM nginx:lts-alpine AS production
COPY --from=build /app/build /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
