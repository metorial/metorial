# <img src="logo.jpg" height="20"> Zenserp

Retrieve structured web results from Google, Bing, Yandex, and DuckDuckGo. Search Google Images, News, Shopping, local businesses, and YouTube, or look up pages matching a public image URL. Fetch shopping product details by product ID, with an optional matching product cluster ID for merchant offers. Check remaining API request quota and retrieve current Google trending searches.

Google image pagination uses `page` rather than the result-offset `start`. Maps, Shopping, and reverse-image searches currently do not support `start` pagination. Bing allows up to 50 results per request. Provider filters vary by search engine.

Zenserp's current Trends API returns Trending now data for up to seven days. Historical interest-over-time and keyword comparison reports are unavailable; legacy `google_trends` report types and historical timeframes return an actionable error. Use `trending_searches` for current country trends or `google_trends` to filter them by keyword.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
