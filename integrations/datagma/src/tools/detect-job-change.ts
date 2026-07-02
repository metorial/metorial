import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let detectJobChange = SlateTool.create(spec, {
  name: 'Detect Job Change',
  key: 'detect_job_change',
  description: `Check if a person is still working at a known company or has moved to a new role. Returns updated employment information and a confidence score.
Useful for CRM hygiene, churn risk detection, and re-engaging warm leads who have changed positions.`,
  instructions: [
    "Provide the person's name and their last known company.",
    'Optionally provide their last known job title for better disambiguation.',
    'Use fullName or firstName + lastName to identify the person.'
  ],
  constraints: [
    'Currently in beta, primarily supporting France, Spain, Italy, and Germany.',
    'Rate limited to 10 requests per second.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fullName: z.string().optional().describe('Full name of the person to check'),
      firstName: z.string().optional().describe('First name (alternative to fullName)'),
      lastName: z.string().optional().describe('Last name (alternative to fullName)'),
      companyName: z.string().describe('Last known company name for the person'),
      jobTitle: z
        .string()
        .optional()
        .describe(
          'Last known job title (helps disambiguate when multiple people share the same name)'
        )
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Job change status'),
      personData: z.any().optional().describe('Updated person and employment information'),
      companyScore: z.number().optional().describe('Confidence score for the company match'),
      creditBurn: z.number().optional().describe('Number of credits consumed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.detectJobChange({
      fullName: ctx.input.fullName,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      companyName: ctx.input.companyName,
      jobTitle: ctx.input.jobTitle
    });

    let personName =
      ctx.input.fullName || `${ctx.input.firstName || ''} ${ctx.input.lastName || ''}`.trim();

    return {
      output: {
        status: result?.status,
        personData: result?.data,
        companyScore: result?.companyScore,
        creditBurn: result?.creditBurn
      },
      message: `Job change detection for **${personName}** at **${ctx.input.companyName}**: status is **${result?.status || 'unknown'}** (confidence: ${result?.companyScore ?? 'N/A'}).`
    };
  })
  .build();
