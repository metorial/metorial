import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let contactInfoSchema = z.object({
  contactEmail: z.string().optional(),
  contactFirstName: z.string().optional(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  backgroundUrl: z.string().optional(),
  fields: z.record(z.string(), z.any()).optional()
});

let webhookPayloadSchema = z.object({
  eventType: z.string(),
  campaignId: z.string().optional(),
  campaignName: z.string().optional(),
  dynamicCampaignId: z.string().optional(),
  dynamicCampaignName: z.string().optional(),
  contactInfo: contactInfoSchema.optional(),
  creatorId: z.string().optional(),
  creatorName: z.string().optional(),
  videoLink: z.string().optional(),
  embedLink: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  workspaceId: z.string().optional(),
  workspaceName: z.string().optional(),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
  watchPercentage: z.number().optional(),
  emailEmbedHTML: z.string().optional(),
  emailDownloadLink: z.string().optional(),
  downloadVideoLinkLow: z.string().optional(),
  downloadVideoLinkMedium: z.string().optional(),
  downloadVideoLinkHigh: z.string().optional(),
  downloadVideoLinks: z.array(z.any()).optional()
});

export let videoEvents = SlateTrigger.create(spec, {
  name: 'Video Events',
  key: 'video_events',
  description:
    'Triggers on Sendspark dynamic video events including video creation, readiness for download, failures, views, plays, watch progress, likes, and CTA clicks. Configure webhooks in Sendspark Settings by providing the webhook URL.',
  instructions: [
    'Configure your webhook in Sendspark Settings > Webhooks, providing the webhook URL shown here.',
    'Associate the webhook with specific dynamic video campaigns or all campaigns in your workspace.'
  ]
})
  .input(webhookPayloadSchema)
  .output(
    z.object({
      eventType: z.string().describe('The type of video event that occurred'),
      campaignId: z.string().optional().describe('ID of the individual video campaign'),
      campaignName: z.string().optional().describe('Name of the individual video campaign'),
      dynamicCampaignId: z
        .string()
        .optional()
        .describe('ID of the parent dynamic video campaign'),
      dynamicCampaignName: z
        .string()
        .optional()
        .describe('Name of the parent dynamic video campaign'),
      contactEmail: z.string().optional().describe('Email of the prospect'),
      contactFirstName: z.string().optional().describe('First name of the prospect'),
      contactCompany: z.string().optional().describe('Company of the prospect'),
      contactJobTitle: z.string().optional().describe('Job title of the prospect'),
      creatorId: z.string().optional().describe('ID of the video creator'),
      creatorName: z.string().optional().describe('Name of the video creator'),
      videoLink: z.string().optional().describe('Shareable video URL'),
      embedLink: z.string().optional().describe('Embeddable video link'),
      thumbnailUrl: z.string().optional().describe('Video thumbnail image URL'),
      workspaceId: z.string().optional().describe('Sendspark workspace ID'),
      workspaceName: z.string().optional().describe('Sendspark workspace name'),
      ctaText: z
        .string()
        .optional()
        .describe('CTA button text (for video_cta_clicked events)'),
      ctaLink: z
        .string()
        .optional()
        .describe('CTA button link (for video_cta_clicked events)'),
      watchPercentage: z
        .number()
        .optional()
        .describe('Percentage of video watched (for video_watched events)'),
      emailDownloadLink: z
        .string()
        .optional()
        .describe('Email-compatible download link (for video_mp4_ready events)'),
      downloadVideoLinkHigh: z
        .string()
        .optional()
        .describe('High quality download link (for video_mp4_ready events)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Handle both single event and array formats
      let events = Array.isArray(body) ? body : [body];

      let inputs = events.map((event: any) => ({
        eventType: event.eventType || 'unknown',
        campaignId: event.campaignId,
        campaignName: event.campaignName,
        dynamicCampaignId: event.dynamicCampaignId,
        dynamicCampaignName: event.dynamicCampaignName,
        contactInfo: event.contactInfo,
        creatorId: event.creatorId,
        creatorName: event.creatorName,
        videoLink: event.videoLink,
        embedLink: event.embedLink,
        thumbnailUrl: event.thumbnailUrl,
        workspaceId: event.workspaceId,
        workspaceName: event.workspaceName,
        ctaText: event.ctaText,
        ctaLink: event.ctaLink,
        watchPercentage: event.watchPercentage,
        emailEmbedHTML: event.emailEmbedHTML,
        emailDownloadLink: event.emailDownloadLink,
        downloadVideoLinkLow: event.downloadVideoLinkLow,
        downloadVideoLinkMedium: event.downloadVideoLinkMedium,
        downloadVideoLinkHigh: event.downloadVideoLinkHigh,
        downloadVideoLinks: event.downloadVideoLinks
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let event = ctx.input;
      let contactEmail = event.contactInfo?.contactEmail || 'unknown';
      let eventId = `${event.eventType}-${event.campaignId || ''}-${contactEmail}-${Date.now()}`;

      return {
        type: `video.${event.eventType}`,
        id: eventId,
        output: {
          eventType: event.eventType,
          campaignId: event.campaignId,
          campaignName: event.campaignName,
          dynamicCampaignId: event.dynamicCampaignId,
          dynamicCampaignName: event.dynamicCampaignName,
          contactEmail: event.contactInfo?.contactEmail,
          contactFirstName: event.contactInfo?.contactFirstName,
          contactCompany: event.contactInfo?.company,
          contactJobTitle: event.contactInfo?.jobTitle,
          creatorId: event.creatorId,
          creatorName: event.creatorName,
          videoLink: event.videoLink,
          embedLink: event.embedLink,
          thumbnailUrl: event.thumbnailUrl,
          workspaceId: event.workspaceId,
          workspaceName: event.workspaceName,
          ctaText: event.ctaText,
          ctaLink: event.ctaLink,
          watchPercentage: event.watchPercentage,
          emailDownloadLink: event.emailDownloadLink,
          downloadVideoLinkHigh: event.downloadVideoLinkHigh
        }
      };
    }
  })
  .build();
