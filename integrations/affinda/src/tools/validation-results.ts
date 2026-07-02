import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let validationResultSchema = z.object({
  validationResultId: z.number().describe('Affinda validation result ID.'),
  annotationIds: z
    .array(z.number())
    .optional()
    .describe('Annotation IDs that were validated.'),
  passed: z.boolean().nullable().optional().describe('Whether validation passed.'),
  ruleSlug: z.string().optional().describe('Validation rule slug.'),
  message: z.string().optional().describe('Validation message.'),
  documentIdentifier: z.string().optional().describe('Document identifier.')
});

let mapValidationResult = (result: any) => ({
  validationResultId: result.id,
  annotationIds: result.annotations,
  passed: result.passed,
  ruleSlug: result.ruleSlug,
  message: result.message,
  documentIdentifier: result.document
});

export let listValidationResults = SlateTool.create(spec, {
  name: 'List Validation Results',
  key: 'list_validation_results',
  description: `List Affinda validation results for a document. Use this to inspect validation rule outcomes after a document has been parsed and reviewed.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentIdentifier: z
        .string()
        .describe('Document identifier to filter validation results by.'),
      offset: z.number().optional().describe('Pagination offset.'),
      limit: z.number().optional().describe('Maximum number of validation results to return.')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of validation results returned.'),
      validationResults: z
        .array(validationResultSchema)
        .describe('Validation results for the document.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listValidationResults({
      documentIdentifier: ctx.input.documentIdentifier,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });
    let results = Array.isArray(result) ? result : (result.results ?? []);
    let validationResults = results.map(mapValidationResult);

    return {
      output: {
        count: result.count ?? validationResults.length,
        validationResults
      },
      message: `Found **${result.count ?? validationResults.length}** validation result(s).`
    };
  })
  .build();
