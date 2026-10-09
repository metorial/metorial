import { createApiServiceError, skipWebhook, triggerGroup } from 'slates';
import { z } from 'zod';
import {
  buildGoogleChatAppRoutingMatcher,
  buildGoogleChatConnectionRoutingMatchers
} from '../lib/routingMatcher';
import { spec } from '../spec';
import { GOOGLE_CHAT_ISSUER, verifyGoogleChatBearerToken } from './verifyChatRequest';

let projectNumberSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Use the numeric Google Cloud project number')
  .describe(
    'Numeric Google Cloud project number of the Chat app, from the Google Cloud console Dashboard'
  );

let authenticationAudienceSchema = z
  .enum(['endpoint_url', 'project_number'])
  .describe(
    'Authentication Audience selected in the Chat API configuration: project_number for "Project Number" (recommended) or endpoint_url for "HTTP endpoint URL"'
  );

let projectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/i, 'Use the Google Cloud project ID')
  .describe(
    'Google Cloud project ID of the Chat app, from the Google Cloud console Dashboard'
  );

// Google-managed per-project service agent; nobody else can mint ID tokens for it.
let ADD_ON_SERVICE_ACCOUNT_PATTERN = /^service-(\d+)@gcp-sa-gsuiteaddons\.iam\.gserviceaccount\.com$/;

let userConfigSchema = z.object({
  authenticationAudience: authenticationAudienceSchema,
  projectNumber: projectNumberSchema,
  projectId: projectIdSchema,
  addOnServiceAccountEmail: z
    .preprocess(
      value =>
        typeof value === 'string' ? value.trim().toLowerCase() || undefined : value,
      z
        .string()
        .regex(ADD_ON_SERVICE_ACCOUNT_PATTERN, 'Use the add-on service account email')
        .optional()
    )
    .describe(
      'Only for a Chat app built as a Google Workspace add-on: the add-on service account email shown in the Chat API configuration (service-PROJECT_NUMBER@gcp-sa-gsuiteaddons.iam.gserviceaccount.com). Requires the endpoint_url authentication audience.'
    )
});

let fullConfigSchema = userConfigSchema.extend({
  endpointUrl: z
    .string()
    .url()
    .describe('HTTP endpoint URL configured in the Chat API configuration')
});

export type GoogleChatWebhookRegistration = z.infer<typeof fullConfigSchema>;

/**
 * Event types this group forwards. Google Chat's other interaction events
 * (ADDED_TO_SPACE, REMOVED_FROM_SPACE, CARD_CLICKED, WIDGET_UPDATED, APP_HOME,
 * SUBMIT_FORM) are acknowledged without events.
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/EventType
 */
export let GOOGLE_CHAT_FORWARDED_EVENT_TYPES = ['MESSAGE', 'APP_COMMAND'] as const;

let interactionEventSchema = z
  .object({
    type: z.string(),
    eventTime: z.string().optional(),
    space: z.object({ name: z.string() }).loose(),
    message: z.object({ name: z.string().optional() }).loose().optional(),
    user: z.object({ name: z.string().optional() }).loose().optional(),
    isDialogEvent: z.boolean().optional(),
    appCommandMetadata: z
      .object({
        appCommandId: z.union([z.number(), z.string()]).optional(),
        appCommandType: z.string().optional()
      })
      .loose()
      .optional()
  })
  .loose();

export type GoogleChatInteractionEvent = z.infer<typeof interactionEventSchema> &
  Record<string, any>;

let addOnPayloadTypes = {
  messagePayload: 'MESSAGE',
  appCommandPayload: 'APP_COMMAND',
  addedToSpacePayload: 'ADDED_TO_SPACE',
  removedFromSpacePayload: 'REMOVED_FROM_SPACE',
  buttonClickedPayload: 'CARD_CLICKED',
  widgetUpdatedPayload: 'WIDGET_UPDATED'
} as const;

/**
 * Chat apps built as Google Workspace add-ons nest the interaction under
 * `chat.<kind>Payload`; this rebuilds the Chat API event shape so one set of
 * triggers handles both app types. App Home events (no payload) become APP_HOME;
 * payload kinds this group does not know become ADD_ON_<kind> and are ignored.
 * https://developers.google.com/workspace/add-ons/concepts/event-objects#chat-event-object
 */
