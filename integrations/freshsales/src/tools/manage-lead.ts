import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageLead = SlateTool.create(spec, {
  name: 'Manage Lead',
  key: 'manage_lead',
  description: `Create, update, or upsert a lead in Freshsales.
Use this to add new leads, update existing leads by ID, or upsert by a unique identifier like email.
Supports custom fields via the **customFields** parameter.`,
  instructions: [
    'To create a new lead, omit leadId and uniqueIdentifier.',
    'To update an existing lead, provide the leadId.',
    'To upsert (create or update based on a unique field), provide uniqueIdentifier with a field like emails.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z
        .number()
        .optional()
        .describe('ID of the lead to update. Omit to create a new lead.'),
      uniqueIdentifier: z
        .record(z.string(), z.any())
        .optional()
        .describe('Unique identifier for upsert, e.g. { "emails": "john@example.com" }'),
      firstName: z.string().optional().describe('First name of the lead'),
      lastName: z.string().optional().describe('Last name of the lead'),
      email: z.string().optional().describe('Primary email address'),
      mobileNumber: z.string().optional().describe('Mobile phone number'),
      workNumber: z.string().optional().describe('Work phone number'),
      jobTitle: z.string().optional().describe('Job title'),
      companyName: z.string().optional().describe('Company name'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      zipcode: z.string().optional().describe('Postal/zip code'),
      country: z.string().optional().describe('Country'),
      ownerId: z.number().optional().describe('ID of the user to assign as owner'),
      leadSourceId: z.number().optional().describe('Lead source ID'),
      contactStatusId: z.number().optional().describe('Contact status ID'),
      lifecycleStageId: z.number().optional().describe('Lifecycle stage ID'),
      territoryId: z.number().optional().describe('Territory ID'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields as key-value pairs, e.g. { "cf_priority": "High" }')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the lead'),
      firstName: z.string().nullable().optional().describe('First name'),
      lastName: z.string().nullable().optional().describe('Last name'),
      displayName: z.string().nullable().optional().describe('Full display name'),
      email: z.string().nullable().optional().describe('Primary email'),
      jobTitle: z.string().nullable().optional().describe('Job title'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let leadData: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) leadData.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) leadData.last_name = ctx.input.lastName;
    if (ctx.input.email !== undefined) leadData.email = ctx.input.email;
    if (ctx.input.mobileNumber !== undefined) leadData.mobile_number = ctx.input.mobileNumber;
    if (ctx.input.workNumber !== undefined) leadData.work_number = ctx.input.workNumber;
    if (ctx.input.jobTitle !== undefined) leadData.job_title = ctx.input.jobTitle;
    if (ctx.input.companyName !== undefined)
      leadData.company = { name: ctx.input.companyName };
    if (ctx.input.address !== undefined) leadData.address = ctx.input.address;
    if (ctx.input.city !== undefined) leadData.city = ctx.input.city;
    if (ctx.input.state !== undefined) leadData.state = ctx.input.state;
    if (ctx.input.zipcode !== undefined) leadData.zipcode = ctx.input.zipcode;
    if (ctx.input.country !== undefined) leadData.country = ctx.input.country;
    if (ctx.input.ownerId !== undefined) leadData.owner_id = ctx.input.ownerId;
    if (ctx.input.leadSourceId !== undefined) leadData.lead_source_id = ctx.input.leadSourceId;
    if (ctx.input.contactStatusId !== undefined)
      leadData.contact_status_id = ctx.input.contactStatusId;
    if (ctx.input.lifecycleStageId !== undefined)
      leadData.lifecycle_stage_id = ctx.input.lifecycleStageId;
    if (ctx.input.territoryId !== undefined) leadData.territory_id = ctx.input.territoryId;
    if (ctx.input.customFields) leadData.custom_field = ctx.input.customFields;

    let lead: Record<string, any>;
    let action: string;

    if (ctx.input.leadId) {
      lead = await client.updateLead(ctx.input.leadId, leadData);
      action = 'updated';
    } else if (ctx.input.uniqueIdentifier) {
      lead = await client.upsertLead(ctx.input.uniqueIdentifier, leadData);
      action = 'upserted';
    } else {
      lead = await client.createLead(leadData);
      action = 'created';
    }

    return {
      output: {
        leadId: lead.id,
        firstName: lead.first_name,
        lastName: lead.last_name,
        displayName: lead.display_name,
        email: lead.email,
        jobTitle: lead.job_title,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at
      },
      message: `Lead **${lead.display_name || lead.first_name || lead.id}** ${action} successfully.`
    };
  })
  .build();
