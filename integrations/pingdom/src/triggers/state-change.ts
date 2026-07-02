import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let stateChange = SlateTrigger.create(spec, {
  name: 'Check State Change',
  key: 'state_change',
  description:
    'Triggers when an uptime or transaction check changes state (e.g. UP → DOWN, DOWN → UP, SUCCESS → FAILING).'
})
  .input(
    z.object({
      checkId: z.number().describe('Pingdom check ID'),
      checkName: z.string().describe('Check name'),
      checkType: z.string().describe('Check type (HTTP, HTTPS, TCP, PING, TRANSACTION, etc.)'),
      previousState: z.string().describe('Previous check state'),
      currentState: z.string().describe('New check state'),
      stateChangedTimestamp: z.number().describe('Unix timestamp of the state change'),
      stateChangedUtcTime: z.string().describe('UTC time of the state change'),
      description: z.string().optional().describe('Short error description'),
      longDescription: z.string().optional().describe('Detailed error description'),
      importanceLevel: z.string().optional().describe('Importance level (HIGH, LOW)'),
      checkParams: z.any().optional().describe('Check parameters (hostname, port, etc.)'),
      tags: z.array(z.string()).optional().describe('Tags attached to the check'),
      firstProbe: z
        .object({
          ip: z.string().optional(),
          ipv6: z.string().optional(),
          location: z.string().optional()
        })
        .optional()
        .describe('First probe server details'),
      secondProbe: z
        .object({
          ip: z.string().optional(),
          ipv6: z.string().optional(),
          location: z.string().optional()
        })
        .optional()
        .describe('Second probe server details')
    })
  )
  .output(
    z.object({
      checkId: z.number().describe('Pingdom check ID'),
      checkName: z.string().describe('Check name'),
      checkType: z.string().describe('Check type'),
      previousState: z.string().describe('Previous state (UP, DOWN, SUCCESS, FAILING)'),
      currentState: z.string().describe('New state (UP, DOWN, SUCCESS, FAILING)'),
      stateChangedTimestamp: z.number().describe('Unix timestamp of the state change'),
      stateChangedUtcTime: z.string().describe('UTC time of the state change'),
      description: z.string().optional().describe('Short description'),
      longDescription: z.string().optional().describe('Detailed description'),
      importanceLevel: z.string().optional().describe('Importance level'),
      hostname: z.string().optional().describe('Monitored hostname'),
      tags: z.array(z.string()).optional().describe('Check tags'),
      firstProbeLocation: z.string().optional().describe('Location of first confirming probe'),
      secondProbeLocation: z
        .string()
        .optional()
        .describe('Location of second confirming probe')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            checkId: data.check_id,
            checkName: data.check_name,
            checkType: data.check_type,
            previousState: data.previous_state,
            currentState: data.current_state,
            stateChangedTimestamp: data.state_changed_timestamp,
            stateChangedUtcTime: data.state_changed_utc_time,
            description: data.description,
            longDescription: data.long_description,
            importanceLevel: data.importance_level,
            checkParams: data.check_params,
            tags: data.tags,
            firstProbe: data.first_probe
              ? {
                  ip: data.first_probe.ip,
                  ipv6: data.first_probe.ipv6,
                  location: data.first_probe.location
                }
              : undefined,
            secondProbe: data.second_probe
              ? {
                  ip: data.second_probe.ip,
                  ipv6: data.second_probe.ipv6,
                  location: data.second_probe.location
                }
              : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let stateDirection = ctx.input.currentState.toLowerCase();
      let eventType = `check.${stateDirection}`;

      let hostname: string | undefined;
      if (ctx.input.checkParams && typeof ctx.input.checkParams === 'object') {
        hostname =
          ctx.input.checkParams.hostname || ctx.input.checkParams.basic_auth?.hostname;
      }

      return {
        type: eventType,
        id: `${ctx.input.checkId}-${ctx.input.stateChangedTimestamp}`,
        output: {
          checkId: ctx.input.checkId,
          checkName: ctx.input.checkName,
          checkType: ctx.input.checkType,
          previousState: ctx.input.previousState,
          currentState: ctx.input.currentState,
          stateChangedTimestamp: ctx.input.stateChangedTimestamp,
          stateChangedUtcTime: ctx.input.stateChangedUtcTime,
          description: ctx.input.description,
          longDescription: ctx.input.longDescription,
          importanceLevel: ctx.input.importanceLevel,
          hostname,
          tags: ctx.input.tags,
          firstProbeLocation: ctx.input.firstProbe?.location,
          secondProbeLocation: ctx.input.secondProbe?.location
        }
      };
    }
  })
  .build();
