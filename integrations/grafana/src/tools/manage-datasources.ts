import { SlateTool } from 'slates';
import { z } from 'zod';
import { GrafanaClient } from '../lib/client';
import { spec } from '../spec';

export let listDataSources = SlateTool.create(spec, {
  name: 'List Data Sources',
  key: 'list_data_sources',
  description: `List all configured data sources in the Grafana instance, including their types, URLs, and connection details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      dataSources: z.array(
        z.object({
          dataSourceUid: z.string().describe('UID of the data source'),
          dataSourceId: z.number().describe('Numeric ID of the data source'),
          name: z.string().describe('Name of the data source'),
          type: z.string().describe('Data source type (e.g. prometheus, loki, elasticsearch)'),
          url: z.string().optional().describe('URL of the data source'),
          access: z.string().optional().describe('Access mode (proxy or direct)'),
          isDefault: z
            .boolean()
            .optional()
            .describe('Whether this is the default data source'),
          database: z.string().optional().describe('Database name if applicable')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let results = await client.listDataSources();

    let dataSources = results.map((ds: any) => ({
      dataSourceUid: ds.uid,
      dataSourceId: ds.id,
      name: ds.name,
      type: ds.type,
      url: ds.url,
      access: ds.access,
      isDefault: ds.isDefault,
      database: ds.database
    }));

    return {
      output: { dataSources },
      message: `Found **${dataSources.length}** data source(s).`
    };
  })
  .build();

export let getDataSource = SlateTool.create(spec, {
  name: 'Get Data Source',
  key: 'get_data_source',
  description: `Retrieve detailed information about a specific data source by its UID, including connection settings and configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dataSourceUid: z.string().describe('UID of the data source to retrieve')
    })
  )
  .output(
    z.object({
      dataSourceUid: z.string().describe('UID of the data source'),
      dataSourceId: z.number().describe('Numeric ID'),
      name: z.string().describe('Data source name'),
      type: z.string().describe('Data source type'),
      url: z.string().optional().describe('Connection URL'),
      access: z.string().optional().describe('Access mode'),
      isDefault: z.boolean().optional().describe('Whether this is the default data source'),
      database: z.string().optional().describe('Database name'),
      jsonData: z.any().optional().describe('Additional configuration data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let ds = await client.getDataSource(ctx.input.dataSourceUid);

    return {
      output: {
        dataSourceUid: ds.uid,
        dataSourceId: ds.id,
        name: ds.name,
        type: ds.type,
        url: ds.url,
        access: ds.access,
        isDefault: ds.isDefault,
        database: ds.database,
        jsonData: ds.jsonData
      },
      message: `Retrieved data source **${ds.name}** (type: ${ds.type}).`
    };
  })
  .build();

export let createDataSource = SlateTool.create(spec, {
  name: 'Create Data Source',
  key: 'create_data_source',
  description: `Create a new data source connection. Supports all Grafana data source types including Prometheus, Loki, Tempo, InfluxDB, PostgreSQL, MySQL, and more.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the data source'),
      type: z
        .string()
        .describe(
          'Data source type plugin ID (e.g. prometheus, loki, tempo, elasticsearch, postgres, mysql, influxdb, graphite, cloudwatch)'
        ),
      url: z.string().optional().describe('URL of the data source service'),
      access: z
        .enum(['proxy', 'direct'])
        .optional()
        .describe(
          'Access mode. "proxy" routes through Grafana backend, "direct" calls from browser.'
        ),
      isDefault: z.boolean().optional().describe('Set as the default data source'),
      database: z.string().optional().describe('Database name if applicable'),
      jsonData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional type-specific configuration (e.g. timeInterval, httpMethod)'),
      secureJsonData: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Sensitive configuration values (e.g. passwords, API keys). Stored encrypted.'
        )
    })
  )
  .output(
    z.object({
      dataSourceUid: z.string().describe('UID of the created data source'),
      dataSourceId: z.number().describe('Numeric ID of the created data source'),
      name: z.string().describe('Name of the created data source'),
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.createDataSource({
      name: ctx.input.name,
      type: ctx.input.type,
      url: ctx.input.url,
      access: ctx.input.access,
      isDefault: ctx.input.isDefault,
      jsonData: ctx.input.jsonData,
      secureJsonData: ctx.input.secureJsonData
    });

    let ds = result.datasource || result;

    return {
      output: {
        dataSourceUid: ds.uid,
        dataSourceId: ds.id || result.id,
        name: ds.name || ctx.input.name,
        message: result.message || 'Data source created.'
      },
      message: `Data source **${ds.name || ctx.input.name}** created successfully.`
    };
  })
  .build();

export let updateDataSource = SlateTool.create(spec, {
  name: 'Update Data Source',
  key: 'update_data_source',
  description: `Update an existing data source's configuration by its UID. You can update the name, URL, access mode, and other settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      dataSourceUid: z.string().describe('UID of the data source to update'),
      name: z.string().optional().describe('New name for the data source'),
      url: z.string().optional().describe('New URL for the data source'),
      access: z.enum(['proxy', 'direct']).optional().describe('Updated access mode'),
      isDefault: z.boolean().optional().describe('Whether to set as default data source'),
      jsonData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated additional configuration'),
      secureJsonData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated sensitive configuration')
    })
  )
  .output(
    z.object({
      dataSourceUid: z.string().describe('UID of the updated data source'),
      name: z.string().describe('Name of the updated data source'),
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    // First fetch the current data source to merge updates
    let current = await client.getDataSource(ctx.input.dataSourceUid);

    let updated: Record<string, any> = {
      ...current
    };
    if (ctx.input.name !== undefined) updated.name = ctx.input.name;
    if (ctx.input.url !== undefined) updated.url = ctx.input.url;
    if (ctx.input.access !== undefined) updated.access = ctx.input.access;
    if (ctx.input.isDefault !== undefined) updated.isDefault = ctx.input.isDefault;
    if (ctx.input.jsonData !== undefined)
      updated.jsonData = { ...current.jsonData, ...ctx.input.jsonData };
    if (ctx.input.secureJsonData !== undefined)
      updated.secureJsonData = ctx.input.secureJsonData;

    let result = await client.updateDataSource(ctx.input.dataSourceUid, updated);
    let ds = result.datasource || result;

    return {
      output: {
        dataSourceUid: ds.uid || ctx.input.dataSourceUid,
        name: ds.name || updated.name,
        message: result.message || 'Data source updated.'
      },
      message: `Data source **${ds.name || updated.name}** updated successfully.`
    };
  })
  .build();

export let deleteDataSource = SlateTool.create(spec, {
  name: 'Delete Data Source',
  key: 'delete_data_source',
  description: `Permanently delete a data source by its UID. Dashboards referencing this data source may break.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      dataSourceUid: z.string().describe('UID of the data source to delete')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteDataSource(ctx.input.dataSourceUid);

    return {
      output: {
        message: `Data source ${ctx.input.dataSourceUid} deleted.`
      },
      message: `Data source **${ctx.input.dataSourceUid}** has been deleted.`
    };
  })
  .build();
