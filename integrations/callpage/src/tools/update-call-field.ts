import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

export let updateCallField = SlateTool.create(spec, {
  name: 'Update Call Field',
  key: 'update_call_field',
  description: `Update the value of a custom field on a specific call. Custom fields are configured per widget and allow storing additional data on call records.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      callId: z.number().describe('The ID of the call to update'),
      fieldId: z.number().describe('The ID of the custom field to update'),
      value: z
        .union([z.string(), z.number(), z.boolean()])
        .describe('New value for the custom field')
    })
  )
  .output(
    z.object({
      callId: z.number().describe('The ID of the updated call'),
      fieldId: z.number().describe('The ID of the updated field')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    await client.updateCallField(ctx.input.callId, ctx.input.fieldId, ctx.input.value);

    return {
      output: {
        callId: ctx.input.callId,
        fieldId: ctx.input.fieldId
      },
      message: `Updated field **#${ctx.input.fieldId}** on call **#${ctx.input.callId}**.`
    };
  })
  .build();
