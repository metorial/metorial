import { SlateTool } from 'slates';
import { z } from 'zod';
import { IdentityCheckClient } from '../lib/client';
import { spec } from '../spec';

export let requestKybReport = SlateTool.create(spec, {
  name: 'Request KYB Report',
  key: 'request_kyb_report',
  description: `Requests a Know Your Business (KYB) report for a business entity. Supports global KYB reports, UBO (Ultimate Beneficial Owner) reports for Australian entities, and ASIC Director Reports for Australian companies. Use this to verify and gather information about a business entity.`,
  instructions: [
    'For UBO reports, the entity must be Australian.',
    'For ASIC Director Reports, the entity must be an Australian company.',
    'Provide the company registration number for more accurate results.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyName: z.string().describe('Legal name of the business entity'),
      registrationNumber: z
        .string()
        .optional()
        .describe('Company registration number (e.g., ABN, ACN, or equivalent)'),
      country: z
        .string()
        .optional()
        .describe('Country of registration (ISO 3166-1 alpha-2 code, e.g., "AU", "US", "GB")'),
      reportType: z
        .enum(['kyb', 'ubo', 'asic_director'])
        .optional()
        .describe(
          'Type of report: "kyb" for standard business verification, "ubo" for Ultimate Beneficial Owner (AU only), "asic_director" for ASIC Director Report (AU only). Defaults to "kyb"'
        ),
      referenceId: z
        .string()
        .optional()
        .describe('Your own reference ID to correlate this report with your records')
    })
  )
  .output(
    z.object({
      reportId: z.string().describe('Unique ID of the KYB report'),
      status: z.string().describe('Current status of the report'),
      reportType: z.string().describe('Type of report requested'),
      companyName: z.string().describe('Company name as submitted'),
      country: z.string().optional().describe('Country of the entity'),
      registrationNumber: z.string().optional().describe('Company registration number'),
      reportUrl: z.string().optional().describe('URL to the completed report'),
      createdAt: z.string().optional().describe('Timestamp when the report was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IdentityCheckClient(ctx.auth.token);

    let result = await client.createKybReport({
      companyName: ctx.input.companyName,
      registrationNumber: ctx.input.registrationNumber,
      country: ctx.input.country,
      reportType: ctx.input.reportType,
      referenceId: ctx.input.referenceId
    });

    let reportType = ctx.input.reportType || 'kyb';
    let reportTypeLabel =
      reportType === 'ubo' ? 'UBO' : reportType === 'asic_director' ? 'ASIC Director' : 'KYB';

    return {
      output: {
        reportId: result.id || result.report_id,
        status: result.status || 'pending',
        reportType: result.report_type || reportType,
        companyName: result.company_name || ctx.input.companyName,
        country: result.country || ctx.input.country,
        registrationNumber: result.registration_number || ctx.input.registrationNumber,
        reportUrl: result.report_url,
        createdAt: result.created_at
      },
      message: `${reportTypeLabel} report requested for **${ctx.input.companyName}**${ctx.input.country ? ` (${ctx.input.country})` : ''}. Report ID: \`${result.id || result.report_id}\`.`
    };
  })
  .build();
