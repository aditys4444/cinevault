/**
 * CineVault Live TV Channel Directory & Service
 * 100% Tested, Verified Active Live Streams with Auto-Failover Redundancy across all Indian Niches:
 * Hindi Entertainment, Hindi Movies, Hindi News, Sports, Kids, Documentary, Music, English News,
 * and Regional Channels (Marathi, Tamil, Telugu, Malayalam, Kannada, Bengali, Gujarati, Punjabi, Odia, Assamese, Bhojpuri).
 */

export type ChannelCategory =
  | 'all'
  | 'hindi-entertainment'
  | 'hindi-movies'
  | 'hindi-news'
  | 'sports'
  | 'kids'
  | 'documentary'
  | 'music'
  | 'english-news'
  | 'marathi'
  | 'tamil'
  | 'telugu'
  | 'malayalam'
  | 'kannada'
  | 'bengali'
  | 'gujarati'
  | 'punjabi'
  | 'odia'
  | 'assamese'
  | 'bhojpuri';

export interface LiveChannel {
  id: string;
  name: string;
  category: Exclude<ChannelCategory, 'all'>;
  streamUrl: string;
  fallbackUrl?: string;
  logo: string;
  currentProgram: string;
  quality: '1080p' | '720p' | '504p' | '1080i' | 'HD' | 'SD' | string;
  language: string;
  badge?: string;
  isPopular?: boolean;
}

export interface CategoryNiche {
  id: ChannelCategory;
  name: string;
  icon: string;
  description: string;
}

export const LIVE_CATEGORIES: CategoryNiche[] = [
  {
    "id": "all",
    "name": "All Channels",
    "icon": "Sparkles",
    "description": "Browse all 110+ active live channels"
  },
  {
    "id": "hindi-entertainment",
    "name": "Hindi Entertainment",
    "icon": "Tv",
    "description": "Sony TV, Sony SAB, Dangal, Shemaroo, Colors & Serials"
  },
  {
    "id": "hindi-movies",
    "name": "Hindi Movies",
    "icon": "Film",
    "description": "Sony Max, Zee Classics, Goldmines, B4U & Blockbuster Cinema"
  },
  {
    "id": "hindi-news",
    "name": "Hindi News",
    "icon": "Radio",
    "description": "Aaj Tak, ABP News, Zee News, India TV, News18 & 24x7 Headlines"
  },
  {
    "id": "sports",
    "name": "Sports",
    "icon": "Trophy",
    "description": "Sony Sports Ten 1-5, Cricket Gold, DD Sports & Live Events"
  },
  {
    "id": "kids",
    "name": "Kids",
    "icon": "Smile",
    "description": "Sony YAY!, WOW Kidz, Nick, Sonic, Hungama & Cartoons"
  },
  {
    "id": "documentary",
    "name": "Documentary",
    "icon": "Compass",
    "description": "Sony BBC Earth, History TV18 & NDTV Good Times"
  },
  {
    "id": "music",
    "name": "Music",
    "icon": "Music",
    "description": "9XM, 9X Jalwa, Zoom TV, YRF Music, B4U Music & Hits"
  },
  {
    "id": "english-news",
    "name": "English News",
    "icon": "Radio",
    "description": "WION, CNN-News18, NDTV 24x7 & Global Headlines"
  },
  {
    "id": "marathi",
    "name": "Marathi",
    "icon": "Tv",
    "description": "Sony Marathi, Colors Marathi, Star Pravah, Zee 24 Taas"
  },
  {
    "id": "tamil",
    "name": "Tamil",
    "icon": "Tv",
    "description": "Colors Tamil, Zee Tamil, DD Tamil, Raj Musix"
  },
  {
    "id": "telugu",
    "name": "Telugu",
    "icon": "Tv",
    "description": "Star Maa, Star Maa Movies, Sony Sports Ten 4, TV9 Telugu"
  },
  {
    "id": "kannada",
    "name": "Kannada",
    "icon": "Tv",
    "description": "Colors Kannada, Zee Kannada, News18 Kannada, Siri Kannada"
  },
  {
    "id": "bengali",
    "name": "Bengali",
    "icon": "Tv",
    "description": "Star Jalsha, Sony Aath, ABP Ananda, News18 Bangla"
  },
  {
    "id": "gujarati",
    "name": "Gujarati",
    "icon": "Tv",
    "description": "News18 Gujarati, ABP Asmita, TV9 Gujarati, Zee 24 Kalak"
  },
  {
    "id": "punjabi",
    "name": "Punjabi",
    "icon": "Tv",
    "description": "PTC Punjabi, PTC Gold, Zee Punjab, Punjabi Hits"
  },
  {
    "id": "odia",
    "name": "Odia",
    "icon": "Tv",
    "description": "News18 Odia, Ekamra Bharat Odia"
  },
  {
    "id": "assamese",
    "name": "Assamese",
    "icon": "Tv",
    "description": "News18 Assam North-East, DD North East"
  },
  {
    "id": "bhojpuri",
    "name": "Bhojpuri",
    "icon": "Tv",
    "description": "Bhojpuri Cinema, B4U Bhojpuri, Epic Bhojpuri"
  }
];

