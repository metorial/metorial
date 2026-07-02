import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let analogRead = SlateTool.create(spec, {
  name: 'Analog Read',
  key: 'analog_read',
  description: `Read the analog value from a pin on a Bolt device. The analog pin A0 returns values from 0 to 1023, representing the voltage level. Commonly used for reading sensor data such as temperature, light intensity, or humidity.`,
  instructions: [
    'Use pin "A0" for the analog input pin on the Bolt device.',
    'The returned value ranges from 0 (0V) to 1023 (3.3V).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pin: z.string().default('A0').describe('The analog pin to read from (default: "A0")')
    })
  )
  .output(
    z.object({
      success: z.string().describe('Whether the read was successful ("1" for success)'),
      analogValue: z.string().describe('Analog value from 0 to 1023')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      deviceName: ctx.auth.deviceName
    });

    let response = await client.analogRead(ctx.input.pin);

    return {
      output: {
        success: response.success,
        analogValue: response.value
      },
      message: `Analog read on pin **${ctx.input.pin}**: value = **${response.value}** (0–1023 range).`
    };
  })
  .build();
