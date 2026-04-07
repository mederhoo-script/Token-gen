-- Migration 002: add fee_paid_wei to capture the on-chain service fee paid per deployment.
-- Nullable so that any tokens deployed via the legacy server-side path are unaffected.
ALTER TABLE public.tokens ADD COLUMN IF NOT EXISTS fee_paid_wei NUMERIC;
