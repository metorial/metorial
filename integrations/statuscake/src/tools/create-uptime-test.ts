import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createUptimeTest = SlateTool.create(spec, {
  name: 'Create Uptime Test',
  key: 'create_uptime_test',
  description: `Create a new uptime monitoring check. Supports HTTP, HEAD, TCP, DNS, SMTP, SSH, and PING test types. Configure check frequency, monitoring regions, alert contacts, content matching, authentication, and more.`,
  instructions: [
    'Use the List Monitoring Locations tool to find valid region identifiers.',
    'For HTTP tests, you can optionally configure content string matching, custom headers, basic auth, and POST body.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the uptime test'),
      testType: z
        .enum(['HTTP', 'HEAD', 'TCP', 'DNS', 'SMTP', 'SSH', 'PING'])
        .describe('Type of test to run'),
      websiteUrl: z.string().describe('URL or IP address to monitor'),
      checkRate: z
        .number()
        .describe('Check frequency in seconds (e.g. 60, 300, 900, 1800, 3600)'),
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
      paused: z.boolean().optional().describe('Whether the test starts paused'),
      followRedirects: z.boolean().optional().describe('Whether to follow HTTP redirects'),
      enableSslAlert: z.boolean().optional().describe('Whether to alert on SSL issues'),
      findString: z.string().optional().describe('String to search for in the response body'),
      doNotFind: z
        .boolean()
        .optional()
        .describe('If true, alert when the find_string IS found'),
      port: z.number().optional().describe('Custom port for TCP/SMTP/SSH tests'),
      postBody: z.string().optional().describe('POST body content for HTTP tests'),
      postRaw: z.string().optional().describe('Raw POST data for HTTP tests'),
      customHeader: z.string().optional().describe('Custom HTTP header as JSON string'),
      basicUsername: z.string().optional().describe('Basic auth username'),
      basicPassword: z.string().optional().describe('Basic auth password'),
      timeout: z.number().optional().describe('Timeout in seconds'),
      statusCodes: z
        .array(z.string())
        .optional()
        .describe('HTTP status codes that trigger alerts (e.g. ["204","205"])'),
      userAgent: z.string().optional().describe('Custom user agent string'),
      dnsIps: z
        .array(z.string())
        .optional()
        .describe('DNS IP addresses to resolve (for DNS tests)'),
      dnsServer: z.string().optional().describe('DNS server to query (for DNS tests)')
    })
  )
  .output(
    z.object({
      testId: z.string().describe('ID of the newly created uptime test')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      testType,
      websiteUrl,
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
      dnsIps,
      dnsServer,
      ...rest
    } = ctx.input;

    let data: Record<string, any> = {
      ...rest,
      test_type: testType,
      website_url: websiteUrl,
      check_rate: checkRate
    };

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
    if (dnsIps) data.dns_ips = dnsIps;
    if (dnsServer !== undefined) data.dns_server = dnsServer;

    let result = await client.createUptimeTest(data);
    let testId = String(result?.data?.new_id ?? result?.new_id ?? '');

    return {
      output: { testId },
      message: `Created uptime test **${ctx.input.name}** (ID: ${testId}).`
    };
  })
  .build();
