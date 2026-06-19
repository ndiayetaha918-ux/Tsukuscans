import type { Manga, Chapter, Genre } from "@/lib/types";

// Deterministic chapter generation keeps the catalog compact while giving the
// reader real structure (numbers, titles, page counts, release cadence).
function makeChapters(seed: string, count: number, startDaysAgo: number): Chapter[] {
  const titles = [
    "Premier sang", "La marée monte", "Cendres", "Le pacte", "Sous la lune",
    "Fracture", "Le silence d'après", "Verre brisé", "Racines", "L'aube blanche",
    "Hors-champ", "Le neuvième nom", "Saumure", "Orbite basse", "Rémanence",
    "La longue salle", "Point de rupture", "Dernier tour", "Le cartographe", "Éclipse",
  ];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: count }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const pages = 14 + (h % 22);
    const day = startDaysAgo - i * 12;
    const date = new Date(Date.now() - day * 86400000);
    return {
      id: `${seed}-c${i + 1}`,
      number: i + 1,
      title: titles[(i + (h % titles.length)) % titles.length],
      pages,
      releasedAt: date.toISOString(),
    };
  });
}

type Seed = Omit<Manga, "chapters" | "sourceId"> & { chapterCount: number };

const SEEDS: Seed[] = [
  {
    id: "hollow-crown", title: "Hollow Crown", author: "R. Vael", year: 2021, status: "En cours",
    demographic: "Seinen", genres: ["Dark Fantasy", "Action", "Mystery"],
    tags: ["dark", "royaume maudit", "épée", "tragédie", "antihéros"],
    tagline: "Un roi sans royaume. Une couronne qui dévore.",
    synopsis: "Le dernier héritier d'un trône effacé de l'Histoire remonte une lignée de souverains que tout le monde a juré d'oublier.",
    rating: 9.1, popularity: 74, palette: [284, 320], motif: "eclipse", chapterCount: 64,
  },
  {
    id: "ashfall-requiem", title: "Ashfall Requiem", author: "M. Sorel", year: 2019, status: "En cours",
    demographic: "Seinen", genres: ["Dark Fantasy", "Horror", "Adventure"],
    tags: ["cendres", "fin du monde", "voyage", "désespoir lumineux"],
    tagline: "Le ciel tombe en silence depuis sept ans.",
    synopsis: "Sous une pluie de cendres éternelle, deux survivants marchent vers la seule ville où, dit-on, le soleil brille encore.",
    rating: 8.7, popularity: 58, palette: [28, 300], motif: "rift", chapterCount: 41,
  },
  {
    id: "the-black-lantern", title: "The Black Lantern", author: "K. Adeyemi", year: 2022, status: "En cours",
    demographic: "Seinen", genres: ["Dark Fantasy", "Mystery", "Horror"],
    tags: ["enquête", "occulte", "ville pluvieuse", "fantômes"],
    tagline: "Certaines lumières ne montrent que les morts.",
    synopsis: "Un veilleur de nuit hérite d'une lanterne qui révèle les regrets des disparus — et attire ce qui les a tués.",
    rating: 8.4, popularity: 49, palette: [262, 210], motif: "ink", chapterCount: 33,
  },
  {
    id: "tokyo-after-rain", title: "Tokyo After Rain", author: "H. Mizuki", year: 2020, status: "Terminé",
    demographic: "Josei", genres: ["Romance", "Slice of Life", "Psychological"],
    tags: ["adulte", "lent", "mélancolie", "grande ville", "seconde chance"],
    tagline: "Deux solitudes, un même parapluie.",
    synopsis: "Une architecte et un libraire se croisent chaque soir au même feu rouge, sans jamais oser parler — jusqu'à l'averse de trop.",
    rating: 9.0, popularity: 81, palette: [330, 280], motif: "tide", chapterCount: 28,
  },
  {
    id: "letters-to-the-moon", title: "Letters to the Moon", author: "A. Caron", year: 2023, status: "En cours",
    demographic: "Shojo", genres: ["Romance", "Slice of Life"],
    tags: ["lycée", "lettres", "doux", "premier amour"],
    tagline: "Elle écrit à quelqu'un qu'elle n'a jamais vu.",
    synopsis: "Chaque pleine lune, une lettre anonyme apparaît dans son casier. Cette année, elle décide de répondre.",
    rating: 8.2, popularity: 67, palette: [300, 250], motif: "bloom", chapterCount: 45,
  },
  {
    id: "iron-lotus", title: "Iron Lotus", author: "J. Tanaka", year: 2018, status: "En cours",
    demographic: "Shonen", genres: ["Action", "Adventure", "Shonen"],
    tags: ["arts martiaux", "tournoi", "vengeance", "maître-élève"],
    tagline: "Frappe une fois. Frappe juste.",
    synopsis: "Orpheline recueillie par un vieux forgeron, elle apprend que chaque coup parfait laisse une fleur de métal dans la chair.",
    rating: 8.9, popularity: 88, palette: [18, 40], motif: "bloom", chapterCount: 112,
  },
  {
    id: "razor-meridian", title: "Razor Meridian", author: "D. Okonkwo", year: 2021, status: "En cours",
    demographic: "Seinen", genres: ["Action", "Sci-Fi", "Psychological"],
    tags: ["cyberpunk", "mercenaire", "implants", "ville verticale"],
    tagline: "La ligne entre l'homme et la lame s'efface.",
    synopsis: "Un tueur à gages augmenté découvre que ses souvenirs sont des contrats qu'on a téléchargés dans son crâne.",
    rating: 8.6, popularity: 63, palette: [210, 300], motif: "circuit", chapterCount: 52,
  },
  {
    id: "vanguard-zero", title: "Vanguard Zero", author: "S. Reyes", year: 2022, status: "En cours",
    demographic: "Shonen", genres: ["Action", "Sci-Fi", "Shonen"],
    tags: ["mecha", "guerre", "amitié", "pilotes"],
    tagline: "Le dernier rempart a seize ans.",
    synopsis: "Quand les défenses adultes s'effondrent, une académie d'ados pilote les derniers titans contre une marée venue du ciel.",
    rating: 8.3, popularity: 79, palette: [230, 200], motif: "circuit", chapterCount: 58,
  },
  {
    id: "glass-hours", title: "Glass Hours", author: "Y. Fontaine", year: 2020, status: "Terminé",
    demographic: "Seinen", genres: ["Psychological", "Mystery", "Slice of Life"],
    tags: ["thriller lent", "mémoire", "huis clos", "non-fiable"],
    tagline: "Combien de toi se souviennent vraiment ?",
    synopsis: "Un homme se réveille chaque matin certain d'avoir vécu une vie différente la veille. Quelqu'un, quelque part, prend des notes.",
    rating: 9.2, popularity: 44, palette: [250, 190], motif: "rift", chapterCount: 22,
  },
  {
    id: "the-quiet-room", title: "The Quiet Room", author: "I. Novak", year: 2023, status: "En cours",
    demographic: "Seinen", genres: ["Psychological", "Horror", "Mystery"],
    tags: ["hôpital", "silence", "tension", "esprit"],
    tagline: "Ici, le bruit est interdit. Surtout celui des pensées.",
    synopsis: "Une thérapeute accepte un poste dans une clinique où l'on soigne par le silence absolu. Le premier patient n'a jamais parlé. Il écrit.",
    rating: 8.5, popularity: 38, palette: [200, 270], motif: "ink", chapterCount: 19,
  },
  {
    id: "breakpoint", title: "Breakpoint", author: "T. Larsson", year: 2019, status: "En cours",
    demographic: "Shonen", genres: ["Sport", "Shonen", "Slice of Life"],
    tags: ["tennis", "rivalité", "dépassement", "équipe"],
    tagline: "Le point qui change tout arrive toujours sans prévenir.",
    synopsis: "Recalé du circuit junior, un gaucher au revers impossible rejoint le club le plus faible du pays — et décide de le porter au sommet.",
    rating: 8.4, popularity: 71, palette: [150, 110], motif: "tide", chapterCount: 96,
  },
  {
    id: "last-lap", title: "Last Lap", author: "G. Bianchi", year: 2021, status: "En cours",
    demographic: "Seinen", genres: ["Sport", "Psychological"],
    tags: ["course", "moto", "deuil", "vitesse"],
    tagline: "Elle court contre un fantôme. Le sien.",
    synopsis: "Après l'accident qui a coûté la vie à son frère, une pilote reprend le guidon pour finir la course qu'il n'a jamais terminée.",
    rating: 8.1, popularity: 41, palette: [18, 60], motif: "circuit", chapterCount: 37,
  },
  {
    id: "stormcallers", title: "Stormcallers", author: "P. N'Diaye", year: 2022, status: "En cours",
    demographic: "Shonen", genres: ["Shonen", "Adventure", "Dark Fantasy"],
    tags: ["magie", "tempête", "guilde", "élu", "monde ouvert"],
    tagline: "Le tonnerre choisit ses enfants.",
    synopsis: "Dans un monde où la pluie n'est jamais tombée, un gamin entend l'orage pour la première fois — et l'orage lui répond.",
    rating: 8.8, popularity: 85, palette: [250, 215], motif: "rift", chapterCount: 74,
  },
  {
    id: "blade-of-nine-suns", title: "Blade of the Nine Suns", author: "L. Wei", year: 2017, status: "Terminé",
    demographic: "Shonen", genres: ["Shonen", "Action", "Adventure"],
    tags: ["wuxia", "épée", "ascension", "clans"],
    tagline: "Neuf soleils. Une seule lame pour les éteindre.",
    synopsis: "Un porteur d'eau gravit les neuf montagnes interdites pour défier les empereurs-soleil qui ont brûlé son village.",
    rating: 8.6, popularity: 76, palette: [40, 20], motif: "bloom", chapterCount: 140,
  },
  {
    id: "neon-requiem", title: "Neon Requiem", author: "C. Mercier", year: 2023, status: "En cours",
    demographic: "Seinen", genres: ["Sci-Fi", "Psychological", "Mystery"],
    tags: ["IA", "noir", "musique", "mémoire", "futur proche"],
    tagline: "La dernière chanson était un message.",
    synopsis: "Une enquêtrice traque un compositeur disparu à travers les morceaux qu'une IA continue de publier en son nom.",
    rating: 8.7, popularity: 55, palette: [300, 210], motif: "circuit", chapterCount: 30,
  },
  {
    id: "orbital-decay", title: "Orbital Decay", author: "F. Haddad", year: 2020, status: "En cours",
    demographic: "Seinen", genres: ["Sci-Fi", "Adventure", "Horror"],
    tags: ["espace", "station", "isolement", "survie"],
    tagline: "Personne ne vous entend tomber.",
    synopsis: "L'équipage d'une station en chute libre vers l'atmosphère a quarante jours pour réparer l'irréparable — ou décider qui survit.",
    rating: 8.3, popularity: 47, palette: [220, 280], motif: "rift", chapterCount: 26,
  },
  {
    id: "konbini-nights", title: "Konbini Nights", author: "N. Sato", year: 2021, status: "En cours",
    demographic: "Josei", genres: ["Slice of Life", "Romance", "Psychological"],
    tags: ["tranche de vie", "nuit", "travail", "tendre", "solitude"],
    tagline: "À 3 h du matin, tout le monde a une histoire.",
    synopsis: "Dans une supérette ouverte 24 h, une employée insomniaque collectionne les vies des inconnus qui poussent la porte.",
    rating: 8.5, popularity: 62, palette: [160, 280], motif: "tide", chapterCount: 48,
  },
  {
    id: "crawlspace", title: "Crawlspace", author: "B. Hollis", year: 2022, status: "En cours",
    demographic: "Seinen", genres: ["Horror", "Mystery", "Psychological"],
    tags: ["maison hantée", "claustrophobie", "famille", "secret"],
    tagline: "La maison respirait. Personne ne l'écoutait.",
    synopsis: "Une famille emménage dans une maison trop bon marché. Leur fille est la seule à savoir ce qui vit entre les murs.",
    rating: 8.0, popularity: 35, palette: [20, 270], motif: "ink", chapterCount: 17,
  },
  {
    id: "salt-and-smoke", title: "Salt & Smoke", author: "O. Bennet", year: 2018, status: "Terminé",
    demographic: "Seinen", genres: ["Seinen", "Slice of Life", "Romance"],
    tags: ["cuisine", "deuil", "village côtier", "lent", "adulte"],
    tagline: "On guérit ce qu'on cuisine.",
    synopsis: "Un chef brisé reprend l'auberge familiale au bord de la mer et réapprend à goûter le monde, un plat à la fois.",
    rating: 8.9, popularity: 51, palette: [40, 200], motif: "tide", chapterCount: 34,
  },
  {
    id: "the-ninth-witness", title: "The Ninth Witness", author: "E. Costa", year: 2023, status: "En cours",
    demographic: "Seinen", genres: ["Mystery", "Psychological", "Action"],
    tags: ["procès", "complot", "amnésie", "tension"],
    tagline: "Huit témoins sont morts. Elle est la neuvième.",
    synopsis: "La seule survivante d'un crime qu'elle ne se rappelle pas devient à la fois la clé de l'enquête et la prochaine cible.",
    rating: 8.4, popularity: 53, palette: [264, 200], motif: "rift", chapterCount: 24,
  },
  {
    id: "saltborne", title: "Saltborne", author: "V. Kessler", year: 2021, status: "En cours",
    demographic: "Shonen", genres: ["Adventure", "Dark Fantasy", "Shonen"],
    tags: ["mer", "pirates", "monstres marins", "liberté"],
    tagline: "Né de l'écume, promis à l'abîme.",
    synopsis: "Un garçon qui ne peut pas se noyer s'engage sur le navire d'une capitaine maudite pour atteindre le bout d'un océan sans fin.",
    rating: 8.6, popularity: 69, palette: [200, 250], motif: "tide", chapterCount: 61,
  },
  {
    id: "mirrorbind", title: "Mirrorbind", author: "S. Aoki", year: 2022, status: "En cours",
    demographic: "Josei", genres: ["Psychological", "Romance", "Mystery"],
    tags: ["double", "identité", "obsession", "lent"],
    tagline: "De l'autre côté du miroir, elle vit ta vie en mieux.",
    synopsis: "Une femme rencontre son sosie exact — qui occupe déjà la place qu'elle rêvait d'avoir, et n'a aucune intention de la rendre.",
    rating: 8.5, popularity: 42, palette: [310, 250], motif: "eclipse", chapterCount: 27,
  },
  {
    id: "hex-academy", title: "Hex Academy", author: "M. Dubois", year: 2020, status: "En cours",
    demographic: "Shonen", genres: ["Shonen", "Dark Fantasy", "Action"],
    tags: ["école de magie", "malédictions", "amitié", "tournoi"],
    tagline: "On n'y apprend pas la magie. On y apprend à survivre.",
    synopsis: "Recruté par une académie qui forme des chasseurs de malédictions, un élève sans pouvoir devient l'arme la plus dangereuse de sa promo.",
    rating: 8.8, popularity: 90, palette: [280, 320], motif: "eclipse", chapterCount: 83,
  },
  {
    id: "slow-mornings", title: "Slow Mornings", author: "R. Lindqvist", year: 2023, status: "En cours",
    demographic: "Josei", genres: ["Slice of Life", "Romance"],
    tags: ["calme", "couple", "quotidien", "tendre", "café"],
    tagline: "Rien ne se passe. Tout y est.",
    synopsis: "Un an dans la vie de deux personnes qui s'aiment sans drame : le café, la pluie, les silences confortables et les petites peurs.",
    rating: 8.3, popularity: 57, palette: [70, 320], motif: "bloom", chapterCount: 39,
  },
  {
    id: "ghost-in-the-signal", title: "Ghost in the Signal", author: "A. Volkov", year: 2022, status: "En cours",
    demographic: "Seinen", genres: ["Sci-Fi", "Horror", "Mystery"],
    tags: ["radio", "anomalie", "isolement", "paranoïa"],
    tagline: "Quelqu'un répond sur une fréquence morte.",
    synopsis: "Seule dans une station relais arctique, une technicienne capte une voix sur un canal abandonné depuis trente ans. La voix connaît son nom.",
    rating: 8.6, popularity: 40, palette: [210, 160], motif: "circuit", chapterCount: 21,
  },
  {
    id: "centerline", title: "Centerline", author: "K. Yamamoto", year: 2019, status: "En cours",
    demographic: "Shonen", genres: ["Sport", "Shonen"],
    tags: ["basket", "équipe", "remontée", "lycée"],
    tagline: "Cinq joueurs, une seule trajectoire.",
    synopsis: "Le club de basket le plus moqué du lycée recrute un meneur muet au talent dévastateur — et vise soudain le championnat national.",
    rating: 8.5, popularity: 73, palette: [30, 200], motif: "tide", chapterCount: 88,
  },
  {
    id: "paper-saints", title: "Paper Saints", author: "D. Ferreira", year: 2023, status: "En cours",
    demographic: "Seinen", genres: ["Psychological", "Dark Fantasy", "Mystery"],
    tags: ["secte", "foi", "manipulation", "art"],
    tagline: "On les prie. On les plie. On les brûle.",
    synopsis: "Un illustrateur découvre que les saints qu'il dessine pour une communauté isolée commencent à exaucer des vœux — et à réclamer leur dû.",
    rating: 8.7, popularity: 36, palette: [290, 40], motif: "ink", chapterCount: 18,
  },
];

export const CATALOG: Manga[] = SEEDS.map(({ chapterCount, ...m }, i) => ({
  ...m,
  sourceId: "tsuki-local",
  chapters: makeChapters(m.id, chapterCount, 4 + (i % 9)),
}));

export const CATALOG_BY_ID = new Map(CATALOG.map((m) => [m.id, m]));

export const ALL_GENRES: Genre[] = [
  "Dark Fantasy", "Romance", "Action", "Psychological", "Sport",
  "Seinen", "Shonen", "Sci-Fi", "Slice of Life", "Horror", "Adventure", "Mystery",
];

export function getManga(id: string): Manga | undefined {
  return CATALOG_BY_ID.get(id);
}
