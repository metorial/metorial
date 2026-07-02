import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteConnection = SlateTool.create(spec, {
  name: 'Delete Connection',
  key: 'delete_connection',
  description: `Permanently delete a connection from your Celigo account. This cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the connection to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the connection was successfully deleted'),
      connectionId: z.string().describe('ID of the deleted connection')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.deleteConnection(ctx.input.connectionId);

    return {
      output: {
        deleted: true,
        connectionId: ctx.input.connectionId
      },
      message: `Deleted connection **${ctx.input.connectionId}**.`
    };
  })
  .build();
