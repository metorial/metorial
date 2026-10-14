import { z } from 'zod';

export let blacklistInputSchema = z.object({
  confidenceMinimum: z
    .number()
    .min(25)
    .max(100)
    .optional()
    .describe(
      'Minimum abuse confidence score threshold (25–100, default 100; subscriber feature)'
    ),
  limit: z
    .number()
    .optional()
    .describe('Maximum number of IPs to return (default 10,000; capped by your plan)'),
  onlyCountries: z
    .string()
    .optional()
    .describe('Comma-separated ISO 3166 alpha-2 country codes to include; subscriber feature'),
  exceptCountries: z
    .string()
    .optional()
    .describe('Comma-separated ISO 3166 alpha-2 country codes to exclude; subscriber feature'),
  ipVersion: z
    .union([z.literal(4), z.literal(6)])
    .optional()
    .describe('Filter by IP version: 4 (IPv4) or 6 (IPv6)')
});
