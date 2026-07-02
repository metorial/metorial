import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClearoutClient } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  fullAddress: z.string().optional().describe('Full address'),
  state: z.string().optional().describe('State or province'),
  city: z.string().optional().describe('City'),
  country: z.string().optional().describe('Country'),
  countryCode: z.string().optional().describe('Country code')
});

export let reverseLookup = SlateTool.create(spec, {
  name: 'Reverse Lookup',
  key: 'reverse_lookup',
  description: `Look up a person's or company's information using a LinkedIn URL, email address, or domain name.
- **LinkedIn lookup** returns person details (name, title, company, addresses, experience).
- **Email lookup** returns person details associated with the email address.
- **Domain lookup** returns company details (name, logo, LinkedIn page, address).`,
  constraints: ['Consumes credits per lookup.', 'Daily verify limits may apply.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      lookupType: z
        .enum(['linkedin', 'email', 'domain'])
        .describe('Type of reverse lookup to perform'),
      linkedinUrl: z
        .string()
        .optional()
        .describe('LinkedIn profile URL (required for linkedin lookup)'),
      emailAddress: z
        .string()
        .optional()
        .describe('Email address (required for email lookup)'),
      domain: z.string().optional().describe('Domain name (required for domain lookup)')
    })
  )
  .output(
    z.object({
      leadType: z.string().optional().describe('Type of lead returned: person or company'),
      leadId: z.string().optional().describe('Unique lead ID'),
      name: z.string().optional().describe('Person name or company name'),
      constructedTitle: z
        .string()
        .optional()
        .describe('Constructed title (e.g., "Co-chair at Gates Foundation")'),
      profilePicture: z.string().optional().describe('URL to profile image or company logo'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile or company page URL'),
      title: z.string().optional().describe('Job title'),
      companyName: z.string().optional().describe('Company name (for person lookups)'),
      companyDomain: z.string().optional().describe('Company domain (for person lookups)'),
      addresses: z
        .array(addressSchema)
        .optional()
        .describe('Addresses associated with the lead'),
      totalExperienceInMonths: z
        .number()
        .optional()
        .describe('Total professional experience in months (person only)'),
      emailAddress: z.string().optional().describe('Email address associated with the lookup')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearoutClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result: Record<string, unknown>;

    switch (ctx.input.lookupType) {
      case 'linkedin': {
        if (!ctx.input.linkedinUrl)
          throw new Error('linkedinUrl is required for LinkedIn lookup');
        result = await client.reverseLookupLinkedIn(ctx.input.linkedinUrl);
        break;
      }
      case 'email': {
        if (!ctx.input.emailAddress)
          throw new Error('emailAddress is required for email lookup');
        result = await client.reverseLookupEmail(ctx.input.emailAddress);
        break;
      }
      case 'domain': {
        if (!ctx.input.domain) throw new Error('domain is required for domain lookup');
        result = await client.reverseLookupDomain(ctx.input.domain);
        break;
      }
    }

    let data = (result.data ?? result) as Record<string, unknown>;
    let lead = (data.lead ?? data) as Record<string, unknown>;
    let rawAddresses = lead.addresses as
      | Record<string, unknown>[]
      | Record<string, unknown>
      | undefined;

    let addresses: Record<string, unknown>[] = [];
    if (Array.isArray(rawAddresses)) {
      addresses = rawAddresses;
    } else if (rawAddresses && typeof rawAddresses === 'object') {
      addresses = [rawAddresses];
    }

    let output = {
      leadType: lead.type as string | undefined,
      leadId: lead.id as string | undefined,
      name: lead.name as string | undefined,
      constructedTitle: lead.contructed_title as string | undefined,
      profilePicture: lead.profile_picture as string | undefined,
      linkedinUrl: lead.linkedin_url as string | undefined,
      title: lead.title as string | undefined,
      companyName: lead.company_name as string | undefined,
      companyDomain: lead.company_domain as string | undefined,
      addresses: addresses.map(a => ({
        fullAddress: a.full_address as string | undefined,
        state: a.state as string | undefined,
        city: a.city as string | undefined,
        country: a.country as string | undefined,
        countryCode: a.country_code as string | undefined
      })),
      totalExperienceInMonths: lead.total_experience_in_months as number | undefined,
      emailAddress: data.email_address as string | undefined
    };

    let label = output.name ?? 'Unknown';
    let typeLabel = output.leadType === 'company' ? 'Company' : 'Person';
    return {
      output,
      message: `${typeLabel} found: **${label}**${output.title ? ` — ${output.title}` : ''}${output.companyName ? ` at ${output.companyName}` : ''}`
    };
  })
  .build();
