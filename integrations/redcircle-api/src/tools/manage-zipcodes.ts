import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageZipcodes = SlateTool.create(spec, {
  name: 'Manage Zipcodes',
  key: 'manage_zipcodes',
  description: `List, add, or delete zipcodes on your RedCircle API account. Zipcodes are used to localize product results by geographic area. After adding, zipcodes take approximately 2 minutes to become active.`,
  instructions: [
    'Use action "list" to see all configured zipcodes and usage.',
    'Use action "add" to add one or more zipcodes.',
    'Use action "delete" to remove one or more zipcodes. Warning: deleting a zipcode will cause any requests referencing it to fail.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'add', 'delete'])
        .describe('Action to perform: list, add, or delete zipcodes.'),
      zipcodes: z
        .array(z.string())
        .optional()
        .describe('Array of US zipcodes to add or delete. Required for add/delete actions.')
    })
  )
  .output(
    z.object({
      zipcodes: z.any().optional().describe('Map of zipcodes by domain (for list action).'),
      usage: z.any().optional().describe('Zipcode usage statistics (used, limit, available).'),
      message: z.string().optional().describe('Confirmation message for add/delete actions.'),
      requestInfo: z.any().optional().describe('Request metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let data = await client.listZipcodes();
      let totalZipcodes = Object.values(data.zipcodes ?? {}).reduce(
        (sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0),
        0
      );

      return {
        output: {
          zipcodes: data.zipcodes,
          usage: data.usage,
          requestInfo: data.request_info
        },
        message: `Found **${totalZipcodes}** configured zipcodes. Usage: ${data.usage?.used ?? 0}/${data.usage?.limit ?? 0}.`
      };
    }

    if (ctx.input.action === 'add') {
      let zipcodeEntries = (ctx.input.zipcodes ?? []).map(z => ({
        zipcode: z,
        domain: 'target.com'
      }));
      let data = await client.addZipcodes(zipcodeEntries);

      return {
        output: {
          message: data.request_info?.message,
          requestInfo: data.request_info
        },
        message: `Added zipcodes. ${data.request_info?.message ?? ''} They will become active in ~2 minutes.`
      };
    }

    // delete
    let zipcodeEntries = (ctx.input.zipcodes ?? []).map(z => ({
      zipcode: z,
      domain: 'target.com'
    }));
    let data = await client.deleteZipcodes(zipcodeEntries);

    return {
      output: {
        message: data.request_info?.message,
        requestInfo: data.request_info
      },
      message: `Deleted zipcodes. ${data.request_info?.message ?? ''}`
    };
  })
  .build();
