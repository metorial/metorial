import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFormats = SlateTool.create(spec, {
  name: 'List Conversion Formats',
  key: 'list_formats',
  description: `List supported conversion formats. Filter by input format, output format, or engine to discover available conversion paths.

Useful for checking if a specific conversion is supported before attempting it.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      inputFormat: z
        .string()
        .optional()
        .describe('Filter by input format (e.g., "pdf", "docx")'),
      outputFormat: z
        .string()
        .optional()
        .describe('Filter by output format (e.g., "pdf", "png")'),
      engine: z.string().optional().describe('Filter by conversion engine'),
      engineVersion: z.string().optional().describe('Filter by engine version')
    })
  )
  .output(
    z.object({
      formats: z
        .array(
          z.object({
            inputFormat: z.string().describe('Input format identifier'),
            outputFormat: z.string().describe('Output format identifier'),
            engine: z.string().describe('Conversion engine used'),
            engineVersion: z.string().optional().describe('Engine version')
          })
        )
        .describe('Available conversion format pairs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listConversionFormats({
      inputFormat: ctx.input.inputFormat,
      outputFormat: ctx.input.outputFormat,
      engine: ctx.input.engine,
      engineVersion: ctx.input.engineVersion
    });

    let formats = (result ?? []).map((f: any) => ({
      inputFormat: f.input_format,
      outputFormat: f.output_format,
      engine: f.engine,
      engineVersion: f.engine_version
    }));

    return {
      output: { formats },
      message: `Found ${formats.length} conversion format(s)${ctx.input.inputFormat ? ` for input "${ctx.input.inputFormat}"` : ''}${ctx.input.outputFormat ? ` to "${ctx.input.outputFormat}"` : ''}.`
    };
  })
  .build();
