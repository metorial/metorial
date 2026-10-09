import {
  ChatErrors,
  getAuthenticatedUser as getAuthenticatedUserContract,
  getWorkspace as getWorkspaceContract,
  listWorkspaces as listWorkspacesContract
} from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createWhatsAppChatClient } from '../lib/client';
import { withWhatsAppChatErrors } from '../lib/errors';
import { mapWhatsAppBusinessAuthor, mapWhatsAppWorkspace } from '../lib/mappers';

/**
 * A connection represents one business phone number, exposed as a single
 * workspace whose id is the phone number ID.
 */
export let chatListWorkspaces = listWorkspacesContract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = listWorkspacesContract.key;
    let client = createWhatsAppChatClient(ctx);
    let raw = await withWhatsAppChatErrors({ action, workspaceId: client.phoneNumberId }, () =>
      client.getPhoneNumber()
    );
    let workspace = mapWhatsAppWorkspace(client.phoneNumberId, raw);
    let query = ctx.input.query?.trim().toLowerCase();
    let matches =
      !query ||
      [workspace.name, raw.display_phone_number, workspace.id].some(value =>
        value?.toLowerCase().includes(query)
      );
    let workspaces = matches ? [workspace] : [];

    return {
      output: { workspaces, raw },
      message: `Retrieved ${workspaces.length} WhatsApp business phone number.`
    };
  })
  .build();

export let chatGetWorkspace = getWorkspaceContract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = getWorkspaceContract.key;
    let client = createWhatsAppChatClient(ctx);
    if (ctx.input.workspaceId !== client.phoneNumberId) {
      throw ChatErrors.workspaceNotFound({
        action,
        workspaceId: ctx.input.workspaceId,
        message:
          'This connection only serves its configured WhatsApp business phone number. Use the workspace returned by the workspace list action.'
      });
    }

    let raw = await withWhatsAppChatErrors(
      { action, workspaceId: ctx.input.workspaceId },
      () => client.getPhoneNumber()
    );
    let workspace = mapWhatsAppWorkspace(client.phoneNumberId, raw);

    return {
      output: { workspace, raw },
      message: `Retrieved WhatsApp business phone number **${workspace.name ?? workspace.id}**.`
    };
  })
  .build();

export let chatGetAuthenticatedUser = getAuthenticatedUserContract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = getAuthenticatedUserContract.key;
    let client = createWhatsAppChatClient(ctx);
    let raw = await withWhatsAppChatErrors({ action, workspaceId: client.phoneNumberId }, () =>
      client.getPhoneNumber()
    );
    let author = mapWhatsAppBusinessAuthor(client.phoneNumberId, raw);
    let workspace = mapWhatsAppWorkspace(client.phoneNumberId, raw);

    return {
      output: { author, workspace, raw },
      message: `Connected as WhatsApp business phone number **${author.fullName}**.`
    };
  })
  .build();
