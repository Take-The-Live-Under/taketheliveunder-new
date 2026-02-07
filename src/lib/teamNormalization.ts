// Team name normalization layer
// Maps various team name formats across KenPom, ESPN, and Odds API

// Unified team mappings from CSV - all 366 NCAA teams
// Format: [odds_api_name, espn_name, kenpom_name]
const UNIFIED_MAPPINGS: [string, string, string][] = [
  ["Abilene Christian Wildcats", "Abilene Christian Wildcats", "Abilene Christian"],
  ["Air Force Falcons", "Air Force Falcons", "Air Force"],
  ["Akron Zips", "Akron Zips", "Akron"],
  ["Alabama Crimson Tide", "Alabama Crimson Tide", "Alabama"],
  ["Alabama A&M Bulldogs", "Alabama A&M Bulldogs", "Alabama A&M"],
  ["Alabama St Hornets", "Alabama State Hornets", "Alabama St."],
  ["Albany Great Danes", "UAlbany Great Danes", "Albany"],
  ["Alcorn St Braves", "Alcorn State Braves", "Alcorn St."],
  ["American Eagles", "American University Eagles", "American"],
  ["Appalachian St Mountaineers", "App State Mountaineers", "Appalachian St."],
  ["Arizona Wildcats", "Arizona Wildcats", "Arizona"],
  ["Arizona St Sun Devils", "Arizona State Sun Devils", "Arizona St."],
  ["Arkansas Razorbacks", "Arkansas Razorbacks", "Arkansas"],
  ["Arkansas-Pine Bluff Golden Lions", "Arkansas-Pine Bluff Golden Lions", "Arkansas Pine Bluff"],
  ["Arkansas St Red Wolves", "Arkansas State Red Wolves", "Arkansas St."],
  ["Army Knights", "Army Black Knights", "Army"],
  ["Auburn Tigers", "Auburn Tigers", "Auburn"],
  ["Austin Peay Governors", "Austin Peay Governors", "Austin Peay"],
  ["BYU Cougars", "BYU Cougars", "BYU"],
  ["Ball State Cardinals", "Ball State Cardinals", "Ball St."],
  ["Baylor Bears", "Baylor Bears", "Baylor"],
  ["Bellarmine Knights", "Bellarmine Knights", "Bellarmine"],
  ["Belmont Bruins", "Belmont Bruins", "Belmont"],
  ["Bethune-Cookman Wildcats", "Bethune-Cookman Wildcats", "Bethune Cookman"],
  ["Binghamton Bearcats", "Binghamton Bearcats", "Binghamton"],
  ["Boise State Broncos", "Boise State Broncos", "Boise St."],
  ["Boston College Eagles", "Boston College Eagles", "Boston College"],
  ["Boston Univ. Terriers", "Boston University Terriers", "Boston University"],
  ["Bowling Green Falcons", "Bowling Green Falcons", "Bowling Green"],
  ["Bradley Braves", "Bradley Braves", "Bradley"],
  ["Brown Bears", "Brown Bears", "Brown"],
  ["Bryant Bulldogs", "Bryant Bulldogs", "Bryant"],
  ["Bucknell Bison", "Bucknell Bison", "Bucknell"],
  ["Buffalo Bulls", "Buffalo Bulls", "Buffalo"],
  ["Butler Bulldogs", "Butler Bulldogs", "Butler"],
  ["CSU Northridge Matadors", "Cal State Northridge Matadors", "CSUN"],
  ["Cal Baptist Lancers", "California Baptist Lancers", "Cal Baptist"],
  ["Cal Poly Mustangs", "Cal Poly Mustangs", "Cal Poly"],
  ["CSU Bakersfield Roadrunners", "Cal State Bakersfield Roadrunners", "Cal St. Bakersfield"],
  ["CSU Fullerton Titans", "Cal State Fullerton Titans", "Cal St. Fullerton"],
  ["California Golden Bears", "California Golden Bears", "California"],
  ["Campbell Fighting Camels", "Campbell Fighting Camels", "Campbell"],
  ["Canisius Golden Griffins", "Canisius Golden Griffins", "Canisius"],
  ["Central Arkansas Bears", "Central Arkansas Bears", "Central Arkansas"],
  ["Central Connecticut St Blue Devils", "Central Connecticut Blue Devils", "Central Connecticut"],
  ["Central Michigan Chippewas", "Central Michigan Chippewas", "Central Michigan"],
  ["Charleston Cougars", "Charleston Cougars", "Charleston"],
  ["Charleston Southern Buccaneers", "Charleston Southern Buccaneers", "Charleston Southern"],
  ["Charlotte 49ers", "Charlotte 49ers", "Charlotte"],
  ["Chattanooga Mocs", "Chattanooga Mocs", "Chattanooga"],
  ["Chicago St Cougars", "Chicago State Cougars", "Chicago St."],
  ["Cincinnati Bearcats", "Cincinnati Bearcats", "Cincinnati"],
  ["Clemson Tigers", "Clemson Tigers", "Clemson"],
  ["Cleveland St Vikings", "Cleveland State Vikings", "Cleveland St."],
  ["Coastal Carolina Chanticleers", "Coastal Carolina Chanticleers", "Coastal Carolina"],
  ["Colgate Raiders", "Colgate Raiders", "Colgate"],
  ["Colorado Buffaloes", "Colorado Buffaloes", "Colorado"],
  ["Colorado St Rams", "Colorado State Rams", "Colorado St."],
  ["Columbia Lions", "Columbia Lions", "Columbia"],
  ["UConn Huskies", "UConn Huskies", "Connecticut"],
  ["Coppin St Eagles", "Coppin State Eagles", "Coppin St."],
  ["Cornell Big Red", "Cornell Big Red", "Cornell"],
  ["Creighton Bluejays", "Creighton Bluejays", "Creighton"],
  ["Dartmouth Big Green", "Dartmouth Big Green", "Dartmouth"],
  ["Davidson Wildcats", "Davidson Wildcats", "Davidson"],
  ["Dayton Flyers", "Dayton Flyers", "Dayton"],
  ["DePaul Blue Demons", "DePaul Blue Demons", "DePaul"],
  ["Delaware Blue Hens", "Delaware Blue Hens", "Delaware"],
  ["Delaware St Hornets", "Delaware State Hornets", "Delaware St."],
  ["Denver Pioneers", "Denver Pioneers", "Denver"],
  ["Detroit Mercy Titans", "Detroit Mercy Titans", "Detroit Mercy"],
  ["Drake Bulldogs", "Drake Bulldogs", "Drake"],
  ["Drexel Dragons", "Drexel Dragons", "Drexel"],
  ["Duke Blue Devils", "Duke Blue Devils", "Duke"],
  ["Duquesne Dukes", "Duquesne Dukes", "Duquesne"],
  ["East Carolina Pirates", "East Carolina Pirates", "East Carolina"],
  ["East Tennessee St Buccaneers", "East Tennessee State Buccaneers", "East Tennessee St."],
  ["Texas A&M-Commerce Lions", "East Texas A&M Lions", "East Texas A&M"],
  ["Eastern Illinois Panthers", "Eastern Illinois Panthers", "Eastern Illinois"],
  ["Eastern Kentucky Colonels", "Eastern Kentucky Colonels", "Eastern Kentucky"],
  ["Eastern Michigan Eagles", "Eastern Michigan Eagles", "Eastern Michigan"],
  ["Eastern Washington Eagles", "Eastern Washington Eagles", "Eastern Washington"],
  ["Elon Phoenix", "Elon Phoenix", "Elon"],
  ["Evansville Purple Aces", "Evansville Purple Aces", "Evansville"],
  ["Florida Int'l Golden Panthers", "Florida International Panthers", "FIU"],
  ["Fairfield Stags", "Fairfield Stags", "Fairfield"],
  ["Fairleigh Dickinson Knights", "Fairleigh Dickinson Knights", "Fairleigh Dickinson"],
  ["Florida Gators", "Florida Gators", "Florida"],
  ["Florida A&M Rattlers", "Florida A&M Rattlers", "Florida A&M"],
  ["Florida Atlantic Owls", "Florida Atlantic Owls", "Florida Atlantic"],
  ["Florida Gulf Coast Eagles", "Florida Gulf Coast Eagles", "Florida Gulf Coast"],
  ["Florida St Seminoles", "Florida State Seminoles", "Florida St."],
  ["Fordham Rams", "Fordham Rams", "Fordham"],
  ["Fresno St Bulldogs", "Fresno State Bulldogs", "Fresno St."],
  ["Furman Paladins", "Furman Paladins", "Furman"],
  ["Gardner-Webb Bulldogs", "Gardner-Webb Runnin' Bulldogs", "Gardner Webb"],
  ["George Mason Patriots", "George Mason Patriots", "George Mason"],
  ["GW Revolutionaries", "George Washington Revolutionaries", "George Washington"],
  ["Georgetown Hoyas", "Georgetown Hoyas", "Georgetown"],
  ["Georgia Bulldogs", "Georgia Bulldogs", "Georgia"],
  ["Georgia Southern Eagles", "Georgia Southern Eagles", "Georgia Southern"],
  ["Georgia St Panthers", "Georgia State Panthers", "Georgia St."],
  ["Georgia Tech Yellow Jackets", "Georgia Tech Yellow Jackets", "Georgia Tech"],
  ["Gonzaga Bulldogs", "Gonzaga Bulldogs", "Gonzaga"],
  ["Grambling St Tigers", "Grambling Tigers", "Grambling St."],
  ["Grand Canyon Antelopes", "Grand Canyon Lopes", "Grand Canyon"],
  ["Green Bay Phoenix", "Green Bay Phoenix", "Green Bay"],
  ["Hampton Pirates", "Hampton Pirates", "Hampton"],
  ["Harvard Crimson", "Harvard Crimson", "Harvard"],
  ["Hawai'i Rainbow Warriors", "Hawai'i Rainbow Warriors", "Hawaii"],
  ["High Point Panthers", "High Point Panthers", "High Point"],
  ["Hofstra Pride", "Hofstra Pride", "Hofstra"],
  ["Holy Cross Crusaders", "Holy Cross Crusaders", "Holy Cross"],
  ["Houston Cougars", "Houston Cougars", "Houston"],
  ["Houston Christian Huskies", "Houston Christian Huskies", "Houston Christian"],
  ["Howard Bison", "Howard Bison", "Howard"],
  ["IUPUI Jaguars", "IU Indianapolis Jaguars", "IU Indy"],
  ["Idaho Vandals", "Idaho Vandals", "Idaho"],
  ["Idaho State Bengals", "Idaho State Bengals", "Idaho St."],
  ["Illinois Fighting Illini", "Illinois Fighting Illini", "Illinois"],
  ["UIC Flames", "UIC Flames", "Illinois Chicago"],
  ["Illinois St Redbirds", "Illinois State Redbirds", "Illinois St."],
  ["Incarnate Word Cardinals", "Incarnate Word Cardinals", "Incarnate Word"],
  ["Indiana Hoosiers", "Indiana Hoosiers", "Indiana"],
  ["Indiana St Sycamores", "Indiana State Sycamores", "Indiana St."],
  ["Iona Gaels", "Iona Gaels", "Iona"],
  ["Iowa Hawkeyes", "Iowa Hawkeyes", "Iowa"],
  ["Iowa State Cyclones", "Iowa State Cyclones", "Iowa St."],
  ["Jackson St Tigers", "Jackson State Tigers", "Jackson St."],
  ["Jacksonville Dolphins", "Jacksonville Dolphins", "Jacksonville"],
  ["Jacksonville St Gamecocks", "Jacksonville State Gamecocks", "Jacksonville St."],
  ["James Madison Dukes", "James Madison Dukes", "James Madison"],
  ["Kansas Jayhawks", "Kansas Jayhawks", "Kansas"],
  ["UMKC Kangaroos", "Kansas City Roos", "Kansas City"],
  ["Kansas St Wildcats", "Kansas State Wildcats", "Kansas St."],
  ["Kennesaw St Owls", "Kennesaw State Owls", "Kennesaw St."],
  ["Kent State Golden Flashes", "Kent State Golden Flashes", "Kent St."],
  ["Kentucky Wildcats", "Kentucky Wildcats", "Kentucky"],
  ["St. Francis BKN Terriers", "St. Francis Brooklyn Terriers", "LIU"],
  ["LSU Tigers", "LSU Tigers", "LSU"],
  ["La Salle Explorers", "La Salle Explorers", "La Salle"],
  ["Lafayette Leopards", "Lafayette Leopards", "Lafayette"],
  ["Lamar Cardinals", "Lamar Cardinals", "Lamar"],
  ["Le Moyne Dolphins", "Le Moyne Dolphins", "Le Moyne"],
  ["Lehigh Mountain Hawks", "Lehigh Mountain Hawks", "Lehigh"],
  ["Liberty Flames", "Liberty Flames", "Liberty"],
  ["Lindenwood Lions", "Lindenwood Lions", "Lindenwood"],
  ["Lipscomb Bisons", "Lipscomb Bisons", "Lipscomb"],
  ["Arkansas-Little Rock Trojans", "Little Rock Trojans", "Little Rock"],
  ["Long Beach St 49ers", "Long Beach State Beach", "Long Beach St."],
  ["Longwood Lancers", "Longwood Lancers", "Longwood"],
  ["Louisiana Ragin' Cajuns", "Louisiana Ragin' Cajuns", "Louisiana"],
  ["UL Monroe Warhawks", "UL Monroe Warhawks", "Louisiana Monroe"],
  ["Louisiana Tech Bulldogs", "Louisiana Tech Bulldogs", "Louisiana Tech"],
  ["Louisville Cardinals", "Louisville Cardinals", "Louisville"],
  ["Loyola (Chi) Ramblers", "Loyola Chicago Ramblers", "Loyola Chicago"],
  ["Loyola (MD) Greyhounds", "Loyola Maryland Greyhounds", "Loyola MD"],
  ["Loyola Marymount Lions", "Loyola Marymount Lions", "Loyola Marymount"],
  ["Maine Black Bears", "Maine Black Bears", "Maine"],
  ["Manhattan Jaspers", "Manhattan Jaspers", "Manhattan"],
  ["Marist Red Foxes", "Marist Red Foxes", "Marist"],
  ["Marquette Golden Eagles", "Marquette Golden Eagles", "Marquette"],
  ["Marshall Thundering Herd", "Marshall Thundering Herd", "Marshall"],
  ["Maryland Terrapins", "Maryland Terrapins", "Maryland"],
  ["Maryland-Eastern Shore Hawks", "Maryland Eastern Shore Hawks", "Maryland Eastern Shore"],
  ["Massachusetts Minutemen", "Massachusetts Minutemen", "Massachusetts"],
  ["McNeese Cowboys", "McNeese Cowboys", "McNeese"],
  ["Memphis Tigers", "Memphis Tigers", "Memphis"],
  ["Mercer Bears", "Mercer Bears", "Mercer"],
  ["Mercyhurst Lakers", "Mercyhurst Lakers", "Mercyhurst"],
  ["Merrimack Warriors", "Merrimack Warriors", "Merrimack"],
  ["Miami Hurricanes", "Miami Hurricanes", "Miami FL"],
  ["Miami (OH) RedHawks", "Miami (OH) RedHawks", "Miami OH"],
  ["Michigan Wolverines", "Michigan Wolverines", "Michigan"],
  ["Michigan St Spartans", "Michigan State Spartans", "Michigan St."],
  ["Middle Tennessee Blue Raiders", "Middle Tennessee Blue Raiders", "Middle Tennessee"],
  ["Milwaukee Panthers", "Milwaukee Panthers", "Milwaukee"],
  ["Minnesota Golden Gophers", "Minnesota Golden Gophers", "Minnesota"],
  ["Ole Miss Rebels", "Ole Miss Rebels", "Mississippi"],
  ["Mississippi St Bulldogs", "Mississippi State Bulldogs", "Mississippi St."],
  ["Miss Valley St Delta Devils", "Mississippi Valley State Delta Devils", "Mississippi Valley St."],
  ["Missouri Tigers", "Missouri Tigers", "Missouri"],
  ["Missouri St Bears", "Missouri State Bears", "Missouri St."],
  ["Monmouth Hawks", "Monmouth Hawks", "Monmouth"],
  ["Montana Grizzlies", "Montana Grizzlies", "Montana"],
  ["Montana St Bobcats", "Montana State Bobcats", "Montana St."],
  ["Morehead St Eagles", "Morehead State Eagles", "Morehead St."],
  ["Morgan St Bears", "Morgan State Bears", "Morgan St."],
  ["Mt. St. Mary's Mountaineers", "Mount St. Mary's Mountaineers", "Mount St. Mary's"],
  ["Murray St Racers", "Murray State Racers", "Murray St."],
  ["NC State Wolfpack", "NC State Wolfpack", "N.C. State"],
  ["NJIT Highlanders", "NJIT Highlanders", "NJIT"],
  ["Navy Midshipmen", "Navy Midshipmen", "Navy"],
  ["Nebraska Cornhuskers", "Nebraska Cornhuskers", "Nebraska"],
  ["Omaha Mavericks", "Omaha Mavericks", "Nebraska Omaha"],
  ["Nevada Wolf Pack", "Nevada Wolf Pack", "Nevada"],
  ["New Hampshire Wildcats", "New Hampshire Wildcats", "New Hampshire"],
  ["New Haven Chargers", "", "New Haven"],
  ["New Mexico Lobos", "New Mexico Lobos", "New Mexico"],
  ["New Mexico St Aggies", "New Mexico State Aggies", "New Mexico St."],
  ["New Orleans Privateers", "New Orleans Privateers", "New Orleans"],
  ["Niagara Purple Eagles", "Niagara Purple Eagles", "Niagara"],
  ["Nicholls St Colonels", "Nicholls Colonels", "Nicholls"],
  ["Norfolk St Spartans", "Norfolk State Spartans", "Norfolk St."],
  ["North Alabama Lions", "North Alabama Lions", "North Alabama"],
  ["North Carolina Tar Heels", "North Carolina Tar Heels", "North Carolina"],
  ["North Carolina A&T Aggies", "North Carolina A&T Aggies", "North Carolina A&T"],
  ["North Carolina Central Eagles", "North Carolina Central Eagles", "North Carolina Central"],
  ["North Dakota Fighting Hawks", "North Dakota Fighting Hawks", "North Dakota"],
  ["North Dakota St Bison", "North Dakota State Bison", "North Dakota St."],
  ["North Florida Ospreys", "North Florida Ospreys", "North Florida"],
  ["North Texas Mean Green", "North Texas Mean Green", "North Texas"],
  ["Northeastern Huskies", "Northeastern Huskies", "Northeastern"],
  ["Northern Arizona Lumberjacks", "Northern Arizona Lumberjacks", "Northern Arizona"],
  ["N Colorado Bears", "Northern Colorado Bears", "Northern Colorado"],
  ["Northern Illinois Huskies", "Northern Illinois Huskies", "Northern Illinois"],
  ["Northern Iowa Panthers", "Northern Iowa Panthers", "Northern Iowa"],
  ["Northern Kentucky Norse", "Northern Kentucky Norse", "Northern Kentucky"],
  ["Northwestern Wildcats", "Northwestern Wildcats", "Northwestern"],
  ["Northwestern St Demons", "Northwestern State Demons", "Northwestern St."],
  ["Notre Dame Fighting Irish", "Notre Dame Fighting Irish", "Notre Dame"],
  ["Oakland Golden Grizzlies", "Oakland Golden Grizzlies", "Oakland"],
  ["Ohio Bobcats", "Ohio Bobcats", "Ohio"],
  ["Ohio State Buckeyes", "Ohio State Buckeyes", "Ohio St."],
  ["Oklahoma Sooners", "Oklahoma Sooners", "Oklahoma"],
  ["Oklahoma St Cowboys", "Oklahoma State Cowboys", "Oklahoma St."],
  ["Old Dominion Monarchs", "Old Dominion Monarchs", "Old Dominion"],
  ["Oral Roberts Golden Eagles", "Oral Roberts Golden Eagles", "Oral Roberts"],
  ["Oregon Ducks", "Oregon Ducks", "Oregon"],
  ["Oregon St Beavers", "Oregon State Beavers", "Oregon St."],
  ["Pacific Tigers", "Pacific Tigers", "Pacific"],
  ["Pennsylvania Quakers", "Pennsylvania Quakers", "Penn"],
  ["Penn State Nittany Lions", "Penn State Nittany Lions", "Penn St."],
  ["Pepperdine Waves", "Pepperdine Waves", "Pepperdine"],
  ["Pittsburgh Panthers", "Pittsburgh Panthers", "Pittsburgh"],
  ["Portland Pilots", "Portland Pilots", "Portland"],
  ["Portland St Vikings", "Portland State Vikings", "Portland St."],
  ["Prairie View Panthers", "Prairie View A&M Panthers", "Prairie View A&M"],
  ["Presbyterian Blue Hose", "Presbyterian Blue Hose", "Presbyterian"],
  ["Princeton Tigers", "Princeton Tigers", "Princeton"],
  ["Providence Friars", "Providence Friars", "Providence"],
  ["Purdue Boilermakers", "Purdue Boilermakers", "Purdue"],
  ["Fort Wayne Mastodons", "Purdue Fort Wayne Mastodons", "Purdue Fort Wayne"],
  ["Queens University Royals", "Queens University Royals", "Queens"],
  ["Quinnipiac Bobcats", "Quinnipiac Bobcats", "Quinnipiac"],
  ["Radford Highlanders", "Radford Highlanders", "Radford"],
  ["Rhode Island Rams", "Rhode Island Rams", "Rhode Island"],
  ["Rice Owls", "Rice Owls", "Rice"],
  ["Richmond Spiders", "Richmond Spiders", "Richmond"],
  ["Rider Broncs", "Rider Broncs", "Rider"],
  ["Robert Morris Colonials", "Robert Morris Colonials", "Robert Morris"],
  ["Rutgers Scarlet Knights", "Rutgers Scarlet Knights", "Rutgers"],
  ["SIU-Edwardsville Cougars", "SIU Edwardsville Cougars", "SIUE"],
  ["SMU Mustangs", "SMU Mustangs", "SMU"],
  ["Sacramento St Hornets", "Sacramento State Hornets", "Sacramento St."],
  ["Sacred Heart Pioneers", "Sacred Heart Pioneers", "Sacred Heart"],
  ["St. Francis (PA) Red Flash", "St. Francis (PA) Red Flash", "Saint Francis"],
  ["Saint Joseph's Hawks", "Saint Joseph's Hawks", "Saint Joseph's"],
  ["Saint Louis Billikens", "Saint Louis Billikens", "Saint Louis"],
  ["Saint Mary's Gaels", "Saint Mary's Gaels", "Saint Mary's"],
  ["Saint Peter's Peacocks", "Saint Peter's Peacocks", "Saint Peter's"],
  ["Sam Houston St Bearkats", "Sam Houston Bearkats", "Sam Houston St."],
  ["Samford Bulldogs", "Samford Bulldogs", "Samford"],
  ["San Diego Toreros", "San Diego Toreros", "San Diego"],
  ["San Diego St Aztecs", "San Diego State Aztecs", "San Diego St."],
  ["San Francisco Dons", "San Francisco Dons", "San Francisco"],
  ["San José St Spartans", "San José State Spartans", "San Jose St."],
  ["Santa Clara Broncos", "Santa Clara Broncos", "Santa Clara"],
  ["Seattle Redhawks", "Seattle U Redhawks", "Seattle"],
  ["Seton Hall Pirates", "Seton Hall Pirates", "Seton Hall"],
  ["Siena Saints", "Siena Saints", "Siena"],
  ["South Alabama Jaguars", "South Alabama Jaguars", "South Alabama"],
  ["South Carolina Gamecocks", "South Carolina Gamecocks", "South Carolina"],
  ["South Carolina St Bulldogs", "South Carolina State Bulldogs", "South Carolina St."],
  ["South Dakota Coyotes", "South Dakota Coyotes", "South Dakota"],
  ["South Dakota St Jackrabbits", "South Dakota State Jackrabbits", "South Dakota St."],
  ["South Florida Bulls", "South Florida Bulls", "South Florida"],
  ["SE Missouri St Redhawks", "Southeast Missouri State Redhawks", "Southeast Missouri"],
  ["SE Louisiana Lions", "SE Louisiana Lions", "Southeastern Louisiana"],
  ["Southern Jaguars", "Southern Jaguars", "Southern"],
  ["Southern Illinois Salukis", "Southern Illinois Salukis", "Southern Illinois"],
  ["Southern Indiana Screaming Eagles", "Southern Indiana Screaming Eagles", "Southern Indiana"],
  ["Southern Miss Golden Eagles", "Southern Miss Golden Eagles", "Southern Miss"],
  ["Southern Utah Thunderbirds", "Southern Utah Thunderbirds", "Southern Utah"],
  ["St. Bonaventure Bonnies", "St. Bonaventure Bonnies", "St. Bonaventure"],
  ["St. John's Red Storm", "St. John's Red Storm", "St. John's"],
  ["St. Thomas (MN) Tommies", "St. Thomas-Minnesota Tommies", "St. Thomas"],
  ["Stanford Cardinal", "Stanford Cardinal", "Stanford"],
  ["Stephen F. Austin Lumberjacks", "Stephen F. Austin Lumberjacks", "Stephen F. Austin"],
  ["Stetson Hatters", "Stetson Hatters", "Stetson"],
  ["Stonehill Skyhawks", "Stonehill Skyhawks", "Stonehill"],
  ["Stony Brook Seawolves", "Stony Brook Seawolves", "Stony Brook"],
  ["Syracuse Orange", "Syracuse Orange", "Syracuse"],
  ["TCU Horned Frogs", "TCU Horned Frogs", "TCU"],
  ["Tarleton State Texans", "Tarleton State Texans", "Tarleton St."],
  ["Temple Owls", "Temple Owls", "Temple"],
  ["Tennessee Volunteers", "Tennessee Volunteers", "Tennessee"],
  ["Tenn-Martin Skyhawks", "UT Martin Skyhawks", "Tennessee Martin"],
  ["Tennessee St Tigers", "Tennessee State Tigers", "Tennessee St."],
  ["Tennessee Tech Golden Eagles", "Tennessee Tech Golden Eagles", "Tennessee Tech"],
  ["Texas Longhorns", "Texas Longhorns", "Texas"],
  ["Texas A&M Aggies", "Texas A&M Aggies", "Texas A&M"],
  ["Texas A&M-CC Islanders", "Texas A&M-Corpus Christi Islanders", "Texas A&M Corpus Chris"],
  ["Texas Southern Tigers", "Texas Southern Tigers", "Texas Southern"],
  ["Texas State Bobcats", "Texas State Bobcats", "Texas St."],
  ["Texas Tech Red Raiders", "Texas Tech Red Raiders", "Texas Tech"],
  ["The Citadel Bulldogs", "The Citadel Bulldogs", "The Citadel"],
  ["Toledo Rockets", "Toledo Rockets", "Toledo"],
  ["Towson Tigers", "Towson Tigers", "Towson"],
  ["Troy Trojans", "Troy Trojans", "Troy"],
  ["Tulane Green Wave", "Tulane Green Wave", "Tulane"],
  ["Tulsa Golden Hurricane", "Tulsa Golden Hurricane", "Tulsa"],
  ["UAB Blazers", "UAB Blazers", "UAB"],
  ["UC Davis Aggies", "UC Davis Aggies", "UC Davis"],
  ["UC Irvine Anteaters", "UC Irvine Anteaters", "UC Irvine"],
  ["UC Riverside Highlanders", "UC Riverside Highlanders", "UC Riverside"],
  ["UC San Diego Tritons", "UC San Diego Tritons", "UC San Diego"],
  ["UC Santa Barbara Gauchos", "UC Santa Barbara Gauchos", "UC Santa Barbara"],
  ["UCF Knights", "UCF Knights", "UCF"],
  ["UCLA Bruins", "UCLA Bruins", "UCLA"],
  ["UMBC Retrievers", "UMBC Retrievers", "UMBC"],
  ["UMass Lowell River Hawks", "UMass Lowell River Hawks", "UMass Lowell"],
  ["UNC Asheville Bulldogs", "UNC Asheville Bulldogs", "UNC Asheville"],
  ["UNC Greensboro Spartans", "UNC Greensboro Spartans", "UNC Greensboro"],
  ["UNC Wilmington Seahawks", "UNC Wilmington Seahawks", "UNC Wilmington"],
  ["UNLV Rebels", "UNLV Rebels", "UNLV"],
  ["USC Trojans", "USC Trojans", "USC"],
  ["South Carolina Upstate Spartans", "South Carolina Upstate Spartans", "USC Upstate"],
  ["UT-Arlington Mavericks", "UT Arlington Mavericks", "UT Arlington"],
  ["UT Rio Grande Valley Vaqueros", "UT Rio Grande Valley Vaqueros", "UT Rio Grande Valley"],
  ["UTEP Miners", "UTEP Miners", "UTEP"],
  ["UTSA Roadrunners", "UTSA Roadrunners", "UTSA"],
  ["Utah Utes", "Utah Utes", "Utah"],
  ["Utah State Aggies", "Utah State Aggies", "Utah St."],
  ["Dixie State Trailblazers", "Utah Tech Trailblazers", "Utah Tech"],
  ["Utah Valley Wolverines", "Utah Valley Wolverines", "Utah Valley"],
  ["VCU Rams", "VCU Rams", "VCU"],
  ["VMI Keydets", "VMI Keydets", "VMI"],
  ["Valparaiso Beacons", "Valparaiso Beacons", "Valparaiso"],
  ["Vanderbilt Commodores", "Vanderbilt Commodores", "Vanderbilt"],
  ["Vermont Catamounts", "Vermont Catamounts", "Vermont"],
  ["Villanova Wildcats", "Villanova Wildcats", "Villanova"],
  ["Virginia Cavaliers", "Virginia Cavaliers", "Virginia"],
  ["Virginia Tech Hokies", "Virginia Tech Hokies", "Virginia Tech"],
  ["Wagner Seahawks", "Wagner Seahawks", "Wagner"],
  ["Wake Forest Demon Deacons", "Wake Forest Demon Deacons", "Wake Forest"],
  ["Washington Huskies", "Washington Huskies", "Washington"],
  ["Washington St Cougars", "Washington State Cougars", "Washington St."],
  ["Weber State Wildcats", "Weber State Wildcats", "Weber St."],
  ["West Georgia Wolves", "West Georgia Wolves", "West Georgia"],
  ["West Virginia Mountaineers", "West Virginia Mountaineers", "West Virginia"],
  ["Western Carolina Catamounts", "Western Carolina Catamounts", "Western Carolina"],
  ["Western Illinois Leathernecks", "Western Illinois Leathernecks", "Western Illinois"],
  ["Western Kentucky Hilltoppers", "Western Kentucky Hilltoppers", "Western Kentucky"],
  ["Western Michigan Broncos", "Western Michigan Broncos", "Western Michigan"],
  ["Wichita St Shockers", "Wichita State Shockers", "Wichita St."],
  ["William & Mary Tribe", "William & Mary Tribe", "William & Mary"],
  ["Winthrop Eagles", "Winthrop Eagles", "Winthrop"],
  ["Wisconsin Badgers", "Wisconsin Badgers", "Wisconsin"],
  ["Wofford Terriers", "Wofford Terriers", "Wofford"],
  ["Wright St Raiders", "Wright State Raiders", "Wright St."],
  ["Wyoming Cowboys", "Wyoming Cowboys", "Wyoming"],
  ["Xavier Musketeers", "Xavier Musketeers", "Xavier"],
  ["Yale Bulldogs", "Yale Bulldogs", "Yale"],
  ["Youngstown St Penguins", "Youngstown State Penguins", "Youngstown St."],
];

