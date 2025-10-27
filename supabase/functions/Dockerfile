# FinBuddy Backend Dockerfile
# For containerized deployment of Supabase Edge Functions

FROM denoland/deno:1.37.0

# Set working directory
WORKDIR /app

# Copy function files
COPY . .

# Cache dependencies
RUN deno cache --import-map=import_map.json **/*.ts

# Expose port
EXPOSE 8000

# Start the functions server
CMD ["deno", "run", "--allow-all", "--import-map=import_map.json", "serve.ts"]