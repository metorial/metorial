import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let complianceCheck = SlateTool.create(spec, {
  name: 'Compliance Check',
  key: 'compliance_check',
  description: `Check opt-out and data privacy compliance status for contacts. Supports GDPR and CCPA compliance by identifying contacts who have opted out or have suppression flags. Use to ensure outreach respects contact preferences.`,
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
        .array(z.record(z.string(), z.any()))
        .describe('Compliance check results with opt-out status and preference data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let params: Record<string, any> = {};
    if (ctx.input.emailAddresses) {
      params.emailAddress = ctx.input.emailAddresses;
    }
    if (ctx.input.personIds) {
      params.personId = ctx.input.personIds;
    }

    let result = await client.searchCompliance(params);

    let results = result.data || result.result || [];

    return {
      output: { results },
      message: `Checked compliance status for **${results.length}** record(s).`
    };
  })
  .build();
