import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addressAndFullNameMatch = SlateTool.create(spec, {
  name: 'Match Address and Full Name',
  key: 'match_address_and_full_name',
  description:
    'Generate a combined similarity key from an individual full name and street address for record linkage.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      fullName: z.string().describe('Individual full name to match'),
      address: z.string().describe('Street address to match')
    })
  )
  .output(
    z.object({
      data: z
        .record(z.string(), z.unknown())
        .describe(
          'The complete provider response, including result, status, and credit metadata'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.getAddressAndFullNameMatch(ctx.input.address, ctx.input.fullName);
    return {
      output: { data },
      message: 'Combined name and address similarity key generated.'
    };
  })
  .build();

export let companyAndAddressMatch = SlateTool.create(spec, {
  name: 'Match Company and Address',
  key: 'match_company_and_address',
  description:
    'Generate a combined similarity key from a company name and street address for organization record linkage.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      company: z.string().describe('Company or organization name to match'),
      address: z.string().describe('Street address to match')
    })
  )
  .output(
    z.object({
      data: z
        .record(z.string(), z.unknown())
        .describe(
          'The complete provider response, including result, status, and credit metadata'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.getCompanyAndAddressMatch(ctx.input.company, ctx.input.address);
    return {
      output: { data },
      message: 'Combined company and address similarity key generated.'
    };
  })
  .build();

export let companyAndFullNameMatch = SlateTool.create(spec, {
  name: 'Match Company and Full Name',
  key: 'match_company_and_full_name',
  description:
    'Generate a combined similarity key from a company name and individual full name for contact record linkage.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      company: z.string().describe('Company or organization name to match'),
      fullName: z.string().describe('Individual full name to match')
    })
  )
  .output(
    z.object({
      data: z
        .record(z.string(), z.unknown())
        .describe(
          'The complete provider response, including result, status, and credit metadata'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.getCompanyAndFullNameMatch(ctx.input.company, ctx.input.fullName);
    return {
      output: { data },
      message: 'Combined company and name similarity key generated.'
    };
  })
  .build();

export let getCountryInfo = SlateTool.create(spec, {
  name: 'Get Country Information',
  key: 'get_country_info',
  description:
    'Standardize a country name and retrieve country codes, currency information, internet suffix, and calling code.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      country: z.string().describe('Country name or variant to standardize'),
      algorithm: z
        .enum(['narrow', 'ai-plus', 'ai-medium'])
        .optional()
        .describe('Optional country standardization algorithm')
    })
  )
  .output(
    z.object({
      data: z
        .record(z.string(), z.unknown())
        .describe(
          'The complete provider response, including result, status, and credit metadata'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.getCountryInfo(ctx.input.country, ctx.input.algorithm);
    return {
      output: { data },
      message: 'Country information retrieved.'
    };
  })
  .build();

export let getOrganizationStandard = SlateTool.create(spec, {
  name: 'Get Organization Standard',
  key: 'get_organization_standard',
  description:
    'Retrieve the canonical organization name from the organization standardization API.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      organization: z.string().describe('Company or organization name to standardize')
    })
  )
  .output(
    z.object({
      data: z
        .record(z.string(), z.unknown())
        .describe(
          'The complete provider response, including result, status, and credit metadata'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.getOrganizationStandard(ctx.input.organization);
    return {
      output: { data },
      message: 'Organization name standardized.'
    };
  })
  .build();

export let getParentCompanyInfo = SlateTool.create(spec, {
  name: 'Get Parent Company Information',
  key: 'get_parent_company_info',
  description:
    'Retrieve company and parent ownership details using a company name or domain. This premium API consumes multiple credits per call.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      lookup: z.string().describe('Company name or domain to look up')
    })
  )
  .output(
    z.object({
      data: z
        .record(z.string(), z.unknown())
        .describe(
          'The complete provider response, including result, status, and credit metadata'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.getParentCompanyInfo(ctx.input.lookup);
    return {
      output: { data },
      message: 'Parent company information retrieved.'
    };
  })
  .build();
