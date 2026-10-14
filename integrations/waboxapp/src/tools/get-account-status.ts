import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountStatusTool = SlateTool.create(spec, {
  name: 'Get Account Status',
  key: 'get_account_status',
  description: `Retrieve information about the linked WhatsApp account, including its phone number, account name, device details, battery level, and configured webhook URL.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      phoneNumber: z.string().optional().describe('Linked WhatsApp account phone number.'),
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
    let name = result.alias ?? result.name;
    let hook = result.hook_url ?? result.hook;
    let battery =
      typeof result.battery === 'number'
        ? result.battery
        : typeof result.battery === 'string' && result.battery.trim()
          ? Number(result.battery)
          : undefined;
    let isCharging =
      result.plugged === true || result.plugged === 1 || result.plugged === '1'
        ? true
        : result.plugged === false || result.plugged === 0 || result.plugged === '0'
          ? false
          : undefined;

    return {
      output: {
        phoneNumber: typeof result.uid === 'string' ? result.uid : ctx.auth.phoneNumber,
        accountName: typeof name === 'string' ? name : undefined,
        platform: typeof result.platform === 'string' ? result.platform : undefined,
        batteryLevel: battery !== undefined && Number.isFinite(battery) ? battery : undefined,
        isCharging,
        locale: typeof result.locale === 'string' ? result.locale : undefined,
        webhookUrl: typeof hook === 'string' ? hook.trim() : undefined,
        raw: result
      },
      message: `Retrieved details for WhatsApp account **${typeof name === 'string' ? name : ctx.auth.phoneNumber}**.`
    };
  })
  .build();
