import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignPathClient } from '../lib/client';
import { spec } from '../spec';

export let getCertificate = SlateTool.create(spec, {
  name: 'Get Certificate',
  key: 'get_certificate',
  description: `Retrieve detailed metadata for a specific certificate by its slug, or retrieve the certificate associated with a specific project's signing policy. Use certificateSlug for direct lookup, or projectSlug + signingPolicySlug to get the certificate linked to a signing policy.`,
  instructions: [
    'Provide either certificateSlug for direct certificate lookup, or both projectSlug and signingPolicySlug to get a signing policy certificate.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      certificateSlug: z
        .string()
        .optional()
        .describe('Slug of the certificate to retrieve directly'),
      projectSlug: z
        .string()
        .optional()
        .describe('Project slug to look up the signing policy certificate'),
      signingPolicySlug: z
        .string()
        .optional()
        .describe('Signing policy slug to look up its associated certificate')
    })
  )
  .output(
    z.object({
      slug: z.string().optional().describe('Slug identifier of the certificate'),
      name: z.string().optional().describe('Name of the certificate'),
      thumbprint: z.string().describe('Certificate thumbprint'),
      isActive: z.boolean().optional().describe('Whether the certificate is active'),
      commonName: z.string().optional().describe('Common name (CN) of the certificate'),
      issuer: z.string().optional().describe('Certificate issuer'),
      validFrom: z.string().optional().describe('Certificate validity start date'),
      validTo: z.string().optional().describe('Certificate validity end date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignPathClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      baseUrl: ctx.config.baseUrl
    });

    if (ctx.input.projectSlug && ctx.input.signingPolicySlug) {
      let certInfo = await client.getCertificateForSigningPolicy(
        ctx.input.projectSlug,
        ctx.input.signingPolicySlug
      );

      return {
        output: {
          thumbprint: certInfo.thumbprint || '',
          commonName: certInfo.commonName,
          issuer: certInfo.issuer,
          validFrom: certInfo.validFrom,
          validTo: certInfo.validTo
        },
        message: `Certificate for signing policy **${ctx.input.signingPolicySlug}** in project **${ctx.input.projectSlug}**: ${certInfo.commonName || certInfo.thumbprint}`
      };
    }

    if (ctx.input.certificateSlug) {
      let cert = await client.getCertificate(ctx.input.certificateSlug);

      return {
        output: {
          slug: cert.slug,
          name: cert.name,
          thumbprint: cert.thumbprint || '',
          isActive: cert.isActive
        },
        message: `Certificate **${cert.name}** (${cert.slug}), thumbprint: ${cert.thumbprint}, active: ${cert.isActive}`
      };
    }

    throw new Error(
      'Provide either certificateSlug, or both projectSlug and signingPolicySlug.'
    );
  })
  .build();
