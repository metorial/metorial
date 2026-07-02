import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let hasExactlyOneMediaSource = (value: { link?: string; mediaId?: string }) => {
  let hasLink = typeof value.link === 'string' && value.link.length > 0;
  let hasMediaId = typeof value.mediaId === 'string' && value.mediaId.length > 0;
  return hasLink !== hasMediaId;
};

let mediaSourceFields = {
  link: z.string().min(1).optional().describe('Public URL of the media file'),
  mediaId: z
    .string()
    .min(1)
    .optional()
    .describe('WhatsApp media ID of a previously uploaded file')
};

let mediaSourceSchema = z
  .object(mediaSourceFields)
  .refine(hasExactlyOneMediaSource, {
    message: 'Provide exactly one of link or mediaId'
  })
  .describe('Provide exactly one source: a public URL via link or a WhatsApp media ID');

let captionedMediaSourceSchema = z
  .object({
    ...mediaSourceFields,
    caption: z.string().optional().describe('Media caption')
  })
  .refine(hasExactlyOneMediaSource, {
    message: 'Provide exactly one of link or mediaId'
  });

let documentMediaSourceSchema = z
  .object({
    ...mediaSourceFields,
    filename: z.string().optional().describe('Filename to display to recipient'),
    caption: z.string().optional().describe('Document caption')
  })
  .refine(hasExactlyOneMediaSource, {
    message: 'Provide exactly one of link or mediaId'
  });

