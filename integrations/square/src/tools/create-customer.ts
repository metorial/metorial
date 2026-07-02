import { SlateTool } from 'slates';
import { z } from 'zod';
import { squareServiceError } from '../lib/errors';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new customer profile. Provide at least one of: given name, family name, company name, email address, or phone number.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      givenName: z.string().optional().describe('Customer first name'),
      familyName: z.string().optional().describe('Customer last name'),
      companyName: z.string().optional().describe('Company or business name'),
      nickname: z.string().optional().describe('Customer nickname'),
      emailAddress: z.string().optional().describe('Customer email address'),
      phoneNumber: z.string().optional().describe('Customer phone number'),
      address: z
        .object({
          addressLine1: z.string().optional(),
          addressLine2: z.string().optional(),
          locality: z.string().optional().describe('City or town'),
          administrativeDistrictLevel1: z.string().optional().describe('State or province'),
          postalCode: z.string().optional(),
          country: z.string().optional().describe('Two-letter country code')
        })
        .optional()
        .describe('Customer address'),
      note: z.string().optional().describe('A note about the customer'),
      referenceId: z.string().optional().describe('Your custom reference ID'),
      birthday: z.string().optional().describe('Customer birthday in YYYY-MM-DD format'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key to prevent duplicates. Auto-generated if omitted')
    })
  )
  .output(
    z.object({
      customerId: z.string().optional(),
      givenName: z.string().optional(),
      familyName: z.string().optional(),
      emailAddress: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (
      !ctx.input.givenName &&
      !ctx.input.familyName &&
      !ctx.input.companyName &&
      !ctx.input.emailAddress &&
      !ctx.input.phoneNumber
    ) {
      throw squareServiceError(
        'Provide at least one of givenName, familyName, companyName, emailAddress, or phoneNumber.'
      );
    }

    let client = createClient(ctx.auth, ctx.config);

    let addressInput = ctx.input.address
      ? {
          address_line_1: ctx.input.address.addressLine1,
          address_line_2: ctx.input.address.addressLine2,
          locality: ctx.input.address.locality,
          administrative_district_level_1: ctx.input.address.administrativeDistrictLevel1,
          postal_code: ctx.input.address.postalCode,
          country: ctx.input.address.country
        }
      : undefined;

    let c = await client.createCustomer({
      givenName: ctx.input.givenName,
      familyName: ctx.input.familyName,
      companyName: ctx.input.companyName,
      nickname: ctx.input.nickname,
      emailAddress: ctx.input.emailAddress,
      phoneNumber: ctx.input.phoneNumber,
      address: addressInput,
      note: ctx.input.note,
      referenceId: ctx.input.referenceId,
      birthday: ctx.input.birthday,
      idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey()
    });

    return {
      output: {
        customerId: c.id,
        givenName: c.given_name,
        familyName: c.family_name,
        emailAddress: c.email_address,
        createdAt: c.created_at
      },
      message: `Customer **${c.id}** created — ${[c.given_name, c.family_name].filter(Boolean).join(' ') || c.email_address || 'New customer'}`
    };
  })
  .build();
