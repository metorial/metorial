import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, records } from '../lib/client';
import { spec } from '../spec';

export let complianceCheck = SlateTool.create(spec, {
  name: 'Compliance Check',
  key: 'compliance_check',
  description: `Legacy Enterprise API capability, absent from the published current GTM Data API. Confirm route availability and separate entitlement with ZoomInfo before use. Check opt-out and data privacy compliance status for contacts. Returned provider preferences do not establish legal compliance or authorize outreach.`,
  constraints: ['Requires separate Compliance API subscription/entitlement.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      emailAddresses: z
        .array(z.string())
        .optional()
        .describe('Email addresses to check compliance status'),
      personIds: z
        .array(z.string())
        .optional()
        .describe('ZoomInfo person IDs to check compliance status')
    })
  )
  .output(
    z.object({
      results: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Compliance check results with opt-out status and preference data')
    })
  )
  .handleInvocation(async ctx => {
    const client = Client.fromContext(ctx);

    let params: Record<string, unknown> = {};
    if (ctx.input.emailAddresses) {
      params.emailAddress = ctx.input.emailAddresses;
    }
    if (ctx.input.personIds) {
      params.personId = ctx.input.personIds;
    }

    let result = await client.searchCompliance(params);

    const results = records(result);

    return {
      output: { results },
      message: `Checked compliance status for **${results.length}** record(s).`
    };
  })
  .build();
