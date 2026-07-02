import { SlateTool } from 'slates';
import { z } from 'zod';
import { servicenowServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageCmdbCi = SlateTool.create(spec, {
  name: 'Manage CMDB Configuration Item',
  key: 'manage_cmdb_ci',
  description: `List, retrieve, create, or update Configuration Items (CIs) with the ServiceNow CMDB Instance API. Use this for CMDB-specific CI operations where attributes are submitted through the CMDB endpoint instead of generic Table API fields.`,
  instructions: [
    'className is the CMDB table/class name, such as "cmdb_ci", "cmdb_ci_server", or "cmdb_ci_linux_server".',
    'For create and update actions, provide CI fields in attributes using ServiceNow field names.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update'])
        .describe('Action to perform: list, get, create, or update a CI'),
      className: z
        .string()
        .default('cmdb_ci')
        .describe('CMDB class/table name, such as "cmdb_ci" or "cmdb_ci_server"'),
      recordId: z
        .string()
        .optional()
        .describe('sys_id of the CI record, required for get and update actions'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('CI attribute name-value pairs, required for create and update actions'),
      query: z
        .string()
        .optional()
        .describe('Encoded query used to filter CI records for list action'),
      limit: z.number().optional().default(20).describe('Maximum CI records to return'),
      offset: z.number().optional().describe('Number of CI records to skip')
    })
  )
  .output(
    z.object({
      records: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Matching CIs for list action'),
      record: z
        .record(z.string(), z.any())
        .optional()
        .describe('The retrieved, created, or updated CI record'),
      recordId: z.string().optional().describe('The sys_id of the CI record'),
      count: z.number().optional().describe('Number of CI records returned for list action')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    if (ctx.input.action === 'list') {
      let result = await client.getCmdbInstances(ctx.input.className, {
        query: ctx.input.query,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      return {
        output: {
          records: result.records,
          count: result.records.length
        },
        message: `Found **${result.records.length}** CIs in \`${ctx.input.className}\`.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.recordId) {
        throw servicenowServiceError('recordId is required for get action');
      }

      let record = await client.getCmdbInstance(ctx.input.className, ctx.input.recordId);
      let label = record?.name || record?.sys_id || ctx.input.recordId;

      return {
        output: {
          record,
          recordId: record?.sys_id || ctx.input.recordId
        },
        message: `Retrieved CI **${label}** from \`${ctx.input.className}\`.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.attributes || Object.keys(ctx.input.attributes).length === 0) {
        throw servicenowServiceError('attributes are required for create action');
      }

      let record = await client.createCmdbInstance(ctx.input.className, ctx.input.attributes);
      let label = record?.name || record?.sys_id;

      return {
        output: {
          record,
          recordId: record?.sys_id
        },
        message: `Created CI **${label || 'record'}** in \`${ctx.input.className}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.recordId) {
        throw servicenowServiceError('recordId is required for update action');
      }
      if (!ctx.input.attributes || Object.keys(ctx.input.attributes).length === 0) {
        throw servicenowServiceError('attributes are required for update action');
      }

      let record = await client.updateCmdbInstance(
        ctx.input.className,
        ctx.input.recordId,
        ctx.input.attributes
      );
      let label = record?.name || record?.sys_id || ctx.input.recordId;

      return {
        output: {
          record,
          recordId: record?.sys_id || ctx.input.recordId
        },
        message: `Updated CI **${label}** in \`${ctx.input.className}\`.`
      };
    }

    throw servicenowServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
