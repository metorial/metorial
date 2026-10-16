import { z } from 'zod';

export let providerRecordSchema = z.record(z.string(), z.unknown());
export let attendeeInputSchema = z.object({
  email: z.string().describe('Email address of the attendee (required)'),
  firstName: z.string().optional().describe('First name of the attendee'),
  lastName: z.string().optional().describe('Last name of the attendee'),
  photoUrl: z.string().optional().describe('URL for the attendee profile photo'),
  phone: z.string().optional().describe('Phone number of the attendee'),
  bio: z.string().optional().describe('Biography of the attendee'),
  webPage: z.string().optional().describe('Personal web page URL'),
  facebookUrl: z.string().optional().describe('Facebook profile URL'),
  twitterUrl: z.string().optional().describe('Twitter profile URL'),
  linkedinUrl: z.string().optional().describe('LinkedIn profile URL'),
  jobPosition: z.string().optional().describe('Job position/title'),
  company: z.string().optional().describe('Company name'),
  sendEmail: z
    .boolean()
    .optional()
    .describe('Whether to send an invitation email; defaults to false'),
  groupId: z.number().optional().describe('Group ID. Call list_groups to discover groups.'),
  tickets: z
    .array(
      z.object({
        number: z.string().max(512).describe('Ticket code'),
        title: z.string().max(256).optional().describe('Ticket name'),
        type: z.enum(['plain', 'barcode', 'qr']).optional().describe('Ticket display format')
      })
    )
    .optional()
    .describe("Replaces this attendee's tickets for the event when provided")
});
