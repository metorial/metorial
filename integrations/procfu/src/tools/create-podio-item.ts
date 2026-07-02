import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from '../lib/client';
import { spec } from '../spec';

export let createPodioItem = SlateTool.create(spec, {
  name: 'Create Podio Item',
  key: 'create_podio_item',
  description: `Create a new item in a Podio app. Provide field values as a JSON object using external_id:value pairs (e.g. \`{"title":"My Item","status":"Open"}\`).
Optionally control whether Podio hooks and notifications are triggered.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      appId: z.string().describe('The Podio App ID where the item will be created'),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Field values as external_id:value pairs, e.g. {"title":"My Item","category":"Open"}'
        ),
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
      createdItemId: z.string().describe('The ID of the newly created Podio item')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });

    let fieldsJson = JSON.stringify(ctx.input.fields);
    let result = await client.createItem(
      ctx.input.appId,
      fieldsJson,
      ctx.input.triggerHooks,
      ctx.input.silent
    );

    let createdItemId =
      typeof result === 'object' && result !== null
        ? String(result.item_id ?? result.id ?? result)
        : String(result);

    return {
      output: { createdItemId },
      message: `Created Podio item **${createdItemId}** in app **${ctx.input.appId}**.`
    };
  })
  .build();
