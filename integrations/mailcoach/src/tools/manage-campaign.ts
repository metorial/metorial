import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let campaignOutputSchema = z.object({
  campaignUuid: z.string().describe('Unique identifier of the campaign'),
  name: z.string().describe('Campaign name'),
  status: z.string().describe('Campaign status'),
  emailListUuid: z.string().nullable().describe('UUID of the associated email list'),
  subject: z.string().nullable().describe('Email subject line'),
  fromEmail: z.string().nullable().describe('Sender email address'),
  fromName: z.string().nullable().describe('Sender name'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageCampaign = SlateTool.create(spec, {
  name: 'Manage Campaign',
  key: 'manage_campaign',
  description: `Create, update, or delete a campaign. For creation, provide the campaign name, email list UUID, and optionally subject, HTML content, template, and scheduling details. For update, provide the campaign UUID and fields to modify. For delete, provide the campaign UUID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      campaignUuid: z
        .string()
        .optional()
        .describe('UUID of the campaign (required for update and delete)'),
      name: z.string().optional().describe('Campaign name'),
      emailListUuid: z
        .string()
        .optional()
        .describe('UUID of the email list (required for create)'),
      subject: z.string().optional().describe('Email subject line'),
      html: z.string().optional().describe('Raw HTML content for the email body'),
      templateUuid: z.string().optional().describe('UUID of a template to use'),
      fields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Template field values as key-value pairs'),
      fromEmail: z.string().optional().describe('Sender email address'),
      fromName: z.string().optional().describe('Sender name'),
      replyToEmail: z.string().optional().describe('Reply-to email address'),
      replyToName: z.string().optional().describe('Reply-to name'),
      segmentUuid: z.string().optional().describe('UUID of a segment to target'),
      utmTags: z.boolean().optional().describe('Whether to add UTM tags to links'),
      scheduleAt: z.string().optional().describe('ISO 8601 datetime to schedule the campaign')
    })
  )
  .output(
    z.object({
      campaign: campaignOutputSchema
        .nullable()
        .describe('The campaign data, null when deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.campaignUuid) throw new Error('campaignUuid is required for delete');
      await client.deleteCampaign(ctx.input.campaignUuid);
      return {
        output: { campaign: null },
        message: `Campaign **${ctx.input.campaignUuid}** has been deleted.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create');
      if (!ctx.input.emailListUuid) throw new Error('emailListUuid is required for create');

      let result = await client.createCampaign({
        name: ctx.input.name,
        email_list_uuid: ctx.input.emailListUuid,
        subject: ctx.input.subject,
        html: ctx.input.html,
        template_uuid: ctx.input.templateUuid,
        fields: ctx.input.fields,
        from_email: ctx.input.fromEmail,
        from_name: ctx.input.fromName,
        reply_to_email: ctx.input.replyToEmail,
        reply_to_name: ctx.input.replyToName,
        segment_uuid: ctx.input.segmentUuid,
        utm_tags: ctx.input.utmTags,
        schedule_at: ctx.input.scheduleAt
      });

      return {
        output: { campaign: mapCampaign(result) },
        message: `Campaign **${result.name}** has been created.`
      };
    }

    // update
    if (!ctx.input.campaignUuid) throw new Error('campaignUuid is required for update');

    let result = await client.updateCampaign(ctx.input.campaignUuid, {
      name: ctx.input.name,
      email_list_uuid: ctx.input.emailListUuid,
      subject: ctx.input.subject,
      html: ctx.input.html,
      template_uuid: ctx.input.templateUuid,
      fields: ctx.input.fields,
      from_email: ctx.input.fromEmail,
      from_name: ctx.input.fromName,
      reply_to_email: ctx.input.replyToEmail,
      reply_to_name: ctx.input.replyToName,
      segment_uuid: ctx.input.segmentUuid,
      utm_tags: ctx.input.utmTags,
      schedule_at: ctx.input.scheduleAt
    });

    return {
      output: { campaign: mapCampaign(result) },
      message: `Campaign **${result.name}** has been updated.`
    };
  });

let mapCampaign = (c: any) => ({
  campaignUuid: c.uuid,
  name: c.name,
  status: c.status ?? 'draft',
  emailListUuid: c.email_list_uuid ?? null,
  subject: c.subject ?? null,
  fromEmail: c.from_email ?? null,
  fromName: c.from_name ?? null,
  createdAt: c.created_at,
  updatedAt: c.updated_at
});
