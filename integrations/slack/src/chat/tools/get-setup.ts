import { getSetup as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';

let yaml = (value: string) => JSON.stringify(value);

export let chatGetSetup = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let appName = ctx.input.appName ?? 'Slates Chat App';
    let botName = ctx.input.botName ?? appName;
    let description =
      ctx.input.description ?? 'A Slack app powered by the Slates chat adapter';
    let webhookUrl = ctx.input.webhookUrl ?? 'https://YOUR_HOST/slack/webhook';
    let commands = ctx.input.commands ?? [];
    let commandYaml = commands
      .map(
        command =>
          `    - command: /${command.name.replace(/^\//, '')}\n      url: ${yaml(webhookUrl)}\n      description: ${yaml(command.description ?? description)}\n      usage_hint: ${yaml(command.usage ?? '')}\n      should_escape: false`
      )
      .join('\n');
    let manifest = `display_information:
  name: ${yaml(appName)}
  description: ${yaml(description)}
features:
  bot_user:
    display_name: ${yaml(botName)}
    always_online: true
  agent_view:
    agent_description: ${yaml(description)}
${commands.length ? `  slash_commands:\n${commandYaml}\n` : ''}oauth_config:
  redirect_urls:
${(ctx.input.redirectUris ?? []).map(uri => `    - ${yaml(uri)}`).join('\n') || '    - https://YOUR_HOST/oauth/callback'}
  scopes:
    bot:
      - app_mentions:read
      - assistant:write
      - channels:history
      - channels:read
      - chat:write
      - chat:write.public
      - emoji:read
      - files:read
      - files:write
      - groups:history
      - groups:read
      - im:history
      - im:read
      - im:write
      - mpim:history
      - mpim:read
      - mpim:write
      - reactions:read
      - reactions:write
      - team:read
      - users:read
      - users:read.email
settings:
  event_subscriptions:
    request_url: ${yaml(webhookUrl)}
    bot_events:
      - app_mention
      - member_joined_channel
      - member_left_channel
      - message.channels
      - message.groups
      - message.im
      - message.mpim
      - reaction_added
      - reaction_removed
  interactivity:
    is_enabled: ${ctx.input.interactivity === false ? 'false' : 'true'}
    request_url: ${yaml(webhookUrl)}
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false
`;
    let setupMarkdown = `# ${appName} Slack setup

1. Open Slack's app management console and create an app **from a manifest**.
2. Paste the generated manifest below. Replace placeholder URLs if no webhook URL or redirect URI was supplied.
3. Install the app to the workspace and connect the resulting bot OAuth token to Slates.
4. Copy the app's **Signing Secret** into the Slack integration configuration so event, command, and interaction requests are verified.

Slack accepts one Events API request URL and one interactivity request URL per app. Point both at the Slates callback URL that routes this chat adapter's webhook triggers.`;
    return {
      output: {
        title: `${appName} Slack setup`,
        setupMarkdown,
        manifest: {
          type: 'Slack App Manifest',
          value: manifest,
          format: 'yaml' as const,
          filename: 'slack-manifest.yaml'
        },
        links: [
          { label: 'Create a Slack app', url: 'https://api.slack.com/apps' },
          { label: 'Slack app manifests', url: 'https://api.slack.com/reference/manifests' }
        ],
        warnings: [
          'Slack slash commands are configured statically in the app manifest and cannot be listed or autocompleted through the Slack Web API.',
          'Typing status requires Slack Agent/Assistant features and the assistant:write scope.',
          'Workspace-wide message search requires a user OAuth connection with search:read.'
        ]
      },
      message: 'Generated Slack chat adapter setup instructions.'
    };
  })
  .build();
