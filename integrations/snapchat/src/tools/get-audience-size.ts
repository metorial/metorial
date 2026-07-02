import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { snapchatServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getAudienceSize = SlateTool.create(spec, {
  name: 'Get Audience Size',
  key: 'get_audience_size',
  description: `Estimate Snapchat reach for an existing ad squad or a prospective ad squad spec before launch. Use this to validate targeting breadth and budget planning.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      adSquadId: z
        .string()
        .optional()
        .describe(
          'Existing ad squad ID to estimate. If provided, adAccountId and adSquadSpec are ignored.'
        ),
      adAccountId: z
        .string()
        .optional()
        .describe('Ad account ID for estimating a prospective ad squad spec'),
      adSquadSpec: z
        .any()
        .optional()
        .describe(
          'Ad squad spec object containing targeting, budget, delivery, and optimization fields'
        )
    })
  )
  .output(
    z.object({
      audienceSizeMinimum: z
        .number()
        .optional()
        .describe('Minimum estimated reachable audience'),
      audienceSizeMaximum: z
        .number()
        .optional()
        .describe('Maximum estimated reachable audience'),
      requestId: z.string().optional().describe('Snapchat request ID for debugging'),
      response: z.any().optional().describe('Raw Snapchat response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);

    let result: any;
    if (ctx.input.adSquadId) {
      result = await client.getAudienceSizeForAdSquad(ctx.input.adSquadId);
    } else {
      if (!ctx.input.adAccountId) {
        throw snapchatServiceError('adAccountId is required when adSquadId is not provided.');
      }
      if (!ctx.input.adSquadSpec) {
        throw snapchatServiceError('adSquadSpec is required when adSquadId is not provided.');
      }

      result = await client.getAudienceSizeForSpec(
        ctx.input.adAccountId,
        ctx.input.adSquadSpec
      );
    }

    let audienceSize = result.audience_size ?? {};
    let output = {
      audienceSizeMinimum: audienceSize.audience_size_minimum,
      audienceSizeMaximum: audienceSize.audience_size_maximum,
      requestId: result.request_id,
      response: result
    };

    return {
      output,
      message: `Estimated Snapchat audience size: **${output.audienceSizeMinimum ?? 'unknown'}** to **${output.audienceSizeMaximum ?? 'unknown'}**.`
    };
  })
  .build();
