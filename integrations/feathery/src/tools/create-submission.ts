import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let createSubmission = SlateTool.create(spec, {
  name: 'Create or Update Submission',
  key: 'create_submission',
  description: `Create a new form submission or update an existing one. Associate field values with a user for one or more forms. Can mark submissions as complete and trigger document generation.`
})
  .input(
    z.object({
      userId: z.string().describe('User ID to associate the submission with'),
      formIds: z.array(z.string()).describe('Form IDs to submit data for'),
      fields: z
        .record(z.string(), z.any())
        .describe('Key-value mapping of field IDs to their values'),
      complete: z
        .boolean()
        .optional()
        .describe('Mark the submission as complete, triggering form completion events'),
      documents: z
        .array(
          z.object({
            documentId: z.string().describe('Document template ID to generate'),
            outputLocation: z
              .string()
              .optional()
              .describe(
                'JSON-encoded spreadsheet coordinates, for example {"sheet":"Sheet1","cell":"D7"}. Prefer spreadsheetLocation for new calls'
              ),
            spreadsheetLocation: z
              .object({ sheet: z.string(), cell: z.string() })
              .optional()
              .describe('Spreadsheet coordinates whose generated value should be returned')
          })
        )
        .optional()
        .describe('Documents to generate with the submission')
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('User ID of the submission'),
      submitted: z.boolean().describe('Whether the submission was successful'),
      generatedDocuments: z
        .array(
          z.object({
            documentId: z.string().describe('Generated document template ID'),
            spreadsheetLocation: z
              .object({ sheet: z.string(), cell: z.string() })
              .optional()
              .describe('Spreadsheet coordinates returned by the provider'),
            outputValue: z.any().optional().describe('Calculated value at those coordinates')
          })
        )
        .optional()
        .describe('Document generation results returned by Feathery')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region:
        ctx.auth.region ??
        ('region' in ctx.config && typeof ctx.config.region === 'string'
          ? ctx.config.region
          : undefined)
    });

    let documents = ctx.input.documents?.map(document => {
      if (
        document.outputLocation !== undefined &&
        document.spreadsheetLocation !== undefined
      ) {
        throw createApiServiceError(
          'Choose either outputLocation or spreadsheetLocation for each document.'
        );
      }
      let outputLocation = document.spreadsheetLocation;
      if (document.outputLocation !== undefined) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(document.outputLocation);
        } catch {
          throw createApiServiceError(
            'outputLocation must be JSON with sheet and cell string properties.'
          );
        }
        let location = z.object({ sheet: z.string(), cell: z.string() }).safeParse(parsed);
        if (!location.success)
          throw createApiServiceError(
            'outputLocation must be JSON with sheet and cell string properties.'
          );
        outputLocation = location.data;
      }
      return { id: document.documentId, outputLocation };
    });

    let result = await client.createOrUpdateSubmission({
      userId: ctx.input.userId,
      forms: ctx.input.formIds,
      fields: ctx.input.fields,
      complete: ctx.input.complete,
      documents
    });

    return {
      output: {
        userId: ctx.input.userId,
        submitted: true,
        generatedDocuments: result.documents?.map(
          (document: {
            id: string;
            output_location?: { sheet: string; cell: string } | null;
            output_value?: unknown;
          }) => ({
            documentId: document.id,
            spreadsheetLocation: document.output_location ?? undefined,
            outputValue: document.output_value
          })
        )
      },
      message: `Submitted data for user **${ctx.input.userId}** to **${ctx.input.formIds.length}** form(s)${ctx.input.complete ? ' (marked complete)' : ''}.`
    };
  })
  .build();
