import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { normalizeOutput } from '../lib/response';
import { spec } from '../spec';

let trustpilotCompanyOutputSchema = z.object({
  trustpilotId: z.string().optional(),
  displayName: z.string().optional(),
  stars: z.number().optional(),
  trustScore: z.number().optional(),
  numberOfReviews: z.number().optional(),
  websiteUrl: z.string().optional(),
  ratings: z.any().optional().describe('Rating distribution'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  categories: z.array(z.any()).optional(),
  replyMetrics: z.any().optional(),
  logo: z.string().optional(),
  raw: z.any().describe('Full raw response')
});

export let trustpilotCompany = SlateTool.create(spec, {
  name: 'Trustpilot Company',
  key: 'trustpilot_company',
  description: `Retrieve company review data from Trustpilot including trust score, star rating, number of reviews, rating distribution, reply metrics, categories, and similar businesses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainOrUrl: z.string().describe('Trustpilot URL or company domain')
    })
  )
  .output(trustpilotCompanyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getTrustpilotCompany({ query: ctx.input.domainOrUrl });

    return {
      output: normalizeOutput(trustpilotCompanyOutputSchema, {
        trustpilotId: result.id,
        displayName: result.display_name,
        stars: result.stars,
        trustScore: result.trust_score,
        numberOfReviews: result.number_of_reviews,
        websiteUrl: result.website_url,
        ratings: result.ratings,
        address: result.address,
        city: result.contact_info?.city ?? result.city,
        country: result.contact_info?.country ?? result.country,
        email: result.contact_info?.email ?? result.email,
        phone: result.contact_info?.phone ?? result.phone,
        categories: result.categories,
        replyMetrics: result.activity?.reply_behavior ?? result.reply_metrics,
        logo: result.logo,
        raw: result
      }),
      message: 'Retrieved Trustpilot company data.'
    };
  })
  .build();
