import type { ChatBody } from '../schema/content/body';
import type { ChatPart } from '../schema/content/part';
import { bodyToAltText, toPlainText } from './fallback';

export abstract class ChatFormatConverter {
  abstract fromMarkdown(markdown: string): string;

  abstract toMarkdown(platformText: string): string;

  abstract fromParts(parts: ChatPart[]): unknown;

  extractPlainText(markdown: string) {
    return toPlainText(markdown);
  }

  altText(body: ChatBody) {
    return bodyToAltText(body);
  }
}
