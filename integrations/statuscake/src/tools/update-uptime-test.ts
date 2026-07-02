import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateUptimeTest = SlateTool.create(spec, {
  name: 'Update Uptime Test',
  key: 'update_uptime_test',
  description: `Update an existing uptime monitoring check. Modify any configurable property including name, check rate, regions, alert contacts, content matching, and more. Only provided fields will be updated.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the uptime test to update'),
      name: z.string().optional().describe('New name for the test'),
      checkRate: z.number().optional().describe('Check frequency in seconds'),
      confirmation: z
        .number()
        .optional()
        .describe('Number of confirmation servers needed before alert'),
      contactGroups: z
        .array(z.string())
        .optional()
        .describe('List of contact group IDs for alerts'),
      regions: z.array(z.string()).optional().describe('List of monitoring region codes'),
      tags: z.array(z.string()).optional().describe('Tags for the test'),
      triggerRate: z.number().optional().describe('Minutes to wait before sending alert'),
      paused: z.boolean().optional().describe('Whether the test is paused'),
      followRedirects: z.boolean().optional().describe('Whether to follow HTTP redirects'),
      enableSslAlert: z.boolean().optional().describe('Whether to alert on SSL issues'),
      findString: z.string().optional().describe('String to search for in the response body'),
      doNotFind: z
        .boolean()
        .optional()
        .describe('If true, alert when the find_string IS found'),
      port: z.number().optional().describe('Custom port'),
      postBody: z.string().optional().describe('POST body content for HTTP tests'),
      postRaw: z.string().optional().describe('Raw POST data for HTTP tests'),
      customHeader: z.string().optional().describe('Custom HTTP header as JSON string'),
      basicUsername: z.string().optional().describe('Basic auth username'),
      basicPassword: z.string().optional().describe('Basic auth password'),
      timeout: z.number().optional().describe('Timeout in seconds'),
      statusCodes: z
        .array(z.string())
        .optional()
        .describe('HTTP status codes that trigger alerts'),
      userAgent: z.string().optional().describe('Custom user agent string')
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
      checkRate,
      contactGroups,
      findString,
      doNotFind,
      followRedirects,
      enableSslAlert,
      postBody,
      postRaw,
      customHeader,
      basicUsername,
      basicPassword,
      statusCodes,
      userAgent,
      triggerRate,
      ...rest
    } = ctx.input;

    let data: Record<string, any> = { ...rest };

    if (checkRate !== undefined) data.check_rate = checkRate;
    if (contactGroups) data.contact_groups = contactGroups;
    if (findString !== undefined) data.find_string = findString;
    if (doNotFind !== undefined) data.do_not_find = doNotFind;
    if (followRedirects !== undefined) data.follow_redirects = followRedirects;
    if (enableSslAlert !== undefined) data.enable_ssl_alert = enableSslAlert;
    if (postBody !== undefined) data.post_body = postBody;
    if (postRaw !== undefined) data.post_raw = postRaw;
    if (customHeader !== undefined) data.custom_header = customHeader;
    if (basicUsername !== undefined) data.basic_username = basicUsername;
    if (basicPassword !== undefined) data.basic_password = basicPassword;
    if (statusCodes) data.status_codes = statusCodes;
    if (userAgent !== undefined) data.user_agent = userAgent;
    if (triggerRate !== undefined) data.trigger_rate = triggerRate;

    await client.updateUptimeTest(testId, data);

    return {
      output: { success: true },
      message: `Updated uptime test **${testId}** successfully.`
    };
  })
  .build();
