import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import StepWrapper from "../StepWrapper";
import { LegajoFormData } from "@/app/page";
import FormField from "../FormField";
import FormDatePicker from "../FormDatePicker";
import { Button, Checkbox, Chip, InputAdornment, Skeleton, TextField } from "@mui/material";
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useQuery } from "@tanstack/react-query";
import { getNiveles } from "@/actions/nivelEducativo/nivelEducativo.actions";
import { useSnackbar } from "@/lib/context/snackbar";
import { useEffect, useState } from "react";
import FormSelect from "../FormSelect";
import { getLicencias } from "@/actions/licencia/licencia.actions";
import MopedRoundedIcon from '@mui/icons-material/MopedRounded';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import AirportShuttleRoundedIcon from '@mui/icons-material/AirportShuttleRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import AgricultureRoundedIcon from '@mui/icons-material/AgricultureRounded';

const licenciaEmoji: Record<string, React.ReactNode> = {
  A: <MopedRoundedIcon/>, B: <DirectionsCarFilledRoundedIcon/>, C: <LocalShippingRoundedIcon/>, D: <AirportShuttleRoundedIcon/>, E: <AgricultureRoundedIcon/>,
};

export default function Step5({
  onNext,
  onBack
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  //hooks
  const { showWarning } = useSnackbar();
  const form = useFormContext<LegajoFormData>();
  const array = useFieldArray({
    control: form.control,
    name: 'educaciones'
  });
  const certificaciones = useWatch({ control: form.control, name: 'certificaciones' });
  const [inputCertificaciones, setInputCertificaciones] = useState('');
  const licenciasSeleccionadas = useWatch({ control: form.control, name: 'licencias' });
  //query
  const niveles = useQuery({
    queryKey: ['getNiveles'],
    queryFn: () => getNiveles(),
    refetchOnWindowFocus: false
  });
  const licencias = useQuery({
    queryKey: ['getLicencias'],
    queryFn: () => getLicencias(),
    refetchOnWindowFocus: false
  });
  //helpers
  function addPersonalizada() {
    const nombre = inputCertificaciones.trim();
    if (!nombre || certificaciones.some(c => c.toLowerCase() === nombre.toLowerCase())) return;
    form.setValue('certificaciones', [...certificaciones, nombre]);
    setInputCertificaciones('');
  };
  function removePersonalizada(nombre: string) {
    form.setValue('certificaciones', certificaciones.filter(c => c !== nombre));
  };
  function toggleLicencia(id: number) {
    if (licenciasSeleccionadas.includes(id)) {
      form.setValue('licencias', licenciasSeleccionadas.filter(l => l !== id));
    } else {
      form.setValue('licencias', [...licenciasSeleccionadas, id]);
    }
  };
  //feedback
  useEffect(() => {
    if (niveles.isError) showWarning('Error cargando niveles educativos');
  }, [showWarning, niveles.isError]);
  return (
    <StepWrapper onNext={onNext} onBack={onBack} title='Formación y Certificaciones' subtitle='Títulos, cursos y habilitaciones' isValid={form.formState.isValid}>
      <div className='flex flex-col w-full gap-2 overflow-auto'>
        {array.fields.map((field, index) => (
          <div key={field.id} className='flex flex-col gap-4 border border-orange-500 p-4 rounded'>
            <FormSelect name={`educaciones.${index}.nivel` as const} control={form.control} label='Nivel Educativo' options={niveles.data ?? []} isLoading={niveles.isLoading} rules={{ required: 'Campo obligatorio' }} />
            <FormField name={`educaciones.${index}.titulo` as const} control={form.control} label='Título o Carrera' rules={{ required: 'Campo obligatorio' }} />
            <FormField name={`educaciones.${index}.institucion` as const} control={form.control} label='Institución' rules={{ required: 'Campo obligatorio' }} />
            <div className='flex w-full gap-2'>
              <FormDatePicker name={`educaciones.${index}.desde` as const} control={form.control} label='Inicio' monthYear onChangeExtra={() => form.trigger(`educaciones.${index}.hasta`)} rules={{ required: 'Campo obligatorio', validate: (v) => {
                if (!v || typeof v !== 'string') return true;
                const [dM, dY] = v.split('-').map(Number);
                const now = new Date();
                const nowY = now.getFullYear();
                const nowM = now.getMonth() + 1;
                return dY < nowY || (dY === nowY && dM <= nowM) || '"Inicio" no puede ser en el futuro';
              }}} />
              <FormDatePicker name={`educaciones.${index}.hasta` as const} control={form.control} label='Final' monthYear rules={{ validate: (v) => {
                if (!v || typeof v !== 'string') return true;
                const desde = form.getValues(`educaciones.${index}.desde`);
                if (!desde) return true;
                const [dM, dY] = desde.split('-').map(Number);
                const [hM, hY] = v.split('-').map(Number);
                return hY > dY || (hY === dY && hM >= dM) || '"Final" debe ser posterior a "Inicio"';
              }}} />
            </div>
            <Button
              variant='outlined'
              color='error'
              className='!bg-red-100 hover:!bg-white'
              fullWidth
              size='small'
              disableElevation
              onClick={() => array.remove(index)}
            >
              Eliminar
            </Button>
          </div>
        ))}
      </div>
      <Button
        variant='outlined'
        color='warning'
        className='!border !border-dashed !border-orange-600'
        fullWidth
        disableElevation
        endIcon={<AddRoundedIcon />}
        onClick={() => array.append({ nivel: '', titulo: '', institucion: '', desde: '', hasta: '' })}
      >
        Agregar Estudio
      </Button>
      <div className='text-sm text-gray-700 leading-tight'>
        Certificaciones / Cursos
      </div>
      {(certificaciones.length > 0) && (
        <div className='flex flex-wrap gap-2'>
          {certificaciones.map(nombre => (
            <Chip key={nombre} label={nombre} color='warning' size='small' onDelete={() => removePersonalizada(nombre)} />
          ))}
        </div>
      )}
      <TextField
        value={inputCertificaciones}
        onChange={e => setInputCertificaciones(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPersonalizada(); } }}
        label='Escribí una certificación...'
        variant='outlined'
        color='warning'
        size='small'
        fullWidth
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position='end'>
                <Chip label='+ Agregar' color='warning' size='small' onClick={addPersonalizada} disabled={!inputCertificaciones.trim()} />
              </InputAdornment>
            )
          }
        }}
      />
      <div className='text-sm text-gray-700 leading-tight'>
        Licencias de Conducir
      </div>
      <div className='flex flex-col gap-2'>
        {licencias.isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant='rectangular' width='100%' height={48} sx={{ borderRadius: 2 }} />
          ))
          : licencias.data?.map(licencia => {
            const checked = licenciasSeleccionadas.includes(licencia.id);
            return (
              <div
                key={licencia.id}
                onClick={() => toggleLicencia(licencia.id)}
                className={`flex items-center gap-2 px-3 rounded border border-gray-300 cursor-pointer transition-colors ${checked ? 'border-orange-500 bg-orange-100' : 'border-gray-300 bg-white hover:bg-gray-100'}`}
              >
                <Checkbox checked={checked} color='warning' size='small' disableRipple tabIndex={-1} />
                <span className='text-lg text-gray-700'>{licenciaEmoji[licencia.codigo]}</span>
                <span className='text-sm text-gray-700'>
                  <span className='font-semibold'>{licencia.codigo}</span>{' - '}{licencia.nombre.slice(4)}
                </span>
              </div>
            );
          })
        }
      </div>
    </StepWrapper>
  );
};
