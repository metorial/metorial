import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let manageJobPlan = SlateTool.create(spec, {
  name: 'Manage Job Plan',
  key: 'manage_job_plan',
  description: `Add or update phases, items (line items), milestones, and team assignments within a job's plan. Supports creating phases, creating items within phases, assigning users and roles to items, creating sub-items, and managing milestones.`,
  instructions: [
    'Use "action" to specify what operation to perform.',
    'For creating items, you must provide the jobId.',
    'For updating items, provide the specific resource ID (phaseId, itemId, milestoneId).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create_phase',
          'update_phase',
          'create_item',
          'update_item',
          'create_milestone',
          'update_milestone',
          'delete_milestone',
          'assign_user_to_item',
          'assign_role_to_item',
          'create_sub_item'
        ])
        .describe('The operation to perform'),
      jobId: z.number().optional().describe('Job ID (required for create operations)'),
      phaseId: z.number().optional().describe('Phase ID (for update_phase)'),
      itemId: z
        .number()
        .optional()
        .describe(
          'Job item ID (for update_item, assign_user_to_item, assign_role_to_item, create_sub_item)'
        ),
      milestoneId: z
        .number()
        .optional()
        .describe('Milestone ID (for update_milestone, delete_milestone)'),
      name: z.string().optional().describe('Name for the phase, item, milestone, or sub-item'),
      description: z.string().optional().describe('Description text'),
      userId: z.number().optional().describe('User ID (for assign_user_to_item)'),
      roleId: z.number().optional().describe('Role ID (for assign_role_to_item)'),
      estimatedMinutes: z.number().optional().describe('Estimated minutes for the item'),
      date: z.string().optional().describe('Date (YYYY-MM-DD) for milestones'),
      additionalFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Any additional fields to include in the request body')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      raw: z.record(z.string(), z.any()).optional().describe('The created/updated resource')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });
    let input = ctx.input;
    let result: any;

    let buildBody = () => {
      let body: Record<string, any> = { ...input.additionalFields };
      if (input.name !== undefined) body.name = input.name;
      if (input.description !== undefined) body.description = input.description;
      if (input.estimatedMinutes !== undefined) body.estimatedMinutes = input.estimatedMinutes;
      if (input.date !== undefined) body.date = input.date;
      return body;
    };

    switch (input.action) {
      case 'create_phase': {
        if (!input.jobId) throw new Error('jobId is required for create_phase');
        result = await client.createJobPhase(input.jobId, buildBody());
        break;
      }
      case 'update_phase': {
        if (!input.phaseId) throw new Error('phaseId is required for update_phase');
        result = await client.updateJobPhase(input.phaseId, buildBody());
        break;
      }
      case 'create_item': {
        if (!input.jobId) throw new Error('jobId is required for create_item');
        result = await client.createJobItem(input.jobId, buildBody());
        break;
      }
      case 'update_item': {
        if (!input.itemId) throw new Error('itemId is required for update_item');
        result = await client.updateJobItem(input.itemId, buildBody());
        break;
      }
      case 'create_milestone': {
        if (!input.jobId) throw new Error('jobId is required for create_milestone');
        result = await client.createJobMilestone(input.jobId, buildBody());
        break;
      }
      case 'update_milestone': {
        if (!input.milestoneId)
          throw new Error('milestoneId is required for update_milestone');
        result = await client.updateJobMilestone(input.milestoneId, buildBody());
        break;
      }
      case 'delete_milestone': {
        if (!input.milestoneId)
          throw new Error('milestoneId is required for delete_milestone');
        await client.deleteJobMilestone(input.milestoneId);
        return {
          output: { success: true },
          message: `Deleted milestone (ID: ${input.milestoneId}).`
        };
      }
      case 'assign_user_to_item': {
        if (!input.itemId) throw new Error('itemId is required for assign_user_to_item');
        if (!input.userId) throw new Error('userId is required for assign_user_to_item');
        result = await client.assignJobItemUser(input.itemId, {
          userId: input.userId,
          ...input.additionalFields
        });
        break;
      }
      case 'assign_role_to_item': {
        if (!input.itemId) throw new Error('itemId is required for assign_role_to_item');
        if (!input.roleId) throw new Error('roleId is required for assign_role_to_item');
        result = await client.assignJobItemRole(input.itemId, {
          roleId: input.roleId,
          ...input.additionalFields
        });
        break;
      }
      case 'create_sub_item': {
        if (!input.itemId) throw new Error('itemId is required for create_sub_item');
        result = await client.createJobItemSubItem(input.itemId, buildBody());
        break;
      }
    }

    return {
      output: {
        success: true,
        raw: result
      },
      message: `Successfully performed **${input.action}**${result?.id ? ` (ID: ${result.id})` : ''}.`
    };
  })
  .build();
