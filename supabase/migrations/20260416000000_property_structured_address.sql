-- Structured address columns for properties + geocoding support.
-- Existing rows keep NULL; only new/edited records from the autocomplete
-- fill these fields.

ALTER TABLE properties ADD COLUMN IF NOT EXISTS street_name text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS street_number text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS latitude numeric(10,7);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS longitude numeric(10,7);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS google_place_id text;

-- Indexes for future filtering (only active rows)
CREATE INDEX IF NOT EXISTS idx_properties_province
  ON properties(account_id, province)
  WHERE deleted_at IS NULL AND province IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_city
  ON properties(account_id, city)
  WHERE deleted_at IS NULL AND city IS NOT NULL;

COMMENT ON COLUMN properties.street_name IS 'Street name parsed from Google Places (e.g. "Av. Corrientes")';
COMMENT ON COLUMN properties.street_number IS 'Street number. Nullable — some addresses have none';
COMMENT ON COLUMN properties.city IS 'administrative_area_level_2 from Google Places';
COMMENT ON COLUMN properties.province IS 'administrative_area_level_1 from Google Places (normalized)';
COMMENT ON COLUMN properties.postal_code IS 'Postal code from Google Places';
COMMENT ON COLUMN properties.country IS 'ISO 3166-1 alpha-2 country code (e.g. "AR")';
COMMENT ON COLUMN properties.latitude IS 'Geocoded latitude from Places geometry or Geocoding API';
COMMENT ON COLUMN properties.longitude IS 'Geocoded longitude from Places geometry or Geocoding API';
COMMENT ON COLUMN properties.google_place_id IS 'Google Places place_id for de-duping and re-fetching';
