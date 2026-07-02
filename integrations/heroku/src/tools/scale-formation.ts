import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scaleFormation = SlateTool.create(spec, {
  name: 'Scale Formation',
  key: 'scale_formation',
  description: `View or scale dyno formations for a Heroku app. List current formation to see process types, quantities, and sizes, or scale by updating quantity and size per process type.`,
  instructions: [
    'To list the current formation, omit the "updates" field.',
    'Each update targets a process type (e.g., "web", "worker") and can change quantity, size, or both.'
  ]
})
  .input(
    z.object({
      appIdOrName: z.string().describe('App name or unique identifier'),
      updates: z
        .array(
          z.object({
            processType: z.string().describe('Process type to scale (e.g., "web", "worker")'),
            quantity: z.number().optional().describe('Number of dynos to run'),
            size: z
              .string()
              .optional()
              .describe(
                'Dyno size (e.g., "basic", "standard-1X", "standard-2X", "performance-m")'
              )
          })
        )
        .optional()
        .describe('Formation scaling updates. Omit to list current formation.')
    })
  )
  .output(
    z.object({
      formation: z.array(
        z.object({
          formationId: z.string().describe('Unique identifier of the formation entry'),
          command: z.string().describe('Command for this process type'),
          processType: z.string().describe('Process type name'),
          quantity: z.number().describe('Number of dynos running'),
          size: z.string().describe('Dyno size'),
          updatedAt: z.string().describe('When the formation was last updated')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { appIdOrName, updates } = ctx.input;

    if (!updates || updates.length === 0) {
      let formation = await client.listFormation(appIdOrName);
      return {
        output: {
          formation: formation.map(f => ({
            formationId: f.formationId,
            command: f.command,
            processType: f.type,
            quantity: f.quantity,
            size: f.size,
            updatedAt: f.updatedAt
          }))
        },
        message: `Current formation for **${appIdOrName}**: ${formation.map(f => `${f.type}=${f.quantity}x${f.size}`).join(', ')}.`
      };
    }

    if (updates.length === 1) {
      let u = updates[0]!;
      let result = await client.updateFormation(appIdOrName, u.processType, {
        quantity: u.quantity,
        size: u.size
      });
      return {
        output: {
          formation: [
            {
              formationId: result.formationId,
              command: result.command,
              processType: result.type,
              quantity: result.quantity,
              size: result.size,
              updatedAt: result.updatedAt
            }
          ]
        },
        message: `Scaled **${result.type}** to ${result.quantity}x${result.size} on app **${appIdOrName}**.`
      };
    }

    let results = await client.batchUpdateFormation(
      appIdOrName,
      updates.map(u => ({
        type: u.processType,
        quantity: u.quantity,
        size: u.size
      }))
    );

    return {
      output: {
        formation: results.map(f => ({
          formationId: f.formationId,
          command: f.command,
          processType: f.type,
          quantity: f.quantity,
          size: f.size,
          updatedAt: f.updatedAt
        }))
      },
      message: `Scaled formation on **${appIdOrName}**: ${results.map(f => `${f.type}=${f.quantity}x${f.size}`).join(', ')}.`
    };
  })
  .build();
