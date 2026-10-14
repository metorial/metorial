import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

type Milestone = {
  id: number;
  name: string;
  description?: string;
  projectId: number;
  deadline?: string;
  status?: string;
  completed?: boolean;
  responsiblePartyIds?: number[];
};

export let listMilestones = SlateTool.create(spec, {
  name: 'List Milestones',
  key: 'list_milestones',
  description:
    'Find Teamwork milestones across accessible projects or within one project. Returns milestone IDs for updates, completion, and reopening.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project ID. Call list_projects to discover projects.'),
      status: z
        .enum(['all', 'completed', 'incomplete', 'late', 'today', 'upcoming'])
        .optional()
        .describe('Filter milestones by status'),
      page: z.number().int().min(1).optional().describe('Page number, starting at 1'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Milestones per page, up to 500')
    })
  )
  .output(
    z.object({
      milestones: z.array(
        z.object({
          milestoneId: z.string(),
          title: z.string(),
          description: z.string().optional(),
          projectId: z.string(),
          deadline: z.string().optional(),
          status: z.string().optional(),
          completed: z.boolean().optional(),
          responsiblePartyIds: z.array(z.string()).optional()
        })
      ),
      hasMore: z.boolean().optional(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).listMilestones({
      projectId: ctx.input.projectId,
      find: ctx.input.status,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });
    let milestones = (result.milestones || []).map((milestone: Milestone) => ({
      milestoneId: String(milestone.id),
      title: milestone.name,
      description: milestone.description || undefined,
      projectId: String(milestone.projectId),
      deadline: milestone.deadline || undefined,
      status: milestone.status,
      completed: milestone.completed,
      responsiblePartyIds: milestone.responsiblePartyIds?.map(String)
    }));
    return {
      output: {
        milestones,
        hasMore: result.meta?.page?.hasMore,
        totalCount: result.meta?.page?.count
      },
      message: `Found **${milestones.length}** milestone(s).`
    };
  })
  .build();
