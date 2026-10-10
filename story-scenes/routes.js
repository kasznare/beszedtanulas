import { createRoutesArt } from '../story-art/routes.js';

// Timing entries below are original Noémi recording paragraph/word boundaries.
const TIMED_STORIES = [
  {
    "id": "story-04",
    "duration": 746.448,
    "scenes": [
      {
        "sourceIndex": 0,
        "id": "friends",
        "title": "Három különböző barát",
        "stage": "road",
        "action": "introduce",
        "variant": "race",
        "time": 0,
        "setting": "road",
        "rolling": 180,
        "length": 6.699,
        "stillTime": 4.354
      },
      {
        "sourceIndex": 1,
        "id": "villam",
        "title": "Villám, a piros versenyautó",
        "stage": "road",
        "action": "introduce",
        "cast": [
          "villam"
        ],
        "variant": "race",
        "time": 6.699,
        "setting": "road",
        "rolling": 180,
        "length": 12.699,
        "stillTime": 14.953
      },
      {
        "sourceIndex": 3,
        "id": "turbo",
        "title": "Turbó és a hatalmas hátsó szárny",
        "stage": "road",
        "action": "introduce",
        "cast": [
          "turbo"
        ],
        "variant": "race",
        "time": 19.398,
        "setting": "road",
        "rolling": 180,
        "length": 14.522,
        "stillTime": 28.837
      },
      {
        "sourceIndex": 6,
        "id": "potty",
        "title": "Pötty, a figyelmes kék autó",
        "stage": "road",
        "action": "introduce",
        "cast": [
          "potty"
        ],
        "variant": "race",
        "time": 33.92,
        "setting": "road",
        "rolling": 180,
        "length": 13.896,
        "stillTime": 42.952
      },
      {
        "sourceIndex": 9,
        "id": "manners",
        "title": "Először megállunk",
        "stage": "road",
        "action": "manners",
        "sign": [
          "KÉRLEK",
          "KÖSZÖNÖM",
          "ÁLLJ!"
        ],
        "signY": 250,
        "time": 47.816,
        "setting": "road",
        "rolling": 0,
        "length": 28.005,
        "stillTime": 57.816
      },
      {
        "sourceIndex": 20,
        "id": "teasing",
        "title": "A barátok csúfolódnak",
        "stage": "road",
        "action": "teasing",
        "time": 75.821,
        "setting": "road",
        "rolling": 0,
        "length": 31.516,
        "stillTime": 85.821
      },
      {
        "sourceIndex": 26,
        "id": "mountain",
        "title": "Verseny a Fekete-hegyen",
        "stage": "road",
        "action": "drive",
        "sign": [
          "FEKETE-HEGY",
          "ALAGÚT →"
        ],
        "time": 107.337,
        "setting": "road",
        "rolling": 180,
        "length": 12.434,
        "stillTime": 115.419
      },
      {
        "sourceIndex": 28,
        "id": "judge",
        "title": "Az öreg pályabíró",
        "stage": "road",
        "action": "conversation",
        "judge": true,
        "variant": "race",
        "time": 119.771,
        "setting": "road",
        "rolling": 0,
        "length": 67.327,
        "stillTime": 129.771
      },
      {
        "sourceIndex": 46,
        "id": "warning",
        "title": "A piros lámpa szabálya",
        "stage": "road",
        "action": "conversation",
        "judge": true,
        "signal": "red",
        "sign": [
          "PIROS: ÁLLJ!",
          "MUNKÁSOK AZ ALAGÚTBAN"
        ],
        "signX": 785,
        "signY": 195,
        "time": 187.098,
        "setting": "road",
        "rolling": 0,
        "length": 24.694,
        "stillTime": 197.098
      },
      {
        "sourceIndex": 49,
        "id": "start",
        "title": "Piros, sárga, zöld!",
        "stage": "road",
        "action": "race",
        "variant": "race",
        "signal": "green",
        "time": 211.792,
        "setting": "road",
        "rolling": 180,
        "length": 20.492,
        "stillTime": 221.792
      },
      {
        "sourceIndex": 58,
        "id": "climb",
        "title": "Felfelé, kanyarról kanyarra",
        "stage": "road",
        "action": "climb",
        "time": 232.284,
        "setting": "road",
        "rolling": 180,
        "length": 15.359,
        "stillTime": 242.267
      },
      {
        "sourceIndex": 66,
        "id": "red",
        "title": "Pötty fékez a pirosnál",
        "stage": "entrance",
        "action": "red-stop",
        "signal": "red",
        "time": 247.643,
        "setting": "entrance",
        "rolling": 0,
        "length": 12.473,
        "stillTime": 255.75
      },
      {
        "sourceIndex": 72,
        "id": "rush",
        "title": "Ketten behajtanak",
        "stage": "entrance",
        "action": "rush",
        "signal": "red",
        "time": 260.116,
        "setting": "entrance",
        "rolling": 0,
        "length": 38.524,
        "stillTime": 270.116
      },
      {
        "sourceIndex": 84,
        "id": "wait",
        "title": "Pötty a lámpánál vár",
        "stage": "entrance",
        "action": "wait",
        "cast": [
          "potty"
        ],
        "signal": "red",
        "time": 298.64,
        "setting": "entrance",
        "rolling": 0,
        "length": 35.27,
        "stillTime": 308.64
      },
      {
        "sourceIndex": 99,
        "id": "dust",
        "title": "Por az alagútból",
        "stage": "entrance",
        "action": "dust",
        "cast": [
          "potty"
        ],
        "signal": "red",
        "dust": true,
        "radio": true,
        "time": 333.91,
        "setting": "entrance",
        "rolling": 0,
        "length": 13.098,
        "stillTime": 342.424
      },
      {
        "sourceIndex": 102,
        "id": "incident",
        "title": "Mi történt odabent?",
        "stage": "tunnel",
        "action": "incident",
        "cast": [
          "villam",
          "turbo"
        ],
        "truck": true,
        "time": 347.008,
        "setting": "tunnel",
        "rolling": 0,
        "length": 52.979,
        "stillTime": 357.008
      },
      {
        "sourceIndex": 120,
        "id": "rescue",
        "title": "Megérkezik a mentőcsapat",
        "stage": "entrance",
        "action": "conversation",
        "cast": [
          "potty"
        ],
        "signal": "red",
        "rescue": true,
        "time": 399.987,
        "setting": "entrance",
        "rolling": 0,
        "length": 17.034,
        "stillTime": 409.987
      },
      {
        "sourceIndex": 126,
        "id": "explanation",
        "title": "A szabály vigyázott Pöttyre",
        "stage": "entrance",
        "action": "conversation",
        "cast": [
          "potty"
        ],
        "judge": true,
        "signal": "red",
        "time": 417.021,
        "setting": "entrance",
        "rolling": 0,
        "length": 32.979,
        "stillTime": 427.021
      },
      {
        "sourceIndex": 136,
        "id": "repair",
        "title": "Új kerék és motorháztető",
        "stage": "garage",
        "action": "repair",
        "cast": [
          "villam",
          "turbo"
        ],
        "time": 450.0,
        "setting": "garage",
        "rolling": 0,
        "length": 11.17,
        "stillTime": 457.26
      },
      {
        "sourceIndex": 139,
        "id": "apology",
        "title": "Bocsánat és megbocsátás",
        "stage": "garage",
        "action": "conversation",
        "time": 461.17,
        "setting": "garage",
        "rolling": 0,
        "length": 58.458,
        "stillTime": 471.17
      },
      {
        "sourceIndex": 157,
        "id": "new-race",
        "title": "A következő verseny",
        "stage": "road",
        "action": "conversation",
        "judge": true,
        "variant": "race",
        "time": 519.628,
        "setting": "road",
        "rolling": 0,
        "length": 40.492,
        "stillTime": 529.628
      },
      {
        "sourceIndex": 171,
        "id": "listen",
        "title": "Most már mindhárman figyelnek",
        "stage": "road",
        "action": "conversation",
        "judge": true,
        "variant": "race",
        "sign": [
          "FIGYELJÜNK EGYMÁSRA"
        ],
        "time": 560.12,
        "setting": "road",
        "rolling": 0,
        "length": 24.933,
        "stillTime": 570.12
      },
      {
        "sourceIndex": 178,
        "id": "second-start",
        "title": "Újra rajt!",
        "stage": "road",
        "action": "race",
        "variant": "race",
        "signal": "green",
        "time": 585.053,
        "setting": "road",
        "rolling": 180,
        "length": 17.519,
        "stillTime": 595.053
      },
      {
        "sourceIndex": 185,
        "id": "deer",
        "title": "Lassíts! Őz az úton",
        "stage": "road",
        "action": "deer",
        "deer": true,
        "time": 602.572,
        "setting": "road",
        "rolling": 0,
        "length": 46.054,
        "stillTime": 612.572
      },
      {
        "sourceIndex": 202,
        "id": "continue",
        "title": "Biztonságosan tovább",
        "stage": "road",
        "action": "drive",
        "time": 648.626,
        "setting": "road",
        "rolling": 180,
        "length": 3.085,
        "stillTime": 650.631
      },
      {
        "sourceIndex": 203,
        "id": "winner",
        "title": "Pötty nyeri a versenyt",
        "stage": "road",
        "action": "podium",
        "podium": true,
        "variant": "finish",
        "time": 651.711,
        "setting": "road",
        "rolling": 0,
        "length": 35.864,
        "stillTime": 661.711
      },
      {
        "sourceIndex": 215,
        "id": "kindness",
        "title": "Versenyzés és tisztelet",
        "stage": "road",
        "action": "conversation",
        "variant": "finish",
        "judge": true,
        "time": 687.575,
        "setting": "road",
        "rolling": 0,
        "length": 28.072,
        "stillTime": 697.575
      },
      {
        "sourceIndex": 223,
        "id": "stop-rule",
        "title": "Állj! Először megállunk",
        "stage": "road",
        "action": "conversation",
        "signal": "red",
        "sign": [
          "ELŐSZÖR MEGÁLLUNK",
          "AZTÁN KÉRDEZÜNK"
        ],
        "time": 715.647,
        "setting": "road",
        "rolling": 0,
        "length": 21.263,
        "stillTime": 725.647
      },
      {
        "sourceIndex": 229,
        "id": "ending",
        "title": "Az üresnek látszó alagút",
        "stage": "entrance",
        "action": "tunnel-ending",
        "cast": [
          "potty"
        ],
        "signal": "red",
        "time": 736.91,
        "setting": "entrance",
        "rolling": 0,
        "length": 9.538,
        "stillTime": 743.11
      }
    ]
  },
  {
    "id": "story-05",
    "duration": 747.816,
    "scenes": [
      {
        "sourceIndex": 0,
        "id": "rain",
        "title": "Eső Autóvárosban",
        "stage": "garage",
        "action": "conversation",
        "time": 0,
        "setting": "garage",
        "weather": "rain",
        "rolling": 0,
        "length": 24.837,
        "stillTime": 10
      },
      {
        "sourceIndex": 3,
        "id": "splash",
        "title": "Turbó és a pocsolya",
        "stage": "garage",
        "action": "splash",
        "splash": true,
        "splashStart": 28.71,
        "splashEnd": 36.54,
        "time": 24.837,
        "setting": "garage",
        "weather": "rain",
        "rolling": 180,
        "length": 21.915,
        "stillTime": 34.837
      },
      {
        "sourceIndex": 11,
        "id": "alarm",
        "title": "A hegyi vészjelző",
        "stage": "garage",
        "action": "conversation",
        "radio": true,
        "time": 46.752,
        "setting": "garage",
        "weather": "rain",
        "rolling": 0,
        "length": 16.583,
        "stillTime": 56.752
      },
      {
        "sourceIndex": 17,
        "id": "radio",
        "title": "Eltűnt az iskolabusz",
        "stage": "garage",
        "action": "conversation",
        "radio": true,
        "sign": [
          "ELTŰNT ISKOLABUSZ"
        ],
        "signY": 230,
        "time": 63.335,
        "setting": "garage",
        "weather": "rain",
        "rolling": 0,
        "length": 24.813,
        "stillTime": 73.335
      },
      {
        "sourceIndex": 22,
        "id": "judge",
        "title": "A pályabíró kérése",
        "stage": "garage",
        "action": "judge-arrives",
        "judge": true,
        "time": 88.148,
        "setting": "garage",
        "weather": "rain",
        "rolling": 0,
        "length": 45.373,
        "stillTime": 98.148
      },
      {
        "sourceIndex": 36,
        "id": "stay",
        "title": "A három autó marad",
        "stage": "garage",
        "action": "conversation",
        "judge": true,
        "time": 133.521,
        "setting": "garage",
        "weather": "rain",
        "rolling": 0,
        "length": 25.173,
        "stillTime": 143.521
      },
      {
        "sourceIndex": 45,
        "id": "waiting",
        "title": "Várakozás az esőben",
        "stage": "garage",
        "action": "conversation",
        "time": 158.694,
        "setting": "garage",
        "weather": "rain",
        "rolling": 0,
        "length": 24.853,
        "stillTime": 168.694
      },
      {
        "sourceIndex": 54,
        "id": "knock",
        "title": "Halk kopogás hátulról",
        "stage": "garage",
        "action": "conversation",
        "radio": true,
        "time": 183.547,
        "setting": "garage",
        "weather": "rain",
        "rolling": 0,
        "length": 17.899,
        "stillTime": 193.547
      },
      {
        "sourceIndex": 61,
        "id": "tracks",
        "title": "Széles keréknyomok",
        "stage": "road",
        "action": "tracks",
        "tracks": true,
        "time": 201.446,
        "setting": "road",
        "weather": "rain",
        "rolling": 0,
        "length": 34.03,
        "stillTime": 211.446
      },
      {
        "sourceIndex": 73,
        "id": "muddy",
        "title": "Lassan a szervizúton",
        "stage": "road",
        "action": "drive",
        "tracks": true,
        "time": 235.476,
        "setting": "road",
        "weather": "rain",
        "rolling": 180,
        "length": 7.539,
        "stillTime": 240.376
      },
      {
        "sourceIndex": 76,
        "id": "broken-bridge",
        "title": "A leszakadt fahíd",
        "stage": "road",
        "action": "bridge",
        "bridge": "broken",
        "cast": [
          "potty",
          "turbo",
          "villam"
        ],
        "time": 243.015,
        "setting": "road",
        "weather": "rain",
        "rolling": 0,
        "length": 13.87,
        "stillTime": 252.03
      },
      {
        "sourceIndex": 81,
        "id": "bus",
        "title": "A busz a patakparton",
        "stage": "road",
        "action": "bridge",
        "bridge": "broken",
        "bus": true,
        "time": 256.885,
        "setting": "road",
        "weather": "rain",
        "rolling": 0,
        "length": 6.968,
        "stillTime": 261.414
      },
      {
        "sourceIndex": 83,
        "id": "mud-stop",
        "title": "Villám megáll a csúszó sárnál",
        "stage": "road",
        "action": "mud-stop",
        "bridge": "broken",
        "bus": true,
        "time": 263.853,
        "setting": "road",
        "weather": "rain",
        "rolling": 0,
        "length": 23.524,
        "stillTime": 273.853
      },
      {
        "sourceIndex": 91,
        "id": "bus-talk",
        "title": "Mindenki életben van",
        "stage": "road",
        "action": "bus-talk",
        "bridge": "broken",
        "bus": true,
        "time": 287.377,
        "setting": "road",
        "weather": "rain",
        "rolling": 0,
        "length": 37.028,
        "stillTime": 297.377
      },
      {
        "sourceIndex": 103,
        "id": "radio-fails",
        "title": "A rádió nem működik",
        "stage": "road",
        "action": "bus-talk",
        "bridge": "broken",
        "bus": true,
        "radio": true,
        "time": 324.405,
        "setting": "road",
        "weather": "rain",
        "rolling": 0,
        "length": 9.601,
        "stillTime": 330.646
      },
      {
        "sourceIndex": 107,
        "id": "go-for-help",
        "title": "Villám a tűzoltókért indul",
        "stage": "road",
        "action": "leave-for-help",
        "bridge": "broken",
        "bus": true,
        "time": 334.006,
        "setting": "road",
        "weather": "rain",
        "rolling": 0,
        "length": 35.665,
        "stillTime": 344.006
      },
      {
        "sourceIndex": 121,
        "id": "waiting-bus",
        "title": "Segítség úton van",
        "stage": "road",
        "action": "bus-talk",
        "bridge": "broken",
        "bus": true,
        "cast": [
          "potty",
          "turbo"
        ],
        "time": 369.671,
        "setting": "road",
        "weather": "rain",
        "rolling": 0,
        "length": 41.821,
        "stillTime": 379.671
      },
      {
        "sourceIndex": 133,
        "id": "bus-slips",
        "title": "A busz megcsúszik",
        "stage": "road",
        "action": "slip",
        "bridge": "broken",
        "bus": true,
        "cast": [
          "potty",
          "turbo"
        ],
        "time": 411.492,
        "setting": "road",
        "weather": "rain",
        "rolling": 0,
        "length": 10.04,
        "stillTime": 418.018
      },
      {
        "sourceIndex": 137,
        "id": "find-cable",
        "title": "Kábel a régi híd mellett",
        "stage": "road",
        "action": "cable",
        "bridge": "broken",
        "bus": true,
        "cable": true,
        "cast": [
          "potty",
          "turbo"
        ],
        "time": 421.532,
        "setting": "road",
        "weather": "rain",
        "rolling": 0,
        "length": 22.194,
        "stillTime": 431.532
      },
      {
        "sourceIndex": 143,
        "id": "careful",
        "title": "Pötty figyelmezteti Turbót",
        "stage": "road",
        "action": "careful-cable",
        "bridge": "broken",
        "bus": true,
        "cable": true,
        "cast": [
          "potty",
          "turbo"
        ],
        "time": 443.726,
        "setting": "road",
        "weather": "rain",
        "rolling": 0,
        "length": 27.54,
        "stillTime": 453.726
      },
      {
        "sourceIndex": 153,
        "id": "tie",
        "title": "A fától a buszig",
        "stage": "road",
        "action": "tie-cable",
        "bridge": "broken",
        "bus": true,
        "cable": true,
        "cast": [
          "potty",
          "turbo"
        ],
        "time": 471.266,
        "setting": "road",
        "weather": "rain",
        "rolling": 0,
        "length": 17.5,
        "stillTime": 481.266
      },
      {
        "sourceIndex": 158,
        "id": "hold",
        "title": "A megfeszülő kábel megtartja",
        "stage": "road",
        "action": "hold",
        "bridge": "broken",
        "bus": true,
        "cable": true,
        "cast": [
          "potty",
          "turbo"
        ],
        "time": 488.766,
        "setting": "road",
        "weather": "rain",
        "rolling": 0,
        "length": 19.655,
        "stillTime": 498.766
      },
      {
        "sourceIndex": 166,
        "id": "arrival",
        "title": "Villám és a mentők visszatérnek",
        "stage": "road",
        "action": "bridge",
        "bridge": "broken",
        "bus": true,
        "cable": true,
        "rescue": true,
        "time": 508.421,
        "setting": "road",
        "weather": "rain",
        "rolling": 0,
        "length": 12.619,
        "stillTime": 516.623
      },
      {
        "sourceIndex": 169,
        "id": "crane",
        "title": "A daru szilárd talajra húz",
        "stage": "road",
        "action": "crane",
        "bridge": "broken",
        "bus": true,
        "cable": true,
        "rescue": true,
        "time": 521.04,
        "setting": "road",
        "weather": "rain",
        "rolling": 0,
        "length": 7.859,
        "stillTime": 526.148
      },
      {
        "sourceIndex": 171,
        "id": "children",
        "title": "Hat gyerek és a sofőr biztonságban",
        "stage": "road",
        "action": "bus-children",
        "bridge": "broken",
        "bus": true,
        "rescue": true,
        "children": true,
        "time": 528.899,
        "setting": "road",
        "weather": "rain",
        "rolling": 0,
        "length": 23.631,
        "stillTime": 538.899
      },
      {
        "sourceIndex": 181,
        "id": "home",
        "title": "Vissza a garázshoz",
        "stage": "garage",
        "action": "conversation",
        "judge": true,
        "time": 552.53,
        "setting": "garage",
        "weather": "rain",
        "rolling": 0,
        "length": 29.361,
        "stillTime": 562.53
      },
      {
        "sourceIndex": 191,
        "id": "map",
        "title": "Valakinek itt is maradnia kellett",
        "stage": "garage",
        "action": "conversation",
        "judge": true,
        "map": true,
        "mapX": 360,
        "mapY": 238,
        "mapScale": 0.76,
        "time": 581.891,
        "setting": "garage",
        "weather": "rain",
        "rolling": 0,
        "length": 45.307,
        "stillTime": 591.891
      },
      {
        "sourceIndex": 198,
        "id": "understanding",
        "title": "Villám megérti a feladatot",
        "stage": "garage",
        "action": "conversation",
        "judge": true,
        "time": 627.198,
        "setting": "garage",
        "weather": "rain",
        "rolling": 0,
        "length": 39.082,
        "stillTime": 637.198
      },
      {
        "sourceIndex": 210,
        "id": "night",
        "title": "Egyedül senki sem mentette meg",
        "stage": "garage",
        "action": "conversation",
        "night": true,
        "time": 666.28,
        "setting": "garage",
        "weather": "rain",
        "rolling": 0,
        "length": 48.471,
        "stillTime": 676.28
      },
      {
        "sourceIndex": 227,
        "id": "night-knock",
        "title": "Újabb kopogás az esőben",
        "stage": "garage",
        "action": "conversation",
        "night": true,
        "time": 714.751,
        "setting": "garage",
        "weather": "rain",
        "rolling": 0,
        "length": 13.099,
        "stillTime": 723.265
      },
      {
        "sourceIndex": 232,
        "id": "headlights",
        "title": "A három fényszóró kigyullad",
        "stage": "garage",
        "action": "conversation",
        "night": true,
        "headlights": true,
        "time": 727.85,
        "setting": "garage",
        "weather": "rain",
        "rolling": 0,
        "length": 10.93,
        "stillTime": 734.955
      },
      {
        "sourceIndex": 236,
        "id": "departure",
        "title": "Újra együtt indulnak",
        "stage": "garage",
        "action": "night-depart",
        "night": true,
        "headlights": true,
        "time": 738.78,
        "setting": "garage",
        "weather": "rain",
        "rolling": 0,
        "length": 9.036,
        "stillTime": 744.653
      }
    ]
  },
  {
    "id": "story-06",
    "duration": 1022.448,
    "scenes": [
      {
        "sourceIndex": 0,
        "id": "practice",
        "title": "Gyakorlás a versenypályán",
        "stage": "road",
        "action": "race",
        "variant": "race",
        "time": 0,
        "setting": "road",
        "rolling": 180,
        "length": 43.042,
        "stillTime": 10
      },
      {
        "sourceIndex": 8,
        "id": "announcement",
        "title": "Hegykirály futam",
        "stage": "road",
        "action": "conversation",
        "sign": [
          "HEGYKIRÁLY FUTAM",
          "MA DÉLUTÁN",
          "FEL A KŐHEGYRE"
        ],
        "signY": 230,
        "time": 43.042,
        "setting": "road",
        "rolling": 0,
        "length": 25.106,
        "stillTime": 53.042
      },
      {
        "sourceIndex": 17,
        "id": "refuel-rule",
        "title": "A hegyen nincs benzinkút",
        "stage": "road",
        "action": "conversation",
        "sign": [
          "TANKOLJ TELE!",
          "A HEGYEN NINCS BENZINKÚT"
        ],
        "signY": 230,
        "time": 68.148,
        "setting": "road",
        "rolling": 0,
        "length": 14.163,
        "stillTime": 77.354
      },
      {
        "sourceIndex": 21,
        "id": "half-tank",
        "title": "Fél tank nem tele tank",
        "stage": "road",
        "action": "conversation",
        "gauge": true,
        "time": 82.311,
        "setting": "road",
        "rolling": 0,
        "length": 29.441,
        "stillTime": 92.311
      },
      {
        "sourceIndex": 31,
        "id": "fuel-pump",
        "title": "Pötty rendesen megtankol",
        "stage": "road",
        "action": "refuel",
        "cast": [
          "potty"
        ],
        "fuel": true,
        "can": true,
        "time": 111.752,
        "setting": "road",
        "rolling": 0,
        "length": 6.822,
        "stillTime": 116.186
      },
      {
        "sourceIndex": 33,
        "id": "start-line",
        "title": "Sok autó vár a hegy lábánál",
        "stage": "road",
        "action": "conversation",
        "judge": "silver",
        "green": true,
        "variant": "race",
        "time": 118.574,
        "setting": "road",
        "rolling": 0,
        "length": 42.114,
        "stillTime": 128.574
      },
      {
        "sourceIndex": 43,
        "id": "flag",
        "title": "A rajtbíró tanácsa",
        "stage": "road",
        "action": "conversation",
        "judge": "silver",
        "flag": true,
        "variant": "race",
        "time": 160.688,
        "setting": "road",
        "rolling": 0,
        "length": 25.333,
        "stillTime": 170.688
      },
      {
        "sourceIndex": 48,
        "id": "race",
        "title": "Elindul a mezőny",
        "stage": "road",
        "action": "race",
        "flag": true,
        "variant": "race",
        "time": 186.021,
        "setting": "road",
        "rolling": 180,
        "length": 34.069,
        "stillTime": 196.021
      },
      {
        "sourceIndex": 62,
        "id": "climb",
        "title": "Egyre meredekebb az út",
        "stage": "road",
        "action": "climb",
        "gauge": true,
        "time": 220.09,
        "setting": "road",
        "rolling": 180,
        "length": 26.649,
        "stillTime": 230.09
      },
      {
        "sourceIndex": 72,
        "id": "no-overtaking",
        "title": "Pötty nem előz beláthatatlan kanyarban",
        "stage": "road",
        "action": "no-overtaking",
        "cast": [
          "potty"
        ],
        "green": true,
        "sign": [
          "BELÁTHATATLAN KANYAR",
          "ELŐZNI TILOS"
        ],
        "signY": 222,
        "time": 246.739,
        "setting": "road",
        "rolling": 0,
        "length": 33.098,
        "stillTime": 256.739
      },
      {
        "sourceIndex": 83,
        "id": "truck",
        "title": "Szemből hatalmas teherautó jön",
        "stage": "road",
        "action": "truck-passes",
        "cast": [
          "potty"
        ],
        "green": true,
        "truck": true,
        "time": 279.837,
        "setting": "road",
        "rolling": 180,
        "length": 27.094,
        "stillTime": 289.837
      },
      {
        "sourceIndex": 91,
        "id": "engine",
        "title": "Turbó motorja köhögni kezd",
        "stage": "road",
        "action": "engine",
        "cast": [
          "villam",
          "turbo"
        ],
        "time": 306.931,
        "setting": "road",
        "rolling": 0,
        "length": 49.774,
        "stillTime": 316.931
      },
      {
        "sourceIndex": 111,
        "id": "empty",
        "title": "Turbó tankja üres",
        "stage": "road",
        "action": "empty",
        "cast": [
          "turbo"
        ],
        "gauge": true,
        "fuelLevel": "empty",
        "time": 356.705,
        "setting": "road",
        "rolling": 0,
        "length": 42.5,
        "stillTime": 366.705
      },
      {
        "sourceIndex": 130,
        "id": "help",
        "title": "Pötty megáll segíteni",
        "stage": "road",
        "action": "help",
        "cast": [
          "potty",
          "turbo"
        ],
        "time": 399.205,
        "setting": "road",
        "rolling": 0,
        "length": 31.077,
        "stillTime": 409.205
      },
      {
        "sourceIndex": 142,
        "id": "reserve",
        "title": "Tartalék kannát hozott",
        "stage": "road",
        "action": "fuel",
        "cast": [
          "potty",
          "turbo"
        ],
        "can": true,
        "time": 430.282,
        "setting": "road",
        "rolling": 0,
        "length": 34.708,
        "stillTime": 440.282
      },
      {
        "sourceIndex": 154,
        "id": "share",
        "title": "Megosztják az üzemanyagot",
        "stage": "road",
        "action": "share",
        "cast": [
          "potty",
          "turbo"
        ],
        "can": true,
        "time": 464.99,
        "setting": "road",
        "rolling": 0,
        "length": 37.393,
        "stillTime": 474.99
      },
      {
        "sourceIndex": 168,
        "id": "together",
        "title": "Ketten mennek tovább",
        "stage": "road",
        "action": "drive",
        "cast": [
          "potty",
          "turbo"
        ],
        "time": 502.383,
        "setting": "road",
        "rolling": 180,
        "length": 16.33,
        "stillTime": 512.383
      },
      {
        "sourceIndex": 173,
        "id": "wrong-fork",
        "title": "Villám balra fordul",
        "stage": "road",
        "action": "fork-wrong",
        "variant": "fork",
        "cast": [
          "villam"
        ],
        "sign": [
          "CÉL 4 KM →",
          "← KŐBÁNYA",
          "BEHAJTANI TILOS"
        ],
        "signX": 840,
        "signY": 222,
        "time": 518.713,
        "setting": "road",
        "rolling": 0,
        "length": 35.093,
        "stillTime": 528.713
      },
      {
        "sourceIndex": 185,
        "id": "read-fork",
        "title": "Pötty elolvassa a teljes táblát",
        "stage": "road",
        "action": "fork-read",
        "variant": "fork",
        "cast": [
          "potty",
          "turbo"
        ],
        "sign": [
          "CÉL 4 KM →",
          "← KŐBÁNYA",
          "BEHAJTANI TILOS"
        ],
        "signX": 840,
        "signY": 222,
        "tracks": true,
        "time": 553.806,
        "setting": "road",
        "rolling": 0,
        "length": 39.575,
        "stillTime": 563.806
      },
      {
        "sourceIndex": 199,
        "id": "decision",
        "title": "A barátjuk után mennek",
        "stage": "road",
        "action": "decision",
        "variant": "fork",
        "cast": [
          "potty",
          "turbo"
        ],
        "tracks": true,
        "time": 593.381,
        "setting": "road",
        "rolling": 0,
        "length": 29.649,
        "stillTime": 603.381
      },
      {
        "sourceIndex": 211,
        "id": "quarry",
        "title": "Kavics és kőrakások között",
        "stage": "road",
        "action": "quarry",
        "variant": "quarry",
        "cast": [
          "potty",
          "turbo"
        ],
        "time": 623.03,
        "setting": "road",
        "rolling": 0,
        "length": 26.595,
        "stillTime": 633.03
      },
      {
        "sourceIndex": 221,
        "id": "lost",
        "title": "Villám a bánya szélén",
        "stage": "road",
        "action": "lost",
        "variant": "quarry",
        "time": 649.625,
        "setting": "road",
        "rolling": 0,
        "length": 62.753,
        "stillTime": 659.625
      },
      {
        "sourceIndex": 244,
        "id": "turn-back",
        "title": "Mindhárman visszafordulnak",
        "stage": "road",
        "action": "return",
        "variant": "fork",
        "time": 712.378,
        "setting": "road",
        "rolling": 180,
        "length": 13.019,
        "stillTime": 720.84
      },
      {
        "sourceIndex": 247,
        "id": "last-climb",
        "title": "Az utolsó négy kilométer",
        "stage": "road",
        "action": "climb",
        "time": 725.397,
        "setting": "road",
        "rolling": 180,
        "length": 17.526,
        "stillTime": 735.397
      },
      {
        "sourceIndex": 253,
        "id": "finish",
        "title": "Senki sem ünnepel a célban",
        "stage": "road",
        "action": "conversation",
        "variant": "finish",
        "judge": "silver",
        "green": true,
        "time": 742.923,
        "setting": "road",
        "rolling": 0,
        "length": 28.152,
        "stillTime": 752.923
      },
      {
        "sourceIndex": 264,
        "id": "clock",
        "title": "Ez nem gyorsasági verseny volt",
        "stage": "road",
        "action": "conversation",
        "variant": "finish",
        "judge": "silver",
        "clock": true,
        "time": 771.075,
        "setting": "road",
        "rolling": 0,
        "length": 10.319,
        "stillTime": 777.782
      },
      {
        "sourceIndex": 268,
        "id": "rules",
        "title": "Pecsét kell minden ellenőrzőpontnál",
        "stage": "road",
        "action": "conversation",
        "variant": "finish",
        "judge": "silver",
        "sign": [
          "ÖT ELLENŐRZŐPONT",
          "ÖT PECSÉT",
          "OLVASD EL A SZABÁLYOKAT"
        ],
        "signY": 210,
        "time": 781.394,
        "setting": "road",
        "rolling": 0,
        "length": 26.516,
        "stillTime": 791.394
      },
      {
        "sourceIndex": 276,
        "id": "checkpoint",
        "title": "A zöld autó minden állomásnál megállt",
        "stage": "road",
        "action": "checkpoint",
        "green": true,
        "stamps": true,
        "time": 807.91,
        "setting": "road",
        "rolling": 0,
        "length": 35.066,
        "stillTime": 817.91
      },
      {
        "sourceIndex": 286,
        "id": "winner",
        "title": "A kis krémszínű autó célba ér",
        "stage": "road",
        "action": "cream-winner",
        "variant": "finish",
        "cream": true,
        "flag": true,
        "time": 842.976,
        "setting": "road",
        "rolling": 0,
        "length": 34.296,
        "stillTime": 852.976
      },
      {
        "sourceIndex": 298,
        "id": "congratulate",
        "title": "Gratulálnak a győztesnek",
        "stage": "road",
        "action": "conversation",
        "variant": "finish",
        "cream": true,
        "time": 877.272,
        "setting": "road",
        "rolling": 0,
        "length": 47.77,
        "stillTime": 887.272
      },
      {
        "sourceIndex": 314,
        "id": "lesson",
        "title": "A feladatot kell megérteni",
        "stage": "road",
        "action": "conversation",
        "variant": "finish",
        "cream": true,
        "sign": [
          "OLVASD EL A SZABÁLYOKAT"
        ],
        "signY": 230,
        "time": 925.042,
        "setting": "road",
        "rolling": 0,
        "length": 68.139,
        "stillTime": 935.042
      },
      {
        "sourceIndex": 337,
        "id": "downhill",
        "title": "Nevetve indulnak le a hegyről",
        "stage": "road",
        "action": "depart",
        "time": 993.181,
        "setting": "road",
        "rolling": 180,
        "length": 3.311,
        "stillTime": 995.333
      },
      {
        "sourceIndex": 338,
        "id": "podium",
        "title": "A Hegykirály a dobogón",
        "stage": "road",
        "action": "cream-podium",
        "cast": [],
        "cream": true,
        "podium": true,
        "variant": "finish",
        "time": 996.492,
        "setting": "road",
        "rolling": 0,
        "length": 25.956,
        "stillTime": 1006.492
      }
    ]
  },
  {
    "id": "story-12",
    "duration": 1115.664,
    "scenes": [
      {
        "sourceIndex": 0,
        "id": "letter",
        "title": "Titokzatos levél a garázsban",
        "stage": "garage",
        "action": "letter",
        "envelope": true,
        "time": 0,
        "setting": "garage",
        "rolling": 0,
        "length": 47.763,
        "stillTime": 10
      },
      {
        "sourceIndex": 17,
        "id": "map",
        "title": "Ismeretlen út a térképen",
        "stage": "garage",
        "action": "conversation",
        "map": true,
        "time": 47.763,
        "setting": "garage",
        "rolling": 0,
        "length": 29.242,
        "stillTime": 57.763
      },
      {
        "sourceIndex": 25,
        "id": "warning",
        "title": "Ne menjetek végig rajta!",
        "stage": "garage",
        "action": "conversation",
        "map": true,
        "sign": [
          "NE MENJETEK",
          "VÉGIG AZ ÚTON!"
        ],
        "signY": 230,
        "time": 77.005,
        "setting": "garage",
        "rolling": 0,
        "length": 23.79,
        "stillTime": 87.005
      },
      {
        "sourceIndex": 33,
        "id": "leave",
        "title": "Indulás a Fenyves-erdőbe",
        "stage": "road",
        "action": "drive",
        "map": true,
        "mapX": 875,
        "mapY": 228,
        "mapScale": 0.55,
        "time": 100.795,
        "setting": "road",
        "rolling": 180,
        "length": 9.627,
        "stillTime": 107.053
      },
      {
        "sourceIndex": 37,
        "id": "forest",
        "title": "Keskeny erdei út",
        "stage": "road",
        "action": "forest",
        "time": 110.422,
        "setting": "road",
        "rolling": 180,
        "length": 32.261,
        "stillTime": 120.422
      },
      {
        "sourceIndex": 48,
        "id": "bridge",
        "title": "A patak után jobbra",
        "stage": "road",
        "action": "approach",
        "bridge": "whole",
        "time": 142.683,
        "setting": "road",
        "rolling": 180,
        "length": 19.189,
        "stillTime": 152.683
      },
      {
        "sourceIndex": 55,
        "id": "columns",
        "title": "A hetedik próbapálya kapuja",
        "stage": "road",
        "action": "conversation",
        "columns": true,
        "time": 161.872,
        "setting": "road",
        "rolling": 0,
        "length": 41.622,
        "stillTime": 171.872
      },
      {
        "sourceIndex": 68,
        "id": "overgrown",
        "title": "Régi út a gyökerek között",
        "stage": "road",
        "action": "drive",
        "sign": [
          "FÉKPRÓBA",
          "VIZES ÚTFELÜLET",
          "OLDALSZÉL"
        ],
        "signY": 205,
        "time": 203.494,
        "setting": "road",
        "rolling": 180,
        "length": 27.646,
        "stillTime": 213.494
      },
      {
        "sourceIndex": 78,
        "id": "bumps",
        "title": "Villám kipróbálja a dudorokat",
        "stage": "road",
        "action": "test-bumps",
        "bumps": true,
        "time": 231.14,
        "setting": "road",
        "rolling": 180,
        "length": 18.445,
        "stillTime": 241.14
      },
      {
        "sourceIndex": 84,
        "id": "wet",
        "title": "A fényes, csúszós pálya",
        "stage": "road",
        "action": "test-wet",
        "ice": true,
        "time": 249.585,
        "setting": "road",
        "rolling": 0,
        "length": 20.492,
        "stillTime": 259.585
      },
      {
        "sourceIndex": 90,
        "id": "spin",
        "title": "Turbó megpördül",
        "stage": "road",
        "action": "test-spin",
        "ice": true,
        "time": 270.077,
        "setting": "road",
        "rolling": 180,
        "length": 30.95,
        "stillTime": 280.077
      },
      {
        "sourceIndex": 102,
        "id": "entry",
        "title": "Az alagúti próbapálya",
        "stage": "entrance",
        "action": "conversation",
        "sign": [
          "ALAGÚTI PRÓBAPÁLYA"
        ],
        "signX": 809,
        "signY": 205,
        "time": 301.027,
        "setting": "entrance",
        "rolling": 0,
        "length": 26.423,
        "stillTime": 311.027
      },
      {
        "sourceIndex": 111,
        "id": "map-warning",
        "title": "Az X továbbra is figyelmeztet",
        "stage": "entrance",
        "action": "conversation",
        "map": true,
        "mapX": 60,
        "mapY": 255,
        "mapScale": 0.65,
        "time": 327.45,
        "setting": "entrance",
        "rolling": 0,
        "length": 12.965,
        "stillTime": 335.877
      },
      {
        "sourceIndex": 115,
        "id": "headlights",
        "title": "Csak benézünk",
        "stage": "entrance",
        "action": "conversation",
        "headlights": true,
        "time": 340.415,
        "setting": "entrance",
        "rolling": 0,
        "length": 14.827,
        "stillTime": 350.053
      },
      {
        "sourceIndex": 121,
        "id": "dark-tunnel",
        "title": "Kábelek és sötét lámpák",
        "stage": "tunnel",
        "action": "dark-tunnel",
        "headlights": true,
        "time": 355.242,
        "setting": "tunnel",
        "rolling": 0,
        "length": 24.88,
        "stillTime": 365.242
      },
      {
        "sourceIndex": 130,
        "id": "sensors",
        "title": "Egymás után kigyulladnak a lámpák",
        "stage": "tunnel",
        "action": "sensors",
        "sensor": true,
        "headlights": true,
        "time": 380.122,
        "setting": "tunnel",
        "rolling": 0,
        "length": 43.75,
        "stillTime": 390.122
      },
      {
        "sourceIndex": 147,
        "id": "explain-sensor",
        "title": "Pötty észreveszi az érzékelőt",
        "stage": "tunnel",
        "action": "conversation",
        "sensor": true,
        "time": 423.872,
        "setting": "tunnel",
        "rolling": 0,
        "length": 23.445,
        "stillTime": 433.872
      },
      {
        "sourceIndex": 156,
        "id": "lab",
        "title": "Ezüst autó az üveg mögött",
        "stage": "tunnel",
        "action": "conversation",
        "lab": true,
        "silver": true,
        "time": 447.317,
        "setting": "tunnel",
        "rolling": 0,
        "length": 37.659,
        "stillTime": 457.317
      },
      {
        "sourceIndex": 170,
        "id": "plaque",
        "title": "Kísérleti jármű 01",
        "stage": "tunnel",
        "action": "conversation",
        "lab": true,
        "silver": true,
        "sign": [
          "KÍSÉRLETI JÁRMŰ 01",
          "AUTONÓM VEZETÉS"
        ],
        "signX": 727,
        "signY": 205,
        "signWidth": 360,
        "time": 484.976,
        "setting": "tunnel",
        "rolling": 0,
        "length": 21.13,
        "stillTime": 494.976
      },
      {
        "sourceIndex": 177,
        "id": "wakes",
        "title": "Az ezüst autó felébred",
        "stage": "tunnel",
        "action": "wakes",
        "lab": true,
        "silver": true,
        "headlights": true,
        "time": 506.106,
        "setting": "tunnel",
        "rolling": 0,
        "length": 15.479,
        "stillTime": 516.106
      },
      {
        "sourceIndex": 182,
        "id": "countdown",
        "title": "Próbamenet indul húsz másodperc múlva",
        "stage": "tunnel",
        "action": "countdown",
        "lab": true,
        "silver": true,
        "distance": "20",
        "headlights": true,
        "time": 521.585,
        "setting": "tunnel",
        "rolling": 0,
        "length": 14.216,
        "stillTime": 530.825
      },
      {
        "sourceIndex": 187,
        "id": "lab-exit",
        "title": "A kapu kinyílik",
        "stage": "tunnel",
        "action": "lab-exit",
        "lab": true,
        "silver": true,
        "distance": "15 → 1",
        "headlights": true,
        "time": 535.801,
        "setting": "tunnel",
        "rolling": 0,
        "length": 43.231,
        "stillTime": 545.801
      },
      {
        "sourceIndex": 205,
        "id": "launch",
        "title": "Az ezüst autó kilő",
        "stage": "tunnel",
        "action": "launch",
        "silver": true,
        "headlights": true,
        "time": 579.032,
        "setting": "tunnel",
        "rolling": 0,
        "length": 30.957,
        "stillTime": 589.032
      },
      {
        "sourceIndex": 218,
        "id": "chase",
        "title": "Kanyar, emelkedő, lejtő",
        "stage": "tunnel",
        "action": "chase",
        "silver": true,
        "time": 609.989,
        "setting": "tunnel",
        "rolling": 180,
        "length": 36.212,
        "stillTime": 619.989
      },
      {
        "sourceIndex": 230,
        "id": "markers",
        "title": "Nyolcszáz, hétszáz, hatszáz méter",
        "stage": "tunnel",
        "action": "chase",
        "silver": true,
        "distance": "800 m",
        "time": 646.201,
        "setting": "tunnel",
        "rolling": 180,
        "length": 22.261,
        "stillTime": 656.201
      },
      {
        "sourceIndex": 239,
        "id": "stop",
        "title": "Pötty megállítja a többieket",
        "stage": "tunnel",
        "action": "warning-stop",
        "distance": "600 m",
        "headlights": true,
        "time": 668.462,
        "setting": "tunnel",
        "rolling": 0,
        "length": 28.537,
        "stillTime": 678.462
      },
      {
        "sourceIndex": 250,
        "id": "debate",
        "title": "Nem tudják, miért tilos",
        "stage": "tunnel",
        "action": "debate",
        "silver": true,
        "distance": "200 m",
        "map": true,
        "mapX": 810,
        "mapY": 270,
        "mapScale": 0.55,
        "time": 696.999,
        "setting": "tunnel",
        "rolling": 0,
        "length": 34.428,
        "stillTime": 706.999
      },
      {
        "sourceIndex": 263,
        "id": "boundary",
        "title": "Pötty és Turbó nem mennek tovább",
        "stage": "tunnel",
        "action": "boundary",
        "silver": true,
        "distance": "200 m",
        "time": 731.427,
        "setting": "tunnel",
        "rolling": 0,
        "length": 29.136,
        "stillTime": 741.427
      },
      {
        "sourceIndex": 275,
        "id": "last100",
        "title": "Az ezüst autó eltűnik",
        "stage": "tunnel",
        "action": "last100",
        "silver": true,
        "distance": "100 m",
        "time": 760.563,
        "setting": "tunnel",
        "rolling": 0,
        "length": 19.747,
        "stillTime": 770.563
      },
      {
        "sourceIndex": 283,
        "id": "slow",
        "title": "Csak gyalogtempóban, együtt",
        "stage": "tunnel",
        "action": "slow",
        "distance": "50 m → 20 m",
        "time": 780.31,
        "setting": "tunnel",
        "rolling": 0,
        "length": 19.043,
        "stillTime": 790.31
      },
      {
        "sourceIndex": 290,
        "id": "ramp",
        "title": "A pálya egy medencénél véget ér",
        "stage": "tunnel",
        "action": "conversation",
        "pool": true,
        "cast": [
          "villam",
          "turbo",
          "potty"
        ],
        "time": 799.353,
        "setting": "tunnel",
        "rolling": 0,
        "length": 27.473,
        "stillTime": 809.353
      },
      {
        "sourceIndex": 301,
        "id": "pool",
        "title": "Úszik az ezüst versenyautó",
        "stage": "tunnel",
        "action": "conversation",
        "pool": true,
        "silver": true,
        "time": 826.826,
        "setting": "tunnel",
        "rolling": 0,
        "length": 42.859,
        "stillTime": 836.826
      },
      {
        "sourceIndex": 316,
        "id": "thanks",
        "title": "Jó, hogy szóltatok",
        "stage": "tunnel",
        "action": "conversation",
        "pool": true,
        "silver": true,
        "time": 869.685,
        "setting": "tunnel",
        "rolling": 0,
        "length": 38.152,
        "stillTime": 879.685
      },
      {
        "sourceIndex": 330,
        "id": "return",
        "title": "Az ezüst autó visszagurul",
        "stage": "tunnel",
        "action": "silver-return",
        "pool": true,
        "silver": true,
        "time": 907.837,
        "setting": "tunnel",
        "rolling": 0,
        "length": 17.127,
        "stillTime": 917.837
      },
      {
        "sourceIndex": 335,
        "id": "years",
        "title": "Harminckét éve vár",
        "stage": "tunnel",
        "action": "years",
        "silver": true,
        "distance": "32 ÉV",
        "time": 924.964,
        "setting": "tunnel",
        "rolling": 0,
        "length": 36.976,
        "stillTime": 934.964
      },
      {
        "sourceIndex": 347,
        "id": "letter-show",
        "title": "Felismeri a tervező kézírását",
        "stage": "tunnel",
        "action": "letter-show",
        "silver": true,
        "envelope": true,
        "time": 961.94,
        "setting": "tunnel",
        "rolling": 0,
        "length": 26.889,
        "stillTime": 971.94
      },
      {
        "sourceIndex": 358,
        "id": "promise",
        "title": "Megígérte, hogy visszajön értem",
        "stage": "tunnel",
        "action": "promise",
        "silver": true,
        "time": 988.829,
        "setting": "tunnel",
        "rolling": 0,
        "length": 11.835,
        "stillTime": 996.522
      },
      {
        "sourceIndex": 361,
        "id": "home",
        "title": "Este újra a garázsban",
        "stage": "garage",
        "action": "conversation",
        "night": true,
        "map": true,
        "mapX": 565,
        "mapY": 230,
        "mapScale": 0.75,
        "time": 1000.664,
        "setting": "garage",
        "rolling": 0,
        "length": 31.157,
        "stillTime": 1010.664
      },
      {
        "sourceIndex": 369,
        "id": "second-x",
        "title": "Egy második fekete X",
        "stage": "garage",
        "action": "conversation",
        "night": true,
        "map": "second",
        "mapX": 565,
        "mapY": 230,
        "mapScale": 0.75,
        "time": 1031.821,
        "setting": "garage",
        "rolling": 0,
        "length": 29.973,
        "stillTime": 1041.821
      },
      {
        "sourceIndex": 380,
        "id": "station",
        "title": "A régi vasútállomás",
        "stage": "garage",
        "action": "conversation",
        "night": true,
        "map": "second",
        "sign": [
          "RÉGI VASÚTÁLLOMÁS"
        ],
        "signY": 226,
        "time": 1061.794,
        "setting": "garage",
        "rolling": 0,
        "length": 25.465,
        "stillTime": 1071.794
      },
      {
        "sourceIndex": 390,
        "id": "goodnight",
        "title": "Jó éjszakát",
        "stage": "garage",
        "action": "conversation",
        "night": true,
        "map": "second",
        "dark": true,
        "time": 1087.259,
        "setting": "garage",
        "rolling": 0,
        "length": 17.62,
        "stillTime": 1097.259
      },
      {
        "sourceIndex": 397,
        "id": "secret",
        "title": "Az ezüst autó nem az egyetlen",
        "stage": "garage",
        "action": "conversation",
        "night": true,
        "map": "second",
        "secret": true,
        "dark": true,
        "time": 1104.879,
        "setting": "garage",
        "rolling": 0,
        "length": 10.785,
        "stillTime": 1111.889
      }
    ]
  }
];

