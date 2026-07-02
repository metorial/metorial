import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let digitalRead = SlateTool.create(spec, {
  name: 'Digital Read',
  key: 'digital_read',
  description: `Read the current digital state of one or more GPIO pins on a Bolt device. Returns the HIGH/LOW state of each pin. Useful for checking the status of switches, buttons, or other digital input sensors.`,
  instructions: [
    'Valid pins are 0, 1, 2, 3, 4 for digital read.',
    'To read multiple pins at once, provide an array of pin identifiers.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pins: z
        .array(z.string())
        .describe('List of pin numbers to read from (e.g., ["0", "1", "2"])')
    })
  )
  .output(
    z.object({
      success: z
        .string()
        .describe('Whether the read operation was successful ("1" for success)'),
      resultValue: z.string().describe('Digital state value(s) from the device')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      deviceName: ctx.auth.deviceName
    });

    let response: any;
    if (ctx.input.pins.length === 1) {
      response = await client.digitalRead(ctx.input.pins[0]!);
    } else {
      response = await client.digitalMultiRead(ctx.input.pins);
    }

    return {
      output: {
        success: response.success,
        resultValue: response.value
      },
      message: `Digital read on pin(s) ${ctx.input.pins.join(', ')}: value = **${response.value}**.`
    };
  })
  .build();
