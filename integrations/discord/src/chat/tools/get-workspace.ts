import { getWorkspace as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { runDiscordChatAction } from '../lib/context';
import { mapWorkspace } from '../lib/mappers';

export let chatGetWorkspace = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let output = await runDiscordChatAction(
      ctx,
      { action: contract.key, notFound: 'chat.workspace.not_found' },
      async client => {
        let raw = await client.getGuild(ctx.input.workspaceId);
        return { workspace: mapWorkspace(raw), raw };
      }
    );

    return { output, message: `Retrieved Discord server \`${output.workspace.id}\`.` };
  })
  .build();
