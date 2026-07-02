import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDevice = SlateTool.create(spec, {
  name: 'Manage Device',
  key: 'manage_device',
  description: `Create, update, or delete a device on the Pushbullet account. Use this to register new devices, update device properties (nickname, icon, etc.), or remove devices.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      deviceIden: z
        .string()
        .optional()
        .describe('Device identifier (required for update and delete)'),
      nickname: z.string().optional().describe('Display name for the device'),
      manufacturer: z.string().optional().describe('Device manufacturer'),
      model: z.string().optional().describe('Device model'),
      icon: z
        .enum([
          'desktop',
          'browser',
          'website',
          'laptop',
          'tablet',
          'phone',
          'watch',
          'system'
        ])
        .optional()
        .describe('Icon type for the device')
    })
  )
  .output(
    z.object({
      deviceIden: z.string().describe('Unique identifier of the device'),
      active: z.boolean().optional().describe('Whether the device is active'),
      nickname: z.string().optional().describe('Display name of the device'),
      manufacturer: z.string().optional().describe('Device manufacturer'),
      model: z.string().optional().describe('Device model'),
      icon: z.string().optional().describe('Device icon type'),
      action: z.string().describe('Action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let device = await client.createDevice({
        nickname: ctx.input.nickname,
        manufacturer: ctx.input.manufacturer,
        model: ctx.input.model,
        icon: ctx.input.icon
      });

      return {
        output: {
          deviceIden: device.iden,
          active: device.active,
          nickname: device.nickname,
          manufacturer: device.manufacturer,
          model: device.model,
          icon: device.icon,
          action: 'create'
        },
        message: `Created device **${device.nickname || device.iden}**.`
      };
    }

    if (!ctx.input.deviceIden) {
      throw new Error('deviceIden is required for update and delete actions');
    }

    if (ctx.input.action === 'update') {
      let device = await client.updateDevice(ctx.input.deviceIden, {
        nickname: ctx.input.nickname,
        manufacturer: ctx.input.manufacturer,
        model: ctx.input.model,
        icon: ctx.input.icon
      });

      return {
        output: {
          deviceIden: device.iden,
          active: device.active,
          nickname: device.nickname,
          manufacturer: device.manufacturer,
          model: device.model,
          icon: device.icon,
          action: 'update'
        },
        message: `Updated device **${device.nickname || device.iden}**.`
      };
    }

    // delete
    await client.deleteDevice(ctx.input.deviceIden);
    return {
      output: {
        deviceIden: ctx.input.deviceIden,
        action: 'delete'
      },
      message: `Deleted device \`${ctx.input.deviceIden}\`.`
    };
  })
  .build();
