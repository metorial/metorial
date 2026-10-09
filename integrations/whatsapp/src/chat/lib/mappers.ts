import type {
  AttachmentRef,
  Author,
  Channel,
  ChatBody,
  ChatPart,
  Message,
  Workspace
} from '@slates/adapter-chat';
import type { WhatsAppContact, WhatsAppMessageEvent } from '../../triggers/event-schemas';
import type { WhatsAppPhoneNumberInfo, WhatsAppRecipient } from './client';

/**
 * Identity model:
 * - one synthetic workspace per connection = the configured business phone number
 *   (id = phone number ID);
 * - one `dm` channel per customer, keyed by the customer's WhatsApp ID (`wa_id`),
 *   or by the business-scoped user ID when Meta omits the phone number for a user
 *   with a WhatsApp username.
 * https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids
 */

// BSUIDs: ISO country code, a period, optional `ENT.` (parent BSUID), then alphanumerics.
let BSUID_PATTERN = /^[A-Z]{2}\.(?:ENT\.)?[A-Za-z0-9]{1,128}$/;
let PHONE_PATTERN = /^\+?[0-9]{5,20}$/;

export let isWhatsAppBsuid = (value: string) => BSUID_PATTERN.test(value);

export let isWhatsAppChannelId = (value: string) =>
  PHONE_PATTERN.test(value) || isWhatsAppBsuid(value);

export let toWhatsAppRecipient = (channelId: string): WhatsAppRecipient =>
  isWhatsAppBsuid(channelId) ? { recipient: channelId } : { to: channelId };

export let WHATSAPP_EMPTY_TEXT_PART: ChatPart = { type: 'text', content: '' };

export let mapWhatsAppWorkspace = (
  phoneNumberId: string,
  info?: WhatsAppPhoneNumberInfo
): Workspace => ({
  id: phoneNumberId,
  name: info?.verified_name || info?.display_phone_number || undefined,
  raw: info
});

export let mapWhatsAppBusinessAuthor = (
  phoneNumberId: string,
  info?: WhatsAppPhoneNumberInfo,
  displayPhoneNumber?: string
): Author => {
  let phone = info?.display_phone_number || displayPhoneNumber;
  return {
    userId: phoneNumberId,
    userName: phone || phoneNumberId,
    fullName: info?.verified_name || phone || phoneNumberId,
    type: 'app',
    providerType: 'whatsapp_business_phone_number',
    isMe: true,
    raw:
      info ?? (displayPhoneNumber ? { display_phone_number: displayPhoneNumber } : undefined)
  };
};

export let mapWhatsAppCustomerAuthor = (
  channelId: string,
  contact?: WhatsAppContact
): Author => {
  let profileName = contact?.profile?.name || undefined;
  let username = contact?.profile?.username || undefined;
  return {
    userId: channelId,
    userName: username ?? channelId,
    fullName: profileName ?? username ?? channelId,
    type: 'user',
    providerType: 'whatsapp_user',
    isMe: false,
    raw: contact
  };
};

export let mapWhatsAppChannel = (input: {
  channelId: string;
  workspaceId: string;
  contact?: WhatsAppContact;
  includeRecipient?: boolean;
}): Channel => {
  let recipient = input.includeRecipient
    ? mapWhatsAppCustomerAuthor(input.channelId, input.contact)
    : undefined;
  return {
    id: input.channelId,
    workspaceId: input.workspaceId,
    type: 'dm',
    providerType: 'whatsapp_conversation',
    name: input.contact?.profile?.name || input.contact?.profile?.username || undefined,
    hasAccess: true,
    recipient,
    raw: input.contact
      ? { contact: input.contact }
      : { channelId: input.channelId, derivedFrom: 'customer_id' }
  };
};

/** The conversation key for an inbound message: phone-based WhatsApp ID first, then BSUID. */
export let getWhatsAppSenderChannelId = (
  event: Pick<WhatsAppMessageEvent, 'message' | 'contact'>
) =>
  event.contact?.wa_id ||
  event.message.from ||
  event.contact?.user_id ||
  event.message.from_user_id ||
  undefined;

export let toIsoTimestamp = (timestamp: string | null | undefined) => {
  let seconds = Number(timestamp);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : new Date().toISOString();
};

type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'sticker';

let MEDIA_ATTACHMENT_TYPES: Record<MediaKind, AttachmentRef['type']> = {
  image: 'image',
  sticker: 'image',
  video: 'video',
  audio: 'audio',
  document: 'file'
};

export let mapWhatsAppMediaAttachment = (
  kind: MediaKind,
  media: Record<string, any>,
  extra: Partial<AttachmentRef> = {}
): AttachmentRef => {
  let mediaId = typeof media.id === 'string' ? media.id : undefined;
  let { url: _url, ...raw } = media;
  return {
    type: MEDIA_ATTACHMENT_TYPES[kind],
    id: mediaId,
    name: typeof media.filename === 'string' ? media.filename : undefined,
    mimeType: typeof media.mime_type === 'string' ? media.mime_type : undefined,
    providerFileReference: mediaId ? { mediaId } : undefined,
    status: 'complete',
    raw: { ...raw, kind },
    ...extra
  };
};

let text = (content: string): ChatPart => ({ type: 'text', content });

