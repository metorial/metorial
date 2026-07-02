import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateBusinessReport = SlateTool.create(spec, {
  name: 'Generate Business Report',
  key: 'generate_business_report',
  description: `Generate an AI-powered business report from structured data. Provide your raw data along with instructions describing the type of report or analysis you need, and receive a detailed, readable analytical report.

Useful for creating summaries, trend analyses, KPI reports, and other data-driven business documents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      instructions: z
        .string()
        .describe(
          'Instructions for the report, e.g. "Summarize quarterly sales by region and highlight top performers"'
        ),
      rawData: z
        .string()
        .describe('The raw data to analyze, as a text string (CSV, JSON, or plain text)')
    })
  )
  .output(
    z.object({
      report: z.any().describe('The generated business report content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Generating business report...');

    let result = await client.generateBusinessReport({
      instructions: ctx.input.instructions,
      rawData: ctx.input.rawData
    });

    return {
      output: {
        report: result
      },
      message: `Successfully generated a business report based on the provided data and instructions.`
    };
  })
  .build();
