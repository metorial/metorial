import { describe, expect, it } from 'vitest';
import { parseSlackBlocks, renderChatBody, renderModal } from './render';

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
          type: 'actions',
          children: [
            { type: 'button', id: 'approve', label: 'Approve', style: 'primary' },
            {
              type: 'external-select',
              id: 'search',
              label: 'Search',
              minQueryLength: 2
            }
          ]
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
      'actions',
      'data_table',
      'data_visualization'
    ]);
    expect(result.blocks[2]?.elements).toMatchObject([
      { type: 'button', action_id: 'approve', style: 'primary' },
      { type: 'external_select', action_id: 'search', min_query_length: 2 }
    ]);
    expect(result.blocks[4]?.chart).toMatchObject({
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
        { type: 'image', image_url: 'https://example.com/image.png', alt_text: 'Image' },
        {
          type: 'actions',
          elements: [
            {
              type: 'static_select',
              action_id: 'choice',
              options: [{ text: { type: 'plain_text', text: 'One' }, value: '1' }]
            }
          ]
        }
      ])
    ).toMatchObject([
      { type: 'markdown', markdown: '**Hello** [docs](https://example.com)' },
      { type: 'image', url: 'https://example.com/image.png', alt: 'Image' },
      {
        type: 'actions',
        children: [{ type: 'select', id: 'choice', options: [{ label: 'One', value: '1' }] }]
      }
    ]);
  });

  it('maps all portable modal input types to Slack input blocks', () => {
    let view = renderModal(
      {
        type: 'modal',
        title: 'Long modal title that Slack truncates',
        callbackId: 'settings',
        notifyOnClose: true,
        privateMetadata: 'private',
        children: [
          { type: 'text_input', id: 'name', label: 'Name' },
          { type: 'date_input', id: 'date', label: 'Date', initialValue: '2026-08-17' },
          { type: 'number_input', id: 'count', label: 'Count', min: 0 },
          {
            type: 'radio-select',
            id: 'priority',
            label: 'Priority',
            options: [{ label: 'High', value: 'high' }]
          }
        ]
      },
      'context'
    );

    expect(view.title.text).toHaveLength(24);
    expect(view.notify_on_close).toBe(true);
    expect(view.blocks.map(block => block.element?.type)).toEqual([
      'plain_text_input',
      'datepicker',
      'number_input',
      'radio_buttons'
    ]);
    expect(JSON.parse(view.private_metadata!)).toEqual({
      contextId: 'context',
      privateMetadata: 'private'
    });
  });
});