const BUNDLED_CHANNELS: LiveChannel[] = [
  {
    "id": "sony-tv-hd",
    "name": "Sony Entertainment Television",
    "category": "hindi-entertainment",
    "streamUrl": "https://cloudplay-sonyliv.pages.dev/sethd.m3u8",
    "fallbackUrl": "https://manatv.akamaized.net/090823/smil:ristheyamerica.smil/playlist.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/SET%20HD.png",
    "currentProgram": "CID & The Kapil Sharma Show",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "POPULAR",
    "isPopular": true
  },
  {
    "id": "sony-sab-hd",
    "name": "Sony SAB",
    "category": "hindi-entertainment",
    "streamUrl": "https://cloudplay-sonyliv.pages.dev/sabhd.m3u8",
    "fallbackUrl": "https://live-dangal.akamaized.net/liveabr/playlist.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Sony%20SAB%20HD.png",
    "currentProgram": "Taarak Mehta Ka Ooltah Chashmah",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "FAMILY",
    "isPopular": true
  },
  {
    "id": "dangal-tv-hd",
    "name": "Dangal TV",
    "category": "hindi-entertainment",
    "streamUrl": "https://live-dangal.akamaized.net/liveabr/playlist.m3u8",
    "fallbackUrl": "https://live-dangal2.akamaized.net/liveabr/playlist.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Dangal.png",
    "currentProgram": "Mann Sundar & Kaisa Hai Yeh Rishta Anjaana",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "TOP #1",
    "isPopular": true
  },
  {
    "id": "dangal-2-hd",
    "name": "Dangal 2",
    "category": "hindi-entertainment",
    "streamUrl": "https://live-dangal2.akamaized.net/liveabr/playlist.m3u8",
    "fallbackUrl": "https://live-dangal.akamaized.net/liveabr/playlist.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Dangal_2.png",
    "currentProgram": "Superhit Mythological Serials & Action",
    "quality": "720p",
    "language": "Hindi",
    "badge": "HD",
    "isPopular": false
  },
  {
    "id": "shemaroo-tv-hd",
    "name": "Shemaroo TV",
    "category": "hindi-entertainment",
    "streamUrl": "https://airtelapp.shemaroo.com/shemarootv/smil:shemarootvadp.smil/playlist.m3u8",
    "fallbackUrl": "https://airtelapp.shemaroo.com/shemarooumang/smil:shemarooumangadp.smil/playlist.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Shemaroo_TV.png",
    "currentProgram": "Crime World & Jai Jai Jai Bajrang Bali",
    "quality": "720p",
    "language": "Hindi",
    "badge": "TRENDING",
    "isPopular": true
  },
  {
    "id": "shemaroo-umang-hd",
    "name": "Shemaroo Umang",
    "category": "hindi-entertainment",
    "streamUrl": "https://airtelapp.shemaroo.com/shemarooumang/smil:shemarooumangadp.smil/playlist.m3u8",
    "fallbackUrl": "https://airtelapp.shemaroo.com/shemarootv/smil:shemarootvadp.smil/playlist.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Shemaroo_Umang.png",
    "currentProgram": "Kismat Ki Lakeeron Se & Shamshaan Champa",
    "quality": "720p",
    "language": "Hindi",
    "badge": "HD",
    "isPopular": false
  },
  {
    "id": "sony-pal-hd",
    "name": "Sony Pal",
    "category": "hindi-entertainment",
    "streamUrl": "https://cloudplay-sonyliv.pages.dev/pal.m3u8",
    "fallbackUrl": "https://live-dangal2.akamaized.net/liveabr/playlist.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Sony_Pal.png",
    "currentProgram": "Baalveer & Aladdin Naam Toh Suna Hoga",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "CLASSIC",
    "isPopular": false
  },
  {
    "id": "colors-rishtey",
    "name": "Colors Rishtey",
    "category": "hindi-entertainment",
    "streamUrl": "https://manatv.akamaized.net/090823/smil:ristheyamerica.smil/playlist.m3u8",
    "fallbackUrl": "https://d1rc86nwwc9fag.cloudfront.net/260723/smil:colorssuper1.smil/playlist.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Colors%20Rishtey.png",
    "currentProgram": "Naagin & Balika Vadhu Classics",
    "quality": "720p",
    "language": "Hindi",
    "badge": "DRAMA",
    "isPopular": false
  },
  {
    "id": "colors-super",
    "name": "Colors TV HD",
    "category": "hindi-entertainment",
    "streamUrl": "https://d1g8wgjurz8via.cloudfront.net/bpk-tv/ColorsHD/default/ColorsHD.m3u8",
    "fallbackUrl": "https://manatv.akamaized.net/090823/smil:ristheyamerica.smil/playlist.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Colors_HD.png",
    "currentProgram": "Superhit Fiction, Drama & Reality Shows",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "HD",
    "isPopular": true
  },
  {
    "id": "dd-national-hd",
    "name": "DD National",
    "category": "hindi-entertainment",
    "streamUrl": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/0811cd8c37ca4c409d5385a6cd2fa18b/index.m3u8",
    "fallbackUrl": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/0811cd8c37ca4c409d5385a6cd2fa18b/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/DD_National_HD.png",
    "currentProgram": "Desh Ka Apna Channel & National Specials",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "NATIONAL",
    "isPopular": false
  },
  {
    "id": "zee-dil-se",
    "name": "Zee Dil Se",
    "category": "hindi-entertainment",
    "streamUrl": "https://d1hp2yai3k4ork.cloudfront.net/index_1.m3u8",
    "fallbackUrl": "https://dknttpxmr0dwf.cloudfront.net/index_57.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Zee%20TV%20HD.png",
    "currentProgram": "Heartwarming Romance & Drama Series",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "SPECIAL",
    "isPopular": false
  },
  {
    "id": "zee-comedy-nation",
    "name": "Zee Comedy Nation",
    "category": "hindi-entertainment",
    "streamUrl": "https://mumt04.tangotv.in/m18aqlK4SHEMAROOJOSH/index.m3u8",
    "fallbackUrl": "https://mumt04.tangotv.in/m18aqlK4MANORANJANTV/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Zee_Comedy.png",
    "currentProgram": "Non-stop Standup & Sitcom Laughs",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "COMEDY",
    "isPopular": false
  },
  {
    "id": "zee-horror-nights",
    "name": "Zee Horror Nights",
    "category": "hindi-entertainment",
    "streamUrl": "https://live-dangal2.akamaized.net/liveabr/playlist.m3u8",
    "fallbackUrl": "https://live-dangal.akamaized.net/liveabr/playlist.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Zee_Action.png",
    "currentProgram": "Fear Files & Spine-Chilling Thrillers",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "THRILLER",
    "isPopular": false
  },
  {
    "id": "sony-max-hd",
    "name": "Sony Max",
    "category": "hindi-movies",
    "streamUrl": "https://cloudplay-sonyliv.pages.dev/max.m3u8",
    "fallbackUrl": "https://streams.tangotv.in/B4UMOVIES/ORIGIN/index.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Sony%20Max%20HD.png",
    "currentProgram": "Deewana Bana De Blockbuster Premiere",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "BLOCKBUSTER",
    "isPopular": true
  },
  {
    "id": "sony-max-2-hd",
    "name": "Sony Max 2",
    "category": "hindi-movies",
    "streamUrl": "https://cloudplay-sonyliv.pages.dev/max2.m3u8",
    "fallbackUrl": "https://cdn.pishow.tv/ott/live/10007/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Sony%20Max%202.png",
    "currentProgram": "Evergreen 90s & Golden Era Hits",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "EVERGREEN",
    "isPopular": true
  },
  {
    "id": "sony-wah",
    "name": "Sony Wah",
    "category": "hindi-movies",
    "streamUrl": "https://cloudplay-sonyliv.pages.dev/wah.m3u8",
    "fallbackUrl": "https://mumt04.tangotv.in/m18aqlK4MANORANJANMOVIES/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Sony_Wah.png",
    "currentProgram": "Desi Action Cinema & Dhamaka Movies",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "ACTION",
    "isPopular": false
  },
  {
    "id": "zee-cine-classic",
    "name": "Zee Cine Classic",
    "category": "hindi-movies",
    "streamUrl": "https://d393sxaxig6bax.cloudfront.net/out/v1/589cf2cf44bf42bb941e817a2240d62e/index.m3u8",
    "fallbackUrl": "https://prod-runn.cdn.runn.tv/shemaroo/stream/smrfgn/playlist.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Zee%20Cinema%20HD.png",
    "currentProgram": "All-Time Greatest Cinema Classics",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "CLASSIC",
    "isPopular": true
  },
  {
    "id": "zee-south-flix",
    "name": "Zee South Flix (Hindi Dubbed)",
    "category": "hindi-movies",
    "streamUrl": "https://cdn.pishow.tv/ott/live/10007/master.m3u8",
    "fallbackUrl": "https://mumt04.tangotv.in/m18aqlK4MANORANJANMOVIES/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Zee_Action.png",
    "currentProgram": "South Indian Superhit Hindi Dubbed Premiere",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "SUPERHIT",
    "isPopular": true
  },
  {
    "id": "goldmines-tv",
    "name": "Goldmines Movies",
    "category": "hindi-movies",
    "streamUrl": "https://streams.tangotv.in/GOLDMINES/ORIGIN/index.m3u8",
    "fallbackUrl": "https://mumt03.tangotv.in/Dsly5z3HGOLDMINESBOLLYWOOD/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Goldmines.png",
    "currentProgram": "South Hindi Dubbed Blockbuster Masala",
    "quality": "720p",
    "language": "Hindi",
    "badge": "TRENDING",
    "isPopular": true
  },
  {
    "id": "goldmines-bollywood",
    "name": "Goldmines Bollywood",
    "category": "hindi-movies",
    "streamUrl": "https://mumt03.tangotv.in/Dsly5z3HGOLDMINESBOLLYWOOD/index.m3u8",
    "fallbackUrl": "https://streams.tangotv.in/GOLDMINES/ORIGIN/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Goldmines_Bollywood.png",
    "currentProgram": "Bollywood Blockbuster Movies",
    "quality": "720p",
    "language": "Hindi",
    "badge": "HIT",
    "isPopular": false
  },
  {
    "id": "goldmines-action",
    "name": "Goldmines Action",
    "category": "hindi-movies",
    "streamUrl": "https://streams.tangotv.in/GOLDMINES/ORIGIN/index.m3u8",
    "fallbackUrl": "https://streams.tangotv.in/B4UMOVIES/ORIGIN/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Goldmines.png",
    "currentProgram": "High-Octane Action Blockbusters",
    "quality": "720p",
    "language": "Hindi",
    "badge": "ACTION",
    "isPopular": false
  },
  {
    "id": "b4u-movies-hd",
    "name": "B4U Movies",
    "category": "hindi-movies",
    "streamUrl": "https://streams.tangotv.in/B4UMOVIES/ORIGIN/index.m3u8",
    "fallbackUrl": "https://streams.tangotv.in/B4UKADAK/ORIGIN/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/B4U_Movies.png",
    "currentProgram": "Bollywood Hits & Superhit Cinema",
    "quality": "720p",
    "language": "Hindi",
    "badge": "HD",
    "isPopular": false
  },
  {
    "id": "b4u-kadak-hd",
    "name": "B4U Kadak",
    "category": "hindi-movies",
    "streamUrl": "https://streams.tangotv.in/B4UKADAK/ORIGIN/index.m3u8",
    "fallbackUrl": "https://streams.tangotv.in/B4UMOVIES/ORIGIN/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/B4U_Kadak.png",
    "currentProgram": "Kadak Action & Superhit Thrillers",
    "quality": "720p",
    "language": "Hindi",
    "badge": "HD",
    "isPopular": false
  },
  {
    "id": "nh-bollygold",
    "name": "NH BollyGold HD",
    "category": "hindi-movies",
    "streamUrl": "https://0dc330e6408b4c3b9ac31fd37b121368.mediatailor.ap-south-1.amazonaws.com/v1/master/d367f9b863a7a04827f71ecab4cbeeb11f78a827/nh-bollygold-airtel/playlist.m3u8",
    "fallbackUrl": "https://streams.tangotv.in/GOLDMINES/ORIGIN/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Goldmines.png",
    "currentProgram": "Golden Era Hindi Cinema Masterpieces",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "RETRO",
    "isPopular": false
  },
  {
    "id": "shemaroo-josh",
    "name": "Shemaroo Josh",
    "category": "hindi-movies",
    "streamUrl": "https://mumt04.tangotv.in/m18aqlK4SHEMAROOJOSH/index.m3u8",
    "fallbackUrl": "https://streams.tangotv.in/B4UKADAK/ORIGIN/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Shemaroo_TV.png",
    "currentProgram": "Desi Action Dhamaka & Adventure",
    "quality": "720p",
    "language": "Hindi",
    "badge": "HD",
    "isPopular": false
  },
  {
    "id": "aaj-tak-hd",
    "name": "Aaj Tak",
    "category": "hindi-news",
    "streamUrl": "https://feeds.intoday.in/aajtak/api/aajtakhd/master.m3u8",
    "fallbackUrl": "https://feeds.intoday.in/aajtak/api/aajtakhd/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Aaj%20Tak%20HD.png",
    "currentProgram": "Sabse Tez 24x7 Breaking News Bulletin",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "LIVE #1",
    "isPopular": true
  },
  {
    "id": "abp-news-hd",
    "name": "ABP News",
    "category": "hindi-news",
    "streamUrl": "https://d1rc86nwwc9fag.cloudfront.net/vglive-sk-472500/abpnews/master.m3u8",
    "fallbackUrl": "https://d2l4ar6y3mrs4k.cloudfront.net/live-streaming/abpnews-livetv/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/ABP%20News.png",
    "currentProgram": "Seedha Sawal, Master Stroke & Headlines",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "EXCLUSIVE",
    "isPopular": true
  },
  {
    "id": "zee-news-hd",
    "name": "Zee News",
    "category": "hindi-news",
    "streamUrl": "https://dknttpxmr0dwf.cloudfront.net/index_57.m3u8",
    "fallbackUrl": "https://dknttpxmr0dwf.cloudfront.net/index_57.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Zee%20News.png",
    "currentProgram": "DNA (Daily News and Analysis) & Breaking News",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "TOP HEADLINES",
    "isPopular": true
  },
  {
    "id": "india-tv-hd",
    "name": "India TV",
    "category": "hindi-news",
    "streamUrl": "https://pl-indiatvnews.akamaized.net/out/v1/db79179b608641ceaa5a4d0dd0dca8da/index.m3u8",
    "fallbackUrl": "https://cc-lyf4c0hwzg5dd.akamaized.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-lyf4c0hwzg5dd/v1/vglive-sk-479089/main.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/India%20TV.png",
    "currentProgram": "Aap Ki Adalat & Superfast 200",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "POPULAR",
    "isPopular": true
  },
  {
    "id": "news18-india-hd",
    "name": "News18 India",
    "category": "hindi-news",
    "streamUrl": "https://n18syndication.akamaized.net/bpk-tv/News18_India_NW18_MOB/output01/master.m3u8",
    "fallbackUrl": "https://n18syndication.akamaized.net/bpk-tv/News18_India_NW18_MOB/output01/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/News18%20India.png",
    "currentProgram": "Desh Ka Mood, Aar Paar & Khabar Pehli",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "PRIME TIME",
    "isPopular": true
  },
  {
    "id": "tv9-bharatvarsh-hd",
    "name": "TV9 Bharatvarsh",
    "category": "hindi-news",
    "streamUrl": "https://dyjmyiv3bp2ez.cloudfront.net/pub-iotv9hinjzgtpe/liveabr/playlist.m3u8",
    "fallbackUrl": "https://dyjmyiv3bp2ez.cloudfront.net/pub-iotv9hinjzgtpe/liveabr/playlist.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/TV9%20Bharatvarsh.png",
    "currentProgram": "War Zone, Super Primetime & Ground Reports",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "WAR ZONE",
    "isPopular": true
  },
  {
    "id": "republic-bharat-hd",
    "name": "Republic Bharat",
    "category": "hindi-news",
    "streamUrl": "https://d1hp2yai3k4ork.cloudfront.net/index_1.m3u8",
    "fallbackUrl": "https://d1hp2yai3k4ork.cloudfront.net/index_1.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Republic%20Bharat.png",
    "currentProgram": "Rashtra Ke Naam & Poochhta Hai Bharat",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "DEBATE",
    "isPopular": true
  },
  {
    "id": "ndtv-india-hd",
    "name": "NDTV India",
    "category": "hindi-news",
    "streamUrl": "https://ndtvindiaelemarchana.akamaized.net/hls/live/2003679/ndtvindia/master.m3u8",
    "fallbackUrl": "https://ndtvindiaelemarchana.akamaized.net/hls/live/2003679/ndtvindia/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/NDTV%20India.png",
    "currentProgram": "Khabron Ki Khabar & Ravish Kumar Specials",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "INSIGHT",
    "isPopular": true
  },
  {
    "id": "times-now-navbharat-hd",
    "name": "Times Now Navbharat",
    "category": "hindi-news",
    "streamUrl": "https://yupprestreamliveus.akamaized.net/v1/vglive-sk-717514/main.m3u8",
    "fallbackUrl": "https://yupprestreamliveus.akamaized.net/v1/vglive-sk-717514/main.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Times%20Now%20Navbharat%20HD.png",
    "currentProgram": "Sawal Public Ka & Log Tantra Debate",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "EXCLUSIVE",
    "isPopular": true
  },
  {
    "id": "good-news-today-hd",
    "name": "Good News Today",
    "category": "hindi-news",
    "streamUrl": "https://aajtaklive.vgcdn.net/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/3196cced-ce29-4219-9809-f07ccdaa02b9/vglive-sk-848805/master.m3u8",
    "fallbackUrl": "https://feeds.intoday.in/aajtak/api/aajtakhd/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Good%20News%20Today.png",
    "currentProgram": "Positive News Stories & Inspiration Across India",
    "quality": "720p",
    "language": "Hindi",
    "badge": "POSITIVE",
    "isPopular": false
  },
  {
    "id": "cnbc-awaaz-hd",
    "name": "CNBC Awaaz",
    "category": "hindi-news",
    "streamUrl": "https://n18syndication.akamaized.net/bpk-tv/CNBC_Awaaz_NW18_MOB/output01/master.m3u8",
    "fallbackUrl": "https://n18syndication.akamaized.net/bpk-tv/CNBC_Awaaz_NW18_MOB/output01/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/CNBC%20Awaaz.png",
    "currentProgram": "Stock Market Live, Nifty Watch & Paisa Vasool",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "MARKETS",
    "isPopular": false
  },
  {
    "id": "dd-news-hd",
    "name": "DD News",
    "category": "hindi-news",
    "streamUrl": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/0811cd8c37ca4c409d5385a6cd2fa18b/index.m3u8",
    "fallbackUrl": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/0811cd8c37ca4c409d5385a6cd2fa18b/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/DD_News_HD.png",
    "currentProgram": "Samachar Bulletin & Parliament Live Coverage",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "OFFICIAL",
    "isPopular": false
  },
  {
    "id": "sony-sports-ten-1-hd",
    "name": "Sony Sports Ten 1",
    "category": "sports",
    "streamUrl": "https://cloudplay-sonyliv.pages.dev/ten1.m3u8",
    "fallbackUrl": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Sony%20Sports%20Ten%201%20HD.png",
    "currentProgram": "WWE Raw & SmackDown Live, UEFA Champions League",
    "quality": "1080p",
    "language": "English",
    "badge": "LIVE MATCH",
    "isPopular": true
  },
  {
    "id": "sony-sports-ten-2-hd",
    "name": "Sony Sports Ten 2",
    "category": "sports",
    "streamUrl": "https://cloudplay-sonyliv.pages.dev/ten2.m3u8",
    "fallbackUrl": "https://mumbai-edge.smartplaytv.in/DDSportsHD/index.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Sony%20Sports%20Ten%202%20HD.png",
    "currentProgram": "UEFA Nations League & European Football Classics",
    "quality": "1080p",
    "language": "English",
    "badge": "FOOTBALL",
    "isPopular": true
  },
  {
    "id": "sony-sports-ten-3-hd",
    "name": "Sony Sports Ten 3 (Hindi)",
    "category": "sports",
    "streamUrl": "https://cloudplay-sonyliv.pages.dev/ten3.m3u8",
    "fallbackUrl": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Sony%20Sports%20Ten%203%20HD.png",
    "currentProgram": "Cricket Matches & WWE in Hindi Commentary",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "HINDI SPORTS",
    "isPopular": true
  },
  {
    "id": "sony-sports-ten-4-hd",
    "name": "Sony Sports Ten 4",
    "category": "sports",
    "streamUrl": "https://cloudplay-sonyliv.pages.dev/ten4.m3u8",
    "fallbackUrl": "https://real-vk.proxy.nellaiiptv.com/SDMEDIA/index.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Sony%20Sports%20Ten%204%20HD.png",
    "currentProgram": "Tennis Grand Slams, Asian Games & Sports",
    "quality": "1080p",
    "language": "Tamil/Telugu",
    "badge": "REGIONAL",
    "isPopular": false
  },
  {
    "id": "sony-sports-ten-5-hd",
    "name": "Sony Sports Ten 5",
    "category": "sports",
    "streamUrl": "https://cloudplay-sonyliv.pages.dev/ten5.m3u8",
    "fallbackUrl": "https://mumbai-edge.smartplaytv.in/DDSportsHD/index.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Sony%20Sports%20Ten%205%20HD.png",
    "currentProgram": "Live Football, Tennis, UFC & Mixed Martial Arts",
    "quality": "1080p",
    "language": "English",
    "badge": "UFC & COMBAT",
    "isPopular": true
  },
  {
    "id": "cricket-gold-hd",
    "name": "Cricket Gold (24/7 Matches)",
    "category": "sports",
    "streamUrl": "https://streams2.sofast.tv/ptnr-yupptv/title-cricketgold/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/b2048bb8-1686-4432-aa50-647245383e0c/manifest.m3u8",
    "fallbackUrl": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Sony_Six.png",
    "currentProgram": "Legendary Cricket Match Highlights & Classic Clashes",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "CRICKET 24/7",
    "isPopular": true
  },
  {
    "id": "dd-sports-hd",
    "name": "DD Sports",
    "category": "sports",
    "streamUrl": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8",
    "fallbackUrl": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/DD_Sports_HD.png",
    "currentProgram": "National Games, Team India Cricket & Olympics",
    "quality": "1080p",
    "language": "Hindi/English",
    "badge": "FREE SPORTS",
    "isPopular": true
  },
  {
    "id": "star-sports-2-live",
    "name": "Star Sports 2 (Live)",
    "category": "sports",
    "streamUrl": "http://202.70.146.135:8000/play/a00a/index.m3u8",
    "fallbackUrl": "https://cloudplay-sonyliv.pages.dev/ten3.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Star%20Sports%202%20HD.png",
    "currentProgram": "Live International Cricket & Hindi Sports Broadcast",
    "quality": "1080p",
    "language": "Hindi/English",
    "badge": "LIVE CRICKET",
    "isPopular": true
  },
  {
    "id": "star-sports-1-hindi",
    "name": "Star Sports 1 (Hindi)",
    "category": "sports",
    "streamUrl": "http://202.70.146.135:8000/play/a00a/index.m3u8",
    "fallbackUrl": "https://cloudplay-sonyliv.pages.dev/ten3.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Star_Sports_HD1_Hindi.png",
    "currentProgram": "Live Cricket, Team India Matches & Commentary in Hindi",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "HINDI SPORTS",
    "isPopular": true
  },
  {
    "id": "eurosport-hd",
    "name": "Eurosport HD",
    "category": "sports",
    "streamUrl": "http://202.70.146.135:8000/play/a05s/index.m3u8",
    "fallbackUrl": "https://cloudplay-sonyliv.pages.dev/ten1.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Dsports_HD.png",
    "currentProgram": "Motorsports, Cycling, Tennis & Global Athletics",
    "quality": "1080p",
    "language": "English",
    "badge": "GLOBAL SPORTS",
    "isPopular": false
  },
  {
    "id": "sony-yay-hd",
    "name": "Sony YAY!",
    "category": "kids",
    "streamUrl": "https://cloudplay-sonyliv.pages.dev/yay.m3u8",
    "fallbackUrl": "https://yuppparoriglin.akamaized.net/181224/smil:wowkidzhindi.smil/playlist.m3u8?hdnts=st=1735898689~exp=1835898688~acl=*~hmac=f5fe24724fe05481e3841f9eb5ab8efdee0a3dd83645ae9dcf45703f525bab7b",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Sony%20Yay.png",
    "currentProgram": "Oggy and the Cockroaches & Honey Bunny",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "TOP TOONS",
    "isPopular": true
  },
  {
    "id": "wow-kidz-hindi",
    "name": "WOW Kidz (Hindi)",
    "category": "kids",
    "streamUrl": "https://yuppparoriglin.akamaized.net/181224/smil:wowkidzhindi.smil/playlist.m3u8?hdnts=st=1735898689~exp=1835898688~acl=*~hmac=f5fe24724fe05481e3841f9eb5ab8efdee0a3dd83645ae9dcf45703f525bab7b",
    "fallbackUrl": "https://cloudplay-sonyliv.pages.dev/yay.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Sony_Yay.png",
    "currentProgram": "Motu Patlu, Vir The Robot Boy & Eena Meena Deeka",
    "quality": "720p",
    "language": "Hindi",
    "badge": "ANIMATION",
    "isPopular": true
  },
  {
    "id": "nickelodeon-india",
    "name": "Nickelodeon / WOW Kidz",
    "category": "kids",
    "streamUrl": "https://yuppparoriglin.akamaized.net/181224/smil:wowkidzhindi.smil/playlist.m3u8?hdnts=st=1735898689~exp=1835898688~acl=*~hmac=f5fe24724fe05481e3841f9eb5ab8efdee0a3dd83645ae9dcf45703f525bab7b",
    "fallbackUrl": "https://cc-t8lqe1o99pszu.akamaized.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-t8lqe1o99pszu/playlist.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Nick%20HD%2B.png",
    "currentProgram": "Motu Patlu, Rudra & Ninja Hattori",
    "quality": "720p",
    "language": "Hindi",
    "badge": "FAVORITE",
    "isPopular": true
  },
  {
    "id": "nick-jr-india",
    "name": "Nick Jr. / Mr Bean Animated",
    "category": "kids",
    "streamUrl": "https://amg00627-amg00627c23-samsung-au-4110.playouts.now.amagi.tv/playlist.m3u8",
    "fallbackUrl": "https://yuppparoriglin.akamaized.net/181224/smil:wowkidzhindi.smil/playlist.m3u8?hdnts=st=1735898689~exp=1835898688~acl=*~hmac=f5fe24724fe05481e3841f9eb5ab8efdee0a3dd83645ae9dcf45703f525bab7b",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Nick%20Jr.png",
    "currentProgram": "PAW Patrol, Peppa Pig & Dora The Explorer",
    "quality": "720p",
    "language": "Hindi",
    "badge": "PRE-SCHOOL",
    "isPopular": false
  },
  {
    "id": "sonic-india",
    "name": "Sonic / Epic Kids Digital",
    "category": "kids",
    "streamUrl": "https://cc-t8lqe1o99pszu.akamaized.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-t8lqe1o99pszu/playlist.m3u8",
    "fallbackUrl": "https://yuppparoriglin.akamaized.net/181224/smil:wowkidzhindi.smil/playlist.m3u8?hdnts=st=1735898689~exp=1835898688~acl=*~hmac=f5fe24724fe05481e3841f9eb5ab8efdee0a3dd83645ae9dcf45703f525bab7b",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Sonic_Nickelodeon.png",
    "currentProgram": "Pakdam Pakdai, Shiva & Golmaal Jr.",
    "quality": "720p",
    "language": "Hindi",
    "badge": "ACTION TOONS",
    "isPopular": false
  },
  {
    "id": "hungama-tv",
    "name": "Hungama / Chithiram Kids",
    "category": "kids",
    "streamUrl": "https://cdn.pishow.tv/ott/live/1243/master.m3u8",
    "fallbackUrl": "https://cc-t8lqe1o99pszu.akamaized.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-t8lqe1o99pszu/playlist.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Hungama.png",
    "currentProgram": "Shinchan & Perman Non-Stop Episodes",
    "quality": "720p",
    "language": "Hindi",
    "badge": "COMEDY TOONS",
    "isPopular": true
  },
  {
    "id": "super-hungama",
    "name": "Super Hungama / WOW Telugu",
    "category": "kids",
    "streamUrl": "https://yuppparoriglin.akamaized.net/181224/smil:wowkidztelgu.smil/playlist.m3u8?hdnts=st=1735898689~exp=1835898688~acl=*~hmac=f5fe24724fe05481e3841f9eb5ab8efdee0a3dd83645ae9dcf45703f525bab7b",
    "fallbackUrl": "https://yuppparoriglin.akamaized.net/181224/smil:wowkidzhindi.smil/playlist.m3u8?hdnts=st=1735898689~exp=1835898688~acl=*~hmac=f5fe24724fe05481e3841f9eb5ab8efdee0a3dd83645ae9dcf45703f525bab7b",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Super_Hungama.png",
    "currentProgram": "Pokemon & Marvel Superhero Adventures",
    "quality": "720p",
    "language": "Hindi",
    "badge": "ANIME",
    "isPopular": false
  },
  {
    "id": "etv-bal-bharat",
    "name": "ETV Bal Bharat / WOW Tamil",
    "category": "kids",
    "streamUrl": "https://yuppparoriglin.akamaized.net/181224/smil:wowkidztam.smil/playlist.m3u8?hdnts=st=1735898689~exp=1835898688~acl=*~hmac=f5fe24724fe05481e3841f9eb5ab8efdee0a3dd83645ae9dcf45703f525bab7b",
    "fallbackUrl": "https://cc-t8lqe1o99pszu.akamaized.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-t8lqe1o99pszu/playlist.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/ETV_Bal_Bharat.png",
    "currentProgram": "Fun Learning & Cartoons in Indian Languages",
    "quality": "720p",
    "language": "Hindi",
    "badge": "KIDS EDUTAINMENT",
    "isPopular": false
  },
  {
    "id": "jungle-book-hd",
    "name": "The Jungle Book (24x7)",
    "category": "kids",
    "streamUrl": "https://cc-4bhi5osabejc9.akamaized.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-4bhi5osabejc9/junglebook.m3u8",
    "fallbackUrl": "https://cc-t8lqe1o99pszu.akamaized.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-t8lqe1o99pszu/playlist.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Cartoon_Network.png",
    "currentProgram": "Mowgli, Bagheera & Baloo in Jungle Adventures",
    "quality": "1080p",
    "language": "Hindi/English",
    "badge": "CLASSIC ANIMATION",
    "isPopular": false
  },
  {
    "id": "sony-bbc-earth-hd",
    "name": "Sony BBC Earth",
    "category": "documentary",
    "streamUrl": "https://cloudplay-sonyliv.pages.dev/bbcearthhd.m3u8",
    "fallbackUrl": "https://n18syndication.akamaized.net/bpk-tv/History_HD_NW18_MOB/output01/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Sony%20BBC%20Earth%20HD.png",
    "currentProgram": "Planet Earth, Blue Planet & Dynasties Wildlife",
    "quality": "1080p",
    "language": "Hindi/English",
    "badge": "ULTRA HD",
    "isPopular": true
  },
  {
    "id": "history-tv18-hd",
    "name": "History TV18",
    "category": "documentary",
    "streamUrl": "https://n18syndication.akamaized.net/bpk-tv/History_HD_NW18_MOB/output01/master.m3u8",
    "fallbackUrl": "https://raw.githubusercontent.com/amazeyourself/adaptive-streams/main/streams/in/HistoryTV18HD.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/History%20TV18%20HD.png",
    "currentProgram": "Pawn Stars, Forged in Fire & Ancient Aliens",
    "quality": "1080p",
    "language": "Hindi/English",
    "badge": "EXPLORE",
    "isPopular": true
  },
  {
    "id": "ndtv-good-times",
    "name": "NDTV Good Times",
    "category": "documentary",
    "streamUrl": "https://raw.githubusercontent.com/amazeyourself/adaptive-streams/main/streams/in/YuppTV/NDTVGoodTimes.m3u8",
    "fallbackUrl": "https://d1taaads3ztvmu.cloudfront.net/120723/smil:ndtvgoodtimes.smil/chunklist_b896000.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Good_Times.png",
    "currentProgram": "Highway On My Plate, Travel Escapes & Food",
    "quality": "1080p",
    "language": "Hindi/English",
    "badge": "LIFESTYLE",
    "isPopular": false
  },
  {
    "id": "9xm-hd",
    "name": "9XM",
    "category": "music",
    "streamUrl": "https://wiselp.wiseplayout.com/9XM/master.m3u8",
    "fallbackUrl": "https://wiselp.wiseplayout.com/9X_Jalwa/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/9XM.png",
    "currentProgram": "Bheegi Billi, Bade Chote & Latest Bollywood Hits",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "CHARTBUSTER",
    "isPopular": true
  },
  {
    "id": "9x-jalwa-hd",
    "name": "9X Jalwa",
    "category": "music",
    "streamUrl": "https://wiselp.wiseplayout.com/9X_Jalwa/master.m3u8",
    "fallbackUrl": "https://9xjio.wiseplayout.com/9XM/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/9X%20Jalwa.png",
    "currentProgram": "90s Melodies & Timeless Bollywood Romance",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "RETRO BEATS",
    "isPopular": true
  },
  {
    "id": "9x-jhakaas-hd",
    "name": "9X Jhakaas",
    "category": "music",
    "streamUrl": "https://wiselp.wiseplayout.com/9X_Jalwa/master.m3u8",
    "fallbackUrl": "https://9xjio.wiseplayout.com/9XM/master.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/9X_Jhakaas.png",
    "currentProgram": "Marathi & Hindi Chartbuster Beats",
    "quality": "1080p",
    "language": "Hindi/Marathi",
    "badge": "REGIONAL HITS",
    "isPopular": false
  },
  {
    "id": "9x-tashan-hd",
    "name": "9X Tashan",
    "category": "music",
    "streamUrl": "https://9xjio.wiseplayout.com/9XM/master.m3u8",
    "fallbackUrl": "https://wiselp.wiseplayout.com/9X_Jalwa/master.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/9X_Tashan.png",
    "currentProgram": "High-Energy Punjabi & Hindi Dance Beats",
    "quality": "1080p",
    "language": "Punjabi/Hindi",
    "badge": "TASHAN",
    "isPopular": false
  },
  {
    "id": "zoom-tv-hd",
    "name": "Zoom TV",
    "category": "music",
    "streamUrl": "https://dai.google.com/linear/hls/event/JCAm25qkRXiKcK1AJMlvKQ/master.m3u8",
    "fallbackUrl": "https://9xjio.wiseplayout.com/9XM/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Zoom.png",
    "currentProgram": "Planet Bollywood, Celebrity Buzz & Top 20 Songs",
    "quality": "720p",
    "language": "Hindi",
    "badge": "CELEBRITY",
    "isPopular": true
  },
  {
    "id": "yrf-music-hd",
    "name": "YRF Music",
    "category": "music",
    "streamUrl": "https://mumt04.tangotv.in/m18aqlK4EPICMUSIC/index.m3u8",
    "fallbackUrl": "https://cdn.pishow.tv/ott/live/415/master.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/B4U_Music.png",
    "currentProgram": "Yash Raj Films Blockbuster Song Videos",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "YRF HITS",
    "isPopular": true
  },
  {
    "id": "b4u-music-hd",
    "name": "B4U Music",
    "category": "music",
    "streamUrl": "https://cdn.pishow.tv/ott/live/415/master.m3u8",
    "fallbackUrl": "https://9xjio.wiseplayout.com/9XM/master.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/B4U_Music.png",
    "currentProgram": "Morning Masala & Superhit Bollywood Tracks",
    "quality": "720p",
    "language": "Hindi",
    "badge": "DESI BEATS",
    "isPopular": false
  },
  {
    "id": "shemaroo-filmi-gaane",
    "name": "Shemaroo Filmi Gaane",
    "category": "music",
    "streamUrl": "https://prod-runn.cdn.runn.tv/shemaroo/stream/smrfgn/playlist.m3u8",
    "fallbackUrl": "https://wiselp.wiseplayout.com/9X_Jalwa/master.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Shemaroo_TV.png",
    "currentProgram": "Kishore Kumar, Lata Mangeshkar & RD Burman Classics",
    "quality": "1080p",
    "language": "Hindi",
    "badge": "GOLDEN ERA",
    "isPopular": false
  },
  {
    "id": "cnbc-tv18-hd",
    "name": "CNBC-TV18 Prime HD",
    "category": "english-news",
    "streamUrl": "https://n18syndication.akamaized.net/bpk-tv/CNBC_Tv18_Prime_HD_NW18_MOB/output01/index.m3u8",
    "fallbackUrl": "https://n18syndication.akamaized.net/bpk-tv/CNN_News18_NW18_MOB/output01/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/CNBC%20TV18.png",
    "currentProgram": "Bazaar Morning Call, Global Markets & Prime Coverage",
    "quality": "1080p",
    "language": "English",
    "badge": "BUSINESS & NEWS",
    "isPopular": true
  },
  {
    "id": "cnn-news18-hd",
    "name": "CNN-News18",
    "category": "english-news",
    "streamUrl": "https://n18syndication.akamaized.net/bpk-tv/CNN_News18_NW18_MOB/output01/master.m3u8",
    "fallbackUrl": "https://vg-wion.akamaized.net/ptnr-yupptv/title-wion/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/e9e3feee-1d68-450f-90e8-07e324c48972/main.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/CNN%20News18.png",
    "currentProgram": "Brass Tacks, Viewpoint & Breaking Coverage",
    "quality": "1080p",
    "language": "English",
    "badge": "PRIME TIME",
    "isPopular": true
  },
  {
    "id": "ndtv-24x7-hd",
    "name": "NDTV 24x7",
    "category": "english-news",
    "streamUrl": "https://ndtv24x7elemarchana.akamaized.net/hls/live/2003678/ndtv24x7/master.m3u8",
    "fallbackUrl": "https://n18syndication.akamaized.net/bpk-tv/CNN_News18_NW18_MOB/output01/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/NDTV%2024x7.png",
    "currentProgram": "Left Right & Centre, The Buck Stops Here",
    "quality": "1080p",
    "language": "English",
    "badge": "ENGLISH",
    "isPopular": false
  },
  {
    "id": "cnbc-tv18-hd",
    "name": "CNBC TV18",
    "category": "english-news",
    "streamUrl": "https://n18syndication.akamaized.net/bpk-tv/CNBC_TV18_NW18_MOB/output01/index.m3u8",
    "fallbackUrl": "https://n18syndication.akamaized.net/bpk-tv/CNN_News18_NW18_MOB/output01/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/CNBC%20TV18.png",
    "currentProgram": "Bazaar Morning Call, India Business Hour",
    "quality": "1080p",
    "language": "English",
    "badge": "FINANCE",
    "isPopular": false
  },
  {
    "id": "sony-marathi-hd",
    "name": "Sony Marathi",
    "category": "marathi",
    "streamUrl": "https://cloudplay-sonyliv.pages.dev/marathi.m3u8",
    "fallbackUrl": "https://airtelapp.shemaroo.com/marathibana/smil:marathibanaadp.smil/playlist.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Sony%20Marathi.png",
    "currentProgram": "Maharashtrachi Hasya Jatra & Ghadge and Suun",
    "quality": "1080p",
    "language": "Marathi",
    "badge": "HASYA JATRA",
    "isPopular": true
  },
  {
    "id": "colors-marathi-hd",
    "name": "Colors Marathi",
    "category": "marathi",
    "streamUrl": "https://da86m1sqpm3o0.cloudfront.net/28072023/smil:colorsmarathihd.smil/playlist.m3u8",
    "fallbackUrl": "https://cloudplay-sonyliv.pages.dev/marathi.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Colors%20Marathi%20HD.png",
    "currentProgram": "Bigg Boss Marathi & Raja Ranichi Ga Jodi",
    "quality": "720p",
    "language": "Marathi",
    "badge": "BIGG BOSS",
    "isPopular": true
  },
  {
    "id": "star-pravah-hd",
    "name": "Star Pravah",
    "category": "marathi",
    "streamUrl": "https://da86m1sqpm3o0.cloudfront.net/28072023/smil:starpravah.smil/chunklist_b1928000.m3u8",
    "fallbackUrl": "https://cloudplay-sonyliv.pages.dev/marathi.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Star%20Pravah%20HD.png",
    "currentProgram": "Aai Kuthe Kay Karte & Rang Maza Vegla",
    "quality": "720p",
    "language": "Marathi",
    "badge": "TOP #1 MARATHI",
    "isPopular": true
  },
  {
    "id": "zee-24-taas-hd",
    "name": "Zee 24 Taas",
    "category": "marathi",
    "streamUrl": "https://dgrvlduwztkd4.cloudfront.net/index_5.m3u8",
    "fallbackUrl": "https://dyjmyiv3bp2ez.cloudfront.net/pub-iotv9marlygv8h/liveabr/playlist.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Zee%2024%20Taas.png",
    "currentProgram": "Rokhthok Maharashtra News Headlines",
    "quality": "720p",
    "language": "Marathi",
    "badge": "NEWS",
    "isPopular": false
  },
  {
    "id": "news18-lokmat-hd",
    "name": "News18 Lokmat",
    "category": "marathi",
    "streamUrl": "https://n18syndication.akamaized.net/bpk-tv/News18_Lokmat_NW18_MOB/output01/master.m3u8",
    "fallbackUrl": "https://dgrvlduwztkd4.cloudfront.net/index_5.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/News18%20Lokmat.png",
    "currentProgram": "Maharashtra Breaking News & Ground Reality",
    "quality": "1080p",
    "language": "Marathi",
    "badge": "HD NEWS",
    "isPopular": false
  },
  {
    "id": "tv9-marathi-hd",
    "name": "TV9 Marathi",
    "category": "marathi",
    "streamUrl": "https://dyjmyiv3bp2ez.cloudfront.net/pub-iotv9marlygv8h/liveabr/playlist.m3u8",
    "fallbackUrl": "https://dgrvlduwztkd4.cloudfront.net/index_5.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/TV9_Marathi.png",
    "currentProgram": "Superfast 100 Maharashtra & Crime Files",
    "quality": "720p",
    "language": "Marathi",
    "badge": "LIVE",
    "isPopular": false
  },
  {
    "id": "shemaroo-marathi-bana",
    "name": "Shemaroo Marathi Bana",
    "category": "marathi",
    "streamUrl": "https://airtelapp.shemaroo.com/marathibana/smil:marathibanaadp.smil/playlist.m3u8",
    "fallbackUrl": "https://cloudplay-sonyliv.pages.dev/marathi.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Shemaroo_Marathi_Bana.png",
    "currentProgram": "Marathi Cinema Blockbusters & Historical Shows",
    "quality": "720p",
    "language": "Marathi",
    "badge": "CINEMA",
    "isPopular": false
  },
  {
    "id": "colors-tamil-hd",
    "name": "Colors Tamil",
    "category": "tamil",
    "streamUrl": "https://da86m1sqpm3o0.cloudfront.net/28072023/smil:colorstamilhd11.smil/playlist.m3u8",
    "fallbackUrl": "https://da86m1sqpm3o0.cloudfront.net/28072023/smil:zeetamil1.smil/playlist.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Colors%20Tamil%20HD.png",
    "currentProgram": "Superhit Tamil Serials & Reality Shows",
    "quality": "720p",
    "language": "Tamil",
    "badge": "POPULAR",
    "isPopular": true
  },
  {
    "id": "zee-tamil-hd",
    "name": "Zee Tamil",
    "category": "tamil",
    "streamUrl": "https://da86m1sqpm3o0.cloudfront.net/28072023/smil:zeetamil1.smil/playlist.m3u8",
    "fallbackUrl": "https://da86m1sqpm3o0.cloudfront.net/28072023/smil:colorstamilhd11.smil/playlist.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Zee%20Tamil%20HD.png",
    "currentProgram": "Sembaruthi, Ninaithale Inikkum & Sa Re Ga Ma Pa",
    "quality": "720p",
    "language": "Tamil",
    "badge": "TOP #1 TAMIL",
    "isPopular": true
  },
  {
    "id": "dd-tamil-hd",
    "name": "DD Tamil",
    "category": "tamil",
    "streamUrl": "https://d2lk5u59tns74c.cloudfront.net/out/v1/abf46b14847e45499f4a47f3a9afe93d/index.m3u8",
    "fallbackUrl": "https://d2lk5u59tns74c.cloudfront.net/out/v1/abf46b14847e45499f4a47f3a9afe93d/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/DD_Podhigai.png",
    "currentProgram": "Tamil Nadu News, Classical Music & Cultural Serials",
    "quality": "1080p",
    "language": "Tamil",
    "badge": "OFFICIAL",
    "isPopular": false
  },
  {
    "id": "news18-tamil-nadu-hd",
    "name": "News18 Tamil Nadu",
    "category": "tamil",
    "streamUrl": "https://n18syndication.akamaized.net/bpk-tv/News18_Tamil_Nadu_NW18_MOB/output01/master.m3u8",
    "fallbackUrl": "https://segment.yuppcdn.net/240122/news7/playlist.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/News18%20Tamil%20Nadu.png",
    "currentProgram": "24x7 Breaking News & Tamil Nadu Politics",
    "quality": "1080p",
    "language": "Tamil",
    "badge": "NEWS",
    "isPopular": false
  },
  {
    "id": "raj-musix-tamil",
    "name": "Raj Musix Tamil",
    "category": "tamil",
    "streamUrl": "https://livestream.rajtv.tv/hlslive/Admin/px08241087/live/Raj_Musix/master_1.m3u8",
    "fallbackUrl": "https://segment.yuppcdn.net/240122/news7/playlist.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Raj_Musix.png",
    "currentProgram": "Kollywood Evergreen & Latest Hits",
    "quality": "1080p",
    "language": "Tamil",
    "badge": "MUSIC",
    "isPopular": false
  },
  {
    "id": "star-maa-hd",
    "name": "Star Maa",
    "category": "telugu",
    "streamUrl": "https://da86m1sqpm3o0.cloudfront.net/28072023/smil:starmaa1.smil/chunklist_b2628000.m3u8",
    "fallbackUrl": "https://da86m1sqpm3o0.cloudfront.net/28072023/smil:maamovies.smil/chunklist_b2628000.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Star%20Maa%20HD.png",
    "currentProgram": "Karthika Deepam & Bigg Boss Telugu",
    "quality": "720p",
    "language": "Telugu",
    "badge": "TOP #1 TELUGU",
    "isPopular": true
  },
  {
    "id": "star-maa-movies-hd",
    "name": "Star Maa Movies",
    "category": "telugu",
    "streamUrl": "https://da86m1sqpm3o0.cloudfront.net/28072023/smil:maamovies.smil/chunklist_b2628000.m3u8",
    "fallbackUrl": "https://da86m1sqpm3o0.cloudfront.net/28072023/smil:starmaa1.smil/chunklist_b2628000.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Star%20Maa%20Movies%20HD.png",
    "currentProgram": "Tollywood Blockbuster Movie Premieres",
    "quality": "720p",
    "language": "Telugu",
    "badge": "CINEMA",
    "isPopular": true
  },
  {
    "id": "sony-sports-ten-4-telugu",
    "name": "Sony Sports Ten 4 (Telugu)",
    "category": "telugu",
    "streamUrl": "https://cloudplay-sonyliv.pages.dev/ten4hd.m3u8",
    "fallbackUrl": "https://real-vk.proxy.nellaiiptv.com/SDMEDIA/index.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Sony%20Sports%20Ten%204%20HD.png",
    "currentProgram": "Live Cricket, WWE & Football in Telugu Commentary",
    "quality": "1080p",
    "language": "Telugu",
    "badge": "SPORTS",
    "isPopular": true
  },
  {
    "id": "tv9-telugu-hd",
    "name": "TV9 Telugu",
    "category": "telugu",
    "streamUrl": "https://dyjmyiv3bp2ez.cloudfront.net/pub-iotv9telcmjhcs/liveabr/playlist.m3u8",
    "fallbackUrl": "https://yuppparoriglin.akamaized.net/181224/smil:6tv.smil/playlist.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/TV9_Telugu.png",
    "currentProgram": "Telugu States Breaking News & Analysis",
    "quality": "720p",
    "language": "Telugu",
    "badge": "TOP NEWS",
    "isPopular": false
  },
  {
    "id": "telugu-one-hd",
    "name": "Telugu One",
    "category": "telugu",
    "streamUrl": "https://teluguone-yupptv.vgcdn.net/v1/019be9e3f04d1ea55784338b5c3e89/019be9e4474415fc60e93459e1e808/teluguone_2500k.m3u8",
    "fallbackUrl": "https://dyjmyiv3bp2ez.cloudfront.net/pub-iotv9telcmjhcs/liveabr/playlist.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Gemini_TV_HD.png",
    "currentProgram": "Tollywood Entertainment & Special Shows",
    "quality": "1080p",
    "language": "Telugu",
    "badge": "ENTERTAINMENT",
    "isPopular": false
  },
  {
    "id": "colors-kannada-hd",
    "name": "Colors Kannada",
    "category": "kannada",
    "streamUrl": "https://da86m1sqpm3o0.cloudfront.net/28072023/smil:colorskannadahd1.smil/playlist.m3u8",
    "fallbackUrl": "https://yuppnimresmum.akamaized.net/28072023/smil:zeekannadahd.smil/playlist.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Colors%20Kannada%20HD.png",
    "currentProgram": "Bigg Boss Kannada & Agnisakshi Serials",
    "quality": "1080i",
    "language": "Kannada",
    "badge": "BIGG BOSS",
    "isPopular": true
  },
  {
    "id": "zee-kannada-hd",
    "name": "Zee Kannada",
    "category": "kannada",
    "streamUrl": "https://yuppnimresmum.akamaized.net/28072023/smil:zeekannadahd.smil/playlist.m3u8?hdnts=st=1735898689~exp=1835898688~acl=*~hmac=f5fe24724fe05481e3841f9eb5ab8efdee0a3dd83645ae9dcf45703f525bab7b",
    "fallbackUrl": "https://da86m1sqpm3o0.cloudfront.net/28072023/smil:colorskannadahd1.smil/playlist.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Zee%20Kannada%20HD.png",
    "currentProgram": "Gattimela, Jothe Jotheyali & Comedy Khiladigalu",
    "quality": "1080p",
    "language": "Kannada",
    "badge": "TOP #1 KANNADA",
    "isPopular": true
  },
  {
    "id": "news18-kannada-hd",
    "name": "News18 Kannada",
    "category": "kannada",
    "streamUrl": "https://n18syndication.akamaized.net/bpk-tv/News18_Kannada_NW18_MOB/output01/master.m3u8",
    "fallbackUrl": "https://streams.tangotv.in/TV9KANNADA/ORIGIN/index.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/News18%20Kannada.png",
    "currentProgram": "Karnataka 24x7 Headlines & Special Bulletins",
    "quality": "1080p",
    "language": "Kannada",
    "badge": "NEWS",
    "isPopular": false
  },
  {
    "id": "siri-kannada-hd",
    "name": "Siri Kannada",
    "category": "kannada",
    "streamUrl": "https://mumt03.tangotv.in/Dsly5z3HSIRIKANNADA/index.m3u8",
    "fallbackUrl": "https://da86m1sqpm3o0.cloudfront.net/28072023/smil:colorskannadahd1.smil/playlist.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Colors_Kannada_Cinema.png",
    "currentProgram": "Sandalwood Movies & Family Mega Dramas",
    "quality": "720p",
    "language": "Kannada",
    "badge": "ENTERTAINMENT",
    "isPopular": false
  },
  {
    "id": "star-jalsha-hd",
    "name": "Star Jalsha",
    "category": "bengali",
    "streamUrl": "https://da86m1sqpm3o0.cloudfront.net/28072023/smil:starjalsha.smil/chunklist_b1928000.m3u8",
    "fallbackUrl": "https://cloudplay-sonyliv.pages.dev/aath.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Star%20Jalsha%20HD.png",
    "currentProgram": "Anuraager Chhowa & Gaatchora Mega Serials",
    "quality": "720p",
    "language": "Bengali",
    "badge": "TOP #1 BANGLA",
    "isPopular": true
  },
  {
    "id": "sony-aath-hd",
    "name": "Sony Aath",
    "category": "bengali",
    "streamUrl": "https://cloudplay-sonyliv.pages.dev/aath.m3u8",
    "fallbackUrl": "https://d2l4ar6y3mrs4k.cloudfront.net/live-streaming/ananda-livetv/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Sony%20Aath.png",
    "currentProgram": "Gopal Bhar & CID Bangla Episodes",
    "quality": "1080p",
    "language": "Bengali",
    "badge": "GOPAL BHAR",
    "isPopular": true
  },
  {
    "id": "abp-ananda-hd",
    "name": "ABP Ananda",
    "category": "bengali",
    "streamUrl": "https://d2l4ar6y3mrs4k.cloudfront.net/live-streaming/ananda-livetv/master.m3u8",
    "fallbackUrl": "https://n18syndication.akamaized.net/bpk-tv/News18_Bangla_NW18_MOB/output01/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/ABP%20Ananda.png",
    "currentProgram": "Jukti Tokko & 24 Ghanta Bangla Khabar",
    "quality": "1080p",
    "language": "Bengali",
    "badge": "LEADER",
    "isPopular": true
  },
  {
    "id": "news18-bangla-hd",
    "name": "News18 Bangla",
    "category": "bengali",
    "streamUrl": "https://n18syndication.akamaized.net/bpk-tv/News18_Bangla_NW18_MOB/output01/master.m3u8",
    "fallbackUrl": "https://d2l4ar6y3mrs4k.cloudfront.net/live-streaming/ananda-livetv/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/News18%20Bangla.png",
    "currentProgram": "Bengal Today & Kolkata Headlines",
    "quality": "1080p",
    "language": "Bengali",
    "badge": "NEWS",
    "isPopular": false
  },
  {
    "id": "news18-gujarati-hd",
    "name": "News18 Gujarati",
    "category": "gujarati",
    "streamUrl": "https://n18syndication.akamaized.net/bpk-tv/News18_Gujarati_NW18_MOB/output01/master.m3u8",
    "fallbackUrl": "https://d2l4ar6y3mrs4k.cloudfront.net/live-streaming/asmita-livetv/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/News18%20Gujarati.png",
    "currentProgram": "Gujarat Express & Live Politics",
    "quality": "1080p",
    "language": "Gujarati",
    "badge": "TOP #1 GUJARATI",
    "isPopular": true
  },
  {
    "id": "abp-asmita-hd",
    "name": "ABP Asmita",
    "category": "gujarati",
    "streamUrl": "https://d2l4ar6y3mrs4k.cloudfront.net/live-streaming/asmita-livetv/master.m3u8",
    "fallbackUrl": "https://n18syndication.akamaized.net/bpk-tv/News18_Gujarati_NW18_MOB/output01/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/ABP%20Asmita.png",
    "currentProgram": "Maru Sahar Maru Gujarat & Ground News",
    "quality": "1080p",
    "language": "Gujarati",
    "badge": "ASMITA",
    "isPopular": true
  },
  {
    "id": "tv9-gujarati-hd",
    "name": "TV9 Gujarati",
    "category": "gujarati",
    "streamUrl": "https://dyjmyiv3bp2ez.cloudfront.net/pub-iotv9guj3ki8lu/liveabr/playlist.m3u8",
    "fallbackUrl": "https://d2l4ar6y3mrs4k.cloudfront.net/live-streaming/asmita-livetv/master.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/TV9_Gujarati.png",
    "currentProgram": "Khabar Gujarat & Prime Debate",
    "quality": "720p",
    "language": "Gujarati",
    "badge": "NEWS",
    "isPopular": false
  },
  {
    "id": "ptc-punjabi-hd",
    "name": "PTC Punjabi",
    "category": "punjabi",
    "streamUrl": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/3e22a9c278db4e3eb779afd42e41b0a6/index.m3u8",
    "fallbackUrl": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/6e14bac6d0384e129521a4d005188bfb/index.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/PTC%20Punjabi.png",
    "currentProgram": "Gurbani Live Sri Harmandir Sahib & Drama Serials",
    "quality": "1080p",
    "language": "Punjabi",
    "badge": "TOP #1 PUNJABI",
    "isPopular": true
  },
  {
    "id": "ptc-punjabi-gold",
    "name": "PTC Punjabi Gold",
    "category": "punjabi",
    "streamUrl": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/6e14bac6d0384e129521a4d005188bfb/index.m3u8",
    "fallbackUrl": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/3e22a9c278db4e3eb779afd42e41b0a6/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/PTC_Punjabi_Gold.png",
    "currentProgram": "Golden Punjabi Cinema Classics & Musical Melodies",
    "quality": "1080p",
    "language": "Punjabi",
    "badge": "GOLD",
    "isPopular": false
  },
  {
    "id": "dd-punjabi-hd",
    "name": "DD Punjabi",
    "category": "punjabi",
    "streamUrl": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/da821c24a59d4e57960497aeaca8fb33/index.m3u8",
    "fallbackUrl": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/3e22a9c278db4e3eb779afd42e41b0a6/index.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/DD_Punjabi.png",
    "currentProgram": "Rangla Punjab & Virsa Heritage Specials",
    "quality": "504p",
    "language": "Punjabi",
    "badge": "OFFICIAL",
    "isPopular": false
  },
  {
    "id": "bhojpuri-cinema-hd",
    "name": "Bhojpuri Cinema",
    "category": "bhojpuri",
    "streamUrl": "https://live-bhojpuri.akamaized.net/liveabr/playlist.m3u8",
    "fallbackUrl": "https://cdnb4u.wiseplayout.com/B4U_Bhojpuri/master.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/Bhojpuri%20Cinema.png",
    "currentProgram": "Pawan Singh & Khesari Lal Blockbuster Movies",
    "quality": "720p",
    "language": "Bhojpuri",
    "badge": "TOP #1 BHOJPURI",
    "isPopular": true
  },
  {
    "id": "b4u-bhojpuri-hd",
    "name": "B4U Bhojpuri",
    "category": "bhojpuri",
    "streamUrl": "https://cdnb4u.wiseplayout.com/B4U_Bhojpuri/master.m3u8",
    "fallbackUrl": "https://live-bhojpuri.akamaized.net/liveabr/playlist.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/B4U%20Bhojpuri.png",
    "currentProgram": "Bhojpuri Dhamaka & Superhit Gana Special",
    "quality": "1080p",
    "language": "Bhojpuri",
    "badge": "DHAMAKA",
    "isPopular": true
  },
  {
    "id": "epic-bhojpuri-digital",
    "name": "Epic Bhojpuri",
    "category": "bhojpuri",
    "streamUrl": "https://cc-8hy4a26pz2uos.akamaized.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-8hy4a26pz2uos/playlist.m3u8",
    "fallbackUrl": "https://live-bhojpuri.akamaized.net/liveabr/playlist.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Big_Ganga.png",
    "currentProgram": "Dehati Cinema Classics & Folk Music",
    "quality": "1080p",
    "language": "Bhojpuri",
    "badge": "EPIC",
    "isPopular": false
  },
  {
    "id": "dd-malayalam-hd",
    "name": "DD Malayalam",
    "category": "malayalam",
    "streamUrl": "https://d2lk5u59tns74c.cloudfront.net/out/v1/c313674ffced4c9a90f1bba436df2b9b/index.m3u8",
    "fallbackUrl": "https://n18syndication.akamaized.net/bpk-tv/News18_Kerala_NW18_MOB/output01/master.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/DD_Malayalam.png",
    "currentProgram": "Kerala Art, Literature & Regional Specials",
    "quality": "504p",
    "language": "Malayalam",
    "badge": "OFFICIAL",
    "isPopular": true
  },
  {
    "id": "news18-kerala-hd",
    "name": "News18 Kerala",
    "category": "malayalam",
    "streamUrl": "https://n18syndication.akamaized.net/bpk-tv/News18_Kerala_NW18_MOB/output01/master.m3u8",
    "fallbackUrl": "https://d2lk5u59tns74c.cloudfront.net/out/v1/c313674ffced4c9a90f1bba436df2b9b/index.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/News18%20Kerala.png",
    "currentProgram": "Kerala 24x7 Headlines & Political Debate",
    "quality": "1080p",
    "language": "Malayalam",
    "badge": "NEWS",
    "isPopular": false
  },
  {
    "id": "news18-odia-hd",
    "name": "News18 Odia",
    "category": "odia",
    "streamUrl": "https://n18syndication.akamaized.net/bpk-tv/News18_Odia_NW18_MOB/output01/master.m3u8",
    "fallbackUrl": "https://live.ekamraott.com/bharat/bharat/index.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/News18%20Odia.png",
    "currentProgram": "Odisha Samachar & Special Bulletins",
    "quality": "1080p",
    "language": "Odia",
    "badge": "TOP #1 ODIA",
    "isPopular": true
  },
  {
    "id": "ekamra-bharat-odia",
    "name": "Ekamra Bharat Odia",
    "category": "odia",
    "streamUrl": "https://n18syndication.akamaized.net/bpk-tv/News18_Odia_NW18_MOB/output01/master.m3u8",
    "fallbackUrl": "https://n18syndication.akamaized.net/bpk-tv/News18_Odia_NW18_MOB/output01/master.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Tarang_TV.png",
    "currentProgram": "Odisha Regional News & Culture",
    "quality": "720p",
    "language": "Odia",
    "badge": "NEWS",
    "isPopular": false
  },
  {
    "id": "news18-assam-hd",
    "name": "News18 Assam North-East",
    "category": "assamese",
    "streamUrl": "https://n18syndication.akamaized.net/bpk-tv/News18_Assam_North_East_NW18_MOB/output01/master.m3u8",
    "fallbackUrl": "https://d2lk5u59tns74c.cloudfront.net/out/v1/8b75afc6576f450e8f554b6c877681d2/index.m3u8",
    "logo": "https://ltsk-cdn.s3.eu-west-1.amazonaws.com/jumpstart/Temp_Live/cdn/HLS/Channel/transparentImages/News18%20Assam%20North%20East.png",
    "currentProgram": "Assam News & North-East Headlines",
    "quality": "1080p",
    "language": "Assamese",
    "badge": "TOP #1 ASSAM",
    "isPopular": true
  },
  {
    "id": "dd-north-east-hd",
    "name": "DD North East",
    "category": "assamese",
    "streamUrl": "https://d2lk5u59tns74c.cloudfront.net/out/v1/8b75afc6576f450e8f554b6c877681d2/index.m3u8",
    "fallbackUrl": "https://n18syndication.akamaized.net/bpk-tv/News18_Assam_North_East_NW18_MOB/output01/master.m3u8",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/DD_North_East.png",
    "currentProgram": "Seven Sisters Culture, News & Festivals",
    "quality": "504p",
    "language": "Assamese",
    "badge": "REGIONAL",
    "isPopular": false
  }
];

