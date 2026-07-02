import { createAxios } from 'slates';

export let pokemonAxios = createAxios({ baseURL: 'https://pokeapi.co/api/v2' });
export let restCountriesAxios = createAxios({ baseURL: 'https://restcountries.com/v3.1' });
export let openMeteoAxios = createAxios({ baseURL: 'https://api.open-meteo.com/v1' });
export let dogCeoAxios = createAxios({ baseURL: 'https://dog.ceo/api' });
export let catFactAxios = createAxios({ baseURL: 'https://catfact.ninja' });
export let chuckNorrisAxios = createAxios({ baseURL: 'https://api.chucknorris.io' });
export let jsonPlaceholderAxios = createAxios({
  baseURL: 'https://jsonplaceholder.typicode.com'
});
