import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCountry,
  getPokemon,
  getTodo,
  getWeather,
  listPokemon,
  randomCatFact,
  randomDog,
  randomJoke
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getPokemon,
    listPokemon,
    randomDog,
    randomCatFact,
    getCountry,
    randomJoke,
    getWeather,
    getTodo
  ],
  triggers: []
});
