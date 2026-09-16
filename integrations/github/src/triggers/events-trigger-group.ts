import { triggerGroup } from 'slates';
import { spec } from '../spec';
import { githubEventEnvelopeSchema } from './event-schemas';
import {
  listGitHubWebhookTargets,
  registerGitHubWebhook,
  unregisterGitHubWebhook
} from './registration';
import { processGitHubWebhook } from './webhook';

export const repositoryEvents = triggerGroup(spec, {
  key: 'repository_events',
  name: 'Repository Events',
  description:
    'Code, collaboration, CI/CD, and Dependabot events for repositories accessible to the connection with webhook permissions.',
  eventSchema: githubEventEnvelopeSchema
})
  .webhook({
    autoRegistration: {
      webhookTargetList: ctx => listGitHubWebhookTargets(ctx.auth, ctx.input.pageToken, ctx),
      webhookRegister: ctx => registerGitHubWebhook(ctx.auth, ctx.input),
      webhookUnregister: ctx =>
        unregisterGitHubWebhook(ctx.auth, ctx.input.webhookRegistrationPayload)
    },
    process: processGitHubWebhook
  })
  // Automatic targets route through subscriptions; the SDK still requires this handler.
  .routingMatchers(async () => [])
  .build();
