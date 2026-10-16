# Twelve Data

Retrieve available market quotes, OHLCV history, end-of-day closes, currency rates and conversions, company fundamentals, corporate actions, earnings, analyst estimates, and global ETF or mutual-fund data. Discover symbols, exchanges, technical indicators, market session state, and API credit usage.

Connect with a Twelve Data API key. Coverage, freshness, and access depend on the instrument, exchange, subscription, and data entitlements. Use quote timestamps and market-session state to assess availability; the price-only endpoint does not return a timestamp. Daily and longer time-series intervals use exchange local time, even when an intraday timezone is supplied.

Use `get_earnings_history` for the documented earnings periods `latest` and `next`, and `get_fund_data` for current global ETF and mutual-fund datasets. The legacy `get_earnings`, `get_etf_details`, and `get_mutual_fund_details` tools remain registered for existing workflows and are deprecated. This integration exposes REST tools and does not provide streaming subscriptions or triggers.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
