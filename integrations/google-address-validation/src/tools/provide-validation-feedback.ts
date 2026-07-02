import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAddressValidationActionScopes } from '../scopes';
import { spec } from '../spec';

export let provideValidationFeedback = SlateTool.create(spec, {
  name: 'Provide Validation Feedback',
  key: 'provide_validation_feedback',
  description: `Sends feedback to Google about the outcome of an address validation sequence. This should be the **last call** made after one or more validation attempts for the same address, once the transaction is concluded.

Helps Google improve future validation results by indicating whether the validated address, the original user-provided address, or a manually edited version was ultimately used.`,
  instructions: [
    'Call this once per address validation sequence, after the final decision on the address is made.',
    'Use the responseId from the first validation response in the sequence.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleAddressValidationActionScopes.provideValidationFeedback)
  .input(
    z.object({
      responseId: z
        .string()
        .describe(
          'The response ID from the first validation response in the sequence of validation attempts for this address'
        ),
      conclusion: z
        .enum([
          'VALIDATED_VERSION_USED',
          'USER_VERSION_USED',
          'UNVALIDATED_VERSION_USED',
          'UNUSED'
        ])
        .describe(
          'The outcome of the validation: VALIDATED_VERSION_USED (used the API-corrected address), USER_VERSION_USED (used the original user-provided address), UNVALIDATED_VERSION_USED (used a user-edited address without re-validating), UNUSED (transaction was abandoned)'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the feedback was submitted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.provideValidationFeedback({
      conclusion: ctx.input.conclusion,
      responseId: ctx.input.responseId
    });

    let conclusionDescriptions: Record<string, string> = {
      VALIDATED_VERSION_USED: 'the API-validated address was used',
      USER_VERSION_USED: 'the original user-provided address was used',
      UNVALIDATED_VERSION_USED: 'a user-edited but unvalidated address was used',
      UNUSED: 'the transaction was abandoned'
    };

    let description = conclusionDescriptions[ctx.input.conclusion] ?? ctx.input.conclusion;

    return {
      output: {
        success: true
      },
      message: `Feedback submitted: ${description}.`
    };
  })
  .build();
