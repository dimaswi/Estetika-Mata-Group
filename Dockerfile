# ==========================================================
# Stage 1: Build Frontend (React + Vite)
# ==========================================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================================
# Stage 2: Build Backend (Golang)
# ==========================================================
FROM golang:1.23-alpine AS backend-builder
WORKDIR /app/backend

RUN apk add --no-cache git ca-certificates tzdata

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /app/emg-server main.go

# ==========================================================
# Stage 3: Final Minimal Production Image
# ==========================================================
FROM alpine:3.20
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Asia/Jakarta
ENV GIN_MODE=release
ENV SERVER_PORT=8080
ENV FRONTEND_DIST=/app/dist

# Copy binary backend
COPY --from=backend-builder /app/emg-server /app/emg-server

# Copy hasil build frontend ke /app/dist
COPY --from=frontend-builder /app/frontend/dist /app/dist

# Buat direktori uploads untuk logo/favicon
RUN mkdir -p /app/uploads

EXPOSE 8080

CMD ["/app/emg-server"]
