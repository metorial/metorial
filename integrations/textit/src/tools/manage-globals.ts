import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageGlobals = SlateTool.create(spec, {
  name: 'Manage Globals',
  key: 'manage_globals',
  description: `Create or update global variables in your TextIt workspace. Globals are key-value pairs that can be referenced across multiple flows.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update']).describe('Whether to create or update a global'),
      globalKey: z
        .string()
        .optional()
        .describe(
          'Key of the global to update (required for update, auto-generated on create)'
        ),
      name: z.string().describe('Display name of the global'),
      value: z.string().describe('Value of the global')
    })
  )
  .output(
    z.object({
      globalKey: z.string().describe('Key of the global'),
      name: z.string().describe('Display name'),
      value: z.string().describe('Value'),
      modifiedOn: z.string().describe('When the global was last modified')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let global: any;

    if (ctx.input.action === 'create') {
      global = await client.createGlobal({ name: ctx.input.name, value: ctx.input.value });
    } else {
      global = await client.updateGlobal(ctx.input.globalKey!, {
        name: ctx.input.name,
        value: ctx.input.value
      });
    }

    return {
      output: {
        globalKey: global.key,
        name: global.name,
        value: global.value,
        modifiedOn: global.modified_on
      },
      message: `Global **${global.name}** (key: ${global.key}) ${ctx.input.action === 'create' ? 'created' : 'updated'}.`
    };
  })
  .build();
