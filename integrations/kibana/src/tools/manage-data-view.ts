import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let dataViewOutputSchema = z.object({
  dataViewId: z.string().describe('ID of the data view'),
  title: z.string().describe('Index pattern string'),
  name: z.string().optional().describe('Display name of the data view'),
  timeFieldName: z.string().optional().describe('Field used for time-based filtering'),
  runtimeFieldMap: z
    .record(z.string(), z.any())
    .optional()
    .describe('Runtime field definitions'),
  fieldFormats: z
    .record(z.string(), z.any())
    .optional()
    .describe('Field format configurations'),
  sourceFilters: z
    .array(z.object({ value: z.string() }))
    .optional()
    .describe('Source filters')
});

export let listDataViews = SlateTool.create(spec, {
  name: 'List Data Views',
  key: 'list_data_views',
  description: `List all data views (index patterns) configured in Kibana. Data views define which Elasticsearch indices Kibana queries.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      dataViews: z
        .array(
          z.object({
            dataViewId: z.string().describe('ID of the data view'),
            title: z.string().describe('Index pattern string'),
            name: z.string().optional().describe('Display name of the data view'),
            type: z.string().optional().describe('Data view type')
          })
        )
        .describe('List of data views')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getDataViews();

    let dataViews = (result.data_view ?? result.data_views ?? []).map((dv: any) => ({
      dataViewId: dv.id,
      title: dv.title,
      name: dv.name,
      type: dv.type
    }));

    return {
      output: { dataViews },
      message: `Found **${dataViews.length}** data views.`
    };
  })
  .build();

export let manageDataView = SlateTool.create(spec, {
  name: 'Manage Data View',
  key: 'manage_data_view',
  description: `Create, get, update, or delete a Kibana data view (index pattern). Data views define which Elasticsearch indices Kibana queries.
Supports configuring runtime fields, time fields, field formats, and source filters.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']).describe('Action to perform'),
      dataViewId: z
        .string()
        .optional()
        .describe('ID of the data view (required for get, update, delete)'),
      title: z
        .string()
        .optional()
        .describe('Index pattern string (e.g., "logs-*"). Required for create.'),
      name: z.string().optional().describe('Display name for the data view'),
      timeFieldName: z.string().optional().describe('Field used for time-based filtering'),
      runtimeFieldMap: z
        .record(z.string(), z.any())
        .optional()
        .describe('Runtime field definitions'),
      fieldFormats: z
        .record(z.string(), z.any())
        .optional()
        .describe('Field format configurations'),
      sourceFilters: z
        .array(z.object({ value: z.string() }))
        .optional()
        .describe('Source filters to exclude fields'),
      allowNoIndex: z
        .boolean()
        .optional()
        .describe('Allow data view creation even if matching indices do not exist')
    })
  )
  .output(
    dataViewOutputSchema.extend({
      deleted: z.boolean().optional().describe('Whether the data view was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let {
      action,
      dataViewId,
      title,
      name,
      timeFieldName,
      runtimeFieldMap,
      fieldFormats,
      sourceFilters,
      allowNoIndex
    } = ctx.input;

    if (action === 'get') {
      if (!dataViewId) throw new Error('dataViewId is required for get action');
      let result = await client.getDataView(dataViewId);
      let dv = result.data_view ?? result;
      return {
        output: {
          dataViewId: dv.id,
          title: dv.title,
          name: dv.name,
          timeFieldName: dv.timeFieldName,
          runtimeFieldMap: dv.runtimeFieldMap,
          fieldFormats: dv.fieldFormats,
          sourceFilters: dv.sourceFilters
        },
        message: `Retrieved data view \`${dv.title}\`.`
      };
    }

    if (action === 'create') {
      if (!title) throw new Error('title (index pattern) is required for create action');
      let result = await client.createDataView({
        title,
        name,
        timeFieldName,
        runtimeFieldMap,
        fieldFormats,
        sourceFilters,
        allowNoIndex
      });
      let dv = result.data_view ?? result;
      return {
        output: {
          dataViewId: dv.id,
          title: dv.title,
          name: dv.name,
          timeFieldName: dv.timeFieldName,
          runtimeFieldMap: dv.runtimeFieldMap,
          fieldFormats: dv.fieldFormats,
          sourceFilters: dv.sourceFilters
        },
        message: `Created data view \`${dv.title}\` with ID \`${dv.id}\`.`
      };
    }

    if (action === 'update') {
      if (!dataViewId) throw new Error('dataViewId is required for update action');
      let result = await client.updateDataView(dataViewId, {
        title,
        name,
        timeFieldName,
        runtimeFieldMap,
        fieldFormats,
        sourceFilters
      });
      let dv = result.data_view ?? result;
      return {
        output: {
          dataViewId: dv.id,
          title: dv.title,
          name: dv.name,
          timeFieldName: dv.timeFieldName,
          runtimeFieldMap: dv.runtimeFieldMap,
          fieldFormats: dv.fieldFormats,
          sourceFilters: dv.sourceFilters
        },
        message: `Updated data view \`${dataViewId}\`.`
      };
    }

    if (action === 'delete') {
      if (!dataViewId) throw new Error('dataViewId is required for delete action');
      await client.deleteDataView(dataViewId);
      return {
        output: {
          dataViewId,
          title: '',
          deleted: true
        },
        message: `Deleted data view \`${dataViewId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
