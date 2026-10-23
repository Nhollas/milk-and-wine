FROM node:24-bookworm-slim
WORKDIR /app
RUN npm install --global pnpm@12.3.4
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY src ./src
EXPOSE 3000
CMD ["node", "src/loans/main.ts"]
