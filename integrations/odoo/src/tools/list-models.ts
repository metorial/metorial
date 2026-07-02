import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let modelInfoSchema = z.object({
  modelId: z.number().describe('Internal ID of the model record'),
  model: z.string().describe('Technical model name (e.g., "res.partner")'),
  name: z.string().describe('Human-readable model name (e.g., "Contact")'),
  transient: z.boolean().describe('Whether the model is transient (temporary wizard)')
});

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List all available Odoo models (data tables) installed on the instance. Use this to discover which modules are installed and what models are available for CRUD operations. Optionally filter by name or technical name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Optional search text to filter models by name or technical name'),
      limit: z
        .number()
        .optional()
        .default(100)
        .describe('Maximum number of models to return (default: 100)'),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe('Number of records to skip for pagination (default: 0)')
    })
  )
  .output(
    z.object({
      models: z.array(modelInfoSchema).describe('Array of available model definitions'),
      count: z.number().describe('Total count of matching models')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let domain: Array<string | [string, string, unknown]> = [];
    if (ctx.input.search) {
      domain = [
        '|',
        ['model', 'ilike', ctx.input.search],
        ['name', 'ilike', ctx.input.search]
      ];
    }

    let [records, count] = await Promise.all([
      client.searchRead('ir.model', domain, {
        fields: ['model', 'name', 'transient'],
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        order: 'model asc'
      }),
      client.searchCount('ir.model', domain)
    ]);

    let models = records.map(r => ({
      modelId: r.id as number,
      model: r.model as string,
      name: r.name as string,
      transient: r.transient as boolean
    }));

    return {
      output: { models, count },
      message: `Found **${count}** model(s). Returned ${models.length}.`
    };
  })
  .build();
