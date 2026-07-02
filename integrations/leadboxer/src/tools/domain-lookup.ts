import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadBoxerClient } from '../lib/client';
import { spec } from '../spec';

export let domainLookup = SlateTool.create(spec, {
  name: 'Domain Lookup',
  key: 'domain_lookup',
  description: `Enrich a domain name with detailed company firmographic data. Returns company name, industry, employee count, revenue, technologies, location, social links, and more. Ideal for enriching CRM records or scoring ICP fit.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('The domain name to look up, e.g. "example.com"')
    })
  )
  .output(
    z.object({
      companyName: z.string().optional().describe('Company name'),
      domain: z.string().optional().describe('Primary domain'),
      domainAliases: z.array(z.string()).optional().describe('Domain aliases'),
      description: z.string().optional().describe('Company description'),
      industryName: z.string().optional().describe('Industry name'),
      industryGroup: z.string().optional().describe('Industry group'),
      employeeCountRange: z.string().optional().describe('Employee count range'),
      revenueRange: z.string().optional().describe('Revenue range'),
      companyType: z.string().optional().describe('Company type'),
      status: z.string().optional().describe('Company status'),
      yearFounded: z.string().optional().describe('Year founded'),
      specialties: z.string().optional().describe('Company specialties'),
      technologies: z.array(z.string()).optional().describe('Technology stack'),
      street: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State/province'),
      postalCode: z.string().optional().describe('Postal code'),
      country: z.string().optional().describe('Country'),
      phone: z.string().optional().describe('Company phone'),
      companyEmail: z.string().optional().describe('Company email'),
      linkedinUrl: z.string().optional().describe('LinkedIn URL'),
      facebookUrl: z.string().optional().describe('Facebook URL'),
      twitterUrl: z.string().optional().describe('Twitter URL'),
      source: z.string().optional().describe('Data source attribution')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadBoxerClient({
      token: ctx.auth.token,
      datasetId: ctx.config.datasetId
    });

    let result = await client.lookupDomain(ctx.input.domain);

    let technologies = result.technologies || result.organizationTechnologies;
    let techArray = Array.isArray(technologies)
      ? technologies
      : typeof technologies === 'string' && technologies
        ? technologies.split(',').map((t: string) => t.trim())
        : undefined;

    let aliases = result.domainAliases || result.organizationDomainAliases;
    let aliasArray = Array.isArray(aliases)
      ? aliases
      : typeof aliases === 'string' && aliases
        ? aliases.split(',').map((a: string) => a.trim())
        : undefined;

    let output = {
      companyName: result.organizationName || result.companyName || result.name,
      domain: result.organizationDomain || result.domain,
      domainAliases: aliasArray,
      description:
        result.organizationDescription ||
        result.organizationDescriptionShort ||
        result.description,
      industryName: result.organizationIndustryName || result.industryName,
      industryGroup: result.organizationIndustryGroup || result.industryGroup,
      employeeCountRange:
        result.organizationEmployeeCountRangeName || result.employeeCountRange,
      revenueRange: result.organizationRevenueRange || result.revenueRange,
      companyType: result.organizationType || result.type,
      status: result.organizationStatus || result.status,
      yearFounded:
        result.organizationYearFounded != null
          ? String(result.organizationYearFounded)
          : undefined,
      specialties: result.organizationSpecialties || result.specialties,
      technologies: techArray,
      street: result.organizationStreet || result.street,
      city: result.organizationCity || result.city,
      state: result.organizationState || result.state,
      postalCode: result.organizationPostalCode || result.postalCode,
      country: result.organizationCountry || result.country,
      phone: result.organizationPhone || result.phone,
      companyEmail: result.organizationEmail || result.email,
      linkedinUrl: result.organizationLinkedinUrl || result.linkedinUrl,
      facebookUrl: result.organizationFacebookUrl || result.facebookUrl,
      twitterUrl: result.organizationTwitterUrl || result.twitterUrl,
      source: result.organizationSource || result.source
    };

    let name = output.companyName || ctx.input.domain;
    return {
      output,
      message: `Domain **${ctx.input.domain}** identified as **${name}**${output.industryName ? ` (${output.industryName})` : ''}${output.employeeCountRange ? `, ${output.employeeCountRange} employees` : ''}.`
    };
  })
  .build();
