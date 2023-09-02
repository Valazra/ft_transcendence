# Dockerfile (./database/Dockerfile)

# Utilisez une image PostgreSQL officielle comme image de base
FROM postgres:latest

# Copiez les scripts d'initialisation de la base de données (si nécessaire) dans le dossier /docker-entrypoint-initdb.d/
# Les scripts dans ce dossier seront automatiquement exécutés lors de la première initialisation de la base de données
# COPY ./init-scripts/ /docker-entrypoint-initdb.d/

# Exposez le port sur lequel la base de données sera accessible (5432 dans ce cas)
EXPOSE 5432
