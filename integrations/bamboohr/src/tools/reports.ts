import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let generateCustomReport = SlateTool.create(spec, {
  name: 'Generate Custom Report',
  key: 'generate_custom_report',
  description: `Generate an ad-hoc employee report using the documented deprecated report endpoint. It includes accessible active and inactive employees; onlyCurrent controls historical field values, not employment status. JSON returns structured data; CSV, PDF and XML produce a downloadable file. Use get_account_fields to discover field IDs.`,
  instructions: [
    'Common field names: "firstName", "lastName", "workEmail", "jobTitle", "department", "hireDate", "status", "employeeNumber".',
    'Requested fields that are unknown or not permitted may be omitted. Do not treat omitted values as empty.'
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
          'Structured report data for JSON; null when a downloadable file was produced'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let result = await client.getCustomReport(
      ctx.input.format,
      ctx.input.fields,
      ctx.input.title,
      ctx.input.lastChangedSince
    );

    if (result.binary)
      await ctx.addAttachment({
        type: 'content',
        content: result.binary.bytes,
        mimeType: result.binary.mimeType,
        filename: `employee-report.${ctx.input.format.toLowerCase()}`
      });

    return {
      output: {
        title: ctx.input.title || 'Custom Report',
        format: ctx.input.format,
        reportData: result.data
      },
      message: `Generated custom report with **${ctx.input.fields.length}** fields in ${ctx.input.format} format.`
    };
  })
  .build();

export let getCompanyReport = SlateTool.create(spec, {
  name: 'Get Company Report',
  key: 'get_company_report',
  description: `Run an exact saved custom report. Legacy report IDs use the documented deprecated endpoint and support JSON or downloadable CSV/PDF/XML. IDs from list_resources reports use reportSource=current and return one page of JSON with native pagination. Standard reports are not supported.`,
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
        .describe(
          'Legacy unsupported parameter for saved reports; omit it. Use generate_custom_report for a change filter.'
        ),
      reportSource: z
        .enum(['legacy', 'current'])
        .optional()
        .describe('Choose the report ID namespace; list_resources returns current IDs'),
      page: z.number().optional().describe('Current report page, starting at 1'),
      pageSize: z.number().optional().describe('Current report page size, 1–1000')
    })
  )
  .output(
    z.object({
      reportId: z.string().describe('The report ID'),
      format: z.string().describe('The format of the report'),
      reportData: z
        .any()
        .describe(
          'Structured JSON data; null when a downloadable legacy report file was produced'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let result = await client.getCompanyReport(
      ctx.input.reportId,
      ctx.input.format,
      ctx.input.lastChangedSince,
      ctx.input.reportSource,
      ctx.input.page,
      ctx.input.pageSize
    );

    if (result.binary)
      await ctx.addAttachment({
        type: 'content',
        content: result.binary.bytes,
        mimeType: result.binary.mimeType,
        filename: `report-${ctx.input.reportId}.${ctx.input.format.toLowerCase()}`
      });

    return {
      output: {
        reportId: ctx.input.reportId,
        format: ctx.input.format,
        reportData: result.data
      },
      message: `Retrieved company report **${ctx.input.reportId}** in ${ctx.input.format} format.`
    };
  })
  .build();
