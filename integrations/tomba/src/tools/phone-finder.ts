import { SlateTool } from 'slates';
import { z } from 'zod';
import { TombaClient } from '../lib/client';
import { spec } from '../spec';

let phoneResultSchema = z.object({
  valid: z.boolean().nullable().optional().describe('Whether the phone number is valid'),
  localFormat: z.string().nullable().optional().describe('Phone in local format'),
  intlFormat: z.string().nullable().optional().describe('Phone in international format'),
  e164Format: z.string().nullable().optional().describe('Phone in E.164 format'),
  countryCode: z.string().nullable().optional().describe('Country code'),
  lineType: z.string().nullable().optional().describe('Line type (mobile, landline, etc.)'),
  carrier: z.string().nullable().optional().describe('Carrier name')
});

export let phoneFinder = SlateTool.create(spec, {
  name: 'Phone Finder',
  key: 'phone_finder',
  description: `Discover phone numbers linked to an email address, domain, or LinkedIn URL. Returns validated phone data including format, country, line type, and carrier.`,
  instructions: ['Provide at least one of: email, domain, or LinkedIn URL.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address to find phone for'),
      domain: z.string().optional().describe('Domain name to find phone for'),
      linkedin: z.string().optional().describe('LinkedIn URL to find phone for'),
      returnAll: z
        .boolean()
        .optional()
        .describe('If true, returns all phone numbers found instead of just the primary one')
    })
  )
  .output(
    z.object({
      phones: z.array(phoneResultSchema).describe('List of phone numbers found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.phoneFinder({
      email: ctx.input.email,
      domain: ctx.input.domain,
      linkedin: ctx.input.linkedin,
      full: ctx.input.returnAll
    });

    let data = result.data;
    let phones: any[] = [];

    if (Array.isArray(data)) {
      phones = data;
    } else if (data) {
      phones = [data];
    }

    let mapped = phones.map((p: any) => ({
      valid: p.valid,
      localFormat: p.local_format,
      intlFormat: p.intl_format,
      e164Format: p.e164_format,
      countryCode: p.country_code,
      lineType: p.line_type,
      carrier: typeof p.carrier === 'string' ? p.carrier : p.carrier?.name
    }));

    return {
      output: {
        phones: mapped
      },
      message: `Found **${mapped.length}** phone number(s).`
    };
  })
  .build();
