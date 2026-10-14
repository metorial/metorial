import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let organizationIdSchema = z
  .string()
  .optional()
  .describe(
    'Organization ID to operate on. Find it in Elorus under Settings > Organization > Organization ID. Uses the saved default when omitted.'
  );

export let userIdSchema = z.union([z.string(), z.number()]);

export let normalizeUserId = (value: string | number) => {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value <= 0)) {
    throw createApiServiceError(
      'User IDs supplied as numbers must be positive safe integers. Copy user_id from list_users as a decimal string for long IDs.',
      { reason: 'unsafe_user_id' }
    );
  }
  let id = String(value);
  if (!/^[1-9]\d*$/.test(id)) {
    throw createApiServiceError('Provide a positive decimal user ID from list_users.', {
      reason: 'invalid_user_id'
    });
  }
  return id;
};
