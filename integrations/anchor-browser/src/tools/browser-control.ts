import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let browserControl = SlateTool.create(spec, {
  name: 'Browser Control',
  key: 'browser_control',
  description: `Perform OS-level browser interactions within an active session. Supports mouse clicks, double clicks, drag-and-drop, scrolling, typing text, keyboard shortcuts, navigation, and clipboard operations. Useful for interacting with elements not accessible via standard browser APIs.`,
  instructions: [
    'The sessionId is always required — these controls operate within a live session.',
    'For mouse operations, provide x/y coordinates or a CSS selector.',
    'For keyboard shortcuts, provide an array of key names (e.g. ["Control", "c"]).'
  ]
})
  .input(
    z.object({
      sessionId: z.string().describe('ID of the active session to control'),
      action: z
        .enum([
          'click',
          'double_click',
          'drag_drop',
          'scroll',
          'type_text',
          'keyboard_shortcut',
          'navigate',
          'set_clipboard',
          'get_clipboard'
        ])
        .describe('The OS-level action to perform'),
      x: z.number().optional().describe('X coordinate for mouse actions'),
      y: z.number().optional().describe('Y coordinate for mouse actions'),
      button: z.string().optional().describe('Mouse button: "left", "right", or "middle"'),
      selector: z
        .string()
        .optional()
        .describe('CSS selector for click target (alternative to x/y)'),
      timeout: z.number().optional().describe('Timeout in ms for selector-based click'),
      index: z
        .number()
        .optional()
        .describe('Element index when selector matches multiple elements'),
      startX: z.number().optional().describe('Drag start X coordinate'),
      startY: z.number().optional().describe('Drag start Y coordinate'),
      endX: z.number().optional().describe('Drag end X coordinate'),
      endY: z.number().optional().describe('Drag end Y coordinate'),
      deltaX: z.number().optional().describe('Horizontal scroll amount'),
      deltaY: z.number().optional().describe('Vertical scroll amount'),
      scrollSteps: z.number().optional().describe('Number of scroll steps'),
      text: z.string().optional().describe('Text to type or set on clipboard'),
      typingDelay: z.number().optional().describe('Delay between keystrokes in ms'),
      keys: z
        .array(z.string())
        .optional()
        .describe('Key names for keyboard shortcut (e.g. ["Control", "a"])'),
      holdTime: z.number().optional().describe('Time to hold keys in ms'),
      url: z.string().optional().describe('URL for navigate action')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      clipboardText: z
        .string()
        .optional()
        .describe('Clipboard content (for get_clipboard action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;
    let _result: unknown;

    switch (input.action) {
      case 'click':
        _result = await client.mouseClick(input.sessionId, {
          x: input.x,
          y: input.y,
          button: input.button,
          selector: input.selector,
          timeout: input.timeout,
          index: input.index
        });
        break;

      case 'double_click':
        _result = await client.mouseDoubleClick(input.sessionId, {
          x: input.x,
          y: input.y,
          button: input.button
        });
        break;

      case 'drag_drop':
        if (
          input.startX === undefined ||
          input.startY === undefined ||
          input.endX === undefined ||
          input.endY === undefined
        ) {
          throw new Error('startX, startY, endX, endY are required for drag_drop.');
        }
        _result = await client.dragDrop(input.sessionId, {
          startX: input.startX,
          startY: input.startY,
          endX: input.endX,
          endY: input.endY,
          button: input.button
        });
        break;

      case 'scroll':
        _result = await client.scroll(input.sessionId, {
          x: input.x,
          y: input.y,
          deltaX: input.deltaX,
          deltaY: input.deltaY ?? 0,
          steps: input.scrollSteps
        });
        break;

      case 'type_text':
        if (!input.text) throw new Error('text is required for type_text.');
        _result = await client.typeText(input.sessionId, {
          text: input.text,
          delay: input.typingDelay
        });
        break;

      case 'keyboard_shortcut':
        if (!input.keys || input.keys.length === 0)
          throw new Error('keys is required for keyboard_shortcut.');
        _result = await client.keyboardShortcut(input.sessionId, {
          keys: input.keys,
          holdTime: input.holdTime
        });
        break;

      case 'navigate':
        if (!input.url) throw new Error('url is required for navigate.');
        _result = await client.navigate(input.sessionId, { url: input.url });
        break;

      case 'set_clipboard':
        if (!input.text) throw new Error('text is required for set_clipboard.');
        _result = await client.setClipboard(input.sessionId, { text: input.text });
        break;

      case 'get_clipboard': {
        let clipResult = await client.getClipboard(input.sessionId);
        return {
          output: {
            success: true,
            clipboardText:
              typeof clipResult === 'string'
                ? clipResult
                : ((clipResult as any)?.text ?? JSON.stringify(clipResult))
          },
          message: `Retrieved clipboard content from session **${input.sessionId}**.`
        };
      }

      default:
        throw new Error(`Unknown action: ${input.action}`);
    }

    return {
      output: { success: true },
      message: `Performed **${input.action}** on session **${input.sessionId}**.`
    };
  })
  .build();
