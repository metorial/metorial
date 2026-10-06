import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectUnavailableDelighted, unavailableMessage } from '../lib/unavailable';
import { spec } from '../spec';

export let deletePerson = SlateTool.create(spec, {
  name: 'Delete Person',
  key: 'delete_person',
  description:
    'DEPRECATED — Delighted customer access ended on July 1, 2026. This legacy tool is retained for compatibility and cannot be executed.',
  instructions: [unavailableMessage],
  tags: {
    deprecated: true,
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      personId: z.string().optional().describe('Delete person by their unique ID'),
      email: z.string().optional().describe('Delete person by email address'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Delete person by phone number in E.164 format')
    })
  )
  .output(
    z.object({
      ok: z.boolean().describe('Whether the deletion was accepted')
    })
  )
  .handleInvocation(async () => rejectUnavailableDelighted())
  .build();
