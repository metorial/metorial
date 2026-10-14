import { SlateTool } from 'slates';
import { z } from 'zod';
import { AddressZenClient } from '../lib/client';
import { spec } from '../spec';

export let validatePhone = SlateTool.create(spec, {
  name: 'Validate Phone Number',
  key: 'validate_phone',
  description: `Validate a phone number for correctness and obtain carrier information. Checks format, validity, and returns details about the phone number including type and carrier.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z
        .string()
        .describe(
          'Phone number to validate (include country code for international numbers, e.g., "+14155552671")'
        ),
      currentCarrier: z
        .boolean()
        .optional()
        .describe('Request the current carrier, including number-porting information')
    })
  )
  .output(
    z.object({
      valid: z.boolean().optional().describe('Whether the phone number is valid'),
      phoneNumber: z.string().optional().describe('The validated phone number'),
      localFormat: z.string().optional().describe('Phone number in local format'),
      internationalFormat: z
        .string()
        .optional()
        .describe('Phone number in international format'),
      countryCode: z.string().optional().describe('Country calling code'),
      countryIso: z.string().optional().describe('ISO country code'),
      lineType: z
        .string()
        .optional()
        .describe('Type of phone line (e.g., mobile, landline, voip)'),
      carrier: z.string().optional().describe('Phone carrier/operator name'),
      location: z.string().optional().describe('Geographic location of the phone number'),
      code: z.number().optional().describe('API response code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AddressZenClient(ctx.auth);

    let result = await client.validatePhoneNumber(
      ctx.input.phoneNumber,
      ctx.input.currentCarrier
    );
    let r = result.result || {};
    let carrier = r.current_carrier ?? r.original_carrier;

    let output = {
      valid: r.valid ?? undefined,
      phoneNumber: r.phone_number || r.number || ctx.input.phoneNumber,
      localFormat: r.local_format ?? r.national_format ?? undefined,
      internationalFormat: r.international_format ?? undefined,
      countryCode: r.country_code ?? undefined,
      countryIso: r.country_iso ?? r.iso_country ?? undefined,
      lineType: r.line_type ?? r.type ?? carrier?.network_type ?? undefined,
      carrier: r.carrier ?? carrier?.name ?? undefined,
      location: r.location ?? undefined,
      code: result.code
    };

    let validStatus =
      output.valid === true ? 'valid' : output.valid === false ? 'invalid' : 'unknown';

    return {
      output,
      message: `Phone number **${ctx.input.phoneNumber}** is **${validStatus}**.${output.lineType ? ` Type: ${output.lineType}.` : ''}${output.carrier ? ` Carrier: ${output.carrier}.` : ''}`
    };
  })
  .build();
