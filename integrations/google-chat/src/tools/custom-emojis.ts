import { Buffer } from 'node:buffer';
import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
import { resolveGoogleChatCustomEmojiName } from '../lib/resource-names';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';

export let GOOGLE_CHAT_CUSTOM_EMOJI_MAX_BYTES = 256 * 1024;

type GoogleChatCustomEmoji = {
  name?: string;
  uid?: string;
  emojiName?: string;
  temporaryImageUri?: string;
};

let customEmojiOutputSchema = z.object({
  customEmojiName: z
    .string()
    .describe('Custom emoji resource name, customEmojis/{customEmoji}'),
  uid: z.string().optional().describe('Stable unique key of the custom emoji'),
  emojiName: z
    .string()
    .optional()
    .describe('Emoji shortcode such as :team-logo:, unique within the organization'),
  temporaryImageUri: z
    .string()
    .optional()
    .describe('Temporary image URL valid for at least 10 minutes; not returned on create')
});

let mapCustomEmoji = (emoji: GoogleChatCustomEmoji) => {
  let customEmojiName = emoji.name?.trim();
  if (!customEmojiName) {
    throw googleChatValidationError(
      'Google Chat returned a custom emoji without its required resource name.'
    );
  }
  return {
    customEmojiName,
    uid: emoji.uid,
    emojiName: emoji.emojiName,
    temporaryImageUri: emoji.temporaryImageUri
  };
};

let customEmojiConstraints = [
  'Custom emoji are available only for Google Workspace accounts whose administrator has turned custom emoji on for the organization.'
];

let customEmojiInput = z
  .string()
  .trim()
  .min(1)
  .describe(
    'Custom emoji resource name (customEmojis/{id}), its :emoji-name: shortcode, or its ID. Call list_custom_emojis to discover emoji.'
  );

