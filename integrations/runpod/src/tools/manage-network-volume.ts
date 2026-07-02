import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let manageNetworkVolume = SlateTool.create(spec, {
  name: 'Manage Network Volume',
  key: 'manage_network_volume',
  description: `Update or delete a network volume. You can change the volume name and size, or permanently delete it.`,
  constraints: [
    'Deleting a volume is permanent and cannot be undone.',
    'A volume should not be attached to any active Pods or endpoints before deletion.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      networkVolumeId: z.string().describe('ID of the network volume'),
      action: z.enum(['update', 'delete']).describe('Action to perform'),
      name: z.string().optional().describe('New name (for update action)'),
      size: z.number().optional().describe('New size in GB (for update action)')
    })
  )
  .output(
    z.object({
      networkVolumeId: z.string().describe('ID of the affected volume'),
      action: z.string().describe('Action performed'),
      name: z.string().nullable().describe('Volume name'),
      size: z.number().nullable().describe('Volume size in GB')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });
    let { networkVolumeId, action } = ctx.input;

    if (action === 'delete') {
      await client.deleteNetworkVolume(networkVolumeId);
      return {
        output: {
          networkVolumeId,
          action: 'delete',
          name: null,
          size: null
        },
        message: `Deleted network volume **${networkVolumeId}**.`
      };
    }

    let updateData: any = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.size !== undefined) updateData.size = ctx.input.size;

    let v = await client.updateNetworkVolume(networkVolumeId, updateData);

    return {
      output: {
        networkVolumeId: v.id,
        action: 'update',
        name: v.name ?? null,
        size: v.size ?? null
      },
      message: `Updated network volume **${v.name ?? networkVolumeId}**.`
    };
  })
  .build();
