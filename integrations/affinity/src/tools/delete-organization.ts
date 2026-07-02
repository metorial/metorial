import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let deleteOrganization = SlateTool.create(spec, {
  name: 'Delete Organization',
  key: 'delete_organization',
  description: `Permanently delete an organization record from Affinity. Global organizations from the Affinity database cannot be deleted.`,
  constraints: ['Global organizations cannot be deleted.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      organizationId: z.number().describe('ID of the organization to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    await client.deleteOrganization(ctx.input.organizationId);

    return {
      output: {
        success: true
      },
      message: `Deleted organization with ID **${ctx.input.organizationId}**.`
    };
  })
  .build();
