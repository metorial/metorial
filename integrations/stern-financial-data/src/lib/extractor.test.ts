import { describe, expect, it } from 'vitest';
import { extractRowsForSource, findHeaderMap, parseTypedValue } from './extractor';
import { type BetaRow, ERP_FIELDS, type ErpRow } from './sources';

describe('Stern financial data extractor', () => {
  it('parses typed values and header aliases', () => {
    expect(parseTypedValue('4.23%', undefined, 'number')).toBe(0.0423);
    expect(parseTypedValue('1,207', undefined, 'integer')).toBe(1207);
    expect(parseTypedValue('NA', undefined, 'number')).toBeNull();

    expect(
      findHeaderMap(
        [
          'Country',
          "Moody's rating",
          'Adj. Default Spread',
          'Country Risk Premium',
          'Equity Risk Premium',
          'Corporate Tax Rate',
          'Sovereignn CDS',
          'ERP based on sovereign CDSS'
        ],
        ERP_FIELDS
      )
    ).toEqual({
      country: 0,
      moodysRating: 1,
      adjustedDefaultSpread: 2,
      countryRiskPremium: 3,
      equityRiskPremium: 4,
      corporateTaxRate: 5,
      sovereignCds: 6,
      erpBasedOnSovereignCds: 7
    });
  });

  it('parses ERP rows through the HTML fallback path', () => {
    let rows = extractRowsForSource(
      'erp',
      null,
      '<table>' +
        "<tr><th>Country</th><th>Moody's rating</th><th>Adj. Default Spread</th><th>Country Risk Premium</th><th>Equity Risk Premium</th><th>Corporate Tax Rate</th><th>Sovereignn CDS</th><th>ERP based on sovereign CDSS</th></tr>" +
        '<tr><td>United States</td><td>Aa1</td><td>0.23%</td><td>0.23%</td><td>4.46%</td><td>25.00%</td><td>0.30%</td><td>4.69%</td></tr>' +
        '</table>'
    ) as ErpRow[];

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      country: 'United States',
      moodysRating: 'Aa1',
      adjustedDefaultSpread: 0.0023,
      countryRiskPremium: 0.0023,
      equityRiskPremium: 0.0446,
      corporateTaxRate: 0.25,
      sovereignCds: 0.003,
      erpBasedOnSovereignCds: 0.0469
    });
    expect(rows[0]?.raw.adjustedDefaultSpread).toBe('0.23%');
  });

  it('parses US industry beta rows through the HTML fallback path', () => {
    let rows = extractRowsForSource(
      'us_industry_betas',
      null,
      '<table>' +
        '<tr><th>Industry Name</th><th>Number of firms</th><th>Beta</th><th>D/E Ratio</th><th>Effective Tax rate</th><th>Unlevered beta</th><th>Cash/Firm value</th><th>Unlevered beta corrected for cash</th><th>HiLo Risk</th><th>Standard deviation of equity</th><th>Standard deviation in operating income (last 10 years)</th></tr>' +
        '<tr><td>Advertising</td><td>52</td><td>1.21</td><td>40.20%</td><td>5.02%</td><td>0.93</td><td>7.73%</td><td>1.01</td><td>0.6233</td><td>62.91%</td><td>15.17%</td></tr>' +
        '<tr><td>Total Market</td><td>5,994</td><td>1.04</td><td>51.48%</td><td>13.31%</td><td>0.75</td><td>9.70%</td><td>0.83</td><td>0.3691</td><td>42.07%</td><td>24.29%</td></tr>' +
        '</table>'
    ) as BetaRow[];

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      industryName: 'Advertising',
      numberOfFirms: 52,
      beta: 1.21,
      debtToEquityRatio: 0.402,
      effectiveTaxRate: 0.0502,
      rowType: 'industry'
    });
    expect(rows[1]).toMatchObject({
      industryName: 'Total Market',
      numberOfFirms: 5994,
      rowType: 'aggregate'
    });
  });

  it('parses global industry beta rows through the HTML fallback path', () => {
    let rows = extractRowsForSource(
      'global_industry_betas',
      null,
      '<table><tr><td>not the target table</td></tr></table>' +
        '<table>' +
        '<tr><th>Industry Name</th><th>Number of firms</th><th>Beta</th><th>D/E Ratio</th><th>Effective Tax rate</th><th>Unlevered beta</th><th>Cash/Firm value</th><th>Unlevered beta corrected for cash</th><th>HiLo Risk</th><th>Standard deviation of equity</th><th>Standard deviation in operating income (last 10 years)</th></tr>' +
        '<tr><td>Semiconductor Equip</td><td>391</td><td>2.13</td><td>10.55%</td><td>14.40%</td><td>1.94</td><td>12.00%</td><td>2.20</td><td>0.5678</td><td>58.11%</td><td>26.22%</td></tr>' +
        '<tr><td>Total Market (without financials)</td><td>43,056</td><td>1.08</td><td>25.95%</td><td>13.13%</td><td>0.90</td><td>5.52%</td><td>0.96</td><td>0.3765</td><td>43.02%</td><td>24.86%</td></tr>' +
        '</table>'
    ) as BetaRow[];

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      industryName: 'Semiconductor Equip',
      numberOfFirms: 391,
      beta: 2.13,
      debtToEquityRatio: 0.1055,
      rowType: 'industry'
    });
    expect(rows[1]).toMatchObject({
      industryName: 'Total Market (without financials)',
      rowType: 'aggregate'
    });
  });
});
