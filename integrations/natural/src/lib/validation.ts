import type { NaturalRecord } from './envelopes';
import { pickDefined } from './envelopes';
import { naturalServiceError } from './errors';

export const requireConfirm = (confirm: boolean | undefined, action: string) => {
  if (confirm !== true) {
    throw naturalServiceError(`Set confirm to true to ${action}.`);
  }
};

export const requireIdempotencyKey = (idempotencyKey: string | undefined, action: string) => {
  if (!idempotencyKey) {
    throw naturalServiceError(
      `Provide idempotencyKey to ${action}. Reuse the same key when retrying the same request.`
    );
  }
};

export const ensureAtLeastOneField = (body: NaturalRecord, label: string) => {
  if (Object.keys(body).length === 0) {
    throw naturalServiceError(`Provide at least one ${label} field.`);
  }
};

export const recipientObject = (recipient: { type: string; value: string }) => ({
  type: recipient.type,
  value: recipient.value
});

export const paymentSourceObject = (input: {
  paymentSourceType: 'wallet' | 'external_account';
  walletId?: string;
  externalAccountId?: string;
}) => {
  if (input.paymentSourceType === 'wallet') {
    if (!input.walletId) {
      throw naturalServiceError('walletId is required when paymentSourceType is wallet.');
    }
    if (input.externalAccountId) {
      throw naturalServiceError(
        'externalAccountId is only valid when paymentSourceType is external_account.'
      );
    }
    return {
      type: 'wallet',
      walletId: input.walletId
    };
  }

  if (!input.externalAccountId) {
    throw naturalServiceError(
      'externalAccountId is required when paymentSourceType is external_account.'
    );
  }
  if (input.walletId) {
    throw naturalServiceError('walletId is only valid when paymentSourceType is wallet.');
  }
  return {
    type: 'external_account',
    externalAccountId: input.externalAccountId
  };
};

export const limitsObject = (limits?: {
  perTransaction?: number | null;
  perDay?: number | null;
  perMonth?: number | null;
}) => {
  if (limits === undefined) return undefined;
  return pickDefined({
    perTransaction: limits.perTransaction,
    perDay: limits.perDay,
    perMonth: limits.perMonth
  });
};
