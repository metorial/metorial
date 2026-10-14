import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSignPathClient } from '../lib/client';
import { spec } from '../spec';

export let getSigningPolicies = SlateTool.create(spec, {
  name: 'Get Signing Policies',
  key: 'get_signing_policies',
  description: `Retrieve signing policy information including the associated X.509 certificate and RSA key parameters. Filter by project and/or signing policy slug. If no filters are provided, returns all signing policies where the authenticated user is assigned as Submitter.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectSlug: z.string().optional().describe('Filter by project slug'),
      signingPolicySlug: z.string().optional().describe('Filter by signing policy slug')
    })
  )
  .output(
    z.object({
      signingPolicies: z
        .array(
          z.object({
            projectSlug: z.string().describe('Project slug for this signing policy'),
            signingPolicySlug: z.string().describe('Signing policy slug'),
            certificateThumbprint: z
              .string()
              .describe('Thumbprint of the associated certificate'),
            certificateCommonName: z
              .string()
              .describe('Common name of the associated certificate'),
            rsaModulusLengthInBits: z
              .number()
              .optional()
              .describe('RSA modulus length in bits, if applicable')
          })
        )
        .describe('List of signing policies with certificate and key information')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSignPathClient(ctx);

    let policies = await client.getSigningPolicies({
      projectSlug: ctx.input.projectSlug,
      signingPolicySlug: ctx.input.signingPolicySlug
    });

    let mapped = policies.map(p => {
      let certificate = p.certificateBytes
        ? client.certificateDetails(Buffer.from(p.certificateBytes, 'base64'))
        : undefined;
      return {
        projectSlug: p.projectSlug,
        signingPolicySlug: p.signingPolicySlug,
        certificateThumbprint: certificate?.thumbprint ?? '',
        certificateCommonName: certificate?.commonName ?? '',
        rsaModulusLengthInBits: p.keyType === 'Rsa' ? p.keySizeInBits : undefined
      };
    });

    return {
      output: { signingPolicies: mapped },
      message: `Found **${mapped.length}** signing policy/policies.`
    };
  })
  .build();
