import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { lookupCommands, lookupResultEntrySchema } from '../lib/schemas';
import { spec } from '../spec';

export let runLookup = SlateTool.create(spec, {
  name: 'Run Lookup',
  key: 'run_lookup',
  description: `Run DNS, email authentication, blacklist, or network diagnostics using the MXToolbox SuperTool engine. Returns categorized results including passed checks, failures, warnings, and timeouts. Supports IPv4 and IPv6 DNS records, email authentication, blacklist checks, SMTP, HTTP, HTTPS, ping, and TCP.`,
  instructions: [
    'For DKIM, specify selector or provide hostname in domain:selector format. Both domain and selector are required.',
    'For TCP, specify port. The legacy aa command is accepted as an alias for aaaa.',
    'The example.com domain is available for testing; other targets and network lookups depend on your API plan.'
  ],
  constraints: ['Rate limits apply based on your MXToolbox subscription tier.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      command: z
        .enum(lookupCommands)
        .describe('The type of lookup to perform (e.g., "mx", "spf", "dkim", "dmarc")'),
      hostname: z
        .string()
        .describe('The domain name, IP address, or HTTP/HTTPS target URL to look up'),
      selector: z
        .string()
        .optional()
        .describe(
          'DKIM selector, only used when command is "dkim" (e.g., "google", "default")'
        ),
      port: z
        .string()
        .optional()
        .describe('Port number from 1 to 65535. Required for tcp lookups.')
    })
  )
  .output(
    z.object({
      uid: z.string().describe('Unique identifier for this lookup result'),
      command: z.string().describe('The lookup command that was executed'),
      commandArgument: z.string().describe('The hostname or IP that was queried'),
      timeRecorded: z.string().describe('Timestamp when the lookup was recorded'),
      reportingNameServer: z.string().describe('The nameserver that provided the results'),
      timeToComplete: z.string().describe('Duration of the lookup'),
      isEndpoint: z.boolean().describe('Whether this lookup result is a terminal endpoint'),
      hasSubscriptions: z
        .boolean()
        .describe('Whether the queried domain has active monitor subscriptions'),
      failed: z.array(lookupResultEntrySchema).describe('Checks that failed'),
      warnings: z.array(lookupResultEntrySchema).describe('Checks that produced warnings'),
      passed: z.array(lookupResultEntrySchema).describe('Checks that passed'),
      timeouts: z.array(lookupResultEntrySchema).describe('Checks that timed out'),
      errors: z.array(z.string()).describe('Error messages if any'),
      information: z.array(lookupResultEntrySchema).describe('Informational results'),
      isTransitioned: z.boolean().describe('Whether a status transition was detected'),
      relatedLookups: z
        .array(
          z.object({
            name: z.string().describe('Name of the related lookup'),
            url: z.string().describe('URL for the related lookup')
          })
        )
        .describe('Related lookups that may be useful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let argument = ctx.input.hostname;
    let command = ctx.input.command;

    if (ctx.input.selector !== undefined) {
      if (command !== 'dkim')
        throw createApiServiceError('Selector is only supported for DKIM lookups.');
      let selector = ctx.input.selector.trim();
      if (!selector) throw createApiServiceError('DKIM selector must not be empty.');
      argument = `${ctx.input.hostname.trim()}:${selector}`;
    }

    let result = await client.lookup(command, argument, ctx.input.port);

    let failedCount = result.failed.length;
    let warningCount = result.warnings.length;
    let passedCount = result.passed.length;

    let statusSummary =
      failedCount > 0
        ? `**${failedCount} failed**, ${warningCount} warnings, ${passedCount} passed`
        : warningCount > 0
          ? `${failedCount} failed, **${warningCount} warnings**, ${passedCount} passed`
          : `${passedCount} passed with no issues`;

    return {
      output: result,
      message: `Completed **${command.toUpperCase()}** lookup for **${ctx.input.hostname}**: ${statusSummary}.`
    };
  })
  .build();
