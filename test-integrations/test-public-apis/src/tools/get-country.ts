import { SlateTool } from 'slates';
import { z } from 'zod';
import { restCountriesAxios } from '../clients';
import { spec } from '../spec';

export let getCountry = SlateTool.create(spec, {
  name: 'Get Country',
  key: 'get_country',
  description: `Look up a country by common/official name on the free REST Countries API (https://restcountries.com). Returns the top match.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().min(1).describe('Country name, e.g. "Germany" or "United Kingdom".'),
      fullText: z
        .boolean()
        .default(false)
        .describe('If true, require an exact full-text match.')
    })
  )
  .output(
    z.object({
      commonName: z.string(),
      officialName: z.string(),
      cca2: z.string().nullable(),
      cca3: z.string().nullable(),
      region: z.string().nullable(),
      subregion: z.string().nullable(),
      capital: z.array(z.string()),
      population: z.number(),
      area: z.number().nullable(),
      flagEmoji: z.string().nullable(),
      flagPng: z.string().nullable(),
      languages: z.record(z.string(), z.string()),
      currencies: z.array(
        z.object({ code: z.string(), name: z.string(), symbol: z.string().nullable() })
      )
    })
  )
  .handleInvocation(async ctx => {
    let response = await restCountriesAxios.get(
      `/name/${encodeURIComponent(ctx.input.name.trim())}`,
      {
        params: ctx.input.fullText ? { fullText: 'true' } : undefined
      }
    );

    let list = Array.isArray(response.data) ? response.data : [];
    let country = list[0];
    if (!country) {
      throw new Error(`No country matching "${ctx.input.name}" was returned.`);
    }

    let currencies = country.currencies
      ? Object.entries(country.currencies).map(([code, v]: [string, any]) => ({
          code,
          name: String(v?.name ?? ''),
          symbol: v?.symbol ?? null
        }))
      : [];

    let languages: Record<string, string> = {};
    if (country.languages && typeof country.languages === 'object') {
      for (let [k, v] of Object.entries(country.languages)) {
        languages[k] = String(v ?? '');
      }
    }

    return {
      output: {
        commonName: String(country.name?.common ?? ''),
        officialName: String(country.name?.official ?? ''),
        cca2: country.cca2 ?? null,
        cca3: country.cca3 ?? null,
        region: country.region ?? null,
        subregion: country.subregion ?? null,
        capital: Array.isArray(country.capital) ? country.capital.map(String) : [],
        population: Number(country.population ?? 0),
        area: typeof country.area === 'number' ? country.area : null,
        flagEmoji: country.flag ?? null,
        flagPng: country.flags?.png ?? country.flags?.svg ?? null,
        languages,
        currencies
      },
      message: `${country.flag ?? ''} **${country.name?.common ?? ''}** — capital: **${(country.capital ?? []).join(', ') || 'n/a'}**, population: **${Number(country.population ?? 0).toLocaleString()}**.`
    };
  })
  .build();
