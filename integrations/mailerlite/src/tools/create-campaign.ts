import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Creates a new email campaign. Supports regular, A/B test, and resend campaign types. You can set the email subject, sender, HTML content, and target specific groups or segments.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Campaign name'),
      type: z.enum(['regular', 'ab', 'resend']).describe('Campaign type'),
      languageId: z
        .number()
        .optional()
        .describe('Campaign language ID for unsubscribe templates'),
      emails: z
        .array(
          z.object({
            subject: z.string().describe('Email subject line'),
            fromName: z.string().describe('Sender name'),
            from: z.string().describe('Sender email address'),
            replyTo: z.string().optional().describe('Verified reply-to email address'),
            content: z.string().optional().describe('Email HTML content')
          })
        )
        .describe('Email configurations (one for regular, multiple for A/B)'),
      groupIds: z.array(z.string()).optional().describe('Target group IDs'),
      segmentIds: z.array(z.string()).optional().describe('Target segment IDs'),
      ecommerceTracking: z
        .boolean()
        .optional()
        .describe('Enable e-commerce link tracking for campaign content')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('ID of the created campaign'),
      name: z.string().describe('Campaign name'),
      type: z.string().describe('Campaign type'),
      status: z.string().describe('Campaign status'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createCampaign({
      name: ctx.input.name,
      type: ctx.input.type,
      language_id: ctx.input.languageId,
      emails: ctx.input.emails.map(e => ({
        subject: e.subject,
        from_name: e.fromName,
        from: e.from,
        reply_to: e.replyTo,
        content: e.content
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
        createdAt: campaign.created_at
      },
      message: `Campaign **${campaign.name}** (${campaign.type}) created with status **${campaign.status}**.`
    };
  })
  .build();
