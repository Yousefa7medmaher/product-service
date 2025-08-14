# Stage 1: Build
FROM node:18 AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Stage 2: Production
FROM node:18-slim

WORKDIR /app
COPY --from=builder /app ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]

