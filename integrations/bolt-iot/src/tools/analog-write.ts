import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let analogWrite = SlateTool.create(spec, {
  name: 'Analog Write (PWM)',
  key: 'analog_write',
  description: `Write an analog (PWM) value to an output pin on a Bolt device. Accepts values from 0 to 255, enabling variable control of devices like dimmable LEDs, motors, and other analog actuators.`,
  instructions: [
    'Valid output pins for PWM are 0, 1, 2, 3, 4.',
    'The value ranges from 0 (off) to 255 (full power).'
  ],
  constraints: ['PWM value must be between 0 and 255.']
})
  .input(
    z.object({
      pin: z.string().describe('The pin number to write PWM value to (0–4)'),
      pwmValue: z.number().min(0).max(255).describe('The PWM value to write (0–255)')
    })
  )
  .output(
    z.object({
      success: z.string().describe('Whether the write was successful ("1" for success)'),
      resultValue: z.string().describe('Response value from the device')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      deviceName: ctx.auth.deviceName
    });

    let response = await client.analogWrite(ctx.input.pin, ctx.input.pwmValue);

    return {
      output: {
        success: response.success,
        resultValue: response.value
      },
      message: `Analog write on pin **${ctx.input.pin}**: PWM value set to **${ctx.input.pwmValue}** (0–255 range).`
    };
  })
  .build();
