import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignPathClient } from '../lib/client';
import { spec } from '../spec';

export let listCertificates = SlateTool.create(spec, {
  name: 'List Certificates',
  key: 'list_certificates',
  description: `List all certificates in the organization. Returns certificate metadata including name, thumbprint, active status, and certificate chain information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      certificates: z
        .array(
          z.object({
            slug: z.string().describe('Slug identifier of the certificate'),
            name: z.string().describe('Name of the certificate'),
            thumbprint: z.string().describe('Certificate thumbprint'),
            isActive: z.boolean().describe('Whether the certificate is active')
          })
        )
        .describe('List of all certificates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignPathClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      baseUrl: ctx.config.baseUrl
    });

    let certificates = await client.listCertificates();

    let mapped = certificates.map(c => ({
      slug: c.slug || '',
      name: c.name || '',
      thumbprint: c.thumbprint || '',
      isActive: c.isActive ?? true
    }));

    return {
      output: { certificates: mapped },
      message: `Found **${mapped.length}** certificate(s) in the organization.`
    };
  })
  .build();
