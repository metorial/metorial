import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPipelines = SlateTool.create(spec, {
  name: 'List Pipelines',
  key: 'list_pipelines',
  description: `List all sales pipelines and their stages in Salesflare. Each pipeline contains stages with names, colors, probabilities, and ordering. Useful for finding stage IDs when creating or updating opportunities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search pipelines by name')
    })
  )
  .output(
    z.object({
      pipelines: z
        .array(
          z.object({
            pipelineId: z.number().describe('Pipeline ID'),
            name: z.string().describe('Pipeline name'),
            isDefault: z.boolean().describe('Whether this is the default pipeline'),
            recurring: z.boolean().describe('Whether this pipeline uses recurring revenue'),
            currency: z
              .object({
                currencyId: z.number().optional(),
                iso: z.string().optional()
              })
              .optional()
              .describe('Pipeline currency'),
            stages: z
              .array(
                z.object({
                  stageId: z.number().describe('Stage ID'),
                  name: z.string().describe('Stage name'),
                  probability: z
                    .number()
                    .optional()
                    .describe('Default probability for this stage'),
                  order: z.number().optional().describe('Stage order in pipeline'),
                  color: z.string().optional().describe('Stage color')
                })
              )
              .describe('Stages in this pipeline')
          })
        )
        .describe('List of pipelines with their stages'),
      count: z.number().describe('Number of pipelines returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let params: Record<string, any> = {};
    if (ctx.input.search) params.search = ctx.input.search;

    let pipelines = await client.listPipelines(params);
    let list = Array.isArray(pipelines) ? pipelines : [];

    let mapped = list.map((p: any) => ({
      pipelineId: p.id,
      name: p.name,
      isDefault: !!p.default_pipeline,
      recurring: !!p.recurring,
      currency: p.currency
        ? {
            currencyId: p.currency.id,
            iso: p.currency.iso
          }
        : undefined,
      stages: (p.stages || []).map((s: any) => ({
        stageId: s.id,
        name: s.name,
        probability: s.probability,
        order: s.order,
        color: s.color
      }))
    }));

    return {
      output: {
        pipelines: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** pipeline(s).`
    };
  })
  .build();