const colors = {villam:'red',turbo:'yellow',potty:'blue'};
const moving = new Set(['introduce','drive','race','climb','forest','return','depart','test-bumps','chase','approach']);
const triple = ['villam','turbo','potty'];
const position = (name,drawing,x,y,scale=1) => `<g data-actor="${name}" transform="translate(${x} ${y}) scale(${scale})">${drawing}</g>`;
const badge = (text,x=1040,y=280) => `<g transform="translate(${x} ${y})"><rect x="-100" y="-36" width="200" height="64" rx="14" fill="#f4e9c9" stroke="#94a38b" stroke-width="4"/><text data-actor="route-display-text" text-anchor="middle" y="6" font-family="system-ui,sans-serif" font-size="28" font-weight="700" fill="#526c5d">${text}</text></g>`;

function frame(scene,art) {
  const r=createRoutesArt(art),s=scene,kind=s.stage;
  let bg=kind==='garage'?r.garage({rain:s.weather==='rain',night:s.night,repair:s.action==='repair'}):kind==='tunnel'?r.tunnel({laboratory:s.lab,pool:s.pool}):kind==='entrance'?r.tunnel({entrance:true}):r.mountainRoad({weather:s.weather||'sun',variant:s.variant||'road',night:s.night});
  let scenery='',foreground='';
  if(s.sign) scenery+=r.sign(s.sign,s.signX??905,s.signY??275,s.signWidth??300);
  if(s.bridge) scenery+=r.bridge({broken:s.bridge==='broken'});
  if(s.tracks) scenery+=r.wheelTracks();
  if(s.signal) scenery+=position('signal',r.trafficLight(s.signal==='green'),660,300,.85);
  if(s.flag) scenery+=position('flag',r.flag(),1090,300,.8);
  if(s.radio) scenery+=position('radio',r.radio(),1050,422,.7);
  if(s.map) scenery+=position('map',r.map({secondX:s.map==='second'}),s.mapX??525,s.mapY??234,s.mapScale??.8);
  if(s.envelope) scenery+=position('envelope',r.envelope(),570,410,.65);
  if(s.fuel) scenery+=position('pump',r.fuelPump(),880,332,.85);
  if(s.gauge) scenery+=position('gauge',r.gauge(),945,253,1);
  if(s.can) foreground+=position('can',r.fuelCan(),650,464,.65);
  if(s.judge) scenery+=position('judge',r.judge(s.judge===true?'green':s.judge),955,434,.8);
  if(s.truck) scenery+=position('truck',r.truck(),940,428,.75);
  if(s.deer) foreground+=position('deer',r.deer(),990,480,1);
  if(s.podium) scenery+=position('podium',r.podium(),265,501,1);
  if(s.clock) scenery+='<g transform="translate(1090 338)"><circle r="68" fill="#f3ead2" stroke="#8c8d70" stroke-width="7"/><path d="M0-48V0l32 16" stroke="#697c65" stroke-width="6" fill="none"/><circle r="5" fill="#667962"/></g>';
  if(s.columns) scenery+=[860,980,1100].map((x,i)=>`<g transform="translate(${x} 280)"><path d="M0 0h38v238H0Z" fill="#bab9a0" stroke="#8e957d" stroke-width="4"/>${i===0?'<text transform="translate(26 26) rotate(90)" font-size="17" fill="#7f8973">7. SZ. PRÓBAPÁLYA</text>':''}</g>`).join('');
  if(s.bumps) scenery+='<path d="M460 559h660v80H460Z" fill="#a49e83"/>'+Array.from({length:22},(_,i)=>`<ellipse cx="${480+i*29}" cy="580" rx="12" ry="6" fill="#d3c19b"/>`).join('');
  if(s.ice) scenery+='<path d="M490 550q299-35 696 0v111H490Z" fill="#b6d6d0"/><path d="m532 565 215 23m13-25 274 22m-338 54 381-12" stroke="#e3f0db" stroke-width="5" opacity=".7"/>';
  if(s.distance) scenery+=badge(s.distance);
  if(s.lab) scenery+=`<path d="M1220 199v259" stroke="#5b7165" stroke-width="12"/>${position('lab-gate','<rect x="0" y="0" width="115" height="262" fill="#b6c1ab" stroke="#7b927d" stroke-width="5"/><path d="M12 25h90m-90 27h90m-90 27h90m-90 27h90m-90 27h90" stroke="#9bad97" stroke-width="5"/>',1106,200)}`;
  if(s.sensor) scenery+=position('sensor','<rect width="55" height="39" rx="8" fill="#a1b798" stroke="#607e66" stroke-width="4"/><circle cx="28" cy="20" r="10" fill="#e8ce93"/>',620,350,1);
  if(s.cable) scenery+=art.tree(637,443,.68,4)+position('cable',r.cable(),535,535,1);
  if(s.bus) scenery+=position('bus',r.bus(),800,500,.8);
  if(s.dust) scenery+=`<g data-actor="route-dust">${Array.from({length:7},(_,i)=>`<ellipse cx="${850+i*27}" cy="${445+i%2*29}" rx="${37+i*5}" ry="${24+i*3}" fill="#c3b694" opacity=".3"/>`).join('')}</g>`;
  if(s.splash) scenery+=position('splash','<path d="M0 0q-30-80-62-63m62 63q-5-93 12-93M0 0q40-83 80-74M0 0q70-53 120-34" stroke="#c2e4da" stroke-width="10" fill="none" stroke-linecap="round"/>',640,624,1);
  let cars=(s.cast||triple).map(name=>position(name,art.raceCar({color:colors[name]}),{villam:740,turbo:430,potty:105}[name],480,.85)).join('');
  if(s.silver) cars+=position('silver',art.raceCar({color:'silver'})+r.paddles(),s.pool?940:960,s.pool?545:470,.78);
  if(s.green) cars+=position('green',art.raceCar({color:'green'}),720,474,.85);
  if(s.cream) cars+=position('cream',art.raceCar({color:'silver'})+r.stamps(),520,388,.76);
  if(s.rescue) {
    cars+=position('fire',art.serviceTruck(false),720,505,.7)+position('ambulance',art.serviceTruck(true),970,492,.7)+position('crane',art.crane(),650,420,.68);
    if(s.bus) foreground+='<path data-actor="crane-rope" stroke="#617b6e" stroke-width="4" fill="none"/><path data-actor="crane-hook" d="M0 0v12q0 15 14 12 11-2 7-13" stroke="#657b6a" stroke-width="6" stroke-linecap="round" fill="none"/>';
    foreground+=position('rescuer',art.standing('bear','#be6e54','#c57d58'),777,487,.62);
  }
  if(s.children) foreground+=Array.from({length:6},(_,i)=>position(`child-${i}`,r.child(['#c78167','#9cba87','#7aa4a7'][i%3]),900+i*48,463,.6)).join('');
  if(s.stamps) scenery+=`<g transform="translate(901 312)"><rect width="228" height="120" rx="12" fill="#f5eccf" stroke="#a99a78" stroke-width="3"/><text x="114" y="30" text-anchor="middle" font-size="20" font-weight="700" fill="#607655">ELLENŐRZŐPONT</text><g transform="translate(-15 -16)">${r.stamps()}</g></g>`;
  if(s.secret) foreground+=position('secret','<rect width="598" height="96" rx="16" fill="#eee2bd" stroke="#a8946c" stroke-width="3"/><text x="299" y="58" text-anchor="middle" font-size="25" font-weight="700" fill="#877a5c">AZ EZÜST AUTÓ NEM AZ EGYETLEN.</text>',333,368,1);
  if(s.dark) foreground+='<rect data-actor="dark" width="1280" height="720" fill="#203c41" opacity=".48"/>';
  return `<svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${art.defs}${bg}${scenery}${cars}${foreground}</svg>`;
}

