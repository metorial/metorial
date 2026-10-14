import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { LeadBoxerClient } from '../lib/client';
import { leadString, leadStringList } from '../lib/responses';
import { datasetIdSchema, getLegacyDatasetId } from '../lib/schemas';
import { spec } from '../spec';

export let domainLookup = SlateTool.create(spec, {
  name: 'Domain Lookup',
  key: 'domain_lookup',
  description: `Enrich a domain name with company firmographics, industry, employee range, address, and LinkedIn information. Useful for enriching CRM records or scoring ICP fit. Call list_datasets to select which dataset is charged, or omit datasetId to use the account default.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .describe('Clean domain name without protocol or www prefix, e.g. "example.com"'),
      datasetId: datasetIdSchema
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
      datasetId: ctx.input.datasetId ?? getLegacyDatasetId(ctx.config)
    });

    let result = await client.lookupDomain(ctx.input.domain);

    let techArray = leadStringList(result.technologies || result.organizationTechnologies);
    let aliasArray = leadStringList(result.domainAliases || result.organizationDomainAliases);
    let address = isApiErrorRecord(result.organizationAddress)
      ? result.organizationAddress
      : {};
    let social = isApiErrorRecord(result.organizationSocialLinks)
      ? result.organizationSocialLinks
      : {};
    let specialties = result.organizationSpecialties || result.specialties;

    let output = {
      companyName: leadString(result.organizationName || result.companyName || result.name),
      domain: leadString(result.organizationDomain || result.domain),
      domainAliases: aliasArray,
      description: leadString(
        result.organizationDescription ||
          result.organizationDescriptionShort ||
          result.description
      ),
      industryName: leadString(result.organizationIndustryName || result.industryName),
      industryGroup: leadString(result.organizationIndustryGroup || result.industryGroup),
      employeeCountRange: leadString(
        result.organizationEmployeeCountRangeName || result.employeeCountRange
      ),
      revenueRange: leadString(result.organizationRevenueRange || result.revenueRange),
      companyType: leadString(result.organizationType || result.type),
      status: leadString(result.organizationStatus || result.status),
      yearFounded: leadString(result.organizationYearFounded ?? result.yearFounded),
      specialties: Array.isArray(specialties)
        ? leadStringList(specialties)?.join(', ')
        : leadString(specialties),
      technologies: techArray,
      street: leadString(
        address.organizationStreetName ||
          result.organizationStreetName ||
          result.organizationStreet ||
          result.street
      ),
      city: leadString(address.organizationCity || result.organizationCity || result.city),
      state: leadString(address.organizationState || result.organizationState || result.state),
      postalCode: leadString(
        address.organizationPostalCode || result.organizationPostalCode || result.postalCode
      ),
      country: leadString(
        address.organizationCountry || result.organizationCountry || result.country
      ),
      phone: leadString(address.organizationPhone || result.organizationPhone || result.phone),
      companyEmail: leadString(result.organizationEmail || result.email),
      linkedinUrl: leadString(
        social.organizationLinkedinUrl || result.organizationLinkedinUrl || result.linkedinUrl
      ),
      facebookUrl: leadString(
        social.organizationFacebookUrl || result.organizationFacebookUrl || result.facebookUrl
      ),
      twitterUrl: leadString(
        social.organizationTwitterUrl || result.organizationTwitterUrl || result.twitterUrl
      ),
      source: leadString(result.organizationSource || result.source)
    };

    let name = output.companyName || ctx.input.domain;
    return {
      output,
      message: `Domain **${ctx.input.domain}** identified as **${name}**${output.industryName ? ` (${output.industryName})` : ''}${output.employeeCountRange ? `, ${output.employeeCountRange} employees` : ''}.`
    };
  })
  .build();
