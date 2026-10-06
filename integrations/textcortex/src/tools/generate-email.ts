import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { generationMetadata, modelInput } from '../lib/schemas';
import { spec } from '../spec';

export let generateEmail = SlateTool.create(spec, {
  name: 'Generate Email',
  key: 'generate_email',
  description: `Generate email body content based on a subject line. Optionally target a specific audience segment for tone and language adjustments. Ideal for marketing emails, outreach, and newsletters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subject: z.string().min(1).describe('Email subject line to generate body content for'),
      targetAudience: z
        .string()
        .optional()
        .describe(
          'Target audience for tone adjustment (e.g., "enterprise clients", "new subscribers")'
        ),
      model: modelInput,
      maxTokens: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of tokens to generate (default: 1024)'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe("Creativity level from 0 to 2. Omit to use the model's default"),
      generationCount: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe('Number of email variations to generate (default: 1)'),
      sourceLang: z.string().optional().describe('Source language code or "auto"'),
      targetLang: z
        .string()
        .optional()
        .describe('Target language code for the generated email')
    })
  )
  .output(
    z.object({
      emails: z
        .array(
          z.object({
            text: z.string().min(1).describe('Generated email body content'),
            index: z.number().describe('Index of this generation')
          })
        )
        .describe('Array of generated email bodies'),
      ...generationMetadata,
      remainingCredits: z
        .number()
        .optional()
        .describe('Remaining API credits when the balance can be retrieved')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateEmail({
      subject: ctx.input.subject,
      targetAudience: ctx.input.targetAudience,
      model: ctx.input.model,
      maxTokens: ctx.input.maxTokens,
      temperature: ctx.input.temperature,
      n: ctx.input.generationCount,
      sourceLang: ctx.input.sourceLang,
      targetLang: ctx.input.targetLang
    });

    let outputs = result.data.outputs;

    return {
      output: {
        emails: outputs.map(o => ({ text: o.text, index: o.index })),
        balanceWarning: result.balanceWarning,
        completionId: result.completionId,
        model: result.model,
        usage: result.usage,
        remainingCredits: result.data.remaining_credits
      },
      message: `Generated **${outputs.length}** email body variation(s) for subject "${ctx.input.subject}". ${result.balanceWarning ?? `Remaining credits: ${result.data.remaining_credits}.`}`
    };
  })
  .build();
