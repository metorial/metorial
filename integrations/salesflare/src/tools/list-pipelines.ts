import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  Client,
  id,
  object,
  optionalBoolean,
  optionalNumber,
  type Row,
  text
} from '../lib/client';
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
            isDefault: z.boolean().optional().describe('Whether this is the default pipeline'),
            recurring: z
              .boolean()
              .optional()
              .describe('Whether this pipeline uses recurring revenue'),
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
              .optional()
              .describe('Stages in this pipeline, when provided')
          })
        )
        .describe('List of pipelines with their stages'),
      count: z.number().describe('Number of pipelines returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let params: Row = {};
    if (ctx.input.search) params.search = ctx.input.search;

    let pipelines = await client.listPipelines(params);
    let list = pipelines;

    const mapped = list.map(p => {
      const currency = p.currency == null ? undefined : object(p.currency);
      const stages =
        p.stages === undefined
          ? undefined
          : (() => {
              if (!Array.isArray(p.stages))
                throw createApiServiceError('Salesflare returned invalid pipeline stages.');
              return p.stages.map(value => {
                const stage = object(value);
                return {
                  stageId: id(stage.id),
                  name: text(stage.name, 'stage name'),
                  probability: optionalNumber(stage.probability, 'stage probability'),
                  order: optionalNumber(stage.order, 'stage order'),
                  color: stage.color == null ? undefined : text(stage.color, 'stage color')
                };
              });
            })();
      return {
        pipelineId: p.id,
        name: text(p.name, 'pipeline name'),
        isDefault: optionalBoolean(p.default_pipeline, 'default pipeline flag'),
        recurring: optionalBoolean(p.recurring, 'recurring pipeline flag'),
        currency: currency
          ? {
              currencyId: currency.id == null ? undefined : id(currency.id),
              iso: currency.iso == null ? undefined : text(currency.iso, 'currency code')
            }
          : undefined,
        stages
      };
    });

    return {
      output: {
        pipelines: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** pipeline(s).`
    };
  })
  .build();
