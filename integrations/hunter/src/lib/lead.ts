import { z } from 'zod';
import { entity, id, optionalNumber, optionalRow, optionalText } from './client';

export const leadOutputSchema = z.object({
  leadId: z.number().describe('Lead ID'),
  email: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  position: z.string().nullable(),
  company: z.string().nullable(),
  companyIndustry: z.string().nullable(),
  companySize: z.string().nullable(),
  website: z.string().nullable(),
  countryCode: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  twitter: z.string().nullable(),
  notes: z.string().nullable(),
  verificationStatus: z.string().nullable(),
  leadListId: z.number().nullable().optional().describe('Primary leads list ID'),
  createdBy: z
    .number()
    .nullable()
    .optional()
    .describe('Provider user ID that created the lead'),
  createdAt: z.string().nullable().optional(),
  sendingStatus: z.string().nullable().optional()
});
export const mapLead = (value: unknown) => {
  const lead = entity(value),
    list = optionalRow(lead.leads_list),
    verification = optionalRow(lead.verification);
  const companySize =
    lead.company_size == null
      ? null
      : typeof lead.company_size === 'number'
        ? String(optionalNumber(lead.company_size))
        : (optionalText(lead.company_size) ?? null);
  return {
    leadId: id(lead.id),
    email: optionalText(lead.email) ?? null,
    firstName: optionalText(lead.first_name) ?? null,
    lastName: optionalText(lead.last_name) ?? null,
    position: optionalText(lead.position) ?? null,
    company: optionalText(lead.company) ?? null,
    companyIndustry: optionalText(lead.company_industry) ?? null,
    companySize,
    website: optionalText(lead.website) ?? null,
    countryCode: optionalText(lead.country_code) ?? null,
    linkedinUrl: optionalText(lead.linkedin_url) ?? null,
    phoneNumber: optionalText(lead.phone_number) ?? null,
    twitter: optionalText(lead.twitter) ?? null,
    notes: optionalText(lead.notes) ?? null,
    verificationStatus: optionalText(verification.status) ?? null,
    leadListId: optionalNumber(list.id ?? lead.leads_list_id) ?? null,
    createdBy: optionalNumber(lead.created_by) ?? null,
    createdAt: optionalText(lead.created_at) ?? null,
    sendingStatus: optionalText(lead.sending_status) ?? null
  };
};
