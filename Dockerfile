FROM oven/bun:1 AS base
WORKDIR /app

# Copy everything (simpler approach for workspace projects)
COPY . .

# Install dependencies
RUN bun install

# Build
RUN bun ./scripts/build/src/index.ts

# Expose port
EXPOSE 3000

# Start
CMD ["bun", "run", "start"]
