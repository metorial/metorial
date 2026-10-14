import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CampaignClient } from '../lib/campaign-client';
import { ExperimentationClient } from '../lib/client';
import { CmpClient } from '../lib/cmp-client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the connected user profile and available account information for Experimentation, CMP, or Campaign.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      clientId: z
        .string()
        .optional()
        .describe(
          'Campaign client ID from Administration > API Overview; overrides campaignClientId in config'
        )
    })
  )
  .output(
    z.object({ user: z.any().describe('Connected user profile and account information') })
  )
  .handleInvocation(async ctx => {
    let user: unknown;
    switch (ctx.config.product) {
      case 'experimentation':
        user = await new ExperimentationClient(ctx.auth.token).getCurrentUser();
        break;
      case 'cmp':
        user = await new CmpClient(ctx.auth.token).getCurrentUser();
        break;
      case 'campaign': {
        let clientId = ctx.input.clientId ?? ctx.config.campaignClientId;
        if (!clientId)
          throw createApiServiceError(
            'Provide clientId or set campaignClientId in config for Campaign.'
          );
        user = await new CampaignClient(ctx.auth.token, clientId).getCurrentUser();
        break;
      }
      default:
        throw createApiServiceError(
          'A current-user endpoint is available for Experimentation, CMP, and Campaign. Select one of those products for this tool.'
        );
    }
    return { output: { user }, message: 'Retrieved the connected user profile.' };
  })
  .build();
