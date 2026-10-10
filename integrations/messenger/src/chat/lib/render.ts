import {
  type ChatBody,
  ChatErrors,
  type ChatPart,
  cardToAltText,
  chartToAltText,
  markdownToMessengerText,
  tablePartToAltText
} from '@slates/adapter-chat';

export let MESSENGER_TEXT_LIMIT = 2000;

let renderPart = (part: ChatPart, action: string): string => {
  switch (part.type) {
    case 'markdown':
      return markdownToMessengerText(part.markdown);
    case 'text':
      return part.content;
    case 'link':
      return part.label && part.label !== part.url ? `${part.label} (${part.url})` : part.url;
    case 'divider':
      return '---';
    case 'fields':
      return part.children.map(child => `${child.label}: ${child.value}`).join('\n');
    case 'table':
      return tablePartToAltText(part);
    case 'chart':
      return chartToAltText(part);
    case 'section':
      return part.children
        .map(child => renderPart(child, action))
        .filter(Boolean)
        .join('\n');
    case 'card':
      if (part.imageUrl) {
        throw ChatErrors.unsupportedBlock({
          action,
          message:
            'Messenger text messages cannot display card images. Remove imageUrl or send the image as a file.'
        });
      }
      return (
        cardToAltText({ ...part, children: [] }) +
        (part.children.length
          ? `${part.title || part.subtitle ? '\n' : ''}${part.children
              .map(child => renderPart(child, action))
              .filter(Boolean)
              .join('\n')}`
          : '')
      );
    case 'image':
      throw ChatErrors.unsupportedBlock({
        action,
        message:
          'Messenger text messages cannot display inline images. Send the image as a file instead.'
      });
  }
};

// Inline images are rejected rather than dropped.
export let renderMessengerText = (body: Pick<ChatBody, 'parts'>, action: string) => {
  let text = body.parts
    .map(part => renderPart(part, action))
    .filter(Boolean)
    .join('\n\n')
    .trim();

  if (!text) {
    throw ChatErrors.contentEmpty({ action, message: 'The message has no text to send.' });
  }

  let length = [...text].length;
  if (length >= MESSENGER_TEXT_LIMIT) {
    throw ChatErrors.contentTooLong({
      action,
      max: MESSENGER_TEXT_LIMIT - 1,
      actual: length
    });
  }

  return text;
};
