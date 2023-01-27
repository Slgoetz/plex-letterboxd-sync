// TODO: ratings
import xml2js from "xml2js";
import PlexAPI from "plex-api";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import _find from "lodash.find";
import logger from "log-to-file";

// import schedule from 'node-schedule'
dotenv.config();

const optionDefinitions = [
   { name: "ip", type: String },
   { name: "listPath", type: String, multiple: false, defaultOption: true }
];

const client = new PlexAPI({
   hostname: process.env.PLEX_IP,
   token: process.env.PLEX_TOKEN
});

const call = {
   getAllLibraries: "/library/sections",
   getWatchlist: "/library/watchlist",
   getLllMovies: "/library/sections/{id}/all"
   // getWatchlist: "/library/sections/watchlist/all",
};

const getWatchList = async () => {
   return client
      .find(call.getWatchlist)
      .then((res) => {
         console.log(res);
      })
      .catch((err) => {
         console.error("Could not connect to server", err);
      });
};

const getAllLibraries = async () => {
   return client
      .find(call.getAllLibraries, { type: "movie" })
      .then((directories) => {
         const ids = directories.map((library) => {
            return library.key;
         });
         return ids;
      })
      .catch((err) => {
         console.error("Could not connect to server", err);
      });
};

const letterboxd = async () => {
   return await fetch(`https://letterboxd.com/${process.env.USERNAME}/watchlist/`)
      .then((response) => response.text())
      .then((html) => {
         let $ = cheerio.load(html);
         var films = [];
         $(".poster-container").each((i, el) => {
            const filmData = $(el).children().data();
            return films.push(filmData);
         });
         return films;
      });
};
const getLbMovieInfo = async (movies) => {
   const getFilm = async ({ filmId, filmSlug }) => {
      return await fetch(`https://letterboxd.com${filmSlug}`)
         .then((response) => response.text())
         .then((html) => {
            let $ = cheerio.load(html);
            const title = $("h1.headline-1").text().trim();
            const year = $(".film-header-lockup .number a").text();

            return Object.assign({}, { filmId, filmSlug }, { title, year });
         });
   };
   const data = movies.map(async (film) => await getFilm(film));
   return Promise.all(data);
};

const getWatchListMovies = async () => {
   await fetch(
      `https://metadata.provider.plex.tv/library/sections/watchlist/all?X-Plex-Token=${process.env.PLEX_TOKEN}`
   )
      .then((response) => response.text())
      .then((xmlString) => xmlToJSON(xmlString))
      .then((data) => console.log(data.MediaContainer.Video));
};

const syncWatchListMovies = async (plexMovies, LBMovies) => {
   // get avilable Movies
   const availMovies = plexMovies.filter((movie) => {
      const match = _find(LBMovies, { title: movie.title });
      if (match) {
         return match;
      }
   });

   // Sync movies to Plex
   const syncMovie = async (movie) => {
      const uuid = movie.guid.split("/");
      const ratingKey = uuid[uuid.length - 1];
      return await fetch(
         `https://metadata.provider.plex.tv/actions/addToWatchlist?X-Plex-Token=${process.env.PLEX_TOKEN}&ratingKey=${ratingKey}`,
         {
            method: "PUT"
         }
      ).then((res) => {
         if (res.status === 200) {
            const text = `SUCCESS - ${movie.title}`;
            logger(text);
            return text;
         } else {
            const text = `FAIL - ${movie.title}`;
            logger(text);
            return text;
         }
      });
   };

   const data = availMovies.map(async (movie) => await syncMovie(movie));
   return Promise.all(data);
};

const getAllMovies = async (libraries) => {
   const getMoviesFromLib = async (libID) => {
      var url = call.getLllMovies.replace("{id}", libID);
      return client
         .find(url)
         .then((movies) => movies)
         .catch((err) => console.error("Could not connect to server", err));
   };

   var data = libraries.map(async (library) => {
      const libMovies = await getMoviesFromLib(library);
      return libMovies;
   });
   return Promise.all(data).then((res) => res.flat());
};

// TODO:Move to Utils
const xmlToJSON = (str, options) => {
   return new Promise((resolve, reject) => {
      xml2js.parseString(str, options, (err, jsonObj) => {
         if (err) {
            return reject(err);
         }
         resolve(jsonObj);
      });
   });
};

async function run() {
   const libraries = await getAllLibraries();
   const plexMovies = await getAllMovies(libraries);

   // Get Data from LetterBoxd
   const LBWatchList = await letterboxd();
   const LBMovies = await getLbMovieInfo(LBWatchList);
   const watchlist = await syncWatchListMovies(plexMovies, LBMovies);
}

run();
// schedule.scheduleJob("0 0 * * *", run); // run everyday at midnight
