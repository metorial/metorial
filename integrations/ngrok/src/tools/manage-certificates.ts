import { SlateTool } from 'slates';
import { z } from 'zod';
import { NgrokClient } from '../lib/client';
import { spec } from '../spec';

let tlsCertOutputSchema = z.object({
  certificateId: z.string().describe('TLS certificate ID'),
  uri: z.string().describe('API resource URI'),
  createdAt: z.string().describe('Creation timestamp'),
  description: z.string().describe('Description'),
  metadata: z.string().describe('Metadata'),
  subjectCommonName: z.string().describe('Certificate subject common name'),
  subjectAlternativeNames: z
    .object({
      dnsNames: z.array(z.string()),
      ips: z.array(z.string())
    })
    .optional()
    .nullable()
    .describe('Subject alternative names'),
  issuedAt: z.string().optional().nullable().describe('When the certificate was issued'),
  notBefore: z.string().optional().nullable().describe('Certificate validity start'),
  notAfter: z.string().optional().nullable().describe('Certificate expiry'),
  privateKeyType: z.string().describe('Private key type'),
  issuerCommonName: z.string().describe('Issuer common name'),
  serialNumber: z.string().describe('Certificate serial number')
});

let mapTlsCert = (c: any) => ({
  certificateId: c.id,
  uri: c.uri || '',
  createdAt: c.created_at || '',
  description: c.description || '',
  metadata: c.metadata || '',
  subjectCommonName: c.subject_common_name || '',
  subjectAlternativeNames: c.subject_alternative_names
    ? {
        dnsNames: c.subject_alternative_names.dns_names || [],
        ips: c.subject_alternative_names.ips || []
      }
    : null,
  issuedAt: c.issued_at || null,
  notBefore: c.not_before || null,
  notAfter: c.not_after || null,
  privateKeyType: c.private_key_type || '',
  issuerCommonName: c.issuer_common_name || '',
  serialNumber: c.serial_number || ''
});

let caOutputSchema = z.object({
  certificateAuthorityId: z.string().describe('Certificate authority ID'),
  uri: z.string().describe('API resource URI'),
  createdAt: z.string().describe('Creation timestamp'),
  description: z.string().describe('Description'),
  metadata: z.string().describe('Metadata'),
  subjectCommonName: z.string().describe('CA subject common name'),
  notBefore: z.string().optional().nullable().describe('Validity start'),
  notAfter: z.string().optional().nullable().describe('Validity end')
});

let mapCa = (c: any) => ({
  certificateAuthorityId: c.id,
  uri: c.uri || '',
  createdAt: c.created_at || '',
  description: c.description || '',
  metadata: c.metadata || '',
  subjectCommonName: c.subject_common_name || '',
  notBefore: c.not_before || null,
  notAfter: c.not_after || null
});

export let listTlsCertificates = SlateTool.create(spec, {
  name: 'List TLS Certificates',
  key: 'list_tls_certificates',
  description: `List all uploaded TLS certificates. TLS certificates can be attached to reserved domains to terminate TLS traffic.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beforeId: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Max results per page')
    })
  )
  .output(
    z.object({
      certificates: z.array(tlsCertOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listTlsCertificates({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let certificates = (result.tls_certificates || []).map(mapTlsCert);
    return {
      output: { certificates, nextPageUri: result.next_page_uri || null },
      message: `Found **${certificates.length}** TLS certificate(s).`
    };
  })
  .build();

export let getTlsCertificate = SlateTool.create(spec, {
  name: 'Get TLS Certificate',
  key: 'get_tls_certificate',
  description: `Retrieve details of a specific TLS certificate including subject, validity, and issuer information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      certificateId: z.string().describe('TLS certificate ID (e.g., crt_xxx)')
    })
  )
  .output(tlsCertOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let c = await client.getTlsCertificate(ctx.input.certificateId);
    return {
      output: mapTlsCert(c),
      message: `Retrieved TLS certificate **${c.id}** for ${c.subject_common_name}.`
    };
  })
  .build();

export let uploadTlsCertificate = SlateTool.create(spec, {
  name: 'Upload TLS Certificate',
  key: 'upload_tls_certificate',
  description: `Upload a TLS certificate and private key pair. The certificate must be PEM-encoded with the leaf certificate first. After upload, attach to a reserved domain.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      certificatePem: z.string().describe('PEM-encoded certificate chain (leaf first)'),
      privateKeyPem: z.string().describe('PEM-encoded private key'),
      description: z.string().optional().describe('Description (max 255 bytes)'),
      metadata: z.string().optional().describe('Metadata (max 4096 bytes)')
    })
  )
  .output(tlsCertOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let c = await client.createTlsCertificate({
      certificatePem: ctx.input.certificatePem,
      privateKeyPem: ctx.input.privateKeyPem,
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });
    return {
      output: mapTlsCert(c),
      message: `Uploaded TLS certificate **${c.id}** for ${c.subject_common_name}.`
    };
  })
  .build();

export let deleteTlsCertificate = SlateTool.create(spec, {
  name: 'Delete TLS Certificate',
  key: 'delete_tls_certificate',
  description: `Delete a TLS certificate. It must be detached from all domains first.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      certificateId: z.string().describe('TLS certificate ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.deleteTlsCertificate(ctx.input.certificateId);
    return {
      output: { success: true },
      message: `Deleted TLS certificate **${ctx.input.certificateId}**.`
    };
  })
  .build();

export let listCertificateAuthorities = SlateTool.create(spec, {
  name: 'List Certificate Authorities',
  key: 'list_certificate_authorities',
  description: `List all certificate authorities (CAs) used for mutual TLS (mTLS) authentication. CAs verify that client TLS certificates were signed by a trusted authority.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beforeId: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Max results per page')
    })
  )
  .output(
    z.object({
      certificateAuthorities: z.array(caOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listCertificateAuthorities({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let cas = (result.certificate_authorities || []).map(mapCa);
    return {
      output: { certificateAuthorities: cas, nextPageUri: result.next_page_uri || null },
      message: `Found **${cas.length}** certificate authority/authorities.`
    };
  })
  .build();

export let createCertificateAuthority = SlateTool.create(spec, {
  name: 'Create Certificate Authority',
  key: 'create_certificate_authority',
  description: `Upload a CA certificate for mutual TLS authentication. The CA will be used to verify client certificates presented during mTLS connections.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      caPem: z.string().describe('PEM-encoded CA certificate'),
      description: z.string().optional().describe('Description (max 255 bytes)'),
      metadata: z.string().optional().describe('Metadata (max 4096 bytes)')
    })
  )
  .output(caOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let ca = await client.createCertificateAuthority({
      caPem: ctx.input.caPem,
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });
    return {
      output: mapCa(ca),
      message: `Created certificate authority **${ca.id}** (${ca.subject_common_name}).`
    };
  })
  .build();

export let deleteCertificateAuthority = SlateTool.create(spec, {
  name: 'Delete Certificate Authority',
  key: 'delete_certificate_authority',
  description: `Delete a certificate authority. It must not be in use by any mTLS module.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      certificateAuthorityId: z.string().describe('Certificate authority ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.deleteCertificateAuthority(ctx.input.certificateAuthorityId);
    return {
      output: { success: true },
      message: `Deleted certificate authority **${ctx.input.certificateAuthorityId}**.`
    };
  })
  .build();
