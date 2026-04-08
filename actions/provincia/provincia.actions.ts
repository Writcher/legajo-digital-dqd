'use server'

import { prisma } from '@/lib/prisma';

export async function getProvinciasByPais({ id_pais }: { id_pais: number }) {
  return await prisma.provincia.findMany({
    where: { idPais: id_pais },
    orderBy: { nombre: 'asc' },
  });
};

export async function getProvinciaNombre(id: number) {
  return await prisma.provincia.findFirst({ where: { id: id }, select: { nombre: true } });
};