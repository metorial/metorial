import { ChatErrors } from '@slates/adapter-chat';
import { getFileUrlTool } from '@slates/provider';
import { spec } from '../../spec';
import { createMessengerChatClient } from '../lib/client';
import { messengerFileReferenceSchema, reissueMessengerFileUrl } from '../lib/files';

let ACTION = 'metorial$getFileUrl';

export let messengerGetFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = messengerFileReferenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw ChatErrors.inputInvalid({
      action: ACTION,
      message: 'The Messenger file reference is invalid. Download the file again.'
    });
  }
  return reissueMessengerFileUrl(
    createMessengerChatClient(ctx, ACTION),
    reference.data,
    ACTION
  );
});