// Build lookup maps for fast matching
// Map any name format to a canonical ID (index in UNIFIED_MAPPINGS)
const NAME_TO_ID: Map<string, number> = new Map();

UNIFIED_MAPPINGS.forEach((mapping, idx) => {
  const [odds, espn, kenpom] = mapping;
  // Add all variations to the map (lowercase for case-insensitive matching)
  if (odds) NAME_TO_ID.set(odds.toLowerCase(), idx);
  if (espn) NAME_TO_ID.set(espn.toLowerCase(), idx);
  if (kenpom) NAME_TO_ID.set(kenpom.toLowerCase(), idx);
});

// Get canonical team ID from any name format
function getTeamId(name: string): number | null {
  const lower = name.toLowerCase().trim();

  // Direct lookup
  if (NAME_TO_ID.has(lower)) {
    return NAME_TO_ID.get(lower)!;
  }

  // Try partial matches
  let partialMatch: number | null = null;
  NAME_TO_ID.forEach((id, key) => {
    if (partialMatch === null && (key.includes(lower) || lower.includes(key))) {
      partialMatch = id;
    }
  });

  return partialMatch;
}

export function normalizeTeamName(name: string): string {
  const id = getTeamId(name);
  if (id !== null) {
    // Return ESPN name as canonical (most complete form)
    return UNIFIED_MAPPINGS[id][1] || UNIFIED_MAPPINGS[id][0] || name;
  }
  return name;
}

