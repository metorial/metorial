import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { deviceName, rawResponse } from '../lib/schemas';
import { spec } from '../spec';

export let servoControl = SlateTool.create(spec, {
  name: 'Servo Control',
  key: 'servo_control',
  description: `Control a servo motor connected to a Bolt device by setting its angle position. Specify the pin and the desired angle (0–180 degrees). Requires Bolt Cloud Pro and firmware version 1.4.1 or above.`,
  constraints: [
    'Only available for Bolt Cloud Pro users.',
    'Requires firmware version 1.4.1 or above.',
    'Valid pins are 0, 1, 2, 3, 4.',
    'Angle must be between 0 and 180 degrees.'
  ]
})
  .input(
    z.object({
      deviceName,
      pin: z.string().describe('The pin number the servo signal wire is connected to (0–4)'),
      angle: z
        .number()
        .min(0)
        .max(180)
        .describe('The angle to set the servo motor to (0–180 degrees)')
    })
  )
  .output(
    z.object({
      raw: rawResponse,
      success: z.string().describe('Whether the operation was successful ("1" for success)'),
      resultValue: z.string().describe('Response value from the device')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      deviceName: ctx.input.deviceName ?? ctx.auth.deviceName
    });

    let response = await client.servoWrite(ctx.input.pin, ctx.input.angle);

    return {
      output: {
        raw: response,
        success: response.success,
        resultValue: response.value
      },
      message: `Servo on pin **${ctx.input.pin}** set to **${ctx.input.angle}°**.`
    };
  })
  .build();
