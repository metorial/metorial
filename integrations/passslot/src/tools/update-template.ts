import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update an existing pass template's configuration. Changes are applied to all passes generated from this template. Can also update template actions, branding, distribution restrictions, and payment settings.`,
  instructions: [
    'Changes to a template are propagated to all existing passes generated from it.',
    'Only provide the sections you want to update. Restrictions replace the previous settings: omitted restrictions are disabled.',
    'Branding footer images require the separate image API and cannot be set through branding.footerImage.',
    'Payment settings require the Professional plan. Provider names are case sensitive: PayPalNVP, Stripe, PAYMILL.'
  ]
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to update'),
      name: z.string().optional().describe('New template display name'),
      passType: z
        .string()
        .optional()
        .describe('New pass type identifier. Call list_pass_types to discover identifiers.'),
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

    let {
      templateId,
      name,
      passType,
      passDescription,
      actions,
      branding,
      restrictions,
      payment
    } = ctx.input;
    if (
      [name, passType, passDescription, actions, branding, restrictions, payment].every(
        value => value === undefined
      )
    ) {
      throw createApiServiceError(
        'Provide at least one template field or settings section to update.'
      );
    }
    if (branding && Object.hasOwn(branding, 'footerImage')) {
      throw createApiServiceError(
        'Use the PassSlot branding footer image API to change footer images; omit branding.footerImage here.'
      );
    }

    if (passDescription !== undefined || name !== undefined || passType !== undefined) {
      let current = await client.getTemplate(templateId);
      await client.updateTemplate(templateId, {
        id: templateId,
        name: name ?? current.name,
        passType: passType ?? current.passType,
        description: passDescription ?? current.description
      });
      if (passDescription !== undefined) updated.push('description');
      if (name !== undefined) updated.push('name');
      if (passType !== undefined) updated.push('passType');
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
