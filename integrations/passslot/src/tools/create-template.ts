import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a new pass template in PassSlot. Templates define the appearance and configuration of passes including style, colors, text fields, and barcode settings. All passes generated from a template inherit its configuration.`,
  instructions: [
    'The passType must be an existing pass type identifier from your account.',
    'The passDescription object follows the Apple Wallet pass.json structure with fields like logoText, foregroundColor, backgroundColor, barcode, and pass-style-specific sections (coupon, generic, eventTicket, boardingPass, storeCard).'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Display name for the template'),
      passType: z.string().describe('Pass type identifier (e.g., "pass.example.id1")'),
      passDescription: z
        .record(z.string(), z.any())
        .describe(
          'Pass configuration object following Apple Wallet pass.json structure (logoText, foregroundColor, backgroundColor, barcode, coupon/generic/eventTicket/boardingPass/storeCard fields)'
        )
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('Unique identifier for the created template'),
      name: z.string().describe('Template display name'),
      passType: z.string().describe('Pass type identifier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.createTemplate({
      name: ctx.input.name,
      passType: ctx.input.passType,
      description: ctx.input.passDescription
    });

    return {
      output: {
        templateId: result.id,
        name: result.name,
        passType: result.passType
      },
      message: `Created template **${result.name}** with ID **${result.id}**.`
    };
  })
  .build();
