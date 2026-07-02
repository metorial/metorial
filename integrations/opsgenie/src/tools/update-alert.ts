import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let updateAlert = SlateTool.create(spec, {
  name: 'Update Alert',
  key: 'update_alert',
  description: `Update properties of an existing alert. Can update the message, description, and priority. Each field is updated independently — only provide the fields you want to change.`,
  instructions: ['Only the provided fields will be updated. Omitted fields remain unchanged.']
})
  .input(
    z.object({
      alertIdentifier: z.string().describe('Alert ID, tiny ID, or alias'),
      identifierType: z
        .enum(['id', 'tiny', 'alias'])
        .optional()
        .describe('Type of identifier provided. Defaults to "id"'),
      message: z.string().optional().describe('New alert message'),
      description: z.string().optional().describe('New alert description'),
      priority: z
        .enum(['P1', 'P2', 'P3', 'P4', 'P5'])
        .optional()
        .describe('New priority level')
    })
  )
  .output(
    z.object({
      requestIds: z.array(z.string()).describe('Request IDs for tracking the async updates'),
      updatedFields: z.array(z.string()).describe('Fields that were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let idType = ctx.input.identifierType ?? 'id';
    let requestIds: string[] = [];
    let updatedFields: string[] = [];

    if (ctx.input.message !== undefined) {
      let res = await client.updateAlertMessage(ctx.input.alertIdentifier, idType, {
        message: ctx.input.message
      });
      requestIds.push(res.requestId);
      updatedFields.push('message');
    }

    if (ctx.input.description !== undefined) {
      let res = await client.updateAlertDescription(ctx.input.alertIdentifier, idType, {
        description: ctx.input.description
      });
      requestIds.push(res.requestId);
      updatedFields.push('description');
    }

    if (ctx.input.priority !== undefined) {
      let res = await client.updateAlertPriority(ctx.input.alertIdentifier, idType, {
        priority: ctx.input.priority
      });
      requestIds.push(res.requestId);
      updatedFields.push('priority');
    }

    if (updatedFields.length === 0) {
      throw new Error(
        'No fields provided to update. Provide at least one of: message, description, priority.'
      );
    }

    return {
      output: {
        requestIds,
        updatedFields
      },
      message: `Updated alert fields: **${updatedFields.join(', ')}**`
    };
  })
  .build();
