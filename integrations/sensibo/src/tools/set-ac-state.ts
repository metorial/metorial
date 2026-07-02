import { SlateTool } from 'slates';
import { z } from 'zod';
import { SensiboClient } from '../lib/client';
import { spec } from '../spec';

export let setAcStateTool = SlateTool.create(spec, {
  name: 'Set AC State',
  key: 'set_ac_state',
  description: `Control an air conditioner's state through a Sensibo device. Set power on/off, mode, target temperature, fan level, swing, and other settings. You can set the full AC state at once or change individual properties.`,
  instructions: [
    'Available modes, fan levels, swing options, and temperature ranges depend on the AC model. Use **Get Device** first to check supported capabilities.',
    'When setting a single property, only that property changes while the rest of the AC state remains unchanged.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      deviceId: z.string().describe('The unique ID of the Sensibo device'),
      on: z.boolean().optional().describe('Turn AC on (true) or off (false)'),
      mode: z
        .enum(['cool', 'heat', 'fan', 'dry', 'auto'])
        .optional()
        .describe('AC operating mode'),
      targetTemperature: z.number().optional().describe('Target temperature'),
      temperatureUnit: z.enum(['C', 'F']).optional().describe('Temperature unit'),
      fanLevel: z.string().optional().describe('Fan level (e.g. low, medium, high, auto)'),
      swing: z.string().optional().describe('Vertical swing mode (e.g. stopped, rangeFull)'),
      horizontalSwing: z.string().optional().describe('Horizontal swing mode'),
      light: z.string().optional().describe('Light setting (e.g. on, off)')
    })
  )
  .output(
    z.object({
      deviceId: z.string().describe('The device that was updated'),
      acState: z
        .object({
          on: z.boolean().optional(),
          mode: z.string().optional(),
          targetTemperature: z.number().optional(),
          temperatureUnit: z.string().optional(),
          fanLevel: z.string().optional(),
          swing: z.string().optional(),
          horizontalSwing: z.string().optional(),
          light: z.string().optional()
        })
        .describe('The resulting AC state after the update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SensiboClient(ctx.auth.token);
    let { deviceId, ...stateProps } = ctx.input;

    let propertyKeys = Object.keys(stateProps).filter(
      k => stateProps[k as keyof typeof stateProps] !== undefined
    );

    let result: any;

    if (propertyKeys.length === 1) {
      let property = propertyKeys[0]!;
      let value = stateProps[property as keyof typeof stateProps];
      result = await client.setAcStateProperty(deviceId, property, value);
    } else {
      let acState: Record<string, any> = {};
      for (let key of propertyKeys) {
        acState[key] = stateProps[key as keyof typeof stateProps];
      }
      result = await client.setAcState(deviceId, acState);
    }

    let acState = result?.acState || result;

    let output = {
      deviceId,
      acState: {
        on: acState?.on,
        mode: acState?.mode,
        targetTemperature: acState?.targetTemperature,
        temperatureUnit: acState?.temperatureUnit,
        fanLevel: acState?.fanLevel,
        swing: acState?.swing,
        horizontalSwing: acState?.horizontalSwing,
        light: acState?.light
      }
    };

    let changes = propertyKeys
      .map(k => `${k}=${stateProps[k as keyof typeof stateProps]}`)
      .join(', ');

    return {
      output,
      message: `Updated AC state on device **${deviceId}**: ${changes}.`
    };
  })
  .build();
