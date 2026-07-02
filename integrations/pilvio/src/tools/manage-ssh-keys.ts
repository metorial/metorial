import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

let sshKeySchema = z.object({
  sshKeyUuid: z.string().describe('SSH key UUID'),
  name: z.string().describe('Key name'),
  publicKey: z.string().optional().describe('SSH public key content'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let manageSshKeys = SlateTool.create(spec, {
  name: 'Manage SSH Keys',
  key: 'manage_ssh_keys',
  description: `List, create, rename, or delete SSH public keys associated with your Pilvio account. Keys can be referenced when creating virtual machines.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'rename', 'delete']).describe('Operation to perform'),
      sshKeyUuid: z.string().optional().describe('SSH key UUID (required for rename/delete)'),
      name: z.string().optional().describe('Key name (for create/rename)'),
      publicKey: z.string().optional().describe('SSH public key content (for create)')
    })
  )
  .output(
    z.object({
      sshKey: sshKeySchema.optional().describe('SSH key details'),
      sshKeys: z.array(sshKeySchema).optional().describe('List of SSH keys'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PilvioClient({
      token: ctx.auth.token,
      locationSlug: ctx.config.locationSlug
    });

    let { action } = ctx.input;

    let mapKey = (k: any) => ({
      sshKeyUuid: k.uuid,
      name: k.name,
      publicKey: k.public_key,
      createdAt: k.created_at
    });

    switch (action) {
      case 'list': {
        let keys = await client.listSshKeys();
        let mapped = (Array.isArray(keys) ? keys : []).map(mapKey);
        return {
          output: { sshKeys: mapped, success: true },
          message: `Found **${mapped.length}** SSH key(s).`
        };
      }

      case 'create': {
        if (!ctx.input.name || !ctx.input.publicKey)
          throw new Error('name and publicKey are required for create action');
        let key = await client.createSshKey({
          name: ctx.input.name,
          publicKey: ctx.input.publicKey
        });
        return {
          output: { sshKey: mapKey(key), success: true },
          message: `Created SSH key **${ctx.input.name}**.`
        };
      }

      case 'rename': {
        if (!ctx.input.sshKeyUuid || !ctx.input.name)
          throw new Error('sshKeyUuid and name are required for rename action');
        let key = await client.updateSshKey(ctx.input.sshKeyUuid, { name: ctx.input.name });
        return {
          output: { sshKey: mapKey(key), success: true },
          message: `Renamed SSH key **${ctx.input.sshKeyUuid}** to **${ctx.input.name}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.sshKeyUuid) throw new Error('sshKeyUuid is required for delete action');
        await client.deleteSshKey(ctx.input.sshKeyUuid);
        return {
          output: { success: true },
          message: `Deleted SSH key **${ctx.input.sshKeyUuid}**.`
        };
      }
    }
  })
  .build();
