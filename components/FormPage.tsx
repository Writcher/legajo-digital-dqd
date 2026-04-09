'use client';

import { useCallback, useRef, useState } from 'react';
import FormStepper from '@/components/common/FormStepper';
import Step1 from '@/components/steps/Step1';
import Step2 from '@/components/steps/Step2';
import Step3 from '@/components/steps/Step3';
import Step4 from '@/components/steps/Step4';
import Step5 from '@/components/steps/Step5';
import Step6 from '@/components/steps/Step6';
import { FormProvider, useForm } from 'react-hook-form';
import { LegajoFormData } from '@/lib/types/legajo';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

export default function FormPage({ formType }: { formType: 'empleado' | 'postulante' }) {
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [activeStep, setActiveStep] = useState(0);
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const tokenResolverRef = useRef<((token: string) => void) | null>(null);

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
    if (tokenResolverRef.current) {
      tokenResolverRef.current(token);
      tokenResolverRef.current = null;
    }
  }, []);

  const refreshTurnstileToken = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      tokenResolverRef.current = resolve;
      turnstileRef.current?.reset();
    });
  }, []);

  const next = () => setActiveStep((s) => s + 1);
  const back = () => setActiveStep((s) => s - 1);

  const form = useForm<LegajoFormData>({
    mode: 'onTouched',
    defaultValues: {
      nombre: '',
      dni: '',
      telefono: '',
      email: '',
      pais: '',
      provincia: '',
      convenio: '',
      area: '',
      puesto: '',
      habilidades: [],
      habilidadesPersonalizadas: [],
      herramientas: [],
      herramientasPersonalizadas: [],
      experiencias: [],
      educaciones: [],
      certificaciones: [],
      licencias: [],
      disponibilidad: '',
      idiomas: [],
      observaciones: '',
      archivos: []
    }
  });

  if (submittedName !== null) {
    return (
      <div className='flex flex-col flex-1 items-center justify-center gap-6 px-4 text-center'>
        <div className='flex items-center justify-center w-20 h-20 rounded-full bg-green-100'>
          <svg className='w-10 h-10 text-green-600' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2.5}>
            <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
          </svg>
        </div>
        <div className='flex flex-col gap-2'>
          <p className='text-xl font-bold text-gray-800'>¡Legajo enviado!</p>
          <p className='text-sm text-gray-500'>
            Gracias <span className='font-medium text-gray-700'>{submittedName}</span>, tu legajo fue recibido correctamente.
          </p>
        </div>
      </div>
    );
  }

  if (!turnstileToken) {
    return (
      <div className='flex flex-col flex-1 items-center justify-center gap-4 px-4'>
        <p className='text-sm text-gray-500'>Verificando que sos humano...</p>
        <Turnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          onSuccess={handleTurnstileSuccess}
          onExpire={() => setTurnstileToken('')}
          onError={() => setTurnstileToken('')}
        />
      </div>
    );
  }

  return (
    <>
      <div className='flex w-full h-1'>
        <div
          className='bg-orange-300'
          style={{ width: `${Math.round((100 / 6) * (activeStep + 1))}%` }}
        />
        <div
          className='bg-gray-300'
          style={{ width: `${100 - Math.round((100 / 6) * (activeStep + 1))}%` }}
        />
      </div>
      <div className='flex flex-col flex-1 items-center overflow-auto'>
        <div className='py-4 px-4 max-w-[600px]'>
          <FormStepper activeStep={activeStep} />
        </div>
        <div className='flex flex-col flex-1 w-full max-w-[600px] items-center px-4 pb-10'>
          <FormProvider {...form}>
            {activeStep === 0 && <Step1 onNext={next} isPostulante={formType === 'postulante'} />}
            {activeStep === 1 && <Step2 onNext={next} onBack={back} />}
            {activeStep === 2 && <Step3 onNext={next} onBack={back} />}
            {activeStep === 3 && <Step4 onNext={next} onBack={back} />}
            {activeStep === 4 && <Step5 onNext={next} onBack={back} />}
            {activeStep === 5 && (
              <Step6
                onBack={back}
                onSuccess={(nombre) => setSubmittedName(nombre)}
                refreshTurnstileToken={refreshTurnstileToken}
                isPostulante={formType === 'postulante'}
              />
            )}
          </FormProvider>
        </div>
      </div>
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <Turnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          onSuccess={handleTurnstileSuccess}
          onExpire={() => setTurnstileToken('')}
          onError={() => setTurnstileToken('')}
        />
      </div>
    </>
  );
}
