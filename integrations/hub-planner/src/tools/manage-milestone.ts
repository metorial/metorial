import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMilestone = SlateTool.create(spec, {
  name: 'Manage Milestone',
  key: 'manage_milestone',
  description: `Create, update, or delete a project milestone in Hub Planner.
When creating, **name**, **date**, and **projectId** are required. Milestones mark key dates within projects.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      milestoneId: z
        .string()
        .optional()
        .describe('Milestone ID, required for update and delete'),
      name: z.string().optional().describe('Milestone name, required for create'),
      date: z.string().optional().describe('Milestone date (YYYY-MM-DD), required for create'),
      projectId: z.string().optional().describe('Project ID, required for create'),
      metadata: z.string().optional().describe('Custom metadata')
    })
  )
  .output(
    z.object({
      milestoneId: z.string().optional().describe('Milestone ID'),
      name: z.string().optional().describe('Milestone name'),
      date: z.string().optional().describe('Milestone date'),
      projectId: z.string().optional().describe('Project ID'),
      metadata: z.string().optional().describe('Custom metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, milestoneId, projectId, ...fields } = ctx.input;

    if (action === 'create') {
      let body: Record<string, any> = { ...fields, project: projectId };
      let result = await client.createMilestone(body);
      return {
        output: {
          milestoneId: result._id,
          name: result.name,
          date: result.date,
          projectId: result.project,
          metadata: result.metadata
        },
        message: `Created milestone **${result.name}** (ID: \`${result._id}\`).`
      };
    }

    if (action === 'update') {
      if (!milestoneId) throw new Error('milestoneId is required for update');
      let existing = await client.getMilestone(milestoneId);
      let body: Record<string, any> = { ...existing, ...fields };
      if (projectId) body.project = projectId;
      let result = await client.updateMilestone(milestoneId, body);
      return {
        output: {
          milestoneId: result._id,
          name: result.name,
          date: result.date,
          projectId: result.project,
          metadata: result.metadata
        },
        message: `Updated milestone **${result.name}** (ID: \`${result._id}\`).`
      };
    }

    if (!milestoneId) throw new Error('milestoneId is required for delete');
    await client.deleteMilestone(milestoneId);
    return {
      output: { milestoneId },
      message: `Deleted milestone \`${milestoneId}\`.`
    };
  })
  .build();
