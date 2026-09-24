-- The public CSR and volunteer forms now ask for fewer mandatory answers.
--
-- CSR enquiry: indicative budget and area of interest are optional.
-- Volunteer registration: only name, date of birth, email, phone and city are required;
-- the emergency-contact group and photo upload were removed from the form altogether.
--
-- Existing rows keep their values; the columns simply accept NULL from now on.

ALTER TABLE `csr_enquiries`
    MODIFY `budget`           DECIMAL(14,2) NULL,
    MODIFY `area_of_interest` VARCHAR(150)  NULL;

ALTER TABLE `volunteers`
    MODIFY `pincode`                VARCHAR(10)  NULL,
    MODIFY `occupation_type`        ENUM('student', 'working', 'other') NULL,
    MODIFY `institution`            VARCHAR(200) NULL,
    MODIFY `hours_per_week`         INT          NULL,
    MODIFY `area_of_interest`       VARCHAR(150) NULL,
    MODIFY `emergency_name`         VARCHAR(150) NULL,
    MODIFY `emergency_relationship` VARCHAR(100) NULL,
    MODIFY `emergency_phone`        VARCHAR(20)  NULL;
