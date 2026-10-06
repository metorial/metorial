import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectUnavailableDelighted, unavailableMessage } from '../lib/unavailable';
import { spec } from '../spec';

export let listPeople = SlateTool.create(spec, {
  name: 'List People',
  key: 'list_people',
  description:
    'DEPRECATED — Delighted customer access ended on July 1, 2026. This legacy tool is retained for compatibility and cannot be executed.',
  instructions: [unavailableMessage],
  tags: {
    deprecated: true,
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      listType: z
        .enum(['all', 'unsubscribed', 'bounced'])
        .optional()
        .describe('Type of people list to retrieve. Defaults to all.'),
      perPage: z.number().optional().describe('Results per page (max 100, default 20)'),
      page: z.number().optional().describe('Page number (for unsubscribed/bounced lists)'),
      since: z
        .number()
        .optional()
        .describe('Unix timestamp to filter records on or after this time'),
      until: z
        .number()
        .optional()
        .describe('Unix timestamp to filter records on or before this time'),
      email: z.string().optional().describe('Search for a specific person by email'),
      phoneNumber: z.string().optional().describe('Search by phone number in E.164 format')
    })
  )
  .output(
    z.object({
      people: z.array(z.any()).describe('List of people records')
    })
  )
  .handleInvocation(async () => rejectUnavailableDelighted())
  .build();
