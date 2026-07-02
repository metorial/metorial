import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/client';
import { spec } from '../spec';

export let getFieldOptionsTool = SlateTool.create(spec, {
  name: 'Get Field Options',
  key: 'get_field_options',
  description: `Retrieve the available options for a dynamic field in a trigger, action, or query. Useful for discovering valid values before running an action, performing a query, or configuring a trigger. Returns a list of label-value pairs (may include nested categories).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('The ID of the connection'),
      fieldType: z
        .enum(['triggers', 'actions', 'queries'])
        .describe('The type of field (triggers, actions, or queries)'),
      typeId: z.string().describe('The trigger, action, or query identifier'),
      fieldSlug: z.string().describe('The field slug to get options for'),
      userId: z.string().optional().describe('The user ID for user-specific field options')
    })
  )
  .output(
    z.object({
      connectionId: z.string().describe('The connection ID'),
      fieldSlug: z.string().describe('The field slug'),
      options: z
        .any()
        .describe('Array of available option objects with label and value properties')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient(ctx.auth.token);
    let result = await client.getFieldOptions(
      ctx.input.connectionId,
      ctx.input.fieldType,
      ctx.input.typeId,
      ctx.input.fieldSlug,
      ctx.input.userId
    );

    return {
      output: {
        connectionId: ctx.input.connectionId,
        fieldSlug: ctx.input.fieldSlug,
        options: result
      },
      message: `Retrieved field options for **${ctx.input.fieldSlug}** in ${ctx.input.fieldType}/${ctx.input.typeId}.`
    };
  })
  .build();
