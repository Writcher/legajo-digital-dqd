import { Controller, Control, Path, RegisterOptions, FieldValues, useFormContext } from "react-hook-form";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import "dayjs/locale/es";

export default function FormDatePicker<T extends FieldValues>({ name, control, label, rules, className, monthYear, onChangeExtra }: {
  name: Path<T>;
  control: Control<T>;
  label: string;
  rules?: RegisterOptions<T>;
  className?: string;
  monthYear?: boolean;
  onChangeExtra?: () => void;
}) {
  const { trigger } = useFormContext();
  const format = monthYear ? "MM-YYYY" : "DD-MM-YYYY";

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field: { onChange, value, ...restField }, fieldState: { error } }) => (
          <DatePicker
            {...restField}
            label={label}
            className={className}
            views={monthYear ? ["month", "year"] : ["day", "month", "year"]}
            value={value ? dayjs(value, format) : null}
            onChange={(newValue) => {
              onChange(newValue ? newValue.format(format) : "");
              trigger(name);
              onChangeExtra?.();
            }}
            format={format}
            slotProps={{
              textField: {
                variant: "outlined",
                color: "warning",
                size: "small",
                fullWidth: !className,
                error: !!error,
                helperText: error?.message,
              },
            }}
          />
        )}
      />
    </LocalizationProvider>
  );
}
