import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSslTest = SlateTool.create(spec, {
  name: 'Create SSL Test',
  key: 'create_ssl_test',
  description: `Create a new SSL certificate monitoring check. Monitors certificate validity, expiration, cipher strength, and mixed content. Configure alert schedules for days before expiry and alert types.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      websiteUrl: z.string().describe('URL of the website to monitor SSL certificate for'),
      checkRate: z
        .number()
        .describe('Check frequency in seconds (e.g. 300, 600, 1800, 3600, 86400)'),
      contactGroups: z
        .array(z.string())
        .optional()
        .describe('List of contact group IDs for alerts'),
      alertAt: z
        .array(z.number())
        .optional()
        .describe('Array of 3 days before expiry to send alerts (e.g. [1, 7, 30])'),
      alertBroken: z.boolean().optional().describe('Alert when certificate is broken'),
      alertExpiry: z
        .boolean()
        .optional()
        .describe('Alert when certificate is about to expire'),
      alertMixed: z.boolean().optional().describe('Alert when mixed content is detected'),
      alertReminder: z.boolean().optional().describe('Send alert reminders'),
      followRedirects: z.boolean().optional().describe('Whether to follow redirects'),
      hostname: z.string().optional().describe('Hostname to verify on certificate'),
      paused: z.boolean().optional().describe('Whether the test starts paused'),
      userAgent: z.string().optional().describe('Custom user agent string'),
      tags: z.array(z.string()).optional().describe('Tags for the test')
    })
  )
  .output(
    z.object({
      testId: z.string().describe('ID of the newly created SSL test')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      websiteUrl,
      checkRate,
      contactGroups,
      alertAt,
      alertBroken,
      alertExpiry,
      alertMixed,
      alertReminder,
      followRedirects,
      userAgent,
      ...rest
    } = ctx.input;

    let data: Record<string, any> = {
      ...rest,
      website_url: websiteUrl,
      check_rate: checkRate
    };

    if (contactGroups) data.contact_groups = contactGroups;
    if (alertAt) data.alert_at = alertAt;
    if (alertBroken !== undefined) data.alert_broken = alertBroken;
    if (alertExpiry !== undefined) data.alert_expiry = alertExpiry;
    if (alertMixed !== undefined) data.alert_mixed = alertMixed;
    if (alertReminder !== undefined) data.alert_reminder = alertReminder;
    if (followRedirects !== undefined) data.follow_redirects = followRedirects;
    if (userAgent !== undefined) data.user_agent = userAgent;

    let result = await client.createSslTest(data);
    let testId = String(result?.data?.new_id ?? result?.new_id ?? '');

    return {
      output: { testId },
      message: `Created SSL test for **${websiteUrl}** (ID: ${testId}).`
    };
  })
  .build();
