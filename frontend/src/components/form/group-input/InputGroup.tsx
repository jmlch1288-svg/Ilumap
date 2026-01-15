import { ReactNode } from "react";

interface InputGroupProps {
  label?: string;
  icon?: ReactNode;
  children: ReactNode;   // 👈 AÑADIDO
}

export default function InputGroup({ label, icon, children }: InputGroupProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium">{label}</label>}

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 border-r border-gray-200 px-3 text-gray-500 dark:border-gray-800 dark:text-gray-400">
            {icon}
          </span>
        )}

        <div className={icon ? "pl-12" : ""}>{children}</div>
      </div>
    </div>
  );
}


