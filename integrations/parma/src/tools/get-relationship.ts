import { SlateTool } from 'slates';
import { z } from 'zod';
import { ParmaClient } from '../lib/client';
import { mapRelationship, relationshipSchema } from '../lib/relationship';
import { spec } from '../spec';

export let getRelationship = SlateTool.create(spec, {
  name: 'Get Relationship',
  key: 'get_relationship',
  description:
    'Retrieve one Parma relationship by ID, including contact details, background information, and company and group IDs. Use search_relationships to find the ID.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      relationshipId: z.string().describe('Relationship ID from search_relationships')
    })
  )
  .output(relationshipSchema)
  .handleInvocation(async ctx => ({
    message: `Retrieved relationship **${ctx.input.relationshipId}**.`,
    output: mapRelationship(
      await new ParmaClient(ctx.auth.token).getRelationship(ctx.input.relationshipId)
    )
  }))
  .build();
