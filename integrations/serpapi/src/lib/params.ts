import { integer, type Params, requireValue, string } from './contracts';

type Input = Record<string, unknown>;
const present = (v: unknown) => v !== undefined;
const fail = (
  i: Input,
  fields: string[],
  engine: string,
  guidance = 'Omit these fields or choose an engine that documents them.'
) => {
  const supplied = fields.filter(f => present(i[f]));
  requireValue(
    !supplied.length,
    `${engine} does not support this tool's ${supplied.join(', ')} option(s). ${guidance}`
  );
};
const map = (p: Params, i: Input, fields: Record<string, string>) => {
  for (const [field, native] of Object.entries(fields))
    if (present(i[field]))
      p[native] =
        typeof i[field] === 'number' ? integer(i[field], field) : string(i[field], field);
};
const locale = (p: Params, i: Input) => map(p, i, { language: 'hl', country: 'gl' });
const market = (p: Params, i: Input, duck = false) => {
  if (present(i.language)) {
    requireValue(
      present(i.country),
      'Provide both language and country for the native market/region code.'
    );
    const language = string(i.language, 'Language', 32),
      country = string(i.country, 'Country', 32);
    p[duck ? 'kl' : 'mkt'] = duck ? `${country}-${language}` : `${language}-${country}`;
  } else if (present(i.country)) {
    requireValue(!duck, 'DuckDuckGo requires country and language together for kl.');
    p.cc = string(i.country, 'Country', 32);
  }
};
const safe = (p: Params, i: Input, key: string, yes: string | number, no: string | number) => {
  if (present(i.safeSearch)) {
    requireValue(typeof i.safeSearch === 'boolean', 'safeSearch must be boolean.');
    p[key] = i.safeSearch ? yes : no;
  }
};
const page = (i: Input, field = 'page', min = 0, max = 100000) =>
  integer(i[field], field, min, max);
const offset = (p: Params, i: Input, native: string, min = 0) => {
  if (present(i.startOffset)) {
    requireValue(
      !present(i.page) && !present(i.pageNumber),
      'Use startOffset or page, not both.'
    );
    p[native] = page(i, 'startOffset', min);
  }
};
const date = (value: unknown, name: string) => {
  const v = string(value, name, 10),
    parsed = new Date(`${v}T00:00:00Z`);
  requireValue(
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === v,
    `${name} must be a real YYYY-MM-DD date.`
  );
  return v;
};

