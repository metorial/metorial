FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* yarn.lock* ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN bun ./scripts/build/src/index.ts

# Expose port
EXPOSE 3000

# Start
CMD ["bun", "run", "start"]
