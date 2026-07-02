import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSslTest = SlateTool.create(spec, {
  name: 'Update SSL Test',
  key: 'update_ssl_test',
  description: `Update an existing SSL certificate monitoring check. Modify check rate, alert thresholds, contact groups, and other settings. Only provided fields will be updated.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the SSL test to update'),
      websiteUrl: z.string().optional().describe('URL of the website to monitor'),
      checkRate: z.number().optional().describe('Check frequency in seconds'),
      contactGroups: z
        .array(z.string())
        .optional()
        .describe('List of contact group IDs for alerts'),
      alertAt: z
        .array(z.number())
        .optional()
        .describe('Array of 3 days before expiry to send alerts'),
      alertBroken: z.boolean().optional().describe('Alert when certificate is broken'),
      alertExpiry: z
        .boolean()
        .optional()
        .describe('Alert when certificate is about to expire'),
      alertMixed: z.boolean().optional().describe('Alert when mixed content is detected'),
      alertReminder: z.boolean().optional().describe('Send alert reminders'),
      followRedirects: z.boolean().optional().describe('Whether to follow redirects'),
      hostname: z.string().optional().describe('Hostname to verify on certificate'),
      paused: z.boolean().optional().describe('Whether the test is paused'),
      userAgent: z.string().optional().describe('Custom user agent string'),
      tags: z.array(z.string()).optional().describe('Tags for the test')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      testId,
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

    let data: Record<string, any> = { ...rest };

    if (websiteUrl !== undefined) data.website_url = websiteUrl;
    if (checkRate !== undefined) data.check_rate = checkRate;
    if (contactGroups) data.contact_groups = contactGroups;
    if (alertAt) data.alert_at = alertAt;
    if (alertBroken !== undefined) data.alert_broken = alertBroken;
    if (alertExpiry !== undefined) data.alert_expiry = alertExpiry;
    if (alertMixed !== undefined) data.alert_mixed = alertMixed;
    if (alertReminder !== undefined) data.alert_reminder = alertReminder;
    if (followRedirects !== undefined) data.follow_redirects = followRedirects;
    if (userAgent !== undefined) data.user_agent = userAgent;

    await client.updateSslTest(testId, data);

    return {
      output: { success: true },
      message: `Updated SSL test **${testId}** successfully.`
    };
  })
  .build();
