import {
  bodyToAltText,
  type ChatBody,
  type ChatPart,
  type Modal,
  type ModalChild,
  replaceSlackShortcodesInMarkdown,
  replaceUnicodeWithSlackShortcodes,
  type SelectOption
} from '@slates/adapter-chat';

type SlackBlock = Record<string, any>;

let slackText = (value: string) =>
  replaceUnicodeWithSlackShortcodes(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/gs, '*$1*')
    .replace(/~~(.+?)~~/gs, '~$1~')
    .replace(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/g, '<$2|$1>')
    .replace(/(^|\s)@([UW][A-Z0-9]+)/g, '$1<@$2>')
    .replace(/(^|\s)#([C][A-Z0-9]+)/g, '$1<#$2>');

export let slackMrkdwnToMarkdown = (value: string) =>
  replaceSlackShortcodesInMarkdown(value)
    .replace(/<@([A-Z0-9_]+)(?:\|[^>]+)?>/g, '@$1')
    .replace(/<#([A-Z0-9_]+)\|([^>]+)>/g, '#$2')
    .replace(/<#([A-Z0-9_]+)>/g, '#$1')
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '[$2]($1)')
    .replace(/<(https?:\/\/[^>]+)>/g, '$1')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '**$1**')
    .replace(/(?<!~)~([^~\n]+)~(?!~)/g, '~~$1~~')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

let option = (value: SelectOption, markdown = false) => ({
  text: { type: markdown ? 'mrkdwn' : 'plain_text', text: value.label.slice(0, 75) },
  value: value.value.slice(0, 150),
  ...(value.description
    ? {
        description: {
          type: markdown ? 'mrkdwn' : 'plain_text',
          text: value.description.slice(0, 75)
        }
      }
    : {})
});

let actionElement = (part: Extract<ChatPart, { type: 'actions' }>['children'][number]) => {
  if (part.type === 'button') {
    return {
      type: 'button',
      text: { type: 'plain_text', text: part.label.slice(0, 75), emoji: true },
      action_id: part.id,
      ...(part.value ? { value: part.value } : {}),
      ...(part.style && part.style !== 'default' ? { style: part.style } : {})
    };
  }
  if (part.type === 'link-button') {
    return {
      type: 'button',
      text: { type: 'plain_text', text: part.label.slice(0, 75), emoji: true },
      action_id: part.id ?? `link-${part.url.slice(0, 150)}`,
      url: part.url,
      ...(part.style && part.style !== 'default' ? { style: part.style } : {})
    };
  }
  if (part.type === 'external-select') {
    return {
      type: 'external_select',
      action_id: part.id,
      ...(part.placeholder
        ? { placeholder: { type: 'plain_text', text: part.placeholder.slice(0, 150) } }
        : {}),
      ...(part.initialOption ? { initial_option: option(part.initialOption) } : {}),
      ...(part.minQueryLength !== undefined ? { min_query_length: part.minQueryLength } : {})
    };
  }

  let options = part.options
    .slice(0, part.type === 'radio-select' ? 10 : 100)
    .map(item => option(item, part.type === 'radio-select'));
  let initial = part.initialOption
    ? options.find(item => item.value === part.initialOption)
    : undefined;
  return {
    type: part.type === 'radio-select' ? 'radio_buttons' : 'static_select',
    action_id: part.id,
    options,
    ...(part.type === 'select' && part.placeholder
      ? { placeholder: { type: 'plain_text', text: part.placeholder.slice(0, 150) } }
      : {}),
    ...(initial ? { initial_option: initial } : {})
  };
};

let tableFallback = (headers: string[], rows: string[][]) => {
  let all = [headers, ...rows];
  let widths = headers.map((_, index) =>
    Math.min(40, Math.max(...all.map(row => (row[index] ?? '').length)))
  );
  let line = (row: string[]) =>
    widths.map((width, index) => (row[index] ?? '').slice(0, width).padEnd(width)).join(' | ');
  return [
    line(headers),
    widths.map(width => '-'.repeat(width)).join('-|-'),
    ...rows.map(line)
  ].join('\n');
};

let chartFallback = (part: Extract<ChatPart, { type: 'chart' }>) => {
  if (part.chart.type === 'pie') {
    return `${part.title}\n${part.chart.segments
      .map(segment => `${segment.label}: ${segment.value}`)
      .join('\n')}`;
  }
  let chart = part.chart;
  return `${part.title}\n${tableFallback(
    ['Category', ...chart.series.map(series => series.name)],
    chart.categories.map(category => [
      category,
      ...chart.series.map(series =>
        String(series.data.find(point => point.label === category)?.value ?? '')
      )
    ])
  )}`;
};

let partBlocks = (part: ChatPart, state: { table: boolean; charts: number }): SlackBlock[] => {
  switch (part.type) {
    case 'markdown':
      return [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: slackText(part.markdown).slice(0, 3000) }
        }
      ];
    case 'text':
      if (part.style === 'muted') {
        return [
          { type: 'context', elements: [{ type: 'mrkdwn', text: slackText(part.content) }] }
        ];
      }
      return [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: (part.style === 'bold'
              ? `*${slackText(part.content)}*`
              : slackText(part.content)
            ).slice(0, 3000)
          }
        }
      ];
    case 'image':
      return [{ type: 'image', image_url: part.url, alt_text: part.alt ?? 'Image' }];
    case 'divider':
      return [{ type: 'divider' }];
    case 'link':
      return [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `<${part.url}|${slackText(part.label)}>` }
        }
      ];
    case 'fields':
      return [
        {
          type: 'section',
          fields: part.children.slice(0, 10).map(field => ({
            type: 'mrkdwn',
            text: `*${slackText(field.label)}*\n${slackText(field.value)}`.slice(0, 2000)
          }))
        }
      ];
    case 'actions': {
      let elements = part.children
        .filter(
          child =>
            !('disabled' in child && child.disabled) &&
            !(
              (child.type === 'select' || child.type === 'radio-select') &&
              child.options.length === 0
            )
        )
        .slice(0, 25)
        .map(actionElement);
      return elements.length ? [{ type: 'actions', elements }] : [];
    }
    case 'section':
      return part.children.flatMap(child => partBlocks(child, state));
    case 'card':
      return [
        ...(part.title
          ? [{ type: 'header', text: { type: 'plain_text', text: part.title.slice(0, 150) } }]
          : []),
        ...(part.subtitle
          ? [
              {
                type: 'context',
                elements: [{ type: 'mrkdwn', text: slackText(part.subtitle) }]
              }
            ]
          : []),
        ...(part.imageUrl
          ? [{ type: 'image', image_url: part.imageUrl, alt_text: part.title ?? 'Card image' }]
          : []),
        ...part.children.flatMap(child => partBlocks(child, state))
      ];
    case 'table': {
      let chars = [part.headers, ...part.rows].flat().join('').length;
      if (
        state.table ||
        part.headers.length === 0 ||
        part.rows.length > 100 ||
        part.headers.length > 20 ||
        part.rows.some(row => row.length !== part.headers.length) ||
        chars > 10_000
      ) {
        return [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `\`\`\`\n${tableFallback(part.headers, part.rows).slice(0, 2988)}\n\`\`\``
            }
          }
        ];
      }
      state.table = true;
      let rows = [part.headers, ...part.rows].map(row =>
        row.map(cell => ({ type: 'raw_text', text: cell || ' ' }))
      );
      return [
        part.rows.length
          ? {
              type: 'data_table',
              caption: part.caption ?? 'Table',
              rows,
              ...(part.pageSize ? { page_size: Math.min(100, part.pageSize) } : {})
            }
          : { type: 'table', rows }
      ];
    }
    case 'chart': {
      let chart = part.chart;
      let validTitle = part.title.length > 0 && part.title.length <= 50;
      if (state.charts >= 2 || !validTitle) {
        return [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `\`\`\`\n${chartFallback(part).slice(0, 2988)}\n\`\`\``
            }
          }
        ];
      }
      if (chart.type === 'pie') {
        if (
          chart.segments.length < 1 ||
          chart.segments.length > 12 ||
          chart.segments.some(
            segment =>
              segment.label.length < 1 || segment.label.length > 20 || segment.value <= 0
          )
        ) {
          return [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `\`\`\`\n${chartFallback(part).slice(0, 2988)}\n\`\`\``
              }
            }
          ];
        }
        state.charts++;
        return [
          {
            type: 'data_visualization',
            title: part.title,
            chart: { type: 'pie', segments: chart.segments }
          }
        ];
      }
      let categorySet = new Set(chart.categories);
      let seriesSet = new Set(chart.series.map(series => series.name));
      let validSeries =
        chart.categories.length >= 1 &&
        chart.categories.length <= 20 &&
        categorySet.size === chart.categories.length &&
        chart.categories.every(category => category.length >= 1 && category.length <= 20) &&
        chart.series.length >= 1 &&
        chart.series.length <= 12 &&
        seriesSet.size === chart.series.length &&
        chart.series.every(
          series =>
            series.name.length >= 1 &&
            series.name.length <= 20 &&
            series.data.length === chart.categories.length &&
            chart.categories.every(category =>
              series.data.some(point => point.label === category)
            )
        ) &&
        (chart.xLabel?.length ?? 0) <= 50 &&
        (chart.yLabel?.length ?? 0) <= 50;
      if (!validSeries) {
        return [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `\`\`\`\n${chartFallback(part).slice(0, 2988)}\n\`\`\``
            }
          }
        ];
      }
      state.charts++;
      return [
        {
          type: 'data_visualization',
          title: part.title,
          chart: {
            type: chart.type,
            series: chart.series.map(series => ({
              name: series.name,
              data: chart.categories.map(
                category => series.data.find(point => point.label === category)!
              )
            })),
            axis_config: {
              categories: chart.categories,
              ...(chart.xLabel ? { x_label: chart.xLabel } : {}),
              ...(chart.yLabel ? { y_label: chart.yLabel } : {})
            }
          }
        }
      ];
    }
  }
};

