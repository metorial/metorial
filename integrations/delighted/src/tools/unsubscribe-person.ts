import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectUnavailableDelighted, unavailableMessage } from '../lib/unavailable';
import { spec } from '../spec';

export let unsubscribePerson = SlateTool.create(spec, {
  name: 'Unsubscribe Person',
  key: 'unsubscribe_person',
  description:
    'DEPRECATED — Delighted customer access ended on July 1, 2026. This legacy tool is retained for compatibility and cannot be executed.',
  instructions: [unavailableMessage],
  tags: {
    deprecated: true,
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the person to unsubscribe')
    })
  )
  .output(
    z.object({
      ok: z.boolean().describe('Whether the unsubscribe was successful')
    })
  )
  .handleInvocation(async () => rejectUnavailableDelighted())
  .build();
