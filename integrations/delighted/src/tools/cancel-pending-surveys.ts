import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectUnavailableDelighted, unavailableMessage } from '../lib/unavailable';
import { spec } from '../spec';

export let cancelPendingSurveys = SlateTool.create(spec, {
  name: 'Cancel Pending Surveys',
  key: 'cancel_pending_surveys',
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
      email: z
        .string()
        .describe('Email address of the person whose pending surveys should be cancelled')
    })
  )
  .output(
    z.object({
      ok: z.boolean().describe('Whether the cancellation was successful')
    })
  )
  .handleInvocation(async () => rejectUnavailableDelighted())
  .build();
