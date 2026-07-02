import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  name: z.string().optional().describe('Name of the person at the address'),
  companyName: z.string().optional().describe('Company name'),
  phone: z.string().optional().describe('Phone number'),
  addressLine1: z.string().describe('First line of the street address'),
  addressLine2: z.string().optional().describe('Second line of the street address'),
  addressLine3: z.string().optional().describe('Third line of the street address'),
  cityLocality: z.string().optional().describe('City or locality'),
  stateProvince: z.string().optional().describe('State or province'),
  postalCode: z.string().optional().describe('Postal or ZIP code'),
  countryCode: z.string().describe('Two-letter ISO country code (e.g. US, CA, GB)'),
  residential: z
    .enum(['unknown', 'yes', 'no'])
    .optional()
    .describe('Whether the address is residential')
});

let validationMessageSchema = z.object({
  code: z.string().describe('Message code'),
  message: z.string().describe('Human-readable message'),
  type: z.enum(['info', 'warning', 'error']).describe('Message severity'),
  detailCode: z.string().describe('Detailed message code')
});

export let validateAddress = SlateTool.create(spec, {
  name: 'Validate Address',
  key: 'validate_address',
  description: `Validate one or more shipping addresses to ensure they are accurate and deliverable. Supports addresses in over 160 countries. Returns a validation status, the matched/corrected address, and any warning or error messages. Use this before creating labels to avoid address correction surcharges.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      addresses: z.array(addressSchema).min(1).describe('One or more addresses to validate')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          status: z
            .enum(['verified', 'unverified', 'warning', 'error'])
            .describe('Validation status'),
          originalAddress: addressSchema.describe('The original address as submitted'),
          matchedAddress: addressSchema
            .nullable()
            .describe('The corrected/matched address, or null if not matched'),
          messages: z
            .array(validationMessageSchema)
            .describe('Validation messages with warnings or errors')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let apiAddresses = ctx.input.addresses.map(addr => ({
      name: addr.name,
      company_name: addr.companyName,
      phone: addr.phone,
      address_line1: addr.addressLine1,
      address_line2: addr.addressLine2,
      address_line3: addr.addressLine3,
      city_locality: addr.cityLocality,
      state_province: addr.stateProvince,
      postal_code: addr.postalCode,
      country_code: addr.countryCode,
      address_residential_indicator: addr.residential
    }));

    let results = await client.validateAddresses(apiAddresses);

    let mapped = results.map(r => ({
      status: r.status,
      originalAddress: mapAddress(r.original_address),
      matchedAddress: r.matched_address ? mapAddress(r.matched_address) : null,
      messages: r.messages.map(m => ({
        code: m.code,
        message: m.message,
        type: m.type,
        detailCode: m.detail_code
      }))
    }));

    let verified = mapped.filter(r => r.status === 'verified').length;
    let failed = mapped.filter(r => r.status === 'error' || r.status === 'unverified').length;

    return {
      output: { results: mapped },
      message: `Validated ${mapped.length} address(es): **${verified}** verified, **${failed}** failed.`
    };
  })
  .build();

let mapAddress = (addr: any) => ({
  name: addr.name,
  companyName: addr.company_name,
  phone: addr.phone,
  addressLine1: addr.address_line1,
  addressLine2: addr.address_line2,
  addressLine3: addr.address_line3,
  cityLocality: addr.city_locality,
  stateProvince: addr.state_province,
  postalCode: addr.postal_code,
  countryCode: addr.country_code,
  residential: addr.address_residential_indicator
});
