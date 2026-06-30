package com.petcare_hub.configuration;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class PostGisConfig {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void initPostGis() {
        log.info("Initializing PostGIS extension and spatial index...");
        try {
            // TẠM THỜI KHÓA 2 DÒNG NÀY LẠI ĐỂ APP KHÔNG BỊ SẬP KHI KHỞI ĐỘNG
            // jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS postgis");
            // log.info("PostGIS extension checked/enabled successfully.");

            // jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_hotels_spatial_coord ON hotels USING gist (ST_SetSRID(ST_Point(location_long, location_lat), 4326))");
            // log.info("Spatial index on hotels checked/created successfully.");

            log.warn("Đã tạm thời bỏ qua kích hoạt PostGIS tự động để chạy thử nghiệm các tính năng khác.");
            
            // Drop check constraints from diaries table to allow free text for eating, mood and activity
            log.info("Dropping diaries check constraints...");
            jdbcTemplate.execute("ALTER TABLE diaries DROP CONSTRAINT IF EXISTS diaries_mood_check");
            jdbcTemplate.execute("ALTER TABLE diaries DROP CONSTRAINT IF EXISTS diaries_eating_check");
            jdbcTemplate.execute("ALTER TABLE diaries DROP CONSTRAINT IF EXISTS diaries_activity_check");
            log.info("Diaries check constraints dropped successfully.");
        } catch (Exception e) {
            log.error("Error initializing PostGIS: " + e.getMessage(), e);
        }
    }
}