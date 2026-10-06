import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapLead } from '../lib/models';
import { spec } from '../spec';

export let getLeadTool = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Retrieves a single lead from Close CRM by ID with full details including contacts, opportunities, and addresses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.string().describe('The unique ID of the lead to retrieve')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('Unique lead ID'),
      name: z.string().optional().describe('Lead/company name'),
      statusId: z.string().nullable().describe('Lead status ID'),
      statusLabel: z.string().nullable().describe('Lead status label'),
      url: z.string().nullable().describe('Company website URL'),
      description: z.string().nullable().describe('Lead description or notes'),
      dateCreated: z.string().describe('Creation timestamp'),
      dateUpdated: z.string().describe('Last updated timestamp'),
      contacts: z
        .array(
          z.object({
            contactId: z.string().describe('Contact ID'),
            name: z.string().nullable().describe('Contact full name'),
            title: z.string().nullable().describe('Contact job title'),
            emails: z
              .array(
                z.object({
                  email: z.string(),
                  type: z.string()
                })
              )
              .optional()
              .describe('Contact email addresses, when provided'),
            phones: z
              .array(
                z.object({
                  phone: z.string(),
                  type: z.string()
                })
              )
              .optional()
              .describe('Contact phone numbers, when provided')
          })
        )
        .describe('Contacts associated with the lead'),
      opportunities: z
        .array(
          z.object({
            opportunityId: z.string().describe('Opportunity ID'),
            statusLabel: z.string().nullable().describe('Opportunity status label'),
            value: z.number().nullable().describe('Opportunity monetary value in cents'),
            confidence: z.number().nullable().describe('Confidence percentage (0-100)')
          })
        )
        .describe('Opportunities associated with the lead'),
      displayName: z.string().optional().describe('Lead display name, when provided'),
      addresses: z
        .array(
          z.object({
            address1: z.string().nullable(),
            address2: z.string().nullable(),
            city: z.string().nullable(),
            state: z.string().nullable(),
            zipcode: z.string().nullable(),
            country: z.string().nullable()
          })
        )
        .optional()
        .describe('Physical addresses for the lead, when provided')
    })
  )
  .handleInvocation(async ctx => {
    const lead = await new Client(ctx.auth).getLead(ctx.input.leadId);
    return {
      output: {
        ...mapLead(lead),
        description: lead.description ?? null,
        opportunities: lead.opportunities.map(o => ({
          opportunityId: o.id,
          statusLabel: o.status_label ?? null,
          value: o.value ?? null,
          confidence: o.confidence
        })),
        addresses: lead.addresses?.map(a => ({
          address1: a.address_1 ?? null,
          address2: a.address_2 ?? null,
          city: a.city ?? null,
          state: a.state ?? null,
          zipcode: a.zipcode ?? null,
          country: a.country ?? null
        }))
      },
      message: `Retrieved lead **${lead.id}**.`
    };
  })
  .build();
