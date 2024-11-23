###########################################################
# Python Backend: Build Python Project into a wheel       #
###########################################################
FROM python:3.12-slim AS backend

# Set working directory
WORKDIR /app

# Copy source code
COPY ./backend/ ./

# Install dependencies
RUN python3 -m pip install build

# Build the wheel
RUN python3 -m build

###########################################################
# Development: Configure Development Environment          #
###########################################################
FROM node:22-slim AS development

ENV NEXT_TELEMETRY_DISABLED 1

EXPOSE 3000

# Copy python wheel dependencies from the backend stage
COPY --from=backend /app/dist/ /artifacts/python/

CMD ["npm", "run", "dev"]

###########################################################
# Stage 1: Setup the environment & install dependancies.  #
###########################################################
FROM node:22-alpine AS base

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./
# Perform a clean npm install
RUN npm ci

ENV NEXT_TELEMETRY_DISABLED 1

# Exclude files from the image using .dockerignore
COPY . .
COPY --from=backend /app/dist/ /app/public/

###########################################################
# Stage 2: Export as static content (html, js, css, etc)  #
###########################################################
FROM base AS builder
ENV NODE_ENV production

ARG BASE_PATH=""
ENV BASE_PATH $BASE_PATH

RUN npm run build

###########################################################
# Stage 3: Serve the static content using nginx           #
###########################################################
FROM nginx:alpine AS runner

# Copy the static content from the builder stage
COPY --from=builder /app/static_export /usr/share/nginx/html