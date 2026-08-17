import { describe, expect, it } from 'vitest';
import { card, chart, markdown, table } from './builders';
import {
  bodyToAltText,
  EmptyChatBodyError,
  normalizeBody,
  parseMarkdown,
  stringifyMarkdown,
  toPlainText
} from './markdown';

describe('markdown helpers', () => {
  it('round-trips GFM emphasis, links, tables, and code fences', () => {
    let source = [
      'Hello **world** and *italics*.',
      '',
      'See [docs](https://example.com).',
      '',
      '| A | B |',
      '| --- | --- |',
      '| 1 | 2 |',
      '',
      '```ts',
      'let x = 1;',
      '```'
    ].join('\n');

    let ast = parseMarkdown(source);
    let again = stringifyMarkdown(ast);

    expect(again).toContain('**world**');
    expect(again).toContain('[docs](https://example.com)');
    expect(again).toContain('| A | B |');
    expect(again).toContain('```');
    expect(toPlainText(source)).toContain('Hello world');
  });

  it('defaults altText and rejects an empty parts list', () => {
    expect(normalizeBody({ parts: [{ type: 'markdown', markdown: '**hi**' }] }).altText).toBe(
      'hi'
    );

    expect(
      normalizeBody({
        parts: [{ type: 'text', content: 'plain' }],
        altText: 'plain',
        attachments: [{ type: 'file', name: 'a.txt' }]
      }).attachments
    ).toEqual([{ type: 'file', name: 'a.txt' }]);

    expect(() => normalizeBody({ parts: [] })).toThrow(EmptyChatBodyError);
  });

  it('builds alt text for tables, charts, buttons, and mixed bodies', () => {
    let tableText = bodyToAltText({
      parts: [table({ headers: ['Name'], rows: [['Ada']] })]
    });
    expect(tableText).toContain('Name');
    expect(tableText).toContain('Ada');

    let chartText = bodyToAltText({
      parts: [
        chart({
          title: 'Usage',
          chart: { type: 'pie', segments: [{ label: 'A', value: 1 }] }
        })
      ]
    });
    expect(chartText).toContain('Usage');
    expect(chartText).toContain('A');

    let mixed = bodyToAltText({
      parts: [
        markdown('Hello **there**'),
        card({
          title: 'Approve?',
          children: [
            {
              type: 'actions',
              children: [{ type: 'button', id: 'ok', label: 'OK' }]
            }
          ]
        })
      ]
    });
    expect(mixed).toContain('Hello there');
    expect(mixed).toContain('Approve?');
    expect(mixed).toContain('[OK]');
  });
});
