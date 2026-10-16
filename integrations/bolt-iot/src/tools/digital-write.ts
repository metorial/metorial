import { SlateTool } from 'slates';
import { z } from 'zod';
import { type BoltResponse, Client } from '../lib/client';
import { deviceName, rawResponse } from '../lib/schemas';
import { spec } from '../spec';

export let digitalWrite = SlateTool.create(spec, {
  name: 'Digital Write',
  key: 'digital_write',
  description: `Set one or more digital GPIO pins on a Bolt device to HIGH or LOW. Supports writing to a single pin or multiple pins at once. Use this to control LEDs, relays, motors, and other on/off actuators.`,
  instructions: [
    'Valid pins are 0, 1, 2, 3, 4 for digital output.',
    'To write to multiple pins at once, provide arrays of pins and states with matching lengths.'
  ],
  constraints: [
    'Pin numbers must be between 0 and 4.',
    'State must be either "HIGH" or "LOW".'
  ]
})
  .input(
    z.object({
      deviceName,
      pins: z.array(z.string()).describe('List of pin numbers to write to (e.g., ["0", "1"])'),
      states: z
        .array(z.enum(['HIGH', 'LOW']))
        .describe('List of states corresponding to each pin')
    })
  )
  .output(
    z.object({
      raw: rawResponse,
      success: z
        .string()
        .describe('Whether the write operation was successful ("1" for success)'),
      resultValue: z.string().describe('Response value from the device')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      deviceName: ctx.input.deviceName ?? ctx.auth.deviceName
    });

    let response: BoltResponse;
    if (ctx.input.pins.length === 1) {
      response = await client.digitalWrite(ctx.input.pins[0]!, ctx.input.states[0]!);
    } else {
      response = await client.digitalMultiWrite(ctx.input.pins, ctx.input.states);
    }

    let pinStateDesc = ctx.input.pins
      .map((p, i) => `pin ${p} → ${ctx.input.states[i]}`)
      .join(', ');

    return {
      output: {
        raw: response,
        success: response.success,
        resultValue: response.value
      },
      message: `Digital write: ${pinStateDesc}. Result: ${response.success === '1' ? 'success' : 'failed'}.`
    };
  })
  .build();
