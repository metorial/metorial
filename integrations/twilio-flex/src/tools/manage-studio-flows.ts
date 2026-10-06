import { SlateTool } from 'slates';
import { z } from 'zod';
import { StudioClient } from '../lib/studio-client';
import { fail, validateInput } from '../lib/validation';
import { spec } from '../spec';

let flowSchema = z.object({
  flowSid: z.string().describe('Flow SID'),
  friendlyName: z.string().optional().describe('Friendly name'),
  status: z.string().optional().describe('Flow status (draft, published)'),
  version: z.number().optional().describe('Flow version'),
  revision: z.number().optional().describe('Flow revision'),
  commitMessage: z.string().optional().describe('Commit message'),
  dateCreated: z.string().optional().describe('Date created'),
  dateUpdated: z.string().optional().describe('Date updated')
});

export let manageStudioFlowsTool = SlateTool.create(spec, {
  name: 'Manage Studio Flows',
  key: 'manage_studio_flows',
  description: `List, get, or trigger Studio Flow executions. Studio Flows are visual communication workflows for IVR, chatbot logic, and routing. Use this to view available flows, trigger outbound flow executions, or check execution history.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      pageToken: z
        .string()
        .optional()
        .describe(
          'Opaque continuation from nextPageToken; retain the same resource and filters.'
        ),
      action: z
        .enum(['list', 'get', 'trigger', 'list_executions', 'get_execution'])
        .describe('Action to perform'),
      flowSid: z
        .string()
        .optional()
        .describe('Flow SID (required for get/trigger/list_executions/get_execution)'),
      executionSid: z
        .string()
        .optional()
        .describe('Execution SID (required for get_execution)'),
      to: z
        .string()
        .optional()
        .describe('Recipient phone number for trigger (e.g., "+1234567890")'),
      from: z
        .string()
        .optional()
        .describe('Sender phone number for trigger (e.g., "+0987654321")'),
      parameters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional parameters as key-value pairs for trigger'),
      pageSize: z.number().optional().describe('Number of results to return')
    })
  )
  .output(
    z.object({
      nextPageToken: z
        .string()
        .optional()
        .describe('Native continuation; omitted when this page is exhausted.'),
      hasMore: z.boolean().optional().describe('Whether a next page is available.'),
      flows: z.array(flowSchema).optional().describe('Flow records'),
      executions: z
        .array(
          z.object({
            executionSid: z.string().describe('Execution SID'),
            flowSid: z.string().optional().describe('Flow SID'),
            status: z.string().optional().describe('Execution status'),
            contactChannelAddress: z.string().optional().describe('Contact channel address'),
            dateCreated: z.string().optional().describe('Date created'),
            dateUpdated: z.string().optional().describe('Date updated')
          })
        )
        .optional()
        .describe('Execution records')
    })
  )
  .handleInvocation(async ctx => {
    validateInput('manage_studio_flows', ctx.input);
    let client = new StudioClient(ctx.auth.token, ctx.auth.accountSid, ctx.input.pageToken);

    if (ctx.input.action === 'list') {
      let result = await client.listFlows(ctx.input.pageSize);
      let flows = (result.flows || []).map((f: any) => ({
        flowSid: f.sid,
        friendlyName: f.friendly_name,
        status: f.status,
        version: f.version === undefined ? undefined : Number(f.version),
        revision: f.revision,
        commitMessage: f.commit_message,
        dateCreated: f.date_created,
        dateUpdated: f.date_updated
      }));
      return {
        output: {
          flows,
          executions: [],
          nextPageToken: result.nextPageToken,
          hasMore: result.hasMore
        },
        message: `Found **${flows.length}** Studio flows.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.flowSid) throw fail('flowSid is required');
      let f = await client.getFlow(ctx.input.flowSid);
      return {
        output: {
          flows: [
            {
              flowSid: f.sid,
              friendlyName: f.friendly_name,
              status: f.status,
              version: f.version === undefined ? undefined : Number(f.version),
              revision: f.revision,
              commitMessage: f.commit_message,
              dateCreated: f.date_created,
              dateUpdated: f.date_updated
            }
          ],
          executions: []
        },
        message: `Flow **${f.friendly_name}** (${f.sid}) — status: **${f.status}**.`
      };
    }

    if (ctx.input.action === 'trigger') {
      if (!ctx.input.flowSid) throw fail('flowSid is required');
      if (!ctx.input.to) throw fail('to is required');
      if (!ctx.input.from) throw fail('from is required');

      let params: Record<string, string | undefined> = {
        To: ctx.input.to,
        From: ctx.input.from
      };
      if (ctx.input.parameters !== undefined) {
        params.Parameters = JSON.stringify(ctx.input.parameters);
      }
      let result = await client.triggerFlowExecution(ctx.input.flowSid, params);
      return {
        output: {
          flows: [],
          executions: [
            {
              executionSid: result.sid,
              flowSid: result.flow_sid,
              status: result.status,
              contactChannelAddress: result.contact_channel_address,
              dateCreated: result.date_created,
              dateUpdated: result.date_updated
            }
          ]
        },
        message: `Triggered flow execution **${result.sid}** — status: **${result.status}**.`
      };
    }

    if (ctx.input.action === 'list_executions') {
      if (!ctx.input.flowSid) throw fail('flowSid is required');
      let result = await client.listExecutions(ctx.input.flowSid, ctx.input.pageSize);
      let executions = (result.executions || []).map((e: any) => ({
        executionSid: e.sid,
        flowSid: e.flow_sid,
        status: e.status,
        contactChannelAddress: e.contact_channel_address,
        dateCreated: e.date_created,
        dateUpdated: e.date_updated
      }));
      return {
        output: {
          flows: [],
          executions,
          nextPageToken: result.nextPageToken,
          hasMore: result.hasMore
        },
        message: `Found **${executions.length}** executions for flow **${ctx.input.flowSid}**.`
      };
    }

    // get_execution
    if (!ctx.input.flowSid) throw fail('flowSid is required');
    if (!ctx.input.executionSid) throw fail('executionSid is required');
    let e = await client.getExecution(ctx.input.flowSid, ctx.input.executionSid);
    return {
      output: {
        flows: [],
        executions: [
          {
            executionSid: e.sid,
            flowSid: e.flow_sid,
            status: e.status,
            contactChannelAddress: e.contact_channel_address,
            dateCreated: e.date_created,
            dateUpdated: e.date_updated
          }
        ]
      },
      message: `Execution **${e.sid}** — status: **${e.status}**.`
    };
  })
  .build();
