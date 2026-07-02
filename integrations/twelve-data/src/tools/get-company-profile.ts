import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
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
      client
        .getLogo({
          symbol: ctx.input.symbol,
          exchange: ctx.input.exchange,
          country: ctx.input.country
        })
        .catch(() => null)
    ]);

    return {
      output: {
        symbol: profile.symbol || ctx.input.symbol,
        name: profile.name,
        exchange: profile.exchange,
        sector: profile.sector,
        industry: profile.industry,
        employees: profile.employees,
        website: profile.website,
        description: profile.description,
        type: profile.type,
        ceo: profile.CEO,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        zip: profile.zip,
        country: profile.country,
        phone: profile.phone,
        logoUrl: logo?.url || logo?.logo_base
      },
      message: `**${profile.name || ctx.input.symbol}** — ${profile.sector || 'N/A'} / ${profile.industry || 'N/A'}. ${profile.employees ? `${profile.employees.toLocaleString()} employees.` : ''}`
    };
  })
  .build();