export let listCustomEmojis = SlateTool.create(spec, {
  name: 'List Custom Emojis',
  key: 'list_custom_emojis',
  description:
    "List the custom emoji visible to the signed-in user in their Google Workspace organization's Google Chat.",
  instructions: [
    'Set createdBy to "me" to list only emoji the signed-in user created, or "others" for the rest.'
  ],
  constraints: customEmojiConstraints,
  tags: {
    readOnly: true
  }
})
  .scopes(googleChatActionScopes.listCustomEmojis)
  .authMethods(googleChatActionAuthMethods.listCustomEmojis)
  .input(
    z.object({
      createdBy: z
        .enum(['me', 'others'])
        .optional()
        .describe('Filter by whether the signed-in user created the emoji'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum emoji per page (1-200, default 25)'),
      pageToken: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Token for the next page; reuse the same createdBy value')
    })
  )
  .output(
    z.object({
      customEmojis: z.array(customEmojiOutputSchema).describe('Custom emoji on this page'),
      nextPageToken: z.string().optional().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let filter =
      ctx.input.createdBy === 'me'
        ? 'creator("users/me")'
        : ctx.input.createdBy === 'others'
          ? 'NOT creator("users/me")'
          : undefined;
    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<{
      customEmojis?: GoogleChatCustomEmoji[];
      nextPageToken?: string;
    }>('customEmojis', {
      method: 'get',
      params: pickDefined({
        filter,
        pageSize: ctx.input.pageSize,
        pageToken: ctx.input.pageToken
      }),
      operation: 'list custom emojis'
    });
    let customEmojis = (response.customEmojis ?? []).map(mapCustomEmoji);

    return {
      output: {
        customEmojis,
        nextPageToken: response.nextPageToken || undefined
      },
      message: `Found **${customEmojis.length}** custom emoji.`
    };
  })
  .build();

export let getCustomEmoji = SlateTool.create(spec, {
  name: 'Get Custom Emoji',
  key: 'get_custom_emoji',
  description:
    'Get one Google Chat custom emoji by resource name or :shortcode:, including a temporary image URL.',
  constraints: customEmojiConstraints,
  tags: {
    readOnly: true
  }
})
  .scopes(googleChatActionScopes.getCustomEmoji)
  .authMethods(googleChatActionAuthMethods.getCustomEmoji)
  .input(z.object({ customEmoji: customEmojiInput }))
  .output(customEmojiOutputSchema)
  .handleInvocation(async ctx => {
    let name = resolveGoogleChatCustomEmojiName(ctx.input.customEmoji);
    let client = new GoogleChatClient(ctx.auth.token);
    let emoji = mapCustomEmoji(
      await client.request<GoogleChatCustomEmoji>(name, {
        method: 'get',
        operation: 'get custom emoji'
      })
    );

    return {
      output: emoji,
      message: `Retrieved custom emoji **${emoji.emojiName ?? emoji.customEmojiName}**.`
    };
  })
  .build();

let emojiNamePattern = /^:[a-z0-9]+(?:[-_][a-z0-9]+)*:$/;
let emojiFilenamePattern = /\.(png|jpe?g|gif)$/i;

let decodeEmojiImage = (value: string) => {
  let normalized = value.trim().replace(/\s/g, '');
  if (
    !normalized ||
    normalized.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
  ) {
    throw googleChatValidationError('imageBase64 must be valid base64-encoded image bytes.');
  }
  return Buffer.from(normalized, 'base64');
};

let manageCustomEmojiActions = ['create', 'delete'] as const;

export let manageCustomEmoji = SlateTool.create(spec, {
  name: 'Manage Custom Emoji',
  key: 'manage_custom_emoji',
  description:
    "Create a Google Chat custom emoji from an image, or delete one, in the signed-in user's Google Workspace organization.",
  instructions: [
    'Use **action** "create" with **emojiName** (for example :team-logo:), **filename**, and **imageBase64**.',
    'Use **action** "delete" with **customEmoji**. Users can delete only emoji they created unless an administrator made them an emoji manager.'
  ],
  constraints: [
    ...customEmojiConstraints,
    'Administrators can limit who may create custom emoji; users without permission receive a permission error.',
    'Images must be PNG, JPG, or GIF, under 256 KB, and square between 64 and 500 pixels.',
    'Deleting a custom emoji is irreversible.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleChatActionScopes.manageCustomEmoji)
  .authMethods(googleChatActionAuthMethods.manageCustomEmoji)
  .input(
    z.object({
      action: z.enum(manageCustomEmojiActions).describe('Custom emoji operation to perform'),
      customEmoji: customEmojiInput
        .optional()
        .describe(
          'Emoji to delete: customEmojis/{id}, :emoji-name:, or ID. Required for delete.'
        ),
      emojiName: z
        .string()
        .trim()
        .min(3)
        .optional()
        .describe(
          'Shortcode for create, wrapped in colons, lowercase letters, digits, and single hyphens or underscores, e.g. :team-logo:'
        ),
      filename: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Image filename for create, ending in .png, .jpg, or .gif'),
      imageBase64: z
        .string()
        .min(1)
        .optional()
        .describe('Base64-encoded image bytes; required for create')
    })
  )
  .output(
    z.object({
      action: z.enum(manageCustomEmojiActions).describe('Completed operation'),
      customEmojiName: z.string().describe('Custom emoji resource name'),
      customEmoji: customEmojiOutputSchema
        .optional()
        .describe('Created custom emoji; returned for create'),
      deleted: z.boolean().optional().describe('True when the custom emoji was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let { action, emojiName, filename, imageBase64 } = ctx.input;
    let client = new GoogleChatClient(ctx.auth.token);

    if (action === 'delete') {
      if ([emojiName, filename, imageBase64].some(value => value !== undefined)) {
        throw googleChatValidationError(
          'emojiName, filename, and imageBase64 are supported only when action is create.'
        );
      }
      let name = resolveGoogleChatCustomEmojiName(ctx.input.customEmoji);
      await client.request<Record<string, never>>(name, {
        method: 'delete',
        operation: 'delete custom emoji'
      });
      return {
        output: { action, customEmojiName: name, deleted: true },
        message: `Deleted custom emoji \`${name}\`.`
      };
    }

    if (ctx.input.customEmoji !== undefined) {
      throw googleChatValidationError('customEmoji is supported only when action is delete.');
    }
    if (!emojiName || !emojiNamePattern.test(emojiName)) {
      throw googleChatValidationError(
        'emojiName is required for create and must look like :valid-emoji-name: (lowercase letters, digits, and single hyphens or underscores between words).'
      );
    }
    if (!filename || !emojiFilenamePattern.test(filename)) {
      throw googleChatValidationError(
        'filename is required for create and must end in .png, .jpg, or .gif.'
      );
    }
    if (imageBase64 === undefined) {
      throw googleChatValidationError('imageBase64 is required when action is create.');
    }

    let bytes = decodeEmojiImage(imageBase64);
    if (bytes.byteLength === 0) {
      throw googleChatValidationError('The custom emoji image is empty.');
    }
    if (bytes.byteLength >= GOOGLE_CHAT_CUSTOM_EMOJI_MAX_BYTES) {
      throw googleChatValidationError('Custom emoji images must be under 256 KB.');
    }

    let created = mapCustomEmoji(
      await client.request<GoogleChatCustomEmoji>('customEmojis', {
        method: 'post',
        data: {
          emojiName,
          payload: {
            fileContent: bytes.toString('base64'),
            filename
          }
        },
        operation: 'create custom emoji'
      })
    );

    return {
      output: { action, customEmojiName: created.customEmojiName, customEmoji: created },
      message: `Created custom emoji **${created.emojiName ?? emojiName}** (\`${created.customEmojiName}\`).`
    };
  })
  .build();
