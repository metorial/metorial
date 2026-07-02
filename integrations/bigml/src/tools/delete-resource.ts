import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteResource = SlateTool.create(spec, {
  name: 'Delete Resource',
  key: 'delete_resource',
  description: `Permanently delete a BigML resource. This action is irreversible.
Deleting a project will also delete all resources within that project.`,
  constraints: [
    'Deletion is permanent and cannot be undone.',
    'Deleting a project removes all contained resources.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      resourceId: z
        .string()
        .describe('Full resource ID to delete (e.g., "source/abc123", "model/abc123")')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the resource was successfully deleted'),
      resourceId: z.string().describe('The ID of the deleted resource')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    await client.deleteResource(ctx.input.resourceId);

    return {
      output: {
        deleted: true,
        resourceId: ctx.input.resourceId
      },
      message: `Resource **${ctx.input.resourceId}** has been permanently deleted.`
    };
  })
  .build();
