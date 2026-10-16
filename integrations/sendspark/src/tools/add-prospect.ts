import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

let webhookEventEnum = z.enum([
  'video_generated_dv',
  'video_mp4_ready',
  'video_failed',
  'video_viewed',
  'video_played',
  'video_watched',
  'video_liked',
  'video_cta_clicked'
]);

export let addProspect = SlateTool.create(spec, {
  name: 'Add Prospect',
  key: 'add_prospect',
  description: `Add a single prospect to a dynamic video campaign. This triggers personalized video generation for the prospect. You can optionally configure per-prospect webhook notifications.

**Important:** Setting \`processAndAuthorizeCharge\` to \`true\` is required and confirms understanding that videos exceeding plan limits may incur charges.`,
  constraints: [
    'Rate limited to 30 requests per minute.',
    'processAndAuthorizeCharge must be true to process the prospect.'
  ]
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      campaignId: z
        .string()
        .describe('ID of the dynamic video campaign to add the prospect to'),
      contactName: z.string().describe('Full name of the prospect'),
      contactEmail: z.string().describe('Email address of the prospect'),
      company: z.string().optional().describe('Company name of the prospect'),
      jobTitle: z.string().optional().describe('Job title of the prospect'),
      backgroundUrl: z
        .string()
        .optional()
        .describe('URL for website screenshot personalization in the video background'),
      screenshotUrl: z
        .string()
        .optional()
        .describe('Direct screenshot URL for the background'),
      customField: z.string().optional().describe('Custom personalization value'),
      fields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional personalization fields'),
      fallbackToEmailDomainForBackground: z
        .boolean()
        .optional()
        .describe(
          'Use the email domain as the background when a background URL is unavailable'
        ),
      callbackId: z
        .string()
        .optional()
        .describe('Callback identifier for this processing request'),
      forceCreation: z
        .boolean()
        .optional()
        .describe('Create new prospect even if one with the same email exists'),
      duplicateStrategy: z
        .enum(['keep-first-valid', 'keep-last-valid'])
        .optional()
        .describe('Strategy for handling duplicate prospects'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive webhook notifications for this prospect'),
      webhookEvents: z
        .array(webhookEventEnum)
        .optional()
        .describe('Webhook events to subscribe to for this prospect')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider response'),
      prospects: z.array(
        z.object({
          prospectId: z.string().optional(),
          campaignId: z.string().optional(),
          contactName: z.string().optional(),
          contactEmail: z.string().optional(),
          company: z.string().optional(),
          jobTitle: z.string().optional(),
          backgroundUrl: z.string().optional(),
          screenshotUrl: z.string().optional(),
          status: z.string().optional(),
          valid: z.boolean().optional(),
          createdAt: z.string().optional(),
          webhookUrl: z.string().optional(),
          webhookEvents: z.array(z.string()).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.addProspect(ctx.input.campaignId, {
      processAndAuthorizeCharge: true,
      prospectDepurationConfig:
        ctx.input.forceCreation !== undefined || ctx.input.duplicateStrategy
          ? {
              forceCreation: ctx.input.forceCreation,
              payloadDepurationStrategy: ctx.input.duplicateStrategy
            }
          : undefined,
      prospect: {
        contactName: ctx.input.contactName,
        contactEmail: ctx.input.contactEmail,
        company: ctx.input.company,
        jobTitle: ctx.input.jobTitle,
        backgroundUrl: ctx.input.backgroundUrl,
        screenshotUrl: ctx.input.screenshotUrl,
        customField: ctx.input.customField,
        fields: ctx.input.fields,
        webhookUrl: ctx.input.webhookUrl,
        webhookEvents: ctx.input.webhookEvents
      },
      fallbackToEmailDomainForBackground: ctx.input.fallbackToEmailDomainForBackground,
      callbackId: ctx.input.callbackId
    });

    let prospectList = result.prospectList || [];
    let prospects = prospectList.map((p: any) => ({
      prospectId: p._id,
      campaignId: p.campaign,
      contactName: p.contactName,
      contactEmail: p.contactEmail,
      company: p.company,
      jobTitle: p.jobTitle,
      backgroundUrl: p.backgroundUrl,
      screenshotUrl: p.screenshotUrl,
      status: p.status,
      valid: p.valid,
      createdAt: p.createdAt,
      webhookUrl: p.webhookUrl,
      webhookEvents: p.webhookEvents
    }));

    return {
      output: { prospects, raw: result },
      message: `Sendspark accepted the prospect request for **${ctx.input.contactName}** (${ctx.input.contactEmail}).${prospects[0]?.status !== undefined ? ` Status: ${prospects[0].status}.` : ''}`
    };
  })
  .build();
