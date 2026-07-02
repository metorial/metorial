import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignPathClient } from '../lib/client';
import { spec } from '../spec';

export let submitSigningRequest = SlateTool.create(spec, {
  name: 'Submit Signing Request',
  key: 'submit_signing_request',
  description: `Submit a new code signing request to SignPath. Provide the project, signing policy, and optionally an artifact configuration. Supports fast signing requests for hash data that return results immediately without queuing. User-defined parameters can be passed as key-value pairs.`,
  instructions: [
    'Set isFastSigningRequest to true for hash signing data to get immediate results.',
    'Use customParameters to pass user-defined parameters as key-value pairs.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectSlug: z.string().describe('Slug identifier of the project'),
      signingPolicySlug: z.string().describe('Slug identifier of the signing policy to use'),
      artifactConfigurationSlug: z
        .string()
        .optional()
        .describe('Slug identifier of the artifact configuration'),
      description: z
        .string()
        .optional()
        .describe('Optional description for the signing request'),
      isFastSigningRequest: z
        .boolean()
        .optional()
        .describe('Set to true for fast signing (hash data) that returns results immediately'),
      customParameters: z
        .record(z.string(), z.string())
        .optional()
        .describe('User-defined parameters as key-value pairs')
    })
  )
  .output(
    z.object({
      signingRequestId: z.string().describe('ID of the created signing request'),
      signingRequestUrl: z.string().describe('Full URL of the created signing request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignPathClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.submitSigningRequest({
      projectSlug: ctx.input.projectSlug,
      signingPolicySlug: ctx.input.signingPolicySlug,
      artifactConfigurationSlug: ctx.input.artifactConfigurationSlug,
      description: ctx.input.description,
      isFastSigningRequest: ctx.input.isFastSigningRequest,
      parameters: ctx.input.customParameters
    });

    return {
      output: result,
      message: `Signing request submitted successfully. Request ID: **${result.signingRequestId}**`
    };
  })
  .build();
