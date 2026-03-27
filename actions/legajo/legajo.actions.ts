'use server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

const MAX_CV_SIZE = 5 * 1024 * 1024

async function getGraphToken(): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.CLIENT_ID!,
        client_secret: process.env.CLIENT_SECRET!,
        scope: 'https://graph.microsoft.com/.default',
      }),
    }
  )
  const json = await res.json()
  if (!json.access_token) throw new Error('No se pudo obtener el token de SharePoint')
  return json.access_token
}

async function uploadCvToSharePoint(file: File, token: string): Promise<string> {
  const siteName = process.env.SP_SITE_NAME!
  const libraryName = process.env.SP_LIBRARY_NAME!
  const uploadPath = process.env.SP_UPLOAD_PATH!

  const sitesRes = await fetch(`https://graph.microsoft.com/v1.0/sites?search=${siteName}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const sitesJson = await sitesRes.json()
  if (!sitesJson.value?.length) throw new Error(`Sitio "${siteName}" no encontrado en SharePoint`)
  const siteId: string = sitesJson.value[0].id

  const drivesRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drives`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const drivesJson = await drivesRes.json()
  const drive = drivesJson.value?.find((d: { name: string }) => d.name === libraryName)
  if (!drive) throw new Error(`Biblioteca "${libraryName}" no encontrada en "${siteName}"`)

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filename = `${Date.now()}_${safeName}`
  const buffer = await file.arrayBuffer()

  const uploadRes = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${drive.id}/root:/${uploadPath}/${filename}:/content`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/pdf' },
      body: buffer,
    }
  )
  if (!uploadRes.ok) throw new Error('Error al subir el CV a SharePoint')
  const uploadJson = await uploadRes.json()
  return uploadJson.webUrl as string
}

function parseMonthYear(value: string): { month: number; year: number } | null {
  if (!value) return null
  const parts = value.split('-')
  if (parts.length !== 2) return null
  const month = parseInt(parts[0])
  const year = parseInt(parts[1])
  if (isNaN(month) || isNaN(year)) return null
  return { month, year }
}

type FormPayload = {
  nombre: string
  dni: string
  telefono: string
  email: string
  pais: number
  provincia: number
  convenio: number
  area: number | ''
  puesto: string
  habilidades: number[]
  habilidadesPersonalizadas: string[]
  herramientas: number[]
  herramientasPersonalizadas: string[]
  experiencias: { empresa: string; puesto: string; sector: string; desde: string; hasta: string; descripcion: string }[]
  educaciones: { nivel: number; titulo: string; institucion: string; desde: string; hasta: string }[]
  certificaciones: string[]
  licencias: number[]
  disponibilidad: number
  idiomas: number[]
}

async function verifyTurnstile(token: string): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY!,
      response: token,
    }),
  })
  const json = await res.json()
  return json.success === true
}

export async function submitLegajo(formData: FormData): Promise<{ error?: string }> {
  try {
    const cv = formData.get('cv') as File
    const turnstileToken = formData.get('turnstileToken') as string
    const data = JSON.parse(formData.get('data') as string) as FormPayload

    // Verificar Turnstile
    if (!turnstileToken || !(await verifyTurnstile(turnstileToken))) {
      return { error: 'Verificación de seguridad fallida. Por favor recargá la página e intentá de nuevo.' }
    }

    // Validación server-side del CV
    if (!cv || cv.size === 0) return { error: 'CV requerido' }
    if (cv.type !== 'application/pdf') return { error: 'El CV debe ser un archivo PDF' }
    if (cv.size > MAX_CV_SIZE) return { error: 'El CV no puede superar los 5 MB' }

    // Subir CV a SharePoint (fuera de la transacción de DB)
    const token = await getGraphToken()
    const urlCv = await uploadCvToSharePoint(cv, token)

    // Todo lo de DB dentro de una transacción
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Crear habilidades y herramientas personalizadas
      const customHabilidades = await Promise.all(
        data.habilidadesPersonalizadas.map(nombre =>
          tx.habilidad.create({ data: { nombre, idTipoConvenio: data.convenio } })
        )
      )
      const customHerramientas = await Promise.all(
        data.herramientasPersonalizadas.map(nombre =>
          tx.herramienta.create({ data: { nombre } })
        )
      )

      // Crear empleado
      const empleado = await tx.empleado.create({
        data: {
          nombre: data.nombre,
          dni: data.dni,
          telefono: data.telefono,
          email: data.email,
          urlCv,
          idProvincia: data.provincia,
          idPais: data.pais,
          idTipoConvenio: data.convenio,
          idDisponibilidadViaje: data.disponibilidad,
          idArea: data.area === '' ? null : data.area,
          puesto: data.puesto || null,
        },
      })

      const allHabilidadIds = [...data.habilidades, ...customHabilidades.map(h => h.id)]
      const allHerramientaIds = [...data.herramientas, ...customHerramientas.map(h => h.id)]

      // Crear todas las relaciones
      await Promise.all([
        ...data.experiencias.map(e => {
          const desde = parseMonthYear(e.desde)
          const hasta = parseMonthYear(e.hasta)
          if (!desde) throw new Error(`Fecha "desde" inválida en experiencia: ${e.empresa}`)
          return tx.empleadoExperiencia.create({
            data: {
              empresa: e.empresa,
              puesto: e.puesto,
              rubro: e.sector,
              desde: new Date(desde.year, desde.month - 1, 1),
              hasta: hasta ? new Date(hasta.year, hasta.month - 1, 1) : null,
              descripcion: e.descripcion,
              idEmpleado: empleado.id,
            },
          })
        }),
        ...data.educaciones.map(e => {
          const desde = parseMonthYear(e.desde)
          const hasta = parseMonthYear(e.hasta)
          if (!desde) throw new Error(`Fecha "inicio" inválida en educación: ${e.titulo}`)
          return tx.empleadoEducacion.create({
            data: {
              titulo: e.titulo,
              institucion: e.institucion,
              inicio: desde.year,
              final: hasta?.year ?? null,
              idNivelEducativo: e.nivel,
              idEmpleado: empleado.id,
            },
          })
        }),
        ...data.certificaciones.map(nombre =>
          tx.empleadoCertificacion.create({ data: { nombre, idEmpleado: empleado.id } })
        ),
        ...data.idiomas.map(idIdioma =>
          tx.empleadoIdioma.create({ data: { idEmpleado: empleado.id, idIdioma } })
        ),
        ...allHabilidadIds.map(idHabilidad =>
          tx.empleadoHabilidad.create({ data: { idEmpleado: empleado.id, idHabilidad } })
        ),
        ...allHerramientaIds.map(idHerramienta =>
          tx.empleadoHerramienta.create({ data: { idEmpleado: empleado.id, idHerramienta } })
        ),
        ...data.licencias.map(idLicencia =>
          tx.empleadoLicencia.create({ data: { idEmpleado: empleado.id, idLicencia } })
        ),
      ])
    })

    return {}
  } catch (error) {
    console.error('[submitLegajo]', error)
    return { error: error instanceof Error ? error.message : 'Error al guardar el legajo' }
  }
}
