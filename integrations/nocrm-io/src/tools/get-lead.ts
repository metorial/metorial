import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let leadExtendedInfoSchema = z
  .object({
    firstContactEmail: z.string().optional(),
    allContactEmails: z.array(z.string()).optional(),
    permalink: z.string().optional(),
    fields: z.record(z.string(), z.any()).optional(),
    fieldsByName: z.record(z.string(), z.any()).optional()
  })
  .optional();

export let getLead = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Retrieve detailed information about a single lead including its description, status, pipeline step, assigned user, tags, amount, comments count, attachments, and extended info fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to retrieve')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the lead'),
      title: z.string().describe('Title of the lead'),
      description: z.string().optional().describe('Lead description text'),
      htmlDescription: z.string().optional().describe('HTML formatted description'),
      status: z.string().describe('Current status (todo, standby, won, lost, cancelled)'),
      step: z.string().optional().describe('Current pipeline step name'),
      stepId: z.number().optional().describe('Current pipeline step ID'),
      pipeline: z.string().optional().describe('Pipeline name'),
      amount: z.number().optional().describe('Deal amount'),
      probability: z.number().optional().describe('Win probability percentage'),
      currency: z.string().optional().describe('Currency code'),
      starred: z.boolean().optional().describe('Whether the lead is starred'),
      tags: z.array(z.string()).optional().describe('Tags on the lead'),
      userId: z.number().optional().describe('Assigned user ID'),
      teamId: z.number().optional().describe('Team ID'),
      clientFolderId: z.number().optional().describe('Associated client folder ID'),
      clientFolderName: z.string().optional().describe('Associated client folder name'),
      remindDate: z.string().optional().describe('Reminder date'),
      remindTime: z.string().optional().describe('Reminder time'),
      estimatedClosingDate: z.string().optional().describe('Estimated closing date'),
      closedAt: z.string().optional().describe('Date the lead was closed'),
      commentCount: z.number().optional().describe('Number of comments'),
      attachmentCount: z.number().optional().describe('Number of attachments'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      extendedInfo: leadExtendedInfoSchema.describe(
        'Extended information including email, fields, and user details'
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let lead = await client.getLead(ctx.input.leadId);

    return {
      output: {
        leadId: lead.id,
        title: lead.title,
        description: lead.description,
        htmlDescription: lead.html_description,
        status: lead.status,
        step: lead.step,
        stepId: lead.step_id,
        pipeline: lead.pipeline,
        amount: lead.amount,
        probability: lead.probability,
        currency: lead.currency,
        starred: lead.starred,
        tags: lead.tags,
        userId: lead.user_id,
        teamId: lead.team_id,
        clientFolderId: lead.client_folder_id,
        clientFolderName: lead.client_folder_name,
        remindDate: lead.remind_date,
        remindTime: lead.remind_time,
        estimatedClosingDate: lead.estimated_closing_date,
        closedAt: lead.closed_at,
        commentCount: lead.comment_count,
        attachmentCount: lead.attachment_count,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at,
        extendedInfo: lead.extended_info
          ? {
              firstContactEmail: lead.extended_info.first_contact_email,
              allContactEmails: lead.extended_info.all_contact_emails,
              permalink: lead.extended_info.permalink,
              fields: lead.extended_info.fields,
              fieldsByName: lead.extended_info.fields_by_name
            }
          : undefined
      },
      message: `Retrieved lead **"${lead.title}"** (ID: ${lead.id}) — status: ${lead.status}, step: ${lead.step || 'N/A'}.`
    };
  })
  .build();
