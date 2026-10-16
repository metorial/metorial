import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { optionalNumber, optionalString, requiredString } from '../lib/response';
import { spec } from '../spec';

export let getCompanyProfile = SlateTool.create(spec, {
  name: 'Get Company Profile',
  key: 'get_company_profile',
  description: `Retrieve comprehensive company profile information including description, sector, industry, CEO, employees, address, website, and logo URL.
Also fetches the company's logo URL when available.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Ticker symbol (e.g., "AAPL", "MSFT", "TSLA")'),
      exchange: z.string().optional().describe('Exchange where the instrument is traded'),
      country: z.string().optional().describe('Country of the exchange')
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Complete provider response, preserving unavailable values and metadata'),
      symbol: z.string().describe('Ticker symbol'),
      name: z.string().optional().describe('Company name'),
      exchange: z.string().optional().describe('Exchange'),
      sector: z.string().optional().describe('Business sector'),
      industry: z.string().optional().describe('Industry'),
      employees: z.number().optional().describe('Number of employees'),
      website: z.string().optional().describe('Company website URL'),
      description: z.string().optional().describe('Company description'),
      type: z.string().optional().describe('Instrument type'),
      ceo: z.string().optional().describe('CEO name'),
      address: z.string().optional().describe('Company address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('ZIP code'),
      country: z.string().optional().describe('Country'),
      phone: z.string().optional().describe('Phone number'),
      logoUrl: z.string().optional().describe('Company logo URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwelveDataClient(ctx.auth.token);

    let [profile, logo] = await Promise.all([
      client.getProfile({
        symbol: ctx.input.symbol,
        exchange: ctx.input.exchange,
        country: ctx.input.country
      }),
      client.getLogo({
        symbol: ctx.input.symbol,
        exchange: ctx.input.exchange,
        country: ctx.input.country
      })
    ]);

    return {
      output: {
        raw: { profile, logo },
        symbol: requiredString(profile.symbol, 'symbol'),
        name: optionalString(profile.name),
        exchange: optionalString(profile.exchange),
        sector: optionalString(profile.sector),
        industry: optionalString(profile.industry),
        employees: optionalNumber(profile.employees),
        website: optionalString(profile.website),
        description: optionalString(profile.description),
        type: optionalString(profile.type),
        ceo: optionalString(profile.CEO),
        address: optionalString(profile.address),
        city: optionalString(profile.city),
        state: optionalString(profile.state),
        zip: optionalString(profile.zip),
        country: optionalString(profile.country),
        phone: optionalString(profile.phone),
        logoUrl: optionalString(logo.url) ?? optionalString(logo.logo_base)
      },
      message: `Retrieved company profile and logo metadata for **${profile.symbol}**.`
    };
  })
  .build();
