FROM oven/bun:1 AS base
WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN bun install

# Expose port
EXPOSE 3000

# Start (this might handle building automatically)
CMD ["bun", "run", "start"]
