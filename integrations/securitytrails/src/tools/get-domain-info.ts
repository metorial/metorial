import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dnsRecordSchema = z
  .object({
    ip: z.string().optional().describe('IP address for A/AAAA records'),
    ipCount: z.number().optional().describe('Number of other hostnames sharing this IP'),
    organization: z.string().optional().describe('Organization owning the IP'),
    value: z.string().optional().describe('Record value'),
    priority: z.number().optional().describe('Priority for MX records'),
    host: z.string().optional().describe('Hostname value')
  })
  .passthrough();

let dnsRecordSetSchema = z
  .object({
    values: z.array(dnsRecordSchema).optional(),
    count: z.number().optional()
  })
  .passthrough();

export let getDomainInfo = SlateTool.create(spec, {
  name: 'Get Domain Info',
  key: 'get_domain_info',
  description: `Retrieve current DNS records and metadata for a domain. Returns A, AAAA, MX, NS, SOA, and TXT records along with hosting provider information and record statistics (e.g., how many other hostnames share the same IP).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      hostname: z.string().describe('Domain or hostname to look up (e.g., "example.com")')
    })
  )
  .output(
    z
      .object({
        hostname: z.string().describe('The queried hostname'),
        alexaRank: z.number().optional().describe('Alexa traffic ranking'),
        currentDns: z
          .record(z.string(), dnsRecordSetSchema)
          .optional()
          .describe('Current DNS records by type (A, AAAA, MX, NS, SOA, TXT)'),
        hostProvider: z.array(z.string()).optional().describe('Hosting providers'),
        mailProvider: z.array(z.string()).optional().describe('Mail providers')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getDomain(ctx.input.hostname);

    return {
      output: {
        hostname: result.hostname ?? ctx.input.hostname,
        alexaRank: result.alexa_rank,
        currentDns: result.current_dns,
        hostProvider: result.host_provider,
        mailProvider: result.mail_provider,
        ...result
      },
      message: `Retrieved domain info for **${ctx.input.hostname}**. Found DNS records including ${result.current_dns ? Object.keys(result.current_dns).join(', ') : 'none'}.`
    };
  })
  .build();
