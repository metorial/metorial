import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteServer = SlateTool.create(spec, {
  name: 'Delete Server',
  key: 'delete_server',
  description: `Remove a server from a DeployHQ project. This permanently deletes the server configuration and cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectPermalink: z.string().describe('The permalink (slug) of the project'),
      serverIdentifier: z.string().describe('The identifier (UUID) of the server to delete')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Deletion status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    await client.deleteServer(ctx.input.projectPermalink, ctx.input.serverIdentifier);

    return {
      output: { status: 'deleted' },
      message: `Deleted server \`${ctx.input.serverIdentifier}\` from project \`${ctx.input.projectPermalink}\`.`
    };
  })
  .build();
