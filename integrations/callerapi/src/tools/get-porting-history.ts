import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let portingEventSchema = z.object({
  actionType: z.string().optional().describe('Type of porting action'),
  networkId: z.string().optional().describe('Network identifier'),
  lineType: z.string().optional().describe('Line type'),
  timestamp: z.string().optional().describe('Timestamp of the porting event')
});

export let getPortingHistory = SlateTool.create(spec, {
  name: 'Get Porting History',
  key: 'get_porting_history',
  description: `Retrieve the complete history of porting events for a phone number. Returns all porting actions including carrier changes with timestamps, network identifiers, and line types.`,
  instructions: ['Phone numbers must be in E.164 format (e.g., +16502530000)'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z.string().describe('Phone number in E.164 format (e.g., +16502530000)')
    })
  )
  .output(
    z.object({
      portingEvents: z.array(portingEventSchema).optional().describe('List of porting events'),
      status: z.number().optional().describe('Status code (0 = success)'),
      statusMessage: z.string().optional().describe('Status message'),
      rawResponse: z.any().optional().describe('Full raw API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getPortingHistory(ctx.input.phoneNumber);

    let events = result.porting_history || result.events || result.history || [];
    let portingEvents = Array.isArray(events)
      ? events.map((e: any) => ({
          actionType: e.action_type || e.actionType,
          networkId: e.network_id || e.networkId,
          lineType: e.line_type || e.lineType,
          timestamp: e.timestamp || e.date
        }))
      : [];

    return {
      output: {
        portingEvents,
        status: result.status,
        statusMessage: result.status_message,
        rawResponse: result
      },
      message: `Retrieved **${portingEvents.length}** porting event(s) for **${ctx.input.phoneNumber}**.`
    };
  })
  .build();
