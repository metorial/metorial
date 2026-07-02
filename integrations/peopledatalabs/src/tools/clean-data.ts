import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cleanCompany = SlateTool.create(spec, {
  name: 'Clean Company Name',
  key: 'clean_company',
  description: `Standardize a raw company name string using PDL's data cleansing API. Returns the cleaned, canonical company name along with identifiers. Useful for normalizing company names before using them in enrichment or search queries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyName: z.string().describe('Raw company name to clean (e.g. "google inc")')
    })
  )
  .output(
    z.object({
      cleanedName: z
        .string()
        .nullable()
        .optional()
        .describe('Cleaned, canonical company name'),
      fuzzyMatch: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether the match was fuzzy rather than exact'),
      websiteUrl: z.string().nullable().optional().describe('Company website URL'),
      linkedinUrl: z.string().nullable().optional().describe('Company LinkedIn URL'),
      facebookUrl: z.string().nullable().optional().describe('Company Facebook URL'),
      twitterUrl: z.string().nullable().optional().describe('Company Twitter URL'),
      companyId: z.string().nullable().optional().describe('PDL company identifier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      sandbox: ctx.config.sandbox
    });

    let result = await client.cleanCompany(ctx.input.companyName);

    return {
      output: {
        cleanedName: result.name ?? null,
        fuzzyMatch: result.fuzzy_match ?? null,
        websiteUrl: result.website ?? null,
        linkedinUrl: result.linkedin_url ?? null,
        facebookUrl: result.facebook_url ?? null,
        twitterUrl: result.twitter_url ?? null,
        companyId: result.id ?? null
      },
      message: result.name
        ? `"${ctx.input.companyName}" → **${result.name}**${result.fuzzy_match ? ' (fuzzy match)' : ''}`
        : `No match found for "${ctx.input.companyName}".`
    };
  })
  .build();

export let cleanLocation = SlateTool.create(spec, {
  name: 'Clean Location',
  key: 'clean_location',
  description: `Standardize a raw location string into structured, canonical location data using PDL's data cleansing API. Returns parsed and normalized location components. Useful for normalizing location data before using it in enrichment or search queries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      location: z
        .string()
        .describe('Raw location string to clean (e.g. "sf bay area" or "new york, ny")')
    })
  )
  .output(
    z.object({
      cleanedName: z.string().nullable().optional().describe('Full cleaned location name'),
      locality: z.string().nullable().optional().describe('City/locality'),
      region: z.string().nullable().optional().describe('State/region'),
      country: z.string().nullable().optional().describe('Country name'),
      continent: z.string().nullable().optional().describe('Continent name'),
      postalCode: z.string().nullable().optional().describe('Postal/zip code'),
      streetAddress: z.string().nullable().optional().describe('Street address'),
      addressLine2: z.string().nullable().optional(),
      metro: z.string().nullable().optional().describe('Metropolitan area'),
      geo: z.string().nullable().optional().describe('Latitude,longitude coordinates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      sandbox: ctx.config.sandbox
    });

    let result = await client.cleanLocation(ctx.input.location);

    return {
      output: {
        cleanedName: result.name ?? null,
        locality: result.locality ?? null,
        region: result.region ?? null,
        country: result.country ?? null,
        continent: result.continent ?? null,
        postalCode: result.postal_code ?? null,
        streetAddress: result.street_address ?? null,
        addressLine2: result.address_line_2 ?? null,
        metro: result.metro ?? null,
        geo: result.geo ?? null
      },
      message: result.name
        ? `"${ctx.input.location}" → **${result.name}**`
        : `No match found for "${ctx.input.location}".`
    };
  })
  .build();

export let cleanSchool = SlateTool.create(spec, {
  name: 'Clean School Name',
  key: 'clean_school',
  description: `Standardize a raw school name string using PDL's data cleansing API. Returns the cleaned, canonical school name along with identifiers. Useful for normalizing school names before using them in enrichment or search queries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      schoolName: z.string().describe('Raw school name to clean (e.g. "mit" or "stanford u")')
    })
  )
  .output(
    z.object({
      cleanedName: z.string().nullable().optional().describe('Cleaned, canonical school name'),
      fuzzyMatch: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether the match was fuzzy rather than exact'),
      type: z
        .string()
        .nullable()
        .optional()
        .describe('School type (e.g. "university", "college")'),
      websiteUrl: z.string().nullable().optional().describe('School website URL'),
      linkedinUrl: z.string().nullable().optional().describe('School LinkedIn URL'),
      facebookUrl: z.string().nullable().optional().describe('School Facebook URL'),
      twitterUrl: z.string().nullable().optional().describe('School Twitter URL'),
      locationName: z.string().nullable().optional().describe('School location'),
      schoolId: z.string().nullable().optional().describe('PDL school identifier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      sandbox: ctx.config.sandbox
    });

    let result = await client.cleanSchool(ctx.input.schoolName);

    return {
      output: {
        cleanedName: result.name ?? null,
        fuzzyMatch: result.fuzzy_match ?? null,
        type: result.type ?? null,
        websiteUrl: result.website ?? null,
        linkedinUrl: result.linkedin_url ?? null,
        facebookUrl: result.facebook_url ?? null,
        twitterUrl: result.twitter_url ?? null,
        locationName: result.location?.name ?? null,
        schoolId: result.id ?? null
      },
      message: result.name
        ? `"${ctx.input.schoolName}" → **${result.name}**${result.type ? ` (${result.type})` : ''}${result.fuzzy_match ? ' (fuzzy match)' : ''}`
        : `No match found for "${ctx.input.schoolName}".`
    };
  })
  .build();
