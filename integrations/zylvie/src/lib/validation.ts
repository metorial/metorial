import { createApiServiceError } from 'slates';

export let invalidInput = (message: string) =>
  createApiServiceError(message, { reason: 'zylvie_invalid_input' });
export let requireText = (value: unknown, field: string, max?: number) => {
  if (typeof value !== 'string' || !value.trim() || (max && value.length > max)) {
    throw invalidInput(
      `${field} must be a nonempty string${max ? ` of at most ${max} characters` : ''}.`
    );
  }
};
let integer = (value: unknown, field: string, minimum?: number) => {
  if (
    value !== undefined &&
    (!Number.isSafeInteger(value) || (minimum !== undefined && Number(value) < minimum))
  ) {
    throw invalidInput(
      `${field} must be a whole number${minimum !== undefined ? ` of at least ${minimum}` : ''}.`
    );
  }
};
export let validateProduct = (data: Record<string, unknown>, creating: boolean) => {
  if (!creating) requireText(data.id, 'productId', 25);
  for (let [field, max] of [
    ['title', 500],
    ['url', 100]
  ] as const) {
    if (creating || data[field] !== undefined) requireText(data[field], field, max);
  }
  if (data.url !== undefined && !/^[a-z\d_.-]+$/i.test(String(data.url))) {
    throw invalidInput(
      'url must contain only letters, numbers, underscores, hyphens, or dots.'
    );
  }
  if ((creating || data.currency !== undefined) && !/^[a-z]{3}$/.test(String(data.currency))) {
    throw invalidInput('currency must be a lowercase three-letter ISO currency code.');
  }
  integer(data.interval_count, 'intervalCount', 1);
  integer(data.trial_period_days, 'trialPeriodDays', 0);
  if (
    data.pricing_model === 'subscription' &&
    (data.interval === undefined || data.interval_count === undefined)
  ) {
    throw invalidInput('Subscription pricing requires interval and intervalCount.');
  }
  if (
    data.use_uploaded_license_codes === true &&
    (data.is_licensed === false || (creating && data.is_licensed !== true))
  ) {
    throw invalidInput(
      'useUploadedLicenseCodes requires license key generation to be enabled.'
    );
  }
};
export let validateCoupon = (data: Record<string, unknown>, creating: boolean) => {
  if (!creating) requireText(data.id, 'couponId', 25);
  if (creating || data.code !== undefined) {
    requireText(data.code, 'code', 100);
    if (String(data.code).length < 2)
      throw invalidInput('code must be at least two characters.');
  }
  if (data.amount !== undefined) {
    let maximum = data.type === 'percentage' ? 100 : 999999.99;
    if (
      typeof data.amount !== 'number' ||
      !Number.isFinite(data.amount) ||
      data.amount < 0.1 ||
      data.amount > maximum
    ) {
      throw invalidInput(`amount must be between 0.1 and ${maximum}.`);
    }
  }
  if (
    data.is_storewide === false &&
    (!Array.isArray(data.products) || data.products.length === 0)
  ) {
    throw invalidInput(
      'products must contain at least one product ID when isStorewide is false.'
    );
  }
  for (let field of ['limit', 'duration_in_months', 'valid_for_days'])
    integer(data[field], field);
  for (let field of ['start', 'end']) {
    let value = data[field];
    if (
      value !== undefined &&
      value !== '' &&
      (typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
        !Number.isFinite(Date.parse(value)))
    ) {
      throw invalidInput(`${field} must be an ISO 8601 date-time, or blank to clear it.`);
    }
  }
  if (
    data.start &&
    data.end &&
    Date.parse(String(data.end)) <= Date.parse(String(data.start))
  ) {
    throw invalidInput('end must be after start.');
  }
};
