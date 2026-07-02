import { SlateTool } from 'slates';
import { z } from 'zod';
import { VonageRestClient } from '../lib/client';
import { spec } from '../spec';

export let manageNumbers = SlateTool.create(spec, {
  name: 'Manage Numbers',
  key: 'manage_numbers',
  description: `Search for available virtual phone numbers, list your owned numbers, buy new numbers, cancel (release) numbers, and update number configuration.
Combines number search, purchase, and management in one tool.`,
  instructions: [
    'Use action "search" to find available numbers by country and type.',
    'Use action "list" to see your currently owned numbers.',
    'Use action "buy" to purchase a number. You need the country code and msisdn from a search result.',
    'Use action "cancel" to release a number you own.',
    'Use action "update" to change webhook URLs or link a number to an application.'
  ],
  constraints: [
    'Buying a number incurs a monthly charge.',
    'Number availability varies by country and type.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['search', 'list', 'buy', 'cancel', 'update'])
        .describe('Action to perform'),
      country: z
        .string()
        .optional()
        .describe('Two-letter country code (required for search, buy, cancel, update)'),
      msisdn: z
        .string()
        .optional()
        .describe('Phone number in E.164 format without + (required for buy, cancel, update)'),
      type: z
        .enum(['landline', 'mobile-lvn', 'landline-toll-free'])
        .optional()
        .describe('Number type filter for search'),
      pattern: z
        .string()
        .optional()
        .describe('Pattern to match when searching (e.g., "1234")'),
      features: z
        .string()
        .optional()
        .describe('Comma-separated features filter: SMS, VOICE, MMS'),
      size: z.number().optional().describe('Number of results to return (max 100)'),
      index: z.number().optional().describe('Starting index for pagination'),
      applicationId: z
        .string()
        .optional()
        .describe('Link number to this application ID (for update action)'),
      moHttpUrl: z.string().optional().describe('Inbound SMS webhook URL (for update action)'),
      voiceCallbackType: z
        .string()
        .optional()
        .describe('Voice callback type: "app" or "sip" or "tel" (for update action)'),
      voiceCallbackValue: z
        .string()
        .optional()
        .describe('Voice callback value (for update action)'),
      voiceStatusCallback: z
        .string()
        .optional()
        .describe('Voice status webhook URL (for update action)')
    })
  )
  .output(
    z.object({
      count: z.number().optional().describe('Total number of matching results'),
      numbers: z
        .array(
          z.object({
            country: z.string().optional().describe('Country code'),
            msisdn: z.string().optional().describe('Phone number'),
            type: z.string().optional().describe('Number type'),
            cost: z.string().optional().describe('Monthly cost'),
            features: z.array(z.string()).optional().describe('Supported features'),
            applicationId: z.string().optional().describe('Linked application ID')
          })
        )
        .optional()
        .describe('List of numbers'),
      success: z
        .boolean()
        .optional()
        .describe('Whether the action succeeded (for buy/cancel/update)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VonageRestClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    switch (ctx.input.action) {
      case 'search': {
        if (!ctx.input.country) throw new Error('country is required for search');
        let searchResult = await client.searchNumbers({
          country: ctx.input.country,
          type: ctx.input.type,
          pattern: ctx.input.pattern,
          features: ctx.input.features,
          size: ctx.input.size,
          index: ctx.input.index
        });
        return {
          output: { count: searchResult.count, numbers: searchResult.numbers },
          message: `Found **${searchResult.count}** available number(s) in **${ctx.input.country}**. Showing **${searchResult.numbers.length}** results.`
        };
      }

      case 'list': {
        let listResult = await client.listOwnedNumbers({
          country: ctx.input.country,
          applicationId: ctx.input.applicationId,
          size: ctx.input.size,
          index: ctx.input.index,
          pattern: ctx.input.pattern
        });
        return {
          output: { count: listResult.count, numbers: listResult.numbers },
          message: `You own **${listResult.count}** number(s). Showing **${listResult.numbers.length}** results.`
        };
      }

      case 'buy': {
        if (!ctx.input.country || !ctx.input.msisdn)
          throw new Error('country and msisdn are required for buy');
        await client.buyNumber(ctx.input.country, ctx.input.msisdn);
        return {
          output: { success: true },
          message: `Successfully purchased number **${ctx.input.msisdn}** in **${ctx.input.country}**.`
        };
      }

      case 'cancel': {
        if (!ctx.input.country || !ctx.input.msisdn)
          throw new Error('country and msisdn are required for cancel');
        await client.cancelNumber(ctx.input.country, ctx.input.msisdn);
        return {
          output: { success: true },
          message: `Successfully cancelled number **${ctx.input.msisdn}** in **${ctx.input.country}**.`
        };
      }

      case 'update': {
        if (!ctx.input.country || !ctx.input.msisdn)
          throw new Error('country and msisdn are required for update');
        await client.updateNumber({
          country: ctx.input.country,
          msisdn: ctx.input.msisdn,
          applicationId: ctx.input.applicationId,
          moHttpUrl: ctx.input.moHttpUrl,
          voiceCallbackType: ctx.input.voiceCallbackType,
          voiceCallbackValue: ctx.input.voiceCallbackValue,
          voiceStatusCallback: ctx.input.voiceStatusCallback
        });
        return {
          output: { success: true },
          message: `Successfully updated number **${ctx.input.msisdn}** configuration.`
        };
      }
    }
  })
  .build();
