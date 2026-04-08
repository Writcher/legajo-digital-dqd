'use server'

import { prisma } from '@/lib/prisma';

export async function getPaises() {
  return await prisma.pais.findMany({ orderBy: { nombre: 'asc' } });
};

export async function getPaisNombre(id: number) {
  return await prisma.pais.findFirst({ select: { nombre: true }, where: { id: id } });
}