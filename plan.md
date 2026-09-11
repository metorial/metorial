# Trigger system rebuild — plan

Scope: `packages/proto`, `packages/provider`, `packages/provider-handler`.

## Architecture recap

```
packages/proto             → wire types + JSON-RPC message schemas (Zod), transport-agnostic
packages/provider           → Slate SDK: builder classes integrations author against
packages/provider-handler    → implements the proto RPC surface against a built Slate
```

Trigger groups become a **new top-level entity**, sibling to adapters, not a property of an
individual trigger. Triggers stay listable via the existing `slates/actions.list`
(`type: 'action.trigger'`) but drop their own `invocation` — they now just reference a
`triggerGroupKey`. All polling/webhook mechanics move to the group.

Two-phase event flow (mirrors the existing `map_event` split, generalized to groups):

- **Phase A — extract & route** (group-scoped, cheap, no per-trigger config needed):
  `trigger_group.webhook.process` or `trigger_group.polling.poll`. Internally calls every
  trigger's `matches(payload)` (no config/auth) and returns which trigger keys care about each
  raw event.
- **Phase B — map** (per trigger, needs config+auth): existing `action.trigger.map_event`,
  unchanged in shape, invoked once per `(triggerKey, rawEvent, config, auth)` by the orchestrator,
  after it has resolved routing matchers → config for webhooks (trivial for polling, since that
  call was already scoped to one config/auth).

This keeps `map_event` as the single mapping code path for both webhook and polling triggers, and
means a trigger group can serve many triggers off one HTTP poll / one webhook delivery.

**Routing matchers are a first-class, required capability of every trigger group** — both webhook
and polling — for defense in depth: even an auto-registered, single-target webhook (Stripe) or a
per-repo webhook (GitHub) should independently assert "this event really belongs to this
config/auth" rather than relying solely on registration-time scoping. A group's `routingMatchers`
handler may legitimately return `[]` when it truly has nothing to assert, but it must be
implemented.

The platform delivers **every** incoming HTTP request on a trigger group's webhook URL to that
group's `process` handler as-is — there is no declarative pre-filtering by HTTP method or
sync/async response mode at the proto layer. A `process` handler that needs to answer
synchronously (Slack's `url_verification`, Meta's `hub.challenge`) just returns an ad-hoc
`response` on its result, using the existing serialized-response mechanism
(`SlateWebhookHttpResponseInit` / `serializeWebhookHttpResponse`) — no upfront declaration needed.
This makes the old `slatesWebhookHttp` / `slatesWebhookRequestMatcher` declarative schemas
(`packages/proto/src/types/action.ts:48-77`) obsolete for triggers; propose removing them from
proto entirely (confirm first that nothing outside `action.trigger.*` references them — the
exploration found none).

---

## 1. `packages/proto` — new/changed wire types

`packages/proto/src/types/triggerGroup.ts` (new):

```ts
export let slatesTriggerRoutingMatcher = z.record(z.string(), z.any());

export let slatesTriggerGroupInvocation = z.union([
  z.object({ type: z.literal('polling'), intervalSeconds: z.number().min(600) }),
  z.object({
    type: z.literal('webhook'),
    registration: z.union([
      z.object({ mode: z.literal('auto') }),
      z.object({
        mode: z.literal('manual'),
        userConfigSchema: z.record(z.string(), z.any()),
        fullConfigSchema: z.record(z.string(), z.any())
      })
    ])
  })
]);

export let slatesTriggerGroup = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).default({}),
  invocation: slatesTriggerGroupInvocation
});

export let slatesWebhookTarget = z.object({
  webhookTargetIdentifier: z.string(),
  name: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()),
  webhookTargetPayload: z.any()
});
```

No `http`/sync-matching field anywhere in this file (see rationale above).

`packages/proto/src/types/action.ts` change — `slatesActionTrigger` drops `invocation`, gains
`triggerGroupKey`:

```ts
export let slatesActionTrigger = slatesActionBase.extend({
  type: z.literal('action.trigger'),
  triggerGroupKey: z.string(),
  capabilities: z.object({})
});
```

Removed from `action.ts`: `slates/action.trigger.webhook_handle`, `webhook_register`,
`webhook_unregister`, `poll_events` (superseded by group-scoped versions below). Also propose
removing `slatesWebhookHttp` / `slatesWebhookRequestMatcher` (action.ts:5-14, 48-77 in
`types/action.ts`) as unused once the above are gone. Kept unchanged: `slates/action.trigger.map_event`.

