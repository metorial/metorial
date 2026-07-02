import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let blockSchema = z.object({
  type: z
    .enum([
      'sender',
      'tracking',
      'text',
      'number',
      'email',
      'phone',
      'url',
      'date',
      'rating',
      'select',
      'radio',
      'checkbox',
      'country'
    ])
    .describe(
      'Block type. "sender" and "tracking" are object blocks (max 1 each). All others are field blocks.'
    ),
  name: z
    .string()
    .optional()
    .describe(
      'Unique name for field blocks (required for all types except sender and tracking). Must not contain spaces.'
    ),
  value: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .describe('Value for field blocks. The expected type depends on the block type.'),
  properties: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Properties for object blocks (sender, tracking). For sender: email, firstName, lastName, phone, company. For tracking: utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referrer.'
    )
});

export let submitForm = SlateTool.create(spec, {
  name: 'Submit Form',
  key: 'submit_form',
  description: `Submit data to a Getform/Forminit form endpoint. Uses the block-based submission format to send structured form data including sender info, text fields, emails, ratings, and more.

Supports all block types: **sender** (email, name, phone, company), **tracking** (UTM parameters), and field blocks like **text**, **number**, **email**, **phone**, **url**, **date**, **rating**, **select**, **radio**, **checkbox**, and **country**.`,
  instructions: [
    'Object blocks (sender, tracking) use "properties" and should have at most 1 per submission.',
    'Field blocks require a unique "name" and a "value".',
    'Maximum 50 field blocks per submission, maximum 20 blocks of the same type.'
  ],
  constraints: [
    'File uploads are not supported via this tool (requires multipart/form-data).',
    'Rate limits apply: 1 request per 5 seconds without API key, 5 per second with API key.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      formId: z
        .string()
        .describe('The unique form endpoint ID. Found in the form dashboard URL or settings.'),
      blocks: z
        .array(blockSchema)
        .min(1)
        .describe('Array of form blocks to submit. Must include at least one block.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the submission was successful.'),
      submissionHashId: z.string().describe('Unique hash ID for the submitted form entry.'),
      submissionDate: z.string().describe('Timestamp of when the submission was recorded.'),
      redirectUrl: z
        .string()
        .optional()
        .describe('Custom redirect URL configured for the form, if any.'),
      submittedBlocks: z
        .record(z.string(), z.unknown())
        .describe('The submitted data organized by block type as stored by the service.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    ctx.progress('Submitting form data...');

    let result = await client.submitForm({
      formId: ctx.input.formId,
      blocks: ctx.input.blocks
    });

    return {
      output: {
        success: result.success,
        submissionHashId: result.submission.hashId,
        submissionDate: result.submission.date,
        redirectUrl: result.redirectUrl,
        submittedBlocks: result.submission.blocks
      },
      message: `Successfully submitted form data to form **${ctx.input.formId}**. Submission ID: \`${result.submission.hashId}\`.`
    };
  })
  .build();
