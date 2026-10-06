import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { stateMessage } from '../lib/contracts';
import { diagnosisOutput } from '../lib/results';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let diagnoseImage = SlateTool.create(spec, {
  name: 'Diagnose Image',
  key: 'diagnose_image',
  description: `Run a diagnostic report on a generated Bannerbear image to identify issues with external media loading (e.g. missing images, permission errors, format issues). Helps debug why a generated image may not look as expected.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      imageUid: z.string().describe('UID of the generated image to diagnose')
    })
  )
  .output(
    z.object({
      diagnosisUid: z.string().describe('UID of the diagnostic report'),
      status: z.string().describe('Diagnosis status'),
      report: z
        .array(
          z.object({
            url: z.string().optional().describe('URL of the external image'),
            result: z
              .string()
              .optional()
              .describe('Result of the check (e.g. "ok", "failed")'),
            comment: z.string().optional().describe('Details about any issues found')
          })
        )
        .nullable()
        .describe('Diagnostic findings for external images')
    })
  )
  .handleInvocation(async ctx => {
    const client = new BannerbearClient({ ...ctx.auth, projectId: ctx.input.projectId });
    const result = await client.createDiagnosis(ctx.input.imageUid);
    const output = diagnosisOutput(result);
    return {
      output,
      message: `Image diagnosis ${stateMessage(result.status)} (UID: ${output.diagnosisUid}). Read the final report with get_resource.`
    };
  })
  .build();
