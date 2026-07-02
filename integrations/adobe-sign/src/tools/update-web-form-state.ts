import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateWebFormState = SlateTool.create(spec, {
  name: 'Update Web Form State',
  key: 'update_web_form_state',
  description: `Update an Adobe Acrobat Sign web form state, such as activating, deactivating, moving to authoring, or cancelling a web form.`,
  instructions: [
    'Use INACTIVE to disable an active web form without deleting historical agreements.',
    'Use CANCELLED only for web forms that should no longer be used.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      webFormId: z.string().describe('ID of the web form to update'),
      state: z
        .enum(['ACTIVE', 'INACTIVE', 'AUTHORING', 'CANCELLED'])
        .describe('Target state for the web form'),
      message: z
        .string()
        .optional()
        .describe('Optional inactive-state message shown to visitors')
    })
  )
  .output(
    z.object({
      webFormId: z.string().describe('ID of the updated web form'),
      state: z.string().describe('Requested new state')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    await client.updateWebFormState(ctx.input.webFormId, ctx.input.state, ctx.input.message);

    return {
      output: {
        webFormId: ctx.input.webFormId,
        state: ctx.input.state
      },
      message: `Web form \`${ctx.input.webFormId}\` state update requested: **${ctx.input.state}**.`
    };
  });