---

## 2. New RPC messages — `packages/proto/src/messages/triggerGroup.ts`

Following the existing Request/Response triad + `*ByMethod` map convention, `z.union`
discriminants, `withRequestTraces` on anything that makes an upstream HTTP call.

| Method | Params | Result | Needs config+auth session? |
|---|---|---|---|
| `slates/trigger_groups.list` | `{}` | `{ triggerGroups: slatesTriggerGroup[] }` | no |
| `slates/trigger_group.get` | `{ triggerGroupKey }` | `{ triggerGroup: slatesTriggerGroup }` | no |
| `slates/trigger_group.webhook.targets_list` | `{ triggerGroupKey, pageToken?: any }` | `withRequestTraces({ resources: slatesWebhookTarget[], nextPageToken: any \| null })` | yes |
| `slates/trigger_group.webhook.register` | `{ triggerGroupKey, webhookTargetIdentifier, webhookTargetPayload: any, webhookUrl: string }` | `withRequestTraces({ webhookRegistrationIdentifier: string, webhookRegistrationPayload: any })` | yes |
| `slates/trigger_group.webhook.unregister` | `{ triggerGroupKey, webhookRegistrationIdentifier, webhookRegistrationPayload: any }` | `withRequestTraces({})` | yes |
| `slates/trigger_group.webhook.manual_setup` | `{ triggerGroupKey, webhookUrl: string }` | `{ webhookSetupDocument: string, partialWebhookRegistrationPayload: any }` | no |
| `slates/trigger_group.webhook.process` | `{ triggerGroupKey, request: { url, method, headers, body: {encoding:'base64', content} }, webhookRegistrationPayload: any }` | `{ events: { matchers: slatesTriggerRoutingMatcher[], payload: any, idempotencyKey?: string, triggerKeys: string[] }[], response?: slatesWebhookHttpResponse }` | no (validated via signature carried in `webhookRegistrationPayload`, not live auth) |
| `slates/trigger_group.routing_matchers.get` | `{ triggerGroupKey }` | `{ matchers: slatesTriggerRoutingMatcher[] }` | yes |
| `slates/trigger_group.polling.poll` | `{ triggerGroupKey, state: any \| null }` | `withRequestTraces({ updatedState?: any, events: { payload: any, idempotencyKey?: string, triggerKeys: string[] }[] })` | yes |

Notes:

- `matchers` on each `webhook.process` event is **required**, not optional — every process
  handler must populate it with whatever identifying info is available (repo/installation id,
  account id, shop domain, etc.), even for auto-registered single-target webhooks. An empty array
  is acceptable only when the provider genuinely exposes nothing to assert.
- `trigger_group.routing_matchers.get` replaces the earlier draft's
  `webhook.matchers_get` — it's renamed out of the `webhook.*` namespace because routing matchers
  are required for polling groups too (called once per config/auth to record what that
  config/auth maps to, independent of any specific incoming event).
- Errors from `webhook.process` use new dotted codes under the existing taxonomy
  (`packages/provider/src/error/defaults.ts`): `request.invalid_signature`,
  `input.invalid_webhook_payload`, `permission.unauthorized_webhook` — thrown via new factories
  (`invalidWebhookSignatureError()`, `invalidWebhookPayloadError()`) alongside the existing
  `badRequestError`/`notFoundError`, mapped through the same `toSlateErrorResponse` path in
  `packages/proto/src/handler/provider.ts`.

**Auth touchpoint** — the two existing RPCs the user identified gain an optional field:

- `slates/auth.authorization_callback.handle` → result gains
  `routingMatchers?: slatesTriggerRoutingMatcher[] | null`
- `slates/auth.token_refresh.handle` → result gains
  `routingMatchers?: slatesTriggerRoutingMatcher[] | null`

This covers providers where the matcher (e.g. Slack `team_id`) is only ever available at
authorization/refresh time, without requiring a live extra API call through
`trigger_group.routing_matchers.get` every time.

---

## 3. `packages/provider` — new library API

`packages/provider/src/action/triggerGroup.ts` (new):

