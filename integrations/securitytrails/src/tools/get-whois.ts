import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z
  .object({
    name: z.string().optional(),
    organization: z.string().optional(),
    email: z.string().optional(),
    telephone: z.string().optional(),
    fax: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional()
  })
  .passthrough();

export let getWhois = SlateTool.create(spec, {
  name: 'Get WHOIS',
  key: 'get_whois',
  description: `Retrieve current WHOIS registration data for a domain, including registrant contact information, registrar, creation/expiration dates, and name servers. WHOIS data is updated daily.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      hostname: z.string().describe('Domain to look up WHOIS data for (e.g., "example.com")')
    })
  )
  .output(
    z
      .object({
        hostname: z.string().describe('The queried domain'),
        registrar: z.string().optional().describe('Domain registrar'),
        createdDate: z.string().optional().describe('Domain registration date'),
        expiresDate: z.string().optional().describe('Domain expiration date'),
        updatedDate: z.string().optional().describe('Last WHOIS update date'),
        nameServers: z.array(z.string()).optional().describe('Authoritative name servers'),
        contacts: z
          .record(z.string(), contactSchema)
          .optional()
          .describe('Contact records by type (registrant, admin, tech)')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getDomainWhois(ctx.input.hostname);

    return {
      output: {
        hostname: ctx.input.hostname,
        registrar: result.registrar,
        createdDate: result.createdDate ?? result.created_date,
        expiresDate: result.expiresDate ?? result.expires_date,
        updatedDate: result.updatedDate ?? result.updated_date,
        nameServers: result.nameServers ?? result.name_servers,
        contacts: result.contacts ?? result.contact,
        ...result
      },
      message: `Retrieved WHOIS data for **${ctx.input.hostname}**. Registrar: ${result.registrar ?? 'unknown'}.`
    };
  })
  .build();
