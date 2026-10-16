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
      projectPermalink: z
        .string()
        .describe('Project permalink or identifier. Call list_projects to discover projects.'),
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

    let result = await client.deleteServer(
      ctx.input.projectPermalink,
      ctx.input.serverIdentifier
    );

    return {
      output: { status: result.status },
      message: `Deleted server \`${ctx.input.serverIdentifier}\` from project \`${ctx.input.projectPermalink}\`.`
    };
  })
  .build();
