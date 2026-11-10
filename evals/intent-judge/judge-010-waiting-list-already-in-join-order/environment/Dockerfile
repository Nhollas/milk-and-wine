FROM node:24-bookworm-slim
RUN npm install --global @anthropic-ai/claude-code
WORKDIR /app
COPY specs/ specs/
COPY src/ src/
COPY tests/ tests/
