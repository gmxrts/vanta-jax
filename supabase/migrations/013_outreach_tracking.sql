-- Migration 013: Add outreach tracking columns to businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS outreach_count   INT       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outreach_sent_at TIMESTAMPTZ;
