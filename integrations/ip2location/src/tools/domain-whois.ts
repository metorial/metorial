import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z
  .object({
    name: z.string().describe('Contact name'),
    organization: z.string().describe('Contact organization'),
    streetAddress: z.string().describe('Street address'),
    city: z.string().describe('City'),
    region: z.string().describe('Region or state'),
    zipCode: z.string().describe('ZIP or postal code'),
    country: z.string().describe('Country'),
    phone: z.string().describe('Phone number'),
    fax: z.string().describe('Fax number'),
    email: z.string().describe('Email address')
  })
  .describe('Contact information');

export let domainWhois = SlateTool.create(spec, {
  name: 'Domain WHOIS Lookup',
  key: 'domain_whois_lookup',
  description: `Retrieve WHOIS registration data for a domain name. Returns domain registration details including creation date, expiration date, domain age, registrar information, registrant/admin/tech/billing contact information, nameservers, and status.

Supports 1,221 TLDs and 634 ccTLDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainName: z.string().describe('Domain name to look up (e.g., "example.com")')
    })
  )
  .output(
    z.object({
      domain: z.string().describe('Queried domain name'),
      domainId: z.string().describe('Domain ID'),
      status: z.string().describe('Domain status'),
      createDate: z.string().describe('Domain creation date'),
      updateDate: z.string().describe('Domain last update date'),
      expireDate: z.string().describe('Domain expiration date'),
      domainAge: z.number().describe('Domain age in days'),
      whoisServer: z.string().describe('WHOIS server used for the lookup'),
      registrar: z
        .object({
          ianaId: z.string().describe('IANA registrar ID'),
          name: z.string().describe('Registrar name'),
          url: z.string().describe('Registrar URL')
        })
        .describe('Registrar details'),
      registrant: contactSchema.describe('Registrant contact'),
      admin: contactSchema.describe('Administrative contact'),
      tech: contactSchema.describe('Technical contact'),
      billing: contactSchema.describe('Billing contact'),
      nameservers: z.array(z.string()).describe('List of nameservers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getWhois(ctx.input.domainName);

    let mapContact = (c: {
      name: string;
      organization: string;
      street_address: string;
      city: string;
      region: string;
      zip_code: string;
      country: string;
      phone: string;
      fax: string;
      email: string;
    }) => ({
      name: c.name || '',
      organization: c.organization || '',
      streetAddress: c.street_address || '',
      city: c.city || '',
      region: c.region || '',
      zipCode: c.zip_code || '',
      country: c.country || '',
      phone: c.phone || '',
      fax: c.fax || '',
      email: c.email || ''
    });

    let output = {
      domain: result.domain || '',
      domainId: result.domain_id || '',
      status: result.status || '',
      createDate: result.create_date || '',
      updateDate: result.update_date || '',
      expireDate: result.expire_date || '',
      domainAge: result.domain_age || 0,
      whoisServer: result.whois_server || '',
      registrar: {
        ianaId: result.registrar?.iana_id || '',
        name: result.registrar?.name || '',
        url: result.registrar?.url || ''
      },
      registrant: mapContact(result.registrant || ({} as any)),
      admin: mapContact(result.admin || ({} as any)),
      tech: mapContact(result.tech || ({} as any)),
      billing: mapContact(result.billing || ({} as any)),
      nameservers: result.nameservers || []
    };

    let ageYears = output.domainAge > 0 ? Math.floor(output.domainAge / 365) : 0;

    return {
      output,
      message: `**${output.domain}** — registered with **${output.registrar.name || 'unknown registrar'}**, created ${output.createDate || 'unknown'}, expires ${output.expireDate || 'unknown'} (${ageYears > 0 ? `${ageYears} years old` : 'age unknown'})`
    };
  })
  .build();
