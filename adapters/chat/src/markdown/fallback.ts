import type { Root } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { ChatBody } from '../schema/content/body';
import type { CardPart, ChartPart, ChatPart, TablePart } from '../schema/content/part';
import { parseMarkdown } from './parse';

export class EmptyChatBodyError extends Error {
  constructor(message = 'Chat body must include at least one part') {
    super(message);
    this.name = 'EmptyChatBodyError';
  }
}

export let toPlainText = (astOrMarkdown: Root | string): string => {
  if (typeof astOrMarkdown === 'string') {
    return mdastToString(parseMarkdown(astOrMarkdown)).trim();
  }

  return mdastToString(astOrMarkdown).trim();
};

export let tableToAscii = (headers: string[], rows: string[][]): string => {
  let allRows = [headers, ...rows];
  let colCount = Math.max(0, ...allRows.map(row => row.length));
  if (colCount === 0) return '';

  let colWidths = Array.from({ length: colCount }, () => 0);
  for (let row of allRows) {
    for (let i = 0; i < colCount; i++) {
      let cellLen = (row[i] ?? '').length;
      if (cellLen > colWidths[i]!) colWidths[i] = cellLen;
    }
  }

  let formatRow = (cells: string[]) =>
    Array.from({ length: colCount }, (_, i) => (cells[i] ?? '').padEnd(colWidths[i]!))
      .join(' | ')
      .trimEnd();

  let lines = [formatRow(headers), colWidths.map(width => '-'.repeat(width)).join('-|-')];
  for (let row of rows) lines.push(formatRow(row));
  return lines.join('\n');
};

export let chartToAltText = (part: ChartPart): string => {
  let chart = part.chart;
  if (chart.type === 'pie') {
    return `${part.title}\n${tableToAscii(
      ['Label', 'Value'],
      chart.segments.map(segment => [segment.label, String(segment.value)])
    )}`;
  }

  let headers = [chart.xLabel ?? '', ...chart.series.map(series => series.name)];
  let rows = chart.categories.map(category => [
    category,
    ...chart.series.map(series => {
      let point = series.data.find(entry => entry.label === category);
      return point ? String(point.value) : '';
    })
  ]);

  return `${part.title}\n${tableToAscii(headers, rows)}`;
};

export let partToAltText = (part: ChatPart): string => {
  switch (part.type) {
    case 'markdown':
      return toPlainText(part.markdown);
    case 'text':
      return part.content;
    case 'image':
      return part.alt ?? part.url;
    case 'divider':
      return '---';
    case 'link':
      return `${part.label} (${part.url})`;
    case 'fields':
      return part.children.map(child => `${child.label}: ${child.value}`).join('\n');
    case 'table':
      return tablePartToAltText(part);
    case 'chart':
      return chartToAltText(part);
    case 'actions':
      return part.children
        .map(child => {
          if (child.type === 'button' || child.type === 'link-button')
            return `[${child.label}]`;
          return `[${child.label}]`;
        })
        .join(' ');
    case 'section':
      return part.children.map(partToAltText).filter(Boolean).join('\n');
    case 'card':
      return cardToAltText(part);
  }
};

export let tablePartToAltText = (part: TablePart): string => {
  let table = tableToAscii(part.headers, part.rows);
  return part.caption ? `${part.caption}\n${table}` : table;
};

export let cardToAltText = (part: CardPart): string => {
  let lines: string[] = [];
  if (part.title) lines.push(part.title);
  if (part.subtitle) lines.push(part.subtitle);
  for (let child of part.children) {
    let text = partToAltText(child);
    if (text) lines.push(text);
  }
  return lines.join('\n');
};

export let bodyToAltText = (body: ChatBody): string => {
  if (body.altText) return body.altText;
  return body.parts.map(partToAltText).filter(Boolean).join('\n\n');
};

export let normalizeBody = (input: ChatBody): ChatBody => {
  if (input.parts.length === 0) {
    throw new EmptyChatBodyError();
  }

  return {
    parts: input.parts,
    attachments: input.attachments,
    altText: input.altText ?? bodyToAltText({ parts: input.parts })
  };
};
