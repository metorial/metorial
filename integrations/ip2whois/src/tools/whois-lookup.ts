import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  name: z.string().describe('Contact name'),
  organization: z.string().describe('Organization name'),
  streetAddress: z.string().describe('Street address'),
  city: z.string().describe('City'),
  region: z.string().describe('Region or state'),
  zipCode: z.string().describe('ZIP or postal code'),
  country: z.string().describe('Country'),
  phone: z.string().describe('Phone number'),
  fax: z.string().describe('Fax number'),
  email: z.string().describe('Email address')
});

export let whoisLookup = SlateTool.create(spec, {
  name: 'WHOIS Lookup',
  key: 'whois_lookup',
  description: `Look up WHOIS registration and ownership information for a domain name. Returns comprehensive data including creation date, expiration date, domain age, registrar details, registrant contact information, admin/tech/billing contacts, and nameservers. Supports 1221 TLDs and 634 ccTLDs.`,
  constraints: ['Free API allows up to 500 WHOIS lookups per month.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('The domain name to look up (e.g. "example.com")')
    })
  )
  .output(
    z.object({
      domain: z.string().describe('The queried domain name'),
      domainId: z.string().describe('Domain registry ID'),
      status: z.string().describe('Domain status'),
      createDate: z.string().describe('Domain creation date'),
      updateDate: z.string().describe('Domain last update date'),
      expireDate: z.string().describe('Domain expiration date'),
      domainAge: z.number().describe('Domain age in days'),
      whoisServer: z.string().describe('WHOIS server used'),
      registrar: z
        .object({
          ianaId: z.string().describe('IANA registrar ID'),
          name: z.string().describe('Registrar name'),
          url: z.string().describe('Registrar URL')
        })
        .describe('Domain registrar information'),
      registrant: contactSchema.describe('Registrant contact information'),
      admin: contactSchema.describe('Administrative contact information'),
      tech: contactSchema.describe('Technical contact information'),
      billing: contactSchema.describe('Billing contact information'),
      nameservers: z.array(z.string()).describe('List of nameservers for the domain')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.lookupWhois(ctx.input.domain);

    let expiryInfo = result.expireDate ? `, expires **${result.expireDate}**` : '';
    let registrarInfo = result.registrar.name ? ` via **${result.registrar.name}**` : '';

    return {
      output: result,
      message: `WHOIS lookup for **${result.domain}**: created **${result.createDate}**${expiryInfo} (${result.domainAge} days old)${registrarInfo}. Found ${result.nameservers.length} nameserver(s).`
    };
  })
  .build();
