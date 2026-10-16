import { createApiServiceError } from 'slates';

export let validateBalanceInput = (input: {
  amount?: number;
  units?: number;
  redeemInFull?: boolean;
}) => {
  if (input.redeemInFull) {
    if (input.amount !== undefined || input.units !== undefined) {
      throw createApiServiceError('Omit amount and units when redeemInFull is true.');
    }
    return;
  }
  if ((input.amount === undefined) === (input.units === undefined)) {
    throw createApiServiceError('Provide exactly one of amount (currency) or units.');
  }
  if (input.amount !== undefined && (!Number.isFinite(input.amount) || input.amount <= 0)) {
    throw createApiServiceError('amount must be greater than zero.');
  }
  if (input.units !== undefined && (!Number.isInteger(input.units) || input.units <= 0)) {
    throw createApiServiceError('units must be a positive integer.');
  }
};
