import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let listPipelines = SlateTool.create(spec, {
  name: 'List Pipelines',
  key: 'list_pipelines',
  description: `List sales pipelines and all their milestones from Capsule CRM. Useful for finding milestone IDs when creating or updating opportunities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().int().positive().optional().describe('Page number (default: 1)'),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Pipelines per page (default: 50)'),
      includeDeleted: z.boolean().optional().describe('Include archived pipelines')
    })
  )
  .output(
    z.object({
      pipelines: z
        .array(
          z.object({
            pipelineId: z.number().describe('Pipeline ID'),
            name: z.string().describe('Pipeline name'),
            milestones: z
              .array(
                z.object({
                  milestoneId: z.number().describe('Milestone ID'),
                  name: z.string().describe('Milestone name'),
                  complete: z
                    .boolean()
                    .optional()
                    .describe('Whether this milestone closes the opportunity'),
                  probability: z.number().optional().describe('Default probability percentage')
                })
              )
              .optional()
              .describe('Pipeline milestones/stages')
          })
        )
        .describe('List of pipelines with their milestones')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let pipelineResult = await client.listPipelines(ctx.input);
    let pipelines = await Promise.all(
      (pipelineResult.pipelines || []).map(async (p: any) => {
        let milestoneResult = await client.listMilestones(p.id);
        let milestones = (milestoneResult.milestones || []).map((m: any) => ({
          milestoneId: m.id,
          name: m.name,
          probability: m.probability ?? undefined,
          complete: m.complete ?? undefined
        }));

        return {
          pipelineId: p.id,
          name: p.name,
          milestones
        };
      })
    );

    return {
      output: { pipelines },
      message: `Found **${pipelines.length}** pipelines.`
    };
  })
  .build();
