import { SlateTool } from 'slates';
import { z } from 'zod';
import { TablesClient } from '../lib/client';
import { spec } from '../spec';

export let getDatasetInfo = SlateTool.create(spec, {
  name: 'Get Dataset Info',
  key: 'get_dataset_info',
  description: `Retrieve metadata and the latest data for a time-series dataset. Returns the dataset's name, description, column definitions, date range, frequency, and recent data points.
Use this to explore a specific dataset before querying it in detail.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseCode: z.string().describe('Database code (e.g., WIKI, FRED, EOD).'),
      datasetCode: z.string().describe('Dataset code within the database (e.g., AAPL, GDP).')
    })
  )
  .output(
    z.object({
      datasetId: z.number().describe('Unique dataset ID.'),
      datasetCode: z.string().describe('Dataset code.'),
      databaseCode: z.string().describe('Database code.'),
      name: z.string().describe('Dataset name.'),
      description: z.string().describe('Dataset description.'),
      refreshedAt: z.string().describe('Last refresh timestamp.'),
      newestDate: z.string().describe('Newest available date.'),
      oldestDate: z.string().describe('Oldest available date.'),
      columnNames: z.array(z.string()).describe('Available column names.'),
      frequency: z.string().describe('Data frequency.'),
      type: z.string().describe('Dataset type.'),
      premium: z.boolean().describe('Whether a subscription is required.'),
      recentRows: z.array(z.record(z.string(), z.any())).describe('Most recent data rows.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TablesClient({ apiKey: ctx.auth.token });

    let response = await client.getTimeSeries({
      databaseCode: ctx.input.databaseCode,
      datasetCode: ctx.input.datasetCode
    });

    let ds = response.dataset;
    let recentRows = (ds.data || []).slice(0, 10).map(row => {
      let obj: Record<string, any> = {};
      ds.column_names.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });

    return {
      output: {
        datasetId: ds.id,
        datasetCode: ds.dataset_code,
        databaseCode: ds.database_code,
        name: ds.name,
        description: ds.description || '',
        refreshedAt: ds.refreshed_at || '',
        newestDate: ds.newest_available_date || '',
        oldestDate: ds.oldest_available_date || '',
        columnNames: ds.column_names || [],
        frequency: ds.frequency || '',
        type: ds.type || '',
        premium: ds.premium,
        recentRows
      },
      message: `Dataset **${ds.database_code}/${ds.dataset_code}**: "${ds.name}" (${ds.oldest_available_date} to ${ds.newest_available_date}, ${ds.frequency}).`
    };
  })
  .build();
