import { SlateTool } from 'slates';
import { z } from 'zod';
import { IdentityCheckClient } from '../lib/client';
import { spec } from '../spec';

export let runAmlScreening = SlateTool.create(spec, {
  name: 'Run AML Screening',
  key: 'run_aml_screening',
  description: `Runs Anti-Money Laundering (AML) screening on an individual. Checks against PEP (Politically Exposed Person) lists, sanctions databases, and adverse media sources. Screenings can be run individually or as a combined AML check. Typically performed after identity verification, using the name and date of birth extracted from the ID document.`,
  instructions: [
    'Provide the full legal name as it appears on the identity document for best matching accuracy.',
    'Date of birth improves matching precision and reduces false positives.',
    'If no screening types are specified, all three (PEP, sanctions, adverse media) will be run.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('Full legal first name of the individual to screen'),
      lastName: z.string().describe('Full legal last name of the individual to screen'),
      dateOfBirth: z
        .string()
        .optional()
        .describe('Date of birth in ISO 8601 format (YYYY-MM-DD) for improved matching'),
      screeningTypes: z
        .array(z.enum(['pep', 'sanctions', 'adverse_media']))
        .optional()
        .describe('Types of screening to perform. Defaults to all three if not specified'),
      referenceId: z
        .string()
        .optional()
        .describe('Your own reference ID to correlate this screening with your records')
    })
  )
  .output(
    z.object({
      screeningId: z.string().describe('Unique ID of the AML screening'),
      status: z
        .string()
        .describe('Current status of the screening (e.g., pending, completed)'),
      screeningTypes: z.array(z.string()).optional().describe('Types of screening performed'),
      matchesFound: z
        .boolean()
        .optional()
        .describe('Whether any potential matches were found'),
      pepMatch: z.boolean().optional().describe('Whether a PEP match was found'),
      sanctionsMatch: z.boolean().optional().describe('Whether a sanctions match was found'),
      adverseMediaMatch: z
        .boolean()
        .optional()
        .describe('Whether an adverse media match was found'),
      matchCount: z.number().optional().describe('Total number of potential matches found'),
      reportUrl: z.string().optional().describe('URL to the detailed screening report'),
      createdAt: z.string().optional().describe('Timestamp when the screening was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IdentityCheckClient(ctx.auth.token);

    let result = await client.createAmlScreening({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      dateOfBirth: ctx.input.dateOfBirth,
      screeningTypes: ctx.input.screeningTypes,
      referenceId: ctx.input.referenceId
    });

    let matchesFound = result.matches_found ?? result.match_count > 0;

    return {
      output: {
        screeningId: result.id || result.screening_id,
        status: result.status || 'completed',
        screeningTypes: result.screening_types ||
          ctx.input.screeningTypes || ['pep', 'sanctions', 'adverse_media'],
        matchesFound,
        pepMatch: result.pep_match,
        sanctionsMatch: result.sanctions_match,
        adverseMediaMatch: result.adverse_media_match,
        matchCount: result.match_count,
        reportUrl: result.report_url,
        createdAt: result.created_at
      },
      message: `AML screening for **${ctx.input.firstName} ${ctx.input.lastName}** — ${matchesFound ? `⚠️ **${result.match_count || 'potential'} match(es) found**` : '✅ **No matches found**'}. Screening ID: \`${result.id || result.screening_id}\`.`
    };
  })
  .build();
