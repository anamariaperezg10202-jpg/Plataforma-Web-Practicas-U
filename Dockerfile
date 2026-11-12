FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
ENV PORT=3000 DB_PATH=/data/practicas.db
VOLUME /data
EXPOSE 3000
CMD ["node", "src/server.js"]
