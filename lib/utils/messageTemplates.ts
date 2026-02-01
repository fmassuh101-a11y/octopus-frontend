// Utilidades para procesar templates de mensajes

export interface MessageTemplate {
  id: string
  company_id: string
  title: string
  content: string
  category: string
  use_count: number
  created_at: string
  updated_at: string
}

export interface TemplateVariables {
  nombre: string
  gig_title: string
  company_name: string
  budget?: string
  category?: string
}

// Variables disponibles para templates
export const AVAILABLE_VARIABLES = [
  { key: 'nombre', label: 'Nombre del creador', example: 'Maria' },
  { key: 'gig_title', label: 'Titulo del gig', example: 'UGC Video' },
  { key: 'company_name', label: 'Nombre de la empresa', example: 'BrandX' },
  { key: 'budget', label: 'Presupuesto', example: '$500' },
  { key: 'category', label: 'Categoria', example: 'Video' },
]

// Categorias de templates
export const TEMPLATE_CATEGORIES = [
  { id: 'bienvenida', label: 'Bienvenida', emoji: '👋' },
  { id: 'negociacion', label: 'Negociacion', emoji: '💼' },
  { id: 'detalles', label: 'Detalles', emoji: '📋' },
  { id: 'cierre', label: 'Cierre', emoji: '✅' },
  { id: 'general', label: 'General', emoji: '💬' },
]

/**
 * Procesa un template reemplazando variables con valores reales
 */
export function processTemplate(
  template: string,
  variables: TemplateVariables
): string {
  let processed = template

  // Reemplazar cada variable
  processed = processed.replace(/\{nombre\}/g, variables.nombre || '')
  processed = processed.replace(/\{gig_title\}/g, variables.gig_title || '')
  processed = processed.replace(/\{company_name\}/g, variables.company_name || '')
  processed = processed.replace(/\{budget\}/g, variables.budget || '')
  processed = processed.replace(/\{category\}/g, variables.category || '')

  return processed
}

/**
 * Extrae las variables usadas en un template
 */
export function extractVariables(template: string): string[] {
  const regex = /\{(\w+)\}/g
  const matches = template.match(regex) || []
  const uniqueVars = Array.from(new Set(matches.map(m => m.replace(/[{}]/g, ''))))
  return uniqueVars
}

/**
 * Valida un template
 */
export function validateTemplate(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!content.trim()) {
    errors.push('El contenido no puede estar vacio')
  }

  if (content.length > 2000) {
    errors.push('El contenido no puede exceder 2000 caracteres')
  }

  // Verificar variables validas
  const usedVariables = extractVariables(content)
  const validVariableKeys = AVAILABLE_VARIABLES.map(v => v.key)

  usedVariables.forEach(variable => {
    if (!validVariableKeys.includes(variable)) {
      errors.push(`Variable desconocida: {${variable}}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Genera un preview del template con datos de ejemplo
 */
export function generatePreview(template: string): string {
  const exampleVariables: TemplateVariables = {
    nombre: 'Maria',
    gig_title: 'UGC Video para Instagram',
    company_name: 'Tu Empresa',
    budget: '$500',
    category: 'Video'
  }

  return processTemplate(template, exampleVariables)
}

/**
 * Templates predeterminados para nuevas empresas
 */
export const DEFAULT_TEMPLATES: Omit<MessageTemplate, 'id' | 'company_id' | 'created_at' | 'updated_at'>[] = [
  {
    title: 'Bienvenida Inicial',
    content: `Hola {nombre}!

Gracias por aplicar a nuestra campana "{gig_title}". Me encanto tu perfil y creo que serias perfecto/a para este proyecto.

Me gustaria discutir los detalles contigo. Estas disponible para conversar?

Saludos,
{company_name}`,
    category: 'bienvenida',
    use_count: 0
  },
  {
    title: 'Detalles del Proyecto',
    content: `Hola {nombre}!

Te cuento mas sobre el proyecto "{gig_title}":

- Presupuesto: {budget}
- Categoria: {category}

Por favor, confirma si te interesa y podemos coordinar los siguientes pasos.

Saludos!`,
    category: 'detalles',
    use_count: 0
  },
  {
    title: 'Confirmacion de Colaboracion',
    content: `Excelente {nombre}!

Estamos muy contentos de trabajar contigo en "{gig_title}".

Los proximos pasos serian:
1. Acordar fechas de entrega
2. Definir el brief creativo
3. Comenzar la produccion

Te parece bien?`,
    category: 'cierre',
    use_count: 0
  }
]
