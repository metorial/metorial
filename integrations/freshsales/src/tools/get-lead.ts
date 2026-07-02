import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getLead = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Retrieve a single lead by ID from Freshsales. Optionally include related data like owner, tasks, appointments, and notes.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to retrieve'),
      include: z
        .array(
          z.enum([
            'owner',
            'creater',
            'updater',
            'source',
            'tasks',
            'appointments',
            'notes',
            'territory'
          ])
        )
        .optional()
        .describe('Related data to include in the response')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the lead'),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      displayName: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      emails: z.array(z.any()).nullable().optional(),
      mobileNumber: z.string().nullable().optional(),
      workNumber: z.string().nullable().optional(),
      jobTitle: z.string().nullable().optional(),
      company: z.any().nullable().optional(),
      address: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      zipcode: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      leadScore: z.number().nullable().optional(),
      ownerId: z.number().nullable().optional(),
      leadSourceId: z.number().nullable().optional(),
      contactStatusId: z.number().nullable().optional(),
      lifecycleStageId: z.number().nullable().optional(),
      territoryId: z.number().nullable().optional(),
      customFields: z.record(z.string(), z.any()).nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let includeStr = ctx.input.include?.join(',');
    let lead = await client.getLead(ctx.input.leadId, includeStr);

    return {
      output: {
        leadId: lead.id,
        firstName: lead.first_name,
        lastName: lead.last_name,
        displayName: lead.display_name,
        email: lead.email,
        emails: lead.emails,
        mobileNumber: lead.mobile_number,
        workNumber: lead.work_number,
        jobTitle: lead.job_title,
        company: lead.company,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        zipcode: lead.zipcode,
        country: lead.country,
        leadScore: lead.lead_score,
        ownerId: lead.owner_id,
        leadSourceId: lead.lead_source_id,
        contactStatusId: lead.contact_status_id,
        lifecycleStageId: lead.lifecycle_stage_id,
        territoryId: lead.territory_id,
        customFields: lead.custom_field,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at
      },
      message: `Retrieved lead **${lead.display_name || lead.id}**.`
    };
  })
  .build();
