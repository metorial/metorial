import { describe, expect, it } from 'vitest';
import { mapMeasureWithPeriodVariants } from './measures';

describe('SonarQube measures tool helpers', () => {
  it('maps current Server period measure values', () => {
    expect(
      mapMeasureWithPeriodVariants({
        metric: 'new_violations',
        period: {
          value: '25',
          bestValue: false
        }
      })
    ).toEqual({
      metric: 'new_violations',
      value: undefined,
      bestValue: false,
      periodValue: '25',
      raw: {
        metric: 'new_violations',
        period: {
          value: '25',
          bestValue: false
        }
      }
    });
  });

  it('maps SonarCloud periods measure values', () => {
    expect(
      mapMeasureWithPeriodVariants({
        metric: 'new_violations',
        periods: [
          {
            index: 1,
            value: '7',
            bestValue: true
          }
        ]
      })
    ).toEqual({
      metric: 'new_violations',
      value: undefined,
      bestValue: true,
      periodValue: '7',
      raw: {
        metric: 'new_violations',
        periods: [
          {
            index: 1,
            value: '7',
            bestValue: true
          }
        ]
      }
    });
  });
});
