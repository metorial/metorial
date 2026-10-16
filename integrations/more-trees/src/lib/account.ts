import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let accountCodeField = z
  .string()
  .optional()
  .describe(
    'More Trees account code from Settings > Account Settings. Required unless this connection already stores an account code. The public API guide does not document account-code discovery.'
  );

export let resolveAccountCode = (
  accountCode: string | undefined,
  config: Record<string, unknown>
) => {
  let value = accountCode ?? config.accountCode;
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError(
      'Provide accountCode from More Trees Settings > Account Settings.'
    );
  }
  return value.trim();
};
