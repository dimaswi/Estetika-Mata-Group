import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatThousand } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ThousandInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string | number | undefined | null;
  onValueChange: (rawNumericString: string) => void;
  allowDecimal?: boolean;
}

export function ThousandInput({
  value,
  onValueChange,
  allowDecimal = true,
  className,
  ...props
}: ThousandInputProps) {
  const displayValue = formatThousand(value, allowDecimal);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!allowDecimal) {
      const digits = raw.replace(/\D/g, "");
      onValueChange(digits.replace(/^0+(?=\d)/, ""));
      return;
    }

    // Strip thousand dots, preserve comma as Indonesian decimal separator
    const stripped = raw.replace(/\./g, "").replace(/[^0-9,]/g, "");
    const commaIdx = stripped.indexOf(",");
    if (commaIdx >= 0) {
      const intPart = stripped.slice(0, commaIdx).replace(/^0+(?=\d)/, "") || "0";
      const decPart = stripped.slice(commaIdx + 1).replace(/,/g, "");
      onValueChange(`${intPart}.${decPart}`);
    } else {
      onValueChange(stripped.replace(/^0+(?=\d)/, ""));
    }
  };

  return (
    <Input
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      value={displayValue}
      onChange={handleChange}
      className={cn("font-mono", className)}
      {...props}
    />
  );
}
