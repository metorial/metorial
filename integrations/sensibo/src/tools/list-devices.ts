import { SlateTool } from 'slates';
import { z } from 'zod';
import { SensiboClient } from '../lib/client';
import { spec } from '../spec';

let deviceSummarySchema = z.object({
  deviceId: z.string().describe('Unique identifier of the Sensibo device'),
  name: z.string().describe('User-assigned name of the device'),
  temperatureUnit: z.string().optional().describe('Temperature unit (C or F)'),
  on: z.boolean().optional().describe('Whether the AC is currently on'),
  mode: z.string().optional().describe('Current AC mode (cool, heat, fan, dry, auto)'),
  targetTemperature: z.number().optional().describe('Target temperature setting'),
  fanLevel: z.string().optional().describe('Current fan level'),
  currentTemperature: z.number().optional().describe('Current room temperature reading'),
  currentHumidity: z.number().optional().describe('Current room humidity reading'),
  productModel: z.string().optional().describe('Sensibo device model'),
  firmwareVersion: z.string().optional().describe('Device firmware version'),
  isAlive: z.boolean().optional().describe('Whether the device is online'),
  roomName: z.string().optional().describe('Name of the room the device is in')
});

export let listDevicesTool = SlateTool.create(spec, {
  name: 'List Devices',
  key: 'list_devices',
  description: `Retrieve all Sensibo devices associated with your account. Returns each device's current state, sensor readings, and configuration. Useful for getting an overview of all connected climate control devices.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      devices: z.array(deviceSummarySchema).describe('List of Sensibo devices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SensiboClient(ctx.auth.token);
    let devices = await client.listDevices();

    let mapped = devices.map((d: any) => ({
      deviceId: d.id,
      name: d.room?.name || d.id,
      temperatureUnit: d.temperatureUnit,
      on: d.acState?.on,
      mode: d.acState?.mode,
      targetTemperature: d.acState?.targetTemperature,
      fanLevel: d.acState?.fanLevel,
      currentTemperature: d.measurements?.temperature,
      currentHumidity: d.measurements?.humidity,
      productModel: d.productModel,
      firmwareVersion: d.firmwareVersion,
      isAlive: d.connectionStatus?.isAlive,
      roomName: d.room?.name
    }));

    return {
      output: { devices: mapped },
      message: `Found **${mapped.length}** Sensibo device(s): ${mapped.map((d: any) => `${d.name} (${d.deviceId})`).join(', ')}.`
    };
  })
  .build();
