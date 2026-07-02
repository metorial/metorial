import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let listPipelinesStages = SlateTool.create(spec, {
  name: 'List Pipelines & Stages',
  key: 'list_pipelines_stages',
  description: `List all available milestones (stages) in Nutshell CRM. Use this to discover pipeline stages that leads can be moved through, which is required when updating a lead's stage.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number (default: 1)')
    })
  )
  .output(
    z.object({
      milestones: z
        .array(
          z.object({
            milestoneId: z.number().describe('ID of the milestone/stage'),
            name: z.string().describe('Name of the milestone/stage'),
            entityType: z.string().optional().describe('Entity type')
          })
        )
        .describe('List of pipeline milestones/stages'),
      count: z.number().describe('Number of milestones returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let results = await client.findMilestones({
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let milestones = results.map((m: any) => ({
      milestoneId: m.id,
      name: m.name,
      entityType: m.entityType
    }));

    return {
      output: {
        milestones,
        count: milestones.length
      },
      message: `Found **${milestones.length}** milestone(s)/stage(s).`
    };
  })
  .build();
