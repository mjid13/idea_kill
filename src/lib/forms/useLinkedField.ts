"use client";

import { useEffect, useRef } from "react";
import { useController, type Control, type FieldValues, type Path } from "react-hook-form";

/**
 * Generalized from the pitch deck's traction-row MRR auto-fill: a field that
 * tracks a computed default while untouched, stops following as soon as the
 * user edits it directly, and exposes a way to pull the computed value back
 * in at any time. Used by every "this can be derived from another field"
 * case across the business documents instead of reimplementing the linking
 * logic per field.
 */
export function useLinkedField<TFieldValues extends FieldValues, TName extends Path<TFieldValues>>({
  control,
  name,
  computed,
}: {
  control: Control<TFieldValues>;
  name: TName;
  computed: string | number | undefined;
}) {
  const { field } = useController({ control, name });

  const linkedRef = useRef<boolean | null>(null);
  const lastSetRef = useRef<string | number | undefined>(undefined);
  if (linkedRef.current === null) {
    const current = field.value;
    linkedRef.current = current === undefined || current === null || current === "";
  }

  const applyComputed = () => {
    if (computed === undefined) return;
    linkedRef.current = true;
    lastSetRef.current = computed;
    field.onChange(computed);
  };

  useEffect(() => {
    if (lastSetRef.current !== undefined && field.value !== lastSetRef.current) {
      // The user changed the value independently — stop auto-filling this field.
      linkedRef.current = false;
    }
    if (!linkedRef.current || computed === undefined) return;
    lastSetRef.current = computed;
    field.onChange(computed);
    // Only re-run when the computed value changes; refs/field are stable across the component's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed]);

  return { field, applyComputed, hasComputed: computed !== undefined };
}
