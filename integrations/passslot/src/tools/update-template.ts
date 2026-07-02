import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update an existing pass template's configuration. Changes are applied to all passes generated from this template. Can also update template actions, branding, distribution restrictions, and payment settings.`,
  instructions: [
    'Changes to a template are propagated to all existing passes generated from it.',
    'Only provide the fields you want to update.'
  ]
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to update'),
      passDescription: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Updated pass configuration (logoText, foregroundColor, backgroundColor, barcode, etc.)'
        ),
      actions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Template actions configuration (verification/redemption behavior)'),
      branding: z
        .record(z.string(), z.any())
        .optional()
        .describe('Template branding settings'),
      restrictions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Distribution restriction settings'),
      payment: z
        .record(z.string(), z.any())
        .optional()
        .describe('Payment settings (PayPal, Stripe, or PAYMILL)')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('ID of the updated template'),
      updated: z.array(z.string()).describe('List of sections that were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let updated: string[] = [];

    if (ctx.input.passDescription) {
      await client.updateTemplate(ctx.input.templateId, ctx.input.passDescription);
      updated.push('description');
    }

    if (ctx.input.actions) {
      await client.updateTemplateActions(ctx.input.templateId, ctx.input.actions);
      updated.push('actions');
    }

    if (ctx.input.branding) {
      await client.updateTemplateBranding(ctx.input.templateId, ctx.input.branding);
      updated.push('branding');
    }

    if (ctx.input.restrictions) {
      await client.updateTemplateRestrictions(ctx.input.templateId, ctx.input.restrictions);
      updated.push('restrictions');
    }

    if (ctx.input.payment) {
      await client.updateTemplatePayment(ctx.input.templateId, ctx.input.payment);
      updated.push('payment');
    }

    return {
      output: {
        templateId: ctx.input.templateId,
        updated
      },
      message: `Updated template **${ctx.input.templateId}**: ${updated.join(', ')}.`
    };
  })
  .build();