function render(ctx) {
  const {time,local,scene:s,motion,actors:a,pose,attrs,progress,smooth,mix,host}=ctx;
  const bob=motion?Math.sin(time*2.4)*1.6:0;
  const p=(start,end)=>smooth(progress(time,start,end));
  const q=(start=0,end=6)=>smooth(progress(local,start,end));
  const set=(name,x,y,scale=.85,angle=0)=>{if(a[name]) pose(name,x,y,scale,angle,125,110);};
  const visible=(name,on=true)=>{if(a[name]) attrs(a[name],{opacity:on?1:0});};
  const drive=moving.has(s.action);
  const advance=drive?mix(-110,90,q(0,Math.min(12,s.length||12))):0;
  const base={villam:[740,480],turbo:[430,480],potty:[105,480]};
  if(s.stage==='garage'||s.action==='conversation'||s.judge||s.podium) Object.assign(base,{villam:[120,480],turbo:[420,480],potty:[720,480]});
  if(s.pool) Object.assign(base,{villam:[480,460],turbo:[250,465],potty:[20,470]});
  for(const name of triple) set(name,base[name][0]+advance,base[name][1]+bob,.85,drive&&motion?Math.sin(time*.55+triple.indexOf(name))*.9:0);
  if(a.silver) {set('silver',s.pool?mix(930,1010,q(0,30)):940,s.pool?540+Math.sin(time*1.2)*(motion?4:0):470,.78);visible('silver-paddles',s.pool);}
  if(a.green) set('green',740+advance,465,.85);
  if(a.cream) set('cream',520,390,.76);
  if(a.radio) attrs(a['radio-wave'],{opacity:motion?.55+.4*Math.sin(time*6):.6});
  if(a.splash) {const v=p(s.splashStart??s.time+4,s.splashEnd??s.time+8);attrs(a.splash,{opacity:local<14?Math.sin(v*Math.PI):0,transform:`translate(${600+v*70} ${620-v*40}) scale(${.5+v})`});}
  if(a['route-dust']) attrs(a['route-dust'],{opacity:.35+(motion?Math.sin(time*1.3)*.15:0),transform:`translate(${motion?Math.sin(time*.7)*18:0} ${motion?Math.sin(time*.6)*5:0})`});
  if(a.flag) attrs(a.flag,{transform:`translate(1090 300) rotate(${-20+q(0,3)*55}) scale(.8)`});
  if(s.gauge&&a['fuel-needle']) attrs(a['fuel-needle'],{transform:`rotate(${s.fuelLevel==='empty'?165:s.fuelLevel==='full'?-10:70} 110 83)`});
  if(a.bus) set('bus',s.children?850:s.action==='crane'?mix(860,850,q(0,7)):860,s.children?360:s.action==='crane'?mix(535,360,q(0,7)):535,.73,s.action==='crane'?mix(80,0,q(0,7)):s.children?0:80);
  if(a.crane) set('crane',545,476,.68);
  if(a.crane&&a.bus) {
    const rise=s.action==='crane'?q(0,7):s.children?1:0;
    const angle=-35+rise*10;
    attrs(a.crane.querySelector('[data-part="crane-boom"]'),{transform:`translate(158 -76) rotate(${angle})`});
    const x=545+.68*(158+494*Math.cos(angle*Math.PI/180)),y=476+.68*(-76+494*Math.sin(angle*Math.PI/180));
    const hookX=985,hookY=mix(570,378,rise);
    attrs(a['crane-rope'],{d:`M${x} ${y}L${hookX} ${hookY}`});
    if(a['crane-hook']) pose('crane-hook',hookX,hookY,.7);
  }
  if(a.fire) set('fire',mix(1280,740,q(0,6)),555,.64);
  if(a.ambulance) set('ambulance',mix(1450,991,q(3,9)),528,.6);
  if(a.rescuer) set('rescuer',776+Math.sin(time*2)*(motion?2:0),488,.62);
  if(a.deer) set('deer',mix(940,1100,p(639.33,646.79)),mix(487,392,p(639.33,646.79)),1,0);
  if(s.action==='introduce') {
    triple.forEach((name,i)=>set(name,mix([-275,-180,-160][i],[130,440,750][i],q(i*1.5,i*1.5+5)),500+bob,.9));
  }
  if(s.action==='manners') {set('potty',mix(150,380,p(60,68.61)),480+bob);set('villam',790,462);set('turbo',810,596,.6);}
  if(s.action==='teasing') {set('potty',125,508);set('villam',690,470,.9,motion?Math.sin(time*3)*1.5:0);set('turbo',970,478,.8,motion?-Math.sin(time*3)*1.4:0);}
  if(s.action==='red-stop') {set('potty',mix(0,415,p(247.64,258.39)),510);set('villam',mix(530,1060,p(247.64,260.12)),482,.68);set('turbo',mix(235,650,p(247.64,260.12)),570,.68);}
  if(s.action==='rush') {set('potty',415,510);set('villam',mix(865,1180,q(0,8)),460,.55);set('turbo',mix(420,1160,p(292.56,295.91)),571,.68);visible('villam',time<278.2);visible('turbo',time<296);}
  if(s.action==='wait'||s.action==='dust') {set('potty',415,510,.85,motion&&time>315&&time<333?Math.sin(time*12)*.3:0);}
  if(s.action==='incident') {
    set('truck',mix(1120,900,p(355.4,367.22)),429,.75);
    set('villam',mix(340,725,p(358.39,372.95)),mix(505,472,p(368.84,372.95)),.85,mix(0,24,p(368.84,372.95)));
    set('turbo',mix(25,502,p(375.67,384.48)),540,.85,mix(0,12,p(379.23,384.48)));
  }
  if(s.action==='repair') {set('villam',260,431);set('turbo',690,445);set('potty',1050,533,.7);}
  if(s.action==='deer') {set('villam',mix(570,655,p(602.57,622.76)),495);set('turbo',mix(210,370,p(602.57,622.76)),505);set('potty',55,564,.7);visible('deer',time>=632.24);}
  if(s.action==='podium') {set('potty',475,352,.9);set('villam',220,439,.8);set('turbo',850,439,.8);}
  if(s.action==='tunnel-ending') {set('potty',415,510);}
  if(s.action==='splash') {set('turbo',mix(250,650,p(24.84,31.38)),507,.9);set('villam',835,500);set('potty',104,523);}
  if(s.action==='judge-arrives') set('judge',mix(1280,955,q(0,6)),434,.8);
  if(s.action==='tracks') {set('potty',mix(170,410,q()),498);set('villam',mix(480,620,q()),518);set('turbo',mix(810,960,q()),536);}
  if(s.action==='bridge'||s.action==='bus-talk'||s.action==='slip'||s.action==='cable'||s.action==='hold'||s.action==='crane'||s.children) {
    set('potty',75,410,.8);set('turbo',350,417,.8);set('villam',570,403,.8);visible('villam',!['slip','cable','hold'].includes(s.action));
    if(s.action==='slip') set('bus',860+q(0,7)*17,535+q(0,7)*13,.73,80);
    if(s.action==='hold') set('bus',876+q(0,7)*8,548+q(0,7)*6,.73,80);
  }
  if(s.action==='mud-stop') {set('villam',mix(500,650,p(263.85,271.01)),mix(402,439,p(263.85,271.01)),.8);set('turbo',350,417,.8);set('potty',75,410,.8);}
  if(s.action==='leave-for-help') {set('villam',mix(570,-280,p(362.57,366.77)),403,.8);set('turbo',350,417,.8);set('potty',75,410,.8);}
  if(s.action==='careful-cable') {set('potty',mix(75,250,p(443.73,453.27)),410,.8);set('turbo',mix(350,610,p(443.73,453.27)),417,.8,motion&&time>446.48&&time<453.27?Math.sin(time*8)*2:0);}
  if(a.cable) {
    const tied=s.action==='hold'||s.action==='crane'||s.action==='bus-children'||s.action==='tie-cable';
    attrs(a.cable,{transform:`translate(${tied?630:530} ${tied?421:535}) rotate(${tied?27:0}) scale(${tied?1.1:1})`,opacity:s.action==='tie-cable'?p(471.27,486.58):1});
  }
  if(s.children) for(let i=0;i<6;i++) {
    const t0=[533.46,534.84,536.53,538.18,539.71,541.13][i],v=p(t0,t0+1.7);
    set(`child-${i}`,mix(905,795+i*62,v),mix(390,515,v),.7);visible(`child-${i}`,time>=t0);
  }
  if(s.children&&a.bus) a.bus.querySelectorAll('.route-bus-child').forEach((n,i)=>attrs(n,{opacity:time>=[533.46,534.84,536.53,538.18,539.71,541.13][i]?0:1}));
  if(s.action==='refuel') {set('potty',610,485,.85);visible('villam',false);visible('turbo',false);}
  if(s.action==='no-overtaking') {visible('villam',false);visible('turbo',false);set('potty',mix(255,385,p(246.74,268.76)),530,.85);set('green',740,490,.85);}
  if(s.action==='truck-passes') {set('potty',385,530);set('green',740,490);set('truck',mix(1350,-280,p(282.59,300.97)),402,.75);}
  if(s.action==='engine') {set('villam',mix(740,1350,p(336.11,358.74)),483);set('turbo',430,494+(motion?Math.sin(time*15)*2:0));visible('potty',false);}
  if(s.action==='empty') {set('turbo',500,511,.95,motion&&local<9?Math.sin(time*13)*.6:0);visible('villam',false);visible('potty',false);}
  if(['help','fuel','share'].includes(s.action)) {set('turbo',750,505,.9);set('potty',mix(-230,370,p(399.2,408.46)),499,.9);visible('villam',false);}
  if(s.action==='share'&&a.can) {attrs(a.can,{transform:`translate(690 ${470-bob}) rotate(${-30*Math.sin(q(0,8)*Math.PI)} 50 40) scale(.65)`});}
  if(s.action==='fork-wrong') {set('villam',mix(100,950,p(535.51,551.56)),mix(504,392,p(535.51,551.56)),.85,mix(0,-10,p(546.17,551.56)));visible('potty',false);visible('turbo',false);}
  if(s.action==='fork-read') {visible('villam',false);set('potty',420,507,.9);set('turbo',100,517,.9);}
  if(s.action==='decision') {visible('villam',false);set('potty',mix(420,800,p(618.91,623.03)),mix(507,423,p(618.91,623.03)),.9);set('turbo',mix(100,480,p(618.91,623.03)),mix(517,475,p(618.91,623.03)),.9);}
  if(s.action==='quarry') {visible('villam',false);set('potty',300+advance,487,.9);set('turbo',600+advance,500,.9);}
  if(s.action==='lost') {set('villam',650,475);set('turbo',mix(170,365,p(649.62,668.60)),545,.8);set('potty',30,503,.8);}
  if(s.action==='checkpoint') {set('green',545,465,.75);set('potty',50,547,.7);set('villam',303,549,.7);set('turbo',767,549,.7);}
  if(s.action==='cream-winner') {set('cream',mix(-240,570,p(847.58,865.69)),500,.85);set('potty',48,550,.62);set('villam',292,550,.62);set('turbo',994,550,.62);}
  if(s.action==='cream-podium') {set('cream',500,351,.9);visible('villam',false);visible('turbo',false);visible('potty',false);}
  if(s.action==='letter') {set('potty',mix(730,680,p(35.63,45.65)),500);if(a.envelope)attrs(a.envelope,{transform:`translate(570 410) rotate(${mix(0,-8,p(35.63,45.65))}) scale(.65)`});}
  if(s.action==='test-bumps') {set('villam',mix(330,920,p(231.14,246.26)),486+(motion?Math.sin(time*9)*4:0));set('turbo',190,538,.8);set('potty',-55,548,.8);}
  if(s.action==='test-spin') {set('turbo',mix(430,850,p(270.08,285.85)),506,.85,mix(0,180,p(279.23,285.85)));set('villam',130,500);set('potty',-40,580,.65);}
  if(s.action==='test-wet') {set('turbo',mix(250,460,p(260.51,270.08)),520);set('villam',730,470);set('potty',80,530);}
  if(s.action==='sensors') for(let i=0;i<4;i++) if(a[`route-lamp-${i}`]) attrs(a[`route-lamp-${i}`],{opacity:time>=[383.38,396.04,402.94,406][i]?1:.04});
  if(a['route-display-text']) {
    let value=s.distance;
    if(s.id==='markers') value=time>=656.43?'600 m':time>=654.29?'700 m':'800 m';
    if(s.action==='countdown'||s.action==='lab-exit') value=time>=574.44?'1':time>=572.79?'2':time>=565.28?'3':time>=561.83?'4':time>=555.15?'5':time>=549.38?'10':time>=542.26?'15':'20';
    if(s.action==='slow') value=time>=797.36?'20 m':'50 m';
    a['route-display-text'].textContent=value;
  }
  if(s.action==='dark-tunnel') for(let i=0;i<4;i++) if(a[`route-lamp-${i}`]) attrs(a[`route-lamp-${i}`],{opacity:.02});
  if(s.lab) {
    set('villam',430,537,.65);set('turbo',190,544,.65);set('potty',-30,552,.65);set('silver',926,342,.78);
    if(s.action==='wakes') {const v=p(506.11,510.31);triple.forEach((name,i)=>set(name,[-30,190,430][2-i]-v*38,545-v*6,.65));}
    if(s.action==='countdown'||s.action==='lab-exit') {
      const v=p(535.8,542.26);set('silver',mix(926,810,v),mix(342,467,v),.78);attrs(a['lab-gate'],{transform:`translate(1106 ${200-v*265})`});
    }
  }
  if(s.action==='launch') {
    set('silver',mix(730,1430,p(581.23,586.65)),453,.8);
    set('villam',mix(440,990,p(589.02,602.33)),505,.8);set('turbo',mix(145,700,p(599.26,607.48)),516,.8);set('potty',20,530,.8);
  }
  if(s.action==='chase') {set('silver',985,465,.8);set('villam',680,500,.8);set('turbo',365,520,.8);set('potty',35,541,.8);}
  if(s.action==='warning-stop') {set('villam',mix(680,765,p(668.46,697)),500,.8);set('turbo',mix(365,475,p(668.46,683.24)),520,.8);set('potty',mix(35,190,p(680.26,702.04)),541,.8);visible('silver',false);}
  if(['debate','boundary','last100','slow'].includes(s.action)) {set('villam',s.action==='slow'?mix(765,620,q()):765,500,.8);set('turbo',475,520,.8);set('potty',190,541,.8);if(a.silver){set('silver',mix(980,1370,p(757.44,762.53)),467,.7);visible('silver',time<763);}}
  if(s.pool&&a.silver) {const poolTime=p(830.22,844.13);attrs(a['silver-paddles'],{transform:`translate(0 ${motion?Math.sin(time*4)*3:0})`,opacity:poolTime});a.silver.querySelectorAll('.sv-wheel').forEach(n=>attrs(n.parentNode,{opacity:time>=837.03?0:1}));}
  if(s.action==='silver-return') {const v=p(907.84,922.4);set('silver',mix(1010,815,v),mix(540,446,v),.78);attrs(a['silver-paddles'],{opacity:1-v});a.silver.querySelectorAll('.sv-wheel').forEach(n=>attrs(n.parentNode,{opacity:v}));}
  if(s.action==='years'||s.action==='letter-show'||s.action==='promise') {set('silver',920,470,.84);set('villam',610,510,.78);set('turbo',330,522,.78);set('potty',35,532,.78);visible('silver-paddles',false);}
  if(s.map==='second'&&a['map-second-x']) attrs(a['map-second-x'],{opacity:time>=1050.61?1:0});
  if(a.secret) attrs(a.secret,{opacity:p(1104.88,1112.3)});
  if(a.dark) attrs(a.dark,{opacity:.15+.62*q(0,8)});
  if(s.action==='night-depart'||s.action==='depart') {
    triple.forEach((name,i)=>set(name,mix(base[name][0],1420+i*235,q(i*.6,8+i*.6)),base[name][1]+bob,.85));
  }
  // The model's headlights are the same shared geometry in every story.
  if(s.headlights) for(const name of [...triple,'silver']) if(a[name]) {
    a[name].querySelectorAll('.sv-headlight').forEach(n=>attrs(n,{fill:'#fff4b9',opacity:motion?.76+.24*Math.sin(time*2):1}));
  }
  createRoutesArt({}).animate(ctx);
}

export const STORIES = TIMED_STORIES.map(definition=>({...definition,frame,render}));