export let renderChatBody = (body: ChatBody) => {
  let state = { table: false, charts: 0 };
  let blocks = body.parts.flatMap(part => partBlocks(part, state));
  for (let attachment of body.attachments ?? []) {
    if (!attachment.url || attachment.content !== undefined) continue;
    blocks.push(
      attachment.type === 'image'
        ? {
            type: 'image',
            image_url: attachment.url,
            alt_text: attachment.name ?? 'Image attachment'
          }
        : {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `<${attachment.url}|${slackText(attachment.name ?? 'Attachment')}>`
            }
          }
    );
  }
  blocks = blocks.slice(0, 50);
  return { text: body.altText ?? bodyToAltText(body), blocks };
};

let modalInput = (child: ModalChild): SlackBlock => {
  if (child.type === 'text' || child.type === 'fields') {
    return partBlocks(child, { table: false, charts: 0 })[0]!;
  }

  let element: Record<string, any>;
  if (child.type === 'text_input') {
    element = {
      type: 'plain_text_input',
      action_id: child.id,
      multiline: child.multiline ?? false,
      ...(child.initialValue ? { initial_value: child.initialValue } : {}),
      ...(child.maxLength ? { max_length: child.maxLength } : {})
    };
  } else if (child.type === 'date_input') {
    element = {
      type: 'datepicker',
      action_id: child.id,
      ...(child.initialValue && /^\d{4}-\d{2}-\d{2}$/.test(child.initialValue)
        ? { initial_date: child.initialValue }
        : {})
    };
  } else if (child.type === 'number_input') {
    element = {
      type: 'number_input',
      action_id: child.id,
      is_decimal_allowed: child.decimal ?? false,
      ...(child.initialValue !== undefined
        ? { initial_value: String(child.initialValue) }
        : {}),
      ...(child.min !== undefined ? { min_value: String(child.min) } : {}),
      ...(child.max !== undefined ? { max_value: String(child.max) } : {})
    };
  } else if (child.type === 'external-select') {
    element = actionElement(child);
  } else {
    element = actionElement(child);
  }
  if ('placeholder' in child && child.placeholder) {
    element.placeholder = { type: 'plain_text', text: child.placeholder.slice(0, 150) };
  }
  return {
    type: 'input',
    block_id: child.id,
    optional: child.optional ?? false,
    label: { type: 'plain_text', text: child.label.slice(0, 2000) },
    element
  };
};

