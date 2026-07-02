import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailListOutputSchema = z.object({
  emailListUuid: z.string().describe('Unique identifier of the email list'),
  name: z.string().describe('Name of the email list'),
  defaultFromEmail: z.string().describe('Default sender email address'),
  defaultFromName: z.string().nullable().describe('Default sender name'),
  defaultReplyToEmail: z.string().nullable().describe('Default reply-to email'),
  defaultReplyToName: z.string().nullable().describe('Default reply-to name'),
  allowFormSubscriptions: z.boolean().describe('Whether form subscriptions are allowed'),
  requiresConfirmation: z.boolean().describe('Whether double opt-in confirmation is required'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageEmailList = SlateTool.create(spec, {
  name: 'Manage Email List',
  key: 'manage_email_list',
  description: `Create, update, or delete an email list. When creating, provide a name and default sender email. When updating, provide the list UUID and fields to change. When deleting, provide the list UUID and set action to "delete".`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      emailListUuid: z
        .string()
        .optional()
        .describe('UUID of the email list (required for update and delete)'),
      name: z.string().optional().describe('Name of the email list'),
      defaultFromEmail: z.string().optional().describe('Default sender email address'),
      defaultFromName: z.string().optional().describe('Default sender name'),
      defaultReplyToEmail: z.string().optional().describe('Default reply-to email address'),
      defaultReplyToName: z.string().optional().describe('Default reply-to name'),
      allowFormSubscriptions: z
        .boolean()
        .optional()
        .describe('Whether to allow form subscriptions'),
      requiresConfirmation: z
        .boolean()
        .optional()
        .describe('Whether double opt-in confirmation is required'),
      campaignsFeedEnabled: z
        .boolean()
        .optional()
        .describe('Whether campaigns RSS feed is enabled'),
      reportRecipients: z
        .string()
        .optional()
        .describe('Comma-separated email addresses for campaign reports'),
      reportCampaignSent: z.boolean().optional().describe('Send report when campaign is sent'),
      reportCampaignSummary: z.boolean().optional().describe('Send campaign summary report'),
      reportEmailListSummary: z.boolean().optional().describe('Send email list summary report')
    })
  )
  .output(
    z.object({
      emailList: emailListOutputSchema
        .nullable()
        .describe('The created or updated email list, null when deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.emailListUuid)
        throw new Error('emailListUuid is required for delete action');
      await client.deleteEmailList(ctx.input.emailListUuid);
      return {
        output: { emailList: null },
        message: `Email list **${ctx.input.emailListUuid}** has been deleted.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      if (!ctx.input.defaultFromEmail)
        throw new Error('defaultFromEmail is required for create action');

      let result = await client.createEmailList({
        name: ctx.input.name,
        default_from_email: ctx.input.defaultFromEmail,
        default_from_name: ctx.input.defaultFromName,
        default_reply_to_email: ctx.input.defaultReplyToEmail,
        default_reply_to_name: ctx.input.defaultReplyToName,
        allow_form_subscriptions: ctx.input.allowFormSubscriptions,
        requires_confirmation: ctx.input.requiresConfirmation,
        campaigns_feed_enabled: ctx.input.campaignsFeedEnabled,
        report_recipients: ctx.input.reportRecipients,
        report_campaign_sent: ctx.input.reportCampaignSent,
        report_campaign_summary: ctx.input.reportCampaignSummary,
        report_email_list_summary: ctx.input.reportEmailListSummary
      });

      return {
        output: { emailList: mapEmailList(result) },
        message: `Email list **${result.name}** has been created.`
      };
    }

    // update
    if (!ctx.input.emailListUuid)
      throw new Error('emailListUuid is required for update action');

    let existing = await client.getEmailList(ctx.input.emailListUuid);

    let result = await client.updateEmailList(ctx.input.emailListUuid, {
      name: ctx.input.name ?? existing.name,
      default_from_email: ctx.input.defaultFromEmail ?? existing.default_from_email,
      default_from_name: ctx.input.defaultFromName ?? existing.default_from_name,
      default_reply_to_email: ctx.input.defaultReplyToEmail ?? existing.default_reply_to_email,
      default_reply_to_name: ctx.input.defaultReplyToName ?? existing.default_reply_to_name,
      allow_form_subscriptions:
        ctx.input.allowFormSubscriptions ?? existing.allow_form_subscriptions,
      requires_confirmation: ctx.input.requiresConfirmation ?? existing.requires_confirmation,
      campaigns_feed_enabled:
        ctx.input.campaignsFeedEnabled ?? existing.campaigns_feed_enabled,
      report_recipients: ctx.input.reportRecipients ?? existing.report_recipients,
      report_campaign_sent: ctx.input.reportCampaignSent ?? existing.report_campaign_sent,
      report_campaign_summary:
        ctx.input.reportCampaignSummary ?? existing.report_campaign_summary,
      report_email_list_summary:
        ctx.input.reportEmailListSummary ?? existing.report_email_list_summary
    });

    return {
      output: { emailList: mapEmailList(result) },
      message: `Email list **${result.name}** has been updated.`
    };
  });

let mapEmailList = (list: any) => ({
  emailListUuid: list.uuid,
  name: list.name,
  defaultFromEmail: list.default_from_email,
  defaultFromName: list.default_from_name ?? null,
  defaultReplyToEmail: list.default_reply_to_email ?? null,
  defaultReplyToName: list.default_reply_to_name ?? null,
  allowFormSubscriptions: list.allow_form_subscriptions ?? false,
  requiresConfirmation: list.requires_confirmation ?? false,
  createdAt: list.created_at,
  updatedAt: list.updated_at
});
