-- Migration 012: adiciona campos de notificação WhatsApp no perfil
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp_phone    TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_api_key  TEXT;
