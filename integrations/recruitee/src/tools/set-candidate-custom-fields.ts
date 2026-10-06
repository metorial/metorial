import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

export let setCandidateCustomFields = SlateTool.create(spec, {
  name: 'Set Candidate Custom Fields',
  key: 'set_candidate_custom_fields',
  description: `Create profile fields on a candidate profile. This endpoint creates one field per request; it does not find and overwrite an existing field. Supports various field types including text, boolean, date, skills, salary, experience, education, and more.

Supported **kind** values and their **values** format:
- \`single_line\` / \`multi_line\`: \`[{"text": "value"}]\`
- \`boolean\`: \`[{"flag": true}]\`
- \`skills\`: \`[{"text": "SQL"}, {"text": "Python"}]\`
- \`salary\`: \`[{"amount": "5000", "currency": "EUR"}]\`
- \`date\` / \`date_of_birth\`: \`[{"date": "2024-01-15"}]\`
- \`gender\`: \`[{"value": "female"}]\`
- \`nationality\`: \`[{"country_code": "NL"}]\`
- \`language_skill\`: \`[{"language_code": "en", "level": "advanced"}]\`
- \`experience\`: \`[{"title": "...", "company": "...", "startDate": "...", "endDate": "..."}]\`
- \`education\`: \`[{"school": "...", "degree": "..."}]\``,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      candidateId: z.number().describe('ID of the candidate'),
      fields: z
        .array(
          z.object({
            kind: z
              .string()
              .describe(
                'Field type (e.g., single_line, boolean, skills, salary, date, experience, education)'
              ),
            name: z
              .string()
              .optional()
              .describe(
                'Name required for custom single-line, multi-line, boolean, number, or date fields'
              ),
            values: z
              .array(z.unknown())
              .describe('Array of value objects matching the field kind')
          })
        )
        .describe('Custom fields to set on the candidate')
    })
  )
  .output(
    z.object({
      candidateId: z.number().describe('ID of the candidate'),
      fieldsSet: z.number().describe('Number of confirmed created profile fields'),
      createdFieldIds: z.array(z.number()).optional().describe('Confirmed created field IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = await RecruiteeClient.forContext(ctx);

    let result = await client.setCandidateCustomFields(
      ctx.input.candidateId,
      ctx.input.fields
    );

    return {
      output: {
        candidateId: ctx.input.candidateId,
        fieldsSet: result.createdFieldIds.length,
        createdFieldIds: result.createdFieldIds
      },
      message: `Created ${result.createdFieldIds.length} profile field(s) on candidate ${ctx.input.candidateId}.`
    };
  })
  .build();
