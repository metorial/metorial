import { SlateTool } from 'slates';
import { z } from 'zod';
import { IdentityCheckClient } from '../lib/client';
import { spec } from '../spec';

export let getAmlScreening = SlateTool.create(spec, {
  name: 'Get AML Screening',
  key: 'get_aml_screening',
  description: `Retrieves the details and results of a previously submitted AML (Anti-Money Laundering) screening. Returns match information for PEP, sanctions, and adverse media checks along with a link to the detailed report.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      screeningId: z.string().describe('ID of the AML screening to retrieve')
    })
  )
  .output(
    z.object({
      screeningId: z.string().describe('Unique ID of the AML screening'),
      status: z.string().describe('Current status of the screening'),
      firstName: z.string().optional().describe('First name that was screened'),
      lastName: z.string().optional().describe('Last name that was screened'),
      dateOfBirth: z.string().optional().describe('Date of birth that was screened'),
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
      matchCount: z.number().optional().describe('Total number of potential matches'),
      matches: z
        .array(
          z.object({
            matchType: z
              .string()
              .optional()
              .describe('Type of match (pep, sanctions, adverse_media)'),
            matchName: z.string().optional().describe('Name of the matched entity'),
            matchScore: z.number().optional().describe('Confidence score of the match'),
            source: z.string().optional().describe('Source of the match')
          })
        )
        .optional()
        .describe('Details of individual matches found'),
      reportUrl: z.string().optional().describe('URL to the detailed screening report'),
      referenceId: z.string().optional().describe('Your reference ID if provided'),
      createdAt: z.string().optional().describe('Timestamp when the screening was created'),
      completedAt: z.string().optional().describe('Timestamp when the screening was completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IdentityCheckClient(ctx.auth.token);

    let result = await client.getAmlScreening(ctx.input.screeningId);

    let rawMatches = result.matches || [];
    let matches = rawMatches.map((m: any) => ({
      matchType: m.match_type || m.type,
      matchName: m.match_name || m.name,
      matchScore: m.match_score || m.score,
      source: m.source
    }));

    return {
      output: {
        screeningId: result.id || result.screening_id,
        status: result.status,
        firstName: result.first_name,
        lastName: result.last_name,
        dateOfBirth: result.date_of_birth,
        screeningTypes: result.screening_types,
        matchesFound: result.matches_found ?? rawMatches.length > 0,
        pepMatch: result.pep_match,
        sanctionsMatch: result.sanctions_match,
        adverseMediaMatch: result.adverse_media_match,
        matchCount: result.match_count || rawMatches.length,
        matches,
        reportUrl: result.report_url,
        referenceId: result.reference_id,
        createdAt: result.created_at,
        completedAt: result.completed_at
      },
      message: `AML screening \`${ctx.input.screeningId}\`: **${result.status}**${result.first_name ? ` for ${result.first_name} ${result.last_name}` : ''}. ${rawMatches.length > 0 ? `⚠️ ${rawMatches.length} match(es) found.` : '✅ No matches.'}`
    };
  })
  .build();
