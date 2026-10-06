import { z } from 'zod';

export const companyEntrySchema = z.object({
  id: z.string().describe('Saved entry ID; use this value for remove_company, not companyId.'),
  companyId: z
    .string()
    .optional()
    .describe('LeadIQ data-company ID, absent for manual entries'),
  name: z.string().optional(),
  domain: z.string().optional(),
  linkedinUrl: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export const companyListSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  companies: z
    .object({ items: z.array(companyEntrySchema), nextCursor: z.string().optional() })
    .optional()
});
export const companyListIdSchema = z
  .string()
  .min(1)
  .describe('Company list ID from list_company_lists or manage_company_list create.');
export const saveCompanySchema = z.object({
  companyId: z.string().optional().describe('LeadIQ company ID from search_company'),
  name: z.string().optional(),
  domain: z.string().optional(),
  linkedinUrl: z.string().optional(),
  notes: z.string().optional()
});
