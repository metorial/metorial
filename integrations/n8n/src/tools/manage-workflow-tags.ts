import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWorkflowTags = SlateTool.create(spec, {
  name: 'Manage Workflow Tags',
  key: 'manage_workflow_tags',
  description: `Get or update the tags assigned to a workflow. Use this to organize workflows by setting their tags, or to inspect current tag assignments.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('ID of the workflow'),
      tagIds: z
        .array(z.string())
        .optional()
        .describe(
          'Array of tag IDs to assign to the workflow. If provided, replaces all existing tags. Omit to just retrieve current tags.'
        )
    })
  )
  .output(
    z.object({
      tags: z.array(
        z.object({
          tagId: z.string().describe('Tag ID'),
          name: z.string().describe('Tag name'),
          createdAt: z.string().optional().describe('Tag creation timestamp'),
          updatedAt: z.string().optional().describe('Tag last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let rawTags: any[];
    if (ctx.input.tagIds) {
      rawTags = await client.updateWorkflowTags(ctx.input.workflowId, ctx.input.tagIds);
    } else {
      rawTags = await client.getWorkflowTags(ctx.input.workflowId);
    }

    let tags = (rawTags || []).map((t: any) => ({
      tagId: String(t.id),
      name: t.name || '',
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    return {
      output: { tags },
      message: ctx.input.tagIds
        ? `Updated tags for workflow **${ctx.input.workflowId}**. Now has **${tags.length}** tag(s).`
        : `Workflow **${ctx.input.workflowId}** has **${tags.length}** tag(s).`
    };
  })
  .build();
