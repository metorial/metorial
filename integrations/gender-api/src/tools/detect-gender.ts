import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let localizationSchema = z.object({
  country: z
    .string()
    .optional()
    .describe(
      'ISO 3166-1 alpha-2 country code (e.g. "US", "DE", "IT") to improve prediction accuracy'
    ),
  locale: z
    .string()
    .optional()
    .describe('Browser locale string (e.g. "en_US", "de_DE") used to infer country'),
  ip: z
    .string()
    .optional()
    .describe('IPv4 or IPv6 address used for geolocation-based country inference')
});

let detailsSchema = z.object({
  creditsUsed: z.number().describe('Number of API credits consumed by this request'),
  samples: z.number().describe('Number of matching records found in the database'),
  country: z.string().nullable().describe('Country used for localization, if any'),
  firstNameSanitized: z.string().describe('Normalized lowercase version of the first name'),
  duration: z.string().describe('Server-side processing time')
});

export let detectGender = SlateTool.create(spec, {
  name: 'Detect Gender',
  key: 'detect_gender',
  description: `Predict the gender of a person based on their first name, full name, or email address. Returns the predicted gender (male, female, or unknown) along with a probability score and sample count. Optionally provide a country code, locale, or IP address to improve accuracy through localization — some names like "Andrea" differ by country.`,
  instructions: [
    'Provide exactly one of: firstName, fullName, or email.',
    "Use the country parameter with an ISO 3166-1 alpha-2 code for best accuracy when the person's country is known.",
    'When using fullName, enable strict mode if you want the API to only extract a last name when it can be confidently identified.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      firstName: z
        .string()
        .optional()
        .describe('A single first name to classify (e.g. "Elizabeth")'),
      fullName: z
        .string()
        .optional()
        .describe('A full name to split and classify (e.g. "Theresa Miller")'),
      email: z
        .string()
        .optional()
        .describe('An email address from which to extract and classify the name'),
      strict: z
        .boolean()
        .optional()
        .describe(
          'When using fullName, if true the API will not guess the last name when uncertain'
        ),
      country: localizationSchema.shape.country,
      locale: localizationSchema.shape.locale,
      ip: localizationSchema.shape.ip
    })
  )
  .output(
    z.object({
      gender: z.string().describe('Predicted gender: "male", "female", or "unknown"'),
      probability: z.number().describe('Confidence score between 0 and 1'),
      resultFound: z.boolean().describe('Whether a matching result was found in the database'),
      firstName: z.string().describe('The resolved first name'),
      lastName: z
        .string()
        .optional()
        .describe('The extracted last name (only for full name or email queries)'),
      details: detailsSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.firstName) {
      let result = await client.getGenderByFirstName({
        firstName: ctx.input.firstName,
        country: ctx.input.country,
        locale: ctx.input.locale,
        ip: ctx.input.ip
      });

      return {
        output: {
          gender: result.gender,
          probability: result.probability,
          resultFound: result.resultFound,
          firstName: result.firstName,
          details: result.details
        },
        message: `**${result.firstName}** is predicted as **${result.gender}** with ${Math.round(result.probability * 100)}% probability (${result.details.samples} samples).`
      };
    }

    if (ctx.input.fullName) {
      let result = await client.getGenderByFullName({
        fullName: ctx.input.fullName,
        country: ctx.input.country,
        locale: ctx.input.locale,
        ip: ctx.input.ip,
        strict: ctx.input.strict
      });

      return {
        output: {
          gender: result.gender,
          probability: result.probability,
          resultFound: result.resultFound,
          firstName: result.firstName,
          lastName: result.lastName,
          details: result.details
        },
        message: `**${result.firstName}${result.lastName ? ` ${result.lastName}` : ''}** is predicted as **${result.gender}** with ${Math.round(result.probability * 100)}% probability (${result.details.samples} samples).`
      };
    }

    if (ctx.input.email) {
      let result = await client.getGenderByEmail({
        email: ctx.input.email,
        country: ctx.input.country,
        locale: ctx.input.locale,
        ip: ctx.input.ip
      });

      return {
        output: {
          gender: result.gender,
          probability: result.probability,
          resultFound: result.resultFound,
          firstName: result.firstName,
          lastName: result.lastName,
          details: result.details
        },
        message: `Email **${ctx.input.email}** resolved to **${result.firstName}${result.lastName ? ` ${result.lastName}` : ''}**, predicted as **${result.gender}** with ${Math.round(result.probability * 100)}% probability.`
      };
    }

    throw new Error('Provide one of: firstName, fullName, or email.');
  })
  .build();
