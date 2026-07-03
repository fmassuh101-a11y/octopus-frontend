-- Arregla la columna que la app usa + siembra gigs de práctica
-- Empresa: blackjjames2257@gmail.com (36173943-0cd3-4e3c-ba92-3f1abc60ddbf)

ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS budget TEXT;

INSERT INTO public.gigs (company_id, company_name, title, description, budget, category, requirements, status)
VALUES
('36173943-0cd3-4e3c-ba92-3f1abc60ddbf','Bloom Skincare','Creador UGC para línea de skincare','Buscamos 3 videos UGC auténticos mostrando nuestra rutina de skincare. Estilo natural, luz de día, hablado a cámara.','$60.000 CLP','ugc','Cuenta activa en TikTok o Instagram. Buena dicción.','active'),
('36173943-0cd3-4e3c-ba92-3f1abc60ddbf','Nova Energy','Clippers para campaña de streams','Recorta los mejores momentos de nuestros streams y súbelos a TikTok. Pagamos por views. Ideal para gamers.','$1-3 por 1000 views','clipping','Saber editar clips verticales. Publicar en tu propia cuenta.','active'),
('36173943-0cd3-4e3c-ba92-3f1abc60ddbf','Fitmeal Chile','Reels de comida saludable','Necesitamos reels mostrando nuestros platos listos para comer. Enfoque apetitoso, transiciones dinámicas.','$45.000 CLP','comida','Experiencia en food content. Buena cámara.','active'),
('36173943-0cd3-4e3c-ba92-3f1abc60ddbf','Aura Cosmetics','Tutorial de maquillaje con nuestros productos','Video tutorial de un look completo usando nuestra paleta. Duración 60-90s para Reels y TikTok.','$80.000 CLP','belleza','Portfolio de maquillaje. +2000 seguidores.','active'),
('36173943-0cd3-4e3c-ba92-3f1abc60ddbf','PlayZone','Reseña de nuestro nuevo juego móvil','Gameplay + reseña honesta de nuestro juego. Formato vertical, energético, para audiencia gamer joven.','$70.000 CLP','gaming','Ser gamer activo. Publicar en TikTok/YouTube Shorts.','active'),
('36173943-0cd3-4e3c-ba92-3f1abc60ddbf','Andes Threads','Lookbook de nuestra colección de invierno','3 outfits con nuestra ropa, estilo street. Fotos + un reel de transiciones.','$90.000 CLP','moda','Sentido de estilo. Buena locación.','active'),
('36173943-0cd3-4e3c-ba92-3f1abc60ddbf','Pulse Fit','Rutina rápida con nuestra app','Video mostrando una rutina de 5 min usando nuestra app de fitness. Motivador y claro.','$55.000 CLP','fitness','Estar en forma. Grabar en gimnasio o casa.','active'),
('36173943-0cd3-4e3c-ba92-3f1abc60ddbf','Tenpo','Explica cómo abrir una cuenta en 1 min','Video corto y claro explicando lo fácil que es abrir una cuenta. Tono cercano, Gen-Z.','$100.000 CLP','marketing','Buena comunicación. Cuenta con engagement real.','active');

SELECT 'Gigs de práctica sembrados: ' || count(*) FROM public.gigs;