export let normalizeGoogleChatAddOnEvent = (body: unknown): unknown => {
  let chat = (body as { chat?: unknown } | null)?.chat;
  if (!chat || typeof chat !== 'object' || 'type' in (body as object)) return body;

  let { user, space, eventTime, ...payloads } = chat as Record<string, any>;
  let kind = (Object.keys(addOnPayloadTypes) as (keyof typeof addOnPayloadTypes)[]).find(
    key => payloads[key] && typeof payloads[key] === 'object'
  );
  if (!kind) {
    let unknownKind = Object.keys(payloads).find(key => key.endsWith('Payload'));
    return { type: unknownKind ? `ADD_ON_${unknownKind}` : 'APP_HOME', eventTime, user, space };
  }

  let payload = payloads[kind] as Record<string, any>;
  return {
    ...payload,
    type: addOnPayloadTypes[kind],
    eventTime,
    user,
    space: payload.space ?? space
  };
};

// A JSON object is a valid "no synchronous reply" response; replies are sent
// asynchronously through the Chat API.
let jsonResponse = (status: number, body: unknown = {}) => ({
  status,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body)
});

let isCommandEvent = (event: GoogleChatInteractionEvent) =>
  event.type === 'APP_COMMAND' ||
  (event.type === 'MESSAGE' && Boolean((event.message as any)?.slashCommand));

/**
 * Idempotency key per provider occurrence. A slash command may be described by
 * both a MESSAGE and an APP_COMMAND event for the same message; both share the
 * `command:` key so it is delivered once.
 */
export let getGoogleChatEventIdempotencyKey = (event: GoogleChatInteractionEvent) => {
  let messageName = event.message?.name;
  if (isCommandEvent(event)) {
    if (messageName) return `command:${messageName}`;
    let commandId = event.appCommandMetadata?.appCommandId ?? 'unknown';
    return `command:${event.space.name}:${commandId}:${event.user?.name ?? 'unknown'}:${event.eventTime ?? ''}`;
  }
  return messageName ? `message:${messageName}` : undefined;
};

