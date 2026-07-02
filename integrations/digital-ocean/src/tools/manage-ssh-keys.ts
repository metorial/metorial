import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { digitalOceanValidationError } from '../lib/errors';
import { spec } from '../spec';

export let manageSSHKeys = SlateTool.create(spec, {
  name: 'Manage SSH Keys',
  key: 'manage_ssh_keys',
  description: `List, create, or delete SSH keys on your DigitalOcean account. SSH keys are used for secure authentication when creating Droplets.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      name: z.string().optional().describe('Key name (required for create)'),
      publicKey: z
        .string()
        .optional()
        .describe('SSH public key content (required for create)'),
      keyIdOrFingerprint: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Key ID or fingerprint (required for delete)')
    })
  )
  .output(
    z.object({
      sshKeys: z
        .array(
          z.object({
            sshKeyId: z.number().describe('SSH key ID'),
            name: z.string().describe('Key name'),
            fingerprint: z.string().describe('Key fingerprint'),
            publicKey: z.string().describe('Public key content')
          })
        )
        .optional()
        .describe('List of SSH keys'),
      sshKey: z
        .object({
          sshKeyId: z.number().describe('SSH key ID'),
          name: z.string().describe('Key name'),
          fingerprint: z.string().describe('Key fingerprint'),
          publicKey: z.string().describe('Public key content')
        })
        .optional()
        .describe('Created SSH key'),
      deleted: z.boolean().optional().describe('Whether the key was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapKey = (k: any) => ({
      sshKeyId: k.id,
      name: k.name,
      fingerprint: k.fingerprint,
      publicKey: k.public_key
    });

    if (ctx.input.action === 'list') {
      let keys = await client.listSSHKeys();
      return {
        output: { sshKeys: keys.map(mapKey) },
        message: `Found **${keys.length}** SSH key(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name || !ctx.input.publicKey) {
        throw digitalOceanValidationError('name and publicKey are required for create action');
      }
      let key = await client.createSSHKey({
        name: ctx.input.name,
        publicKey: ctx.input.publicKey
      });
      return {
        output: { sshKey: mapKey(key) },
        message: `Added SSH key **${key.name}** (fingerprint: ${key.fingerprint}).`
      };
    }

    // delete
    if (!ctx.input.keyIdOrFingerprint)
      throw digitalOceanValidationError('keyIdOrFingerprint is required for delete action');
    await client.deleteSSHKey(ctx.input.keyIdOrFingerprint);

    return {
      output: { deleted: true },
      message: `Deleted SSH key **${ctx.input.keyIdOrFingerprint}**.`
    };
  })
  .build();
