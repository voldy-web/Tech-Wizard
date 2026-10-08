# ---- build stage -------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

# ---- run stage ---------------------------------------------------------------
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --uid 1001 app
COPY --from=build /app/target/tech-wizard-backend-*.jar app.jar
USER app

# Render injects PORT; the app reads it (server.port=${PORT:8080}).
ENV SPRING_PROFILES_ACTIVE=postgres \
    JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k"
EXPOSE 10000
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
