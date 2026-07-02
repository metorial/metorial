import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let listLeads = SlateTool.create(spec, {
  name: 'List Leads',
  key: 'list_leads',
  description: `Retrieve all leads captured from a specific chatflow's interactions. Returns contact details and associated chat information.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      chatflowId: z.string().describe('ID of the chatflow to get leads for')
    })
  )
  .output(
    z.object({
      leads: z
        .array(
          z.object({
            leadId: z.string().describe('Unique lead ID'),
            chatflowId: z.string().optional().describe('Associated chatflow ID'),
            chatId: z.string().optional().describe('Chat conversation ID'),
            name: z.string().optional().nullable().describe('Lead contact name'),
            email: z.string().optional().nullable().describe('Lead email address'),
            phone: z.string().optional().nullable().describe('Lead phone number'),
            createdDate: z.string().optional().describe('ISO 8601 creation date')
          })
        )
        .describe('List of leads')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.listLeads(ctx.input.chatflowId);
    let leads = Array.isArray(result) ? result : [];

    return {
      output: {
        leads: leads.map((l: any) => ({
          leadId: l.id,
          chatflowId: l.chatflowid,
          chatId: l.chatId,
          name: l.name,
          email: l.email,
          phone: l.phone,
          createdDate: l.createdDate
        }))
      },
      message: `Retrieved **${leads.length}** lead(s) for chatflow \`${ctx.input.chatflowId}\`.`
    };
  })
  .build();
