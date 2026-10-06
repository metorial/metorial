import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import {
  chatCompletion,
  contextualAnswer,
  conversationalRag,
  grammarCheck,
  paraphrase,
  segmentText,
  summarize,
  summarizeBySegment,
  textCompletion,
  textImprovements
} from './tools';

describeMcpCompatibleToolSchemas('AI21 Studio tool input schemas', provider.actions);

describe('AI21 established output compatibility', () => {
  it('retains the required RAG usage object and unconstrained file identifiers', () => {
    const rag = z.toJSONSchema(conversationalRag.outputSchema);
    expect(rag.required).toContain('usage');
    expect(rag.properties?.usage).toMatchObject({ type: 'object' });
    expect(rag.properties?.usageReported).toMatchObject({ type: 'boolean' });
    for (const key of ['get_file', 'list_files']) {
      const tool = provider.actions.find(action => action.key === key);
      if (!tool || tool.type !== 'tool' || !tool.outputSchema)
        throw new Error(`Missing ${key}`);
      const schema = z.toJSONSchema(tool.outputSchema);
      let fields = schema.properties;
      if (key === 'list_files') {
        const files = schema.properties?.files;
        if (!files || typeof files !== 'object') throw new Error('Missing file array');
        const items = files.items;
        if (!items || typeof items !== 'object' || Array.isArray(items))
          throw new Error('Missing file item schema');
        fields = items.properties;
      }
      expect(fields?.fileId).toMatchObject({ type: 'string' });
      expect(fields?.name).toMatchObject({ type: 'string' });
      expect(fields?.fileId).not.toHaveProperty('minLength');
      expect(fields?.name).not.toHaveProperty('minLength');
    }
  });
});

describe('AI21 retired API compatibility contracts', () => {
  it.each([
    ['summarize', summarize],
    ['summarize_by_segment', summarizeBySegment],
    ['paraphrase', paraphrase],
    ['text_improvements', textImprovements],
    ['grammar_check', grammarCheck],
    ['segment_text', segmentText],
    ['contextual_answer', contextualAnswer],
    ['text_completion', textCompletion]
  ] as const)('retains the deprecated %s tool and current chat alternative', (key, legacy) => {
    expect(legacy.key).toBe(key);
    expect(provider.actions).toContain(legacy);
    expect(provider.actions).toContain(chatCompletion);
    expect(legacy.tags).toMatchObject({ deprecated: true });
    expect(legacy.description?.startsWith('DEPRECATED — use `chat_completion` instead.')).toBe(
      true
    );
    expect(legacy.instructions?.join(' ')).toContain('chat_completion');
  });
});
