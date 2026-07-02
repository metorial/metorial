import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let listPipelines = SlateTool.create(spec, {
  name: 'List Pipelines',
  key: 'list_pipelines',
  description: `List all sales pipelines and their milestones from Capsule CRM. Useful for finding milestone IDs when creating or updating opportunities.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
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

    let pipelineResult = await client.listPipelines();
    let pipelines = await Promise.all(
      (pipelineResult.pipelines || []).map(async (p: any) => {
        let milestoneResult = await client.listMilestones(p.id);
        let milestones = (milestoneResult.milestones || []).map((m: any) => ({
          milestoneId: m.id,
          name: m.name,
          probability: m.probability
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
