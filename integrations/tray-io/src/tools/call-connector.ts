import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrayRestClient } from '../lib/client';
import { spec } from '../spec';

export let callConnector = SlateTool.create(spec, {
  name: 'Call Connector',
  key: 'call_connector',
  description: `Execute an operation on a Tray.io connector. This calls the specified third-party service operation (e.g., send an SMS via Twilio, find records in Salesforce) using the REST Call Connector API.
Requires a valid authentication ID for the target service.`,
  instructions: [
    'Use "Get Connector Operations" first to discover available operations and their required input schemas.',
    'The authId must be obtained from an existing authentication created for the target service.'
  ],
  constraints: [
    'Each call is billable and counts as one task on the Tray.io account.',
    'Requires a user token (not a master token).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      connectorName: z
        .string()
        .describe('Programmatic name of the connector (e.g., "salesforce", "twilio-output")'),
      version: z.string().describe('Connector version (e.g., "8.1", "2.1")'),
      operationName: z
        .string()
        .describe('Operation name to execute (e.g., "send_sms", "find_records")'),
      authId: z.string().describe('Authentication ID (UUID) for the target service'),
      operationInput: z
        .record(z.string(), z.any())
        .describe('Input parameters for the operation, matching the operation input schema')
    })
  )
  .output(
    z.object({
      outcome: z.string().describe('Operation outcome: "success" or "error"'),
      connectorOutput: z.any().describe('Response data from the third-party service')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayRestClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.callConnector(
      ctx.input.connectorName,
      ctx.input.version,
      ctx.input.operationName,
      ctx.input.authId,
      ctx.input.operationInput
    );

    return {
      output: {
        outcome: result.outcome,
        connectorOutput: result.output
      },
      message: `Called **${ctx.input.connectorName}** operation **${ctx.input.operationName}** — outcome: **${result.outcome}**.`
    };
  })
  .build();
