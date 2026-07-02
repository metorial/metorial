import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExcelClient } from '../lib/client';
import { spec } from '../spec';

export let invokeFunction = SlateTool.create(spec, {
  name: 'Invoke Excel Function',
  key: 'invoke_function',
  description: `Execute an Excel built-in calculation function remotely (e.g., SUM, VLOOKUP, PMT, ABS, IF). Pass parameters and receive the calculated result without writing values into cells. This uses Excel's full calculation engine as a service.`,
  instructions: [
    'The function name should be the Excel function name in lowercase (e.g., "sum", "vlookup", "pmt", "abs").',
    'Parameters are passed as an array in the order expected by the Excel function.',
    'Range references are passed as JSON objects with type "Range" — but for most use cases, pass literal values directly.',
    'Example: to compute PMT(0.05/12, 360, 200000), use functionName "pmt" and parameters [0.00417, 360, 200000].'
  ],
  constraints: ['Only Excel built-in functions are supported (no custom/VBA functions).'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workbookItemId: z.string().describe('The Drive item ID of the Excel workbook file'),
      functionName: z
        .string()
        .describe('Excel function name (e.g., "sum", "vlookup", "pmt", "abs", "if")'),
      parameters: z
        .array(z.any())
        .describe('Function parameters in order, as expected by the Excel function'),
      sessionId: z.string().optional().describe('Optional workbook session ID')
    })
  )
  .output(
    z.object({
      result: z.any().describe('The calculated result from the Excel function')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExcelClient({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId,
      sessionId: ctx.input.sessionId
    });

    let response = await client.invokeFunction(
      ctx.input.workbookItemId,
      ctx.input.functionName,
      ctx.input.parameters
    );

    return {
      output: { result: response.value !== undefined ? response.value : response },
      message: `Executed **${ctx.input.functionName.toUpperCase()}** — result: \`${JSON.stringify(response.value !== undefined ? response.value : response)}\``
    };
  })
  .build();
