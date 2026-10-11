import { badRequestError, ServiceError } from '@lowerdeck/error';
import { triggerGroup } from '@slates/provider';
import { z } from 'zod';
import { DISCORD_API_BASE_URL } from '../chat/lib/client';
import { InteractionCallbackType } from '../chat/lib/interaction';
import { spec } from '../spec';

// Gateway v10 on a platform-held WebSocket: https://docs.discord.com/developers/events/gateway

export let DISCORD_GATEWAY_VERSION = '10';

export let GatewayOp = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  RESUME: 6,
  RECONNECT: 7,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11
} as const;

// https://docs.discord.com/developers/events/gateway#list-of-intents
export let GatewayIntents = {
  GUILDS: 1 << 0,
  GUILD_MESSAGES: 1 << 9,
  GUILD_MESSAGE_REACTIONS: 1 << 10,
  DIRECT_MESSAGES: 1 << 12,
  DIRECT_MESSAGE_REACTIONS: 1 << 13,
  // Privileged: enable it for the bot in the Developer Portal.
  MESSAGE_CONTENT: 1 << 15
} as const;

export let DISCORD_GATEWAY_INTENTS = Object.values(GatewayIntents).reduce(
  (all, intent) => all | intent,
  0
);

/** Close codes Discord marks as "do not reconnect". */
export let FATAL_CLOSE_CODES: Record<number, string> = {
  4004: 'Authentication failed: the bot token is invalid or was reset.',
  4010: 'Invalid shard.',
  4011: 'Sharding required: the bot is in too many servers for a single connection.',
  4012: 'Invalid gateway API version.',
  4013: 'Invalid intents.',
  4014: 'Disallowed intents: enable the Message Content intent for the bot in the Discord Developer Portal.'
};

/** Reconnectable close codes after which the old session cannot be resumed. */
let SESSION_RESET_CLOSE_CODES = new Set([4007, 4009]);

export let FORWARDED_DISPATCH_TYPES = new Set([
  'MESSAGE_CREATE',
  'MESSAGE_UPDATE',
  'MESSAGE_DELETE',
  'MESSAGE_DELETE_BULK',
  'MESSAGE_REACTION_ADD',
  'MESSAGE_REACTION_REMOVE',
  'INTERACTION_CREATE'
]);

// https://docs.discord.com/developers/interactions/receiving-and-responding#interaction-object-interaction-type
let APPLICATION_COMMAND_INTERACTION = 2;

let gatewayStateSchema = z.object({
  v: z.literal(1).default(1),
  sessionId: z.string().nullable().default(null),
  resumeGatewayUrl: z.string().nullable().default(null),
  seq: z.number().int().nullable().default(null),
  botUserId: z.string().nullable().default(null),
  applicationId: z.string().nullable().default(null),
  heartbeatIntervalMs: z.number().int().positive().nullable().default(null),
  resuming: z.boolean().default(false),
  ready: z.boolean().default(false)
});

export type DiscordGatewayState = z.infer<typeof gatewayStateSchema>;

let parseState = (value: unknown): DiscordGatewayState => {
  let parsed = gatewayStateSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : gatewayStateSchema.parse({});
};

let resetSession = (state: DiscordGatewayState): DiscordGatewayState => ({
  ...state,
  sessionId: null,
  resumeGatewayUrl: null,
  seq: null,
  resuming: false,
  ready: false
});

export interface DiscordGatewayEventPayload {
  eventType: string;
  data: Record<string, any>;
  sessionId: string | null;
  sequence: number | null;
  botUserId: string | null;
  applicationId: string | null;
  interaction?: {
    deferred: boolean;
    ephemeral: boolean;
    receivedAt: number;
  };
}

export let discordGatewayEventSchema = z
  .object({
    eventType: z.string(),
    data: z.record(z.string(), z.any()),
    sessionId: z.string().nullable(),
    sequence: z.number().nullable(),
    botUserId: z.string().nullable(),
    applicationId: z.string().nullable(),
    interaction: z
      .object({
        deferred: z.boolean(),
        ephemeral: z.boolean(),
        receivedAt: z.number()
      })
      .optional()
  })
  .loose();

interface GatewayAuth {
  token?: string;
  tokenType?: string;
  botUserId?: string;
  applicationId?: string;
}

let requireBotToken = (auth: GatewayAuth | undefined) => {
  if (!auth?.token || auth.tokenType === 'Bearer') {
    throw new ServiceError(
      badRequestError({
        message:
          'Discord realtime events require the Bot Token connection; a user OAuth token cannot open the bot gateway.'
      })
    );
  }
  return auth.token;
};

