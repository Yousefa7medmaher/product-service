FROM node:18

# 1️⃣ Set working directory
WORKDIR /app

# 2️⃣ Copy package files
COPY package*.json ./

# 3️⃣ Install dependencies
RUN npm install --production

# 4️⃣ Copy source code
COPY . .

# 5️⃣ Expose port
EXPOSE 3000

# 6️⃣ Environment
ENV NODE_ENV=production
ENV PORT=3000

# 7️⃣ Start the server
CMD ["node", "src/server.js"]
