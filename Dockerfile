FROM node:18-alpine


RUN npm install -g pnpm


ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"


WORKDIR /app


COPY package.json pnpm-lock.yaml ./


RUN pnpm install


COPY . .


RUN pnpm tsc


EXPOSE 3005


CMD ["node", "dist/index.js"]
