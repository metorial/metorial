import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { firefliesServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateMeetingState = SlateTool.create(spec, {
  name: 'Update Meeting State',
  key: 'update_meeting_state',
  description: `Pause or resume recording for a live Fireflies meeting. Only meeting organizers or team admins can control a live meeting.`,
  constraints: ['Rate limited to 10 requests per hour.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      meetingId: z.string().describe('Live meeting ID'),
      action: z
        .enum(['pause_recording', 'resume_recording'])
        .describe('Meeting state action to execute')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      action: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let result = await client.updateMeetingState(ctx.input.meetingId, ctx.input.action);

    return {
      output: {
        success: result?.success ?? false,
        action: result?.action ?? ctx.input.action
      },
      message: `${ctx.input.action} ${result?.success ? 'succeeded' : 'failed'} for meeting ${ctx.input.meetingId}.`
    };
  })
  .build();

export let createLiveActionItem = SlateTool.create(spec, {
  name: 'Create Live Action Item',
  key: 'create_live_action_item',
  description: `Create an action item during a live meeting using Fred's natural language processing.`,
  constraints: ['Requires AI credits.', 'Rate limited to 10 requests per hour.']
})
  .input(
    z.object({
      meetingId: z.string().describe('Live meeting ID'),
      prompt: z.string().describe('Natural language prompt for the action item')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.prompt.trim()) {
      throw firefliesServiceError('prompt is required.');
    }
    let client = new FirefliesClient({ token: ctx.auth.token });
    let result = await client.createLiveActionItem(ctx.input.meetingId, ctx.input.prompt);

    return {
      output: { success: result?.success ?? false },
      message: result?.success
        ? `Created live action item for meeting ${ctx.input.meetingId}.`
        : `Failed to create live action item for meeting ${ctx.input.meetingId}.`
    };
  })
  .build();

export let createLiveSoundbite = SlateTool.create(spec, {
  name: 'Create Live Soundbite',
  key: 'create_live_soundbite',
  description: `Create a soundbite during a live meeting using a natural language prompt.`,
  constraints: ['Requires AI credits.', 'Rate limited to 10 requests per hour.']
})
  .input(
    z.object({
      meetingId: z.string().describe('Live meeting ID'),
      prompt: z.string().describe('Natural language prompt describing the soundbite')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.prompt.trim()) {
      throw firefliesServiceError('prompt is required.');
    }
    let client = new FirefliesClient({ token: ctx.auth.token });
    let result = await client.createLiveSoundbite(ctx.input.meetingId, ctx.input.prompt);

    return {
      output: { success: result?.success ?? false },
      message: result?.success
        ? `Created live soundbite for meeting ${ctx.input.meetingId}.`
        : `Failed to create live soundbite for meeting ${ctx.input.meetingId}.`
    };
  })
  .build();

export let listLiveActionItems = SlateTool.create(spec, {
  name: 'List Live Action Items',
  key: 'list_live_action_items',
  description: `List action items for a live meeting, including automatically detected items and items created through the API.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      meetingId: z.string().describe('Live meeting ID')
    })
  )
  .output(
    z.object({
      actionItems: z
        .array(
          z.object({
            name: z.string().nullable(),
            actionItem: z.string()
          })
        )
        .describe('Live meeting action items')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let items = await client.getLiveActionItems(ctx.input.meetingId);
    let mapped = (items || []).map((item: any) => ({
      name: item?.name ?? null,
      actionItem: String(item?.action_item ?? '')
    }));

    return {
      output: { actionItems: mapped },
      message: `Found **${mapped.length}** live action item(s).`
    };
  })
  .build();
