import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProspectResponses = SlateTool.create(spec, {
  name: 'Get Prospect Responses',
  key: 'get_prospect_responses',
  description: `Retrieve all replies from a specified prospect, optionally filtered by campaign. When prospectId is omitted, browse the latest page of replies from the inbox.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.number().optional().describe('Filter responses by campaign ID'),
      prospectId: z
        .number()
        .optional()
        .describe('Prospect ID from search_prospects. Omit to browse the inbox'),
      perPage: z
        .number()
        .optional()
        .describe('Inbox replies per page when prospectId is omitted (maximum 50)'),
      nextPageCursor: z
        .string()
        .optional()
        .describe('Inbox cursor for the next page when prospectId is omitted')
    })
  )
  .output(
    z.object({
      responses: z
        .array(
          z.object({
            responseId: z.number().optional().describe('Response ID'),
            prospectId: z.number().optional().describe('Prospect ID'),
            email: z.string().optional().describe('Prospect email'),
            subject: z.string().optional().describe('Email subject'),
            message: z.string().optional().describe('Reply message content'),
            date: z.string().optional().describe('Reply date'),
            campaignId: z.number().optional().describe('Associated campaign ID')
          })
        )
        .describe('List of prospect responses'),
      nextPageCursor: z
        .string()
        .nullable()
        .optional()
        .describe('Next inbox page cursor when prospectId is omitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let data: any;
    if (ctx.input.prospectId !== undefined) {
      data = await client.getProspectResponses(ctx.input.prospectId, {
        campaign_id: ctx.input.campaignId
      });
    } else {
      data = await client.listInboxMessages({
        campaign_ids: ctx.input.campaignId?.toString(),
        per_page: ctx.input.perPage,
        next_page_cursor: ctx.input.nextPageCursor
      });
    }
    let responses = Array.isArray(data) ? data : (data?.responses ?? data?.content ?? []);

    let mapped = responses.map((r: any) => ({
      responseId: r.response_id ?? r.id,
      prospectId: r.prospect_id ?? data?.prospect_id,
      email: r.secondary_prospect_email ?? r.email ?? data?.email ?? r.from_email,
      subject: r.subject,
      message: r.message ?? (typeof r.body === 'string' ? r.body : r.body?.html),
      date: r.delivered ?? r.stamp ?? r.date,
      campaignId: r.campaign_id ?? r.campaign?.id
    }));

    return {
      output: { responses: mapped, nextPageCursor: data?.pagination?.next_page_cursor },
      message: `Retrieved **${mapped.length}** response(s).`
    };
  })
  .build();
