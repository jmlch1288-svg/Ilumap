interface SwitchProps {
  checked: boolean;                    // 👈 controlled
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  color?: "blue" | "gray";
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  disabled = false,
  onChange,
  label,
  color = "blue",
}) => {
  const handleToggle = () => {
    if (disabled) return;
    onChange(!checked);
  };

  const switchColors =
    color === "blue"
      ? {
          background: checked
            ? "bg-brand-500"
            : "bg-gray-200 dark:bg-white/10",
          knob: checked
            ? "translate-x-full bg-white"
            : "translate-x-0 bg-white",
        }
      : {
          background: checked
            ? "bg-gray-800 dark:bg-white/10"
            : "bg-gray-200 dark:bg-white/10",
          knob: checked
            ? "translate-x-full bg-white"
            : "translate-x-0 bg-white",
        };

  return (
    <div
      className={`flex items-center gap-3 cursor-pointer ${
        disabled ? "opacity-50" : ""
      }`}
      onClick={handleToggle}
    >
      <div className="relative">
        <div
          className={`h-6 w-11 rounded-full transition ${switchColors.background}`}
        />
        <div
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full transform transition ${switchColors.knob}`}
        />
      </div>
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
};

export default Switch;

