import { z } from 'zod';

export const uploadFields = {
  fileName: z
    .string()
    .min(1)
    .regex(/^[^/\\]+$/)
    .describe('File name, including extension, without directory paths'),
  content: z
    .string()
    .min(1)
    .describe('UTF-8 text or base64-encoded file bytes, according to encoding'),
  encoding: z
    .enum(['text', 'base64'])
    .optional()
    .describe('Content encoding; text by default. Base64 must not include a data URL prefix.'),
  mimeType: z
    .string()
    .min(1)
    .optional()
    .describe('File MIME type, for example text/plain or application/pdf')
};

export const analyticsFields = {
  page: z
    .number()
    .multipleOf(1)
    .nonnegative()
    .optional()
    .describe('Page number, starting at 0; defaults to 0'),
  pageSize: z
    .number()
    .multipleOf(1)
    .positive()
    .optional()
    .describe('Results per page; defaults to 25'),
  startDate: z.iso
    .datetime({ offset: true })
    .optional()
    .describe('Start date and time in ISO 8601 format, including timezone'),
  endDate: z.iso
    .datetime({ offset: true })
    .optional()
    .describe('End date and time in ISO 8601 format, including timezone')
};
