import { describe, expect, it } from 'vitest';
import { parseSlackBlocks, renderChatBody } from './render';

describe('Slack chat adapter rendering', () => {
  it('maps rich chat parts to native Block Kit features', () => {
    let result = renderChatBody({
      parts: [
        { type: 'markdown', markdown: '**Hello** [docs](https://example.com)' },
        {
          type: 'fields',
          children: [{ type: 'field', label: 'Status', value: 'Ready' }]
        },
        {
          type: 'table',
          headers: ['Name', 'Value'],
          rows: [['Latency', '42 ms']],
          pageSize: 5
        },
        {
          type: 'chart',
          title: 'Usage',
          chart: {
            type: 'bar',
            categories: ['Mon'],
            series: [{ name: 'Requests', data: [{ label: 'Mon', value: 12 }] }]
          }
        }
      ]
    });

    expect(result.text).toContain('Hello');
    expect(result.blocks.map(block => block.type)).toEqual([
      'section',
      'section',
      'data_table',
      'data_visualization'
    ]);
    expect(result.blocks[3]?.chart).toMatchObject({
      type: 'bar',
      axis_config: { categories: ['Mon'] }
    });
  });

  it('maps Slack blocks back to portable chat parts', () => {
    expect(
      parseSlackBlocks([
        {
          type: 'section',
          text: { type: 'mrkdwn', text: '*Hello* <https://example.com|docs>' }
        },
        { type: 'image', image_url: 'https://example.com/image.png', alt_text: 'Image' }
      ])
    ).toMatchObject([
      { type: 'markdown', markdown: '**Hello** [docs](https://example.com)' },
      { type: 'image', url: 'https://example.com/image.png', alt: 'Image' }
    ]);
  });
});
