import { SlateTool } from 'slates';
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
              .describe('Where to store the generated document')
          })
        )
        .optional()
        .describe('Documents to generate with the submission')
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('User ID of the submission'),
      submitted: z.boolean().describe('Whether the submission was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.createOrUpdateSubmission({
      userId: ctx.input.userId,
      forms: ctx.input.formIds,
      fields: ctx.input.fields,
      complete: ctx.input.complete,
      documents: ctx.input.documents?.map(d => ({
        id: d.documentId,
        outputLocation: d.outputLocation
      }))
    });

    return {
      output: {
        userId: ctx.input.userId,
        submitted: true
      },
      message: `Submitted data for user **${ctx.input.userId}** to **${ctx.input.formIds.length}** form(s)${ctx.input.complete ? ' (marked complete)' : ''}.`
    };
  })
  .build();
