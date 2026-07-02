import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deviceChanged = SlateTrigger.create(spec, {
  name: 'Device Changed',
  key: 'device_changed',
  description: 'Triggers when a device is added, updated, or removed from the account.'
})
  .input(
    z.object({
      deviceIden: z.string().describe('Unique identifier of the device'),
      active: z.boolean().describe('Whether the device is active'),
      nickname: z.string().optional().describe('Display name of the device'),
      manufacturer: z.string().optional().describe('Device manufacturer'),
      model: z.string().optional().describe('Device model'),
      icon: z.string().optional().describe('Device icon type'),
      hasSms: z.string().optional().describe('Whether the device supports SMS'),
      created: z.number().describe('Creation Unix timestamp'),
      modified: z.number().describe('Modification Unix timestamp')
    })
  )
  .output(
    z.object({
      deviceIden: z.string().describe('Unique identifier of the device'),
      active: z.boolean().describe('Whether the device is active'),
      nickname: z.string().optional().describe('Display name of the device'),
      manufacturer: z.string().optional().describe('Device manufacturer'),
      model: z.string().optional().describe('Device model'),
      icon: z.string().optional().describe('Device icon type'),
      hasSms: z.string().optional().describe('Whether the device supports SMS'),
      created: z.string().describe('Creation Unix timestamp'),
      modified: z.string().describe('Last modification Unix timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let knownDevices = (ctx.state?.knownDevices || {}) as Record<string, string>;

      let result = await client.listDevices();
      let devices = result.devices || [];

      let changedDevices: typeof devices = [];
      let newKnownDevices: Record<string, string> = {};

      for (let device of devices) {
        let modStr = String(device.modified);
        newKnownDevices[device.iden] = modStr;

        let previousMod = knownDevices[device.iden];
        if (!previousMod || previousMod !== modStr) {
          changedDevices.push(device);
        }
      }

      // Detect deleted devices
      for (let [iden, _mod] of Object.entries(knownDevices)) {
        if (!newKnownDevices[iden]) {
          changedDevices.push({
            iden,
            active: false,
            created: 0,
            modified: Date.now() / 1000
          });
          // Don't carry deleted devices forward
        }
      }

      return {
        inputs: changedDevices.map(d => ({
          deviceIden: d.iden,
          active: d.active,
          nickname: d.nickname,
          manufacturer: d.manufacturer,
          model: d.model,
          icon: d.icon,
          hasSms: d.has_sms,
          created: d.created,
          modified: d.modified
        })),
        updatedState: {
          knownDevices: newKnownDevices
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.active ? 'updated' : 'deleted';

      return {
        type: `device.${eventType}`,
        id: `${ctx.input.deviceIden}-${ctx.input.modified}`,
        output: {
          deviceIden: ctx.input.deviceIden,
          active: ctx.input.active,
          nickname: ctx.input.nickname,
          manufacturer: ctx.input.manufacturer,
          model: ctx.input.model,
          icon: ctx.input.icon,
          hasSms: ctx.input.hasSms,
          created: String(ctx.input.created),
          modified: String(ctx.input.modified)
        }
      };
    }
  })
  .build();
