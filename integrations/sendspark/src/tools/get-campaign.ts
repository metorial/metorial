import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      transcription: transcriptionSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret,
      workspaceId: ctx.config.workspaceId
    });

    let campaign = await client.getCampaign(ctx.input.campaignId);

    return {
      output: {
        campaignId: campaign._id,
        name: campaign.name,
        status: campaign.status,
        combinedVideo: campaign.combinedVideo,
        dynamicBackground: campaign.dynamicBackground,
        videoAssets: campaign.videosAssets?.map((a: any) => ({
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
          : undefined
      },
      message: `Retrieved campaign **${campaign.name}** (status: ${campaign.status || 'unknown'}).`
    };
  })
  .build();