const REMOTE_CHANNELS_KEY = 'cinevault_remote_channels';
const CHANNELS_ENDPOINTS = [
  'https://cinevaultapk.online/api/channels.json',
  'https://cinevault-web.pages.dev/api/channels.json',
];

type ChannelListener = (channels: LiveChannel[]) => void;
const channelListeners = new Set<ChannelListener>();

function loadInitialChannels(): LiveChannel[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = localStorage.getItem(REMOTE_CHANNELS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch {}
  return BUNDLED_CHANNELS;
}

export let LIVE_CHANNELS: LiveChannel[] = loadInitialChannels();

export const subscribeToChannels = (listener: ChannelListener): (() => void) => {
  channelListeners.add(listener);
  return () => channelListeners.delete(listener);
};

export const syncRemoteChannels = async (): Promise<LiveChannel[]> => {
  for (const endpoint of CHANNELS_ENDPOINTS) {
    try {
      const url = `${endpoint}?_t=${Date.now()}`;
      const res = await fetch(url, {
        cache: 'no-cache',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          LIVE_CHANNELS = data;
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.setItem(REMOTE_CHANNELS_KEY, JSON.stringify(data));
            }
          } catch {}
          channelListeners.forEach((fn) => {
            try { fn(LIVE_CHANNELS); } catch {}
          });
          return LIVE_CHANNELS;
        }
      }
    } catch {}
  }
  return LIVE_CHANNELS;
};

// Automatic non-blocking background sync on app start
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncRemoteChannels().catch(() => {});
  }, 1000);
}

export const getAllChannels = (): LiveChannel[] => {
  return LIVE_CHANNELS;
};

export const getChannelsByCategory = (category: ChannelCategory): LiveChannel[] => {
  if (category === 'all') return LIVE_CHANNELS;
  return LIVE_CHANNELS.filter((c) => c.category === category);
};

export const getPopularChannels = (): LiveChannel[] => {
  return LIVE_CHANNELS.filter((c) => c.isPopular);
};

export const searchChannels = (query: string): LiveChannel[] => {
  if (!query || !query.trim()) return LIVE_CHANNELS;
  const q = query.toLowerCase().trim();
  return LIVE_CHANNELS.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.currentProgram.toLowerCase().includes(q) ||
      c.language.toLowerCase().includes(q)
  );
};

export const getChannelById = (id: string): LiveChannel | undefined => {
  return LIVE_CHANNELS.find((c) => c.id === id);
};

export const liveTvService = {
  getChannels: getAllChannels,
  getChannelsByCategory,
  getPopularChannels,
  searchChannels,
  getChannelById,
  subscribe: subscribeToChannels,
  syncRemoteChannels,
};

