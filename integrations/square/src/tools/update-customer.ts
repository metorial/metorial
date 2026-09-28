import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { squareServiceError } from '../lib/errors';
import { createClient, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';
import { customerOutputSchema, mapCustomer } from './shared';

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update an existing customer profile. Omitted fields remain unchanged; use null to clear a field or an address component.`
})
  .scopes(allOf('CUSTOMERS_WRITE'))
  .input(
    z.object({
      customerId: z.string().describe('The ID of the customer to update'),
      givenName: z
        .string()
        .max(300)
        .nullable()
        .optional()
        .describe('Updated first name; null clears it'),
      familyName: z
        .string()
        .max(300)
        .nullable()
        .optional()
        .describe('Updated last name; null clears it'),
      companyName: z
        .string()
        .max(500)
        .nullable()
        .optional()
        .describe('Updated company name; null clears it'),
      nickname: z
        .string()
        .max(100)
        .nullable()
        .optional()
        .describe('Updated nickname; null clears it'),
      emailAddress: z
        .string()
        .max(254)
        .nullable()
        .optional()
        .describe('Updated email address; null clears it'),
      phoneNumber: z
        .string()
        .nullable()
        .optional()
        .describe('Updated phone number; null clears it'),
      address: z
        .object({
          addressLine1: z.string().nullable().optional(),
          addressLine2: z.string().nullable().optional(),
          locality: z.string().nullable().optional(),
          administrativeDistrictLevel1: z.string().nullable().optional(),
          postalCode: z.string().nullable().optional(),
          country: z.string().nullable().optional()
        })
        .nullable()
        .optional()
        .describe(
          'Sparse address update; null clears the entire address, or use null within an address field to clear that component'
        ),
      note: z.string().nullable().optional().describe('Updated note; null clears it'),
      referenceId: z
        .string()
        .max(100)
        .nullable()
        .optional()
        .describe('Updated reference ID; null clears it'),
      birthday: z
        .string()
        .nullable()
        .optional()
        .describe('Updated birthday in YYYY-MM-DD or MM-DD format; null clears it'),
      version: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Current version for optimistic concurrency')
    })
  )
  .output(customerOutputSchema)
  .handleInvocation(async ctx => {
    if (
      ![
        'givenName',
        'familyName',
        'companyName',
        'nickname',
        'emailAddress',
        'phoneNumber',
        'address',
        'note',
        'referenceId',
        'birthday'
      ].some(key => ctx.input[key as keyof typeof ctx.input] !== undefined)
    ) {
      throw squareServiceError('Provide at least one customer field to update.');
    }
    if (
      ctx.input.address &&
      Object.values(ctx.input.address).every(value => value === undefined)
    ) {
      throw squareServiceError(
        'Provide at least one address field, or null to clear the address.'
      );
    }
    requireSquareScopes(ctx.auth, ['CUSTOMERS_WRITE']);
    let client = createClient(ctx.auth);
    let address =
      ctx.input.address === null
        ? null
        : ctx.input.address
          ? {
              address_line_1: ctx.input.address.addressLine1,
              address_line_2: ctx.input.address.addressLine2,
              locality: ctx.input.address.locality,
              administrative_district_level_1: ctx.input.address.administrativeDistrictLevel1,
              postal_code: ctx.input.address.postalCode,
              country: ctx.input.address.country
            }
          : undefined;
    let c = await client.updateCustomer(ctx.input.customerId, {
      givenName: ctx.input.givenName,
      familyName: ctx.input.familyName,
      companyName: ctx.input.companyName,
      nickname: ctx.input.nickname,
      emailAddress: ctx.input.emailAddress,
      phoneNumber: ctx.input.phoneNumber,
      address,
      note: ctx.input.note,
      referenceId: ctx.input.referenceId,
      birthday: ctx.input.birthday,
      version: ctx.input.version
    });

    return {
      output: mapCustomer(c),
      message: `Customer **${c.id}** updated — ${[c.given_name, c.family_name].filter(Boolean).join(' ') || c.email_address || 'Customer'}`
    };
  })
  .build();
