import { SlateTool } from 'slates';
import { z } from 'zod';
import { EagleDocClient } from '../lib/client';
import { spec } from '../spec';

export let submitFeedback = SlateTool.create(spec, {
  name: 'Submit Feedback',
  key: 'submit_feedback',
  description: `Submit human feedback on document extractions to improve future OCR accuracy. You can either provide the original document with original and corrected JSON, or provide corrected JSON with text instructions describing extraction rules.`,
  instructions: [
    'For standard feedback: provide the original document file, the original extraction JSON, and the corrected JSON.',
    'For instruction-based feedback: provide the corrected JSON and text instructions describing the extraction rules (separate rules with semicolons).',
    'Set feedbackType to "standard" or "instructions" depending on which approach you want.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      feedbackType: z
        .enum(['standard', 'instructions'])
        .describe(
          '"standard" for file + original + corrected JSON, "instructions" for corrected JSON + text instructions'
        ),
      fileBase64: z
        .string()
        .optional()
        .describe('Base64-encoded original document file (required for standard feedback)'),
      fileName: z
        .string()
        .optional()
        .describe('Original file name with extension (required for standard feedback)'),
      originalJson: z
        .string()
        .optional()
        .describe(
          'Original extraction result as JSON string (required for standard feedback)'
        ),
      correctedJson: z
        .string()
        .describe('Corrected extraction JSON string with your corrections applied'),
      instructions: z
        .string()
        .optional()
        .describe(
          'Text instructions describing extraction rules, separated by semicolons (required for instruction-based feedback)'
        ),
      overwritePreviousLearnings: z
        .boolean()
        .optional()
        .describe('Replace all previous learnings with this feedback (instructions mode only)')
    })
  )
  .output(
    z.object({
      feedbackMessage: z.string().describe('Confirmation message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EagleDocClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result: any;

    if (ctx.input.feedbackType === 'standard') {
      if (!ctx.input.fileBase64 || !ctx.input.fileName || !ctx.input.originalJson) {
        throw new Error('Standard feedback requires fileBase64, fileName, and originalJson');
      }
      result = await client.submitFeedback({
        fileBase64: ctx.input.fileBase64,
        fileName: ctx.input.fileName,
        originalJson: ctx.input.originalJson,
        correctedJson: ctx.input.correctedJson
      });
    } else {
      if (!ctx.input.instructions) {
        throw new Error('Instruction-based feedback requires instructions');
      }
      result = await client.submitFeedbackWithInstructions({
        correctedJson: ctx.input.correctedJson,
        instructions: ctx.input.instructions,
        overwrite: ctx.input.overwritePreviousLearnings
      });
    }

    return {
      output: {
        feedbackMessage: result.message || 'Feedback submitted successfully.'
      },
      message: `Feedback submitted successfully via **${ctx.input.feedbackType}** mode.`
    };
  })
  .build();
