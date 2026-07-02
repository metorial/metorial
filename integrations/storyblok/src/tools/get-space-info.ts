import { SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

export let getSpaceInfo = SlateTool.create(spec, {
  name: 'Get Space Info',
  key: 'get_space_info',
  description: `Retrieve information about the current space, including its name, plan, environments, workflows, roles, and tags. Useful for understanding the space configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      spaceId: z.number().optional().describe('Numeric ID of the space'),
      name: z.string().optional().describe('Name of the space'),
      domain: z.string().optional().describe('Domain of the space'),
      plan: z.string().optional().describe('Current plan name'),
      createdAt: z.string().optional().describe('Space creation timestamp'),
      workflows: z
        .array(
          z.object({
            workflowId: z.number().optional(),
            name: z.string().optional()
          })
        )
        .optional()
        .describe('Available workflows'),
      workflowStages: z
        .array(
          z.object({
            stageId: z.number().optional(),
            name: z.string().optional(),
            color: z.string().optional(),
            workflowId: z.number().optional()
          })
        )
        .optional()
        .describe('Workflow stages'),
      roles: z
        .array(
          z.object({
            roleId: z.number().optional(),
            name: z.string().optional()
          })
        )
        .optional()
        .describe('Space roles'),
      tags: z
        .array(
          z.object({
            name: z.string().optional(),
            count: z.number().optional()
          })
        )
        .optional()
        .describe('Content tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StoryblokClient({
      token: ctx.auth.token,
      region: ctx.auth.region,
      spaceId: ctx.config.spaceId
    });

    let [space, workflows, workflowStages, roles, tags] = await Promise.all([
      client.getSpace(),
      client.listWorkflows().catch(() => []),
      client.listWorkflowStages().catch(() => []),
      client.listSpaceRoles().catch(() => []),
      client.listTags().catch(() => [])
    ]);

    return {
      output: {
        spaceId: space.id,
        name: space.name,
        domain: space.domain,
        plan: space.plan,
        createdAt: space.created_at,
        workflows: workflows.map(w => ({ workflowId: w.id, name: w.name })),
        workflowStages: workflowStages.map(s => ({
          stageId: s.id,
          name: s.name,
          color: s.color,
          workflowId: s.workflow_id
        })),
        roles: roles.map(r => ({ roleId: r.id, name: r.role })),
        tags: tags.map(t => ({ name: t.name, count: t.taggings_count }))
      },
      message: `Space **${space.name}** on the **${space.plan}** plan.`
    };
  })
  .build();
