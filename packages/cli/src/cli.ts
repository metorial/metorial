#!/usr/bin/env bun

import sade from 'sade';
import {
  addOAuthCredentials,
  addProfile,
  callTool,
  finishTriggerGroupWebhookManualSetup,
  getAuth,
  getConfig,
  getConfigSchema,
  getProfile,
  getTool,
  getTrigger,
  getTriggerGroup,
  getTriggerGroupRoutingMatchers,
  listAuth,
  listOAuthCredentials,
  listProfiles,
  listTools,
  listTriggerGroups,
  listTriggerGroupWebhookTargets,
  listTriggers,
  mapTriggerEvent,
  pollTriggerGroup,
  processTriggerGroupWebhook,
  refreshAuth,
  registerTriggerGroupWebhook,
  removeProfile,
  runAllIntegrationTests,
  runVitestWithProfile,
  setConfig,
  setupAuth,
  setupIntegration,
  setupTriggerGroupWebhookManually,
  startRepl,
  unregisterTriggerGroupWebhook,
  useProfile
} from './commands';

let printResult = async (cb: () => Promise<unknown>) => {
  try {
    let result = await cb();
    if (result !== undefined) {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

let cli = sade('slates');
let argv = process.argv.slice(2);
let isGlobalTestCommand = argv[0] === 'test';
let integration = isGlobalTestCommand ? null : argv[0];

if (!isGlobalTestCommand && (!integration || integration.startsWith('-'))) {
  console.error('Usage: slates <integration> <command>\n       slates test');
  process.exit(1);
}

if (isGlobalTestCommand) {
  cli.command('test').action(() =>
    printResult(async () => {
      let separatorIndex = process.argv.indexOf('--');
      return runAllIntegrationTests({
        vitestArgs: separatorIndex === -1 ? [] : process.argv.slice(separatorIndex + 1)
      });
    })
  );

  cli.parse([process.argv[0] ?? 'bun', process.argv[1] ?? 'slates', ...argv]);
} else {
  cli
    .command('profiles add')
    .option('--name', 'Profile name')
    .option('--entry', 'Local slate entry file')
    .option('--export-name', 'Named export for the local slate provider')
    .option('--default', 'Use this profile as the default')
    .action(opts =>
      printResult(() =>
        addProfile({
          integration: integration!,
          name: opts.name,
          entry: opts.entry,
          exportName: opts.exportName,
          useAsDefault: Boolean(opts.default)
        })
      )
    );

  cli
    .command('profiles list')
    .action(() => printResult(() => listProfiles({ integration: integration! })));

  cli
    .command('profiles get [profile]')
    .action((profile: string | undefined) =>
      printResult(() => getProfile({ integration: integration!, profile }))
    );

  cli
    .command('profiles use [profile]')
    .action((profile: string | undefined) =>
      printResult(() => useProfile({ integration: integration!, profile }))
    );

  cli
    .command('profiles remove [profile]')
    .action((profile: string | undefined) =>
      printResult(() => removeProfile({ integration: integration!, profile }))
    );

  cli
    .command('setup')
    .option('--name', 'Profile name')
    .option('--export-name', 'Named export for the local slate provider')
    .action(opts =>
      printResult(() =>
        setupIntegration({
          integration: integration!,
          name: opts.name,
          exportName: opts.exportName
        })
      )
    );

  cli
    .command('tools list')
    .option('--profile', 'Profile ID or name')
    .action(opts =>
      printResult(() =>
        listTools({
          integration: integration!,
          profile: opts.profile
        })
      )
    );

  cli
    .command('tools get [toolId]')
    .option('--profile', 'Profile ID or name')
    .action((toolId: string | undefined, opts) =>
      printResult(() =>
        getTool({
          integration: integration!,
          profile: opts.profile,
          toolId
        })
      )
    );

  cli
    .command('tools schema [toolId]')
    .option('--profile', 'Profile ID or name')
    .action((toolId: string | undefined, opts) =>
      printResult(async () => {
        let tool = await getTool({
          integration: integration!,
          profile: opts.profile,
          toolId
        });
        return tool.inputSchema;
      })
    );

  cli
    .command('tools call [toolId]')
    .option('--profile', 'Profile ID or name')
    .option('--input', 'JSON input object')
    .option('--auth-method-id', 'Preferred auth method ID')
    .action((toolId: string | undefined, opts) =>
      printResult(() =>
        callTool({
          integration: integration!,
          profile: opts.profile,
          toolId,
          input: opts.input,
          authMethodId: opts.authMethodId
        })
      )
    );

  cli
    .command('triggers list')
    .option('--profile', 'Profile ID or name')
    .action(opts =>
      printResult(() =>
        listTriggers({
          integration: integration!,
          profile: opts.profile
        })
      )
    );

  cli
    .command('triggers get [triggerId]')
    .option('--profile', 'Profile ID or name')
    .action((triggerId: string | undefined, opts) =>
      printResult(() =>
        getTrigger({
          integration: integration!,
          profile: opts.profile,
          triggerId
        })
      )
    );

  cli
    .command('triggers map [triggerId]')
    .option('--profile', 'Profile ID or name')
    .option('--input', 'JSON event input object')
    .action((triggerId: string | undefined, opts) =>
      printResult(() =>
        mapTriggerEvent({
          integration: integration!,
          profile: opts.profile,
          triggerId,
          input: opts.input
        })
      )
    );

  cli
    .command('trigger-groups list')
    .option('--profile', 'Profile ID or name')
    .action(opts =>
      printResult(() =>
        listTriggerGroups({
          integration: integration!,
          profile: opts.profile
        })
      )
    );

  cli
    .command('trigger-groups get [triggerGroupId]')
    .option('--profile', 'Profile ID or name')
    .action((triggerGroupId: string | undefined, opts) =>
      printResult(() =>
        getTriggerGroup({
          integration: integration!,
          profile: opts.profile,
          triggerGroupId
        })
      )
    );

  cli
    .command('trigger-groups poll [triggerGroupId]')
    .option('--profile', 'Profile ID or name')
    .option('--state', 'JSON-encoded previous poll state')
    .action((triggerGroupId: string | undefined, opts) =>
      printResult(() =>
        pollTriggerGroup({
          integration: integration!,
          profile: opts.profile,
          triggerGroupId,
          state: opts.state
        })
      )
    );

  cli
    .command('trigger-groups routing-matchers [triggerGroupId]')
    .option('--profile', 'Profile ID or name')
    .action((triggerGroupId: string | undefined, opts) =>
      printResult(() =>
        getTriggerGroupRoutingMatchers({
          integration: integration!,
          profile: opts.profile,
          triggerGroupId
        })
      )
    );

  cli
    .command('trigger-groups webhook targets [triggerGroupId]')
    .option('--profile', 'Profile ID or name')
    .option('--page-token', 'JSON-encoded page token')
    .action((triggerGroupId: string | undefined, opts) =>
      printResult(() =>
        listTriggerGroupWebhookTargets({
          integration: integration!,
          profile: opts.profile,
          triggerGroupId,
          pageToken: opts.pageToken
        })
      )
    );

  cli
    .command('trigger-groups webhook register [triggerGroupId]')
    .option('--profile', 'Profile ID or name')
    .option('--webhook-target-identifier', 'Webhook target identifier')
    .option('--webhook-target-payload', 'JSON webhook target payload')
    .option('--webhook-url', 'Webhook delivery URL')
    .action((triggerGroupId: string | undefined, opts) =>
      printResult(() =>
        registerTriggerGroupWebhook({
          integration: integration!,
          profile: opts.profile,
          triggerGroupId,
          webhookTargetIdentifier: opts.webhookTargetIdentifier,
          webhookTargetPayload: opts.webhookTargetPayload,
          webhookUrl: opts.webhookUrl
        })
      )
    );

  cli
    .command('trigger-groups webhook unregister [triggerGroupId]')
    .option('--profile', 'Profile ID or name')
    .option('--webhook-registration-identifier', 'Webhook registration identifier')
    .option('--webhook-registration-payload', 'JSON webhook registration payload')
    .action((triggerGroupId: string | undefined, opts) =>
      printResult(() =>
        unregisterTriggerGroupWebhook({
          integration: integration!,
          profile: opts.profile,
          triggerGroupId,
          webhookRegistrationIdentifier: opts.webhookRegistrationIdentifier,
          webhookRegistrationPayload: opts.webhookRegistrationPayload
        })
      )
    );

  cli
    .command('trigger-groups webhook manual-setup [triggerGroupId]')
    .option('--profile', 'Profile ID or name')
    .option('--webhook-url', 'Webhook delivery URL')
    .action((triggerGroupId: string | undefined, opts) =>
      printResult(() =>
        setupTriggerGroupWebhookManually({
          integration: integration!,
          profile: opts.profile,
          triggerGroupId,
          webhookUrl: opts.webhookUrl
        })
      )
    );

  cli
    .command('trigger-groups webhook manual-finish [triggerGroupId]')
    .option('--profile', 'Profile ID or name')
    .option('--webhook-url', 'Webhook delivery URL')
    .option('--partial-payload', 'JSON partial webhook registration payload')
    .option('--user-payload', 'JSON user-supplied webhook registration payload')
    .action((triggerGroupId: string | undefined, opts) =>
      printResult(() =>
        finishTriggerGroupWebhookManualSetup({
          integration: integration!,
          profile: opts.profile,
          triggerGroupId,
          webhookUrl: opts.webhookUrl,
          partialWebhookRegistrationPayload: opts.partialPayload,
          userWebhookRegistrationPayload: opts.userPayload
        })
      )
    );

  cli
    .command('trigger-groups webhook process [triggerGroupId]')
    .option('--profile', 'Profile ID or name')
    .option('--url', 'Simulated request URL')
    .option('--method', 'Simulated HTTP method')
    .option('--headers', 'JSON request headers object')
    .option('--body', 'Raw request body')
    .option('--webhook-registration-payload', 'JSON webhook registration payload')
    .action((triggerGroupId: string | undefined, opts) =>
      printResult(() =>
        processTriggerGroupWebhook({
          integration: integration!,
          profile: opts.profile,
          triggerGroupId,
          url: opts.url,
          method: opts.method,
          headers: opts.headers,
          body: opts.body,
          webhookRegistrationPayload: opts.webhookRegistrationPayload
        })
      )
    );

  cli
    .command('auth list')
    .option('--profile', 'Profile ID or name')
    .action(opts =>
      printResult(() => listAuth({ integration: integration!, profile: opts.profile }))
    );

  cli
    .command('auth get [authMethodId]')
    .option('--profile', 'Profile ID or name')
    .action((authMethodId: string | undefined, opts) =>
      printResult(() =>
        getAuth({ integration: integration!, profile: opts.profile, authMethodId })
      )
    );

  cli
    .command('auth setup [authMethodId]')
    .option('--profile', 'Profile ID or name')
    .option('--input', 'JSON auth input object')
    .option('--oauth-credential', 'OAuth credential ID or name')
    .option('--client-id', 'OAuth client ID')
    .option('--client-secret', 'OAuth client secret')
    .option('--scopes', 'Comma-separated OAuth scopes')
    .option('--incremental', 'Extend an existing OAuth grant with the supplied scope batch')
    .action((authMethodId: string | undefined, opts) =>
      printResult(() =>
        setupAuth({
          integration: integration!,
          profile: opts.profile,
          authMethodId,
          input: opts.input,
          oauthCredential: opts.oauthCredential,
          clientId: opts.clientId,
          clientSecret: opts.clientSecret,
          scopes: opts.scopes,
          incremental: opts.incremental
        })
      )
    );

  cli
    .command('auth credentials list [authMethodId]')
    .action((authMethodId: string | undefined) =>
      printResult(() => listOAuthCredentials({ integration: integration!, authMethodId }))
    );

  cli
    .command('auth credentials add [authMethodId]')
    .option('--name', 'Credential name')
    .option('--client-id', 'OAuth client ID')
    .option('--client-secret', 'OAuth client secret')
    .action((authMethodId: string | undefined, opts) =>
      printResult(() =>
        addOAuthCredentials({
          integration: integration!,
          authMethodId,
          name: opts.name,
          clientId: opts.clientId,
          clientSecret: opts.clientSecret
        })
      )
    );

  cli
    .command('auth refresh [authMethodId]')
    .option('--profile', 'Profile ID or name')
    .action((authMethodId: string | undefined, opts) =>
      printResult(() =>
        refreshAuth({ integration: integration!, profile: opts.profile, authMethodId })
      )
    );

  cli
    .command('config get')
    .option('--profile', 'Profile ID or name')
    .action(opts =>
      printResult(() => getConfig({ integration: integration!, profile: opts.profile }))
    );

  cli
    .command('config set')
    .option('--profile', 'Profile ID or name')
    .option('--input', 'JSON config object')
    .action(opts =>
      printResult(() =>
        setConfig({ integration: integration!, profile: opts.profile, input: opts.input })
      )
    );

  cli
    .command('config schema')
    .option('--profile', 'Profile ID or name')
    .action(opts =>
      printResult(() => getConfigSchema({ integration: integration!, profile: opts.profile }))
    );

  cli
    .command('test')
    .option('--profile', 'Profile ID or name')
    .action(opts =>
      printResult(async () => {
        let separatorIndex = process.argv.indexOf('--');
        await runVitestWithProfile({
          integration: integration!,
          profile: opts.profile,
          vitestArgs: separatorIndex === -1 ? [] : process.argv.slice(separatorIndex + 1)
        });

        return { success: true };
      })
    );

  cli
    .command('repl')
    .option('--profile', 'Profile ID or name')
    .action(opts =>
      printResult(() => startRepl({ integration: integration!, profile: opts.profile }))
    );

  cli.parse([process.argv[0] ?? 'bun', process.argv[1] ?? 'slates', ...argv.slice(1)]);
}
