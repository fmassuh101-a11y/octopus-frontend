-- =====================================================
-- OCTOPUS SUPPORT CHAT SYSTEM
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Tabla de conversaciones de soporte
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  user_name TEXT,
  user_type TEXT, -- 'creator' or 'company'
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'waiting_agent', 'in_progress', 'resolved', 'closed')),
  assigned_agent_id UUID REFERENCES auth.users(id),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de mensajes de soporte
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.support_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'bot', 'agent')),
  sender_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_escalated BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de admins de soporte (para controlar quién puede ver/responder)
CREATE TABLE IF NOT EXISTS public.support_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'agent' CHECK (role IN ('agent', 'supervisor', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar el admin inicial (fmassuh133@gmail.com)
-- Primero necesitamos el user_id del usuario con ese email
-- Lo haremos después de que exista el usuario

-- 4. Habilitar RLS
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_admins ENABLE ROW LEVEL SECURITY;

-- 5. Políticas para support_conversations

-- Los usuarios pueden ver sus propias conversaciones
DROP POLICY IF EXISTS "Users can view own conversations" ON public.support_conversations;
CREATE POLICY "Users can view own conversations" ON public.support_conversations
  FOR SELECT USING (auth.uid() = user_id);

-- Los admins pueden ver todas las conversaciones
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.support_conversations;
CREATE POLICY "Admins can view all conversations" ON public.support_conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM support_admins WHERE user_id = auth.uid() AND is_active = true)
  );

-- Los usuarios pueden crear conversaciones
DROP POLICY IF EXISTS "Users can create conversations" ON public.support_conversations;
CREATE POLICY "Users can create conversations" ON public.support_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias conversaciones
DROP POLICY IF EXISTS "Users can update own conversations" ON public.support_conversations;
CREATE POLICY "Users can update own conversations" ON public.support_conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- Los admins pueden actualizar cualquier conversación
DROP POLICY IF EXISTS "Admins can update all conversations" ON public.support_conversations;
CREATE POLICY "Admins can update all conversations" ON public.support_conversations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM support_admins WHERE user_id = auth.uid() AND is_active = true)
  );

-- 6. Políticas para support_messages

-- Los usuarios pueden ver mensajes de sus conversaciones
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.support_messages;
CREATE POLICY "Users can view messages in own conversations" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
      AND support_conversations.user_id = auth.uid()
    )
  );

-- Los admins pueden ver todos los mensajes
DROP POLICY IF EXISTS "Admins can view all messages" ON public.support_messages;
CREATE POLICY "Admins can view all messages" ON public.support_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM support_admins WHERE user_id = auth.uid() AND is_active = true)
  );

-- Los usuarios pueden crear mensajes en sus conversaciones
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON public.support_messages;
CREATE POLICY "Users can create messages in own conversations" ON public.support_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = conversation_id
      AND support_conversations.user_id = auth.uid()
    )
    OR sender_type = 'bot'
  );

-- Los admins pueden crear mensajes
DROP POLICY IF EXISTS "Admins can create messages" ON public.support_messages;
CREATE POLICY "Admins can create messages" ON public.support_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM support_admins WHERE user_id = auth.uid() AND is_active = true)
  );

-- Los admins pueden actualizar mensajes (marcar como leído)
DROP POLICY IF EXISTS "Admins can update messages" ON public.support_messages;
CREATE POLICY "Admins can update messages" ON public.support_messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM support_admins WHERE user_id = auth.uid() AND is_active = true)
  );

-- 7. Políticas para support_admins

-- Solo admins pueden ver la lista de admins
DROP POLICY IF EXISTS "Admins can view admins" ON public.support_admins;
CREATE POLICY "Admins can view admins" ON public.support_admins
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM support_admins WHERE user_id = auth.uid() AND is_active = true)
  );

-- 8. Índices para mejor performance
CREATE INDEX IF NOT EXISTS support_conversations_user_id_idx ON public.support_conversations(user_id);
CREATE INDEX IF NOT EXISTS support_conversations_status_idx ON public.support_conversations(status);
CREATE INDEX IF NOT EXISTS support_conversations_updated_at_idx ON public.support_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS support_messages_conversation_id_idx ON public.support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS support_messages_created_at_idx ON public.support_messages(created_at);

-- 9. Trigger para actualizar updated_at y last_message_at
CREATE OR REPLACE FUNCTION update_support_conversation_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE support_conversations
    SET updated_at = NOW(), last_message_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_conversation_on_message ON public.support_messages;
CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON public.support_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_support_conversation_timestamps();

-- 10. Agregar admin inicial
-- Ejecutar esto DESPUÉS de que el usuario fmassuh133@gmail.com exista:
/*
INSERT INTO public.support_admins (user_id, email, role, is_active)
SELECT id, 'fmassuh133@gmail.com', 'admin', true
FROM auth.users
WHERE email = 'fmassuh133@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
*/

-- Para agregar manualmente (reemplaza USER_ID con el ID real):
-- INSERT INTO public.support_admins (user_id, email, role, is_active)
-- VALUES ('USER_ID_HERE', 'fmassuh133@gmail.com', 'admin', true);

-- 11. Verificar
SELECT 'Tablas creadas:' as info;
SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'support%';
