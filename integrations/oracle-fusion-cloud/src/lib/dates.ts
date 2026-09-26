import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let oracleDateSchema = z.iso.date().refine(value => !value.startsWith('0000-'), {
  message: 'Use a real calendar date in YYYY-MM-DD format.'
});

export let validateOracleDate = (value: string, label = 'Date'): string => {
  if (!oracleDateSchema.safeParse(value).success) {
    throw createApiServiceError(
      `${label} must be a real calendar date in YYYY-MM-DD format.`,
      {
        reason: 'oracle_fusion_invalid_date'
      }
    );
  }
  return value;
};

export let validateOracleDateRange = (
  from: string | undefined,
  to: string | undefined
): void => {
  if (from === undefined && to === undefined) return;
  if (from === undefined || to === undefined) {
    throw createApiServiceError(
      'Provide both the start date and the end date for the range.',
      {
        reason: 'oracle_fusion_invalid_date_range'
      }
    );
  }
  validateOracleDate(from, 'Start date');
  validateOracleDate(to, 'End date');
  if (from > to) {
    throw createApiServiceError('The start date must be on or before the end date.', {
      reason: 'oracle_fusion_invalid_date_range'
    });
  }
};
