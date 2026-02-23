# Stage 1: Build
FROM node:18 AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Stage 2: Production
FROM node:18-slim
RUN  addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser 

WORKDIR /app
COPY --from=builder --chown=appuser:appgroup /app ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]

