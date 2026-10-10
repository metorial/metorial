import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/markdown-formats.json';
import { ChatError } from './errors';
import {
  createMarkdownTextRenderer,
  markdownToGoogleChatText,
  markdownToMessengerText,
  markdownToTelegramHtml,
  markdownToWhatsAppText,
  markdownToZoomText,
  prefixLines,
  wrapWhatsAppMarker
} from './markdown';

// Expected outputs were captured from each adapter's renderer before it moved here.
let formats: Record<keyof typeof fixture.expected, (markdown: string) => string> = {
  telegram: markdownToTelegramHtml,
  whatsapp: markdownToWhatsAppText,
  messenger: markdownToMessengerText,
  googleChat: markdownToGoogleChatText,
  zoom: markdown => markdownToZoomText(markdown, 'metorial_chat$message.send')
};

let run = (render: (markdown: string) => string, markdown: string) => {
  try {
    return { output: render(markdown) };
  } catch (error) {
    return { error: ChatError.is(error) ? error.chat.code : String(error) };
  }
};

describe('provider markdown formats', () => {
  for (let [name, render] of Object.entries(formats)) {
    it(`${name} matches the legacy renderer byte for byte`, () => {
      let inputs =
        name === 'zoom' ? [...fixture.markdown, ...fixture.zoomRejected] : fixture.markdown;
      let expected = fixture.expected[name as keyof typeof fixture.expected];
      expect(expected).toHaveLength(inputs.length);
      inputs.forEach((markdown, index) => {
        expect(run(render, markdown), JSON.stringify(markdown)).toEqual(expected[index]);
      });
    });
  }

  it('reports the action on rejected Zoom links', () => {
    try {
      markdownToZoomText('[x](javascript:alert(1))', 'metorial_chat$message.edit');
      expect.unreachable();
    } catch (error) {
      expect(ChatError.isCode(error, 'chat.input.invalid')).toBe(true);
      expect((error as ChatError).chat.action).toBe('metorial_chat$message.edit');
    }
  });

  it('keeps edge whitespace outside WhatsApp markers', () => {
    expect(wrapWhatsAppMarker('*', ' bold ')).toBe(' *bold* ');
    expect(wrapWhatsAppMarker('*', '  ')).toBe('  ');
  });
});

describe('createMarkdownTextRenderer', () => {
  it('applies defaults, escaping, and custom handlers', () => {
    let renderer = createMarkdownTextRenderer({
      escape: value => value.toUpperCase(),
      inline: { strong: (node, walk) => `[${walk.inline(node.children)}]` },
      block: { heading: (node, walk) => `# ${walk.inline(node.children)}` }
    });

    expect(renderer.render('# Title\n\nsome **bold**\n\n')).toBe('# TITLE\n\nSOME [BOLD]');
    expect(renderer.render('a  \nb')).toBe('A\nB');
  });

  it('passes depth to block handlers', () => {
    let renderer = createMarkdownTextRenderer({
      block: {
        list: (node, walk, depth) =>
          (node.children ?? [])
            .map(item => `${depth}:${walk.blocks(item.children, depth + 1)}`)
            .join('|')
      }
    });
    expect(renderer.render('- a\n  - b')).toBe('0:a\n\n1:b');
  });

  it('prefixes lines', () => {
    expect(prefixLines('a\nb', '- ', '  ')).toBe('- a\n  b');
    expect(prefixLines('a\nb', '> ')).toBe('> a\n> b');
  });
});
