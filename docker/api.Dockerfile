FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend/nest
COPY backend/nest/package*.json ./
RUN npm ci
COPY backend/nest ./
COPY backend/shared /app/backend/shared
COPY docs/seed-*.json /app/docs/
ENV SEED_DIR=/app/docs
RUN npm run build
USER node
EXPOSE 3001
CMD ["sh","-c","npm run migrate && npm run seed && npm start"]
