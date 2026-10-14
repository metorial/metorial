import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let deviceSchema = z.object({
  appId: z.string().optional().describe('Mobile application ID'),
  deviceModel: z.string().optional().describe('Device model'),
  os: z
    .string()
    .optional()
    .describe('Device operating system; required for mobilepush updates'),
  locale: z.string().optional().describe('Device locale'),
  clientVersion: z.string().optional().describe('SDK version'),
  appVersion: z.string().optional().describe('Mobile app version'),
  active: z.boolean().optional().describe('Whether the push token is active')
});

export let messageResultSchema = z.object({
  locator: z.string().optional().describe('Recipient email, phone number, or token'),
  status: z.string().describe('OK when queued, ERROR when rejected'),
  requestId: z.string().optional().describe('Use get_message_status to check delivery'),
  message: z.string().optional().describe('Provider error details when rejected')
});

export let validatePagination = (startIndex?: number, maxRows?: number) => {
  if (startIndex !== undefined && (!Number.isInteger(startIndex) || startIndex < 1)) {
    throw createApiServiceError('startIndex must be a whole number of at least 1.');
  }
  if (maxRows !== undefined && (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 500)) {
    throw createApiServiceError('maxRows must be a whole number from 1 to 500.');
  }
};
