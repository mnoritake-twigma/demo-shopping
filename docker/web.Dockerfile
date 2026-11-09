FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY src ./src
COPY public ./public
ENV VITE_API_MODE=remote VITE_API_BASE_URL=/api
RUN npm run build && cp node_modules/swagger-ui-dist/swagger-ui.css node_modules/swagger-ui-dist/swagger-ui-bundle.js node_modules/swagger-ui-dist/LICENSE dist/api-docs/
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
