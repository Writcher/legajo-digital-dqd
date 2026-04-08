export type Experiencia = {
  empresa: string;
  puesto: string;
  sector: string;
  desde: string;
  hasta: string;
  descripcion: string;
};

export type Educacion = {
  nivel: number | '';
  titulo: string;
  institucion: string;
  desde: string;
  hasta: string;
};

export type LegajoFormData = {
  //step1
  nombre: string;
  dni: string;
  telefono: string;
  email: string;
  pais: number | '';
  provincia: number | '';
  convenio: number | '';
  area: number | '';
  puesto: string;
  //step2
  habilidades: number[];
  habilidadesPersonalizadas: string[];
  //step3
  herramientas: number[];
  herramientasPersonalizadas: string[];
  //step4
  experiencias: Experiencia[];
  //step5
  educaciones: Educacion[];
  certificaciones: string[];
  licencias: number[];
  //step6
  disponibilidad: number | '';
  idiomas: number[];
  observaciones: string;
  archivos: File[];
};

export type FormPayload = {
  nombre: string;
  dni: string;
  telefono: string;
  email: string;
  pais: number;
  provincia: number;
  convenio: number;
  area: number | '';
  puesto: string;
  habilidades: number[];
  habilidadesPersonalizadas: string[];
  herramientas: number[];
  herramientasPersonalizadas: string[];
  experiencias: { empresa: string; puesto: string; sector: string; desde: string; hasta: string; descripcion: string }[];
  educaciones: { nivel: number; titulo: string; institucion: string; desde: string; hasta: string }[];
  certificaciones: string[];
  licencias: number[];
  disponibilidad: number;
  idiomas: number[];
};