export let renderModal = (modal: Modal, contextId?: string) => ({
  type: 'modal',
  callback_id: modal.callbackId,
  title: { type: 'plain_text', text: modal.title.slice(0, 24) },
  submit: { type: 'plain_text', text: (modal.submitLabel ?? 'Submit').slice(0, 24) },
  close: { type: 'plain_text', text: (modal.closeLabel ?? 'Cancel').slice(0, 24) },
  notify_on_close: modal.notifyOnClose ?? false,
  private_metadata:
    contextId || modal.privateMetadata
      ? JSON.stringify({ contextId, privateMetadata: modal.privateMetadata })
      : undefined,
  blocks: modal.children.slice(0, 100).map(modalInput)
});

export let parseSlackBlocks = (blocks?: any[]): ChatPart[] => {
  if (!blocks?.length) return [];
  let parts: ChatPart[] = [];
  for (let block of blocks) {
    if (block.type === 'section') {
      if (Array.isArray(block.fields)) {
        parts.push({
          type: 'fields',
          children: block.fields.map((field: any, index: number) => {
            let [label, ...value] = slackMrkdwnToMarkdown(field.text ?? '').split('\n');
            return {
              type: 'field',
              label: label?.replace(/^\*|\*$/g, '') || `Field ${index + 1}`,
              value: value.join('\n')
            };
          })
        });
      } else if (block.text?.text) {
        parts.push({ type: 'markdown', markdown: slackMrkdwnToMarkdown(block.text.text) });
      }
    } else if (block.type === 'header' && block.text?.text) {
      parts.push({ type: 'text', content: block.text.text, style: 'bold' });
    } else if (block.type === 'context') {
      let content = (block.elements ?? []).map((item: any) => item.text ?? '').join(' ');
      if (content)
        parts.push({ type: 'text', content: slackMrkdwnToMarkdown(content), style: 'muted' });
    } else if (block.type === 'image' && block.image_url) {
      parts.push({ type: 'image', url: block.image_url, alt: block.alt_text });
    } else if (block.type === 'divider') {
      parts.push({ type: 'divider' });
    } else if (block.type === 'actions') {
      let children = (block.elements ?? []).flatMap((item: any): any[] => {
        if (item.type === 'button') {
          return [
            item.url
              ? {
                  type: 'link-button',
                  id: item.action_id,
                  label: item.text?.text ?? item.action_id,
                  url: item.url,
                  style: item.style
                }
              : {
                  type: 'button',
                  id: item.action_id,
                  label: item.text?.text ?? item.action_id,
                  value: item.value,
                  style: item.style
                }
          ];
        }
        if (item.type === 'external_select') {
          return [
            {
              type: 'external-select',
              id: item.action_id,
              label: item.placeholder?.text ?? item.action_id,
              options: undefined,
              minQueryLength: item.min_query_length
            }
          ];
        }
        if (item.type === 'static_select' || item.type === 'radio_buttons') {
          return [
            {
              type: item.type === 'radio_buttons' ? 'radio-select' : 'select',
              id: item.action_id,
              label: item.placeholder?.text ?? item.action_id,
              options: (item.options ?? []).map((entry: any) => ({
                label: entry.text?.text ?? entry.value,
                value: entry.value,
                description: entry.description?.text
              })),
              initialOption: item.initial_option?.value
            }
          ];
        }
        return [];
      });
      if (children.length) parts.push({ type: 'actions', children } as ChatPart);
    } else if (
      (block.type === 'table' || block.type === 'data_table') &&
      Array.isArray(block.rows)
    ) {
      let rows = block.rows.map((row: any[]) => row.map(cell => cell.text ?? ''));
      parts.push({
        type: 'table',
        headers: rows[0] ?? [],
        rows: rows.slice(1),
        caption: block.caption,
        pageSize: block.page_size
      });
    } else if (block.type === 'data_visualization' && block.chart?.type === 'pie') {
      parts.push({
        type: 'chart',
        title: block.title ?? 'Chart',
        chart: { type: 'pie', segments: block.chart.segments ?? [] }
      });
    } else if (
      block.type === 'data_visualization' &&
      ['bar', 'area', 'line'].includes(block.chart?.type)
    ) {
      parts.push({
        type: 'chart',
        title: block.title ?? 'Chart',
        chart: {
          type: block.chart.type,
          categories: block.chart.axis_config?.categories ?? [],
          series: block.chart.series ?? [],
          xLabel: block.chart.axis_config?.x_label,
          yLabel: block.chart.axis_config?.y_label
        }
      } as ChatPart);
    }
  }
  return parts;
};
