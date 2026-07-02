import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteFeatureRequestTool = SlateTool.create(spec, {
  name: 'Delete Feature Request',
  key: 'delete_feature_request',
  description: `Permanently delete a Beamer feature request by its ID. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      requestId: z.number().describe('ID of the feature request to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the feature request was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteFeatureRequest(ctx.input.requestId);

    return {
      output: { deleted: true },
      message: `Deleted feature request with ID **${ctx.input.requestId}**.`
    };
  })
  .build();
