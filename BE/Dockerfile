# ── Stage 1: build JAR bằng Maven + JDK 21 ──────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml trước, tải dependency riêng để tận dụng layer cache của Docker
# (chỉ tải lại dependency khi pom.xml đổi, không phải mỗi lần sửa code Java)
COPY pom.xml .
RUN mvn -B dependency:go-offline

# Copy source sau cùng — sửa code không làm mất cache dependency ở trên
COPY src ./src
RUN mvn -B clean package -DskipTests

# ── Stage 2: chạy JAR bằng JRE 21 slim ───────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
