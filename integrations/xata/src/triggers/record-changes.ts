import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { XataWorkspaceClient } from '../lib/client';
import { spec } from '../spec';

export let recordChanges = SlateTrigger.create(spec, {
  name: 'Record Changes',
  key: 'record_changes',
  description:
    'Polls a Xata table for new or updated records by tracking the latest version timestamp. Detects newly created and recently modified records.'
})
  .input(
    z.object({
      recordId: z.string().describe('ID of the changed record'),
      changeType: z.enum(['created', 'updated']).describe('Type of change detected'),
      tableName: z.string().describe('Table the record belongs to'),
      record: z.any().describe('Full record data'),
      version: z.number().describe('Record version number'),
      updatedAt: z.string().optional().describe('When the record was last updated')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('ID of the changed record'),
      tableName: z.string().describe('Table the record belongs to'),
      changeType: z.enum(['created', 'updated']).describe('Type of change detected'),
      record: z.any().describe('Full record data'),
      version: z.number().describe('Record version number'),
      updatedAt: z.string().optional().describe('When the record was last updated')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let state = ctx.state as {
        lastPolledAt?: string;
        knownRecordVersions?: Record<string, number>;
      } | null;
      let lastPolledAt = state?.lastPolledAt;
      let knownRecordVersions = state?.knownRecordVersions || {};

      let configData = ctx.config;
      if (!configData.workspaceId || !configData.databaseName) {
        return {
          inputs: [],
          updatedState: state || {}
        };
      }

      let client = new XataWorkspaceClient({
        token: ctx.auth.token,
        workspaceId: configData.workspaceId,
        region: configData.region
      });

      let dbName = configData.databaseName;
      let branch = configData.branch;

      // Get tables list
      let tablesResult = await client.listTables(dbName, branch);
      let tableNames: string[] = (tablesResult.tables || []).map((t: any) => t.name || t);

      let inputs: Array<{
        recordId: string;
        changeType: 'created' | 'updated';
        tableName: string;
        record: any;
        version: number;
        updatedAt: string | undefined;
      }> = [];

      let newKnownVersions: Record<string, number> = {};

      for (let tableName of tableNames) {
        let filter: any = {};
        if (lastPolledAt) {
          filter = {
            'xata.updatedAt': { $ge: lastPolledAt }
          };
        }

        try {
          let result = await client.queryTable(dbName, branch, tableName, {
            filter: Object.keys(filter).length > 0 ? filter : undefined,
            sort: { 'xata.updatedAt': 'desc' },
            page: { size: 100 }
          });

          let records = result.records || [];

          for (let record of records) {
            let recId = record.id;
            let version = record.xata?.version || 0;
            let compositeKey = `${tableName}:${recId}`;
            let previousVersion = knownRecordVersions[compositeKey];

            if (previousVersion === undefined) {
              // New record we haven't seen before
              inputs.push({
                recordId: recId,
                changeType: lastPolledAt ? 'created' : 'created',
                tableName,
                record,
                version,
                updatedAt: record.xata?.updatedAt
              });
            } else if (version > previousVersion) {
              inputs.push({
                recordId: recId,
                changeType: 'updated',
                tableName,
                record,
                version,
                updatedAt: record.xata?.updatedAt
              });
            }

            newKnownVersions[compositeKey] = version;
          }
        } catch (_err) {
          // Table might not support xata metadata columns, skip it
        }
      }

      // Merge with known versions (keep records we didn't query this time)
      let mergedVersions = { ...knownRecordVersions, ...newKnownVersions };

      return {
        inputs,
        updatedState: {
          lastPolledAt: new Date().toISOString(),
          knownRecordVersions: mergedVersions
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `record.${ctx.input.changeType}`,
        id: `${ctx.input.tableName}:${ctx.input.recordId}:${ctx.input.version}`,
        output: {
          recordId: ctx.input.recordId,
          tableName: ctx.input.tableName,
          changeType: ctx.input.changeType,
          record: ctx.input.record,
          version: ctx.input.version,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