export function searchParams(tool: string, i: Input): Params {
  const p: Params = {};
  for (const [field, native] of Object.entries({ noCache: 'no_cache', async: 'async' }))
    if (present(i[field])) {
      requireValue(typeof i[field] === 'boolean', `${field} must be boolean.`);
      p[native] = i[field] as boolean;
    }
  requireValue(
    p.async !== true || p.no_cache !== true,
    'async and noCache cannot both be true.'
  );
  if (tool === 'web_search') {
    const engine = string(i.engine ?? 'google', 'Engine');
    p.engine = engine;
    p[
      engine === 'yahoo'
        ? 'p'
        : engine === 'yandex'
          ? 'text'
          : engine === 'naver'
            ? 'query'
            : 'q'
    ] = string(
      i.query,
      'Query',
      engine === 'duckduckgo' ? 500 : engine === 'yandex' ? 400 : 8192
    );
    if (engine === 'google') {
      locale(p, i);
      map(p, i, { location: 'location', device: 'device', dateRange: 'as_qdr' });
      safe(p, i, 'safe', 'active', 'off');
      fail(
        i,
        ['numResults'],
        engine,
        'Google no longer supports num. Use page or startOffset; page advances by native 10-result offsets.'
      );
      if (present(i.page)) p.start = page(i) * 10;
      offset(p, i, 'start');
    } else if (engine === 'bing') {
      market(p, i);
      map(p, i, { location: 'location', device: 'device' });
      safe(p, i, 'safeSearch', 'Strict', 'Off');
      fail(
        i,
        ['numResults', 'dateRange'],
        engine,
        'This tool does not expose Bing count/qft filters.'
      );
      if (present(i.page)) p.first = (page(i, 'page', 1) - 1) * 10 + 1;
      offset(p, i, 'first', 1);
    } else if (engine === 'duckduckgo') {
      market(p, i, true);
      safe(p, i, 'safe', 1, -2);
      map(p, i, { dateRange: 'df' });
      fail(i, ['location', 'device'], engine);
      if (present(i.numResults)) p.m = integer(i.numResults, 'numResults', 1, 50);
      if (present(i.page)) {
        requireValue(
          page(i, 'page', 1) === 1,
          'DuckDuckGo page sizes vary. Use native startOffset after page 1.'
        );
        p.start = 0;
      }
      offset(p, i, 'start');
    } else if (engine === 'yahoo') {
      map(p, i, { country: 'vc', device: 'device' });
      if (present(i.language)) p.vl = `lang_${string(i.language, 'Language')}`;
      safe(p, i, 'vm', 'r', 'p');
      fail(
        i,
        ['numResults', 'location', 'dateRange'],
        engine,
        'Yahoo discontinued pz counts. Use page/startOffset and supported localization.'
      );
      if (present(i.page)) p.b = (page(i, 'page', 1) - 1) * 10 + 1;
      offset(p, i, 'b', 1);
    } else if (engine === 'yandex') {
      map(p, i, { language: 'lang', regionId: 'lr', device: 'device' });
      safe(p, i, 'family_mode', 2, 0);
      fail(
        i,
        ['country', 'location', 'startOffset'],
        engine,
        'Use native regionId rather than an ISO country/location name.'
      );
      if (present(i.numResults))
        p.groups_on_page = integer(i.numResults, 'numResults', 1, 100);
      if (present(i.page)) p.p = page(i, 'page', 1) - 1;
      if (present(i.dateRange)) {
        const periods: Record<string, string> = { d: 'day', m: 'month' };
        requireValue(
          typeof i.dateRange === 'string' && periods[i.dateRange],
          'Yandex dateRange supports d or m in this tool.'
        );
        p.period = periods[i.dateRange]!;
      }
    } else if (engine === 'baidu') {
      fail(i, ['country', 'location', 'safeSearch', 'dateRange'], engine);
      map(p, i, { device: 'device' });
      if (present(i.language)) {
        const ct: Record<string, number> = { 'zh-CN': 2, 'zh-TW': 3 };
        requireValue(
          typeof i.language === 'string' && ct[i.language],
          'Baidu language requires zh-CN or zh-TW; omit for all languages.'
        );
        p.ct = ct[i.language]!;
      }
      if (present(i.numResults)) {
        requireValue(i.device !== 'mobile', 'Baidu numResults requires desktop/tablet.');
        p.rn = integer(i.numResults, 'numResults', 1, 50);
      }
      if (present(i.page)) p.pn = (page(i, 'page', 1) - 1) * (Number(p.rn) || 10);
      offset(p, i, 'pn');
    } else if (engine === 'naver') {
      map(p, i, { device: 'device' });
      fail(
        i,
        ['location', 'language', 'country', 'safeSearch', 'numResults', 'startOffset'],
        engine
      );
      if (present(i.page)) p.page = page(i, 'page', 1);
      if (present(i.dateRange)) {
        const periods: Record<string, string> = { d: '1d', w: '1w', m: '1m', y: '1y' };
        requireValue(
          typeof i.dateRange === 'string' && periods[i.dateRange],
          'Naver dateRange requires d, w, m or y.'
        );
        p.period = periods[i.dateRange]!;
      }
    } else requireValue(false, 'Unsupported web engine.');
    if (engine !== 'yandex') fail(i, ['regionId'], engine, 'regionId is specific to Yandex.');
  } else if (tool === 'image_search') {
    const engine = string(i.engine ?? 'google_images', 'Engine');
    p.engine = engine;
    if (engine === 'google_lens' || engine === 'yandex_images') {
      if (present(i.imageUrl)) {
        const raw = string(i.imageUrl, 'Image URL');
        let url: URL | undefined;
        try {
          url = new URL(raw);
        } catch {}
        requireValue(
          url && ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password,
          'Image URL must be HTTP(S) without embedded credentials.'
        );
        p.url = url.href;
      }
      requireValue(engine !== 'google_lens' || p.url, 'Google Lens requires imageUrl.');
      if (present(i.query))
        p[engine === 'yandex_images' ? 'text' : 'q'] = string(i.query, 'Query');
      requireValue(
        p.url || p.text || engine === 'google_lens',
        'Yandex Images requires query or imageUrl.'
      );
    } else {
      fail(
        i,
        ['imageUrl'],
        engine,
        'Select google_lens or yandex_images for reverse URL search.'
      );
      p[engine === 'yahoo_images' ? 'p' : 'q'] = string(i.query, 'Query');
    }
    if (engine === 'google_images') {
      locale(p, i);
      map(p, i, { location: 'location', device: 'device' });
      safe(p, i, 'safe', 'active', 'off');
      if (present(i.pageNumber)) p.ijn = page(i, 'pageNumber', 0, 99);
      fail(i, ['startOffset'], engine);
    } else if (engine === 'bing_images') {
      market(p, i);
      map(p, i, { device: 'device' });
      safe(p, i, 'safeSearch', 'strict', 'off');
      fail(i, ['location'], engine);
      if (present(i.pageNumber)) {
        requireValue(
          page(i, 'pageNumber') === 0,
          'Bing Images page size varies. Use native startOffset after page 0.'
        );
        p.first = 1;
      }
      offset(p, i, 'first', 1);
    } else if (engine === 'yahoo_images') {
      fail(i, ['location', 'language', 'country', 'safeSearch', 'startOffset'], engine);
      map(p, i, { device: 'device' });
      if (present(i.pageNumber)) p.b = page(i, 'pageNumber') * 60 + 1;
    } else if (engine === 'yandex_images') {
      fail(i, ['location', 'language', 'country', 'device', 'startOffset'], engine);
      safe(p, i, 'family_mode', 2, 0);
      if (present(i.pageNumber)) p.p = page(i, 'pageNumber');
    } else if (engine === 'google_lens') {
      fail(i, ['location', 'device', 'pageNumber', 'startOffset'], engine);
      map(p, i, { language: 'hl', country: 'country' });
      safe(p, i, 'safe', 'active', 'off');
    } else requireValue(false, 'Unsupported image engine.');
  } else if (tool === 'news_search') {
    const engine = string(i.engine ?? 'google_news', 'Engine');
    p.engine = engine;
    if (engine === 'google_news') {
      requireValue(
        ['query', 'topicToken', 'storyToken', 'publicationToken'].filter(f => present(i[f]))
          .length <= 1,
        'Use only one Google News query/topic/story/publication selector.'
      );
      map(p, i, {
        query: 'q',
        topicToken: 'topic_token',
        storyToken: 'story_token',
        publicationToken: 'publication_token'
      });
      locale(p, i);
    } else {
      fail(i, ['topicToken', 'storyToken', 'publicationToken'], engine);
      requireValue(
        ['bing_news', 'duckduckgo_news'].includes(engine),
        'Unsupported news engine.'
      );
      p.q = string(i.query, 'News query', engine === 'duckduckgo_news' ? 500 : 8192);
      market(p, i, engine === 'duckduckgo_news');
    }
  } else if (tool === 'video_search') {
    const engine = string(i.engine ?? 'youtube', 'Engine');
    p.engine = engine;
    p[engine === 'youtube' ? 'search_query' : 'q'] = string(i.query, 'Query');
    locale(p, i);
    if (engine === 'youtube') {
      requireValue(
        !present(i.sortBy) || !present(i.nextPageToken),
        'Use sortBy or nextPageToken, not both; both use native sp.'
      );
      map(p, i, { sortBy: 'sp', nextPageToken: 'sp' });
      fail(i, ['startOffset'], engine);
    } else {
      requireValue(engine === 'google_videos', 'Unsupported video engine.');
      fail(
        i,
        ['sortBy', 'nextPageToken'],
        engine,
        'YouTube sp tokens do not apply to Google Videos.'
      );
      offset(p, i, 'start');
    }
  } else if (tool === 'shopping_search') {
    const engine = string(i.engine ?? 'google_shopping', 'Engine');
    p.engine = engine;
    p[
      engine === 'amazon'
        ? 'k'
        : engine === 'walmart'
          ? 'query'
          : engine === 'ebay'
            ? '_nkw'
            : 'q'
    ] = string(i.query, 'Product query');
    if (engine === 'google_shopping') {
      locale(p, i);
      map(p, i, { location: 'location', device: 'device', sortBy: 'sort_by' });
      if (present(i.page))
        requireValue(
          page(i, 'page', 1) === 1,
          'Google Shopping ignores offset pagination in its current layout. Only page 1 can be requested.'
        );
      if (present(i.sortBy))
        requireValue(
          ['1', '2'].includes(String(i.sortBy)),
          'Google Shopping sortBy requires 1 (ascending price) or 2 (descending).'
        );
    } else if (engine === 'amazon') {
      map(p, i, {
        amazonDomain: 'amazon_domain',
        language: 'language',
        country: 'shipping_location',
        sortBy: 's',
        device: 'device'
      });
      fail(i, ['location'], engine, 'A general location is not a postal code.');
      if (present(i.page)) p.page = page(i, 'page', 1);
    } else if (engine === 'walmart') {
      map(p, i, { sortBy: 'sort', device: 'device' });
      fail(i, ['location', 'language', 'country'], engine);
      if (present(i.page)) p.page = page(i, 'page', 1, 100);
    } else if (engine === 'ebay') {
      map(p, i, { sortBy: '_sop', device: 'device' });
      fail(
        i,
        ['location', 'language', 'country'],
        engine,
        'eBay localization requires native domain/numeric codes, not ISO country.'
      );
      if (present(i.page)) p._pgn = page(i, 'page', 1);
    } else if (engine === 'home_depot') {
      map(p, i, { country: 'country' });
      fail(i, ['location', 'language', 'device'], engine);
      if (present(i.country))
        requireValue(
          ['us', 'ca'].includes(String(i.country)),
          'Home Depot country requires us or ca.'
        );
      if (present(i.sortBy))
        p[i.country === 'ca' ? 'sort' : 'hd_sort'] = string(i.sortBy, 'sortBy');
      if (present(i.page)) p.page = page(i, 'page', 1);
    } else requireValue(false, 'Unsupported shopping engine.');
    if (engine !== 'amazon') fail(i, ['amazonDomain'], engine, 'amazonDomain is Amazon-only.');
  } else if (tool === 'maps_search') {
    p.engine = 'google_maps';
    requireValue(
      present(i.query) !== present(i.dataCid),
      'Provide exactly one query or dataCid.'
    );
    locale(p, i);
    if (present(i.dataCid)) {
      p.data_cid = string(i.dataCid, 'dataCid');
      requireValue(
        /^\d+$/.test(String(i.dataCid)),
        'dataCid must be the exact decimal native ID as text.'
      );
      fail(i, ['coordinates', 'page'], 'Google Maps place lookup');
    } else {
      p.q = string(i.query, 'Query');
      p.type = 'search';
      map(p, i, { coordinates: 'll' });
      if (present(i.coordinates)) {
        const m = /^@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)(z|m)$/.exec(
          String(i.coordinates)
        );
        requireValue(
          m &&
            Math.abs(Number(m[1])) <= 90 &&
            Math.abs(Number(m[2])) <= 180 &&
            (m[4] === 'z'
              ? Number(m[3]) >= 3 && Number(m[3]) <= 30
              : Number(m[3]) >= 1 && Number(m[3]) <= 15028132),
          'coordinates requires native @latitude,longitude,zoomz (3–30) or heightm.'
        );
      }
      if (present(i.page)) p.start = page(i) * 20;
    }
  } else if (tool === 'flights_search') {
    p.engine = 'google_flights';
    p.departure_id = string(i.departureAirport, 'Departure airport');
    p.arrival_id = string(i.arrivalAirport, 'Arrival airport');
    for (const id of [p.departure_id, p.arrival_id])
      requireValue(
        /^(?:[A-Z]{3}|\/[mg]\/[A-Za-z0-9_-]+)(?:,(?:[A-Z]{3}|\/[mg]\/[A-Za-z0-9_-]+))*$/.test(
          String(id)
        ),
        'Airport requires native IATA or /m/ or /g/ ID, optionally comma separated.'
      );
    p.outbound_date = date(i.outboundDate, 'Outbound date');
    p.type = present(i.returnDate) ? '1' : '2';
    if (present(i.returnDate)) {
      p.return_date = date(i.returnDate, 'Return date');
      requireValue(
        p.return_date >= p.outbound_date,
        'Return date must not precede outbound date.'
      );
    }
    locale(p, i);
    map(p, i, { currency: 'currency', travelClass: 'travel_class', stops: 'stops' });
    if (present(i.adults)) p.adults = integer(i.adults, 'Adults', 1, 9);
  } else if (tool === 'scholar_search') {
    map(p, i, { language: 'hl' });
    if (present(i.authorId)) {
      p.engine = 'google_scholar_author';
      p.author_id = string(i.authorId, 'Author ID');
      fail(
        i,
        ['query', 'cites', 'yearLow', 'yearHigh'],
        'Scholar author lookup',
        'Year filters apply to article search.'
      );
      if (present(i.page)) p.start = page(i) * 20;
      if (present(i.sortByDate) && i.sortByDate) p.sort = 'pubdate';
    } else {
      p.engine = 'google_scholar';
      requireValue(present(i.query) || present(i.cites), 'Provide query, cites or authorId.');
      map(p, i, { query: 'q', cites: 'cites' });
      if (present(i.yearLow)) p.as_ylo = integer(i.yearLow, 'yearLow', 1, 9999);
      if (present(i.yearHigh)) p.as_yhi = integer(i.yearHigh, 'yearHigh', 1, 9999);
      requireValue(
        p.as_ylo === undefined ||
          p.as_yhi === undefined ||
          Number(p.as_ylo) <= Number(p.as_yhi),
        'yearLow must not exceed yearHigh.'
      );
      if (present(i.page)) p.start = page(i) * 10;
      if (present(i.sortByDate)) p.scisbd = i.sortByDate ? '1' : '0';
    }
  } else if (tool === 'google_trends') {
    map(p, i, { geo: 'geo', language: 'hl' });
    if (i.dataType === 'trending_now') {
      p.engine = 'google_trends_trending_now';
      fail(
        i,
        ['query', 'category', 'timeRange'],
        'Trending Now',
        'Use hours/trendingCategoryId; categories differ from Google Trends.'
      );
      map(p, i, { trendingCategoryId: 'category_id' });
      if (present(i.hours)) {
        requireValue(
          [4, 24, 48, 168].includes(Number(i.hours)),
          'Trending Now hours requires 4, 24, 48 or 168.'
        );
        p.hours = Number(i.hours);
      }
    } else {
      p.engine = 'google_trends';
      const types: Record<string, string> = {
        interest_over_time: 'TIMESERIES',
        compared_breakdown_by_region: 'GEO_MAP',
        related_queries: 'RELATED_QUERIES',
        related_topics: 'RELATED_TOPICS'
      };
      const type = types[String(i.dataType ?? 'interest_over_time')];
      requireValue(type, 'Unsupported trends type.');
      p.data_type = type;
      p.q = string(i.query, 'Query');
      const terms = String(p.q).split(',');
      requireValue(
        terms.every(q => q.trim().length > 0 && q.length <= 100) &&
          terms.length <= (type.startsWith('RELATED_') ? 1 : 5),
        'Trends requires 1–5 nonempty terms of at most 100 characters; related data accepts one.'
      );
      requireValue(
        type !== 'GEO_MAP' || terms.length >= 2,
        'compared_breakdown_by_region requires at least two terms.'
      );
      map(p, i, { category: 'cat', timeRange: 'date' });
      fail(
        i,
        ['hours', 'trendingCategoryId'],
        'Google Trends',
        'These fields apply only to Trending Now.'
      );
    }
  } else if (tool === 'jobs_search') {
    p.engine = 'google_jobs';
    p.q = string(i.query, 'Query');
    locale(p, i);
    map(p, i, { location: 'location', nextPageToken: 'next_page_token', filterToken: 'uds' });
    fail(
      i,
      ['chips', 'startIndex'],
      'Google Jobs',
      'Google discontinued start and deprecated chips. Use nextPageToken and filterToken from native responses.'
    );
  } else if (tool === 'autocomplete') {
    p.engine = 'google_autocomplete';
    p.q = string(i.query, 'Query');
    locale(p, i);
  } else requireValue(false, 'Unsupported search tool.');
  return p;
}
