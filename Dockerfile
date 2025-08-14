FROM node:18

# 2️⃣ Set working directory
WORKDIR /app

# 3️⃣ Copy package files first (لتسريع build)
COPY package*.json ./

# 4️⃣ Install dependencies
RUN npm install --production

# 5️⃣ Copy source code
COPY . .

# 6️⃣ Expose port
EXPOSE 3000

# 7️⃣ Set environment
ENV NODE_ENV=production

# 8️⃣ Start the app
CMD ["node", "index.js"]
