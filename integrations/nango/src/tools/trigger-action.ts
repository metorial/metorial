import { SlateTool } from 'slates';
import { clientFor } from '../lib/client';
import { connectionId, integrationId, jsonObject, text, z } from '../lib/schemas';
import { spec } from '../spec';
export const triggerAction = SlateTool.create(spec, {
  name: 'Trigger Action',
  key: 'trigger_action',
  description:
    'Execute one deployed Nango action synchronously for an exact connection/integration pair. Call list_functions for native action names and required input. This can write to the connected provider or send messages; effects may remain after a timeout. No automatic retry occurs. Recognized credential fields are redacted from the returned result.'
})
  .input(
    z.object({
      connectionId,
      providerConfigKey: integrationId,
      actionName: text.describe('Exact deployed action name from list_functions.'),
      actionInput: jsonObject
        .optional()
        .describe(
          'Provider function input following its deployed schema; no credential fields.'
        )
    })
  )
  .output(z.object({ actionResult: z.unknown() }))
  .handleInvocation(async ctx => {
    const result = await clientFor(ctx).triggerAction({
      ...ctx.input,
      input: ctx.input.actionInput
    });
    return {
      output: { actionResult: result },
      message:
        'Nango returned the synchronous action result. Verify any provider-specific effects independently.'
    };
  })
  .build();
