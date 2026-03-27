import { useSnackbar } from "@/lib/context/snackbar";
import StepWrapper from "../StepWrapper";
import { submitLegajo } from "@/actions/legajo/legajo.actions";
import { useFormContext, useWatch } from "react-hook-form";
import { LegajoFormData } from "@/app/page";
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
import FormField from "../FormField";

const disponibilidadEmoji: Record<string, React.ReactNode> = {
  'Si, Sin Restricciones': <CheckRoundedIcon />, 'Si, Con Previo Aviso': <CalendarMonthRoundedIcon />, 'Solo Mi Provincia': <HomeRoundedIcon />, 'No Disponible Por Ahora': <CloseRoundedIcon />,
};

const MAX_CV_SIZE = 5 * 1024 * 1024;

export default function Step6({
  onBack,
  onSuccess,
  turnstileToken,
}: {
  onBack: () => void;
  onSuccess: (nombre: string) => void;
  turnstileToken: string;
}) {
  // hooks
  const { showWarning, showSuccess, showError } = useSnackbar();
  const form = useFormContext<LegajoFormData>();
  const idiomas = useWatch({ control: form.control, name: 'idiomas' });
  const disponibilidadSeleccionada = useWatch({ control: form.control, name: 'disponibilidad' });
  const cv = useWatch({ control: form.control, name: 'cv' });
  const [dragging, setDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  //helpers
  function handleCvFile(file: File | null | undefined) {
    if (!file) return;
    if (file.type !== 'application/pdf') { showWarning('Solo se aceptan archivos PDF'); return; }
    if (file.size > MAX_CV_SIZE) { showWarning('El archivo no puede superar los 5 MB'); return; }
    form.setValue('cv', file, { shouldValidate: true });
  }
  async function handleSubmit() {
    if (submittingRef.current) return;
    if (!cv) { showWarning('Por favor adjuntá tu CV'); return; }
    if (!disponibilidadSeleccionada) { showWarning('Por favor seleccioná tu disponibilidad para viajar'); return; }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const values = form.getValues();
      const fd = new FormData();
      fd.append('cv', values.cv!);
      fd.append('turnstileToken', turnstileToken);
      const { cv: _cv, ...rest } = values;
      fd.append('data', JSON.stringify(rest));
      const result = await submitLegajo(fd);
      if (result.error) throw new Error(result.error);
      showSuccess('¡Legajo enviado correctamente!');
      onSuccess(values.nombre);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al enviar el legajo');
    } finally {
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
        CV en PDF *
      </div>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleCvFile(e.dataTransfer.files[0]); }}
        className={`flex flex-col items-center justify-center gap-2 rounded border cursor-pointer py-8 transition-colors ${(dragging || cv) ? 'border-orange-400 bg-orange-50' : 'border-gray-300 border-dashed bg-gray-50 hover:bg-gray-100'}`}
      >
        <InsertDriveFileRoundedIcon className='!text-4xl !text-gray-400' />
        {cv
          ? <span className='text-sm text-gray-700 font-medium'>{cv.name}</span>
          : <span className='text-sm text-gray-500'>Tocá para adjuntar tu CV</span>
        }
        <span className='text-xs text-orange-500'>Solo archivos PDF · Máx. 5 MB</span>
        <input
          ref={fileInputRef}
          type='file'
          accept='application/pdf'
          className='hidden'
          onChange={e => handleCvFile(e.target.files?.[0])}
        />
      </div>
    </StepWrapper>
  );
};
