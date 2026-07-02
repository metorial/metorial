import { SlateTool } from 'slates';
import { z } from 'zod';
import { NgrokClient } from '../lib/client';
import { spec } from '../spec';

let sshCredentialOutputSchema = z.object({
  sshCredentialId: z.string().describe('SSH credential ID'),
  uri: z.string().describe('API resource URI'),
  createdAt: z.string().describe('Creation timestamp'),
  description: z.string().describe('Description'),
  metadata: z.string().describe('Metadata'),
  publicKey: z.string().describe('SSH public key'),
  acl: z.array(z.string()).describe('ACL bind rules'),
  ownerId: z.string().describe('Owner ID')
});

let mapSshCredential = (c: any) => ({
  sshCredentialId: c.id,
  uri: c.uri || '',
  createdAt: c.created_at || '',
  description: c.description || '',
  metadata: c.metadata || '',
  publicKey: c.public_key || '',
  acl: c.acl || [],
  ownerId: c.owner_id || ''
});

let sshCaOutputSchema = z.object({
  sshCaId: z.string().describe('SSH certificate authority ID'),
  uri: z.string().describe('API resource URI'),
  createdAt: z.string().describe('Creation timestamp'),
  description: z.string().describe('Description'),
  metadata: z.string().describe('Metadata'),
  publicKey: z.string().describe('CA public key'),
  keyType: z.string().describe('Key type (rsa, ecdsa, ed25519)')
});

let mapSshCa = (c: any) => ({
  sshCaId: c.id,
  uri: c.uri || '',
  createdAt: c.created_at || '',
  description: c.description || '',
  metadata: c.metadata || '',
  publicKey: c.public_key || '',
  keyType: c.key_type || ''
});

export let listSshCredentials = SlateTool.create(spec, {
  name: 'List SSH Credentials',
  key: 'list_ssh_credentials',
  description: `List all SSH public keys registered for tunnel authentication. SSH credentials authorize SSH reverse tunnel connections.`,
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
      sshCredentials: z.array(sshCredentialOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listSshCredentials({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let credentials = (result.ssh_credentials || []).map(mapSshCredential);
    return {
      output: { sshCredentials: credentials, nextPageUri: result.next_page_uri || null },
      message: `Found **${credentials.length}** SSH credential(s).`
    };
  })
  .build();

export let createSshCredential = SlateTool.create(spec, {
  name: 'Create SSH Credential',
  key: 'create_ssh_credential',
  description: `Register an SSH public key for tunnel authentication. The key can optionally be restricted with ACL bind rules.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      publicKey: z.string().describe('SSH public key (e.g., "ssh-ed25519 AAAA...")'),
      description: z.string().optional().describe('Description (max 255 bytes)'),
      metadata: z.string().optional().describe('Metadata (max 4096 bytes)'),
      acl: z.array(z.string()).optional().describe('ACL bind rules'),
      ownerId: z.string().optional().describe('Owner user or bot user ID')
    })
  )
  .output(sshCredentialOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let c = await client.createSshCredential({
      publicKey: ctx.input.publicKey,
      description: ctx.input.description,
      metadata: ctx.input.metadata,
      acl: ctx.input.acl,
      ownerId: ctx.input.ownerId
    });
    return {
      output: mapSshCredential(c),
      message: `Created SSH credential **${c.id}**.`
    };
  })
  .build();

export let deleteSshCredential = SlateTool.create(spec, {
  name: 'Delete SSH Credential',
  key: 'delete_ssh_credential',
  description: `Delete an SSH credential. SSH connections using this key will no longer be authenticated.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      sshCredentialId: z.string().describe('SSH credential ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.deleteSshCredential(ctx.input.sshCredentialId);
    return {
      output: { success: true },
      message: `Deleted SSH credential **${ctx.input.sshCredentialId}**.`
    };
  })
  .build();

export let listSshCertificateAuthorities = SlateTool.create(spec, {
  name: 'List SSH Certificate Authorities',
  key: 'list_ssh_certificate_authorities',
  description: `List all SSH certificate authorities. SSH CAs are key pairs used to sign SSH host and user certificates.`,
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
      sshCertificateAuthorities: z.array(sshCaOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listSshCertificateAuthorities({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let cas = (result.ssh_certificate_authorities || []).map(mapSshCa);
    return {
      output: { sshCertificateAuthorities: cas, nextPageUri: result.next_page_uri || null },
      message: `Found **${cas.length}** SSH certificate authority/authorities.`
    };
  })
  .build();

export let createSshCertificateAuthority = SlateTool.create(spec, {
  name: 'Create SSH Certificate Authority',
  key: 'create_ssh_certificate_authority',
  description: `Create a new SSH certificate authority key pair for signing SSH host and user certificates.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      privateKeyType: z
        .enum(['rsa', 'ecdsa', 'ed25519'])
        .optional()
        .describe('Key type (default ed25519)'),
      ellipticCurve: z.string().optional().describe('Elliptic curve (for ECDSA only)'),
      keySize: z.number().optional().describe('Key size (for RSA: 2048 or 4096)'),
      description: z.string().optional().describe('Description (max 255 bytes)'),
      metadata: z.string().optional().describe('Metadata (max 4096 bytes)')
    })
  )
  .output(sshCaOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let ca = await client.createSshCertificateAuthority({
      privateKeyType: ctx.input.privateKeyType,
      ellipticCurve: ctx.input.ellipticCurve,
      keySize: ctx.input.keySize,
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });
    return {
      output: mapSshCa(ca),
      message: `Created SSH CA **${ca.id}** (${ca.key_type}).`
    };
  })
  .build();

export let deleteSshCertificateAuthority = SlateTool.create(spec, {
  name: 'Delete SSH Certificate Authority',
  key: 'delete_ssh_certificate_authority',
  description: `Delete an SSH certificate authority. Certificates signed by this CA will no longer be valid.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      sshCaId: z.string().describe('SSH certificate authority ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.deleteSshCertificateAuthority(ctx.input.sshCaId);
    return {
      output: { success: true },
      message: `Deleted SSH certificate authority **${ctx.input.sshCaId}**.`
    };
  })
  .build();
