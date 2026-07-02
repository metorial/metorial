import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dataSetFieldSchema = z.object({
  fieldId: z.string().describe('ID of the data set column'),
  name: z.string().describe('Name of the column'),
  fieldType: z.string().describe('Type of the column (Text, DateTime, Number)')
});

let dataSetSchema = z.object({
  dataSetId: z.string().describe('ID of the data set'),
  name: z.string().describe('Name of the data set'),
  fields: z.array(dataSetFieldSchema).describe('Column definitions for the data set')
});

export let listDataSets = SlateTool.create(spec, {
  name: 'List Data Sets',
  key: 'list_data_sets',
  description: `List all data sets in the organization, including their column definitions. Use this to discover available data sets and their structure before working with records.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      dataSets: z.array(dataSetSchema).describe('List of data sets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listDataSets();
    let dataSets = (data.dataSets || []).map((ds: any) => ({
      dataSetId: ds.id,
      name: ds.name,
      fields: (ds.fields || []).map((f: any) => ({
        fieldId: f.id,
        name: f.name,
        fieldType: f.fieldType
      }))
    }));
    return {
      output: { dataSets },
      message: `Found **${dataSets.length}** data set(s).`
    };
  })
  .build();
