import { createApiServiceError, pickDefined } from 'slates';
import { z } from 'zod';
import { type ProviderRecord, resourceId, text } from './client';

export let pageInput = {
  page: z.number().int().min(1).optional().describe('Page number; starts at 1'),
  perPage: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe('Results per page; maximum 200')
};
export let pageOutput = {
  totalCount: z.number().optional().describe('Total matching records, when returned'),
  totalPages: z.number().optional().describe('Total result pages, when returned'),
  links: z.string().optional().describe('Pagination links returned by EchtPost')
};
export let contactFields = {
  lastName: z.string().optional().describe('Last name / surname'),
  firstName: z.string().optional().describe('First name'),
  title: z.string().optional().describe('Title or salutation'),
  companyName: z.string().optional().describe('Company name'),
  street: z.string().optional().describe('Street address'),
  zip: z.string().optional().describe('ZIP / postal code'),
  city: z.string().optional().describe('City'),
  countryCode: z
    .string()
    .optional()
    .describe('Two-letter country code; required when creating a contact'),
  greetingStyle: z
    .enum(['formal', 'informal', 'custom'])
    .optional()
    .describe('Salutation style'),
  customSalutation: z
    .string()
    .optional()
    .describe(
      'Custom salutation; required for custom greeting style on creation. Omit on update to keep the stored value.'
    ),
  gender: z.string().optional().describe('Recipient gender used for salutations'),
  department: z.string().optional().describe('Company department'),
  stateCode: z.string().optional().describe('State or region code'),
  birthdate: z.string().optional().describe('Birth date in YYYY-MM-DD format'),
  externalId: z.string().optional().describe('Reference in your external system'),
  groupIds: z
    .array(z.string())
    .optional()
    .describe('Group IDs; replaces memberships on update, including an empty list to clear'),
  groupNames: z
    .array(z.string())
    .optional()
    .describe('Add membership in named groups, creating missing groups')
};
export let contactOutput = z.object({
  contactId: z.string().describe('Unique contact identifier'),
  title: z.string().optional().describe('Title or salutation'),
  companyName: z.string().optional().describe('Company name'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name / surname'),
  street: z.string().optional().describe('Street address'),
  zip: z.string().optional().describe('ZIP / postal code'),
  city: z.string().optional().describe('City'),
  countryCode: z.string().optional().describe('Two-letter country code'),
  response: z.unknown().optional().describe('Complete contact returned by EchtPost')
});
export let mapContact = (c: ProviderRecord) => ({
  contactId: resourceId(c.id, 'contact ID'),
  ...pickDefined({
    title: text(c.title, 'contact title'),
    companyName: text(c.company_name, 'contact company name', true),
    firstName: text(c.first_name, 'contact first name'),
    lastName: text(c.last_name, 'contact last name'),
    street: text(c.street, 'contact street'),
    zip: text(c.zip, 'contact postal code'),
    city: text(c.city, 'contact city'),
    countryCode: text(c.country_code, 'contact country code')
  }),
  response: c
});

export let templateOutput = z.object({
  templateId: z.string().describe('Unique template identifier'),
  name: z.string().optional().describe('Template name when supplied by EchtPost'),
  content: z.string().optional().describe('Template content / text'),
  previewUrl: z.string().optional().describe('URL to preview the template, when available'),
  response: z.unknown().optional().describe('Complete template returned by EchtPost')
});
export let mapTemplate = (t: ProviderRecord) => ({
  templateId: resourceId(t.id, 'template ID'),
  ...pickDefined({
    name:
      text(t.best_name, 'template best name') ??
      text(t.name, 'template name') ??
      text(t.content, 'template content'),
    content: text(t.content, 'template content'),
    previewUrl: text(t.preview_url, 'template preview URL', true)
  }),
  response: t
});

export let groupOutput = z.object({
  groupId: z.string().describe('Group identifier'),
  name: z.string().optional().describe('Group name'),
  recipientCount: z.number().optional().describe('Number of group members'),
  response: z.unknown().describe('Complete group returned by EchtPost')
});
export let mapGroup = (g: ProviderRecord) => {
  let recipientCount = g.recipient_count;
  if (
    recipientCount !== undefined &&
    (typeof recipientCount !== 'number' ||
      !Number.isSafeInteger(recipientCount) ||
      recipientCount < 0)
  ) {
    throw createApiServiceError('EchtPost returned an invalid group recipient count.');
  }
  return {
    groupId: resourceId(g.id, 'group ID'),
    ...pickDefined({
      name: text(g.name, 'group name'),
      recipientCount
    }),
    response: g
  };
};

export let cardOutput = z.object({
  cardId: z.string().describe('Postcard identifier'),
  status: z.string().optional().describe('Current postcard status'),
  cancelable: z.boolean().optional().describe('Whether cancellation is still available'),
  response: z.unknown().describe('Complete postcard returned by EchtPost')
});
export let mapCard = (c: ProviderRecord) => {
  if (typeof c.id !== 'string' || !c.id.trim()) {
    throw createApiServiceError('EchtPost returned a missing or invalid postcard ID.');
  }
  let cancelable = c.cancelable;
  if (cancelable !== undefined && typeof cancelable !== 'boolean') {
    throw createApiServiceError('EchtPost returned an invalid postcard cancellation flag.');
  }
  return {
    cardId: c.id,
    ...pickDefined({
      status: text(c.status, 'postcard status'),
      cancelable
    }),
    response: c
  };
};
