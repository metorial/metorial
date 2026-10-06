import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let getResource = SlateTool.create(spec, {
  name: 'Get Resource',
  key: 'get_resource',
  description:
    'Read exact Retool data-source resource metadata. Call list_resources to discover resource IDs. Connection credentials are not returned.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resourceId: z
        .string()
        .describe('Exact resource UUID or native technical name from list_resources.')
    })
  )
  .output(
    z.object({
      resourceId: z.string(),
      resourceName: z.string(),
      resourceType: z.string().optional(),
      folderId: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let resource = (await clientFor(ctx).getResource(ctx.input.resourceId)).data;
    return {
      output: {
        resourceId: resource.id,
        resourceName: resource.display_name,
        resourceType: resource.type,
        folderId: resource.folder_id,
        createdAt: resource.created_at,
        updatedAt: resource.updated_at
      },
      message: 'Retrieved the requested resource metadata.'
    };
  })
  .build();
