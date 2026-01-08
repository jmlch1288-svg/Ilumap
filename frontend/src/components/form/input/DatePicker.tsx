import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import Label from "./Label";
import { Calendar } from "lucide-react";

// Tipos correctos de flatpickr (ruta actual en 2025)
import type { Instance } from "flatpickr/dist/types/instance";
import type { DateOption, Hook } from "flatpickr/dist/types/options";

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption | DateOption[];
  label?: string;
  placeholder?: string;
};

export default function DatePicker({
  id,
  mode = "single",
  onChange,
  defaultDate,
  label,
  placeholder = "Selecciona una fecha",
}: PropsType) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpInstance = useRef<Instance | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    fpInstance.current = flatpickr(inputRef.current, {
      mode,
      static: true,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      defaultDate: defaultDate as DateOption | DateOption[] | undefined,
      onChange: onChange as Hook | Hook[] | undefined,
    });

    return () => {
      if (fpInstance.current) {
        fpInstance.current.destroy();
        fpInstance.current = null;
      }
    };
  }, [mode, onChange, defaultDate]);

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          placeholder={placeholder}
          readOnly // Recomendado para evitar escritura manual
          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 pr-12 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-none focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800 cursor-pointer"
        />

        <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
          <Calendar className="size-5" />
        </span>
      </div>
    </div>
  );
}