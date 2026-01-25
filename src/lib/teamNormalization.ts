// Team name normalization layer
// Maps various team name formats to a canonical name

const TEAM_ALIASES: Record<string, string[]> = {
  // ACC
  'Duke Blue Devils': ['Duke', 'DUKE'],
  'North Carolina Tar Heels': ['North Carolina', 'UNC', 'N Carolina', 'NC'],
  'Virginia Cavaliers': ['Virginia', 'UVA', 'Va'],
  'Louisville Cardinals': ['Louisville', 'L\'ville'],
  'Syracuse Orange': ['Syracuse', 'Cuse'],
  'Florida State Seminoles': ['Florida State', 'FSU', 'Florida St'],
  'NC State Wolfpack': ['NC State', 'N.C. State', 'North Carolina State', 'NCST'],
  'Wake Forest Demon Deacons': ['Wake Forest', 'Wake'],
  'Clemson Tigers': ['Clemson'],
  'Georgia Tech Yellow Jackets': ['Georgia Tech', 'GT', 'Ga Tech'],
  'Miami Hurricanes': ['Miami', 'Miami (FL)', 'Miami FL'],
  'Boston College Eagles': ['Boston College', 'BC', 'Boston Col'],
  'Pittsburgh Panthers': ['Pittsburgh', 'Pitt'],
  'Notre Dame Fighting Irish': ['Notre Dame', 'ND'],
  'Virginia Tech Hokies': ['Virginia Tech', 'VT', 'Va Tech'],

  // Big Ten
  'Michigan Wolverines': ['Michigan', 'Mich'],
  'Michigan State Spartans': ['Michigan State', 'MSU', 'Michigan St', 'Mich St'],
  'Ohio State Buckeyes': ['Ohio State', 'OSU', 'Ohio St'],
  'Indiana Hoosiers': ['Indiana', 'IND', 'Ind'],
  'Purdue Boilermakers': ['Purdue', 'PUR'],
  'Wisconsin Badgers': ['Wisconsin', 'Wisc', 'Wis'],
  'Illinois Fighting Illini': ['Illinois', 'ILL', 'Ill'],
  'Iowa Hawkeyes': ['Iowa', 'IOWA'],
  'Minnesota Golden Gophers': ['Minnesota', 'Minn'],
  'Northwestern Wildcats': ['Northwestern', 'NW', 'NWern'],
  'Penn State Nittany Lions': ['Penn State', 'PSU', 'Penn St'],
  'Maryland Terrapins': ['Maryland', 'MD', 'Md'],
  'Rutgers Scarlet Knights': ['Rutgers', 'RU', 'Rutger'],
  'Nebraska Cornhuskers': ['Nebraska', 'Neb'],
  'UCLA Bruins': ['UCLA', 'U.C.L.A.'],
  'USC Trojans': ['USC', 'Southern California', 'S California'],
  'Oregon Ducks': ['Oregon', 'ORE', 'Ore'],
  'Washington Huskies': ['Washington', 'UW', 'Wash'],

  // Big 12
  'Kansas Jayhawks': ['Kansas', 'KU', 'Kan'],
  'Baylor Bears': ['Baylor', 'BAY'],
  'Texas Tech Red Raiders': ['Texas Tech', 'TTU', 'Tex Tech'],
  'Texas Longhorns': ['Texas', 'TEX', 'Tex'],
  'Oklahoma Sooners': ['Oklahoma', 'OU', 'Okla'],
  'Oklahoma State Cowboys': ['Oklahoma State', 'OSU', 'Okla St'],
  'West Virginia Mountaineers': ['West Virginia', 'WVU', 'W Virginia'],
  'TCU Horned Frogs': ['TCU', 'T.C.U.'],
  'Kansas State Wildcats': ['Kansas State', 'KSU', 'K State', 'Kan St'],
  'Iowa State Cyclones': ['Iowa State', 'ISU', 'Iowa St'],
  'Cincinnati Bearcats': ['Cincinnati', 'Cincy', 'Cinci'],
  'Houston Cougars': ['Houston', 'HOU', 'Hou'],
  'BYU Cougars': ['BYU', 'Brigham Young'],
  'UCF Knights': ['UCF', 'Central Florida'],
  'Arizona Wildcats': ['Arizona', 'ARIZ', 'Ariz'],
  'Arizona State Sun Devils': ['Arizona State', 'ASU', 'Ariz St'],
  'Colorado Buffaloes': ['Colorado', 'COLO', 'Colo'],
  'Utah Utes': ['Utah', 'UTAH'],

  // SEC
  'Kentucky Wildcats': ['Kentucky', 'UK', 'Ky'],
  'Tennessee Volunteers': ['Tennessee', 'TENN', 'Tenn'],
  'Auburn Tigers': ['Auburn', 'AUB'],
  'Alabama Crimson Tide': ['Alabama', 'BAMA', 'Ala'],
  'Arkansas Razorbacks': ['Arkansas', 'ARK', 'Ark'],
  'LSU Tigers': ['LSU', 'Louisiana State'],
  'Florida Gators': ['Florida', 'FLA', 'Fla'],
  'Georgia Bulldogs': ['Georgia', 'UGA', 'Ga'],
  'South Carolina Gamecocks': ['South Carolina', 'SC', 'S Carolina'],
  'Mississippi State Bulldogs': ['Mississippi State', 'Miss St', 'MSU'],
  'Ole Miss Rebels': ['Ole Miss', 'Mississippi', 'Miss'],
  'Missouri Tigers': ['Missouri', 'MIZZ', 'Mizzou', 'Mo'],
  'Vanderbilt Commodores': ['Vanderbilt', 'Vandy', 'VAND'],
  'Texas A&M Aggies': ['Texas A&M', 'TAMU', 'Tex A&M'],

  // Big East
  'UConn Huskies': ['UConn', 'Connecticut', 'CONN'],
  'Villanova Wildcats': ['Villanova', 'Nova', 'VILL'],
  'Creighton Bluejays': ['Creighton', 'CREI'],
  'Marquette Golden Eagles': ['Marquette', 'MARQ'],
  'Xavier Musketeers': ['Xavier', 'XAV'],
  'Seton Hall Pirates': ['Seton Hall', 'SH', 'Seton'],
  'Providence Friars': ['Providence', 'PROV'],
  'Butler Bulldogs': ['Butler', 'BUT'],
  'St. Johns Red Storm': ['St. Johns', 'St Johns', 'SJU', 'Saint Johns'],
  'Georgetown Hoyas': ['Georgetown', 'GTWN', 'G\'town'],
  'DePaul Blue Demons': ['DePaul', 'DEPL'],

  // Pac-12 (remaining)
  'Oregon State Beavers': ['Oregon State', 'OSU', 'Ore St'],
  'Washington State Cougars': ['Washington State', 'WSU', 'Wash St'],
  'Stanford Cardinal': ['Stanford', 'STAN'],
  'California Golden Bears': ['California', 'Cal', 'CAL'],

  // Mid-Majors / Others
  'Gonzaga Bulldogs': ['Gonzaga', 'GONZ', 'Zags'],
  'Memphis Tigers': ['Memphis', 'MEM'],
  'San Diego State Aztecs': ['San Diego State', 'SDSU', 'SD State'],
  'Saint Marys Gaels': ['Saint Marys', 'St Marys', 'St. Marys', 'SMC'],
  'Nevada Wolf Pack': ['Nevada', 'NEV'],
  'Boise State Broncos': ['Boise State', 'BSU', 'Boise St'],
  'Colorado State Rams': ['Colorado State', 'CSU', 'Colo St'],
  'New Mexico Lobos': ['New Mexico', 'UNM', 'N Mexico'],
  'UNLV Rebels': ['UNLV', 'Nevada Las Vegas'],
  'Wichita State Shockers': ['Wichita State', 'WSU', 'Wichita St'],
  'VCU Rams': ['VCU', 'Virginia Commonwealth'],
  'Dayton Flyers': ['Dayton', 'DAY'],
  'Saint Louis Billikens': ['Saint Louis', 'St Louis', 'SLU'],
  'Davidson Wildcats': ['Davidson', 'DAV'],
};

