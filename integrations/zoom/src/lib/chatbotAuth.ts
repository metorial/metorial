import { createAxios } from '@slates/provider';
import { z } from 'zod';
import { zoomOAuthError, zoomServiceError } from './errors';

let authAxios = createAxios({
  baseURL: 'https://zoom.us'
});

export let ZOOM_DEFAULT_API_URL = 'https://api.zoom.us';
export let ZOOM_CHATBOT_SCOPE = 'imchat:bot';

export let chatbotAuthInputSchema = z.object({
  clientId: z
    .string()
    .trim()
    .min(1)
    .describe('Client ID of the Zoom General app that has the chatbot enabled'),
  clientSecret: z.string().min(1).describe('Client Secret of the same Zoom General app'),
  botJid: z
    .string()
    .trim()
    .min(1)
    .describe(
      'Bot JID, shown in the app build flow under Features > Surface > Zoom Chat Subscription'
    ),
  accountId: z
    .string()
    .trim()
    .min(1)
    .describe(
      'Zoom account ID the chatbot is installed in; messages are sent to this account'
    ),
  userJid: z
    .string()
    .optional()
    .describe(
      'For user-managed apps only: JID of the user who authorized the app. Leave empty for admin-managed apps.'
    )
});

export type ZoomChatbotAuthInput = z.infer<typeof chatbotAuthInputSchema>;

let tokenResponseSchema = z
  .object({
    access_token: z.string().min(1),
    expires_in: z.number().optional(),
    scope: z.string().optional(),
    api_url: z.string().optional()
  })
  .loose();

/**
 * Only accept a Zoom-operated HTTPS API host from the token response, so a
 * tampered response cannot redirect bearer tokens to an arbitrary server.
 */
let normalizeApiUrl = (value: string | undefined) => {
  if (!value) return ZOOM_DEFAULT_API_URL;

  try {
    let url = new URL(value);
    let host = url.hostname.toLowerCase();
    let trusted =
      host === 'zoom.us' ||
      host.endsWith('.zoom.us') ||
      host === 'zoomgov.com' ||
      host.endsWith('.zoomgov.com');
    if (url.protocol === 'https:' && trusted) return `https://${url.host}`;
  } catch {}

  return ZOOM_DEFAULT_API_URL;
};

/**
 * Requests a chatbot token with the client credentials grant.
 * https://developers.zoom.us/docs/chat/installation-and-authentication/#request-chatbot-token
 * Chatbot tokens expire after one hour; a new token is requested the same way
 * (there is no separate refresh grant).
 */
export let exchangeChatbotToken = async (input: ZoomChatbotAuthInput) => {
  let credentials = btoa(`${input.clientId}:${input.clientSecret}`);

  let response: { data: unknown };
  try {
    response = await authAxios.post('/oauth/token', undefined, {
      params: { grant_type: 'client_credentials' },
      headers: { Authorization: `Basic ${credentials}` }
    });
  } catch (error) {
    throw zoomOAuthError(error, 'chatbot token request');
  }

  let parsed = tokenResponseSchema.safeParse(response.data);
  if (!parsed.success) {
    throw zoomServiceError('Zoom chatbot token response did not include an access token.');
  }

  let data = parsed.data;
  if (data.scope && !data.scope.split(/[\s,]+/).includes(ZOOM_CHATBOT_SCOPE)) {
    throw zoomServiceError(
      `Zoom issued a token without the ${ZOOM_CHATBOT_SCOPE} scope. Enable Zoom Chat Subscription (chatbot) on this General app and use its Client ID and Client Secret.`
    );
  }

  let expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;

  return {
    token: data.access_token,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    accountId: input.accountId.trim(),
    botJid: input.botJid.trim(),
    chatbotUserJid: input.userJid?.trim() || undefined,
    apiUrl: normalizeApiUrl(data.api_url)
  };
};
