import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createSignPathClient } from '../lib/client';
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
    let client = createSignPathClient(ctx);

    let policyLookup = Boolean(ctx.input.projectSlug && ctx.input.signingPolicySlug);
    if (ctx.input.certificateSlug && (ctx.input.projectSlug || ctx.input.signingPolicySlug)) {
      throw createApiServiceError(
        'Provide certificateSlug alone, or both projectSlug and signingPolicySlug.'
      );
    }
    if (!ctx.input.certificateSlug && !policyLookup) {
      throw createApiServiceError(
        'Provide either certificateSlug, or both projectSlug and signingPolicySlug.'
      );
    }
    let cert = ctx.input.certificateSlug
      ? await client.getCertificate(ctx.input.certificateSlug)
      : await client.getCertificateForSigningPolicy(
          ctx.input.projectSlug ?? '',
          ctx.input.signingPolicySlug ?? ''
        );
    let details = cert.x509CertificateData ?? cert.x509Certificate;
    let thumbprint = await client.getCertificateThumbprint(cert);
    return {
      output: {
        slug: cert.slug,
        name: cert.name,
        thumbprint,
        isActive: cert.isActive ?? cert.status === 'Valid',
        commonName: details?.subjectNameParts?.commonName,
        issuer: details?.x509CertificateChain?.[0]?.issuer ?? undefined,
        validFrom: details?.validFrom ?? undefined,
        validTo: details?.validTo ?? undefined
      },
      message: `Certificate **${cert.name}** (${cert.slug}) is ${cert.status}.`
    };
  })
  .build();
