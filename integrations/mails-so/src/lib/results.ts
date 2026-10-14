import type { EmailValidationResult } from './client';

export let mapEmailValidationResult = (data: EmailValidationResult) => ({
  validationId: data.id,
  email: data.email,
  username: data.username ?? '',
  domain: data.domain ?? '',
  mxRecord: data.mx_record ?? '',
  score: data.score,
  result: data.result,
  reason: data.reason,
  isFormatValid: data.isv_format,
  isDomainValid: data.isv_domain,
  isMxValid: data.isv_mx === true,
  isMxChecked: typeof data.isv_mx === 'boolean',
  isNotBlocklisted: data.isv_noblock,
  isNotCatchAll: data.isv_nocatchall,
  isNotGeneric: data.isv_nogeneric,
  isFreeProvider: data.is_free
});
