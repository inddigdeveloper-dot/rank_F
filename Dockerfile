FROM node:20-slim

WORKDIR /app

# 1. Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# 2. Copy the rest of your code
COPY . .

# 3. CRITICAL: Build the production application
RUN npm run build

# 4. Set the environment to production
ENV NODE_ENV=production

# 5. Start the production server
CMD ["npm", "run", "start"]