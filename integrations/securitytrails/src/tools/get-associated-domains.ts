import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let associatedDomainSchema = z
  .object({
    hostname: z.string().optional().describe('Domain hostname'),
    alexaRank: z.number().optional().describe('Alexa traffic ranking'),
    hostProvider: z.array(z.string()).optional().describe('Hosting providers'),
    mailProvider: z.array(z.string()).optional().describe('Mail providers'),
    registrar: z.string().optional().describe('Domain registrar'),
    companyName: z.string().optional().describe('Computed company name'),
    whoisCreatedDate: z.string().optional().describe('WHOIS creation date'),
    whoisExpiresDate: z.string().optional().describe('WHOIS expiration date')
  })
  .passthrough();

export let getAssociatedDomains = SlateTool.create(spec, {
  name: 'Get Associated Domains',
  key: 'get_associated_domains',
  description: `Find domains related to a given domain, generally those owned by the same company or registrant. Uses WHOIS data (including historical records when current WHOIS is protected) to identify related domains.`,
  constraints: [
    'Limited to 10,000 results.',
    'Requires a Professional Plan subscription or higher.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      hostname: z
        .string()
        .describe('Domain to find associated domains for (e.g., "example.com")'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z
      .object({
        hostname: z.string().describe('The queried domain'),
        records: z.array(associatedDomainSchema).describe('List of associated domains'),
        recordCount: z.number().optional().describe('Total number of associated domains')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getAssociatedDomains(ctx.input.hostname, {
      page: ctx.input.page
    });

    let records = result.records ?? [];

    return {
      output: {
        hostname: ctx.input.hostname,
        records,
        recordCount: result.record_count ?? records.length,
        ...result
      },
      message: `Found **${result.record_count ?? records.length}** domains associated with **${ctx.input.hostname}**.`
    };
  })
  .build();
