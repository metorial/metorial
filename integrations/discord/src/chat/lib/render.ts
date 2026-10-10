import {
  type CardPart,
  type ChatBody,
  ChatErrors,
  type ChatPart,
  cardToAltText,
  chartToAltText,
  tablePartToAltText
} from '@slates/adapter-chat';
import type { DiscordMessagePayload } from './client';

// https://docs.discord.com/developers/resources/message#create-message
// https://docs.discord.com/developers/resources/message#embed-object-embed-limits
export let DISCORD_LIMITS = {
  content: 2000,
  embeds: 10,
  embedTitle: 256,
  embedDescription: 4096,
  embedFields: 25,
  fieldName: 256,
  fieldValue: 1024,
  embedTotal: 6000
};

let DIVIDER = '\u2500'.repeat(24);
// Discord rejects empty embed field names/values; a zero-width space keeps the slot.
let EMPTY_FIELD = '\u200b';

export let escapeDiscordMarkdown = (text: string) =>
  text.replace(/([\\*_~`|>])/g, '\\$1').replace(/^(#{1,3} |-# )/gm, '\\$1');

interface DiscordEmbed {
  title?: string;
  description?: string;
  image?: { url: string };
  fields?: { name: string; value: string; inline?: boolean }[];
}

let codeBlock = (text: string) => `\`\`\`\n${text.replace(/```/g, '`\u200b``')}\n\`\`\``;

let renderInline = (part: ChatPart): string => {
  switch (part.type) {
    case 'markdown':
      return part.markdown;
    case 'text': {
      let text = escapeDiscordMarkdown(part.content);
      if (!text) return '';
      if (part.style === 'bold') return `**${text}**`;
      if (part.style === 'muted') {
        return text
          .split('\n')
          .map(line => `-# ${line}`)
          .join('\n');
      }
      return text;
    }
    case 'image':
      return part.alt ? `[${escapeDiscordMarkdown(part.alt)}](${part.url})` : part.url;
    case 'divider':
      return DIVIDER;
    case 'link':
      return `[${escapeDiscordMarkdown(part.label)}](${part.url})`;
    case 'fields':
      return part.children
        .map(field => `**${escapeDiscordMarkdown(field.label)}:** ${field.value}`)
        .join('\n');
    case 'table':
      return codeBlock(tablePartToAltText(part));
    case 'chart':
      return codeBlock(chartToAltText(part));
    case 'section':
      return part.children.map(renderInline).filter(Boolean).join('\n');
    case 'card':
      return cardToAltText(part);
  }
};

let renderCard = (card: CardPart): DiscordEmbed => {
  let lines: string[] = [];
  let fields: NonNullable<DiscordEmbed['fields']> = [];
  let image = card.imageUrl;

  if (card.subtitle) lines.push(`*${escapeDiscordMarkdown(card.subtitle)}*`);

  for (let child of card.children) {
    if (child.type === 'fields') {
      for (let field of child.children) {
        fields.push({
          name: field.label || EMPTY_FIELD,
          value: field.value || EMPTY_FIELD,
          inline: true
        });
      }
      continue;
    }

    if (child.type === 'image' && !image) {
      image = child.url;
      continue;
    }

    let text = renderInline(child);
    if (text) lines.push(text);
  }

  let description = lines.join('\n\n');
  return {
    ...(card.title ? { title: card.title } : {}),
    ...(description ? { description } : {}),
    ...(image ? { image: { url: image } } : {}),
    ...(fields.length > 0 ? { fields } : {})
  };
};

let collect = (parts: ChatPart[], lines: string[], embeds: DiscordEmbed[]) => {
  for (let part of parts) {
    if (part.type === 'card') {
      embeds.push(renderCard(part));
    } else if (part.type === 'image') {
      embeds.push({ image: { url: part.url } });
    } else if (part.type === 'section') {
      collect(part.children, lines, embeds);
    } else {
      let text = renderInline(part);
      if (text) lines.push(text);
    }
  }
};

let tooLong = (action: string, message: string, max: number, actual: number) =>
  ChatErrors.contentTooLong({ action, message, max, actual });

let validateEmbeds = (embeds: DiscordEmbed[], action: string) => {
  if (embeds.length > DISCORD_LIMITS.embeds) {
    throw tooLong(
      action,
      `Discord messages hold at most ${DISCORD_LIMITS.embeds} cards and images.`,
      DISCORD_LIMITS.embeds,
      embeds.length
    );
  }

  let total = 0;
  for (let embed of embeds) {
    let title = embed.title?.length ?? 0;
    let description = embed.description?.length ?? 0;
    if (title > DISCORD_LIMITS.embedTitle) {
      throw tooLong(
        action,
        'Card title is too long for Discord.',
        DISCORD_LIMITS.embedTitle,
        title
      );
    }
    if (description > DISCORD_LIMITS.embedDescription) {
      throw tooLong(
        action,
        'Card body is too long for Discord.',
        DISCORD_LIMITS.embedDescription,
        description
      );
    }
    let fields = embed.fields ?? [];
    if (fields.length > DISCORD_LIMITS.embedFields) {
      throw tooLong(
        action,
        'Card has too many fields for Discord.',
        DISCORD_LIMITS.embedFields,
        fields.length
      );
    }
    for (let field of fields) {
      if (field.name.length > DISCORD_LIMITS.fieldName) {
        throw tooLong(
          action,
          'Field label is too long for Discord.',
          DISCORD_LIMITS.fieldName,
          field.name.length
        );
      }
      if (field.value.length > DISCORD_LIMITS.fieldValue) {
        throw tooLong(
          action,
          'Field value is too long for Discord.',
          DISCORD_LIMITS.fieldValue,
          field.value.length
        );
      }
      total += field.name.length + field.value.length;
    }
    total += title + description;
  }

  if (total > DISCORD_LIMITS.embedTotal) {
    throw tooLong(
      action,
      'Cards exceed the Discord per-message text limit.',
      DISCORD_LIMITS.embedTotal,
      total
    );
  }
};

// Cards and standalone images become embeds; over-limit content is rejected, not truncated.
export let renderDiscordBody = (
  body: Pick<ChatBody, 'parts'>,
  action: string
): DiscordMessagePayload & { content: string; embeds: DiscordEmbed[] } => {
  let lines: string[] = [];
  let embeds: DiscordEmbed[] = [];
  collect(body.parts, lines, embeds);

  let content = lines.join('\n\n');
  if (content.length > DISCORD_LIMITS.content) {
    throw tooLong(
      action,
      `Discord messages are limited to ${DISCORD_LIMITS.content} characters.`,
      DISCORD_LIMITS.content,
      content.length
    );
  }
  validateEmbeds(embeds, action);

  return {
    content,
    embeds,
    // Never mass-ping @everyone/@here from generated text; user and role mentions work.
    allowed_mentions: { parse: ['users', 'roles'], replied_user: true }
  };
};
