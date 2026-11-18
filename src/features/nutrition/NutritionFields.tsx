"use client";

import { useId, type ReactNode } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { selectValue } from "./domain/select";
import { Checkbox, Input, Select } from "antd";
import type { InputProps } from "antd";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

/** Label + control + hint, wired for accessibility via a generated id. */
export function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] font-medium text-[var(--text-2)]">
        {label}
      </label>
      {children(id)}
      {hint ? <p className="text-xs text-[var(--text-3)]">{hint}</p> : null}
    </div>
  );
}

type Option = { value: string; label: string };

export function TextField({
  label,
  hint,
  className,
  ...inputProps
}: { label: ReactNode; hint?: ReactNode; className?: string } & InputProps) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => <Input id={id} {...inputProps} />}
    </Field>
  );
}

export function SelectField({
  label,
  hint,
  className,
  value,
  options,
  disabled,
  onChange,
}: {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  value: string;
  options: Option[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const { t } = useLocale();
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => (
        <Select
          id={id}
          value={selectValue(value)}
          options={options}
          disabled={disabled}
          placeholder={t("nutSelectPlaceholder")}
          onChange={onChange}
          style={{ width: "100%" }}
        />
      )}
    </Field>
  );
}

export function TextAreaField({
  label,
  hint,
  className,
  value,
  onChange,
  rows = 3,
  maxLength,
  placeholder,
}: {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => (
        <Input.TextArea
          id={id}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

type ControlledProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
};

/** react-hook-form bound text/number/time input. */
export function ControlledInput<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  className,
  asNumber = false,
  emptyAsNull = false,
  ...inputProps
}: ControlledProps<T> & {
  asNumber?: boolean;
  emptyAsNull?: boolean;
} & Omit<InputProps, "name" | "value" | "onChange" | "onBlur">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const raw: unknown = field.value;
        const display =
          typeof raw === "number" ? (Number.isNaN(raw) ? "" : String(raw)) : typeof raw === "string" ? raw : "";
        return (
          <Field label={label} hint={hint} className={className}>
            {(id) => (
              <Input
                id={id}
                {...inputProps}
                name={field.name}
                ref={field.ref}
                value={display}
                onBlur={field.onBlur}
                onChange={(event) => {
                  const next = event.target.value;
                  if (asNumber) field.onChange(next === "" ? Number.NaN : Number(next));
                  else if (emptyAsNull) field.onChange(next === "" ? null : next);
                  else field.onChange(next);
                }}
              />
            )}
          </Field>
        );
      }}
    />
  );
}

export function ControlledSelect<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  className,
  options,
}: ControlledProps<T> & { options: Option[] }) {
  const { t } = useLocale();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field label={label} hint={hint} className={className}>
          {(id) => (
            <Select
              id={id}
              value={selectValue(field.value as string)}
              options={options}
              placeholder={t("nutSelectPlaceholder")}
              onChange={field.onChange}
              onBlur={field.onBlur}
              style={{ width: "100%" }}
            />
          )}
        </Field>
      )}
    />
  );
}

export function ControlledCheckbox<T extends FieldValues>({
  control,
  name,
  children,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  children: ReactNode;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Checkbox
          name={field.name}
          checked={Boolean(field.value)}
          onChange={(event) => field.onChange(event.target.checked)}
          onBlur={field.onBlur}
        >
          {children}
        </Checkbox>
      )}
    />
  );
}
