import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageMilestone = SlateTool.create(spec, {
  name: 'Manage Milestone',
  key: 'manage_milestone',
  description: `Create, update, complete, reopen, or delete a milestone within a Teamwork project. Milestones can have deadlines, responsible parties, and tags.`,
  instructions: [
    'For "create", provide projectId and title at minimum.',
    'For "update", "complete", "reopen", and "delete", provide the milestoneId.',
    'Deadline format: YYYYMMDD.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'complete', 'reopen', 'delete'])
        .describe('The action to perform'),
      milestoneId: z
        .string()
        .optional()
        .describe('Milestone ID (required for update/complete/reopen/delete)'),
      projectId: z.string().optional().describe('Project ID (required for create)'),
      title: z.string().optional().describe('Milestone title'),
      description: z.string().optional().describe('Milestone description'),
      deadline: z.string().optional().describe('Deadline date (YYYYMMDD)'),
      responsiblePartyIds: z.string().optional().describe('Comma-separated person IDs'),
      tags: z.string().optional().describe('Comma-separated tags')
    })
  )
  .output(
    z.object({
      milestoneId: z.string().optional().describe('ID of the milestone'),
      title: z.string().optional().describe('Milestone title'),
      completed: z.boolean().optional().describe('Whether the milestone was completed'),
      reopened: z.boolean().optional().describe('Whether the milestone was reopened'),
      deleted: z.boolean().optional().describe('Whether the milestone was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.projectId) throw new Error('projectId is required to create a milestone');
      if (!ctx.input.title) throw new Error('title is required to create a milestone');
      let result = await client.createMilestone(ctx.input.projectId, {
        title: ctx.input.title,
        description: ctx.input.description,
        deadline: ctx.input.deadline,
        responsiblePartyIds: ctx.input.responsiblePartyIds,
        tags: ctx.input.tags
      });
      let milestoneId = result.milestoneId || result.id;
      return {
        output: {
          milestoneId: milestoneId ? String(milestoneId) : undefined,
          title: ctx.input.title
        },
        message: `Created milestone **${ctx.input.title}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.milestoneId)
        throw new Error('milestoneId is required to update a milestone');
      await client.updateMilestone(ctx.input.milestoneId, {
        title: ctx.input.title,
        description: ctx.input.description,
        deadline: ctx.input.deadline,
        responsiblePartyIds: ctx.input.responsiblePartyIds,
        tags: ctx.input.tags
      });
      return {
        output: { milestoneId: ctx.input.milestoneId, title: ctx.input.title },
        message: `Updated milestone **${ctx.input.milestoneId}**.`
      };
    }

    if (action === 'complete') {
      if (!ctx.input.milestoneId)
        throw new Error('milestoneId is required to complete a milestone');
      await client.completeMilestone(ctx.input.milestoneId);
      return {
        output: { milestoneId: ctx.input.milestoneId, completed: true },
        message: `Completed milestone **${ctx.input.milestoneId}**.`
      };
    }

    if (action === 'reopen') {
      if (!ctx.input.milestoneId)
        throw new Error('milestoneId is required to reopen a milestone');
      await client.reopenMilestone(ctx.input.milestoneId);
      return {
        output: { milestoneId: ctx.input.milestoneId, reopened: true },
        message: `Reopened milestone **${ctx.input.milestoneId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.milestoneId)
        throw new Error('milestoneId is required to delete a milestone');
      await client.deleteMilestone(ctx.input.milestoneId);
      return {
        output: { milestoneId: ctx.input.milestoneId, deleted: true },
        message: `Deleted milestone **${ctx.input.milestoneId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
