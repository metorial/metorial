import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDeal = SlateTool.create(spec, {
  name: 'Get Deal',
  key: 'get_deal',
  description: `Retrieves the full details of a deal by its ID, including associated contact, pipeline, stage, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dealId: z.string().describe('ID of the deal to retrieve')
    })
  )
  .output(
    z.object({
      dealId: z.string().describe('ID of the deal'),
      title: z.string().optional().describe('Title of the deal'),
      contactId: z.string().optional().describe('Primary contact ID'),
      value: z.string().optional().describe('Deal value'),
      currency: z.string().optional().describe('Currency code'),
      pipelineId: z.string().optional().describe('Pipeline ID'),
      stageId: z.string().optional().describe('Stage ID'),
      ownerId: z.string().optional().describe('Owner user ID'),
      description: z.string().optional().describe('Deal description'),
      status: z.string().optional().describe('Deal status (0=open, 1=won, 2=lost)'),
      percent: z.string().optional().describe('Win probability'),
      createdAt: z.string().optional().describe('Date the deal was created'),
      updatedAt: z.string().optional().describe('Date the deal was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let result = await client.getDeal(ctx.input.dealId);
    let deal = result.deal;

    return {
      output: {
        dealId: deal.id,
        title: deal.title || undefined,
        contactId: deal.contact || undefined,
        value: deal.value || undefined,
        currency: deal.currency || undefined,
        pipelineId: deal.group || undefined,
        stageId: deal.stage || undefined,
        ownerId: deal.owner || undefined,
        description: deal.description || undefined,
        status: deal.status !== undefined ? String(deal.status) : undefined,
        percent: deal.percent !== undefined ? String(deal.percent) : undefined,
        createdAt: deal.cdate || undefined,
        updatedAt: deal.mdate || undefined
      },
      message: `Retrieved deal **${deal.title || deal.id}** (ID: ${deal.id}).`
    };
  })
  .build();
