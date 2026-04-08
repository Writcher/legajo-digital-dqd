'use server'

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { FormPayload } from '@/lib/types/legajo'
import { MAX_CV_SIZE } from '@/lib/constants'
import { parseMonthYear } from '@/lib/utils/parseMonthYear'
import { verifyTurnstile } from '@/actions/turnstile/turnstile.actions'
import { getGraphToken, uploadFilesToSharePoint } from '@/actions/graphApi/graphApi.actions'

export async function submitLegajo(formData: FormData, isPostulante: boolean): Promise<{ error?: string }> {
  try {
    const archivos = formData.getAll('archivos') as File[]
    const turnstileToken = formData.get('turnstileToken') as string
    const data = JSON.parse(formData.get('data') as string) as FormPayload

    // Verificar Turnstile
    if (!turnstileToken || !(await verifyTurnstile(turnstileToken))) {
      return { error: 'Verificación de seguridad fallida. Por favor recargá la página e intentá de nuevo.' }
    }

    // Validación server-side de archivos
    if (!archivos.length || archivos[0].size === 0) return { error: 'CV requerido' }
    for (const archivo of archivos) {
      if (archivo.type !== 'application/pdf') return { error: `"${archivo.name}" debe ser un archivo PDF` }
      if (archivo.size > MAX_CV_SIZE) return { error: `"${archivo.name}" no puede superar los 5 MB` }
    }

    // Subir archivos a SharePoint (fuera de la transacción de DB)
    const token = await getGraphToken()
    const urlCv = await uploadFilesToSharePoint(archivos, token, isPostulante, data.pais, data.provincia, data.dni)

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
