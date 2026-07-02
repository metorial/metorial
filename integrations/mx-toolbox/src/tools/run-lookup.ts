import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lookupResultEntrySchema = z.object({
  id: z.number().describe('Entry identifier'),
  name: z.string().describe('Name of the check or record'),
  info: z.string().describe('Detailed information about the result'),
  url: z.string().describe('URL for more details')
});

let lookupCommands = [
  'a',
  'mx',
  'dns',
  'spf',
  'dkim',
  'dmarc',
  'txt',
  'ptr',
  'bimi',
  'mta-sts',
  'aa'
] as const;

export let runLookup = SlateTool.create(spec, {
  name: 'Run Lookup',
  key: 'run_lookup',
  description: `Run a DNS or email authentication lookup using the MXToolbox SuperTool engine. Supports lookups for A, MX, DNS, SPF, DKIM, DMARC, TXT, PTR, BIMI, MTA-STS, and AA (IPv6) records. Returns categorized results including passed checks, failures, warnings, and timeouts.

For DKIM lookups, provide the selector (e.g. "google") to query a specific DKIM record.`,
  instructions: [
    'For DKIM lookups, use the "selector" parameter to specify the DKIM selector (e.g., "google", "default", "selector1").',
    'Free accounts can only perform lookups against "example.com".'
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
      hostname: z.string().describe('The domain name or IP address to look up'),
      selector: z
        .string()
        .optional()
        .describe(
          'DKIM selector, only used when command is "dkim" (e.g., "google", "default")'
        )
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

    if (command === 'dkim' && ctx.input.selector) {
      argument = `${ctx.input.hostname}:${ctx.input.selector}`;
    }

    let result = await client.lookup(command, argument);

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