```ts
class SlateTriggerGroup<Config, Auth> {
  key: string; name: string; description?: string; metadata: Record<string, any>;
  source: 'polling' | 'webhook';
  polling?: { intervalSeconds: number; pollEvents: SlateTriggerGroupPollHandler<Config, Auth> };
  webhook?: {
    autoRegistration?: {
      webhookTargetList: SlateWebhookTargetListHandler<Config, Auth>;
      webhookRegister: SlateWebhookRegisterHandler<Config, Auth>;
      webhookUnregister: SlateWebhookUnregisterHandler<Config, Auth>;
    };
    manualRegistration?: {
      userConfigSchema: ZodSchema; fullConfigSchema: ZodSchema;
      setup: SlateWebhookManualSetupHandler;
    };
    process: SlateWebhookProcessHandler;
  };
  routingMatchers: SlateTriggerGroupRoutingMatchersHandler<Config, Auth>; // required, always

  static create<Config, Auth>(
    spec: SlateSpecification<Config, Auth>,
    params: { key: string; name: string; description?: string; metadata?: object }
  ): SlateTriggerGroupBuilder<Config, Auth>;
}
```

Handler signatures (`packages/provider/src/action/action.ts` additions):

```ts
SlateTriggerGroupPollHandler<Config,Auth>
  // ctx(state) => Promise<{ events: {payload, idempotencyKey?}[]; updatedState?: any }>

SlateWebhookTargetListHandler<Config,Auth>
  // ctx(pageToken) => Promise<{ resources: WebhookTarget[]; nextPageToken: any|null }>

SlateWebhookRegisterHandler<Config,Auth>
  // ctx(webhookTargetIdentifier, webhookTargetPayload, webhookUrl) => Promise<{webhookRegistrationIdentifier, webhookRegistrationPayload}>

SlateWebhookUnregisterHandler<Config,Auth>
  // ctx(webhookRegistrationIdentifier, webhookRegistrationPayload) => Promise<void>

SlateWebhookManualSetupHandler
  // (webhookUrl) => {webhookSetupDocument, partialWebhookRegistrationPayload}

SlateWebhookProcessHandler
  // ctx(request, webhookRegistrationPayload) => Promise<{
  //   events: { matchers: Matcher[]; payload: any; idempotencyKey?: string }[];
  //   response?: Response | SlateWebhookHttpResponseInit;
  // }>

SlateTriggerGroupRoutingMatchersHandler<Config,Auth>
  // ctx(config, auth) => Promise<Matcher[]>   // required; return [] if nothing to assert
```

Builder shape — `routingMatchers` is a top-level method (not nested under `.webhook()`), since it
applies uniformly to polling and webhook groups:

```ts
SlateTriggerGroup.create(spec, { key, name, description? })
  .polling({ intervalSeconds, pollEvents })
  // or
  .webhook({ autoRegistration, process })       // exactly one of autoRegistration/manualRegistration
  .webhook({ manualRegistration, process })
  .routingMatchers(handler)                     // required regardless of invocation type
  .build();                                     // throws SlateDeclarationError if routingMatchers missing,
                                                 // or if webhook mode has neither/both of auto/manual
```

`SlateTrigger` (`trigger.ts`) changes: drop `.webhook()`/`.polling()` builder methods (they move to
the group); add `.triggerGroup(group)`, `.matches(fn)`; keep `.map(handler)` (this is the existing
`handleEvent` capability — keeping the name `handleEvent`/`map` as-is, whichever produces the
smaller diff across existing integrations, is a call for implementation time, not the design):

```ts
SlateTrigger.create(spec, { key, name, description, triggerGroup })
  .input(schema).output(schema)
  .matches((payload: unknown) => boolean)     // no config/auth
  .map(async (ctx: {event, config, auth}) => ({ type, id, output }))
  .build();
```

---

## 4. `packages/provider-handler` wiring

`spec.ts` additions: `getTriggerGroup(slate, key)`, `getTriggersForGroup(slate, groupKey)`,
`mapTriggerGroup()` (Slate → wire, mirrors `mapAction`).

`index.ts` additions, each following the existing skeleton (`getContextFull`/lighter no-auth
context → lookup → `traceProviderCall` → `withRequestTraces`):

- New shared helper `evaluateTriggerMatches(slate, groupKey, payload): string[]` — iterates
  `getTriggersForGroup`, calls each trigger's `.matches(payload)`, used by both
  `webhook.process` and `polling.poll` handlers so the filtering logic lives in exactly one place.
