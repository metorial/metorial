import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
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
    let client = new BannerbearClient({ token: ctx.auth.token });

    let result = await client.createDiagnosis(ctx.input.imageUid);

    // If the diagnosis is pending, try to fetch it
    let diagnosis = result;
    if (result.status === 'pending' && result.uid) {
      try {
        diagnosis = await client.getDiagnosis(result.uid);
      } catch {
        // Still pending, return initial result
      }
    }

    let report =
      diagnosis.report?.external_images?.map((item: any) => ({
        url: item.url,
        result: item.result,
        comment: item.comment
      })) || null;

    return {
      output: {
        diagnosisUid: diagnosis.uid,
        status: diagnosis.status,
        report
      },
      message: `Diagnosis ${diagnosis.status === 'completed' ? 'completed' : 'initiated'} for image ${ctx.input.imageUid}. ${report ? `Found ${report.length} external image(s) checked.` : 'Report is still processing.'}`
    };
  })
  .build();
