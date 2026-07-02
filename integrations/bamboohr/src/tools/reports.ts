import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateCustomReport = SlateTool.create(spec, {
  name: 'Generate Custom Report',
  key: 'generate_custom_report',
  description: `Generate a custom report by specifying which employee fields to include. Returns data for all current employees with the requested fields. Supports JSON, CSV, PDF, and XML formats. Use the **Get Account Fields** tool to discover all available field names.`,
  instructions: [
    'Common field names: "firstName", "lastName", "workEmail", "jobTitle", "department", "hireDate", "status", "employeeNumber".',
    'The report is generated for all current employees by default.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      fields: z.array(z.string()).describe('List of field names to include in the report'),
      format: z
        .enum(['JSON', 'CSV', 'PDF', 'XML'])
        .default('JSON')
        .describe('Report output format'),
      title: z.string().optional().describe('Title for the report'),
      lastChangedSince: z
        .string()
        .optional()
        .describe('Only include employees changed since this date (YYYY-MM-DDThh:mm:ssZ)')
    })
  )
  .output(
    z.object({
      title: z.string().optional().describe('Report title'),
      format: z.string().describe('The format of the report'),
      reportData: z
        .any()
        .describe(
          'The report data (structure depends on format; JSON returns structured data)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    let data = await client.getCustomReport(
      ctx.input.format,
      ctx.input.fields,
      ctx.input.title,
      ctx.input.lastChangedSince
    );

    return {
      output: {
        title: ctx.input.title || 'Custom Report',
        format: ctx.input.format,
        reportData: data
      },
      message: `Generated custom report with **${ctx.input.fields.length}** fields in ${ctx.input.format} format.`
    };
  })
  .build();

export let getCompanyReport = SlateTool.create(spec, {
  name: 'Get Company Report',
  key: 'get_company_report',
  description: `Retrieve a pre-defined company report by its ID. Company reports are configured in BambooHR by administrators and can be retrieved in JSON, CSV, PDF, or XML formats.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      reportId: z.string().describe('The report ID'),
      format: z
        .enum(['JSON', 'CSV', 'PDF', 'XML'])
        .default('JSON')
        .describe('Report output format'),
      lastChangedSince: z
        .string()
        .optional()
        .describe('Only include employees changed since this date (YYYY-MM-DDThh:mm:ssZ)')
    })
  )
  .output(
    z.object({
      reportId: z.string().describe('The report ID'),
      format: z.string().describe('The format of the report'),
      reportData: z.any().describe('The report data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    let data = await client.getCompanyReport(
      ctx.input.reportId,
      ctx.input.format,
      ctx.input.lastChangedSince
    );

    return {
      output: {
        reportId: ctx.input.reportId,
        format: ctx.input.format,
        reportData: data
      },
      message: `Retrieved company report **${ctx.input.reportId}** in ${ctx.input.format} format.`
    };
  })
  .build();
