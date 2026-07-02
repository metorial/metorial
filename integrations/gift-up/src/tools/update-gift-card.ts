import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateGiftCard = SlateTool.create(spec, {
  name: 'Update Gift Card',
  key: 'update_gift_card',
  description: `Update properties of a gift card such as title, expiry date, valid-from date, recipient details, SKU, and terms. Only provide the fields you want to change.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      code: z.string().describe('The gift card code to update'),
      title: z.string().optional().describe('New title for the gift card'),
      expiresOn: z.string().optional().describe('New expiry date (ISO 8601)'),
      validFrom: z.string().optional().describe('New valid-from date (ISO 8601)'),
      recipientEmail: z.string().optional().describe('New recipient email'),
      recipientName: z.string().optional().describe('New recipient name'),
      sku: z.string().optional().describe('New SKU'),
      terms: z.string().optional().describe('New terms and conditions')
    })
  )
  .output(
    z
      .object({
        code: z.string().describe('Gift card code'),
        title: z.string().nullable().describe('Updated title'),
        expiresOn: z.string().nullable().describe('Updated expiry date'),
        validFrom: z.string().nullable().describe('Updated valid-from date'),
        recipientEmail: z.string().nullable().describe('Updated recipient email'),
        recipientName: z.string().nullable().describe('Updated recipient name'),
        sku: z.string().nullable().describe('Updated SKU'),
        terms: z.string().nullable().describe('Updated terms'),
        remainingValue: z.number().describe('Current remaining balance'),
        canBeRedeemed: z.boolean().describe('Whether the gift card can be redeemed')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    let patchMap: Record<string, string> = {
      title: '/title',
      expiresOn: '/expireson',
      validFrom: '/validfrom',
      recipientEmail: '/receipientemail',
      recipientName: '/recipientname',
      sku: '/sku',
      terms: '/terms'
    };

    let patches: Array<{ op: string; path: string; value: any }> = [];
    for (let [key, path] of Object.entries(patchMap)) {
      let value = (ctx.input as any)[key];
      if (value !== undefined) {
        patches.push({ op: 'replace', path, value });
      }
    }

    if (patches.length === 0) {
      let current = await client.getGiftCard(ctx.input.code);
      return {
        output: current,
        message: 'No fields were provided to update.'
      };
    }

    let updated = await client.updateGiftCard(ctx.input.code, patches);

    let updatedFields = patches.map(p => p.path.replace('/', '')).join(', ');
    return {
      output: updated,
      message: `Updated gift card **${ctx.input.code}**: changed ${updatedFields}`
    };
  })
  .build();
