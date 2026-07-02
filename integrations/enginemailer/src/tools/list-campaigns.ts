import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve a paginated list of campaigns. Returns undelivered campaigns with their details.`,
  constraints: ['Campaign API is only available to paid plan users.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of campaigns per page')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      statusCode: z.string().describe('Response status code'),
      campaigns: z.any().optional().describe('List of campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCampaigns(ctx.input.page, ctx.input.pageSize);

    let campaigns = result.Result?.Data;
    let count = Array.isArray(campaigns) ? campaigns.length : 0;

    return {
      output: {
        status: result.Result?.Status ?? 'Unknown',
        statusCode: result.Result?.StatusCode ?? 'Unknown',
        campaigns: result.Result?.Data
      },
      message: `Found **${count}** campaign(s).`
    };
  })
  .build();
