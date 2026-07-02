import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let companyInsights = SlateTool.create(spec, {
  name: 'Company Insights',
  key: 'company_insights',
  description: `Retrieve specialized company intelligence including **parent company** identification, **executive profiles**, and **company verification** scores.

- **Parent company**: Identify the ultimate parent owner of a subsidiary.
- **Executive profile**: Get leadership data including name, title, LinkedIn, and biography.
- **Verification**: Get a verification score (0–99) and reasoning about business legitimacy.

These are **premium APIs** that consume multiple credits per call.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      insightType: z
        .enum(['parent_company', 'executive_profile', 'verification'])
        .describe('Type of company insight to retrieve'),
      lookup: z
        .string()
        .describe(
          'For parent_company: subsidiary company name. For executive_profile: company name and title (e.g., "Amazon AWS CEO"). For verification: company name.'
        )
    })
  )
  .output(
    z.object({
      insightData: z.record(z.string(), z.any()).describe('The retrieved company insight data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result: Record<string, any>;

    switch (ctx.input.insightType) {
      case 'parent_company':
        result = await client.getParentCompany(ctx.input.lookup);
        break;
      case 'executive_profile':
        result = await client.getExecutiveProfile(ctx.input.lookup);
        break;
      case 'verification':
        result = await client.getCompanyVerification(ctx.input.lookup);
        break;
    }

    return {
      output: {
        insightData: result
      },
      message: `Retrieved ${ctx.input.insightType.replace('_', ' ')} for "${ctx.input.lookup}"`
    };
  })
  .build();
