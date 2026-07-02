import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignPathClient } from '../lib/client';
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
    let client = new SignPathClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      baseUrl: ctx.config.baseUrl
    });

    let policies = await client.getSigningPolicies({
      projectSlug: ctx.input.projectSlug,
      signingPolicySlug: ctx.input.signingPolicySlug
    });

    let mapped = policies.map(p => ({
      projectSlug: p.projectSlug || '',
      signingPolicySlug: p.signingPolicySlug || '',
      certificateThumbprint: p.certificate?.thumbprint || '',
      certificateCommonName: p.certificate?.commonName || '',
      rsaModulusLengthInBits: p.rsaKeyParameters?.modulusLengthInBits
    }));

    return {
      output: { signingPolicies: mapped },
      message: `Found **${mapped.length}** signing policy/policies.`
    };
  })
  .build();
