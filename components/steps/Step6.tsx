import { useSnackbar } from "@/lib/context/snackbar";
import StepWrapper from "@/components/common/StepWrapper";
import { submitLegajo } from "@/actions/legajo/legajo.actions";
import { useFormContext, useWatch } from "react-hook-form";
import { LegajoFormData } from "@/lib/types/legajo";
import { MAX_CV_SIZE } from "@/lib/constants";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDisponibilidades } from "@/actions/disponibilidad/disponibilidad.actions";
import { getIdiomas } from "@/actions/idioma/idioma.actions";
import { Checkbox, Chip, Skeleton } from "@mui/material";
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import FormField from "@/components/common/FormField";

const disponibilidadEmoji: Record<string, React.ReactNode> = {
  'Si, Sin Restricciones': <CheckRoundedIcon />, 'Si, Con Previo Aviso': <CalendarMonthRoundedIcon />, 'Solo Mi Provincia': <HomeRoundedIcon />, 'No Disponible Por Ahora': <CloseRoundedIcon />,
};

export default function Step6({
  onBack,
  onSuccess,
  refreshTurnstileToken,
  isPostulante
}: {
  onBack: () => void;
  onSuccess: (nombre: string) => void;
  refreshTurnstileToken: () => Promise<string>;
  isPostulante: boolean;
}) {
  // hooks
  const { showWarning, showSuccess, showError } = useSnackbar();
  const form = useFormContext<LegajoFormData>();
  const idiomas = useWatch({ control: form.control, name: 'idiomas' });
  const disponibilidadSeleccionada = useWatch({ control: form.control, name: 'disponibilidad' });
  const archivos = useWatch({ control: form.control, name: 'archivos' });
  const [dragging, setDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  //helpers
  function handleArchivos(newFiles: FileList | null | undefined) {
    if (!newFiles) return;
    const current = form.getValues('archivos');
    const toAdd: File[] = [];
    for (const file of Array.from(newFiles)) {
      if (file.type !== 'application/pdf') { showWarning(`"${file.name}" no es un PDF`); continue; }
      if (file.size > MAX_CV_SIZE) { showWarning(`"${file.name}" supera los 5 MB`); continue; }
      if (current.some(f => f.name === file.name && f.size === file.size)) { showWarning(`"${file.name}" ya fue adjuntado`); continue; }
      toAdd.push(file);
    }
    if (toAdd.length) form.setValue('archivos', [...current, ...toAdd], { shouldValidate: true });
    // Reset input para permitir seleccionar el mismo archivo de nuevo
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
  function removeArchivo(index: number) {
    const current = form.getValues('archivos');
    form.setValue('archivos', current.filter((_, i) => i !== index), { shouldValidate: true });
  }
  async function handleSubmit() {
    // Evita envíos duplicados si el usuario hace doble click
    if (submittingRef.current) return;
    // Validaciones manuales antes de enviar
    if (!archivos.length) { showWarning('Por favor adjuntá al menos el CV'); return; }
    if (!disponibilidadSeleccionada) { showWarning('Por favor seleccioná tu disponibilidad para viajar'); return; }
    // Marca el envío como en curso (ref + state para UI)
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      // Refresca el token de Turnstile para que no esté vencido
      const freshToken = await refreshTurnstileToken();
      // Obtiene todos los valores del formulario (todos los steps)
      const values = form.getValues();
      // Arma el FormData para enviar al server action
      const fd = new FormData();
      // Adjunta cada archivo PDF
      for (const archivo of values.archivos) fd.append('archivos', archivo);
      // Adjunta el token fresco de Turnstile para verificación server-side
      fd.append('turnstileToken', freshToken);
      // Separa los archivos del resto de los datos
      const { archivos: _archivos, ...rest } = values;
      // Adjunta el resto de los datos como JSON
      fd.append('data', JSON.stringify(rest));
      // Llama al server action que guarda el legajo en la base de datos
      const result = await submitLegajo(fd, isPostulante);
      // Si el server devuelve un error, lo lanza para que lo atrape el catch
      if (result.error) throw new Error(result.error);
      // Muestra feedback de éxito y navega a la pantalla de confirmación
      showSuccess('¡Legajo enviado correctamente!');
      onSuccess(values.nombre);
    } catch (err) {
      // Muestra el error al usuario (el del server o uno genérico)
      showError(err instanceof Error ? err.message : 'Error al enviar el legajo');
    } finally {
      // Libera el lock de envío pase lo que pase
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }
  //query
  const disponibilidades = useQuery({
    queryKey: ['getDisponibilidades'],
    queryFn: () => getDisponibilidades(),
    refetchOnWindowFocus: false
  });
  const idiomasQuery = useQuery({
    queryKey: ['getIdiomas'],
    queryFn: () => getIdiomas(),
    refetchOnWindowFocus: false
  });
  //helpers
  function toggleLicencia(id: number) {
    if (disponibilidadSeleccionada === id) {
      form.setValue('disponibilidad', '');
    } else {
      form.setValue('disponibilidad', id);
    };
  };
  function toggleIdioma(id: number) {
    if (idiomas.includes(id)) {
      form.setValue('idiomas', idiomas.filter(i => i !== id));
    } else {
      form.setValue('idiomas', [...idiomas, id]);
    };
  };
  //feedback
  useEffect(() => {
    if (idiomasQuery.isError) showWarning('Error cargando idiomas');
    if (disponibilidades.isError) showWarning('Error cargando disponibilidades de viaje');
  }, [showWarning, idiomasQuery.isError, disponibilidades.isError])
  const seleccionadas = idiomasQuery.data?.filter(i => idiomas.includes(i.id)) ?? [];
  return (
    <StepWrapper onBack={onBack} isLast onSubmit={handleSubmit} isSubmitting={isSubmitting} title='Disponibilidad' subtitle='Para asignacion a proyectos en otras provincias' isValid={form.formState.isValid}>
      <div className='text-sm text-gray-700 leading-tight'>
        Disponibilidad Para Viajar
      </div>
      <div className='flex flex-col gap-2'>
        {disponibilidades.isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant='rectangular' width='100%' height={48} sx={{ borderRadius: 2 }} />
          ))
          : disponibilidades.data?.map(disponibilidad => {
            const checked = disponibilidadSeleccionada === disponibilidad.id;
            return (
              <div
                key={disponibilidad.id}
                onClick={() => toggleLicencia(disponibilidad.id)}
                className={`flex items-center gap-2 px-3 rounded border border-gray-300 cursor-pointer transition-colors ${checked ? 'border-orange-500 bg-orange-100' : 'border-gray-300 bg-white hover:bg-gray-100'}`}
              >
                <Checkbox checked={checked} color='warning' size='small' disableRipple tabIndex={-1} />
                <span className='text-lg text-gray-700'>{disponibilidadEmoji[disponibilidad.nombre]}</span>
                <span className='text-sm text-gray-700'>
                  {' - '}{disponibilidad.nombre}
                </span>
              </div>
            );
          })
        }
      </div>
      <div className='text-sm text-gray-700 leading-tight'>
        {'Idiomas (Ademas de Español)'}
      </div>
      {(seleccionadas.length > 0) && (
        <div className='flex flex-wrap gap-2'>
          {(seleccionadas).map(i => (
            <Chip key={i.id} label={i.nombre} color='warning' size='small' onDelete={() => toggleIdioma(i.id)} />
          ))}
        </div>
      )}
      <div className='flex flex-wrap gap-2'>
        {idiomasQuery.isLoading
          ? Array.from({ length: 50 }).map((_, i) => <Skeleton key={i} variant='rectangular' className='!rounded-2xl' width={Math.max(80, Math.random() * 150)} height={24} />)
          : idiomasQuery.data?.map(i => (
            !idiomas.includes(i.id) &&
            <Chip
              key={i.id}
              label={i.nombre}
              size='small'
              variant={idiomas.includes(i.id) ? 'filled' : 'outlined'}
              color={idiomas.includes(i.id) ? 'warning' : 'default'}
              onClick={() => toggleIdioma(i.id)}
              className={`${idiomas.includes(i.id) ? '' : '!text-gray-600'}`}
            />
          ))
        }
      </div>
      <div className='text-sm text-gray-700 leading-tight'>
        Observaciones Adicionales
      </div>
      <FormField name='observaciones' control={form.control}  multiline rows={5}/>
      <div className='text-sm text-gray-700 leading-tight'>
        CV y Certificaciones en PDF *
      </div>
      {archivos.length > 0 && (
        <div className='flex flex-col gap-1'>
          {archivos.map((file, index) => (
            <div key={`${file.name}-${file.size}`} className='flex items-center gap-2 px-3 py-2 rounded border border-gray-200 bg-white'>
              <InsertDriveFileRoundedIcon className='!text-base !text-orange-400' />
              <span className='text-sm text-gray-700 flex-1 truncate'>{file.name}</span>
              <span className='text-xs text-gray-400'>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              <CloseRoundedIcon
                className='!text-base !text-gray-400 cursor-pointer hover:!text-red-500'
                onClick={() => removeArchivo(index)}
              />
            </div>
          ))}
        </div>
      )}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleArchivos(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center gap-2 rounded border cursor-pointer py-8 transition-colors ${dragging ? 'border-orange-400 bg-orange-50' : 'border-gray-300 border-dashed bg-gray-50 hover:bg-gray-100'}`}
      >
        <InsertDriveFileRoundedIcon className='!text-4xl !text-gray-400' />
        <span className='text-sm text-gray-500'>
          {archivos.length ? 'Agregar otro archivo' : 'Tocá para adjuntar'}
        </span>
        <span className='text-xs text-orange-500'>Solo archivos PDF · Máx. 5 MB por archivo</span>
        <input
          ref={fileInputRef}
          type='file'
          accept='application/pdf'
          multiple
          className='hidden'
          onChange={e => handleArchivos(e.target.files)}
        />
      </div>
    </StepWrapper>
  );
}
