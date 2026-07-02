import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

let moduleSchema = z.object({
  name: z.string().optional().describe('Module name'),
  capabilityName: z.string().optional().describe('Module capability category'),
  description: z.string().optional().describe('Module description')
});

let dataPersistenceSchema = z.object({
  name: z.string().optional().describe('Data persistence option name'),
  description: z.string().optional().describe('Data persistence option description')
});

export let listDatabaseOptions = SlateTool.create(spec, {
  name: 'List Database Options',
  key: 'list_database_options',
  description: `List Redis Cloud database configuration options, including available advanced capabilities/modules and data persistence modes.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      modules: z.array(moduleSchema).describe('Available database modules and capabilities'),
      dataPersistence: z
        .array(dataPersistenceSchema)
        .describe('Available data persistence options'),
      raw: z.object({
        modules: z.any().describe('Raw database modules response'),
        dataPersistence: z.any().describe('Raw data persistence response')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let [modulesData, dataPersistenceData] = await Promise.all([
      client.listDatabaseModules(),
      client.listDataPersistenceOptions()
    ]);

    let rawModules = modulesData?.modules || modulesData || [];
    if (!Array.isArray(rawModules)) rawModules = [];

    let rawDataPersistence =
      dataPersistenceData?.dataPersistence ||
      dataPersistenceData?.options ||
      dataPersistenceData ||
      [];
    if (!Array.isArray(rawDataPersistence)) rawDataPersistence = [];

    let modules = rawModules.map((module: any) => ({
      name: module.name,
      capabilityName: module.capabilityName,
      description: module.description
    }));
    let dataPersistence = rawDataPersistence.map((option: any) => ({
      name: option.name,
      description: option.description
    }));

    return {
      output: {
        modules,
        dataPersistence,
        raw: {
          modules: modulesData,
          dataPersistence: dataPersistenceData
        }
      },
      message: `Found **${modules.length}** module option(s) and **${dataPersistence.length}** persistence option(s).`
    };
  })
  .build();
