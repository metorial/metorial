import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePass = SlateTool.create(spec, {
  name: 'Update Pass',
  key: 'update_pass',
  description: `Update an existing pass with new field values, colors, dates, stored value, or locations. Uses partial update so only the provided fields are changed. Can also void/unvoid a pass or move it to a different template.`,
  instructions: [
    'Only the provided fields are updated; omitted fields remain unchanged.',
    'To void a pass, set voided to true. To unvoid, set voided to false.',
    'To move a pass to a different template, set targetTemplateId. Both templates must be in the same project.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      passId: z.string().describe('Identifier of the pass to update'),
      voided: z
        .boolean()
        .optional()
        .describe('Set to true to void (invalidate) the pass, false to unvoid'),
      expirationDate: z
        .string()
        .optional()
        .describe('New expiration date in "Y-m-d H:i" format'),
      relevantDate: z.string().optional().describe('New relevant date in "Y-m-d H:i" format'),
      storedValue: z
        .number()
        .optional()
        .describe('Updated stored value (e.g., loyalty balance)'),
      labelColor: z.string().optional().describe('New hex color for labels'),
      foregroundColor: z.string().optional().describe('New hex color for field values'),
      backgroundColor: z.string().optional().describe('New hex color for background'),
      locations: z
        .array(
          z.object({
            latitude: z.number().describe('Latitude coordinate'),
            longitude: z.number().describe('Longitude coordinate'),
            relevantText: z.string().optional().describe('Notification text at this location')
          })
        )
        .optional()
        .describe('Updated location triggers'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated custom field values keyed by field key'),
      targetTemplateId: z
        .string()
        .optional()
        .describe('Move the pass to a different template (must be in the same project)')
    })
  )
  .output(
    z.object({
      passId: z.string().describe('Identifier of the updated pass'),
      moved: z
        .boolean()
        .optional()
        .describe('Whether the pass was moved to a different template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    // Handle voiding separately since it uses PUT
    if (ctx.input.voided !== undefined) {
      await client.voidPass(ctx.input.passId, ctx.input.voided);
    }

    // Handle move separately
    let moved = false;
    if (ctx.input.targetTemplateId) {
      await client.movePass(ctx.input.passId, ctx.input.targetTemplateId);
      moved = true;
    }

    // Build update body from remaining fields
    let body: Record<string, any> = {};
    if (ctx.input.expirationDate) body.expirationDate = ctx.input.expirationDate;
    if (ctx.input.relevantDate) body.relevantDate = ctx.input.relevantDate;
    if (ctx.input.storedValue !== undefined) body.storedValue = ctx.input.storedValue;
    if (ctx.input.labelColor) body.labelColor = ctx.input.labelColor;
    if (ctx.input.foregroundColor) body.foregroundColor = ctx.input.foregroundColor;
    if (ctx.input.backgroundColor) body.backgroundColor = ctx.input.backgroundColor;
    if (ctx.input.locations) body.locations = ctx.input.locations;

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        body[key] = value;
      }
    }

    if (Object.keys(body).length > 0) {
      await client.patchPass(ctx.input.passId, body);
    }

    let actions: string[] = [];
    if (ctx.input.voided === true) actions.push('voided');
    if (ctx.input.voided === false) actions.push('unvoided');
    if (moved) actions.push(`moved to template \`${ctx.input.targetTemplateId}\``);
    if (Object.keys(body).length > 0) actions.push('updated fields');

    return {
      output: { passId: ctx.input.passId, moved },
      message: `Pass \`${ctx.input.passId}\`: ${actions.join(', ')}.`
    };
  })
  .build();
