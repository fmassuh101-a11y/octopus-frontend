-- =====================================================
-- VERIFICACION Y ARREGLO COMPLETO DEL SISTEMA
-- Ejecutar TODO este script en Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PARTE 1: VERIFICAR ESTRUCTURA DE LA TABLA MESSAGES
-- =====================================================

-- Ver la estructura actual de messages
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- Ver las foreign keys de messages
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'messages'
    AND tc.constraint_type = 'FOREIGN KEY';

-- =====================================================
-- PARTE 2: VERIFICAR RLS POLICIES ACTUALES
-- =====================================================

-- Ver todas las policies de la tabla messages
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'messages';

-- =====================================================
-- PARTE 3: ELIMINAR POLICIES EXISTENTES Y CREAR NUEVAS
-- =====================================================

-- Eliminar todas las policies existentes de messages
DROP POLICY IF EXISTS "Messages can be viewed by participants" ON messages;
DROP POLICY IF EXISTS "Messages can be created by participants" ON messages;
DROP POLICY IF EXISTS "Creators can view messages" ON messages;
DROP POLICY IF EXISTS "Companies can view messages" ON messages;
DROP POLICY IF EXISTS "Creators can insert messages" ON messages;
DROP POLICY IF EXISTS "Companies can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages" ON messages;

-- Habilitar RLS si no esta habilitado
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- CREAR NUEVAS POLICIES CORRECTAS

-- Policy 1: Las empresas pueden ver mensajes de sus aplicaciones
CREATE POLICY "Companies can view messages"
ON messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = messages.conversation_id
        AND applications.company_id = auth.uid()
    )
);

-- Policy 2: Los creadores pueden ver mensajes de sus aplicaciones
CREATE POLICY "Creators can view messages"
ON messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = messages.conversation_id
        AND applications.creator_id = auth.uid()
    )
);

-- Policy 3: Las empresas pueden enviar mensajes
CREATE POLICY "Companies can insert messages"
ON messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = conversation_id
        AND applications.company_id = auth.uid()
    )
    AND sender_type = 'company'
    AND sender_id = auth.uid()
);

-- Policy 4: Los creadores pueden responder (si ya hay mensajes de la empresa)
CREATE POLICY "Creators can insert messages"
ON messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = conversation_id
        AND applications.creator_id = auth.uid()
    )
    AND sender_type = 'creator'
    AND sender_id = auth.uid()
    AND (
        -- El creador solo puede responder si la empresa ya envio mensaje
        EXISTS (
            SELECT 1 FROM messages m2
            WHERE m2.conversation_id = conversation_id
            AND m2.sender_type = 'company'
        )
    )
);

-- =====================================================
-- PARTE 4: VERIFICAR DATOS DE PRUEBA
-- =====================================================

-- Ver aplicaciones aceptadas
SELECT
    a.id as application_id,
    a.creator_id,
    a.company_id,
    a.status,
    p.full_name as creator_name,
    g.title as gig_title
FROM applications a
LEFT JOIN profiles p ON p.user_id = a.creator_id
LEFT JOIN gigs g ON g.id = a.gig_id
WHERE a.status = 'accepted'
LIMIT 10;

-- Ver mensajes existentes
SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    m.sender_type,
    LEFT(m.content, 50) as content_preview,
    m.created_at
FROM messages m
ORDER BY m.created_at DESC
LIMIT 10;

-- =====================================================
-- PARTE 5: VERIFICAR QUE TODO FUNCIONA
-- =====================================================

-- Verificar las nuevas policies
SELECT
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'messages';

-- =====================================================
-- PARTE 6: RECARGAR CACHE (IMPORTANTE)
-- =====================================================

-- Notificar a PostgREST para recargar el schema
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