let withGatewayQuery = (url: string) => {
  let parsed = new URL(url);
  parsed.searchParams.set('v', DISCORD_GATEWAY_VERSION);
  parsed.searchParams.set('encoding', 'json');
  return parsed.toString();
};

let gatewayHttpError = async (response: Response, operation: string) => {
  let detail = '';
  try {
    let body = (await response.json()) as { message?: string };
    if (body?.message) detail = `: ${body.message}`;
  } catch {}

  let error = new ServiceError(
    badRequestError({
      message: `Discord ${operation} failed with HTTP ${response.status}${detail}`
    })
  );
  error.data.upstreamStatus = response.status;
  return error;
};

let getGatewayBot = async (token: string) => {
  let response = await fetch(`${DISCORD_API_BASE_URL}/gateway/bot`, {
    headers: { Authorization: `Bot ${token}` }
  });
  if (!response.ok) throw await gatewayHttpError(response, 'gateway lookup');

  return (await response.json()) as {
    url: string;
    session_start_limit?: { remaining?: number; reset_after?: number };
  };
};

// Deferred ack within Discord's 3-second window; command.respond edits it later.
let deferInteraction = async (interaction: { id: string; token: string }) => {
  let response = await fetch(
    `${DISCORD_API_BASE_URL}/interactions/${encodeURIComponent(interaction.id)}/${encodeURIComponent(interaction.token)}/callback`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: InteractionCallbackType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
      })
    }
  );
  if (!response.ok) throw await gatewayHttpError(response, 'interaction acknowledgement');
};

let identifyFrame = (token: string) =>
  JSON.stringify({
    op: GatewayOp.IDENTIFY,
    d: {
      token,
      intents: DISCORD_GATEWAY_INTENTS,
      properties: { os: 'linux', browser: 'metorial', device: 'metorial' }
    }
  });

let heartbeatFrame = (seq: number | null) =>
  JSON.stringify({ op: GatewayOp.HEARTBEAT, d: seq });

let eventPayload = (
  state: DiscordGatewayState,
  eventType: string,
  data: Record<string, any>
): DiscordGatewayEventPayload => ({
  eventType,
  data,
  sessionId: state.sessionId,
  sequence: state.seq,
  botUserId: state.botUserId,
  applicationId: state.applicationId
});

let idempotencyKey = (state: DiscordGatewayState, suffix?: string | number) =>
  `${state.sessionId ?? 'no-session'}:${state.seq ?? 'no-seq'}${suffix !== undefined ? `:${suffix}` : ''}`;

