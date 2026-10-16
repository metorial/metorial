import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { checked, deviceIdSchema, record, SensiboClient } from '../lib/client';
import { validateAcState } from '../lib/state';
import { spec } from '../spec';

let outputSchema = z.object({
  deviceId: z.string().describe('The device the timer belongs to'),
  timerActive: z.boolean().describe('Whether a timer is currently active'),
  minutesFromNow: z.number().optional().describe('Minutes until the timer fires'),
  acState: z
    .object({
      on: z.boolean().optional(),
      mode: z.string().optional(),
      targetTemperature: z.number().optional(),
      temperatureUnit: z.string().optional(),
      fanLevel: z.string().optional(),
      swing: z.string().optional()
    })
    .optional()
    .describe('AC state that will be applied when the timer fires')
});

export let manageTimerTool = SlateTool.create(spec, {
  name: 'Manage Timer',
  key: 'manage_timer',
  description: `Get, set, or delete a timer for a Sensibo device. Timers automatically change the AC state after a specified duration (in minutes). Use action "get" to check the current timer, "set" to create/update a timer, or "delete" to remove it.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      deviceId: deviceIdSchema,
      action: z.enum(['get', 'set', 'delete']).describe('Action to perform on the timer'),
      minutesFromNow: z
        .number()
        .optional()
        .describe('Minutes until the timer fires (required for "set")'),
      acState: z
        .object({
          on: z.boolean().optional(),
          mode: z.enum(['cool', 'heat', 'fan', 'dry', 'auto']).optional(),
          targetTemperature: z.number().optional(),
          temperatureUnit: z.enum(['C', 'F']).optional(),
          fanLevel: z.string().optional(),
          swing: z.string().optional()
        })
        .optional()
        .describe('AC state to apply when the timer fires (required for "set")')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new SensiboClient(ctx.auth.token);
    let result = await (async () => {
      let { deviceId, action } = ctx.input;

      if (action === 'delete') {
        await client.deleteTimer(deviceId);
        return {
          output: {
            deviceId,
            timerActive: false
          },
          message: `Timer deleted for device **${deviceId}**.`
        };
      }

      if (action === 'set') {
        if (
          ctx.input.minutesFromNow === undefined ||
          !Number.isInteger(ctx.input.minutesFromNow) ||
          ctx.input.minutesFromNow <= 0
        )
          throw createApiServiceError(
            'Provide a positive whole number of minutesFromNow for set.'
          );
        if (!ctx.input.acState) throw createApiServiceError('acState is required for set.');
        validateAcState(ctx.input.acState, await client.getDevice(deviceId), true);
        let timerData = {
          minutesFromNow: ctx.input.minutesFromNow,
          acState: ctx.input.acState
        };
        let result = record(await client.setTimer(deviceId, timerData), 'timer');
        if (result.isEnabled === undefined && !result.acState)
          throw createApiServiceError('Sensibo returned a timer without its state.');
        return {
          output: {
            deviceId,
            timerActive:
              result.isEnabled === undefined
                ? true
                : checked(z.boolean(), result.isEnabled, 'timer enabled state'),
            minutesFromNow: result.minutesFromNow,
            acState: result.acState
          },
          message: `Timer set on device **${deviceId}** to fire in ${ctx.input.minutesFromNow} minutes.`
        };
      }

      // action === 'get'
      let timer = await client.getTimer(deviceId);
      if (
        timer === undefined ||
        (timer !== null && record(timer, 'timer').isEnabled !== false && !timer.acState)
      )
        throw createApiServiceError('Sensibo returned a timer without its state.');
      if (timer?.isEnabled !== undefined)
        checked(z.boolean(), timer.isEnabled, 'timer enabled state');
      let hasTimer =
        timer !== null &&
        timer !== undefined &&
        record(timer, 'timer').isEnabled !== false &&
        timer.acState !== undefined;
      return {
        output: {
          deviceId,
          timerActive: !!hasTimer,
          minutesFromNow: timer?.minutesFromNow,
          acState: timer?.acState
            ? {
                on: timer.acState.on,
                mode: timer.acState.mode,
                targetTemperature: timer.acState.targetTemperature,
                temperatureUnit: timer.acState.temperatureUnit,
                fanLevel: timer.acState.fanLevel,
                swing: timer.acState.swing
              }
            : undefined
        },
        message: hasTimer
          ? `Timer is active on device **${deviceId}**, firing in ${timer.minutesFromNow} minutes.`
          : `No active timer on device **${deviceId}**.`
      };
    })();
    return {
      ...result,
      output: checked(outputSchema, client.sanitize(result.output), 'tool output'),
      message: client.sanitize(result.message)
    };
  })
  .build();
