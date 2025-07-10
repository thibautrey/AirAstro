import { useState } from "react";

interface NumberInputProps {
  label: string;
  value?: number;
  onChange?: (value: number) => void;
  suffix?: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export default function NumberInput({
  label,
  value,
  onChange,
  suffix,
  defaultValue,
  min,
  max,
  step = 1,
  placeholder,
}: NumberInputProps) {
  const [inputValue, setInputValue] = useState(
    value?.toString() || defaultValue?.toString() || ""
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    const numericValue = parseFloat(newValue);
    if (!isNaN(numericValue)) {
      onChange?.(numericValue);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-text-secondary text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={inputValue}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className="
            w-full bg-zinc-800 text-text-primary rounded px-3 h-9 
            border-0 outline-none transition-all
            focus:ring-1 focus:ring-brand-red
            hover:bg-zinc-700
            placeholder:text-text-secondary
          "
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
