import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountStatusTool = SlateTool.create(spec, {
  name: 'Get Account Status',
  key: 'get_account_status',
  description: `Retrieve the current status of the linked WhatsApp account. Returns connectivity information, device details, battery level, and the configured webhook URL.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountName: z
        .string()
        .optional()
        .describe('Name associated with the WhatsApp account.'),
      platform: z.string().optional().describe('Smartphone platform (e.g., Android, iPhone).'),
      batteryLevel: z
        .number()
        .optional()
        .describe('Current battery level of the phone (0-100).'),
      isCharging: z.boolean().optional().describe('Whether the phone is currently charging.'),
      locale: z.string().optional().describe('Locale setting of the phone.'),
      webhookUrl: z
        .string()
        .optional()
        .describe('Currently configured webhook URL for event notifications.'),
      raw: z.any().describe('Full raw response from the Waboxapp API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      phoneNumber: ctx.auth.phoneNumber
    });

    let result = await client.getStatus();

    return {
      output: {
        accountName: result?.name,
        platform: result?.platform,
        batteryLevel: result?.battery,
        isCharging: result?.plugged,
        locale: result?.locale,
        webhookUrl: result?.hook,
        raw: result
      },
      message: `Account **${result?.name ?? ctx.auth.phoneNumber}** is connected on **${result?.platform ?? 'unknown'}** (battery: ${result?.battery ?? 'N/A'}%).`
    };
  })
  .build();
