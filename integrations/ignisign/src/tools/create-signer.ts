import { SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let createSigner = SlateTool.create(spec, {
  name: 'Create Signer',
  key: 'create_signer',
  description: `Create a new signer for use in signature requests. The required inputs depend on the signer profile — use the "List Signer Profiles" tool first to determine which fields are needed.`,
  instructions: [
    'A signerProfileId is required and determines which inputs are mandatory.',
    'Common inputs include firstName, lastName, and email.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      signerProfileId: z
        .string()
        .describe(
          'Signer profile ID that determines the signature mechanism and required inputs'
        ),
      firstName: z.string().optional().describe('First name of the signer'),
      lastName: z.string().optional().describe('Last name of the signer'),
      email: z.string().optional().describe('Email address of the signer'),
      phoneNumber: z.string().optional().describe('Phone number of the signer (E.164 format)'),
      nationality: z
        .string()
        .optional()
        .describe('Nationality of the signer (ISO 3166-1 alpha-2 code)'),
      birthDate: z.string().optional().describe('Birth date of the signer (ISO 8601 format)'),
      birthPlace: z.string().optional().describe('Birth place of the signer'),
      birthCountry: z
        .string()
        .optional()
        .describe('Birth country of the signer (ISO 3166-1 alpha-2 code)')
    })
  )
  .output(
    z.object({
      signerId: z.string().describe('ID of the created signer'),
      authSecret: z.string().optional().describe('Auth secret for the signer (if provided)'),
      signerProfileId: z.string().optional().describe('The signer profile ID used'),
      result: z.any().optional().describe('Full creation response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.config.appId,
      appEnv: ctx.config.appEnv
    });

    let result = await client.createSigner({
      signerProfileId: ctx.input.signerProfileId,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      phoneNumber: ctx.input.phoneNumber,
      nationality: ctx.input.nationality,
      birthDate: ctx.input.birthDate,
      birthPlace: ctx.input.birthPlace,
      birthCountry: ctx.input.birthCountry
    });

    return {
      output: {
        signerId: result.signerId,
        authSecret: result.authSecret,
        signerProfileId: ctx.input.signerProfileId,
        result
      },
      message: `Signer **${result.signerId}** created successfully${ctx.input.email ? ` for ${ctx.input.email}` : ''}.`
    };
  })
  .build();
