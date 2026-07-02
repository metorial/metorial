import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteMap = SlateTool.create(spec, {
  name: 'Delete Map',
  key: 'delete_map',
  description: `Permanently delete a Felt map. This action is irreversible and removes all layers, elements, and configuration associated with the map.`,
  constraints: ['This action is irreversible.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the map to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteMap(ctx.input.mapId);

    return {
      output: {
        success: true
      },
      message: `Deleted map \`${ctx.input.mapId}\`.`
    };
  })
  .build();
