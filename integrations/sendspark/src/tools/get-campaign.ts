import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

let videoAssetSchema = z.object({
  assetId: z.string().optional(),
  provider: z.string().optional(),
  url: z.string().optional(),
  assetUrl: z.string().optional(),
  duration: z.number().optional()
});

let voiceCloningSchema = z.object({
  enable: z.boolean().optional(),
  status: z.string().optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  textGeneration: z.string().optional(),
  stability: z.number().optional(),
  similarityBoost: z.number().optional()
});

let transcriptionSchema = z.object({
  status: z.string().optional(),
  language: z.string().optional()
});

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve detailed information about a specific dynamic video campaign, including video assets, voice cloning settings, and transcription status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      campaignId: z.string().describe('ID of the dynamic video campaign to retrieve')
    })
  )
  .output(
    z.object({
      campaignId: z.string(),
      name: z.string(),
      status: z.string().optional(),
      combinedVideo: z.boolean().optional(),
      dynamicBackground: z.boolean().optional(),
      videoAssets: z.array(videoAssetSchema).optional(),
      voiceCloning: voiceCloningSchema.optional(),
      transcription: transcriptionSchema.optional(),
      videoAssetIds: z
        .array(z.string())
        .optional()
        .describe('Video asset IDs returned by the provider'),
      raw: z.unknown().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.getCampaign(ctx.input.campaignId);
    let campaign = result.response || result;

    return {
      output: {
        campaignId: campaign._id,
        name: campaign.name,
        status: campaign.status,
        combinedVideo: campaign.combinedVideo,
        dynamicBackground: campaign.dynamicBackground,
        videoAssets: campaign.videosAssets
          ?.filter((a: any) => typeof a === 'object' && a !== null)
          .map((a: any) => ({
            assetId: a.assetId || a._id,
            provider: a.provider,
            url: a.url,
            assetUrl: a.assetUrl,
            duration: a.duration
          })),
        voiceCloning: campaign.features?.voiceCloning
          ? {
              enable: campaign.features.voiceCloning.enable,
              status: campaign.features.voiceCloning.status,
              startTime: campaign.features.voiceCloning.startTime,
              endTime: campaign.features.voiceCloning.endTime,
              textGeneration: campaign.features.voiceCloning.textGeneration,
              stability: campaign.features.voiceCloning.stability,
              similarityBoost: campaign.features.voiceCloning.similarityBoost
            }
          : undefined,
        transcription: campaign.features?.transcription
          ? {
              status: campaign.features.transcription.status,
              language: campaign.features.transcription.language
            }
          : undefined,
        videoAssetIds: campaign.videosAssets?.filter((a: any) => typeof a === 'string'),
        raw: result
      },
      message: `Retrieved campaign **${campaign.name}**${campaign.status !== undefined ? ` (status: ${campaign.status})` : ''}.`
    };
  })
  .build();
