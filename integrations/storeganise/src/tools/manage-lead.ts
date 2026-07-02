import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLeadTool = SlateTool.create(spec, {
  name: 'Manage Lead',
  key: 'manage_lead',
  description: `Create, update, or retrieve leads and waitlist entries. Leads track prospective customers interested in storage services. Use **action** to specify the operation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'list']).describe('Action to perform'),
      leadId: z.string().optional().describe('Lead ID (required for get and update)'),
      email: z.string().optional().describe('Lead email address (for create)'),
      firstName: z.string().optional().describe('First name (for create/update)'),
      lastName: z.string().optional().describe('Last name (for create/update)'),
      phone: z.string().optional().describe('Phone number (for create/update)'),
      siteId: z.string().optional().describe('Interested site ID (for create/update)'),
      unitTypeId: z
        .string()
        .optional()
        .describe('Interested unit type ID (for create/update)'),
      notes: z
        .string()
        .optional()
        .describe('Additional notes about the lead (for create/update)'),
      search: z.string().optional().describe('Search query (for list)'),
      limit: z.number().optional().describe('Maximum number of leads to return (for list)'),
      offset: z.number().optional().describe('Number of leads to skip (for list)')
    })
  )
  .output(
    z.object({
      lead: z
        .record(z.string(), z.any())
        .optional()
        .describe('Lead details (for get, create, update)'),
      leads: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of leads (for list)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let leadData: Record<string, any> = {};
      if (ctx.input.email) leadData.email = ctx.input.email;
      if (ctx.input.firstName) leadData.firstName = ctx.input.firstName;
      if (ctx.input.lastName) leadData.lastName = ctx.input.lastName;
      if (ctx.input.phone) leadData.phone = ctx.input.phone;
      if (ctx.input.siteId) leadData.siteId = ctx.input.siteId;
      if (ctx.input.unitTypeId) leadData.unitTypeId = ctx.input.unitTypeId;
      if (ctx.input.notes) leadData.notes = ctx.input.notes;

      let lead = await client.createLead(leadData);
      return {
        output: { lead },
        message: `Created lead **${lead._id}** for ${ctx.input.email || 'unknown'}.`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, any> = {};
      if (ctx.input.firstName !== undefined) updateData.firstName = ctx.input.firstName;
      if (ctx.input.lastName !== undefined) updateData.lastName = ctx.input.lastName;
      if (ctx.input.phone !== undefined) updateData.phone = ctx.input.phone;
      if (ctx.input.siteId !== undefined) updateData.siteId = ctx.input.siteId;
      if (ctx.input.unitTypeId !== undefined) updateData.unitTypeId = ctx.input.unitTypeId;
      if (ctx.input.notes !== undefined) updateData.notes = ctx.input.notes;

      let lead = await client.updateLead(ctx.input.leadId!, updateData);
      return {
        output: { lead },
        message: `Updated lead **${ctx.input.leadId}**.`
      };
    }

    if (action === 'get') {
      let lead = await client.getLead(ctx.input.leadId!);
      return {
        output: { lead },
        message: `Retrieved lead **${ctx.input.leadId}**.`
      };
    }

    let leads = await client.listLeads({
      search: ctx.input.search,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    return {
      output: { leads },
      message: `Retrieved ${leads.length} lead(s).`
    };
  })
  .build();
