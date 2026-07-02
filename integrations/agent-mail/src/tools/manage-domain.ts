import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dnsRecordSchema = z.object({
  type: z.string().describe('DNS record type (TXT, MX, CNAME)'),
  name: z.string().describe('Record name'),
  value: z.string().describe('Record value'),
  status: z.string().describe('Verification status'),
  priority: z.number().optional().describe('Priority (for MX records)')
});

export let manageDomain = SlateTool.create(spec, {
  name: 'Manage Domain',
  key: 'manage_domain',
  description: `Create, verify, or delete a custom email domain. Use \`action\` to specify the operation:
- **create**: Register a new domain (returns DNS records to configure)
- **verify**: Trigger verification of DNS records for a pending domain
- **delete**: Remove a domain
Custom domains require a paid plan. After creating, configure the DNS records and then verify.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'verify', 'delete']).describe('Operation to perform'),
      domainId: z.string().optional().describe('Domain ID (required for verify and delete)'),
      domain: z
        .string()
        .optional()
        .describe('Domain name like "example.com" (required for create)'),
      feedbackEnabled: z
        .boolean()
        .optional()
        .describe('Enable bounce/complaint notifications (for create)')
    })
  )
  .output(
    z.object({
      domainId: z.string().optional().describe('Domain identifier'),
      domain: z.string().optional().describe('Domain name'),
      status: z.string().optional().describe('Domain verification status'),
      records: z.array(dnsRecordSchema).optional().describe('DNS records to configure'),
      deleted: z.boolean().optional().describe('Whether the domain was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    if (ctx.input.action === 'create') {
      if (!ctx.input.domain) throw new Error('domain is required for create action');

      let domain = await client.createDomain(
        ctx.input.domain,
        ctx.input.feedbackEnabled ?? true
      );

      return {
        output: {
          domainId: domain.domain_id,
          domain: domain.domain,
          status: domain.status,
          records: domain.records
        },
        message: `Created domain **${domain.domain}** (status: ${domain.status}). Configure the DNS records and then verify.`
      };
    }

    if (ctx.input.action === 'verify') {
      if (!ctx.input.domainId) throw new Error('domainId is required for verify action');

      let domain = await client.verifyDomain(ctx.input.domainId);

      return {
        output: {
          domainId: domain.domain_id,
          domain: domain.domain,
          status: domain.status,
          records: domain.records
        },
        message: `Verification triggered for **${domain.domain}** — status: ${domain.status}.`
      };
    }

    // delete
    if (!ctx.input.domainId) throw new Error('domainId is required for delete action');
    await client.deleteDomain(ctx.input.domainId);

    return {
      output: { deleted: true },
      message: `Deleted domain **${ctx.input.domainId}**.`
    };
  })
  .build();
