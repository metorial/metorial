import { SlateTool } from 'slates';
import { z } from 'zod';
import { IdentityCheckClient } from '../lib/client';
import { spec } from '../spec';

export let getKybReport = SlateTool.create(spec, {
  name: 'Get KYB Report',
  key: 'get_kyb_report',
  description: `Retrieves the details and results of a previously requested Know Your Business (KYB) report. Returns the report status, business entity details, and a link to the full report when available.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      reportId: z.string().describe('ID of the KYB report to retrieve')
    })
  )
  .output(
    z.object({
      reportId: z.string().describe('Unique ID of the KYB report'),
      status: z.string().describe('Current status of the report'),
      reportType: z.string().optional().describe('Type of report'),
      companyName: z.string().optional().describe('Legal name of the business entity'),
      registrationNumber: z.string().optional().describe('Company registration number'),
      country: z.string().optional().describe('Country of the entity'),
      entityStatus: z.string().optional().describe('Registration status of the entity'),
      directors: z
        .array(
          z.object({
            name: z.string().optional().describe('Director name'),
            role: z.string().optional().describe('Director role'),
            appointedDate: z.string().optional().describe('Date appointed')
          })
        )
        .optional()
        .describe('List of company directors (for ASIC Director reports)'),
      beneficialOwners: z
        .array(
          z.object({
            name: z.string().optional().describe('Beneficial owner name'),
            ownershipPercentage: z.number().optional().describe('Percentage of ownership')
          })
        )
        .optional()
        .describe('List of ultimate beneficial owners (for UBO reports)'),
      reportUrl: z.string().optional().describe('URL to the completed report'),
      referenceId: z.string().optional().describe('Your reference ID if provided'),
      createdAt: z.string().optional().describe('Timestamp when the report was created'),
      completedAt: z.string().optional().describe('Timestamp when the report was completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IdentityCheckClient(ctx.auth.token);

    let result = await client.getKybReport(ctx.input.reportId);

    let directors = (result.directors || []).map((d: any) => ({
      name: d.name,
      role: d.role,
      appointedDate: d.appointed_date
    }));

    let beneficialOwners = (result.beneficial_owners || []).map((o: any) => ({
      name: o.name,
      ownershipPercentage: o.ownership_percentage
    }));

    return {
      output: {
        reportId: result.id || result.report_id,
        status: result.status,
        reportType: result.report_type,
        companyName: result.company_name,
        registrationNumber: result.registration_number,
        country: result.country,
        entityStatus: result.entity_status,
        directors: directors.length > 0 ? directors : undefined,
        beneficialOwners: beneficialOwners.length > 0 ? beneficialOwners : undefined,
        reportUrl: result.report_url,
        referenceId: result.reference_id,
        createdAt: result.created_at,
        completedAt: result.completed_at
      },
      message: `KYB report \`${ctx.input.reportId}\`: **${result.status}**${result.company_name ? ` for **${result.company_name}**` : ''}.`
    };
  })
  .build();
