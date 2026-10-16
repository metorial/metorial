import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPosDevices = SlateTool.create(spec, {
  name: 'List POS Devices',
  key: 'list_pos_devices',
  description:
    'Retrieve POS devices and their store assignments and activation status. Use device IDs to identify the registers associated with receipts and shifts. Call list_stores to discover store IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      storeId: z
        .string()
        .optional()
        .describe(
          'Only return devices in this store. Call list_stores to discover store IDs.'
        ),
      showDeleted: z.boolean().optional().describe('Include deleted POS devices')
    })
  )
  .output(
    z.object({
      posDevices: z.array(
        z.object({
          posDeviceId: z.string().describe('POS device ID'),
          name: z.string().optional().describe('Device name'),
          storeId: z.string().optional().describe('Store associated with this device'),
          activated: z
            .boolean()
            .optional()
            .describe('Whether the POS is connected to a physical device'),
          deletedAt: z.string().nullable().optional().describe('Deletion timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listPosDevices(ctx.input);
    let posDevices = (result.pos_devices ?? []).map((device: any) => ({
      posDeviceId: device.id,
      name: device.name,
      storeId: device.store_id,
      activated: device.activated,
      deletedAt: device.deleted_at
    }));
    return {
      output: { posDevices },
      message: `Retrieved **${posDevices.length}** POS device(s).`
    };
  })
  .build();
