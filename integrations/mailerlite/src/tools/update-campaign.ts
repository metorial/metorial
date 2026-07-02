import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mailerLiteServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateCampaign = SlateTool.create(spec, {
  name: 'Update Campaign',
  key: 'update_campaign',
  description: `Updates a draft MailerLite campaign. MailerLite only allows campaign updates while the campaign is in draft status. Use this to change the campaign name, sender details, content, language, or target groups/segments before scheduling or sending.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the draft campaign to update'),
      name: z.string().optional().describe('Updated campaign name'),
      languageId: z
        .number()
        .optional()
        .describe('Campaign language ID for unsubscribe templates'),
      emails: z
        .array(
          z.object({
            subject: z.string().optional().describe('Email subject line'),
            fromName: z.string().optional().describe('Sender name'),
            from: z.string().optional().describe('Verified sender email address'),
            replyTo: z.string().optional().describe('Verified reply-to email address'),
            content: z.string().optional().describe('Email HTML content')
          })
        )
        .optional()
        .describe('Updated email configuration. Regular campaigns must contain one item.'),
      groupIds: z.array(z.string()).optional().describe('Updated target group IDs'),
      segmentIds: z
        .array(z.string())
        .optional()
        .describe(
          'Updated target segment IDs. If provided with groups, MailerLite uses segments.'
        ),
      ecommerceTracking: z
        .boolean()
        .optional()
        .describe('Enable or disable e-commerce link tracking for campaign content')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('ID of the updated campaign'),
      name: z.string().describe('Campaign name'),
      type: z.string().describe('Campaign type'),
      status: z.string().describe('Campaign status'),
      updatedAt: z.string().optional().describe('Update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (
      !ctx.input.name &&
      ctx.input.languageId === undefined &&
      !ctx.input.emails?.length &&
      !ctx.input.groupIds?.length &&
      !ctx.input.segmentIds?.length &&
      ctx.input.ecommerceTracking === undefined
    ) {
      throw mailerLiteServiceError('Provide at least one campaign field to update.');
    }

    let result = await client.updateCampaign(ctx.input.campaignId, {
      name: ctx.input.name,
      language_id: ctx.input.languageId,
      emails: ctx.input.emails?.map(email => ({
        subject: email.subject,
        from_name: email.fromName,
        from: email.from,
        reply_to: email.replyTo,
        content: email.content
      })),
      groups: ctx.input.groupIds,
      segments: ctx.input.segmentIds,
      settings:
        ctx.input.ecommerceTracking === undefined
          ? undefined
          : { ecommerce_tracking: ctx.input.ecommerceTracking }
    });

    let campaign = result.data;

    return {
      output: {
        campaignId: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        updatedAt: campaign.updated_at
      },
      message: `Campaign **${campaign.name}** updated with status **${campaign.status}**.`
    };
  })
  .build();
