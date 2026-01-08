import Input from "../input/InputField";
import Label from "../input/Label";

interface InputGroupProps {
  label?: string;
  icon?: React.ReactNode;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function InputGroup({
  label,
  icon,
  type = "text",
  value,
  onChange,
  placeholder,
}: InputGroupProps) {
  return (
    <div className="space-y-1">
      {label && <Label>{label}</Label>}

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 border-r border-gray-200 px-3 text-gray-500 dark:border-gray-800 dark:text-gray-400">
            {icon}
          </span>
        )}

        <Input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={icon ? "pl-12" : ""}
        />
      </div>
    </div>
  );
}

