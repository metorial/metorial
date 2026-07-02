import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from '../lib/client';
import { spec } from '../spec';

export let updatePodioItem = SlateTool.create(spec, {
  name: 'Update Podio Item',
  key: 'update_podio_item',
  description: `Update fields on an existing Podio item. Provide field values as a JSON object using external_id:value pairs (e.g. \`{"title":"Updated Title","status":"Closed"}\`).
Only the specified fields are updated; other fields remain unchanged.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      podioItemId: z.string().describe('The Podio item ID to update'),
      fields: z
        .record(z.string(), z.any())
        .describe('Field values to update as external_id:value pairs'),
      triggerHooks: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to trigger Podio hook events'),
      silent: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to suppress notifications')
    })
  )
  .output(
    z.object({
      podioItemId: z.string().describe('The ID of the updated Podio item'),
      result: z.any().describe('The update response from ProcFu')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });

    let valuesJson = JSON.stringify(ctx.input.fields);
    let result = await client.updateItemFields(
      ctx.input.podioItemId,
      valuesJson,
      ctx.input.triggerHooks,
      ctx.input.silent
    );

    return {
      output: {
        podioItemId: ctx.input.podioItemId,
        result
      },
      message: `Updated Podio item **${ctx.input.podioItemId}** with ${Object.keys(ctx.input.fields).length} field(s).`
    };
  })
  .build();
