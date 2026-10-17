/**
 * REELIX catalog.
 *
 * Every title, person, review and date below is fictional and written for this
 * demo. Artwork is either generated for this project or synthetic imagery
 * produced for the catalog; no third-party film assets are used.
 */

const DIALOGUE = {
  tense: [
    'You should have stayed on the road you knew.',
    "If they're watching, they already know we're here.",
    "I'm not asking you to trust me. I'm asking you to listen.",
    'Whatever is in that room, it was never meant to be found.',
    "You think this ends with us? It hasn't even started.",
    'One more mile. Then we stop pretending.',
    "Nobody leaves this place clean. Not even you.",
    "There's a difference between surviving and getting away.",
  ],
  eerie: [
    'The signal came back three minutes before we sent it.',
    'Do you hear that? It sounds like the house breathing.',
    "It's not empty. It's just very good at pretending.",
    "The water remembers everything. That's the problem.",
    "Don't look at it directly. It likes being seen.",
    'We were never the first ones here.',
    'Every door in this hallway opens somewhere else.',
    "If this is a dream, I'd like to wake up now.",
  ],
  warm: [
    "You always did know how to make a place feel like home.",
    "We don't have to fix everything tonight.",
    'Sit down. Eat something. The world can wait an hour.',
    "I kept your letters. All of them.",
    "Do you remember the summer we promised we'd never leave?",
    "Some things are worth being late for.",
    "You don't need to say it. I know.",
    'Stay for one more song.',
  ],
  epic: [
    'The stars are not indifferent. They are patient.',
    'Whatever we find out there, we find it together.',
    'The map ends here. That has never stopped us before.',
    'We are standing on the edge of something no one has named.',
    'History will call this a mistake. Let it.',
    'The kingdom is not the walls. It is the people inside them.',
    "There is a storm coming, and it has our name on it.",
    'One last climb. One last chance to be more than afraid.',
  ],
  playful: [
    "Absolutely not. And yet, somehow, yes.",
    'That is the worst plan I have ever loved.',
    "We're not lost. We're taking the scenic route to disaster.",
    "If we survive this, I'm never speaking to you again.",
    "You had one job. One. But no, you had to be creative.",
    "The recipe says 'a pinch of danger.' I thought it was a metaphor.",
    "Hold my notebook. I'm about to make history.",
    'Nobody panic. I am panicking enough for everyone.',
  ],
};

