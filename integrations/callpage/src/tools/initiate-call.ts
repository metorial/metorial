import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

export let initiateCall = SlateTool.create(spec, {
  name: 'Initiate Call',
  key: 'initiate_call',
  description: `Trigger a callback through a widget. Supports two modes:
- **Simple call**: Calls all available managers immediately. If none are available, the call is scheduled.
- **Call or schedule**: Automatically falls back to the first available time slot if no managers are available.
Calls can optionally target a specific department.`,
  instructions: [
    'Phone numbers must be in E.164 format (e.g., +14155551234).',
    'Use "simple" mode for immediate callback attempts, or "call_or_schedule" for automatic fallback to scheduling.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      widgetId: z.number().describe('The widget ID to initiate the call through'),
      phoneNumber: z.string().describe('Phone number to call in E.164 format'),
      mode: z
        .enum(['simple', 'call_or_schedule'])
        .default('call_or_schedule')
        .describe(
          'Call mode: "simple" for immediate call, "call_or_schedule" for automatic fallback to scheduling'
        ),
      departmentId: z.number().optional().describe('Target a specific department for the call')
    })
  )
  .output(
    z.object({
      callId: z.number().describe('The ID of the created call')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let result: { callId: number };

    if (ctx.input.mode === 'simple') {
      result = await client.simpleCall({
        widgetId: ctx.input.widgetId,
        phoneNumber: ctx.input.phoneNumber,
        departmentId: ctx.input.departmentId
      });
    } else {
      result = await client.callOrSchedule({
        widgetId: ctx.input.widgetId,
        phoneNumber: ctx.input.phoneNumber,
        departmentId: ctx.input.departmentId
      });
    }

    return {
      output: { callId: result.callId },
      message: `Initiated call **#${result.callId}** via widget **#${ctx.input.widgetId}** to **${ctx.input.phoneNumber}** (mode: ${ctx.input.mode}).`
    };
  })
  .build();
