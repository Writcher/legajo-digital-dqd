import { Button } from "@mui/material";
import EastRoundedIcon from '@mui/icons-material/EastRounded';
import WestRoundedIcon from '@mui/icons-material/WestRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { useEffect, useState } from "react";

export default function StepWrapper({
    onNext,
    onBack,
    onSubmit,
    isFirst,
    isLast,
    isSubmitting,
    title,
    subtitle,
    isValid = true,
    children
}: {
    onNext?: () => void,
    onBack?: () => void,
    onSubmit?: () => void,
    isFirst?: boolean,
    isLast?: boolean,
    isSubmitting?: boolean,
    title: string,
    subtitle: string,
    isValid?: boolean,
    children?: React.ReactNode
}) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return (
        <div className='flex flex-col w-full max-w-[400px] gap-3 sm:gap-4'>
            <div className='flex flex-col w-full gap-3 sm:gap-4'>
                <div className='flex flex-col items-center gap-2'>
                    <p className='text-base font-bold text-[#E87722] leading-tight'>
                        {title}
                    </p>
                    <p className='text-xs text-gray-700 leading-tight'>
                        {subtitle}
                    </p>
                </div>
                <div className='flex flex-col gap-4'>
                    {children}
                </div>
            </div>
            <div className='flex w-full gap-3'>
                {!isFirst &&
                    <Button
                        variant='outlined'
                        color='warning'
                        className='!w-[40%]'
                        disableElevation
                        startIcon={<WestRoundedIcon />}
                        onClick={onBack}
                    >
                        Atras
                    </Button>
                }
                {!isLast &&
                    <Button
                        variant='contained'
                        color='warning'
                        fullWidth
                        disableElevation
                        disabled={mounted ? !isValid : false}
                        endIcon={<EastRoundedIcon />}
                        onClick={onNext}
                    >
                        Siguiente
                    </Button>
                }
                {isLast &&
                    <Button
                        variant='contained'
                        color='success'
                        fullWidth
                        disableElevation
                        disabled={isSubmitting || mounted ? !isValid : false}
                        startIcon={<CheckRoundedIcon />}
                        onClick={onSubmit}
                    >
                        {isSubmitting ? 'Enviando...' : 'Enviar legajo'}
                    </Button>
                }
            </div>
        </div>
    );
};