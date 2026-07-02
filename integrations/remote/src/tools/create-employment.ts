import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEmployment = SlateTool.create(spec, {
  name: 'Create Employment',
  key: 'create_employment',
  description: `Create a new employment record in Remote for onboarding an employee. Requires country-specific fields which vary by country (use the country form schema tool to discover required fields). After creation, the employee can be invited to complete self-enrollment.`,
  instructions: [
    'Country-specific fields are required and vary by country. Use the "Get Country Form Schema" tool first to discover required fields for the target country.',
    'The basicInformation object must include country_code, full_name, job_title, and provisional_start_date at minimum.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      countryCode: z.string().describe('ISO country code for the employment (e.g., GBR, DEU)'),
      fullName: z.string().describe('Full legal name of the employee'),
      jobTitle: z.string().describe('Job title for the employment'),
      provisionalStartDate: z.string().describe('Planned start date (YYYY-MM-DD)'),
      basicInformation: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional country-specific basic information fields'),
      companyId: z.string().optional().describe('Company ID if managing multiple companies'),
      type: z.string().optional().describe('Employment type (e.g., employee, contractor)'),
      seniorityDate: z.string().optional().describe('Seniority date (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      employment: z.record(z.string(), z.any()).describe('Created employment record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? 'production'
    });

    let data: Record<string, any> = {
      country_code: ctx.input.countryCode,
      basic_information: {
        full_name: ctx.input.fullName,
        job_title: ctx.input.jobTitle,
        provisional_start_date: ctx.input.provisionalStartDate,
        ...ctx.input.basicInformation
      }
    };

    if (ctx.input.companyId) data.company_id = ctx.input.companyId;
    if (ctx.input.type) data.type = ctx.input.type;
    if (ctx.input.seniorityDate) data.seniority_date = ctx.input.seniorityDate;

    let result = await client.createEmployment(data);
    let employment = result?.data ?? result?.employment ?? result;

    return {
      output: {
        employment
      },
      message: `Created employment for **${ctx.input.fullName}** in ${ctx.input.countryCode}.`
    };
  });
