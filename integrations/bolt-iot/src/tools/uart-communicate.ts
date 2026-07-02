import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uartCommunicate = SlateTool.create(spec, {
  name: 'UART Communicate',
  key: 'uart_communicate',
  description: `Perform UART (serial) communication with a device connected to the Bolt module. Supports initializing the serial interface, sending data, reading data, or sending and reading in one step. Choose the appropriate operation for your use case.`,
  instructions: [
    'Use "initialize" to set the baud rate before any serial operations.',
    'Use "write" to send a string over the serial TX line.',
    'Use "read" to receive data from the serial RX line.',
    'Use "writeRead" to send data and immediately capture the response.',
    'Baud rate index: 0 = 9600, 1 = 9600, 2 = 9600, 3 = 115200 (refer to Bolt documentation for exact mapping).',
    'The "till" parameter specifies the ASCII code of the character to read until (e.g., 10 for newline).'
  ]
})
  .input(
    z.object({
      operation: z
        .enum(['initialize', 'write', 'read', 'writeRead'])
        .describe('The serial operation to perform'),
      baudRate: z
        .number()
        .min(0)
        .max(3)
        .optional()
        .describe('Baud rate index (0–3) for "initialize" operation'),
      serialData: z
        .string()
        .optional()
        .describe('String data to send for "write" or "writeRead" operations'),
      till: z
        .number()
        .min(0)
        .max(127)
        .optional()
        .describe('ASCII value of character to read until (0–127, e.g., 10 for newline)')
    })
  )
  .output(
    z.object({
      success: z.string().describe('Whether the operation was successful ("1" for success)'),
      resultValue: z.string().describe('Response value from the serial operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      deviceName: ctx.auth.deviceName
    });

    let response: any;
    let operationDesc: string;

    switch (ctx.input.operation) {
      case 'initialize':
        if (ctx.input.baudRate === undefined) {
          throw new Error('baudRate is required for the "initialize" operation');
        }
        response = await client.serialBegin(ctx.input.baudRate);
        operationDesc = `Serial initialized with baud rate index ${ctx.input.baudRate}`;
        break;

      case 'write':
        if (!ctx.input.serialData) {
          throw new Error('serialData is required for the "write" operation');
        }
        response = await client.serialWrite(ctx.input.serialData);
        operationDesc = `Sent "${ctx.input.serialData}" over serial TX`;
        break;

      case 'read':
        response = await client.serialRead(ctx.input.till);
        operationDesc = `Read data from serial RX${ctx.input.till !== undefined ? ` (until ASCII ${ctx.input.till})` : ''}`;
        break;

      case 'writeRead':
        if (!ctx.input.serialData) {
          throw new Error('serialData is required for the "writeRead" operation');
        }
        response = await client.serialWriteRead(ctx.input.serialData, ctx.input.till);
        operationDesc = `Sent "${ctx.input.serialData}" and read response`;
        break;
    }

    return {
      output: {
        success: response.success,
        resultValue: response.value
      },
      message: `${operationDesc}. Result: **${response.value}**.`
    };
  })
  .build();
