FROM node:22-alpine AS build
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./app/
COPY scraper/ ./scraper/
WORKDIR /app/app
RUN node ../scraper/copy-catalog.js
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
