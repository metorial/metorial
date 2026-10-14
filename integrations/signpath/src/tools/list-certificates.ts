import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSignPathClient } from '../lib/client';
import { spec } from '../spec';

export let listCertificates = SlateTool.create(spec, {
  name: 'List Certificates',
  key: 'list_certificates',
  description: `List all certificates in the organization. Returns certificate names and active status. Use get_certificate to retrieve the X.509 thumbprint and validity details.`,
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
    let client = createSignPathClient(ctx);

    let certificates = await client.listCertificates();

    let mapped = certificates.map(c => ({
      slug: c.slug || '',
      name: c.name || '',
      thumbprint: c.thumbprint ?? '',
      isActive: c.isActive ?? c.status === 'Valid'
    }));

    return {
      output: { certificates: mapped },
      message: `Found **${mapped.length}** certificate(s) in the organization.`
    };
  })
  .build();
