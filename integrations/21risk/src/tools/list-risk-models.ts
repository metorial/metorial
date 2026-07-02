import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let riskModelSchema = z
  .object({
    riskModelId: z.string().optional().describe('Unique identifier of the risk model'),
    name: z.string().optional().describe('Name of the risk model'),
    description: z.string().optional().describe('Description of the risk model')
  })
  .passthrough();

export let listRiskModels = SlateTool.create(spec, {
  name: 'List Risk Models',
  key: 'list_risk_models',
  description: `Retrieve risk model definitions from 21RISK. Risk models define the structure of compliance checklists, with categories containing various question types (checkbox, select, number, slider, comment, currency, signature, location, etc.). Use $expand to include associated categories and questions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z.string().optional().describe('OData $filter expression'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      expand: z
        .string()
        .optional()
        .describe('Related entities to expand (e.g., "Categories")'),
      orderby: z.string().optional().describe('Sort order'),
      top: z.number().optional().describe('Maximum number of records to return')
    })
  )
  .output(
    z.object({
      riskModels: z.array(riskModelSchema).describe('List of risk models'),
      count: z.number().describe('Number of risk models returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let riskModels = await client.getRiskModels({
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      orderby: ctx.input.orderby,
      top: ctx.input.top
    });

    let results = Array.isArray(riskModels) ? riskModels : [riskModels];

    return {
      output: {
        riskModels: results,
        count: results.length
      },
      message: `Retrieved **${results.length}** risk model(s).`
    };
  })
  .build();
