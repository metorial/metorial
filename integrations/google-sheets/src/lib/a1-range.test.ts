import { describe, expect, it } from 'vitest';
import { normalizeA1Range } from './a1-range';

describe('normalizeA1Range', () => {
  it('leaves simple sheet names unchanged', () => {
    expect(normalizeA1Range('Sheet1!A1:B2')).toBe('Sheet1!A1:B2');
    expect(normalizeA1Range('Data!A:A')).toBe('Data!A:A');
  });

  it('leaves no-sheet ranges and named ranges unchanged', () => {
    expect(normalizeA1Range('A1:B2')).toBe('A1:B2');
    expect(normalizeA1Range('NamedRange')).toBe('NamedRange');
  });

  it('quotes sheet names with spaces or punctuation', () => {
    expect(normalizeA1Range('Draft summary!A1:Z60')).toBe("'Draft summary'!A1:Z60");
    expect(normalizeA1Range('Authority (ETV)!E1:H1')).toBe("'Authority (ETV)'!E1:H1");
  });

  it('leaves already quoted sheet names quoted while trimming the separator', () => {
    expect(normalizeA1Range(" 'Target Pages' ! D1 ")).toBe("'Target Pages'!D1");
    expect(normalizeA1Range("'Jon''s_Data'!A1:D5")).toBe("'Jon''s_Data'!A1:D5");
  });

  it('escapes apostrophes when quoting sheet names', () => {
    expect(normalizeA1Range("Jon's Data!A1:D5")).toBe("'Jon''s Data'!A1:D5");
  });

  it('uses the final separator for unquoted sheet names that contain punctuation', () => {
    expect(normalizeA1Range('Needs!Quotes!A1')).toBe("'Needs!Quotes'!A1");
  });

  it('quotes ambiguous cell-like sheet names', () => {
    expect(normalizeA1Range('A1!B2')).toBe("'A1'!B2");
    expect(normalizeA1Range('R1C1!A1')).toBe("'R1C1'!A1");
  });
});
