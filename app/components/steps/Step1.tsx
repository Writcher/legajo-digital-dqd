import { useFormContext } from "react-hook-form";
import { LegajoFormData } from "@/app/page";
import { useQuery } from "@tanstack/react-query";
import { getPaises } from "@/actions/pais/pais.actions";
import { useSnackbar } from "@/lib/context/snackbar";
import { useEffect } from "react";
import { getProvinciasByPais } from "@/actions/provincia/provincia.actions";
import { getTiposConvenio } from "@/actions/tipoconvenio/tipoconvenio.actions";
import { getAreas } from "@/actions/area/area.actions";
import StepWrapper from "../StepWrapper";
import FormField from "../FormField";
import FormSelect from "../FormSelect";

export default function Step1({
  onNext,
  isPostulante = false,
}: {
  onNext: () => void;
  isPostulante?: boolean;
}) {
  //hooks
  const { showWarning } = useSnackbar();
  const form = useFormContext<LegajoFormData>();
  //querys
  const paises = useQuery({
    queryKey: ['getPaises'],
    queryFn: () => getPaises(),
    refetchOnWindowFocus: false
  });
  const provincias = useQuery({
    queryKey: ['getProvincias', form.watch('pais')],
    queryFn: () => getProvinciasByPais({ id_pais: Number(form.watch('pais')) }),
    enabled: form.watch('pais') != '',
    refetchOnWindowFocus: false
  });
  const tiposConvenio = useQuery({
    queryKey: ['getTiposConvenio'],
    queryFn: () => getTiposConvenio(),
    refetchOnWindowFocus: false
  });
  const areas = useQuery({
    queryKey: ['getAreas'],
    queryFn: () => getAreas(),
    enabled: !tiposConvenio.isLoading && form.watch('convenio') === tiposConvenio.data?.fueraConvenio?.id,
    refetchOnWindowFocus: false
  });
  //feedback
  useEffect(() => {
    if (paises.isError) showWarning('Error cargando países');
    if (provincias.isError) showWarning('Error cargando provincias/estados/regiones');
    if (tiposConvenio.isError) showWarning('Error cargando tipos de convenio');
    if (areas.isError) showWarning('Error cargando áreas de trabajo');
  }, [showWarning, paises.isError, provincias.isError, tiposConvenio.isError, areas.isError]);
  const convenio = form.watch('convenio');
  useEffect(() => {
    if (!tiposConvenio.data) return;
    if (convenio !== tiposConvenio.data.fueraConvenio?.id) {
      form.setValue('area', '');
      form.setValue('puesto', '');
    }
  }, [convenio, tiposConvenio.data, form]);
  return (
    <StepWrapper onNext={onNext} isFirst title='Datos Personales' subtitle='Información Básica de Contacto' isValid={form.formState.isValid}>
      {/* datos personales */}
      <FormField name='nombre' control={form.control} label='Nombre Completo *' rules={{ required: 'Debe ingresar su nombre completo' }} />
      <FormField name='dni' control={form.control} label='Nº de Documento / ID *' rules={{ required: 'Debe ingresar su número de documento' }} />
      <FormField name='telefono' control={form.control} label='Teléfono (Con Código de País) *' rules={{ required: 'Debe ingresar su número de teléfono', pattern: { value: /^\+[1-9]\d{6,14}$/, message: 'Ingrese el teléfono con código de país (ej: +5491112345678)' } }} />
      <FormField name='email' control={form.control} label='Email *' type='email' rules={{ required: 'Debe ingresar su correo electrónico', pattern: { value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, message: 'Ingrese un correo electrónico válido' } }} />
      {/* ubicacion */}
      <FormSelect name='pais' control={form.control} label='País de Residencia *' rules={{ required: 'Debe seleccionar su país' }} options={paises.data ?? []} isLoading={paises.isLoading} />
      <FormSelect name='provincia' control={form.control} label='Provincia / Estado / Región *' rules={{ required: 'Debe seleccionar su provincia' }} options={provincias.data ?? []} disabled={form.watch('pais') === ''} isLoading={provincias.isLoading} />
      {/* convenio - solo empleados */}
      {!isPostulante && <>
        <FormSelect name='convenio' control={form.control} label='Tipo de Convenio *' rules={{ required: 'Debe seleccionar un convenio' }} options={tiposConvenio.data?.convenios ?? []} isLoading={tiposConvenio.isLoading} />
        {!tiposConvenio.isLoading && form.watch('convenio') === tiposConvenio.data?.fueraConvenio?.id && <>
          <FormSelect name='area' control={form.control} label='Área / Sector *' rules={{ required: 'Debe seleccionar su área de trabajo' }} options={areas.data ?? []} isLoading={areas.isLoading} />
          <FormField name='puesto' control={form.control} label='Puesto Actual *' rules={{ required: 'Debe ingresar su puesto actual' }} />
        </>}
      </>}
    </StepWrapper>
  );
};