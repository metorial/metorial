import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let trackingColumns = new Set([
  'SessionID',
  'DomainName',
  'DomainID',
  'Name',
  'Description',
  'SalesStatus',
  'FirstName',
  'LastName',
  'RegistrationNumber',
  'VATNumber',
  'IBAN',
  'AddressLine1',
  'AddressLine2',
  'HouseNumber',
  'Suffix',
  'City',
  'StateProvinceRegion',
  'PostalCode',
  'Country',
  'PhoneNumber',
  'Website',
  'Email',
  'DateTime',
  'Date',
  'Time',
  'TrackData',
  'MetaData',
  'IpAddress',
  'Browser',
  'Device',
  'CurrentPage',
  'Referrer',
  'ReferrerParams',
  'EntryPoint',
  'Message',
  'LastNote',
  'ConversionLabel',
  'CampaignName',
  'CampaignID',
  'AdGroupName',
  'AdGroupID',
  'Keyword',
  'KeywordMatchType',
  'AdName',
  'AdDevice',
  'AdNetwork',
  'SubjectID',
  'Revenue',
  'OrderNumber',
  'EventKey',
  'EventValue',
  'EventDescription',
  'EventElementType',
  'TriggerID',
  'EventID',
  'Journey',
  'ReferrerLabel'
]);
let checkColumns = new Set(['CheckID', 'PageURL', 'TriggerID', 'EventID', 'Message']);

export let createList = SlateTool.create(spec, {
  name: 'Create List',
  key: 'create_list',
  description:
    'Create a conversion list using a tracking or checks preset and its supported column names.',
  instructions: [
    'The tracking preset supports visitor and conversion columns, such as SessionID, Name, Email, Revenue, and Browser.',
    'The checks preset supports CheckID, PageURL, TriggerID, EventID, and Message.',
    'Column names are case-sensitive.'
  ]
})
  .input(
    z.object({
      name: z.string().min(1).describe('Name of the list'),
      description: z.string().min(1).optional().describe('Optional description of the list'),
      preset: z
        .enum(['tracking', 'checks'])
        .describe('Preset determining the supported columns'),
      columns: z
        .array(z.string().min(1))
        .describe('Column names supported by the selected preset')
    })
  )
  .output(
    z.object({
      list: z
        .record(z.string(), z.unknown())
        .describe(
          'Unmodified created list data, including any null or omitted provider fields'
        )
    })
  )
  .handleInvocation(async ctx => {
    let allowedColumns = ctx.input.preset === 'tracking' ? trackingColumns : checkColumns;
    let invalidColumns = ctx.input.columns.filter(column => !allowedColumns.has(column));
    if (invalidColumns.length) {
      throw createApiServiceError(
        `Unsupported columns for the ${ctx.input.preset} preset: ${invalidColumns.join(', ')}. Supported columns: ${[...allowedColumns].join(', ')}.`
      );
    }
    let client = new Client({ token: ctx.auth.token });
    let list = await client.createList(ctx.input);
    return { output: { list }, message: 'Created a Sidetracker list.' };
  })
  .build();
