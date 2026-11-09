FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend/payload
COPY backend/payload/package*.json ./
RUN npm ci
COPY backend/payload ./
COPY backend/shared /app/backend/shared
COPY docs/seed-*.json /app/docs/
ENV SEED_DIR=/app/docs NEXT_TELEMETRY_DISABLED=1
RUN PAYLOAD_SECRET=build-only-secret-not-used-at-runtime npm run build
RUN chown -R node:node .next
USER node
EXPOSE 3002
CMD ["sh","-c","npm run migrate && npm run seed && npm start"]
