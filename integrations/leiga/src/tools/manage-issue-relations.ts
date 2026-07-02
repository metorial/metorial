import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addIssueRelationTool = SlateTool.create(spec, {
  name: 'Add Issue Relation',
  key: 'add_issue_relation',
  description: `Link two issues with a relationship type (e.g. "blocks", "is blocked by", "duplicates"). Creates a directional relation from the source issue to the destination issue.`
})
  .input(
    z.object({
      sourceIssueId: z.number().describe('The source issue ID'),
      destinationIssueId: z.number().describe('The destination issue ID'),
      relationType: z
        .string()
        .describe(
          'Relationship type (e.g. "blocks", "is_blocked_by", "duplicates", "relates_to")'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the relation was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.addIssueRelation({
      sourceIssueId: ctx.input.sourceIssueId,
      destinationIssueId: ctx.input.destinationIssueId,
      relationType: ctx.input.relationType
    });

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to add issue relation');
    }

    return {
      output: { success: true },
      message: `Linked issue #${ctx.input.sourceIssueId} → #${ctx.input.destinationIssueId} (${ctx.input.relationType}).`
    };
  })
  .build();

export let removeIssueRelationTool = SlateTool.create(spec, {
  name: 'Remove Issue Relation',
  key: 'remove_issue_relation',
  description: `Remove a relationship between two linked issues.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sourceIssueId: z.number().describe('The source issue ID'),
      destinationIssueId: z.number().describe('The destination issue ID'),
      relationType: z.string().describe('Relationship type to remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the relation was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.removeIssueRelation({
      sourceIssueId: ctx.input.sourceIssueId,
      destinationIssueId: ctx.input.destinationIssueId,
      relationType: ctx.input.relationType
    });

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to remove issue relation');
    }

    return {
      output: { success: true },
      message: `Removed relation between issue #${ctx.input.sourceIssueId} and #${ctx.input.destinationIssueId}.`
    };
  })
  .build();
