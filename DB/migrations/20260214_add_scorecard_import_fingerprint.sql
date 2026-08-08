ALTER TABLE match_data ADD COLUMN Import_Fingerprint TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_group_import_fingerprint
    ON match_data(group_id, Import_Fingerprint)
    WHERE Import_Fingerprint IS NOT NULL;
