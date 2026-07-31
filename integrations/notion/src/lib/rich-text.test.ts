import { describe, expect, it } from 'vitest';
import { normalizeNotionRichTextAnnotations } from './rich-text';

describe('normalizeNotionRichTextAnnotations', () => {
  it('moves misplaced text annotations to the rich text object', () => {
    let input = {
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: 'Important',
              annotations: {
                bold: true
              }
            }
          }
        ]
      }
    };

    expect(normalizeNotionRichTextAnnotations(input)).toEqual({
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: 'Important'
            },
            annotations: {
              bold: true
            }
          }
        ]
      }
    });
    expect(input.bulleted_list_item.rich_text[0]?.text.annotations).toEqual({
      bold: true
    });
  });

  it('keeps correctly placed annotations when both locations are present', () => {
    expect(
      normalizeNotionRichTextAnnotations({
        type: 'text',
        text: {
          content: 'Important',
          annotations: {
            bold: true
          }
        },
        annotations: {
          italic: true
        }
      })
    ).toEqual({
      type: 'text',
      text: {
        content: 'Important'
      },
      annotations: {
        italic: true
      }
    });
  });
});