function mulberry32(seed) {
  let a = typeof seed === 'string' ? hash(seed) : seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

const EPISODE_NAMES = [
  'Cold Open',
  'The Quiet Part',
  'Fault Lines',
  'What the Water Kept',
  'A Door Left Open',
  'The Long Way Back',
  'Undercurrent',
  'Last Light',
  'The Reckoning',
  'Afterglow',
  'The Tell',
  'Broken Compass',
  'Small Hours',
  'The Weight',
  'Homecoming',
  'Static',
];

const BEATS = [
  'A discovery forces {lead} to look twice at a story everyone else has already accepted.',
  'An unexpected visitor arrives in {place}, carrying a warning {lead} cannot afford to ignore.',
  'A carefully kept secret begins to fray at the edges, and {lead} is the first to notice.',
  'Old loyalties are tested when {lead} is offered something they were never supposed to want.',
  'A plan built on trust collapses in {place}, leaving {lead} to improvise with what little is left.',
  '{lead} follows a clue that was never meant to survive the night.',
  'The past catches up with {lead} in a way that changes everything that comes next.',
  'In the season finale, {lead} must choose between the life they know and the truth.',
];

/**
 * Deterministic episode builder for series that do not need hand-written
 * episode cards. Produces believable season/episode scaffolding with unique
 * ids and runtimes.
 */
function makeSeasons({ id, lead, place, counts, custom = {}, startRuntime = 44 }) {
  return counts.map((count, seasonIndex) => {
    const n = seasonIndex + 1;
    const rng = mulberry32(`${id}-s${n}`);
    const episodes = Array.from({ length: count }, (_, i) => {
      const authored = custom[n]?.[i];
      const beat = BEATS[(i + seasonIndex * 2) % BEATS.length];
      const title = authored?.title ?? (i === 0 ? 'Cold Open' : pick(rng, EPISODE_NAMES.slice(1)));
      const synopsis =
        authored?.synopsis ??
        beat.replaceAll('{lead}', lead).replaceAll('{place}', place);
      return {
        id: `s${n}e${i + 1}`,
        season: n,
        episode: i + 1,
        title,
        synopsis,
        runtimeMin: authored?.runtimeMin ?? Math.round(startRuntime + rng() * 12),
      };
    });
    return { n, episodes };
  });
}

const MATURITY_DESCRIPTIONS = {
  'TV-MA': 'Not suitable for ages under 17. Violence, language and mature themes.',
  'TV-14': 'Suitable for ages 14 and up. Moderate violence, language and suggestive themes.',
  'TV-PG': 'Parental guidance suggested. Some material may not be suitable for younger children.',
  'TV-G': 'All ages. Suitable for general audiences.',
  'TV-Y7': 'Designed for children ages 7 and up.',
  'PG-13': 'Parents strongly cautioned. Some material may be inappropriate for children under 13.',
  R: 'Restricted. Under 17 requires an accompanying parent or adult guardian.',
};

const TITLES = [
  {
    id: 'blackwater',
    title: 'Blackwater',
    type: 'series',
    year: 2026,
    maturity: 'TV-MA',
    format: 'Crime Drama Series',
    tagline: 'Every town keeps one secret too many.',
    logline:
      'When a body surfaces in the reservoir, a detective returns to the hometown she spent twenty years trying to forget.',
    synopsis:
      'Detective Mara Voss left Blackwater at eighteen with a bus ticket and a promise never to come back. Twenty years later, a body surfaces in the reservoir with her father\u2019s watch in its pocket. As the town closes ranks, Mara discovers that the case she was sent to solve is the same one that made her leave \u2014 and that someone in Blackwater has been waiting a very long time for her to return.',
    genres: ['Crime', 'Drama', 'Mystery'],
    moods: ['Slow Burn', 'Gritty', 'Atmospheric'],
    cast: [
      { name: 'Renée Calder', role: 'Mara Voss' },
      { name: 'Tomás Ibarra', role: 'Eli Rourke' },
      { name: 'June Halloway', role: 'Cora Voss' },
      { name: 'Peter Nakamura', role: 'Sheriff Bell' },
    ],
    creator: 'Lena Marsh',
    tags: ['Small Town', 'Detective', 'Rain', 'Pacific Northwest', 'Family Secrets'],
    art: {
      poster: '/art/blackwater-poster.jpg',
      backdrop: '/art/blackwater-backdrop.jpg',
      hero: '/art/blackwater-hero.jpg',
      colors: ['#0b2a33', '#e8863a', '#08111a'],
      titleStyle: 'serif',
    },
    rank: 1,
    trend: 99,
    critics: 96,
    dateAdded: '2026-09-18',
    audioLanguages: ['English', 'Hindi', 'Tamil'],
    subtitleLanguages: ['English', 'हिन्दी', 'தமிழ்', 'Español'],
    dialogueMood: 'tense',
    lead: 'Mara',
    place: 'Blackwater',
    accentAudio: 58,
    seasons: makeSeasons({
      id: 'blackwater',
      lead: 'Mara',
      place: 'Blackwater',
      counts: [7, 6, 6],
      startRuntime: 48,
      custom: {
        1: [
          {
            title: 'The Reservoir',
            synopsis:
              'A body surfaces after a record storm, and Mara Voss returns to a town that remembers her better than she remembers herself.',
            runtimeMin: 58,
          },
          {
            title: 'Low Water',
            synopsis:
              'The autopsy points to a drowning that happened somewhere dry. Cora offers Mara a place to stay and an old warning.',
            runtimeMin: 52,
          },
          {
            title: 'The Watch',
            synopsis:
              'Mara traces her father\u2019s watch through a pawnshop ledger and discovers the last person who saw him alive still lives on the ridge.',
            runtimeMin: 55,
          },
          {
            title: 'What the Town Knows',
            synopsis:
              'A town meeting turns ugly when Mara asks about the night the power station flooded. Eli refuses to give her an alibi.',
            runtimeMin: 51,
          },
          {
            title: 'Under the Spillway',
            synopsis:
              'A search of the old spillway uncovers a second mystery buried with the first. Cora finally tells Mara why she never left.',
            runtimeMin: 54,
          },
          {
            title: 'The Long Way Home',
            synopsis:
              'With the bridge washed out and the sheriff out of reach, Mara follows a hunch that puts her and Eli on the wrong side of the town.',
            runtimeMin: 50,
          },
          {
            title: 'Blackwater',
            synopsis:
              'The reservoir gives up what it has been holding since 2004. In the finale, Mara learns who called her home and why.',
            runtimeMin: 63,
          },
        ],
      },
    }),
  },
  {
    id: 'neon-district',
    title: 'Neon District',
    type: 'series',
    year: 2026,
    maturity: 'TV-14',
    format: 'Sci-Fi Action Series',
    tagline: 'The city runs on secrets. She runs on borrowed time.',
    logline:
      'A courier with a black-market cybernetic arm is pulled into a conspiracy that owns every neon sign in Mumbai.',
    synopsis:
      'Mumbai, 2087. Zara Khan moves packages across the Neon District, one of the last parts of the city the towers have not swallowed. When a routine delivery turns out to be a stolen memory, Zara becomes the most wanted courier in the city. Her only way out is to trace the memory back to the corporation that built her arm \u2014 and to the sister she thought died in the towers.',
    genres: ['Sci-Fi', 'Action', 'Thriller'],
    moods: ['Electric', 'Stylish', 'Propulsive'],
    cast: [
      { name: 'Aisha Rahim', role: 'Zara Khan' },
      { name: 'Vikram Sethi', role: 'Arman Qureshi' },
      { name: 'Nila Rao', role: 'Tara Khan' },
      { name: 'Dev Malhotra', role: 'Mr. Zero' },
    ],
    creator: 'Rohan Mehta',
    tags: ['Cyberpunk', 'Mumbai', 'Hacking', 'Sisters', 'Megacity'],
    art: {
      poster: '/art/neon-district-poster.jpg',
      backdrop: '/art/neon-district-backdrop.jpg',
      hero: '/art/neon-district-hero.jpg',
      colors: ['#1b1035', '#ff2e88', '#16e0d0'],
      titleStyle: 'display',
    },
    rank: 3,
    trend: 97,
    critics: 92,
    dateAdded: '2026-10-02',
    audioLanguages: ['Hindi', 'English', 'Tamil'],
    subtitleLanguages: ['English', 'हिन्दी', 'தமிழ்'],
    dialogueMood: 'tense',
    lead: 'Zara',
    place: 'the Neon District',
    accentAudio: 66,
    seasons: makeSeasons({
      id: 'neon-district',
      lead: 'Zara',
      place: 'the Neon District',
      counts: [8, 6],
      startRuntime: 44,
      custom: {
        1: [
          {
            title: 'Borrowed City',
            synopsis:
              'Zara accepts a delivery that pays six months of rent and breaks every rule she has.',
            runtimeMin: 52,
          },
          {
            title: 'Hard Light',
            synopsis:
              'The package turns out to be a memory. Zara tries to sell it before someone can sell her.',
            runtimeMin: 48,
          },
          {
            title: 'Ghost Arm',
            synopsis:
              'A diagnostic at an unlicensed clinic reveals a second layer inside Zara\u2019s cybernetic arm.',
            runtimeMin: 46,
          },
          {
            title: 'The Underpass',
            synopsis:
              'Arman offers a route out of the city. Zara agrees, then changes the plan halfway across.',
            runtimeMin: 49,
          },
          {
            title: 'Memory Tax',
            synopsis:
              'A memory broker shows Zara what the towers do with the memories they take from the district.',
            runtimeMin: 47,
          },
          {
            title: 'Sister Signal',
            synopsis:
              'A voice on the stolen memory belongs to Tara. Zara must decide if it is a message or a trap.',
            runtimeMin: 50,
          },
          {
            title: 'Blackout Market',
            synopsis:
              'With the district dark and the courier guild turning on her, Zara calls in every favor she has left.',
            runtimeMin: 48,
          },
          {
            title: 'The Last Sign',
            synopsis:
              'Zara reaches the tower at the center of it all and learns who has been paying for her life.',
            runtimeMin: 58,
          },
        ],
      },
    }),
  },
  {
    id: 'last-orbit',
    title: 'The Last Orbit',
    type: 'film',
    year: 2026,
    maturity: 'PG-13',
    format: 'Feature Film',
    tagline: 'The loneliest distance is the one home.',
    logline:
      'Alone aboard a dying station, an astronaut must choose between the last ride home and a signal from the rings.',
    synopsis:
      'Six years into a solo mission, Commander Elia Vann is three days from the last flight home when the station receives a transmission from inside the rings of Saturn \u2014 a transmission that knows her name. With the oxygen budget shrinking and mission control going silent, Elia must decide what the mission was really for, and whether the voice on the other end is a rescue, a warning, or something she brought with her.',
    genres: ['Sci-Fi', 'Drama', 'Adventure'],
    moods: ['Epic', 'Contemplative', 'Awe-inspiring'],
    cast: [
      { name: 'Margot Ellis', role: 'Elia Vann' },
      { name: 'Daniel Okoye', role: 'Mission Control (voice)' },
      { name: 'Sara Lindqvist', role: 'Dr. Imogen Vann' },
    ],
    director: 'Sofia Aranda',
    tags: ['Space', 'Alone', 'Saturn', 'Survival', 'First Contact'],
    art: {
      poster: '/art/last-orbit-poster.jpg',
      backdrop: '/art/last-orbit-backdrop.jpg',
      hero: '/art/last-orbit-hero.jpg',
      colors: ['#0a1433', '#f0a35e', '#7fc8ff'],
      titleStyle: 'wide',
    },
    runtimeMin: 138,
    rank: 2,
    trend: 98,
    critics: 94,
    dateAdded: '2026-09-04',
    audioLanguages: ['English', 'Hindi'],
    subtitleLanguages: ['English', 'हिन्दी', 'Deutsch'],
    dialogueMood: 'epic',
    accentAudio: 48,
    isOriginal: true,
  },
  {
    id: 'paper-crown',
    title: 'The Paper Crown',
    type: 'series',
    year: 2025,
    maturity: 'TV-MA',
    format: 'Period Drama Series',
    tagline: 'A crown made of promises breaks the same way.',
    logline:
      'A young queen inherits a bankrupt kingdom, a hostile court and a treaty written in her mother\u2019s blood.',
    synopsis:
      'Queen Isolde of Alderan was never meant to rule. When her mother dies in the winter of 1709, Isolde inherits a kingdom deeply in debt and a court convinced a woman cannot hold it. To survive, she must outmaneuver her own council, marry a man she does not trust, and decide how much of her mother\u2019s war she is willing to finish. The Paper Crown is a story about power, appetite, and the difference between a ruler and a person.',
    genres: ['Period', 'Drama', 'History'],
    moods: ['Opulent', 'Machiavellian', 'Romantic'],
    cast: [
      { name: 'Helena Vry', role: 'Queen Isolde' },
      { name: 'Edmund Ash', role: 'Lord Cassian' },
      { name: 'Priya Nair', role: 'Lady Anaya' },
      { name: 'Tobias Wren', role: 'The Chancellor' },
    ],
    creator: 'Corin Vale',
    tags: ['Royalty', 'Court Intrigue', '18th Century', 'Female Lead'],
    art: {
      poster: '/art/paper-crown-poster.jpg',
      backdrop: '/art/paper-crown-backdrop.jpg',
      hero: '/art/paper-crown-hero.jpg',
      colors: ['#2b1810', '#c9a227', '#123a2c'],
      titleStyle: 'serif',
    },
    rank: 4,
    trend: 93,
    critics: 97,
    dateAdded: '2025-11-22',
    audioLanguages: ['English', 'हिन्दी'],
    subtitleLanguages: ['English', 'हिन्दी', 'Français'],
    dialogueMood: 'tense',
    lead: 'Isolde',
    place: 'the palace',
    accentAudio: 52,
    seasons: makeSeasons({
      id: 'paper-crown',
      lead: 'Isolde',
      place: 'the palace',
      counts: [8, 8],
      startRuntime: 50,
      custom: {
        1: [
          {
            title: 'The Winter Court',
            synopsis:
              'Isolde returns to a capital in mourning and discovers the treasury is empty and the funeral has already been paid for.',
            runtimeMin: 62,
          },
          {
            title: 'A Small Mercy',
            synopsis:
              'A grain shortage becomes a test of the new queen\u2019s authority. Cassian offers a solution with a cost attached.',
            runtimeMin: 55,
          },
          {
            title: 'The Golden Debt',
            synopsis:
              'Lady Anaya uncovers the true size of the kingdom\u2019s debt, and the foreign banker who owns most of it.',
            runtimeMin: 54,
          },
          {
            title: 'Two Queen\u2019s Men',
            synopsis:
              'A duel at court forces Isolde to choose between the law and the loyalty of the man who wrote it.',
            runtimeMin: 56,
          },
        ],
      },
    }),
  },
  {
    id: 'deep-signal',
    title: 'Deep Signal',
    type: 'series',
    year: 2026,
    maturity: 'TV-14',
    format: 'Mystery Series',
    tagline: 'Four thousand metres down, something is listening.',
    logline:
      'A salvage crew at the bottom of the Pacific receives a transmission in their own voices, recorded nine years from now.',
    synopsis:
      'Hired to reclaim a research vessel lost above the Challenger Deep, the crew of the Nadia hears something on the sonar that should not exist: a repeating message, in each of their voices, dated nine years in the future. As the storm above closes their window to surface, engineer Imani Wright begins to suspect the wreck is not the thing they were sent to find \u2014 and that the message is not a warning, but an invitation.',
    genres: ['Sci-Fi', 'Mystery', 'Thriller'],
    moods: ['Claustrophobic', 'Unsettling', 'Cerebral'],
    cast: [
      { name: 'Nash Okada', role: 'Ren Takeda' },
      { name: 'Imani Wright', role: 'Imani Wright' },
      { name: 'Luka Petrov', role: 'Sasha Volkov' },
      { name: 'Cate Moreno', role: 'Dr. Wren' },
    ],
    creator: 'D. J. Arlo',
    tags: ['Deep Sea', 'Time', 'Crew', 'Isolation', 'First Contact'],
    art: {
      poster: '/art/deep-signal-poster.jpg',
      backdrop: '/art/deep-signal-backdrop.jpg',
      hero: '/art/deep-signal-hero.jpg',
      colors: ['#041b2d', '#0aa6a6', '#ffb86b'],
      titleStyle: 'wide',
    },
    rank: 9,
    trend: 90,
    critics: 89,
    dateAdded: '2026-08-21',
    audioLanguages: ['English', 'Hindi'],
    subtitleLanguages: ['English', 'हिन्दी', '日本語'],
    dialogueMood: 'eerie',
    lead: 'Ren',
    place: 'the Nadia',
    accentAudio: 44,
    seasons: makeSeasons({
      id: 'deep-signal',
      lead: 'Ren',
      place: 'the Nadia',
      counts: [6],
      startRuntime: 47,
      custom: {
        1: [
          {
            title: 'The Wreck',
            synopsis:
              'The Nadia reaches the lost vessel and finds every light still burning after nine years underwater.',
            runtimeMin: 56,
          },
          {
            title: 'Our Voices',
            synopsis:
              'The crew decodes the transmission and hears themselves saying things they have never said.',
            runtimeMin: 49,
          },
          {
            title: 'Pressure',
            synopsis:
              'A hull breach forces the crew into the wreck for shelter, where Imani finds a log that predates the ship.',
            runtimeMin: 52,
          },
          {
            title: 'The Ninth Year',
            synopsis:
              'Ren wants to answer the signal. The rest of the crew wants to leave. The storm decides for them.',
            runtimeMin: 50,
          },
          {
            title: 'Hadal',
            synopsis:
              'A dive below the trench floor returns a sample that changes what the crew believes about the message.',
            runtimeMin: 53,
          },
          {
            title: 'The Surface',
            synopsis:
              'With the ascent window closing, the crew must choose what to bring home \u2014 and what to leave listening.',
            runtimeMin: 61,
          },
        ],
      },
    }),
  },
  {
    id: 'crimson-protocol',
    title: 'Crimson Protocol',
    type: 'film',
    year: 2025,
    maturity: 'R',
    format: 'Feature Film',
    tagline: 'Trust no one. Especially the people who trained you.',
    logline:
      'A disgraced intelligence officer has twelve hours to find a leak inside her own agency before the truth gets her killed.',
    synopsis:
      'Nia Serrano was the best field officer Section Nine ever had \u2014 until a mission in Lisbon went wrong and she took the blame. Three years later, she is pulled out of exile for one last job: find the mole who is selling the agency\u2019s deepest secrets. But every trail she follows leads back to the people who trained her, and every ally she trusts knows more than they are saying. In twelve hours, the leak goes public. In twelve hours, Nia intends to still be alive.',
    genres: ['Action', 'Thriller', 'Espionage'],
    moods: ['Relentless', 'Sleek', 'Tense'],
    cast: [
      { name: 'Camila Duarte', role: 'Nia Serrano' },
      { name: 'Elias Kane', role: 'Director Hall' },
      { name: 'Marcus Bell', role: 'Owen Pike' },
      { name: 'Yara Haddad', role: 'Ines' },
    ],
    director: 'Anton Reyes',
    tags: ['Spy', 'One Night', 'Betrayal', 'Europe'],
    art: {
      poster: '/art/crimson-protocol-poster.jpg',
      backdrop: '/art/crimson-protocol-backdrop.jpg',
      hero: '/art/crimson-protocol-hero.jpg',
      colors: ['#22070a', '#c81e2e', '#6c7885'],
      titleStyle: 'display',
    },
    runtimeMin: 121,
    rank: 7,
    trend: 94,
    critics: 84,
    dateAdded: '2025-07-11',
    audioLanguages: ['English', 'हिन्दी', 'Español'],
    subtitleLanguages: ['English', 'हिन्दी', 'Español'],
    dialogueMood: 'tense',
    accentAudio: 62,
  },
  {
    id: 'glasshouse',
    title: 'The Glasshouse',
    type: 'series',
    year: 2026,
    maturity: 'TV-MA',
    format: 'Family Drama Series',
    tagline: 'The whole world can see in. No one can see the cracks.',
    logline:
      'The Vane family built a glass mansion on a cliff. The view is beautiful. The cost is about to come due.',
    synopsis:
      'From the outside, the Vanes have everything: the cliff-top house, the art foundation, the perfect anniversary photograph. Inside, the family is held together by a series of generous lies. When the youngest daughter returns from boarding school with a secret that could destroy the foundation, the family must decide whether their reputation is worth more than the people it was built to protect. A story about money, memory, and the things we stop noticing behind glass.',
    genres: ['Drama', 'Family', 'Mystery'],
    moods: ['Glossy', 'Melancholic', 'Acidic'],
    cast: [
      { name: 'Imogen Blake', role: 'Vivienne Vane' },
      { name: 'Julian Ross', role: 'Elliott Vane' },
      { name: 'Sana Qureshi', role: 'Maya Vane' },
      { name: 'Owen Clarke', role: 'Theo Vane' },
    ],
    creator: 'Elise Marchetti',
    tags: ['Wealth', 'Family Secrets', 'Coastal', 'Art World'],
    art: {
      poster: '/art/glasshouse-poster.jpg',
      backdrop: '/art/glasshouse-backdrop.jpg',
      hero: '/art/glasshouse-hero.jpg',
      colors: ['#0d2230', '#e2b56b', '#3d5f6d'],
      titleStyle: 'serif',
    },
    rank: 5,
    trend: 91,
    critics: 91,
    dateAdded: '2026-07-30',
    audioLanguages: ['English', 'Hindi'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'tense',
    lead: 'Maya',
    place: 'the house',
    accentAudio: 47,
    seasons: makeSeasons({
      id: 'glasshouse',
      lead: 'Maya',
      place: 'the house',
      counts: [7, 6],
      startRuntime: 46,
      custom: {
        1: [
          {
            title: 'Open House',
            synopsis:
              'Maya comes home for the foundation gala and finds her room exactly as she left it \u2014 and her mother nowhere near it.',
            runtimeMin: 54,
          },
          {
            title: 'Reflections',
            synopsis:
              'A photograph from the archive shows someone who should not have been at the house that summer.',
            runtimeMin: 48,
          },
        ],
      },
    }),
  },
  {
    id: 'night-shift',
    title: 'Night Shift',
    type: 'series',
    year: 2026,
    maturity: 'TV-MA',
    format: 'Drama Series',
    tagline: 'The city tells its secrets after midnight.',
    logline:
      'Inside a 24-hour diner, a waitress, a night cook and a cab driver become the last witnesses of everyone who has nowhere else to go.',
    synopsis:
      'The Starlite Diner has been open every night since 1974. Rosa has worked the counter for half of them. Between the last buses and the first deliveries, the diner becomes a confessional for the lonely, the guilty and the almost-famous. Told over one sweltering summer, Night Shift follows three people who take care of strangers for a living and are quietly terrible at taking care of themselves.',
    genres: ['Drama', 'Slice of Life'],
    moods: ['Melancholic', 'Warm', 'Late Night'],
    cast: [
      { name: 'Rosa Delgado', role: 'Rosa' },
      { name: 'Benji Park', role: 'Min' },
      { name: 'Ada Nwosu', role: 'Frankie' },
    ],
    creator: 'Thea Lin',
    tags: ['Diner', 'City', 'Strangers', 'Summer'],
    art: {
      poster: '/art/night-shift-poster.jpg',
      backdrop: '/art/night-shift-backdrop.jpg',
      hero: '/art/night-shift-hero.jpg',
      colors: ['#1a1026', '#ff6b9d', '#2fc7b4'],
      titleStyle: 'serif',
    },
    rank: 12,
    trend: 82,
    critics: 93,
    dateAdded: '2026-09-25',
    audioLanguages: ['English', 'Hindi'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'warm',
    lead: 'Rosa',
    place: 'the Starlite',
    accentAudio: 51,
    seasons: makeSeasons({ id: 'night-shift', lead: 'Rosa', place: 'the Starlite', counts: [6], startRuntime: 42 }),
  },
  {
    id: 'afterlight',
    title: 'Afterlight',
    type: 'film',
    year: 2024,
    maturity: 'PG-13',
    format: 'Feature Film',
    tagline: 'The world ended. The light stayed on.',
    logline:
      'A father and daughter cross a rewilded continent toward a light on the horizon that may not exist.',
    synopsis:
      'Eleven years after the Quiet, the cities have become meadows and the roads belong to deer. Kael and his daughter Wren have survived by following one rule: never stay anywhere the sky is too empty. But when Wren sees a light on the northern horizon, Kael must decide whether to protect her from a beautiful lie or follow it into a country neither of them recognizes. A quiet, hopeful story about what we owe the people who come after us.',
    genres: ['Drama', 'Sci-Fi', 'Adventure'],
    moods: ['Hopeful', 'Haunting', 'Tender'],
    cast: [
      { name: 'Owen Mercer', role: 'Kael' },
      { name: 'Lily Chen', role: 'Wren' },
      { name: 'Amara Diallo', role: 'The Gardener' },
    ],
    director: 'Naomi Fields',
    tags: ['Post-Apocalyptic', 'Father Daughter', 'Nature', 'Journey'],
    art: {
      poster: '/art/afterlight-poster.jpg',
      backdrop: '/art/afterlight-backdrop.jpg',
      hero: '/art/afterlight-hero.jpg',
      colors: ['#12261c', '#e7c873', '#7a9f7a'],
      titleStyle: 'serif',
    },
    runtimeMin: 112,
    rank: 14,
    trend: 76,
    critics: 90,
    dateAdded: '2024-10-04',
    audioLanguages: ['English', 'Hindi'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'warm',
    accentAudio: 46,
  },
  {
    id: 'sierra',
    title: 'Sierra',
    type: 'film',
    year: 2025,
    maturity: 'R',
    format: 'Feature Film',
    tagline: 'One car. One desert. No second chances.',
    logline:
      'A getaway driver with a stolen car and a bag full of someone else\u2019s money has until sunrise to cross the Sierra Nevada.',
    synopsis:
      'Vega has one job: drive the car from Reno to a ghost town on the other side of the Sierra, hand over the bag, and disappear. But the car has a passenger he was not told about, the bag has more in it than money, and the man waiting at the end of the road has been planning this night for eleven years. A taut, sun-scorched noir about the price of a clean slate.',
    genres: ['Thriller', 'Crime', 'Neo-noir'],
    moods: ['Sun-scorched', 'Tense', 'Sparse'],
    cast: [
      { name: 'Diego Ferrer', role: 'Vega' },
      { name: 'Maren Cole', role: 'Jules' },
      { name: 'Harlan Pike', role: 'Bell' },
    ],
    director: 'Cal Boone',
    tags: ['Desert', 'Getaway', 'One Night', 'Neo-noir'],
    art: {
      poster: '/art/sierra-poster.jpg',
      backdrop: '/art/sierra-backdrop.jpg',
      hero: '/art/sierra-hero.jpg',
      colors: ['#2a1408', '#e8742a', '#f2c46b'],
      titleStyle: 'wide',
    },
    runtimeMin: 118,
    rank: 11,
    trend: 84,
    critics: 82,
    dateAdded: '2025-03-14',
    audioLanguages: ['English', 'हिन्दी', 'Español'],
    subtitleLanguages: ['English', 'हिन्दी', 'Español'],
    dialogueMood: 'tense',
    accentAudio: 60,
  },
  {
    id: 'hollow-creek',
    title: 'Hollow Creek',
    type: 'series',
    year: 2025,
    maturity: 'TV-MA',
    format: 'Horror Series',
    tagline: 'The water remembers who lived here.',
    logline:
      'Each autumn, the drowned village of Hollow Creek rises from the reservoir \u2014 and so do the children who vanished there.',
    synopsis:
      'Every October, when the dam releases and the water drops, the rooftops of Hollow Creek appear beneath the surface. For the town of Bellwether, it is a tourist attraction. For Wren Calloway, it is a reminder of the summer her brother disappeared from a street that has been underwater for sixty years. When the village rises early and the children of Bellwether start sleepwalking toward the lake, Wren must finish the investigation her brother started.',
    genres: ['Horror', 'Mystery', 'Supernatural'],
    moods: ['Eerie', 'Creeping Dread', 'Folk Horror'],
    cast: [
      { name: 'Wren Holloway', role: 'Wren Calloway' },
      { name: 'Silas Grey', role: 'Theo Calloway' },
      { name: 'Marla Voss', role: 'Agnes Bell' },
    ],
    creator: 'Imogen Rook',
    tags: ['Small Town', 'Drowned Village', 'Halloween', 'Siblings'],
    art: {
      poster: '/art/hollow-creek-poster.jpg',
      backdrop: '/art/hollow-creek-backdrop.jpg',
      hero: '/art/hollow-creek-hero.jpg',
      colors: ['#12211d', '#a3c9a8', '#d9822b'],
      titleStyle: 'serif',
    },
    rank: 10,
    trend: 87,
    critics: 85,
    dateAdded: '2025-10-17',
    audioLanguages: ['English', 'Hindi'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'eerie',
    lead: 'Wren',
    place: 'Bellwether',
    accentAudio: 42,
    seasons: makeSeasons({ id: 'hollow-creek', lead: 'Wren', place: 'Bellwether', counts: [6, 6], startRuntime: 44 }),
  },
  {
    id: 'static-bloom',
    title: 'Static Bloom',
    type: 'film',
    year: 2026,
    maturity: 'PG',
    format: 'Music Documentary',
    tagline: 'The album that almost never existed.',
    logline:
      'For three years, a beloved band disappeared into a farmhouse to make the record that would end them.',
    synopsis:
      'In 2021, the band Wildflower Static rented a farmhouse in upstate New York with one instruction to themselves: no phones, no visitors, no way out but through. Three years later, they emerged with an album nobody expected and a story none of them agree on. Assembled from 400 hours of footage the band forgot they had, Static Bloom is a funny, painful, intimate portrait of friendship under pressure and the music that survived it.',
    genres: ['Documentary', 'Music'],
    moods: ['Intimate', 'Warm', 'Bittersweet'],
    cast: [
      { name: 'Wildflower Static', role: 'Themselves' },
      { name: 'Mina Fontaine', role: 'Director' },
    ],
    director: 'Mina Fontaine',
    runtimeMin: 94,
    tags: ['Band', 'Recording', 'Friendship', 'Creative Process'],
    art: {
      poster: '/art/static-bloom-poster.jpg',
      backdrop: '/art/static-bloom-backdrop.jpg',
      hero: '/art/static-bloom-hero.jpg',
      colors: ['#231a33', '#f3a531', '#5f8d7a'],
      titleStyle: 'display',
    },
    rank: 18,
    trend: 70,
    critics: 88,
    dateAdded: '2026-04-18',
    audioLanguages: ['English'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'warm',
    kidsSafe: false,
    accentAudio: 55,
  },
  {
    id: 'long-way-home',
    title: 'The Long Way Home',
    type: 'film',
    year: 2023,
    maturity: 'PG-13',
    format: 'Feature Film',
    tagline: 'Two brothers. One urn. Four thousand kilometres.',
    logline:
      'Two estranged brothers drive their father\u2019s ashes across the country and discover he left them a map of everything he never said.',
    synopsis:
      'Daniel has a job, a mortgage and a plan. Ben has a van, a dog and a handful of half-finished songs. When their father dies, his will asks them to scatter his ashes at seven places across the country, with one condition: they have to drive. What follows is a road trip through roadside diners, broken motels, old flames and one very illegal fireworks display, as two people who have spent years avoiding each other discover a father they never met.',
    genres: ['Comedy', 'Drama', 'Adventure'],
    moods: ['Warm', 'Bittersweet', 'Funny'],
    cast: [
      { name: 'Hugo Lee', role: 'Daniel' },
      { name: 'Martin Reyes', role: 'Ben' },
      { name: 'Fiona Wells', role: 'Mona' },
    ],
    director: 'Priya Anand',
    runtimeMin: 104,
    tags: ['Road Trip', 'Brothers', 'Grief', 'Fathers'],
    art: {
      poster: '/art/long-way-home-poster.jpg',
      backdrop: '/art/long-way-home-backdrop.jpg',
      hero: '/art/long-way-home-hero.jpg',
      colors: ['#2a1c11', '#d9a05b', '#5e7c6a'],
      titleStyle: 'serif',
    },
    rank: 22,
    trend: 65,
    critics: 86,
    dateAdded: '2023-06-09',
    audioLanguages: ['English', 'Hindi'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'warm',
    kidsSafe: true,
    accentAudio: 53,
  },
  {
    id: 'midnight-market',
    title: 'Midnight Market',
    type: 'series',
    year: 2026,
    maturity: 'TV-14',
    format: 'Comedy Series',
    tagline: 'Six thieves. One recipe. Zero impulse control.',
    logline:
      'A crew of well-meaning criminals plans to steal the only copy of a recipe that has started three wars and one extremely bad date.',
    synopsis:
      'The Midnight Market runs for six hours, once a month, in a location that changes with the moon. It is the largest black market on the continent, and the only place where a handwritten recipe can be worth more than a country. Nadia Kamal, a chef with a talent for improvisation, assembles a crew of lovable professionals to steal it. Their plan is perfect. Their crew is not. And the recipe, it turns out, has plans of its own.',
    genres: ['Comedy', 'Crime', 'Heist'],
    moods: ['Playful', 'Fast-Paced', 'Charming'],
    cast: [
      { name: 'Nadia Kamal', role: 'Nadia' },
      { name: 'Billy Ortega', role: 'Julio' },
      { name: 'Simone Park', role: 'The Archivist' },
      { name: 'Rafi Ahmed', role: 'Sam' },
    ],
    creator: 'Ritu Shah',
    tags: ['Heist', 'Food', 'Crew', 'Black Market'],
    art: {
      poster: '/art/midnight-market-poster.jpg',
      backdrop: '/art/midnight-market-backdrop.jpg',
      hero: '/art/midnight-market-hero.jpg',
      colors: ['#241033', '#ffb347', '#e04a7a'],
      titleStyle: 'display',
    },
    rank: 6,
    trend: 92,
    critics: 88,
    dateAdded: '2026-09-11',
    audioLanguages: ['English', 'Hindi'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'playful',
    lead: 'Nadia',
    place: 'the market',
    accentAudio: 63,
    seasons: makeSeasons({ id: 'midnight-market', lead: 'Nadia', place: 'the market', counts: [6], startRuntime: 38 }),
  },
  {
    id: 'ironwood',
    title: 'Ironwood',
    type: 'series',
    year: 2024,
    maturity: 'TV-14',
    format: 'Fantasy Series',
    tagline: 'The forest redraws itself every dawn. Tonight, it drew a door.',
    logline:
      'A royal cartographer discovers a forest that changes its own map every night \u2014 and a kingdom on the other side that has been waiting for her.',
    synopsis:
      'Elowen Frost has spent her life drawing the edges of the known world. When the king sends her to map the Ironwood, a forest no expedition has ever returned from, she expects to find nothing but trees. Instead she finds a path that was not there yesterday, a river that runs uphill, and a boy who claims he has been waiting for her for a hundred years. Some maps are warnings. Some are invitations.',
    genres: ['Fantasy', 'Adventure', 'Drama'],
    moods: ['Epic', 'Mythic', 'Romantic'],
    cast: [
      { name: 'Elowen Frost', role: 'Elowen' },
      { name: 'Kavi Raman', role: 'Ash' },
      { name: 'Mireille Dax', role: 'The Cartographer Royal' },
    ],
    creator: 'S. A. Vale',
    tags: ['Forest', 'Maps', 'Magic', 'Kingdom'],
    art: {
      poster: '/art/ironwood-poster.jpg',
      backdrop: '/art/ironwood-backdrop.jpg',
      hero: '/art/ironwood-hero.jpg',
      colors: ['#0e241b', '#b7a05a', '#4e6b52'],
      titleStyle: 'serif',
    },
    rank: 16,
    trend: 74,
    critics: 87,
    dateAdded: '2024-12-06',
    audioLanguages: ['English', 'Hindi'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'epic',
    lead: 'Elowen',
    place: 'the Ironwood',
    accentAudio: 50,
    seasons: makeSeasons({ id: 'ironwood', lead: 'Elowen', place: 'the Ironwood', counts: [8, 8, 6], startRuntime: 46 }),
  },
  {
    id: 'counterweight',
    title: 'Counterweight',
    type: 'series',
    year: 2025,
    maturity: 'TV-PG',
    format: 'Sports Documentary',
    tagline: 'The last face no one has climbed.',
    logline:
      'Three climbers attempt the last unclimbed face in the Karakoram, and discover the mountain has other plans.',
    synopsis:
      'At 7,821 metres, Kailash II has held one secret for a century: a north face that has defeated every expedition that has tried it. In the summer of 2024, three climbers \u2014 a veteran, a prodigy and a documentarian \u2014 set out to change that. What they find is not just a mountain, but a question about why anyone would risk everything for a line on a map. Filmed over two expeditions, Counterweight is about ambition, grief and the cost of being first.',
    genres: ['Documentary', 'Sport', 'Adventure'],
    moods: ['Awe-inspiring', 'Humbling', 'Suspenseful'],
    cast: [
      { name: 'Anja Rasmussen', role: 'Climber' },
      { name: 'Tenzin Norbu', role: 'Climber' },
      { name: 'Leo Hart', role: 'Filmmaker' },
    ],
    director: 'Anja Rasmussen',
    runtimeMin: 52,
    tags: ['Climbing', 'Mountain', 'Expedition', 'Karakoram'],
    art: {
      poster: '/art/counterweight-poster.jpg',
      backdrop: '/art/counterweight-backdrop.jpg',
      hero: '/art/counterweight-hero.jpg',
      colors: ['#0c1c2b', '#9fc6e0', '#e3b26b'],
      titleStyle: 'wide',
    },
    rank: 20,
    trend: 68,
    critics: 94,
    dateAdded: '2025-09-05',
    audioLanguages: ['English', 'Hindi'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'epic',
    kidsSafe: true,
    accentAudio: 45,
    seasons: [1, 2, 3].map((n) => ({
      n,
      episodes: [
        {
          id: `s${n}e1`,
          season: n,
          episode: 1,
          title: ['The Approach', 'The Face', 'The Summit'][n - 1],
          synopsis: [
            'Three climbers arrive at base camp with two good weather windows and one unclimbed face in front of them.',
            'The team commits to the north face as a storm system closes in behind them.',
            'After nine days on the wall, the summit is close enough to touch. The decision to turn back is the hardest of all.',
          ][n - 1],
          runtimeMin: 52 + (n - 1) * 2,
        },
      ],
    })),
  },
  {
    id: 'little-kingdoms',
    title: 'Little Kingdoms',
    type: 'film',
    year: 2025,
    maturity: 'TV-Y7',
    format: 'Animated Feature',
    tagline: 'Even the smallest map can change the world.',
    logline:
      'A mouse mapmaker must redraw an entire garden kingdom after a storm scatters all its borders.',
    synopsis:
      'In the garden behind a very old house, the Kingdom of Hearth is exactly nine metres wide and home to more than a thousand very opinionated creatures. When a summer storm destroys the borders, it is up to Pip, a young mouse whose maps have never been taken seriously, to draw a new kingdom before the beetles and the bees go to war over the fence line. A handmade animated adventure about courage, cartography and finding your own way home.',
    genres: ['Animation', 'Family', 'Adventure'],
    moods: ['Charming', 'Heartwarming', 'Funny'],
    cast: [
      { name: 'Pia Sen', role: 'Pip (voice)' },
      { name: 'Oscar Bell', role: 'Bramble (voice)' },
      { name: 'Nadia Rowe', role: 'Queen Honey (voice)' },
    ],
    director: 'Mira Kobayashi',
    runtimeMin: 88,
    tags: ['Animals', 'Friendship', 'Maps', 'Garden'],
    art: {
      poster: '/art/little-kingdoms-poster.jpg',
      backdrop: '/art/little-kingdoms-backdrop.jpg',
      hero: '/art/little-kingdoms-hero.jpg',
      colors: ['#1c3b2b', '#f3d35b', '#eaa24a'],
      titleStyle: 'display',
    },
    rank: 13,
    trend: 80,
    critics: 92,
    dateAdded: '2025-06-20',
    audioLanguages: ['English', 'Hindi'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'playful',
    kidsSafe: true,
    accentAudio: 57,
  },
  {
    id: 'quiet-fleet',
    title: 'The Quiet Fleet',
    type: 'film',
    year: 2022,
    maturity: 'PG-13',
    format: 'Feature Film',
    tagline: 'The war never heard him coming.',
    logline:
      'In 1916, a pacifist ferry captain becomes an unlikely hero when a fleet of hospital ships is stranded in the North Sea.',
    synopsis:
      'Alistair Finch refused to fight in the Great War. He did not refuse to sail. For six years, the captain of a small ferry has carried supplies, letters and the wounded across the North Sea, insisting that his boat is not a weapon. But when a storm and a U-boat leave three hospital ships stranded in enemy waters, the difference between fighting and saving becomes impossible to explain. Inspired by the quiet history of civilian crews in wartime.',
    genres: ['Historical', 'Drama', 'War'],
    moods: ['Dignified', 'Tense', 'Moving'],
    cast: [
      { name: 'Alistair Finch', role: 'Capt. Finch' },
      { name: 'Ingrid Sorenson', role: 'Maren' },
      { name: 'Peter Ainsley', role: 'First Mate Aldous' },
    ],
    director: 'Ewan Marsh',
    runtimeMin: 132,
    tags: ['Sea', 'WWI', 'Pacifist', 'Rescue'],
    art: {
      poster: '/art/quiet-fleet-poster.jpg',
      backdrop: '/art/quiet-fleet-backdrop.jpg',
      hero: '/art/quiet-fleet-hero.jpg',
      colors: ['#0f1d26', '#7d9ca8', '#c9a568'],
      titleStyle: 'serif',
    },
    rank: 24,
    trend: 58,
    critics: 89,
    dateAdded: '2022-11-11',
    audioLanguages: ['English'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'epic',
    accentAudio: 49,
  },
  {
    id: 'borrowed-light',
    title: 'Borrowed Light',
    type: 'film',
    year: 2025,
    maturity: 'TV-14',
    format: 'Feature Film',
    tagline: 'Some letters are better never sent.',
    logline:
      'Two strangers share a lighthouse for one winter and write letters they never intend to deliver.',
    synopsis:
      'Anika has taken the winter posting because she has nowhere else to be. Noah has taken it because he is being paid to write a book about solitude and has run out of things to say. Snowed in on a rock six kilometres from the Norwegian coast, the two develop a habit: every evening they write a letter to the person they cannot forgive, and every morning they burn it. Then one morning, the fire does not catch.',
    genres: ['Romance', 'Drama'],
    moods: ['Tender', 'Slow Burn', 'Wintry'],
    cast: [
      { name: 'Noah Wren', role: 'Noah' },
      { name: 'Anika Shah', role: 'Anika' },
    ],
    director: 'Ida Solveig',
    runtimeMin: 99,
    tags: ['Lighthouse', 'Letters', 'Winter', 'Solitude'],
    art: {
      poster: '/art/borrowed-light-poster.jpg',
      backdrop: '/art/borrowed-light-backdrop.jpg',
      hero: '/art/borrowed-light-hero.jpg',
      colors: ['#131c2b', '#d6c3a1', '#8098a8'],
      titleStyle: 'serif',
    },
    rank: 17,
    trend: 72,
    critics: 85,
    dateAdded: '2025-12-05',
    audioLanguages: ['English', 'Norwegian'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'warm',
    kidsSafe: true,
    accentAudio: 44,
  },
  {
    id: 'signal-lost',
    title: 'Signal Lost',
    type: 'series',
    year: 2025,
    maturity: 'TV-MA',
    format: 'Thriller Series',
    tagline: 'Every call leaves a trace. Some leave a body.',
    logline:
      'A late-night radio host takes a call from a listener who disappeared seventeen years ago.',
    synopsis:
      'Cleo Hart hosts the graveyard shift on a struggling AM station, taking calls from insomniacs, conspiracy theorists and people who just need someone to talk to. Then, at 2:47 AM, a caller introduces herself as Lila Voss \u2014 a teenager who vanished from the town in 2008. The call is not a prank. The call contains details no one could know. And when Cleo starts digging, she realizes the caller has been trying to reach someone on her frequency for seventeen years.',
    genres: ['Thriller', 'Mystery', 'Drama'],
    moods: ['Creeping Dread', 'Atmospheric', 'Cerebral'],
    cast: [
      { name: 'Cleo Hart', role: 'Cleo' },
      { name: 'Omar Deniz', role: 'Detective Rahal' },
      { name: 'Lila Voss', role: 'The Caller' },
    ],
    creator: 'Jonas Reel',
    tags: ['Radio', 'Cold Case', 'Small Town', 'Caller'],
    art: {
      poster: '/art/signal-lost-poster.jpg',
      backdrop: '/art/signal-lost-backdrop.jpg',
      hero: '/art/signal-lost-hero.jpg',
      colors: ['#1b1420', '#c3544e', '#e0b17a'],
      titleStyle: 'wide',
    },
    rank: 15,
    trend: 79,
    critics: 86,
    dateAdded: '2025-05-16',
    audioLanguages: ['English', 'Hindi'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'eerie',
    lead: 'Cleo',
    place: 'the station',
    accentAudio: 41,
    seasons: makeSeasons({ id: 'signal-lost', lead: 'Cleo', place: 'the station', counts: [6], startRuntime: 43 }),
  },
  {
    id: 'second-summer',
    title: 'Second Summer',
    type: 'series',
    year: 2024,
    maturity: 'TV-14',
    format: 'Coming-of-Age Series',
    tagline: 'One last summer before everything changes.',
    logline:
      'Four friends make a promise on the last summer before college and spend the year discovering how impossible promises are.',
    synopsis:
      'At the end of the summer before their final year of school, four friends bury a time capsule and swear they will open it together in ten years. Then one of them gets a scholarship 4,000 kilometres away, another falls in love with the wrong person, and the lives they planned begin to drift apart. Told backwards and forwards across a single year, Second Summer is about the friendships that make us, the ones that break us, and the summer that does both.',
    genres: ['Coming of Age', 'Drama', 'Romance'],
    moods: ['Nostalgic', 'Warm', 'Bittersweet'],
    cast: [
      { name: 'Ava Moreno', role: 'Ines' },
      { name: 'Theo Lin', role: 'Won' },
      { name: 'Ray Okoro', role: 'Dae' },
      { name: 'Mila Petrova', role: 'June' },
    ],
    creator: 'Hana Alvarez',
    tags: ['Friendship', 'Teen', 'Summer', 'Time Capsule'],
    art: {
      poster: '/art/second-summer-poster.jpg',
      backdrop: '/art/second-summer-backdrop.jpg',
      hero: '/art/second-summer-hero.jpg',
      colors: ['#202a1c', '#e8b86b', '#80a4a0'],
      titleStyle: 'serif',
    },
    rank: 8,
    trend: 89,
    critics: 90,
    dateAdded: '2024-08-09',
    audioLanguages: ['English', 'Hindi'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'warm',
    lead: 'Ines',
    place: 'the lake',
    accentAudio: 54,
    kidsSafe: true,
    seasons: makeSeasons({ id: 'second-summer', lead: 'Ines', place: 'the lake', counts: [8, 8], startRuntime: 40 }),
  },
  {
    id: 'grand-bazaar',
    title: 'Grand Bazaar',
    type: 'series',
    year: 2026,
    maturity: 'TV-PG',
    format: 'Food & Travel Documentary',
    tagline: 'Every recipe is a history of somewhere.',
    logline:
      'A chef travels the world\u2019s oldest markets in search of recipes that have survived every attempt to change them.',
    synopsis:
      'What do a spice stall in Istanbul, a noodle cart in Xi\u2019an and a bakery in Marrakech have in common? They are all archives \u2014 living libraries of recipes passed down not through books, but through hands. Host Samir Aziz travels to six of the world\u2019s great markets to meet the people keeping those archives alive, and asks what we lose when a recipe disappears. Warm, hungry and quietly profound.',
    genres: ['Documentary', 'Travel', 'Food'],
    moods: ['Warm', 'Curious', 'Sensory'],
    cast: [{ name: 'Samir Aziz', role: 'Host' }],
    director: 'Layla Haddad',
    runtimeMin: 46,
    tags: ['Markets', 'Food', 'History', 'Travel'],
    art: {
      poster: '/art/grand-bazaar-poster.jpg',
      backdrop: '/art/grand-bazaar-backdrop.jpg',
      hero: '/art/grand-bazaar-hero.jpg',
      colors: ['#2b1a10', '#e2a13d', '#a33d2f'],
      titleStyle: 'serif',
    },
    rank: 21,
    trend: 67,
    critics: 95,
    dateAdded: '2026-06-12',
    audioLanguages: ['English', 'Hindi'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'warm',
    kidsSafe: true,
    accentAudio: 52,
    seasons: [
      {
        n: 1,
        episodes: [
          ['Istanbul', 'Spice routes, family secrets and the world\u2019s oldest coffee.', 48],
          ['Xi\u2019an', 'The night market where noodles are made at 2 AM and no one writes anything down.', 46],
          ['Marrakech', 'Six generations of bakers, one stone oven, and a recipe kept in rhyme.', 45],
          ['Cairo', 'A market built on layers of empire, and the bread that outlasted them all.', 47],
          ['Delhi', 'A 400-year-old bazaar where recipes are older than the streets around them.', 50],
          ['Lisbon', 'Salt cod, saudade and the oldest grocery in Europe.', 44],
        ].map(([title, synopsis, runtimeMin], index) => ({
          id: `s1e${index + 1}`,
          season: 1,
          episode: index + 1,
          title,
          synopsis,
          runtimeMin,
        })),
      },
    ],
  },
  {
    id: 'ninth-floor',
    title: 'The Ninth Floor',
    type: 'film',
    year: 2023,
    maturity: 'R',
    format: 'Feature Film',
    tagline: 'The hotel has twelve floors. He works on the ninth.',
    logline:
      'A night auditor discovers a floor that does not exist and a guest who has been checking out for forty years.',
    synopsis:
      'The Grand Meridian has 12 floors, 214 rooms and a guest book that goes back to 1904. Tomas works the night desk, and his only rule is simple: never take the service elevator to the ninth floor after midnight. When a booking error forces him upstairs, he finds a corridor that is not on any blueprint, a suite that smells of cigarette smoke and rain, and a guest who insists she has been waiting for him. A slow-burning mystery about the rooms we build to keep the past in.',
    genres: ['Mystery', 'Horror', 'Drama'],
    moods: ['Unsettling', 'Dreamlike', 'Atmospheric'],
    cast: [
      { name: 'Greta Mold', role: 'Tomas' },
      { name: 'Idris Vale', role: 'The Manager' },
      { name: 'Nora Ferris', role: 'The Guest' },
    ],
    director: 'Noor Haddad',
    runtimeMin: 108,
    tags: ['Hotel', 'Haunting', 'Night', 'Rooms'],
    art: {
      poster: '/art/ninth-floor-poster.jpg',
      backdrop: '/art/ninth-floor-backdrop.jpg',
      hero: '/art/ninth-floor-hero.jpg',
      colors: ['#1b1a12', '#d1b97a', '#45554d'],
      titleStyle: 'serif',
    },
    rank: 19,
    trend: 69,
    critics: 83,
    dateAdded: '2023-10-27',
    audioLanguages: ['English'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'eerie',
    accentAudio: 43,
  },
  {
    id: 'wild-lines',
    title: 'Wild Lines',
    type: 'series',
    year: 2026,
    maturity: 'TV-G',
    format: 'Nature Documentary',
    tagline: 'Borders are something humans invented.',
    logline:
      'A journey along the invisible borders that animals draw across continents \u2014 and what happens when we cross them.',
    synopsis:
      'Every year, billions of animals move across a map that existed long before ours. Narrated by Eleanor Quill, Wild Lines follows six migrations across the planet \u2014 from sandhill cranes over the Platte River to whale sharks in the Indian Ocean \u2014 and asks what those invisible routes tell us about the world we share. Filmed over four years with an original orchestral score.',
    genres: ['Documentary', 'Nature'],
    moods: ['Awe-inspiring', 'Peaceful', 'Epic'],
    cast: [{ name: 'Eleanor Quill', role: 'Narrator' }],
    director: 'Tomas Rane',
    runtimeMin: 54,
    tags: ['Animals', 'Migration', 'Planet', 'Nature'],
    art: {
      poster: '/art/wild-lines-poster.jpg',
      backdrop: '/art/wild-lines-backdrop.jpg',
      hero: '/art/wild-lines-hero.jpg',
      colors: ['#0d2422', '#e2cb8b', '#5ba9a4'],
      titleStyle: 'wide',
    },
    rank: 23,
    trend: 61,
    critics: 96,
    dateAdded: '2026-03-06',
    audioLanguages: ['English', 'Hindi'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'epic',
    kidsSafe: true,
    accentAudio: 54,
    seasons: [
      {
        n: 1,
        episodes: [
          ['The Flyway', 'Half a million cranes cross a river in Nebraska on a route older than the continent.', 52],
          ['The Deep Road', 'Whale sharks follow a current that no map has ever shown.', 51],
          ['The Long Walk', 'In the Arctic, a caribou herd crosses ground that is melting beneath its hooves.', 53],
          ['The Night Drift', 'On a single summer night, a forest sends a billion insects across a valley.', 50],
          ['The Mountain Pass', 'Snow leopards follow a ridge that has become a border between two countries.', 54],
          ['The Way Back', 'Sea turtles return to a beach they last saw as hatchlings, guided by a memory we cannot explain.', 58],
        ].map(([title, synopsis, runtimeMin], index) => ({
          id: `s1e${index + 1}`,
          season: 1,
          episode: index + 1,
          title,
          synopsis,
          runtimeMin,
        })),
      },
    ],
  },
  {
    id: 'karst',
    title: 'Karst',
    type: 'film',
    year: 2024,
    maturity: 'R',
    format: 'Feature Film',
    tagline: 'The water is rising. The exit is below.',
    logline:
      'A cave-diving team trapped beneath a mountain must find an exit that the map says does not exist.',
    synopsis:
      'Two kilometres beneath the limestone peaks of Guangxi, a cave system floods faster than anyone predicted. Six divers, one broken guide line and a rising water level. With the entrance sealed by the storm and the radio dead, the team must attempt a route their instruments say is impossible \u2014 through a sump no human being has ever swum. Karst is a survival thriller about trust, expertise, and the moment when the only way out is through.',
    genres: ['Thriller', 'Adventure', 'Survival'],
    moods: ['Tense', 'Claustrophobic', 'Visceral'],
    cast: [
      { name: 'Jae Kim', role: 'Dae' },
      { name: 'Lila Brandt', role: 'Soren' },
      { name: 'Marco Ferreira', role: 'Tomás' },
    ],
    director: 'Nico Ando',
    runtimeMin: 96,
    tags: ['Cave Diving', 'Survival', 'Flood', 'Trapped'],
    art: {
      poster: '/art/karst-poster.jpg',
      backdrop: '/art/karst-backdrop.jpg',
      hero: '/art/karst-hero.jpg',
      colors: ['#0a1a1c', '#2b8c8c', '#e1c38b'],
      titleStyle: 'wide',
    },
    rank: 25,
    trend: 56,
    critics: 80,
    dateAdded: '2024-02-16',
    audioLanguages: ['English', 'Mandarin'],
    subtitleLanguages: ['English', 'हिन्दी'],
    dialogueMood: 'tense',
    accentAudio: 46,
  },
  {
    id: 'palindrome',
    title: 'Palindrome',
    type: 'film',
    year: 2027,
    maturity: 'TV-MA',
    format: 'Feature Film',
    tagline: 'Some sentences read the same in both directions. So do some lives.',
    logline:
      'A linguist discovers a sentence that reads identically forwards, backwards \u2014 and across two timelines.',
    synopsis:
      'Dr. Sera Vanterpool has spent her career studying languages that no longer have speakers. When a missing colleague leaves her a single sentence written in a script that has not been used for 3,000 years, she realizes it is a palindrome \u2014 not just of letters, but of events. Every time she reads it aloud, the past changes. And every time the past changes, someone she loves is removed from the present. A cerebral science-fiction thriller about grief, language and the terrifying symmetry of cause and effect.',
    genres: ['Sci-Fi', 'Thriller', 'Mystery'],
    moods: ['Cerebral', 'Mind-bending', 'Tense'],
    cast: [
      { name: 'Sera Vanterpool', role: 'Dr. Sera Vanterpool' },
      { name: 'Jonah Reed', role: 'Miles' },
      { name: 'Ayo Bankole', role: 'The Curator' },
    ],
    director: 'Ilse Novak',
    runtimeMin: 127,
    tags: ['Time', 'Language', 'Palindrome', 'Alternate Timelines'],
    art: {
      poster: '/art/palindrome-poster.jpg',
      backdrop: '/art/palindrome-backdrop.jpg',
      hero: '/art/palindrome-hero.jpg',
      colors: ['#19121f', '#c7a5ff', '#40c4b0'],
      titleStyle: 'wide',
    },
    dateAdded: '2027-02-13',
    status: 'coming-soon',
    comingSoonDate: '2027-02-13',
    trend: 78,
    critics: 0,
    audioLanguages: ['English'],
    subtitleLanguages: ['English'],
    dialogueMood: 'eerie',
    accentAudio: 40,
    isOriginal: true,
  },
];

// Shared presentation helpers -------------------------------------------------

const SERIES_IDS = new Set(TITLES.filter((t) => t.type === 'series').map((t) => t.id));

function episodeCount(title) {
  if (title.type !== 'series' || !title.seasons) return 1;
  return title.seasons.reduce((sum, season) => sum + season.episodes.length, 0);
}

export const CATALOG = TITLES.map((title) => {
  const seasons = title.type === 'series' ? title.seasons ?? [] : [];
  const allEpisodes = seasons.flatMap((season) => season.episodes);
  const maturityDescription = MATURITY_DESCRIPTIONS[title.maturity] ?? 'Rated for general audiences.';
  const dialogue = DIALOGUE[title.dialogueMood] ?? DIALOGUE.warm;
  return {
    ...title,
    isOriginal: title.isOriginal ?? true,
    kidsSafe: Boolean(title.kidsSafe),
    status: title.status ?? 'available',
    matchSeed: 70 + (hash(title.id) % 30),
    episodeCount: episodeCount(title),
    seasonCount: seasons.length || 1,
    maturityDescription,
    dialogue,
    averageRuntime:
      title.type === 'film'
        ? title.runtimeMin
        : Math.round(
            allEpisodes.reduce((sum, episode) => sum + episode.runtimeMin, 0) /
              Math.max(allEpisodes.length, 1),
          ),
    seasons,
    availableDate: title.comingSoonDate ?? title.dateAdded,
  };
});

export const CATALOG_BY_ID = new Map(CATALOG.map((title) => [title.id, title]));
export { SERIES_IDS, MATURITY_DESCRIPTIONS };
