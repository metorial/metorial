import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLead = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Retrieve a lead from the directory by its lead ID or by querying a specific property.
Returns lead data including contact information, categories, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.string().optional().describe('The lead ID to look up directly.'),
      property: z
        .string()
        .optional()
        .describe(
          'The column/field name to search by (e.g., "lead_email"). Used when leadId is not provided.'
        ),
      propertyValue: z
        .string()
        .optional()
        .describe('The value to match for the given property.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      lead: z.any().describe('The lead record(s) returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result: any;
    if (ctx.input.leadId) {
      result = await client.getLead(ctx.input.leadId);
    } else if (ctx.input.property && ctx.input.propertyValue) {
      result = await client.getLeadByProperty(ctx.input.property, ctx.input.propertyValue);
    } else {
      throw new Error('Either leadId or both property and propertyValue must be provided.');
    }

    return {
      output: {
        status: result.status,
        lead: result.message
      },
      message: `Retrieved lead data successfully.`
    };
  })
  .build();
