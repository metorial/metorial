import { SlateTool } from 'slates';
import { z } from 'zod';
import { NgrokClient } from '../lib/client';
import { spec } from '../spec';

let refSchema = z
  .object({
    id: z.string().describe('Resource ID'),
    uri: z.string().describe('Resource URI')
  })
  .optional()
  .nullable();

let certMgmtStatusSchema = z
  .object({
    renewsAt: z.string().optional().nullable(),
    provisioningJob: z
      .object({
        errorCode: z.string().optional().nullable(),
        msg: z.string().optional().nullable(),
        startedAt: z.string().optional().nullable(),
        retriesAt: z.string().optional().nullable()
      })
      .optional()
      .nullable()
  })
  .optional()
  .nullable();

let domainOutputSchema = z.object({
  domainId: z.string().describe('Reserved domain ID'),
  domain: z.string().describe('Hostname'),
  uri: z.string().describe('API resource URI'),
  createdAt: z.string().describe('Creation timestamp'),
  description: z.string().describe('Description'),
  metadata: z.string().describe('Arbitrary metadata'),
  cnameTarget: z.string().optional().nullable().describe('CNAME target for DNS configuration'),
  certificate: refSchema.describe('Attached TLS certificate reference'),
  certificateManagementPolicy: z
    .object({
      authority: z.string().optional().nullable(),
      privateKeyType: z.string().optional().nullable()
    })
    .optional()
    .nullable()
    .describe('Automatic certificate management policy'),
  certificateManagementStatus: certMgmtStatusSchema.describe('Certificate management status'),
  acmeChallengeCnameTarget: z
    .string()
    .optional()
    .nullable()
    .describe('ACME challenge CNAME target')
});

let mapDomain = (d: any) => ({
  domainId: d.id,
  domain: d.domain,
  uri: d.uri,
  createdAt: d.created_at,
  description: d.description || '',
  metadata: d.metadata || '',
  cnameTarget: d.cname_target || null,
  certificate: d.certificate?.id ? { id: d.certificate.id, uri: d.certificate.uri } : null,
  certificateManagementPolicy: d.certificate_management_policy
    ? {
        authority: d.certificate_management_policy.authority,
        privateKeyType: d.certificate_management_policy.private_key_type
      }
    : null,
  certificateManagementStatus: d.certificate_management_status
    ? {
        renewsAt: d.certificate_management_status.renews_at,
        provisioningJob: d.certificate_management_status.provisioning_job
          ? {
              errorCode: d.certificate_management_status.provisioning_job.error_code,
              msg: d.certificate_management_status.provisioning_job.msg,
              startedAt: d.certificate_management_status.provisioning_job.started_at,
              retriesAt: d.certificate_management_status.provisioning_job.retries_at
            }
          : null
      }
    : null,
  acmeChallengeCnameTarget: d.acme_challenge_cname_target || null
});

export let listDomains = SlateTool.create(spec, {
  name: 'List Reserved Domains',
  key: 'list_domains',
  description: `List all reserved domains on your ngrok account. Reserved domains are hostnames you can listen for HTTP, HTTPS, or TLS traffic on. Supports pagination.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beforeId: z
        .string()
        .optional()
        .describe('Pagination cursor - return entries before this ID'),
      limit: z.number().optional().describe('Max results per page (default 100, max 100)')
    })
  )
  .output(
    z.object({
      domains: z.array(domainOutputSchema).describe('List of reserved domains'),
      nextPageUri: z.string().optional().nullable().describe('URI for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listDomains({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let domains = (result.reserved_domains || []).map(mapDomain);
    return {
      output: {
        domains,
        nextPageUri: result.next_page_uri || null
      },
      message: `Found **${domains.length}** reserved domain(s).`
    };
  })
  .build();

export let getDomain = SlateTool.create(spec, {
  name: 'Get Reserved Domain',
  key: 'get_domain',
  description: `Retrieve details of a specific reserved domain by its ID. Returns the full domain configuration including certificate and DNS settings.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      domainId: z.string().describe('Reserved domain ID (e.g., rd_xxx)')
    })
  )
  .output(domainOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let d = await client.getDomain(ctx.input.domainId);
    return {
      output: mapDomain(d),
      message: `Retrieved domain **${d.domain}** (${d.id}).`
    };
  })
  .build();

export let createDomain = SlateTool.create(spec, {
  name: 'Reserve Domain',
  key: 'create_domain',
  description: `Reserve a new domain (hostname) for receiving HTTP, HTTPS, or TLS traffic. You can use your own domain by creating a CNAME record. Optionally configure automatic TLS certificate management via Let's Encrypt or attach a custom certificate.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      domain: z
        .string()
        .describe('Hostname to reserve (e.g., app.example.com or *.example.com)'),
      description: z
        .string()
        .optional()
        .describe('Human-readable description (max 255 bytes)'),
      metadata: z.string().optional().describe('Arbitrary metadata string (max 4096 bytes)'),
      certificateId: z.string().optional().describe('ID of a TLS certificate to attach'),
      certificateManagementPolicy: z
        .object({
          authority: z.string().describe('Certificate authority (e.g., "letsencrypt")'),
          privateKeyType: z
            .string()
            .optional()
            .describe('Private key type (e.g., "ecdsa", "rsa")')
        })
        .optional()
        .describe(
          'Automatic certificate management policy (mutually exclusive with certificateId)'
        )
    })
  )
  .output(domainOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let d = await client.createDomain(ctx.input);
    return {
      output: mapDomain(d),
      message: `Reserved domain **${d.domain}** (${d.id}).${d.cname_target ? ` Point your CNAME to \`${d.cname_target}\`.` : ''}`
    };
  })
  .build();

export let updateDomain = SlateTool.create(spec, {
  name: 'Update Reserved Domain',
  key: 'update_domain',
  description: `Update an existing reserved domain's description, metadata, or certificate configuration.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      domainId: z.string().describe('Reserved domain ID to update'),
      description: z.string().optional().describe('New description'),
      metadata: z.string().optional().describe('New metadata'),
      certificateId: z.string().optional().describe('New TLS certificate ID to attach'),
      certificateManagementPolicy: z
        .object({
          authority: z.string().describe('Certificate authority'),
          privateKeyType: z.string().optional().describe('Private key type')
        })
        .optional()
        .nullable()
        .describe('New certificate management policy (null to remove)')
    })
  )
  .output(domainOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let d = await client.updateDomain(ctx.input.domainId, {
      description: ctx.input.description,
      metadata: ctx.input.metadata,
      certificateId: ctx.input.certificateId,
      certificateManagementPolicy: ctx.input.certificateManagementPolicy
    });
    return {
      output: mapDomain(d),
      message: `Updated domain **${d.domain}** (${d.id}).`
    };
  })
  .build();

export let deleteDomain = SlateTool.create(spec, {
  name: 'Delete Reserved Domain',
  key: 'delete_domain',
  description: `Release a reserved domain. The domain will no longer receive traffic and will become available for re-reservation.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      domainId: z.string().describe('Reserved domain ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.deleteDomain(ctx.input.domainId);
    return {
      output: { success: true },
      message: `Deleted domain **${ctx.input.domainId}**.`
    };
  })
  .build();
