'use client';

import { useState } from 'react';
import { Button } from '@mui/material';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import PersonSearchRoundedIcon from '@mui/icons-material/PersonSearchRounded';
import { Turnstile } from '@marsidev/react-turnstile';

export default function LandingPage({
  onSelect,
}: {
  onSelect: (type: 'empleado' | 'postulante', token: string) => void;
}) {
  const [token, setToken] = useState<string | null>(null);

  return (
    <>
      <div className='flex w-full h-1'>
        <div className='bg-gray-300' style={{ width: '100%' }} />
      </div>
      <div className='flex flex-col flex-1 items-center justify-center gap-8 px-4'>
        <div className='flex flex-col items-center gap-2 text-center'>
          <p className='text-2xl font-bold text-[#E87722]'>Legajo Digital</p>
          <p className='text-sm text-gray-500 max-w-[340px]'>
            Por favor verificá que sos humano y luego seleccioná cómo querés continuar.
          </p>
        </div>

        <Turnstile
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          onSuccess={(t) => setToken(t)}
          onExpire={() => setToken(null)}
          onError={() => setToken(null)}
        />

        <div className='flex flex-col sm:flex-row gap-4 w-full max-w-[420px]'>
          <Button
            variant='contained'
            color='warning'
            fullWidth
            disableElevation
            disabled={!token}
            startIcon={<BadgeRoundedIcon />}
            onClick={() => onSelect('empleado', token!)}
          >
            Soy empleado/a
          </Button>
          <Button
            variant='outlined'
            color='warning'
            fullWidth
            disableElevation
            disabled={!token}
            startIcon={<PersonSearchRoundedIcon />}
            onClick={() => onSelect('postulante', token!)}
          >
            Soy postulante
          </Button>
        </div>
      </div>
    </>
  );
}
