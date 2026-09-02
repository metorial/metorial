import { z } from 'zod';
import { destatisValidationError } from '../lib/errors';

export let trimmedRequiredString = (description: string) =>
  z.string().trim().min(1, 'Enter a non-empty value.').describe(description);

export let boundedPageLength = (defaultValue: number, description: string) =>
  z.number().int().min(1).max(1000).optional().default(defaultValue).describe(description);

export let requireProviderText = (value: unknown, field: string) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  throw destatisValidationError(
    `Destatis GENESIS-Online returned a catalogue item without a valid ${field}.`
  );
};

export let optionalProviderText = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export let optionalProviderCount = (value: unknown) => {
  let count =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value.trim())
        ? Number(value.trim())
        : undefined;
  return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0
    ? count
    : undefined;
};

export let optionalProviderBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  let normalized = value.trim().toLocaleLowerCase('en');
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
};