export let discordGatewayTriggerGroup = triggerGroup(spec, {
  key: 'gateway',
  name: 'Discord Gateway',
  description:
    'Receives messages, edits, deletions, reactions, and slash commands in realtime over the Discord Gateway using the bot connection.',
  eventSchema: discordGatewayEventSchema
})
  .gateway({
    connect: async ctx => {
      let auth = ctx.auth as GatewayAuth;
      let token = requireBotToken(auth);
      let state = parseState(ctx.input.state);

      if (state.sessionId && state.resumeGatewayUrl && state.seq !== null) {
        return {
          url: withGatewayQuery(state.resumeGatewayUrl),
          state: { ...state, resuming: true, ready: false }
        };
      }

      let gateway = await getGatewayBot(token);
      let remaining = gateway.session_start_limit?.remaining;
      if (remaining !== undefined && remaining <= 0) {
        let resetMinutes = Math.ceil((gateway.session_start_limit?.reset_after ?? 0) / 60000);
        throw new ServiceError(
          badRequestError({
            message: `Discord has no gateway session starts left for this bot; the limit resets in about ${resetMinutes} minute(s).`
          })
        );
      }

      return {
        url: withGatewayQuery(gateway.url),
        state: {
          ...resetSession(state),
          botUserId: state.botUserId ?? auth.botUserId ?? null,
          applicationId: state.applicationId ?? auth.applicationId ?? null
        }
      };
    },

    receive: async ctx => {
      let auth = ctx.auth as GatewayAuth;
      let state = parseState(ctx.input.state);

      let closed = ctx.input.closed;
      if (closed) {
        let fatal = FATAL_CLOSE_CODES[closed.code];
        if (fatal) {
          return {
            state: closed.code === 4004 ? resetSession(state) : state,
            heartbeat: null,
            close: {
              reconnect: false,
              reason: `Discord closed the gateway (${closed.code}). ${fatal}`
            }
          };
        }

        return {
          state: SESSION_RESET_CLOSE_CODES.has(closed.code) ? resetSession(state) : state,
          heartbeat: null,
          close: {
            reconnect: true,
            reason: `Discord gateway closed (${closed.code}${closed.reason ? `: ${closed.reason}` : ''})`
          }
        };
      }

      let token = requireBotToken(auth);
      let send: string[] = [];
      let events: { payload: DiscordGatewayEventPayload; idempotencyKey: string }[] = [];
      let close: { reconnect: boolean; reason?: string } | null = null;
      let heartbeatAcked = false;

      for (let frame of ctx.input.frames) {
        let message: { op?: number; d?: any; s?: number | null; t?: string | null };
        try {
          message = JSON.parse(frame);
        } catch {
          ctx.warn({ message: 'Ignored a Discord gateway frame that was not valid JSON' });
          continue;
        }

        if (message.op === GatewayOp.HELLO) {
          let interval = Number(message.d?.heartbeat_interval);
          if (Number.isFinite(interval) && interval > 0) state.heartbeatIntervalMs = interval;

          if (state.resuming && state.sessionId && state.seq !== null) {
            send.push(
              JSON.stringify({
                op: GatewayOp.RESUME,
                d: { token, session_id: state.sessionId, seq: state.seq }
              })
            );
          } else {
            state = { ...resetSession(state), heartbeatIntervalMs: state.heartbeatIntervalMs };
            send.push(identifyFrame(token));
          }
          continue;
        }

        if (message.op === GatewayOp.HEARTBEAT) {
          send.push(heartbeatFrame(state.seq));
          continue;
        }

        if (message.op === GatewayOp.HEARTBEAT_ACK) {
          heartbeatAcked = true;
          continue;
        }

        if (message.op === GatewayOp.RECONNECT) {
          close = { reconnect: true, reason: 'Discord requested a gateway reconnect' };
          break;
        }

        if (message.op === GatewayOp.INVALID_SESSION) {
          // d=true: the session may be resumed; d=false: identify on a fresh connection.
          if (message.d !== true) state = resetSession(state);
          close = {
            reconnect: true,
            reason:
              message.d === true
                ? 'Discord invalidated the gateway session; resuming'
                : 'Discord invalidated the gateway session; identifying again'
          };
          break;
        }

        if (message.op !== GatewayOp.DISPATCH) continue;

        if (typeof message.s === 'number') state.seq = message.s;
        let type = message.t ?? '';
        let data = (message.d ?? {}) as Record<string, any>;

        if (type === 'READY') {
          state.sessionId = typeof data.session_id === 'string' ? data.session_id : null;
          state.resumeGatewayUrl =
            typeof data.resume_gateway_url === 'string' ? data.resume_gateway_url : null;
          state.botUserId = data.user?.id ?? state.botUserId;
          state.applicationId = data.application?.id ?? state.applicationId;
          state.ready = true;
          state.resuming = false;
          continue;
        }

        if (type === 'RESUMED') {
          state.ready = true;
          state.resuming = false;
          continue;
        }

        if (!FORWARDED_DISPATCH_TYPES.has(type)) continue;

        if (type === 'MESSAGE_DELETE_BULK') {
          let ids = Array.isArray(data.ids) ? (data.ids as unknown[]) : [];
          ids.forEach((id, index) => {
            if (typeof id !== 'string') return;
            events.push({
              payload: eventPayload(state, 'MESSAGE_DELETE', {
                id,
                channel_id: data.channel_id,
                guild_id: data.guild_id,
                bulk: true
              }),
              idempotencyKey: idempotencyKey(state, index)
            });
          });
          continue;
        }

        if (type === 'INTERACTION_CREATE') {
          if (data.type !== APPLICATION_COMMAND_INTERACTION) continue;

          let receivedAt = Date.now();
          let deferred = false;
          try {
            await deferInteraction({ id: String(data.id), token: String(data.token) });
            deferred = true;
          } catch (error) {
            ctx.warn({
              message: `Could not acknowledge Discord interaction ${data.id}: ${error instanceof Error ? error.message : String(error)}`
            });
          }

          events.push({
            payload: {
              ...eventPayload(state, type, data),
              interaction: { deferred, ephemeral: false, receivedAt }
            },
            idempotencyKey: idempotencyKey(state)
          });
          continue;
        }

        events.push({
          payload: eventPayload(state, type, data),
          idempotencyKey: idempotencyKey(state)
        });
      }

      return {
        state,
        send,
        events,
        // Discord: no ACK between heartbeats means a zombie connection; reconnect and resume.
        heartbeat:
          close || !state.heartbeatIntervalMs
            ? null
            : {
                intervalMs: state.heartbeatIntervalMs,
                frame: heartbeatFrame(state.seq),
                expectsAck: true
              },
        heartbeatAcked,
        close
      };
    }
  })
  // Gateway events go to the socket's own registration; matchers are unused but required.
  .routingMatchers(async () => [])
  .build();
