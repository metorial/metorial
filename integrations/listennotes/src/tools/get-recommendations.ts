import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRecommendations = SlateTool.create(spec, {
  name: 'Get Recommendations',
  key: 'get_recommendations',
  description: `Get similar podcast or episode recommendations based on a given podcast or episode ID. Returns up to 8 recommendations that are similar in content and style.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['podcast', 'episode'])
        .describe('Whether to get recommendations for a podcast or an episode.'),
      resourceId: z
        .string()
        .describe('Listen Notes ID of the podcast or episode to get recommendations for.'),
      safeMode: z.boolean().optional().describe('Set to true to exclude explicit content.')
    })
  )
  .output(
    z.object({
      recommendations: z
        .array(z.any())
        .describe('Array of recommended podcast or episode objects (up to 8).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let safeMode = ctx.input.safeMode ? 1 : undefined;

    if (ctx.input.resourceType === 'podcast') {
      let data = await client.getPodcastRecommendations({
        podcastId: ctx.input.resourceId,
        safeMode
      });

      return {
        output: {
          recommendations: data.recommendations
        },
        message: `Found **${data.recommendations.length}** podcast recommendations.`
      };
    } else {
      let data = await client.getEpisodeRecommendations({
        episodeId: ctx.input.resourceId,
        safeMode
      });

      return {
        output: {
          recommendations: data.recommendations
        },
        message: `Found **${data.recommendations.length}** episode recommendations.`
      };
    }
  })
  .build();
