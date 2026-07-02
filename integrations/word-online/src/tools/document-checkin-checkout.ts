import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let documentCheckinCheckout = SlateTool.create(spec, {
  name: 'Check In/Out Document',
  key: 'document_checkin_checkout',
  description: `Check in or check out a Word document in OneDrive for Business or SharePoint.
**Check out** locks the document to prevent others from editing it. **Check in** unlocks the document and makes your changes visible to others.`,
  instructions: [
    'Check-out prevents others from editing until you check the document back in.',
    'Check-in makes the latest version visible to all users and unlocks the document.'
  ],
  constraints: [
    'Only available for documents in OneDrive for Business and SharePoint, not personal OneDrive.'
  ]
})
  .input(
    z.object({
      itemId: z.string().describe('The unique ID of the drive item'),
      action: z
        .enum(['checkin', 'checkout'])
        .describe('Whether to check in or check out the document'),
      comment: z
        .string()
        .optional()
        .describe('Comment to include when checking in (only used for check-in)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was performed successfully'),
      action: z.string().describe('The action that was performed ("checkin" or "checkout")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId
    });

    if (ctx.input.action === 'checkout') {
      await client.checkOut(ctx.input.itemId);
    } else {
      await client.checkIn(ctx.input.itemId, ctx.input.comment);
    }

    return {
      output: {
        success: true,
        action: ctx.input.action
      },
      message:
        ctx.input.action === 'checkout'
          ? `Checked out item \`${ctx.input.itemId}\` — document is now locked for editing`
          : `Checked in item \`${ctx.input.itemId}\`${ctx.input.comment ? ` with comment: "${ctx.input.comment}"` : ''}`
    };
  })
  .build();
