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
        .describe('The phone number to validate (include country code, e.g. +14152007986)')
    })
  )
  .output(
    z.object({
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
      phone: ctx.input.phone
    });

    let output = {
      phone: result.phone ?? ctx.input.phone,
      isValid: result.valid ?? undefined,
      country: result.country
        ? {
            code: result.country.code ?? undefined,
            name: result.country.name ?? undefined,
            prefix: result.country.prefix ?? undefined
          }
        : undefined,
      type: result.type ?? undefined,
      carrier: result.carrier ?? undefined,
      internationalFormat: result.international_format ?? undefined,
      localFormat: result.local_format ?? undefined
    };

    let validity = output.isValid ? 'valid' : output.isValid === false ? 'invalid' : 'unknown';
    return {
      output,
      message: `Phone number **${output.phone}** is **${validity}**${output.type ? ` (${output.type})` : ''}${output.carrier ? ` — carrier: ${output.carrier}` : ''}.`
    };
  })
  .build();
