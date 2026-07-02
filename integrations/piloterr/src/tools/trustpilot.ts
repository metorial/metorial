import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

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
  .output(
    z.object({
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
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getTrustpilotCompany({ query: ctx.input.domainOrUrl });

    return {
      output: {
        trustpilotId: result.id,
        displayName: result.display_name,
        stars: result.stars,
        trustScore: result.trust_score,
        numberOfReviews: result.number_of_reviews,
        websiteUrl: result.website_url,
        ratings: result.ratings,
        address: result.address,
        city: result.city,
        country: result.country,
        email: result.email,
        phone: result.phone,
        categories: result.categories,
        replyMetrics: result.reply_metrics,
        logo: result.logo,
        raw: result
      },
      message: `Trustpilot data for **${result.display_name ?? ctx.input.domainOrUrl}**: **${result.stars ?? 0}/5 stars** (${result.number_of_reviews ?? 0} reviews, trust score: ${result.trust_score ?? 'N/A'}).`
    };
  })
  .build();
