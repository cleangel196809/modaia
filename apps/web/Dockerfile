FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Next.js resuelve rewrites() en build time (queda grabado en routes-manifest.json), no al
# arrancar el contenedor, así que esta variable tiene que existir aquí y no solo en
# docker-compose.yml. 'api' es el nombre del servicio en la red interna de Docker Compose.
ENV API_INTERNAL_URL=http://api:3001/api
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/next.config.js ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "run", "start"]
