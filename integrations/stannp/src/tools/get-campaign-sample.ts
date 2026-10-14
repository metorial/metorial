import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';
import { getSampleRefreshAt } from './get-file-url';

export let getCampaignSample = SlateTool.create(spec, {
  name: 'Get Campaign Sample',
  key: 'get_campaign_sample',
  description: 'Generate a downloadable PDF sample to review a campaign before approving it.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      campaignId: z.number().describe('Campaign ID from list_campaigns or create_campaign')
    })
  )
  .output(z.object({ campaignId: z.string(), mimeType: z.string() }))
  .handleInvocation(async ctx => {
    let url = await createClient(ctx.auth, ctx.config).getCampaignSample(ctx.input.campaignId);
    if (typeof url !== 'string' || !url.startsWith('https://')) {
      throw createApiServiceError('Stannp did not return a campaign sample PDF URL.');
    }
    await ctx.addAttachment({
      type: 'url',
      url,
      mimeType: 'application/pdf',
      refreshReference: { campaignId: ctx.input.campaignId },
      refreshAt: getSampleRefreshAt()
    });
    return {
      output: { campaignId: String(ctx.input.campaignId), mimeType: 'application/pdf' },
      message: `Campaign **${ctx.input.campaignId}** sample PDF is ready for download.`
    };
  })
  .build();
