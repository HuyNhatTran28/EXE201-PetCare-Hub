package com.petcare_hub.configuration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseMigration implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        log.info("=== RUNNING DATABASE SCHEMA MIGRATIONS ===");
        try {
            // Drop the old check constraint to allow the new SUSPENDED status
            jdbcTemplate.execute("ALTER TABLE hotels DROP CONSTRAINT IF EXISTS hotels_status_check");
            log.info("Successfully dropped check constraint 'hotels_status_check' to allow SUSPENDED status.");
        } catch (Exception e) {
            log.warn("Could not drop constraint 'hotels_status_check': " + e.getMessage());
        }

        try {
            // Drop unique constraint on (reporter_id, hotel_id) in hotel_reports to allow recurring reports
            String dropConstraintSql = "DO $$\n" +
                    "DECLARE\n" +
                    "    const_name text;\n" +
                    "BEGIN\n" +
                    "    SELECT tc.constraint_name \n" +
                    "    INTO const_name\n" +
                    "    FROM information_schema.table_constraints AS tc \n" +
                    "    JOIN information_schema.key_column_usage AS kcu \n" +
                    "      ON tc.constraint_name = kcu.constraint_name \n" +
                    "      AND tc.table_schema = kcu.table_schema\n" +
                    "    WHERE tc.constraint_type = 'UNIQUE' \n" +
                    "      AND tc.table_name = 'hotel_reports'\n" +
                    "      AND kcu.column_name IN ('reporter_id', 'hotel_id')\n" +
                    "    GROUP BY tc.constraint_name\n" +
                    "    HAVING COUNT(kcu.column_name) = 2;\n" +
                    "\n" +
                    "    IF const_name IS NOT NULL THEN\n" +
                    "        EXECUTE 'ALTER TABLE hotel_reports DROP CONSTRAINT ' || const_name;\n" +
                    "    END IF;\n" +
                    "END $$;";
            jdbcTemplate.execute(dropConstraintSql);
            log.info("Successfully dropped any unique constraint on hotel_reports(reporter_id, hotel_id) to allow recurring reports.");
        } catch (Exception e) {
            log.warn("Could not drop unique constraint on hotel_reports: " + e.getMessage());
        }

        try {
            // Unlock all PARTNER users to restore access after previous manual locks
            jdbcTemplate.execute("UPDATE users SET is_active = true WHERE role = 'PARTNER'");
            log.info("Successfully unlocked all PARTNER accounts to restore login capability.");
        } catch (Exception e) {
            log.warn("Could not unlock partner accounts: " + e.getMessage());
        }
    }
}
