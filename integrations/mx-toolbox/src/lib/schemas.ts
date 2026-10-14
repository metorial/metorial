import { z } from 'zod';

export let lookupCommands = [
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
  'aa',
  'aaaa',
  'arin',
  'asn',
  'blacklist',
  'http',
  'https',
  'ping',
  'smtp',
  'soa',
  'tcp',
  'tlsrpt',
  'trace'
] as const;

export let lookupResultEntrySchema = z.object({
  id: z.number().describe('Entry identifier'),
  name: z.string().describe('Name of the check or record'),
  info: z.string().describe('Detailed information about the result'),
  url: z.string().describe('URL for more details')
});

export let monitorTagSchema = z.object({
  uid: z.string().describe('Unique tag identifier'),
  name: z.string().describe('Tag name'),
  isHidden: z.boolean().describe('Whether the tag is hidden in the dashboard'),
  isNegative: z.boolean().describe('Whether the tag represents an exclusion filter'),
  monitorCount: z.number().describe('Number of monitors assigned to the tag')
});

export let monitorUidSchema = z
  .string()
  .describe('Monitor UID. Call list_monitors to discover monitor UIDs.');

export let monitorSchema = z.object({
  monitorUid: z.string().describe('Unique identifier of the monitor'),
  actionString: z.string().describe('Monitor action or status description'),
  lastTransition: z.string().describe('Timestamp of the last status change, when available'),
  lastChecked: z.string().describe('Timestamp of the most recent check, when available'),
  mxRep: z.string().describe('MX reputation score'),
  failing: z.array(z.string()).describe('Current failing checks as readable summaries'),
  warnings: z.array(z.string()).describe('Current warnings as readable summaries'),
  failingDetails: z.array(lookupResultEntrySchema).describe('Detailed failing checks'),
  warningDetails: z.array(lookupResultEntrySchema).describe('Detailed warning checks'),
  name: z.string().describe('Monitor name, when available'),
  historyUrl: z.string().describe('URL of monitor history, when available'),
  timeElapsed: z.string().describe('Time since the last check, when available'),
  recordCount: z.string().describe('Record count from the last check, when available'),
  lastResultUid: z.string().describe('UID of the last action result, when available'),
  tags: z.array(monitorTagSchema).describe('Tags assigned to the monitor')
});
