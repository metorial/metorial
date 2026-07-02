import { SlateTool } from 'slates';
import { z } from 'zod';
import { CabinPandaClient } from '../lib/client';
import { spec } from '../spec';

export let listSubmissions = SlateTool.create(spec, {
  name: 'List Form Submissions',
  key: 'list_submissions',
  description: `Retrieve all submissions for a specific form. Returns the collected response data from each submission, useful for processing, filtering, or exporting form responses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z
        .string()
        .describe('The 32-character alphanumeric key of the form to get submissions for')
    })
  )
  .output(
    z.object({
      submissions: z
        .array(
          z.object({
            submissionId: z
              .string()
              .optional()
              .describe('Unique identifier for the submission'),
            createdAt: z.string().optional().describe('When the submission was received'),
            fields: z.any().optional().describe('Submitted field values'),
            raw: z.any().optional().describe('Full submission object from the API')
          })
        )
        .describe('List of submissions for the form')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CabinPandaClient({ token: ctx.auth.token });
    let submissions = await client.listSubmissions(ctx.input.formId);

    let mappedSubmissions = (Array.isArray(submissions) ? submissions : []).map(
      (sub: any) => ({
        submissionId: sub?.id?.toString(),
        createdAt: sub?.created_at,
        fields: sub?.fields ?? sub?.data,
        raw: sub
      })
    );

    return {
      output: { submissions: mappedSubmissions },
      message: `Found **${mappedSubmissions.length}** submission(s) for form **${ctx.input.formId}**.`
    };
  })
  .build();
