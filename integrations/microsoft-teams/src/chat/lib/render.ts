import {
  type ChatBody,
  ChatErrors,
  type ChatPart,
  chartToAltText,
  tablePartToAltText
} from '@slates/adapter-chat';

// Teams renders only bold, italic and links, so tables/charts/images become text.
// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/format-your-bot-messages#default-formatting-features

let escapeLinkLabel = (value: string) => value.replace(/([[\]])/g, '\\$1');

let renderPart = (part: ChatPart): string => {
  switch (part.type) {
    case 'markdown':
      return part.markdown;
    case 'text':
      if (part.style === 'bold') return `**${part.content}**`;
      if (part.style === 'muted') return `*${part.content}*`;
      return part.content;
    case 'image':
      return `[${escapeLinkLabel(part.alt ?? part.url)}](${part.url})`;
    case 'divider':
      return '---';
    case 'link':
      return `[${escapeLinkLabel(part.label)}](${part.url})`;
    case 'fields':
      return part.children.map(child => `**${child.label}:** ${child.value}`).join('\n\n');
    case 'table':
      return tablePartToAltText(part);
    case 'chart':
      return chartToAltText(part);
    case 'section':
      return part.children.map(renderPart).filter(Boolean).join('\n\n');
    case 'card': {
      let lines: string[] = [];
      if (part.title) lines.push(`**${part.title}**`);
      if (part.subtitle) lines.push(`*${part.subtitle}*`);
      if (part.imageUrl) lines.push(`[${escapeLinkLabel(part.imageUrl)}](${part.imageUrl})`);
      for (let child of part.children) {
        let rendered = renderPart(child);
        if (rendered) lines.push(rendered);
      }
      return lines.join('\n\n');
    }
  }
};

export let renderTeamsMarkdown = (body: ChatBody, action: string) => {
  if (body.attachments && body.attachments.length > 0) {
    throw ChatErrors.attachmentUnsupportedType({
      action,
      attachmentId: body.attachments[0]?.id,
      message:
        'Teams bots cannot attach uploaded files to messages. Send the file as a link in the message text instead.'
    });
  }

  let text = body.parts.map(renderPart).filter(Boolean).join('\n\n').trim();
  if (!text) {
    throw ChatErrors.contentEmpty({ action });
  }
  return text;
};
