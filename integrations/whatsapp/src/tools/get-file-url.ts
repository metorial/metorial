import { getFileUrlTool } from 'slates';
import { createWhatsAppChatClient } from '../chat/lib/client';
import { parseWhatsAppFileReference, resolveWhatsAppMediaUrl } from '../chat/lib/media';
import { spec } from '../spec';

/** Reissues the five-minute WhatsApp media URL from the durable media ID. */
export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let action = 'metorial$getFileUrl';
  let { mediaId } = parseWhatsAppFileReference(ctx.input.reference, action);
  let { url, expiresAt } = await resolveWhatsAppMediaUrl(
    createWhatsAppChatClient(ctx),
    mediaId,
    action
  );
  return { url, expiresAt, headers: { Authorization: `Bearer ${ctx.auth.token}` } };
});
