import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteApp = SlateTool.create(spec, {
  name: 'Delete App',
  key: 'delete_app',
  description: `Permanently delete a Heroku application. This action is irreversible and removes all associated resources including add-ons, dynos, and config vars.`,
  tags: {
    destructive: true
  },
  constraints: [
    'This action is irreversible. All app data, add-ons, and config vars will be permanently deleted.'
  ]
})
  .input(
    z.object({
      appIdOrName: z.string().describe('App name or unique identifier to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the app was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteApp(ctx.input.appIdOrName);

    return {
      output: { deleted: true },
      message: `Deleted app **${ctx.input.appIdOrName}**.`
    };
  })
  .build();