let contactSchema = z.object({
  name: z.object({
    formattedName: z.string().describe('Full formatted name'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    middleName: z.string().optional(),
    prefix: z.string().optional(),
    suffix: z.string().optional()
  }),
  phones: z
    .array(
      z.object({
        phone: z.string().optional(),
        type: z.enum(['CELL', 'MAIN', 'IPHONE', 'HOME', 'WORK']).optional(),
        waId: z.string().optional()
      })
    )
    .optional(),
  emails: z
    .array(
      z.object({
        email: z.string().optional(),
        type: z.enum(['HOME', 'WORK']).optional()
      })
    )
    .optional(),
  addresses: z
    .array(
      z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        country: z.string().optional(),
        countryCode: z.string().optional(),
        type: z.enum(['HOME', 'WORK']).optional()
      })
    )
    .optional(),
  org: z
    .object({
      company: z.string().optional(),
      department: z.string().optional(),
      title: z.string().optional()
    })
    .optional(),
  birthday: z.string().optional().describe('Birthday in YYYY-MM-DD format')
});

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a WhatsApp message to a recipient. Supports multiple message types: **text**, **image**, **video**, **audio**, **document**, **location**, **contacts**, **sticker**, and **reaction**.
For text messages within the 24-hour customer service window, use this tool. For messages outside the window, use the Send Template Message tool instead.`,
  instructions: [
    'The recipient phone number must include the country code (e.g. +15551234567 or 15551234567)',
    'For media messages, provide either a public URL (link) or a previously uploaded media ID, not both',
    'Stickers must be WEBP format, 512x512px. Static: max 100KB, animated: max 500KB',
    'Reaction messages require the original message ID to react to'
  ],
  constraints: [
    'Free-form messages can only be sent within the 24-hour customer service window after the customer messages you',
    'Maximum 80 messages per second per phone number'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: z.string().describe('Recipient phone number with country code (e.g. 15551234567)'),
      type: z
        .enum([
          'text',
          'image',
          'video',
          'audio',
          'document',
          'location',
          'contacts',
          'sticker',
          'reaction'
        ])
        .describe('Type of message to send'),
      text: z
        .object({
          body: z.string().describe('Message text content'),
          previewUrl: z
            .boolean()
            .optional()
            .describe('Whether to show a URL preview for links in the message')
        })
        .optional()
        .describe('Required when type is "text"'),
      image: captionedMediaSourceSchema.optional().describe('Required when type is "image"'),
      video: captionedMediaSourceSchema.optional().describe('Required when type is "video"'),
      audio: z
        .object({
          ...mediaSourceFields,
          voice: z
            .boolean()
            .optional()
            .describe('Whether to send supported audio as a WhatsApp voice message')
        })
        .refine(hasExactlyOneMediaSource, {
          message: 'Provide exactly one of link or mediaId'
        })
        .optional()
        .describe('Required when type is "audio"'),
      document: documentMediaSourceSchema
        .optional()
        .describe('Required when type is "document"'),
      location: z
        .object({
          latitude: z.number().describe('Latitude coordinate'),
          longitude: z.number().describe('Longitude coordinate'),
          name: z.string().optional().describe('Location name'),
          address: z.string().optional().describe('Location address')
        })
        .optional()
        .describe('Required when type is "location"'),
      contacts: z.array(contactSchema).optional().describe('Required when type is "contacts"'),
      sticker: mediaSourceSchema
        .optional()
        .describe('Required when type is "sticker". Must be WEBP format, 512x512px'),
      reaction: z
        .object({
          messageId: z.string().describe('ID of the message to react to'),
          emoji: z
            .string()
            .describe(
              'Emoji to react with (e.g. \ud83d\udc4d). Send empty string to remove reaction'
            )
        })
        .optional()
        .describe('Required when type is "reaction"')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the sent message'),
      recipientPhone: z.string().optional().describe('Recipient WhatsApp phone number'),
      recipientWaId: z.string().optional().describe('Recipient WhatsApp ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      phoneNumberId: ctx.config.phoneNumberId,
      wabaId: ctx.config.wabaId,
      apiVersion: ctx.config.apiVersion
    });

    let result: any;
    let { type, to } = ctx.input;

    switch (type) {
      case 'text': {
        if (!ctx.input.text) throw new Error('text field is required for text messages');
        result = await client.sendTextMessage(
          to,
          ctx.input.text.body,
          ctx.input.text.previewUrl
        );
        break;
      }
      case 'image': {
        if (!ctx.input.image) throw new Error('image field is required for image messages');
        result = await client.sendImageMessage(to, ctx.input.image);
        break;
      }
      case 'video': {
        if (!ctx.input.video) throw new Error('video field is required for video messages');
        result = await client.sendVideoMessage(to, ctx.input.video);
        break;
      }
      case 'audio': {
        if (!ctx.input.audio) throw new Error('audio field is required for audio messages');
        result = await client.sendAudioMessage(to, ctx.input.audio);
        break;
      }
      case 'document': {
        if (!ctx.input.document)
          throw new Error('document field is required for document messages');
        result = await client.sendDocumentMessage(to, ctx.input.document);
        break;
      }
      case 'location': {
        if (!ctx.input.location)
          throw new Error('location field is required for location messages');
        result = await client.sendLocationMessage(to, ctx.input.location);
        break;
      }
      case 'contacts': {
        if (!ctx.input.contacts)
          throw new Error('contacts field is required for contacts messages');
        let formattedContacts = ctx.input.contacts.map(c => ({
          name: {
            formatted_name: c.name.formattedName,
            first_name: c.name.firstName,
            last_name: c.name.lastName,
            middle_name: c.name.middleName,
            prefix: c.name.prefix,
            suffix: c.name.suffix
          },
          phones: c.phones?.map(p => ({
            phone: p.phone,
            type: p.type,
            wa_id: p.waId
          })),
          emails: c.emails?.map(e => ({
            email: e.email,
            type: e.type
          })),
          addresses: c.addresses?.map(a => ({
            street: a.street,
            city: a.city,
            state: a.state,
            zip: a.zip,
            country: a.country,
            country_code: a.countryCode,
            type: a.type
          })),
          org: c.org
            ? {
                company: c.org.company,
                department: c.org.department,
                title: c.org.title
              }
            : undefined,
          birthday: c.birthday
        }));
        result = await client.sendContactsMessage(to, formattedContacts);
        break;
      }
      case 'sticker': {
        if (!ctx.input.sticker)
          throw new Error('sticker field is required for sticker messages');
        result = await client.sendStickerMessage(to, ctx.input.sticker);
        break;
      }
      case 'reaction': {
        if (!ctx.input.reaction)
          throw new Error('reaction field is required for reaction messages');
        result = await client.sendReactionMessage(
          to,
          ctx.input.reaction.messageId,
          ctx.input.reaction.emoji
        );
        break;
      }
    }

    let messageId = result?.messages?.[0]?.id ?? '';
    let contact = result?.contacts?.[0];

    return {
      output: {
        messageId,
        recipientPhone: contact?.input,
        recipientWaId: contact?.wa_id
      },
      message: `Sent **${type}** message to ${to}. Message ID: \`${messageId}\``
    };
  })
  .build();
