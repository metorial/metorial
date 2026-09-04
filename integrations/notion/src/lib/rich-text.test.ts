import { describe, expect, it } from 'vitest';
import {
  normalizeNotionBlockUpdateContent,
  normalizeNotionRichTextAnnotations
} from './rich-text';

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

describe('normalizeNotionBlockUpdateContent', () => {
  it('removes the response-only type discriminator from image updates', () => {
    expect(
      normalizeNotionBlockUpdateContent({
        image: {
          type: 'file_upload',
          file_upload: {
            id: 'upload-id'
          }
        }
      })
    ).toEqual({
      image: {
        file_upload: {
          id: 'upload-id'
        }
      }
    });
  });

  it("splits rich text content at Notion's 2,000-character request limit", () => {
    let content = 'a'.repeat(2001);

    expect(
      normalizeNotionBlockUpdateContent({
        code: {
          rich_text: [
            {
              type: 'text',
              text: {
                content,
                link: null
              },
              annotations: {
                bold: true
              }
            }
          ]
        }
      })
    ).toEqual({
      code: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: 'a'.repeat(2000),
              link: null
            },
            annotations: {
              bold: true
            }
          },
          {
            type: 'text',
            text: {
              content: 'a',
              link: null
            },
            annotations: {
              bold: true
            }
          }
        ]
      }
    });
  });
});
