import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createSignPathClient } from '../lib/client';
import { spec } from '../spec';

export let submitSigningRequest = SlateTool.create(spec, {
  name: 'Submit Signing Request',
  key: 'submit_signing_request',
  description: `Submit a new code signing request to SignPath. Provide an artifact file as Base64, its filename, the project, and signing policy. Fast requests use hashSigningData and return a downloadable signature result immediately. User-defined parameters can be passed as key-value pairs.`,
  instructions: [
    'Provide artifactBase64 and artifactFilename for normal artifact signing. For immediate hash signing, set isFastSigningRequest to true and provide hashSigningData.',
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
      artifactBase64: z
        .string()
        .optional()
        .describe(
          'Base64-encoded artifact file; required unless isFastSigningRequest is true'
        ),
      artifactFilename: z
        .string()
        .optional()
        .describe('Artifact filename, including its extension; required for artifact signing'),
      hashSigningData: z
        .object({
          hash: z.string().min(1).describe('Base64-encoded hash to sign'),
          signatureAlgorithm: z
            .enum(['Rsa', 'Ecdsa'])
            .describe('Signature algorithm matching the signing policy key'),
          rsaOptions: z
            .object({
              hashAlgorithmName: z.enum(['Sha1', 'Sha256', 'Sha384', 'Sha512']).optional(),
              hashAlgorithmOid: z.string().optional(),
              paddingMode: z.enum(['Pkcs1', 'Pss']).default('Pkcs1')
            })
            .optional()
            .describe('RSA options. Provide either hashAlgorithmName or hashAlgorithmOid.'),
          ecdsaOptions: z
            .object({ signatureFormat: z.enum(['Ieee', 'Asn1']).default('Ieee') })
            .optional()
            .describe('ECDSA signature format'),
          metadata: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Optional auditing metadata')
        })
        .optional()
        .describe('Required for fast hash signing; do not combine with artifactBase64'),
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
    let client = createSignPathClient(ctx);

    let result: { signingRequestId: string; signingRequestUrl: string };
    if (ctx.input.isFastSigningRequest) {
      let data = ctx.input.hashSigningData;
      if (
        !data ||
        ctx.input.artifactBase64 !== undefined ||
        ctx.input.artifactFilename !== undefined ||
        ctx.input.customParameters !== undefined
      ) {
        throw createApiServiceError(
          'Fast signing requires hashSigningData and does not accept artifactBase64, artifactFilename, or customParameters.'
        );
      }
      if (
        data.signatureAlgorithm === 'Rsa' &&
        (!data.rsaOptions ||
          Boolean(data.rsaOptions.hashAlgorithmName) ===
            Boolean(data.rsaOptions.hashAlgorithmOid) ||
          data.ecdsaOptions)
      ) {
        throw createApiServiceError(
          'RSA hash signing requires rsaOptions with exactly one hash algorithm name or OID, and no ecdsaOptions.'
        );
      }
      if (data.signatureAlgorithm === 'Ecdsa' && data.rsaOptions) {
        throw createApiServiceError('ECDSA hash signing does not accept rsaOptions.');
      }
      let hashResult = await client.signHash({
        projectSlug: ctx.input.projectSlug,
        signingPolicySlug: ctx.input.signingPolicySlug,
        artifactConfigurationSlug: ctx.input.artifactConfigurationSlug,
        description: ctx.input.description,
        hashSigningData: data
      });
      await ctx.addAttachment({
        type: 'content',
        content: new Response(JSON.stringify(hashResult), {
          headers: { 'content-type': 'application/json' }
        }),
        filename: 'HashSigningResult.json'
      });
      result = {
        signingRequestId: hashResult.signingRequestId,
        signingRequestUrl: hashResult.webLink
      };
    } else {
      if (
        !ctx.input.artifactBase64 ||
        !ctx.input.artifactFilename ||
        ctx.input.hashSigningData
      ) {
        throw createApiServiceError(
          'Provide artifactBase64 and artifactFilename for artifact signing. Use isFastSigningRequest with hashSigningData for hash signing.'
        );
      }
      let base64 = ctx.input.artifactBase64.replace(/\s/g, '');
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) {
        throw createApiServiceError(
          'artifactBase64 must contain valid Base64-encoded file contents.'
        );
      }
      result = await client.submitSigningRequest({
        projectSlug: ctx.input.projectSlug,
        signingPolicySlug: ctx.input.signingPolicySlug,
        artifactConfigurationSlug: ctx.input.artifactConfigurationSlug,
        description: ctx.input.description,
        artifact: new Blob([Buffer.from(base64, 'base64')]),
        artifactFilename: ctx.input.artifactFilename,
        parameters: ctx.input.customParameters
      });
    }

    return {
      output: result,
      message: `Signing request submitted successfully. Request ID: **${result.signingRequestId}**`
    };
  })
  .build();
