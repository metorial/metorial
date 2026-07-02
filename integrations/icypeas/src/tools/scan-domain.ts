import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scanDomain = SlateTool.create(spec, {
  name: 'Scan Domain',
  key: 'scan_domain',
  description: `Scan a domain or company name to discover all role-based email addresses (e.g. contact@, info@, support@). Submits an asynchronous scan and returns the search ID. Use **Get Search Result** to retrieve discovered emails.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      domainOrCompany: z.string().describe('Domain name or company name to scan')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the scan was accepted'),
      searchId: z.string().optional().describe('ID to retrieve the result later')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.domainSearch({
      domainOrCompany: ctx.input.domainOrCompany
    });

    return {
      output: {
        success: result.success ?? true,
        searchId: result._id || result.id
      },
      message:
        result.success !== false
          ? `Domain scan submitted for **${ctx.input.domainOrCompany}**. Search ID: \`${result._id || result.id}\``
          : `Domain scan failed: ${JSON.stringify(result)}`
    };
  })
  .build();