- `slates/trigger_group.webhook.process` handler does **not** call `getContextFull()` (no auth
  requirement) — reconstructs the `Request` the same way the old `webhook_handle` did
  (`index.ts:934-1000` pattern), calls `group.webhook.process(request, params.webhookRegistrationPayload)`,
  then runs `evaluateTriggerMatches` per returned event, and asserts `matchers` is present
  (empty array allowed, `undefined` rejected as a declaration error surfaced at runtime).
- `slates/trigger_group.polling.poll` requires full context (config+auth), calls
  `group.polling.pollEvents(ctx)`, then `evaluateTriggerMatches` per event.
- `slates/trigger_group.routing_matchers.get` requires full context, calls
  `group.routingMatchers(ctx)` directly — no matching/filtering step, just a passthrough.
- `webhook.ts`'s `serializeWebhookHttpResponse` is reused unchanged for any synchronous `response`
  a `process` handler returns (e.g. Slack's `url_verification` challenge echo).

---

## 5. Concrete invocation examples

**GitHub — auto-registration, one webhook per repo, with defense-in-depth matcher:**

```ts
export let githubIssuesTriggerGroup = SlateTriggerGroup.create(spec, { key: 'issues', name: 'Repository Issues' })
  .webhook({
    autoRegistration: {
      webhookTargetList: async (ctx) => {
        let page = await listRepos(ctx.auth, ctx.pageToken);
        return {
          resources: page.repos.map(r => ({
            webhookTargetIdentifier: r.fullName, name: r.fullName,
            metadata: { private: r.private },
            webhookTargetPayload: { owner: r.owner, repo: r.name }
          })),
          nextPageToken: page.nextPageToken
        };
      },
      webhookRegister: async (ctx) => {
        let hook = await createRepoWebhook(ctx.auth, ctx.webhookTargetPayload, ctx.webhookUrl);
        return { webhookRegistrationIdentifier: String(hook.id), webhookRegistrationPayload: { secret: hook.secret, ...ctx.webhookTargetPayload } };
      },
      webhookUnregister: async (ctx) => deleteRepoWebhook(ctx.auth, ctx.webhookRegistrationPayload, ctx.webhookRegistrationIdentifier)
    },
    process: async (ctx) => {
      verifyGithubSignature(ctx.request, ctx.webhookRegistrationPayload.secret);
      let body = await ctx.request.json();
      return {
        events: [{
          matchers: [{ repository_id: body.repository?.id, installation_id: body.installation?.id }],
          payload: body,
          idempotencyKey: ctx.request.headers.get('x-github-delivery')
        }]
      };
    }
  })
  .routingMatchers(async (ctx) => {
    let installation = await getInstallation(ctx.auth);
    return [{ installation_id: installation.id }];
  })
  .build();

export let issueOpenedTrigger = SlateTrigger.create(spec, { key: 'issue.opened', name: 'Issue Opened', triggerGroup: githubIssuesTriggerGroup })
  .input(z.object({})).output(z.object({ issueId: z.number(), title: z.string() }))
  .matches(payload => payload.action === 'opened' && !!payload.issue)
  .map(async ctx => ({ type: 'issue.opened', id: String(ctx.event.issue.id), output: { issueId: ctx.event.issue.id, title: ctx.event.issue.title } }))
  .build();
```

**Stripe — auto-registration, single fixed resource, matcher still asserted:**

```ts
export let stripeTriggerGroup = SlateTriggerGroup.create(spec, { key: 'events', name: 'Stripe Events' })
  .webhook({
    autoRegistration: {
      webhookTargetList: async () => ({ resources: [{ webhookTargetIdentifier: 'account', name: 'Account', metadata: {}, webhookTargetPayload: {} }], nextPageToken: null }),
      webhookRegister: async (ctx) => {
        let endpoint = await stripe.webhookEndpoints.create({ url: ctx.webhookUrl, enabled_events: ['*'] }, { apiKey: ctx.auth.secretKey });
        return { webhookRegistrationIdentifier: endpoint.id, webhookRegistrationPayload: { secret: endpoint.secret } };
      },
      webhookUnregister: async (ctx) => stripe.webhookEndpoints.del(ctx.webhookRegistrationIdentifier, { apiKey: ctx.auth.secretKey })
    },
    process: async (ctx) => {
      let event = stripe.webhooks.constructEvent(await ctx.request.text(), ctx.request.headers.get('stripe-signature'), ctx.webhookRegistrationPayload.secret);
      return { events: [{ matchers: [{ account_id: event.account }], payload: event, idempotencyKey: event.id }] };
    }
  })
  .routingMatchers(async (ctx) => [{ account_id: ctx.auth.accountId }])
  .build();
```

**Slack — manual registration, matchers resolved via app-level token:**

```ts
export let slackEventsTriggerGroup = SlateTriggerGroup.create(spec, { key: 'events', name: 'Slack Events' })
  .webhook({
    manualRegistration: {
      userConfigSchema: z.object({ signingSecret: z.string(), appLevelToken: z.string() }),
      fullConfigSchema: z.object({ signingSecret: z.string(), appLevelToken: z.string() }),
      setup: async ({ webhookUrl }) => ({
        webhookSetupDocument: `# Configure Slack Events\n\n1. Open **Event Subscriptions** in your app settings.\n2. Set the Request URL to:\n\n   \`${webhookUrl}\`\n\n3. Paste your **Signing Secret** and an **app-level token** with the \`authorizations:read\` scope below.`,
        partialWebhookRegistrationPayload: {}
      })
    },
    process: async (ctx) => {
      verifySlackSignature(ctx.request, ctx.webhookRegistrationPayload.signingSecret);
      let body = await ctx.request.json();
      if (body.type === 'url_verification') return { events: [], response: { status: 200, body: { challenge: body.challenge } } };
      return { events: [{ matchers: [{ team_id: body.team_id, user_id: body.event?.user }], payload: body.event, idempotencyKey: body.event_id }] };
    }
  })
  .routingMatchers(async (ctx) => {
    let auths = await listAppAuthorizations(ctx.config.appLevelToken);
    return auths.map(a => ({ team_id: a.team_id, user_id: a.user_id }));
  })
  .build();
