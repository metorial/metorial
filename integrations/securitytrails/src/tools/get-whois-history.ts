import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWhoisHistory = SlateTool.create(spec, {
  name: 'Get WHOIS History',
  key: 'get_whois_history',
  description: `Retrieve historical WHOIS records for a domain. Shows how ownership, registration details, and contact information have changed over time. Historical WHOIS data can help uncover protected registration details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      hostname: z
        .string()
        .describe('Domain to look up WHOIS history for (e.g., "example.com")'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z
      .object({
        hostname: z.string().describe('The queried domain'),
        records: z
          .array(
            z
              .object({
                registrar: z.string().optional().describe('Registrar at this point in time'),
                createdDate: z.string().optional().describe('Registration creation date'),
                expiresDate: z.string().optional().describe('Registration expiration date'),
                nameServers: z
                  .array(z.string())
                  .optional()
                  .describe('Name servers at this point'),
                contacts: z.any().optional().describe('Contact information at this point')
              })
              .passthrough()
          )
          .describe('Historical WHOIS records'),
        pages: z.number().optional().describe('Total pages available')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getWhoisHistory(ctx.input.hostname, {
      page: ctx.input.page
    });

    let records = result.result?.items ?? result.items ?? result.records ?? [];

    return {
      output: {
        hostname: ctx.input.hostname,
        records,
        pages: result.pages ?? result.result?.pages,
        ...result
      },
      message: `Retrieved **${records.length}** historical WHOIS records for **${ctx.input.hostname}**.`
    };
  })
  .build();
