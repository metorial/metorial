import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      name: z.string().describe('Lead/company name'),
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
              .describe('Contact email addresses'),
            phones: z
              .array(
                z.object({
                  phone: z.string(),
                  type: z.string()
                })
              )
              .describe('Contact phone numbers')
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
      displayName: z.string().describe('Lead display name'),
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
        .describe('Physical addresses for the lead')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let lead = await client.getLead(ctx.input.leadId);

    let output = {
      leadId: lead.id,
      name: lead.name || lead.display_name || '',
      statusId: lead.status_id || null,
      statusLabel: lead.status_label || null,
      url: lead.url || null,
      description: lead.description || null,
      dateCreated: lead.date_created || '',
      dateUpdated: lead.date_updated || '',
      contacts: (lead.contacts || []).map((c: any) => ({
        contactId: c.id,
        name: c.name || null,
        title: c.title || null,
        emails: (c.emails || []).map((e: any) => ({
          email: e.email || '',
          type: e.type || 'office'
        })),
        phones: (c.phones || []).map((p: any) => ({
          phone: p.phone || '',
          type: p.type || 'office'
        }))
      })),
      opportunities: (lead.opportunities || []).map((o: any) => ({
        opportunityId: o.id,
        statusLabel: o.status_label || null,
        value: o.value ?? null,
        confidence: o.confidence ?? null
      })),
      displayName: lead.display_name || lead.name || '',
      addresses: (lead.addresses || []).map((a: any) => ({
        address1: a.address_1 || null,
        address2: a.address_2 || null,
        city: a.city || null,
        state: a.state || null,
        zipcode: a.zipcode || null,
        country: a.country || null
      }))
    };

    let contactCount = output.contacts.length;
    let oppCount = output.opportunities.length;

    return {
      output,
      message: `Retrieved lead **${output.displayName}** (${output.statusLabel || 'No status'}) with ${contactCount} contact${contactCount !== 1 ? 's' : ''} and ${oppCount} opportunit${oppCount !== 1 ? 'ies' : 'y'}`
    };
  })
  .build();
