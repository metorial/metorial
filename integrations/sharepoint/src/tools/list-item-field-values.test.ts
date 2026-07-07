import { describe, expect, it } from 'vitest';
import {
  normalizeSharePointHyperlinkFieldValue,
  resolveSharePointHyperlinkFieldValues,
  splitSharePointListItemFields
} from './list-item-field-values';

describe('SharePoint Hyperlink field values', () => {
  it('normalizes lower-case URL and description fields', () => {
    expect(
      normalizeSharePointHyperlinkFieldValue('Transcript_x0020_URL', {
        url: 'https://example.com/transcript',
        description: 'Fireflies Transcript'
      })
    ).toEqual({
      Url: 'https://example.com/transcript',
      Description: 'Fireflies Transcript'
    });
  });

  it('normalizes classic SharePoint REST Url and Description fields', () => {
    expect(
      normalizeSharePointHyperlinkFieldValue('Transcript_x0020_URL', {
        Url: 'https://example.com/transcript',
        Description: 'Fireflies Transcript'
      })
    ).toEqual({
      Url: 'https://example.com/transcript',
      Description: 'Fireflies Transcript'
    });
  });

  it('normalizes Microsoft Graph-style webUrl and description fields', () => {
    expect(
      normalizeSharePointHyperlinkFieldValue('Transcript_x0020_URL', {
        webUrl: 'https://example.com/transcript',
        description: 'Fireflies Transcript'
      })
    ).toEqual({
      Url: 'https://example.com/transcript',
      Description: 'Fireflies Transcript'
    });
  });

  it('splits Hyperlink object fields from Graph-compatible scalar fields', () => {
    expect(
      splitSharePointListItemFields({
        Title: 'Meeting',
        Transcript_x0020_URL: {
          Url: 'https://example.com/transcript',
          Description: 'Fireflies Transcript'
        }
      })
    ).toEqual({
      graphFields: {
        Title: 'Meeting'
      },
      hyperlinkFields: {
        Transcript_x0020_URL: {
          Url: 'https://example.com/transcript',
          Description: 'Fireflies Transcript'
        }
      }
    });
  });

  it('rejects URL-like field objects without an absolute URL', () => {
    expect(() =>
      normalizeSharePointHyperlinkFieldValue('Transcript_x0020_URL', {
        Url: '/transcript',
        Description: 'Fireflies Transcript'
      })
    ).toThrow('absolute URL');
  });

  it('resolves display-name and lowercase Hyperlink field inputs to REST internal names', () => {
    let fieldValue = {
      Url: 'https://example.com/transcript',
      Description: 'Fireflies Transcript'
    };

    expect(
      resolveSharePointHyperlinkFieldValues(
        [
          {
            internalName: 'Transcript_x0020_URL',
            staticName: 'Transcript_x0020_URL',
            title: 'Transcript URL',
            typeAsString: 'URL',
            fieldTypeKind: 11
          }
        ],
        {
          'transcript url': fieldValue
        }
      )
    ).toEqual({
      Transcript_x0020_URL: fieldValue
    });
  });

  it('rejects duplicate Hyperlink aliases for the same SharePoint field', () => {
    let fieldValue = {
      Url: 'https://example.com/transcript',
      Description: 'Fireflies Transcript'
    };

    expect(() =>
      resolveSharePointHyperlinkFieldValues(
        [
          {
            internalName: 'Transcript_x0020_URL',
            staticName: 'Transcript_x0020_URL',
            title: 'Transcript URL',
            typeAsString: 'URL',
            fieldTypeKind: 11
          }
        ],
        {
          Transcript_x0020_URL: fieldValue,
          'Transcript URL': fieldValue
        }
      )
    ).toThrow('Multiple Hyperlink field inputs');
  });
});
