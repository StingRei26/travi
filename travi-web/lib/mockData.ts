export type Stop = {
  id: string;
  name: string;
  location: string;
  date: string;
  rating: number;
  review: string;
  type: "restaurant" | "hotel" | "attraction" | "experience";
  emoji: string;
};

export type Travi = {
  id: string;
  title: string;
  description: string;
  coverGradient: string;
  emoji: string;
  country: string;
  countryFlag: string;
  startDate: string;
  endDate: string;
  stops: Stop[];
  author: {
    name: string;
    avatar: string;
    handle: string;
  };
  stats: {
    views: number;
    likes: number;
    saves: number;
    comments: number;
  };
  tags: string[];
  isPublic: boolean;
};

export const mockTraviis: Travi[] = [
  {
    id: "1",
    title: "Roma Bella",
    description: "14 days soaking up la dolce vita — from ancient ruins to hidden trattorias and coastal escapes. Italy stole my heart completely.",
    coverGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    emoji: "🇮🇹",
    country: "Italy",
    countryFlag: "🇮🇹",
    startDate: "2026-04-10",
    endDate: "2026-04-24",
    stops: [
      { id: "s1", name: "Colosseum", location: "Rome, Italy", date: "2026-04-11", rating: 5, review: "Absolutely breathtaking. Go at sunrise to avoid the crowds — totally worth the early alarm.", type: "attraction", emoji: "🏛️" },
      { id: "s2", name: "Da Enzo al 29", location: "Trastevere, Rome", date: "2026-04-12", rating: 5, review: "Best cacio e pepe of my life. Cash only, no reservations, arrive early.", type: "restaurant", emoji: "🍝" },
      { id: "s3", name: "Hotel de Russie", location: "Rome, Italy", date: "2026-04-10", rating: 4, review: "Stunning garden. Pricey but worth it for the location and breakfast spread.", type: "hotel", emoji: "🏨" },
      { id: "s4", name: "Positano", location: "Amalfi Coast, Italy", date: "2026-04-18", rating: 5, review: "The most beautiful place I've ever stood. Walk down to the small beach at 7am.", type: "attraction", emoji: "🌊" },
    ],
    author: { name: "Rei Ravelo", avatar: "R", handle: "@reiravelo" },
    stats: { views: 4820, likes: 312, saves: 89, comments: 47 },
    tags: ["Italy", "Rome", "Food", "History", "Amalfi"],
    isPublic: true,
  },
  {
    id: "2",
    title: "Tokyo Neon Dreams",
    description: "10 days navigating the most organized chaos in the world. Ramen, temples, robot restaurants, and cherry blossoms.",
    coverGradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    emoji: "🇯🇵",
    country: "Japan",
    countryFlag: "🇯🇵",
    startDate: "2026-03-25",
    endDate: "2026-04-04",
    stops: [
      { id: "s5", name: "Senso-ji Temple", location: "Asakusa, Tokyo", date: "2026-03-26", rating: 5, review: "Magical at 6am before the tourists arrive. The gate at dawn is other-worldly.", type: "attraction", emoji: "⛩️" },
      { id: "s6", name: "Ichiran Ramen", location: "Shibuya, Tokyo", date: "2026-03-27", rating: 5, review: "Solo dining booths are genius. The tonkotsu broth is life-changing. I went 3 times.", type: "restaurant", emoji: "🍜" },
      { id: "s7", name: "Park Hyatt Tokyo", location: "Shinjuku, Tokyo", date: "2026-03-25", rating: 5, review: "The bar from Lost in Translation is real and it's perfect. Mt. Fuji views at sunrise.", type: "hotel", emoji: "🏨" },
    ],
    author: { name: "Amara S.", avatar: "A", handle: "@amaratravels" },
    stats: { views: 8940, likes: 678, saves: 231, comments: 93 },
    tags: ["Japan", "Tokyo", "Ramen", "Temples", "Cherry Blossom"],
    isPublic: true,
  },
  {
    id: "3",
    title: "Parisian Chapters",
    description: "A slow week in Paris with no agenda. Croissants, canal walks, the Louvre at 8pm, and finding the tiny wine bar that changed everything.",
    coverGradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    emoji: "🇫🇷",
    country: "France",
    countryFlag: "🇫🇷",
    startDate: "2026-05-01",
    endDate: "2026-05-08",
    stops: [
      { id: "s8", name: "Le Marais District", location: "Paris, France", date: "2026-05-02", rating: 5, review: "The best neighborhood in Paris. Falafel on Rue des Rosiers, galleries everywhere, beautiful at golden hour.", type: "attraction", emoji: "🏙️" },
      { id: "s9", name: "Chez L'Ami Jean", location: "7th Arr., Paris", date: "2026-05-03", rating: 5, review: "Book weeks ahead. The rice pudding dessert alone justifies the trip to Paris.", type: "restaurant", emoji: "🥐" },
      { id: "s10", name: "Hôtel du Petit Moulin", location: "Le Marais, Paris", date: "2026-05-01", rating: 4, review: "Christian Lacroix-designed rooms. Quirky, colorful, unforgettable. Right in the heart of Le Marais.", type: "hotel", emoji: "🏨" },
    ],
    author: { name: "Sophie L.", avatar: "S", handle: "@sophieinparis" },
    stats: { views: 5210, likes: 445, saves: 178, comments: 62 },
    tags: ["Paris", "France", "Food", "Art", "Romance"],
    isPublic: true,
  },
  {
    id: "4",
    title: "Santorini Escape",
    description: "5 days of white-washed walls, volcanic beaches, and sunsets so good they felt fake.",
    coverGradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    emoji: "🇬🇷",
    country: "Greece",
    countryFlag: "🇬🇷",
    startDate: "2026-06-12",
    endDate: "2026-06-17",
    stops: [
      { id: "s11", name: "Oia Village", location: "Santorini, Greece", date: "2026-06-13", rating: 5, review: "The sunset crowds are real, but walk 10 mins from the main square and you'll have a view to yourself.", type: "attraction", emoji: "🌅" },
      { id: "s12", name: "Amoudi Bay", location: "Oia, Santorini", date: "2026-06-14", rating: 5, review: "The grilled octopus at the dock tavernas will ruin all other octopus for you. Perfect swimming spot.", type: "restaurant", emoji: "🐙" },
    ],
    author: { name: "Marcus T.", avatar: "M", handle: "@marcuswanders" },
    stats: { views: 3100, likes: 289, saves: 134, comments: 38 },
    tags: ["Greece", "Santorini", "Islands", "Sunset", "Summer"],
    isPublic: true,
  },
  {
    id: "5",
    title: "Bangkok to Chiang Mai",
    description: "A 12-day Thai adventure riding overnight trains, eating street food for every meal, and getting lost in the best way.",
    coverGradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    emoji: "🇹🇭",
    country: "Thailand",
    countryFlag: "🇹🇭",
    startDate: "2026-01-05",
    endDate: "2026-01-17",
    stops: [
      { id: "s13", name: "Chatuchak Weekend Market", location: "Bangkok, Thailand", date: "2026-01-06", rating: 4, review: "Arrive early and wear comfortable shoes. The street food section near section 26 is unbeatable.", type: "attraction", emoji: "🛍️" },
      { id: "s14", name: "Jay Fai", location: "Bangkok, Thailand", date: "2026-01-07", rating: 5, review: "The Michelin-starred street food. The crab omelette is worth the 2-hour wait, every single time.", type: "restaurant", emoji: "🦀" },
      { id: "s15", name: "Doi Inthanon", location: "Chiang Mai, Thailand", date: "2026-01-12", rating: 5, review: "Thailand's highest peak. The royal garden pagodas are stunning and it's cool enough to need a jacket.", type: "attraction", emoji: "⛰️" },
    ],
    author: { name: "Jess W.", avatar: "J", handle: "@jessgoeseverywhere" },
    stats: { views: 6780, likes: 502, saves: 207, comments: 71 },
    tags: ["Thailand", "Bangkok", "Chiang Mai", "Food", "Adventure"],
    isPublic: true,
  },
  {
    id: "6",
    title: "Lisbon & Porto Loop",
    description: "Portugal in 8 days — pastel de nata for breakfast every day, port wine for dinner, and trams up impossible hills.",
    coverGradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    emoji: "🇵🇹",
    country: "Portugal",
    countryFlag: "🇵🇹",
    startDate: "2025-11-10",
    endDate: "2025-11-18",
    stops: [
      { id: "s16", name: "Alfama District", location: "Lisbon, Portugal", date: "2025-11-11", rating: 5, review: "The soul of Lisbon. Find a Fado restaurant tucked off the main streets and let the music break your heart (in the best way).", type: "attraction", emoji: "🎵" },
      { id: "s17", name: "Time Out Market", location: "Lisbon, Portugal", date: "2025-11-12", rating: 4, review: "Great variety. Go for lunch — shorter lines. The bacalhau à brás stall in the corner is exceptional.", type: "restaurant", emoji: "🍽️" },
    ],
    author: { name: "Rei Ravelo", avatar: "R", handle: "@reiravelo" },
    stats: { views: 2890, likes: 198, saves: 76, comments: 29 },
    tags: ["Portugal", "Lisbon", "Porto", "Food", "Culture"],
    isPublic: true,
  },
];
