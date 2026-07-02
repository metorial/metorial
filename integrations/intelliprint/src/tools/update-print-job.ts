import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  backgroundRefSchema,
  mapPrintJob,
  nudgeSchema,
  postageSchema,
  printJobSchema,
  splittingSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let updatePrintJob = SlateTool.create(spec, {
  name: 'Update Print Job',
  key: 'update_print_job',
  description: `Update a draft print job's settings. Can modify postage, printing options, background, scheduling, and other settings. Can also be used to confirm a draft job for printing by setting confirmed to true.`,
  instructions: [
    'Only draft (unconfirmed) print jobs can be updated.',
    'Set confirmed to true to submit the draft for printing.'
  ],
  constraints: ['Cannot update a print job that has already been confirmed.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      printJobId: z.string().describe('The ID of the print job to update'),
      confirmed: z
        .boolean()
        .optional()
        .describe('Set to true to confirm the draft and submit for printing'),
      reference: z.string().optional().describe('Updated reference'),
      splitting: splittingSchema.optional().describe('Updated splitting options'),
      printing: z
        .object({
          premiumQuality: z.boolean().optional(),
          blackAndWhite: z.boolean().optional(),
          mattFinish: z.boolean().optional()
        })
        .optional()
        .describe('Updated printing options'),
      postage: postageSchema.optional().describe('Updated postage and scheduling options'),
      background: backgroundRefSchema.optional().describe('Updated background/letterhead'),
      nudge: nudgeSchema.optional().describe('Updated page position offsets'),
      confidential: z.boolean().optional().describe('Updated confidentiality setting'),
      addressWindow: z
        .enum(['left', 'right'])
        .optional()
        .describe('Updated address window position'),
      confirmationEmail: z.boolean().optional().describe('Send confirmation email'),
      insertId: z.string().optional().describe('Updated insert material ID'),
      metadata: z.record(z.string(), z.any()).optional().describe('Updated custom metadata'),
      removeLettersContaining: z
        .string()
        .optional()
        .describe('Remove letters containing this phrase')
    })
  )
  .output(printJobSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {};

    if (ctx.input.confirmed !== undefined) params.confirmed = ctx.input.confirmed;
    if (ctx.input.reference !== undefined) params.reference = ctx.input.reference;
    if (ctx.input.confidential !== undefined) params.confidential = ctx.input.confidential;
    if (ctx.input.addressWindow) params.address_window = ctx.input.addressWindow;
    if (ctx.input.confirmationEmail !== undefined)
      params.confirmation_email = ctx.input.confirmationEmail;
    if (ctx.input.insertId) params.insert = ctx.input.insertId;
    if (ctx.input.metadata) params.metadata = ctx.input.metadata;

    if (ctx.input.splitting) {
      params.splitting = {
        method: ctx.input.splitting.method,
        phrase: ctx.input.splitting.phrase,
        pages: ctx.input.splitting.pages
      };
    }

    if (ctx.input.printing) {
      params.printing = {
        premium_quality: ctx.input.printing.premiumQuality,
        black_and_white: ctx.input.printing.blackAndWhite,
        matt_finish: ctx.input.printing.mattFinish
      };
    }

    if (ctx.input.postage) {
      params.postage = {
        service: ctx.input.postage.service,
        ideal_envelope: ctx.input.postage.idealEnvelope,
        mail_date: ctx.input.postage.mailDate
      };
    }

    if (ctx.input.background) {
      params.background = {
        first_page: ctx.input.background.firstPage,
        other_pages: ctx.input.background.otherPages
      };
    }

    if (ctx.input.nudge) {
      params.nudge = {
        x: ctx.input.nudge.x,
        y: ctx.input.nudge.y
      };
    }

    if (ctx.input.removeLettersContaining) {
      params.remove_letters = { containing: ctx.input.removeLettersContaining };
    }

    let result = await client.updatePrintJob(ctx.input.printJobId, params);
    let mapped = mapPrintJob(result);

    let action = ctx.input.confirmed ? 'confirmed and queued for printing' : 'updated';

    return {
      output: mapped,
      message: `Print job **${mapped.printJobId}** ${action}.`
    };
  })
  .build();
