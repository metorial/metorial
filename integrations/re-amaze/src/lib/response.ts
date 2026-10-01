import { createApiServiceError } from 'slates';

/** Preserve the numeric public IDs while accepting Re:amaze's decimal-string IDs. */
export let toNumericId = (value: unknown, label: string): number => {
  let numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(numeric) || numeric < 0) {
    throw createApiServiceError(`Re:amaze returned an invalid or unsafe numeric ${label}.`, {
      reason: 'reamaze_invalid_response'
    });
  }
  return numeric;
};

/** Opaque provider IDs remain strings; numeric aliases are only exposed when lossless. */
export let toProviderId = (value: unknown, label: string): string => {
  if (typeof value === 'number') return String(toNumericId(value, label));
  if (typeof value === 'string' && value.trim()) return value;
  throw createApiServiceError(`Re:amaze returned an invalid ${label}.`, {
    reason: 'reamaze_invalid_response'
  });
};

export let numericIdAlias = (value: unknown, label: string): number | undefined => {
  let identifier = toProviderId(value, label);
  return /^\d+$/.test(identifier) ? toNumericId(identifier, label) : undefined;
};

export let resolveResourceId = (
  legacy: number | undefined,
  identifier: string | undefined,
  label: string
): string => {
  let numeric = legacy === undefined ? undefined : String(toNumericId(legacy, label));
  if (identifier !== undefined && !identifier.trim()) {
    throw createApiServiceError(`Provide a nonempty ${label}.`);
  }
  if (numeric !== undefined && identifier !== undefined && numeric !== identifier) {
    throw createApiServiceError(
      `The numeric and string ${label} must identify the same resource.`
    );
  }
  if (identifier === undefined && numeric === undefined) {
    throw createApiServiceError(`Provide the ${label} returned by the discovery tool.`);
  }
  return identifier ?? numeric!;
};
