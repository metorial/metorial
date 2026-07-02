import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let businessIntelligence = SlateTool.create(spec, {
  name: 'Business Intelligence',
  key: 'business_intelligence',
  description: `Retrieve comprehensive business intelligence data for a company, including firmographic and demographic information. Look up by **company name**, **web domain**, or **email address**.

Returns official company name, headquarters, description, revenue estimates, employee count, industry codes (NAICS), and top executive information.

This is a **premium API** that consumes multiple credits per call.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lookup: z.string().describe('Company name, web domain, or email address to look up')
    })
  )
  .output(
    z.object({
      businessData: z
        .record(z.string(), z.any())
        .describe(
          'Comprehensive business information including company name, website, headquarters, description, revenue, employees, NAICS codes, and executive data'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getBusinessInfo(ctx.input.lookup);

    return {
      output: {
        businessData: result
      },
      message: `Retrieved business information for "${ctx.input.lookup}"`
    };
  })
  .build();
