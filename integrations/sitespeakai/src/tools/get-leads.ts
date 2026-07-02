import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let leadSchema = z.object({
  leadId: z.string().describe('Lead identifier.'),
  chatbotId: z.string().describe('Associated chatbot ID.'),
  visitorId: z.string().nullable().describe('Visitor identifier.'),
  name: z.string().nullable().describe('Visitor name.'),
  email: z.string().nullable().describe('Visitor email address.'),
  phone: z.string().nullable().describe('Visitor phone number.'),
  status: z.string().nullable().describe('Lead status (e.g. "read").'),
  lastEntryAt: z.string().nullable().describe('Timestamp of last conversation entry.'),
  createdAt: z.string().nullable().describe('Lead creation timestamp.'),
  updatedAt: z.string().nullable().describe('Lead last update timestamp.')
});

export let getLeads = SlateTool.create(spec, {
  name: 'Get Leads',
  key: 'get_leads',
  description: `Retrieve all leads captured by a chatbot during conversations. Leads include visitor contact information such as name, email, phone, and status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      chatbotId: z.string().describe('The ID of the chatbot to retrieve leads for.')
    })
  )
  .output(
    z.object({
      leads: z.array(leadSchema).describe('List of captured leads.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getLeads(ctx.input.chatbotId);

    let leads = Array.isArray(data) ? data : [];

    let mapped = leads.map((lead: any) => ({
      leadId: lead.id?.toString() ?? '',
      chatbotId: lead.chatbot_id?.toString() ?? '',
      visitorId: lead.visitor_id?.toString() ?? null,
      name: lead.name ?? null,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      status: lead.status ?? null,
      lastEntryAt: lead.last_entry_at ?? null,
      createdAt: lead.created_at ?? null,
      updatedAt: lead.updated_at ?? null
    }));

    return {
      output: {
        leads: mapped
      },
      message: `Retrieved ${mapped.length} lead(s).`
    };
  })
  .build();
