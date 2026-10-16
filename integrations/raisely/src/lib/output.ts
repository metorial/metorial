import { createApiServiceError, isApiErrorRecord } from 'slates';

export let sanitizeRaiselyLookup = (
  value: unknown,
  resource: 'profile' | 'donation' | 'subscription'
) => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`Raisely returned an invalid ${resource} record.`);
  }

  let output = { ...value };
  if (resource !== 'profile') {
    let { token: _paymentToken, ...record } = output;
    output = record;
  }
  if (isApiErrorRecord(output.user)) {
    let { accessToken: _accessToken, ...user } = output.user;
    output.user = user;
  }
  if (resource === 'subscription' && isApiErrorRecord(output.profile)) {
    if (isApiErrorRecord(output.profile.user)) {
      let { accessToken: _accessToken, ...user } = output.profile.user;
      output.profile = { ...output.profile, user };
    }
  }
  return output;
};
