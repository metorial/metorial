import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let assignTag = SlateTool.create(spec, {
  name: 'Assign or Unassign Tag',
  key: 'assign_tag',
  description: `Assign or unassign a tag to/from a person. Tags are used to categorize and group people in the database.`
})
  .input(
    z.object({
      action: z.enum(['assign', 'unassign']).describe('Whether to assign or unassign the tag'),
      personId: z.string().describe('ID of the person'),
      tagId: z.string().describe('ID of the tag')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result: unknown;
    if (ctx.input.action === 'assign') {
      result = await client.assignTag(ctx.input.personId, ctx.input.tagId);
    } else {
      result = await client.unassignTag(ctx.input.personId, ctx.input.tagId);
    }

    return {
      output: { success: result === true || result === 'true' },
      message: `Tag (ID: ${ctx.input.tagId}) ${ctx.input.action === 'assign' ? 'assigned to' : 'unassigned from'} person (ID: ${ctx.input.personId}).`
    };
  })
  .build();
