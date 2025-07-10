import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  icon?: string;
  placeholder?: string;
}

export default function Select({
  label,
  options,
  value,
  onChange,
  icon,
  placeholder = "Sélectionner...",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || "");

  const selectedOption = options.find(
    (option) => option.value === selectedValue
  );

  const handleSelect = (optionValue: string) => {
    setSelectedValue(optionValue);
    onChange?.(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <label className="block text-text-secondary text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full bg-zinc-800 text-text-primary rounded px-3 h-9
            flex items-center justify-between transition-all
            ${isOpen ? "ring-1 ring-brand-red z-30" : ""}
            hover:bg-zinc-700
          `}
        >
          <span
            className={
              selectedOption ? "text-text-primary" : "text-text-secondary"
            }
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-text-secondary transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <>
            {/* Overlay pour fermer le dropdown */}
            <div
              className="fixed inset-0 z-20"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown menu */}
            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 rounded shadow-elevation z-30 border border-zinc-700">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className="w-full px-3 py-2 text-left text-text-primary hover:bg-zinc-700 first:rounded-t last:rounded-b transition-colors"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
