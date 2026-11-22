# ==========================================================
# Stage 1: BuildBackend (Golang)
# ==========================================================
FROM golang:1.23-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /app/main main.go

# ==========================================================
# Stage 2: Final Minimal Runtime Image
# ==========================================================
FROM alpine:3.20
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Asia/Jakarta
ENV GIN_MODE=release
ENV SERVER_PORT=8080

COPY --from=builder /app/main /app/main
RUN mkdir -p /app/uploads

EXPOSE 8080

CMD ["./main"]