let field = (label: string, value: unknown) =>
  value === undefined || value === null || value === ''
    ? []
    : [{ type: 'field' as const, label, value: String(value) }];

let mapLocationParts = (location: Record<string, any>): ChatPart[] => {
  let fields = [
    ...field('Name', location.name),
    ...field('Address', location.address),
    ...field('Latitude', location.latitude),
    ...field('Longitude', location.longitude)
  ];
  let parts: ChatPart[] = [];
  if (fields.length > 0) parts.push({ type: 'fields', children: fields });
  if (typeof location.url === 'string' && location.url) {
    parts.push({ type: 'link', url: location.url, label: location.name || location.url });
  }
  return parts.length > 0 ? parts : [WHATSAPP_EMPTY_TEXT_PART];
};

let mapContactsParts = (contacts: unknown): ChatPart[] => {
  let list = Array.isArray(contacts) ? (contacts as Record<string, any>[]) : [];
  let parts: ChatPart[] = [];
  for (let contact of list) {
    let fields = [
      ...field('Name', contact.name?.formatted_name ?? contact.name?.first_name),
      ...field('Organization', contact.org?.company),
      ...(Array.isArray(contact.phones)
        ? contact.phones.flatMap((phone: Record<string, any>) => field('Phone', phone.phone))
        : []),
      ...(Array.isArray(contact.emails)
        ? contact.emails.flatMap((email: Record<string, any>) => field('Email', email.email))
        : [])
    ];
    if (fields.length > 0) parts.push({ type: 'fields', children: fields });
  }
  return parts.length > 0 ? parts : [WHATSAPP_EMPTY_TEXT_PART];
};

let mapInteractiveParts = (interactive: Record<string, any> | undefined): ChatPart[] => {
  let reply = interactive?.button_reply ?? interactive?.list_reply;
  if (reply && typeof reply.title === 'string') {
    let parts: ChatPart[] = [text(reply.title)];
    if (typeof reply.description === 'string' && reply.description) {
      parts.push({ type: 'text', content: reply.description, style: 'muted' });
    }
    return parts;
  }

  let flowReply = interactive?.nfm_reply;
  if (flowReply) {
    return [text(typeof flowReply.body === 'string' && flowReply.body ? flowReply.body : '')];
  }

  return [WHATSAPP_EMPTY_TEXT_PART];
};

let mapOrderParts = (order: Record<string, any> | undefined): ChatPart[] => {
  let items = Array.isArray(order?.product_items) ? order.product_items : [];
  let parts: ChatPart[] = [];
  if (typeof order?.text === 'string' && order.text) parts.push(text(order.text));
  if (items.length > 0) {
    parts.push({
      type: 'table',
      headers: ['Product', 'Quantity', 'Price', 'Currency'],
      rows: items.map((item: Record<string, any>) => [
        String(item.product_retailer_id ?? ''),
        String(item.quantity ?? ''),
        String(item.item_price ?? ''),
        String(item.currency ?? '')
      ])
    });
  }
  return parts.length > 0 ? parts : [WHATSAPP_EMPTY_TEXT_PART];
};

/** Normalized body for a supported inbound message type. */
export let mapWhatsAppInboundBody = (message: Record<string, any>): ChatBody => {
  switch (message.type) {
    case 'text':
      return { parts: [text(String(message.text?.body ?? ''))] };
    case 'image':
    case 'video':
    case 'audio':
    case 'document':
    case 'sticker': {
      let media = (message[message.type] ?? {}) as Record<string, any>;
      let caption = typeof media.caption === 'string' ? media.caption : '';
      return {
        parts: [caption ? text(caption) : WHATSAPP_EMPTY_TEXT_PART],
        attachments: [mapWhatsAppMediaAttachment(message.type, media)]
      };
    }
    case 'location':
      return { parts: mapLocationParts(message.location ?? {}) };
    case 'contacts':
      return { parts: mapContactsParts(message.contacts) };
    case 'interactive':
      return { parts: mapInteractiveParts(message.interactive) };
    case 'button':
      return { parts: [text(String(message.button?.text ?? message.button?.payload ?? ''))] };
    case 'order':
      return { parts: mapOrderParts(message.order) };
    default:
      return { parts: [WHATSAPP_EMPTY_TEXT_PART] };
  }
};

export let mapWhatsAppInboundMessage = (
  event: WhatsAppMessageEvent
): {
  message: Message;
  channel: Channel;
} => {
  let channelId = getWhatsAppSenderChannelId(event) ?? '';
  let raw = event.message as Record<string, any>;
  let channel = mapWhatsAppChannel({
    channelId,
    workspaceId: event.phoneNumberId,
    contact: event.contact,
    includeRecipient: true
  });
  let contextId = typeof raw.context?.id === 'string' ? raw.context.id : undefined;

  return {
    channel,
    message: {
      id: raw.id,
      channelId,
      author: mapWhatsAppCustomerAuthor(channelId, event.contact),
      body: mapWhatsAppInboundBody(raw),
      providerType: raw.type,
      metadata: { sentAt: toIsoTimestamp(raw.timestamp), edited: false },
      ...(contextId ? { reply: { id: contextId } } : {}),
      raw
    }
  };
};
