import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProspectResponses = SlateTool.create(spec, {
  name: 'Get Prospect Responses',
  key: 'get_prospect_responses',
  description: `Retrieve email replies received from prospects. Optionally filter by campaign or prospect ID to narrow results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.number().optional().describe('Filter responses by campaign ID'),
      prospectId: z.number().optional().describe('Filter responses by prospect ID')
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
        .describe('List of prospect responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let params: Record<string, any> = {};
    if (ctx.input.campaignId) params.campaign_id = ctx.input.campaignId;
    if (ctx.input.prospectId) params.prospect_id = ctx.input.prospectId;

    let data = await client.getProspectResponses(params);
    let responses = Array.isArray(data) ? data : (data?.responses ?? []);

    let mapped = responses.map((r: any) => ({
      responseId: r.id,
      prospectId: r.prospect_id,
      email: r.email,
      subject: r.subject,
      message: r.message,
      date: r.date,
      campaignId: r.campaign_id
    }));

    return {
      output: { responses: mapped },
      message: `Retrieved **${mapped.length}** response(s).`
    };
  })
  .build();
