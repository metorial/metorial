import { SlateTool } from 'slates';
import { z } from 'zod';
import { checked, deviceIdSchema, record, SensiboClient } from '../lib/client';
import { spec } from '../spec';

let acStateSchema = z.object({
  on: z.boolean().optional().describe('Whether the AC is on'),
  mode: z.string().optional().describe('AC mode (cool, heat, fan, dry, auto)'),
  targetTemperature: z.number().optional().describe('Target temperature'),
  temperatureUnit: z.string().optional().describe('Temperature unit (C or F)'),
  fanLevel: z.string().optional().describe('Fan level'),
  swing: z.string().optional().describe('Vertical swing mode'),
  horizontalSwing: z.string().optional().describe('Horizontal swing mode'),
  light: z.string().optional().describe('Light setting')
});

let measurementsSchema = z.object({
  temperature: z.number().optional().describe('Current temperature reading'),
  humidity: z.number().optional().describe('Current humidity reading')
});

let outputSchema = z.object({
  deviceId: z.string().describe('Unique identifier of the device'),
  name: z.string().describe('User-assigned name of the device'),
  productModel: z.string().optional().describe('Sensibo device model'),
  firmwareVersion: z.string().optional().describe('Device firmware version'),
  isAlive: z.boolean().optional().describe('Whether the device is online'),
  acState: acStateSchema.optional().describe('Current AC state'),
  measurements: measurementsSchema.optional().describe('Current sensor measurements'),
  supportedModes: z.array(z.string()).optional().describe('Supported AC modes'),
  supportedFanLevels: z.array(z.string()).optional().describe('Supported fan levels'),
  supportedSwingModes: z.array(z.string()).optional().describe('Supported swing modes'),
  temperatureRange: z
    .object({
      min: z.number().optional(),
      max: z.number().optional()
    })
    .optional()
    .describe('Supported temperature range'),
  temperatureRangeUnit: z
    .string()
    .optional()
    .describe('Unit of temperatureRange, as reported by the device'),
  roomName: z.string().optional().describe('Name of the room'),
  macAddress: z.string().optional().describe('MAC address of the device'),
  serialNumber: z.string().optional().describe('Serial number'),
  raw: z
    .record(z.string(), z.any())
    .optional()
    .describe('Full device data, including model-specific capabilities')
});

export let getDeviceTool = SlateTool.create(spec, {
  name: 'Get Device',
  key: 'get_device',
  description: `Get detailed information about a specific Sensibo device, including its current AC state, sensor readings, connection status, and device capabilities. Use this to inspect a single device in depth.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deviceId: deviceIdSchema
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new SensiboClient(ctx.auth.token);
    let result = await (async () => {
      let device = await client.getDevice(ctx.input.deviceId);

      let remoteCapabilities = device.remoteCapabilities;
      let modes = remoteCapabilities?.modes
        ? Object.keys(record(remoteCapabilities.modes, 'supported modes'))
        : undefined;

      let currentMode = device.acState?.mode;
      let modeCapabilities = remoteCapabilities?.modes?.[currentMode];
      let temperatureUnit = device.acState?.temperatureUnit ?? device.temperatureUnit;
      let temperatures = temperatureUnit
        ? modeCapabilities?.temperatures?.[temperatureUnit]?.values
        : undefined;

      if (temperatures !== undefined)
        checked(z.array(z.number()), temperatures, 'supported temperatures');

      let result = {
        deviceId: device.id,
        name: device.room?.name,
        productModel: device.productModel,
        firmwareVersion: device.firmwareVersion,
        isAlive: device.connectionStatus?.isAlive,
        acState: device.acState
          ? {
              on: device.acState.on,
              mode: device.acState.mode,
              targetTemperature: device.acState.targetTemperature,
              temperatureUnit: device.acState.temperatureUnit,
              fanLevel: device.acState.fanLevel,
              swing: device.acState.swing,
              horizontalSwing: device.acState.horizontalSwing,
              light: device.acState.light
            }
          : undefined,
        measurements: device.measurements
          ? {
              temperature: device.measurements.temperature,
              humidity: device.measurements.humidity
            }
          : undefined,
        supportedModes: modes,
        supportedFanLevels: modeCapabilities?.fanLevels,
        supportedSwingModes: modeCapabilities?.swing,
        temperatureRange:
          Array.isArray(temperatures) && temperatures.length
            ? {
                min: Math.min(...temperatures),
                max: Math.max(...temperatures)
              }
            : undefined,
        temperatureRangeUnit:
          Array.isArray(temperatures) && temperatures.length ? temperatureUnit : undefined,
        roomName: device.room?.name,
        macAddress: device.macAddress,
        serialNumber: device.serial,
        raw: device
      };

      let statusText =
        result.isAlive === undefined
          ? 'connection status unknown'
          : result.isAlive
            ? 'online'
            : 'offline';
      let acText =
        result.acState?.on === undefined
          ? 'power state unknown'
          : result.acState.on
            ? `on (${result.acState.mode}, ${result.acState.targetTemperature}${result.acState.temperatureUnit})`
            : 'off';

      return {
        output: result,
        message: `Device **${result.name}** (${result.deviceId}) is ${statusText}. AC is ${acText}.${result.measurements ? ` Room: ${result.measurements.temperature} (provider units)/${result.measurements.humidity}% humidity.` : ''}`
      };
    })();
    return {
      ...result,
      output: checked(outputSchema, client.sanitize(result.output), 'tool output'),
      message: client.sanitize(result.message)
    };
  })
  .build();
