import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  backgroundRefSchema,
  mapPrintJob,
  nudgeSchema,
  postageSchema,
  printingSchema,
  printJobSchema,
  recipientSchema,
  splittingSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let createPrintJob = SlateTool.create(spec, {
  name: 'Create Print Job',
  key: 'create_print_job',
  description: `Create a new print job to send physical letters or postcards via Royal Mail. Supports multiple content strategies: provide HTML/text content, reference a pre-designed template, or supply a file URL. Recipients can be specified inline or via a mailing list. Jobs can be created as drafts for review or confirmed immediately for printing.`,
  instructions: [
    'Set confirmed to true to immediately submit for printing, or leave as false to create a draft you can review and confirm later.',
    'For postcards, provide frontImageUrl and backImageUrl instead of content or template.',
    'Use testmode for testing without incurring costs or sending actual mail.'
  ],
  constraints: [
    'Confirmed print jobs cannot be modified.',
    'Test mode print jobs are deleted one week after confirmation.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      type: z.enum(['letter', 'postcard']).default('letter').describe('Type of mail to send'),
      confirmed: z
        .boolean()
        .default(false)
        .describe('Whether to confirm the job immediately for printing'),
      testmode: z
        .boolean()
        .optional()
        .describe(
          'Create as a test print job (free, never sent). Overrides config-level testmode.'
        ),
      reference: z.string().optional().describe('User-provided reference for this print job'),

      // Content strategies (choose one)
      content: z.string().optional().describe('Text or HTML content for the letter body'),
      templateId: z.string().optional().describe('Template ID to use for the letter content'),
      fileUrl: z
        .string()
        .optional()
        .describe('URL of a PDF, Word, RTF, PNG, or JPEG file to use as content'),

      // Postcard images
      frontImageUrl: z.string().optional().describe('URL of the front image for postcards'),
      backImageUrl: z.string().optional().describe('URL of the back image for postcards'),

      // Recipients
      recipients: z
        .array(recipientSchema)
        .optional()
        .describe('Array of recipients with addresses and optional template variables'),
      mailingListId: z.string().optional().describe('Mailing list ID to use as recipients'),

      // Printing options
      splitting: splittingSchema
        .optional()
        .describe('Document splitting options for large files'),
      printing: printingSchema.optional().describe('Printing quality and format options'),
      postage: postageSchema.optional().describe('Postage service and scheduling options'),
      background: backgroundRefSchema.optional().describe('Background/letterhead to apply'),
      nudge: nudgeSchema.optional().describe('Page position offset adjustments in mm'),

      confidential: z.boolean().optional().describe('Mark letters as confidential'),
      addressWindow: z
        .enum(['left', 'right'])
        .optional()
        .describe('Address window position on the envelope'),
      confirmationEmail: z
        .boolean()
        .optional()
        .describe('Send a confirmation email when job is confirmed'),
      insertId: z.string().optional().describe('Pre-printed insert material ID'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom key-value metadata to store with the print job'),

      removeLettersContaining: z
        .string()
        .optional()
        .describe('Remove letters from the job that contain this phrase')
    })
  )
  .output(printJobSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {
      type: ctx.input.type,
      confirmed: ctx.input.confirmed,
      testmode: ctx.input.testmode ?? ctx.config.testmode
    };

    if (ctx.input.reference) params.reference = ctx.input.reference;
    if (ctx.input.content) params.content = ctx.input.content;
    if (ctx.input.templateId) params.template = ctx.input.templateId;
    if (ctx.input.mailingListId) params.mailing_list = ctx.input.mailingListId;
    if (ctx.input.confidential !== undefined) params.confidential = ctx.input.confidential;
    if (ctx.input.addressWindow) params.address_window = ctx.input.addressWindow;
    if (ctx.input.confirmationEmail !== undefined)
      params.confirmation_email = ctx.input.confirmationEmail;
    if (ctx.input.insertId) params.insert = ctx.input.insertId;
    if (ctx.input.metadata) params.metadata = ctx.input.metadata;

    // File content
    if (ctx.input.fileUrl) {
      params.file = { url: ctx.input.fileUrl };
    }

    // Postcard images
    if (ctx.input.frontImageUrl && ctx.input.backImageUrl) {
      params.file = {
        front: { url: ctx.input.frontImageUrl },
        back: { url: ctx.input.backImageUrl }
      };
    }

    // Recipients
    if (ctx.input.recipients) {
      params.recipients = ctx.input.recipients;
    }

    // Splitting
    if (ctx.input.splitting) {
      params.splitting = {
        method: ctx.input.splitting.method,
        phrase: ctx.input.splitting.phrase,
        pages: ctx.input.splitting.pages
      };
    }

    // Printing options
    if (ctx.input.printing) {
      params.printing = {
        double_sided: ctx.input.printing.doubleSided,
        premium_quality: ctx.input.printing.premiumQuality,
        black_and_white: ctx.input.printing.blackAndWhite,
        matt_finish: ctx.input.printing.mattFinish
      };
    }

    // Postage options
    if (ctx.input.postage) {
      params.postage = {
        service: ctx.input.postage.service,
        ideal_envelope: ctx.input.postage.idealEnvelope,
        mail_date: ctx.input.postage.mailDate
      };
    }

    // Background
    if (ctx.input.background) {
      params.background = {
        first_page: ctx.input.background.firstPage,
        other_pages: ctx.input.background.otherPages
      };
    }

    // Nudge
    if (ctx.input.nudge) {
      params.nudge = {
        x: ctx.input.nudge.x,
        y: ctx.input.nudge.y
      };
    }

    // Remove letters
    if (ctx.input.removeLettersContaining) {
      params.remove_letters = { containing: ctx.input.removeLettersContaining };
    }

    let result = await client.createPrintJob(params);
    let mapped = mapPrintJob(result);

    let statusText = mapped.confirmed
      ? 'confirmed and queued for printing'
      : 'created as draft';
    let letterCount = mapped.letters?.length ?? 0;

    return {
      output: mapped,
      message: `Print job **${mapped.printJobId}** ${statusText} with **${letterCount}** letter(s). Type: ${mapped.type ?? 'letter'}.${mapped.testmode ? ' *(test mode)*' : ''}`
    };
  })
  .build();
