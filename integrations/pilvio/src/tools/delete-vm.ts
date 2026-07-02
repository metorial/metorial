import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

export let deleteVm = SlateTool.create(spec, {
  name: 'Delete Virtual Machine',
  key: 'delete_vm',
  description: `Permanently delete a virtual machine and its associated resources. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      vmUuid: z.string().describe('UUID of the virtual machine to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PilvioClient({
      token: ctx.auth.token,
      locationSlug: ctx.config.locationSlug
    });

    await client.deleteVm(ctx.input.vmUuid);

    return {
      output: { success: true },
      message: `Deleted VM **${ctx.input.vmUuid}**.`
    };
  })
  .build();