export function getCanonicalName(name: string): string {
  return normalizeTeamName(name);
}

// Get KenPom format name
export function toKenpomName(name: string): string {
  const id = getTeamId(name);
  if (id !== null) {
    return UNIFIED_MAPPINGS[id][2] || name;
  }
  return name;
}

// Get Odds API format name
export function toOddsApiName(name: string): string {
  const id = getTeamId(name);
  if (id !== null) {
    return UNIFIED_MAPPINGS[id][0] || name;
  }
  return name;
}

// Check if two team names refer to the same team
export function teamsMatch(name1: string, name2: string): boolean {
  // First try canonical lookup
  const id1 = getTeamId(name1);
  const id2 = getTeamId(name2);

  if (id1 !== null && id2 !== null) {
    return id1 === id2;
  }

  // Fallback: fuzzy matching for teams not in mapping
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  // Direct match
  if (n1 === n2) return true;

  // Partial match (one contains the other)
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Match on first significant word
  const getFirstWord = (s: string) => s.split(' ')[0];
  const w1 = getFirstWord(n1);
  const w2 = getFirstWord(n2);
  if (w1.length > 3 && w1 === w2) return true;

  return false;
}

// Fuzzy match - finds best match if exact match fails
export function fuzzyMatchTeam(name: string): string | null {
  const normalized = normalizeTeamName(name);
  if (normalized !== name) {
    return normalized;
  }
  return null;
}
