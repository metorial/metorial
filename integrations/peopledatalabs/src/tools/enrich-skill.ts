import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let enrichSkill = SlateTool.create(spec, {
  name: 'Enrich Skill',
  key: 'enrich_skill',
  description: `DEPRECATED — the Skill Enrichment API was removed in April 2025. Historical inputs remain accepted for compatibility; this operation returns a retirement error without making a request.`,
  instructions: [
    'The provider removed this endpoint in April 2025. Use Autocomplete for supported skill suggestions or Job Title Enrichment for relevant skills; neither is an equivalent skill enrichment replacement.'
  ],
  tags: {
    deprecated: true,
    readOnly: true
  }
})
  .input(
    z.object({
      skill: z.string().describe('Raw skill to enrich (e.g. "machine learn")'),
      titlecase: z.boolean().optional().describe('Titlecase the output fields')
    })
  )
  .output(
    z.object({
      cleanedSkill: z.string().nullable().optional().describe('Standardized skill name')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'Skill Enrichment was removed in April 2025. Use supported skill suggestions through Autocomplete or relevant skills through Job Title Enrichment; neither restores the retired endpoint.',
      { reason: 'unsupported_operation' }
    );
  })
  .build();
