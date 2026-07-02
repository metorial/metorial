import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDeal = SlateTool.create(spec, {
  name: 'Get Deal',
  key: 'get_deal',
  description: `Retrieve a deal's full details from CentralStationCRM by its ID. Use **includes** to fetch associated people, companies, and tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dealId: z.number().describe('ID of the deal to retrieve'),
      includes: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of related data to include (e.g., "people,companies,tags")'
        )
    })
  )
  .output(
    z.object({
      dealId: z.number().describe('ID of the deal'),
      dealName: z.string().optional().describe('Name of the deal'),
      value: z.string().optional().describe('Monetary value'),
      valueType: z.string().optional().describe('Billing type'),
      targetDate: z.string().optional().describe('Target date'),
      currentState: z.string().optional().describe('Current state'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      rawData: z
        .any()
        .optional()
        .describe('Complete raw deal data from API including any requested includes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result = await client.getDeal(ctx.input.dealId, {
      includes: ctx.input.includes
    });

    let deal = result?.deal ?? result;

    return {
      output: {
        dealId: deal.id,
        dealName: deal.name,
        value: deal.value,
        valueType: deal.value_type,
        targetDate: deal.target_date,
        currentState: deal.current_state,
        createdAt: deal.created_at,
        updatedAt: deal.updated_at,
        rawData: result
      },
      message: `Retrieved deal **${deal.name}** (ID: ${deal.id}).`
    };
  })
  .build();
