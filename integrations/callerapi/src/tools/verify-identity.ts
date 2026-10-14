import { createApiServiceError, isApiErrorRecord, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let matchScoreSchema = z
  .string()
  .optional()
  .describe(
    'Carrier match score: -1 means unknown, 0 means no match, and 100 means an exact match'
  );

export let verifyIdentity = SlateTool.create(spec, {
  name: 'Verify Identity',
  key: 'verify_identity',
  description:
    'Compare a phone number owner’s name and optional identity details against mobile network operator records. Returns match scores for each identity field.',
  instructions: [
    'Phone numbers must be in E.164 format (e.g., +16502530000)',
    'This operation consumes account credits. A score of -1 means the carrier has no data for comparison.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      phoneNumber: z.string().describe('Phone number in E.164 format (e.g., +16502530000)'),
      name: z.object({
        firstName: z.string().describe('First name to compare with carrier records'),
        middleName: z
          .string()
          .optional()
          .describe('Middle name to compare with carrier records'),
        lastName: z.string().describe('Last name to compare with carrier records')
      }),
      dateOfBirth: z
        .object({
          day: z.string().optional().describe('Birth day as text'),
          month: z.string().optional().describe('Birth month as text'),
          year: z.string().optional().describe('Birth year as text')
        })
        .optional(),
      address: z
        .object({
          street: z.string().optional().describe('Street name'),
          streetNumber: z.string().optional().describe('Street number'),
          unitNumber: z.string().optional().describe('Unit number'),
          city: z.string().optional().describe('City'),
          state: z.string().optional().describe('State or province'),
          postcode: z.string().optional().describe('Postal code'),
          country: z.string().optional().describe('Country code, for example CA')
        })
        .optional(),
      email: z.string().optional().describe('Email address to compare with carrier records')
    })
  )
  .output(
    z.object({
      kycResults: z
        .object({
          firstNameScore: matchScoreSchema,
          lastNameScore: matchScoreSchema,
          nameScore: matchScoreSchema,
          addressScore: matchScoreSchema,
          cityScore: matchScoreSchema,
          countryScore: matchScoreSchema,
          dateOfBirthScore: matchScoreSchema,
          postcodeScore: matchScoreSchema,
          emailScore: matchScoreSchema
        })
        .optional(),
      rawResponse: z.any().optional().describe('Full raw API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.verifyIdentity(
      ctx.input.phoneNumber,
      pickDefined({
        name: pickDefined({
          first_name: ctx.input.name.firstName,
          middle_name: ctx.input.name.middleName,
          last_name: ctx.input.name.lastName
        }),
        dob: ctx.input.dateOfBirth,
        address: ctx.input.address
          ? pickDefined({
              street: ctx.input.address.street,
              street_no: ctx.input.address.streetNumber,
              unit_no: ctx.input.address.unitNumber,
              city: ctx.input.address.city,
              state: ctx.input.address.state,
              postcode: ctx.input.address.postcode,
              country: ctx.input.address.country
            })
          : undefined,
        email: ctx.input.email
      })
    );
    let scores = result.kyc_results;
    if (!isApiErrorRecord(result.kyc_results)) {
      throw createApiServiceError(
        'CallerAPI returned identity verification without match scores.'
      );
    }

    return {
      output: {
        kycResults: scores
          ? {
              firstNameScore: scores.first_name_score,
              lastNameScore: scores.last_name_score,
              nameScore: scores.name_score,
              addressScore: scores.address_score,
              cityScore: scores.city_score,
              countryScore: scores.country_score,
              dateOfBirthScore: scores.dob_score,
              postcodeScore: scores.postcode_score,
              emailScore: scores.email_score
            }
          : undefined,
        rawResponse: result
      },
      message: `Retrieved identity match scores for **${ctx.input.phoneNumber}**.`
    };
  })
  .build();
