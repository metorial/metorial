import { createApiServiceError } from 'slates';

export const sunsetFaqUrl = 'https://help.delighted.com/article/840-delighted-sunset-faq';
export const unavailableMessage = `Delighted is unavailable: customer access ended on July 1, 2026 after the June 30, 2026 sunset. Do not retry or reconnect this discontinued service. Move this workflow to another supported feedback provider. See ${sunsetFaqUrl}. No provider request was made.`;

export function rejectUnavailableDelighted(): never {
  throw createApiServiceError(unavailableMessage, { reason: 'provider_discontinued' });
}
