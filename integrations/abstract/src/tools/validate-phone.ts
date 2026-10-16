import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbstractClient } from '../lib/client';
import { spec } from '../spec';

export let validatePhone = SlateTool.create(spec, {
  name: 'Validate Phone',
  key: 'validate_phone',
  description: `Validates a phone number and returns details including validity, carrier, line type, and location. Use this to verify phone numbers, detect line types (mobile, landline, VoIP), and identify the carrier.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      phone: z
        .string()
        .describe('The phone number to validate (include country code, e.g. +14152007986)'),
      country: z
        .string()
        .optional()
        .describe('Two-letter country code for numbers without an international calling code')
    })
  )
  .output(
    z.object({
      rawResponse: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete provider response, including unavailable values'),
      phone: z.string().describe('The phone number that was validated'),
      isValid: z.boolean().optional().describe('Whether the phone number is valid'),
      country: z
        .object({
          code: z.string().optional().describe('ISO country code'),
          name: z.string().optional().describe('Country name'),
          prefix: z.string().optional().describe('Country calling code prefix')
        })
        .optional()
        .describe('Country information for the phone number'),
      type: z
        .string()
        .optional()
        .describe('Line type (e.g. mobile, landline, voip, toll_free)'),
      location: z
        .string()
        .optional()
        .describe('Geographic location associated with the number'),
      carrier: z.string().optional().describe('Phone carrier/operator name'),
      internationalFormat: z
        .string()
        .optional()
        .describe('Phone number in international format'),
      localFormat: z.string().optional().describe('Phone number in local format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbstractClient(ctx.auth);

    let result = await client.validatePhone({
      phone: ctx.input.phone,
      country: ctx.input.country
    });

    let output = {
      rawResponse: result,
      phone: result.phone ?? ctx.input.phone,
      isValid: result.valid ?? undefined,
      country: result.country
        ? {
            code: result.country.code ?? undefined,
            name: result.country.name ?? undefined,
            prefix: result.country.prefix ?? undefined
          }
        : undefined,
      location: result.location ?? undefined,
      type: result.type ?? undefined,
      carrier: result.carrier ?? undefined,
      internationalFormat:
        result.format?.international ?? result.international_format ?? undefined,
      localFormat: result.format?.local ?? result.local_format ?? undefined
    };

    let validity = output.isValid ? 'valid' : output.isValid === false ? 'invalid' : 'unknown';
    return {
      output,
      message: `Phone number **${output.phone}** is **${validity}**${output.type ? ` (${output.type})` : ''}${output.carrier ? ` — carrier: ${output.carrier}` : ''}.`
    };
  })
  .build();
