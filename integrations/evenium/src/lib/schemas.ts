import { z } from 'zod';
import type { Page } from './client';

export let eventIdSchema = z
  .string()
  .describe(
    'Event ID. Call list_events to discover events; external IDs may use the ext: prefix.'
  );
export let contactIdSchema = z
  .string()
  .describe(
    'Contact ID. Call list_contacts to discover contacts; external IDs may use the ext: prefix.'
  );
export let registrationStatusSchema = z.enum([
  'CONFIRMED',
  'UNANSWERED',
  'CANCELED',
  'DECLINED',
  'RESERVED',
  'OVERBOOKED',
  'EXTRA',
  'VALID',
  'PENDING'
]);
export let guestFieldSchema = z.object({
  name: z.string().describe('Provider field name or custom field ID'),
  value: z.string().describe('Field value')
});
export let rawSchema = z.record(z.string(), z.unknown());
export let eventSchema = z.object({
  eventId: z.string().describe('Unique event identifier'),
  title: z.string().describe('Event title'),
  description: z.string().optional().describe('Event description'),
  startDate: z.string().describe('Event start date (RFC 3339)'),
  endDate: z.string().optional().describe('Event end date (RFC 3339)'),
  creationDate: z.string().optional().describe('Event creation date (RFC 3339)'),
  status: z.string().optional().describe('Event status'),
  url: z
    .string()
    .optional()
    .describe('Event URL, which may be relative to the provider website'),
  raw: rawSchema.describe('Complete provider event data')
});
export let contactSchema = z.object({
  contactId: z.string().describe('Contact identifier'),
  customId: z.string().optional().describe('External/custom contact ID'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  company: z.string().optional().describe('Company name'),
  gender: z.string().optional().describe('Gender'),
  raw: rawSchema.describe('Complete provider contact data, including custom fields')
});
export let participantSchema = z.object({
  contactId: z.string().describe('Contact ID of the participant'),
  eventId: z.string().describe('Event ID'),
  firstName: z.string().optional().describe('First name when provided'),
  lastName: z.string().optional().describe('Last name when provided'),
  email: z.string().optional().describe('Email address when provided'),
  company: z.string().optional().describe('Company name'),
  gender: z.string().optional().describe('Gender'),
  status: z.string().optional().describe('Registration status'),
  lastUpdate: z.string().optional().describe('Last update timestamp'),
  categoryLabel: z.string().optional().describe('Category label'),
  raw: rawSchema.describe('Complete provider participant data, including custom fields')
});
export let pageMetadataSchema = {
  totalCount: z
    .string()
    .describe('Provider result count (nbrResults); not guaranteed to be a global total'),
  more: z.boolean().optional().describe('Whether the provider reports another page'),
  firstResult: z.string().optional().describe('Provider-reported page offset'),
  maxResults: z.string().optional().describe('Provider-reported page size'),
  next: z.string().optional().describe('Provider-provided next offset, when available'),
  raw: z.unknown().describe('Complete provider response')
};
export let dateFilterSchemas = {
  startsAfter: z.string().optional().describe('Only events starting after this RFC 3339 date'),
  startsBefore: z
    .string()
    .optional()
    .describe('Only events starting before this RFC 3339 date'),
  endsAfter: z.string().optional().describe('Only events ending after this RFC 3339 date'),
  endsBefore: z.string().optional().describe('Only events ending before this RFC 3339 date'),
  createdAfter: z.string().optional().describe('Only events created after this RFC 3339 date'),
  createdBefore: z
    .string()
    .optional()
    .describe('Only events created before this RFC 3339 date')
};
export let pageMetadata = <T>(result: Page<T>) => ({
  totalCount: result.totalCount,
  more: result.more,
  firstResult: result.firstResult,
  maxResults: result.maxResults,
  next: result.next,
  raw: result.raw
});
