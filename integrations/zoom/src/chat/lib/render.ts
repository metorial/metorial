import {
  type ChatBody,
  ChatErrors,
  type ChatPart,
  chartToAltText,
  escapeZoomMarkdown as escapeZoom,
  markdownToZoomText,
  zoomMonospace as monospaceLines,
  tableToAscii,
  zoomMarkdownImage as zoomImage,
  zoomMarkdownLink as zoomLink
} from '@slates/adapter-chat';

// https://developers.zoom.us/docs/chat/customizing-messages/markdown/

type ZoomMessageItem = { type: 'message'; text: string };
type ZoomFieldsItem = {
  type: 'fields';
  items: Array<{ key: string; value: string; editable: false }>;
};
type ZoomSectionItem = {
  type: 'section';
  sections: Array<ZoomMessageItem | ZoomFieldsItem>;
};
type ZoomBodyItem = ZoomMessageItem | ZoomFieldsItem | ZoomSectionItem;

export interface ZoomChatbotContent {
  body: ZoomBodyItem[];
}

export interface RenderedZoomMessage {
  content: ZoomChatbotContent;
  isMarkdown: true;
}

export { markdownToZoomText as markdownToZoom };

let textItem = (text: string): ZoomMessageItem => ({ type: 'message', text });

let renderPartItems = (
  part: ChatPart,
  action: string
): Array<ZoomMessageItem | ZoomFieldsItem> => {
  switch (part.type) {
    case 'markdown': {
      let text = markdownToZoomText(part.markdown, action);
      return text ? [textItem(text)] : [];
    }
    case 'text': {
      let content = escapeZoom(part.content);
      if (!content) return [];
      if (part.style === 'bold') return [textItem(`**${content}**`)];
      if (part.style === 'muted') return [textItem(`_${content}_`)];
      return [textItem(content)];
    }
    case 'image':
      return [textItem(zoomImage(part.url, part.alt, action))];
    case 'divider':
      return [textItem('---')];
    case 'link':
      return [textItem(zoomLink(part.url, part.label, action))];
    case 'fields':
      return part.children.length
        ? [
            {
              type: 'fields',
              items: part.children.map(child => ({
                key: child.label,
                value: escapeZoom(child.value),
                editable: false as const
              }))
            }
          ]
        : [];
    case 'table': {
      let table = monospaceLines(tableToAscii(part.headers, part.rows));
      return [textItem(part.caption ? `**${escapeZoom(part.caption)}**\n${table}` : table)];
    }
    case 'chart':
      return [textItem(monospaceLines(chartToAltText(part)))];
    case 'section':
      return part.children.flatMap(child => renderPartItems(child, action));
    case 'card': {
      let items: Array<ZoomMessageItem | ZoomFieldsItem> = [];
      if (part.title) items.push(textItem(`**${escapeZoom(part.title)}**`));
      if (part.subtitle) items.push(textItem(`_${escapeZoom(part.subtitle)}_`));
      if (part.imageUrl) items.push(textItem(zoomImage(part.imageUrl, undefined, action)));
      items.push(...part.children.flatMap(child => renderPartItems(child, action)));
      return items;
    }
    default:
      throw ChatErrors.unsupportedBlock({
        action,
        message: `Unsupported message part type: ${(part as { type?: string }).type}`
      });
  }
};

export let renderZoomBody = (body: ChatBody, action: string): RenderedZoomMessage => {
  if (body.attachments?.length) {
    throw ChatErrors.attachmentUnsupportedType({
      action,
      message:
        'Zoom chatbot messages cannot carry file attachments; send an image or link part instead.'
    });
  }

  let items: ZoomBodyItem[] = body.parts.flatMap((part): ZoomBodyItem[] => {
    if (part.type === 'section' || part.type === 'card') {
      let sections = renderPartItems(part, action);
      return sections.length ? [{ type: 'section', sections }] : [];
    }
    return renderPartItems(part, action);
  });

  if (items.length === 0) {
    let fallback = body.altText?.trim();
    if (!fallback) throw ChatErrors.contentEmpty({ action });
    items = [textItem(escapeZoom(fallback))];
  }

  return { content: { body: items }, isMarkdown: true };
};
