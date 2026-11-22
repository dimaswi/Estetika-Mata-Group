package config

import (
	"os"
)

type Config struct {
	DatabaseDSN    string
	JWTSecret      string
	ServerPort     string
	AllowedOrigins string
	FrontendDist   string
}

func Load() *Config {
	return &Config{
		DatabaseDSN:    getEnv("DATABASE_DSN", "host=localhost user=starter password=starter123 dbname=starter port=5434 sslmode=disable"),
		JWTSecret:      getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		ServerPort:     getEnv("SERVER_PORT", "8080"),
		AllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", ""),
		FrontendDist:   getEnv("FRONTEND_DIST", "../frontend/dist"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