// Build reverse lookup map
const ALIAS_TO_CANONICAL: Map<string, string> = new Map();
for (const [canonical, aliases] of Object.entries(TEAM_ALIASES)) {
  ALIAS_TO_CANONICAL.set(canonical.toLowerCase(), canonical);
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL.set(alias.toLowerCase(), canonical);
  }
}

export function normalizeTeamName(name: string): string {
  const lower = name.toLowerCase().trim();
  return ALIAS_TO_CANONICAL.get(lower) || name;
}

export function getCanonicalName(name: string): string {
  return normalizeTeamName(name);
}

// Fuzzy match - finds best match if exact match fails
export function fuzzyMatchTeam(name: string): string | null {
  const normalized = normalizeTeamName(name);
  if (normalized !== name) {
    return normalized;
  }

  // Try to find partial match
  const lower = name.toLowerCase();
  const aliasEntries = Array.from(ALIAS_TO_CANONICAL.entries());
  for (let i = 0; i < aliasEntries.length; i++) {
    const [alias, canonical] = aliasEntries[i];
    if (alias.includes(lower) || lower.includes(alias)) {
      return canonical;
    }
  }

  return null;
}

// Check if two team names refer to the same team
export function teamsMatch(name1: string, name2: string): boolean {
  const canonical1 = normalizeTeamName(name1);
  const canonical2 = normalizeTeamName(name2);
  return canonical1.toLowerCase() === canonical2.toLowerCase();
}