export let googleChatInteractionEvents = triggerGroup(spec, {
  key: 'chat_app_events',
  name: 'Google Chat App Events',
  description:
    'Receives Google Chat app interaction events (messages sent to the app, @mentions, and app commands) from the HTTP endpoint configured for the Chat app.',
  eventSchema: z.object({ type: z.string() }).loose()
})
  .webhook({
    manualRegistration: {
      userConfigSchema,
      fullConfigSchema,

      setup: async ctx => ({
        webhookSetupDocument: [
          'Finish this setup **before** using the endpoint: until it is saved, requests from Google Chat are rejected.',
          '',
          '1. In the Google Cloud console, open **APIs & Services > Google Chat API > Configuration** for the project that owns the Chat app and its service account.',
          '2. Classic Chat apps and Chat apps built as a **Google Workspace add-on** are both supported (converting an existing app to an add-on cannot be undone). For an add-on, select **Use common HTTP endpoint URL for all triggers**, use the URL below, choose **HTTP endpoint URL** as the authentication audience below, and enter the add-on service account email shown in the Chat API configuration.',
          '3. Under **Interactive features**, enable them and select **Join spaces and group conversations** if the app should work outside direct messages.',
          '4. Under **Connection settings**, choose **HTTP endpoint URL** and enter:',
          '',
          `\`\`\`\n${ctx.input.webhookUrl}\n\`\`\``,
          '',
          '5. For a classic Chat app, under **Authentication Audience**, choose **Project Number** (recommended: requests are then cryptographically bound to your project) or **HTTP endpoint URL**, and select the same option below. Add-on apps have no audience choice; select **HTTP endpoint URL** below. With **HTTP endpoint URL**, keep the endpoint URL private, because any Chat app configured with it would be accepted.',
          '6. Copy the numeric **Project number** and the **Project ID** from the Google Cloud console **Dashboard** and enter them below. Connect Google Chat with a service account key from the same project and the same project number so events reach the connection.',
          '7. Optionally add slash commands or quick commands under **Commands**, then click **Save**.'
        ].join('\n'),
        partialWebhookRegistrationPayload: { endpointUrl: ctx.input.webhookUrl }
      }),

      finish: async ctx => {
        let parsed = fullConfigSchema.safeParse({
          endpointUrl: ctx.input.webhookUrl,
          ...ctx.input.partialWebhookRegistrationPayload,
          ...ctx.input.userWebhookRegistrationPayload
        });
        if (!parsed.success) {
          throw createApiServiceError(
            `Google Chat event setup is invalid: ${parsed.error.issues
              .map(issue => `${issue.path.join('.') || 'value'}: ${issue.message}`)
              .join('; ')}`,
            { reason: 'google_chat_webhook_setup_invalid' }
          );
        }
        let addOnEmail = parsed.data.addOnServiceAccountEmail;
        if (addOnEmail && parsed.data.authenticationAudience !== 'endpoint_url') {
          throw createApiServiceError(
            'Google Chat event setup is invalid: a Google Workspace add-on Chat app uses the endpoint_url authentication audience.',
            { reason: 'google_chat_webhook_setup_invalid' }
          );
        }
        if (
          addOnEmail &&
          ADD_ON_SERVICE_ACCOUNT_PATTERN.exec(addOnEmail)?.[1] !== parsed.data.projectNumber
        ) {
          throw createApiServiceError(
            'Google Chat event setup is invalid: the add-on service account email does not belong to the project number.',
            { reason: 'google_chat_webhook_setup_invalid' }
          );
        }
        return { webhookRegistrationPayload: parsed.data };
      }
    },

    process: async ctx => {
      let { request, webhookRegistrationPayload } = ctx.input;

      let registration = fullConfigSchema.safeParse(webhookRegistrationPayload);
      if (!registration.success) {
        ctx.warn({ message: 'Rejected Google Chat request: registration is incomplete' });
        return skipWebhook(
          'google_chat_webhook_registration_invalid',
          jsonResponse(500, { error: 'registration is incomplete' })
        );
      }
      let config = registration.data;

      if (request.method.toUpperCase() !== 'POST') {
        return skipWebhook('google_chat_webhook_method_not_allowed', {
          status: 405,
          headers: { allow: 'POST', 'content-type': 'application/json' },
          body: JSON.stringify({ error: 'method not allowed' })
        });
      }

      let verification = await verifyGoogleChatBearerToken({
        authorization: request.headers.get('authorization'),
        audienceType: config.authenticationAudience,
        audience:
          config.authenticationAudience === 'project_number'
            ? config.projectNumber
            : config.endpointUrl,
        // Converting to an add-on is irreversible, so add-on registrations accept only
        // the add-on's own service account.
        allowedEmails: config.addOnServiceAccountEmail
          ? [config.addOnServiceAccountEmail]
          : [GOOGLE_CHAT_ISSUER]
      });

      if (!verification.ok) {
        if (verification.failure === 'certificates_unavailable') {
          // Not skipped: a 5xx lets the delivery be retried once certificates load.
          ctx.warn({ message: 'Google Chat request not verified: certificates unavailable' });
          return {
            events: [],
            response: jsonResponse(503, { error: 'verification temporarily unavailable' })
          };
        }
        ctx.warn({
          message: 'Rejected Google Chat request: bearer token verification failed',
          failure: verification.failure
        });
        return skipWebhook(
          `google_chat_webhook_token_${verification.failure}`,
          jsonResponse(401, { error: verification.message })
        );
      }

      let parsed: unknown;
      try {
        let raw = new TextDecoder('utf-8', { fatal: true }).decode(
          await request.arrayBuffer()
        );
        parsed = JSON.parse(raw);
      } catch {
        return skipWebhook(
          'google_chat_webhook_json_invalid',
          jsonResponse(400, { error: 'invalid json' })
        );
      }

      let normalized = normalizeGoogleChatAddOnEvent(parsed);
      // Add-on App Home events carry no space; acknowledge them like other ignored types.
      if ((normalized as { type?: unknown } | null)?.type === 'APP_HOME') {
        ctx.info({ message: 'Ignored Google Chat interaction event', type: 'APP_HOME' });
        return skipWebhook('google_chat_webhook_ignored_event_type', jsonResponse(200));
      }

      let envelope = interactionEventSchema.safeParse(normalized);
      if (!envelope.success) {
        ctx.warn({
          message: 'Rejected Google Chat request: not an interaction event',
          issues: envelope.error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message
          }))
        });
        return skipWebhook(
          'google_chat_webhook_envelope_invalid',
          jsonResponse(400, { error: 'invalid interaction event' })
        );
      }

      let event = envelope.data as GoogleChatInteractionEvent;
      if (
        !(GOOGLE_CHAT_FORWARDED_EVENT_TYPES as readonly string[]).includes(event.type) ||
        event.isDialogEvent === true ||
        (event.type === 'MESSAGE' && !event.message?.name)
      ) {
        ctx.info({ message: 'Ignored Google Chat interaction event', type: event.type });
        return skipWebhook('google_chat_webhook_ignored_event_type', jsonResponse(200));
      }

      // The deprecated verification token is a shared secret; do not forward it.
      // `authorizationEventObject` can carry user and system ID tokens.
      let {
        token: _legacyToken,
        authorizationEventObject: _authorization,
        commonEventObject: _common,
        ...payload
      } = event as Record<string, any>;

      return {
        events: [
          {
            payload,
            matchers: [
              buildGoogleChatAppRoutingMatcher({
                projectNumber: config.projectNumber,
                projectId: config.projectId
              })
            ],
            idempotencyKey: getGoogleChatEventIdempotencyKey(event)
          }
        ],
        response: jsonResponse(200)
      };
    }
  })
  .routingMatchers(async ctx => buildGoogleChatConnectionRoutingMatchers(ctx.auth))
  .build();
