-- Migration 007: Split guardian public_key into signing_public_key + encryption_public_key
--
-- Prior to this migration the single public_key column was used ambiguously.
-- QRPairScreen v2 introduced separate ECDSA (signing) and ECDH (encryption) keys.
-- This migration preserves existing data by copying public_key → signing_public_key.

ALTER TABLE guardians ADD COLUMN signing_public_key TEXT;
ALTER TABLE guardians ADD COLUMN encryption_public_key TEXT;

-- Preserve any previously stored key as the signing key
UPDATE guardians SET signing_public_key = public_key WHERE public_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guardians_signing_key ON guardians(signing_public_key)
  WHERE signing_public_key IS NOT NULL;