```

**Polling example (replaces per-trigger poll with group-scoped poll):**

```ts
export let ordersTriggerGroup = SlateTriggerGroup.create(spec, { key: 'orders', name: 'Orders' })
  .polling({
    intervalSeconds: SlateDefaultPollingIntervalSeconds,
    pollEvents: async (ctx) => {
      let orders = await listOrdersSince(ctx.auth, ctx.state?.lastTimestamp);
      return { events: orders.map(o => ({ payload: o, idempotencyKey: o.id })), updatedState: { lastTimestamp: orders.at(-1)?.updatedAt ?? ctx.state?.lastTimestamp } };
    }
  })
  .routingMatchers(async (ctx) => [{ shop_domain: ctx.auth.shopDomain }])
  .build();

export let orderStatusUpdatedTrigger = SlateTrigger.create(spec, { key: 'order.status_updated', name: 'Order Status Updated', triggerGroup: ordersTriggerGroup })
  .input(z.object({})).output(z.object({ orderId: z.string(), status: z.string() }))
  .matches(payload => payload.statusChanged === true)
  .map(async ctx => ({ type: 'order.status_updated', id: ctx.event.id, output: { orderId: ctx.event.id, status: ctx.event.status } }))
  .build();
```

**Auth callback returning matchers at authorization time (Slack-style, avoids a live lookup):**

```ts
createSlackOauth({
  handleCallback: async (ctx) => {
    let result = await exchangeCode(ctx.code);
    return {
      output: { token: result.access_token, teamId: result.team.id },
      routingMatchers: [{ team_id: result.team.id }]
    };
  }
});
```

---

## Open questions before implementing

1. **`.matches()`/`.map()` naming** — renaming `handleEvent` risks unnecessary churn across every
   existing integration; keeping `handleEvent` as the map function name (just adding `.matches()`
   alongside) is a smaller diff. Decide at implementation time.
2. **`webhookRegistrationPayload` size/secret handling** — confirm whether it's stored encrypted
   at rest by the orchestrator (out of scope for these three packages, but worth flagging since it
   now carries provider secrets by design for every provider, not just those that needed it
   before).
3. **`trigger_group.webhook.process` request reconstruction** — reuse the existing
   `webhook_handle` request-rebuilding code (`provider-handler/src/index.ts:934-1000`) verbatim;
   confirm no dependency on the old `SlateWebhookHttpOptions`/sync-matching path being removed.
4. **Exact current shape of `slates/auth.authorization_callback.handle` /
   `slates/auth.token_refresh.handle`** — the field addition (`routingMatchers?`) is
   straightforward, but should be verified against `packages/proto/src/messages/auth.ts` before
   implementation (not fully inspected during research).
