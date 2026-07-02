import { SlateTool } from 'slates';
import { z } from 'zod';
import { SensiboClient } from '../lib/client';
import { spec } from '../spec';

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
      deviceId: z.string().describe('The unique ID of the Sensibo device'),
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
  .output(
    z.object({
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
    })
  )
  .handleInvocation(async ctx => {
    let client = new SensiboClient(ctx.auth.token);
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
      let timerData = {
        minutesFromNow: ctx.input.minutesFromNow,
        acState: ctx.input.acState
      };
      let result = await client.setTimer(deviceId, timerData);
      return {
        output: {
          deviceId,
          timerActive: true,
          minutesFromNow: result?.minutesFromNow ?? ctx.input.minutesFromNow,
          acState: result?.acState ?? ctx.input.acState
        },
        message: `Timer set on device **${deviceId}** to fire in ${ctx.input.minutesFromNow} minutes.`
      };
    }

    // action === 'get'
    let timer = await client.getTimer(deviceId);
    let hasTimer = timer && timer.isEnabled !== false && timer.acState;
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
  })
  .build();
