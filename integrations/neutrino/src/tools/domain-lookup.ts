import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

export let domainLookupTool = SlateTool.create(spec, {
  name: 'Domain Lookup',
  key: 'domain_lookup',
  description: `Retrieve DNS, WHOIS, and threat intelligence for a domain. Returns registration details, domain age, registrar info, mail/web configuration, and malicious domain detection.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      host: z.string().describe('Domain name or FQDN to look up'),
      live: z
        .boolean()
        .optional()
        .describe(
          'Enable real-time reconnaissance for previously unseen domains (may increase latency)'
        )
    })
  )
  .output(
    z.object({
      valid: z.boolean().describe('Whether the domain is valid'),
      fqdn: z.string().describe('Fully qualified domain name'),
      registrarName: z.string().describe('Domain registrar name'),
      registrarId: z.number().describe('IANA registrar ID'),
      registeredDate: z.string().describe('Domain registration date'),
      expiryDate: z.string().describe('Domain expiry date'),
      age: z.number().describe('Domain age in days'),
      hostCountry: z.string().describe('Hosting country'),
      hostCountryCode: z.string().describe('Hosting country ISO code'),
      mailProvider: z.string().describe('Mail provider name'),
      isMailConfigured: z.boolean().describe('Whether mail is configured'),
      isWebConfigured: z.boolean().describe('Whether web hosting is configured'),
      isMalicious: z.boolean().describe('Whether the domain is flagged as malicious'),
      blocklists: z.array(z.string()).describe('Blocklist categories the domain appears on')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.domainLookup({
      host: ctx.input.host,
      live: ctx.input.live
    });

    return {
      output: {
        valid: result.valid ?? false,
        fqdn: result.fqdn ?? '',
        registrarName: result.registrarName ?? '',
        registrarId: result.registrarId ?? 0,
        registeredDate: result.registeredDate ?? '',
        expiryDate: result.expiryDate ?? '',
        age: result.age ?? 0,
        hostCountry: result.hostCountry ?? '',
        hostCountryCode: result.hostCountryCode ?? '',
        mailProvider: result.mailProvider ?? '',
        isMailConfigured: result.isMailConfigured ?? false,
        isWebConfigured: result.isWebConfigured ?? false,
        isMalicious: result.isMalicious ?? false,
        blocklists: result.blocklists ?? []
      },
      message: `**${result.fqdn || ctx.input.host}**: ${result.valid ? 'Valid domain' : 'Invalid domain'}. Registrar: ${result.registrarName || 'unknown'}. Age: ${result.age ?? 0} days.${result.isMalicious ? ' ⚠️ Flagged as malicious.' : ''}`
    };
  })
  .build();
