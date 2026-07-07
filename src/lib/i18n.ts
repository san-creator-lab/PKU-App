/**
 * Minimal i18n: Dutch (informal "jij/je") is the primary language and always
 * complete; English covers the core flows and falls back to Dutch for the
 * long tail (badges/challenges are NL-only in V1 — see README Decisions).
 */

export type Lang = 'nl' | 'en'

const nl = {
  // nav
  'nav.home': 'Basis',
  'nav.add': 'Loggen',
  'nav.library': 'Handboek',
  'nav.badges': 'Badges',
  'nav.hq': 'HQ',
  'nav.avatar': 'Held',
  // common
  'common.save': 'Opslaan',
  'common.cancel': 'Annuleren',
  'common.back': 'Terug',
  'common.delete': 'Verwijderen',
  'common.edit': 'Bewerken',
  'common.close': 'Sluiten',
  'common.loading': 'Laden…',
  'common.offline': 'Offline — alles wordt bewaard',
  'common.pending': 'wacht op verbinding',
  // dashboard
  'dash.fuelToday': 'brandstof vandaag',
  'dash.units': 'brandstofpunten',
  'dash.todayMeals': 'Missies van vandaag',
  'dash.noMeals': 'Nog geen missies vandaag. Tijd om op te laden, held!',
  'dash.streak': 'dagen streak',
  'dash.shield': 'schild',
  'dash.addFuel': 'Brandstof loggen',
  // meals
  'meal.breakfast': 'Ochtendmissie',
  'meal.lunch': 'Middagmissie',
  'meal.dinner': 'Avondmissie',
  'meal.snack': 'Power-snack',
  // add food
  'add.title': 'Brandstof loggen',
  'add.scan': 'Scannen',
  'add.search': 'Zoeken',
  'add.manual': 'Zelf invullen',
  'add.foodName': 'Wat heb je gegeten?',
  'add.grams': 'Brandstof (gram eiwit)',
  'add.mealType': 'Welke missie?',
  'add.log': 'Loggen! ⚡',
  'add.servings': 'porties',
  'add.perServing': 'per portie',
  'add.per100': 'per 100 g',
  // library
  'lib.title': 'Heldenhandboek',
  'lib.search': 'Zoek eten…',
  'lib.favorites': 'Mijn powerfoods',
  'lib.recent': 'Laatst gebruikt',
  'lib.all': 'Alles',
  'lib.custom': 'Eigen',
  'lib.addCustom': 'Eigen eten toevoegen',
  // auth
  'auth.email': 'E-mailadres',
  'auth.password': 'Wachtwoord',
  'auth.login': 'Inloggen',
  'auth.signup': 'Account maken',
  'auth.newFamily': 'Nieuw team starten',
  'auth.joinFamily': 'Join met teamcode',
  'auth.familyCode': 'Teamcode (6 cijfers)',
  'auth.yourName': 'Hoe heet je?',
  'auth.iAmHero': 'Ik ben de held (kind)',
  'auth.iAmSidekick': 'Ik ben een sidekick (ouder)',
  // settings
  'settings.title': 'Instellingen',
  'settings.limit': 'Dagelijks brandstof-budget (gram eiwit)',
  'settings.family': 'Team',
  'settings.language': 'Taal',
  'settings.export': 'Exporteer CSV (voor de diëtist)',
  'settings.logout': 'Uitloggen',
  'settings.largeText': 'Grote letters',
  'settings.notifications': 'Meldingen',
  'settings.disclaimer':
    'De eiwitwaarden in het handboek zijn indicatief. Controleer ze met het etiket of je diëtist.',
} as const

export type StringKey = keyof typeof nl

const en: Partial<Record<StringKey, string>> = {
  'nav.home': 'Base',
  'nav.add': 'Log',
  'nav.library': 'Handbook',
  'nav.badges': 'Badges',
  'nav.hq': 'HQ',
  'nav.avatar': 'Hero',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.back': 'Back',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.close': 'Close',
  'common.loading': 'Loading…',
  'common.offline': 'Offline — everything is saved',
  'common.pending': 'waiting for connection',
  'dash.fuelToday': 'fuel today',
  'dash.units': 'fuel units',
  'dash.todayMeals': "Today's missions",
  'dash.noMeals': 'No missions yet today. Time to recharge, hero!',
  'dash.streak': 'day streak',
  'dash.shield': 'shield',
  'dash.addFuel': 'Log fuel',
  'meal.breakfast': 'Morning mission',
  'meal.lunch': 'Midday mission',
  'meal.dinner': 'Evening mission',
  'meal.snack': 'Power snack',
  'add.title': 'Log fuel',
  'add.scan': 'Scan',
  'add.search': 'Search',
  'add.manual': 'Manual',
  'add.foodName': 'What did you eat?',
  'add.grams': 'Fuel (grams of protein)',
  'add.mealType': 'Which mission?',
  'add.log': 'Log it! ⚡',
  'add.servings': 'servings',
  'add.perServing': 'per serving',
  'add.per100': 'per 100 g',
  'lib.title': 'Hero Handbook',
  'lib.search': 'Search food…',
  'lib.favorites': 'My power foods',
  'lib.recent': 'Recently used',
  'lib.all': 'All',
  'lib.custom': 'Custom',
  'lib.addCustom': 'Add custom food',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.login': 'Log in',
  'auth.signup': 'Create account',
  'auth.newFamily': 'Start a new team',
  'auth.joinFamily': 'Join with team code',
  'auth.familyCode': 'Team code (6 digits)',
  'auth.yourName': "What's your name?",
  'auth.iAmHero': "I'm the hero (child)",
  'auth.iAmSidekick': "I'm a sidekick (parent)",
  'settings.title': 'Settings',
  'settings.limit': 'Daily fuel budget (grams of protein)',
  'settings.family': 'Team',
  'settings.language': 'Language',
  'settings.export': 'Export CSV (for the dietitian)',
  'settings.logout': 'Log out',
  'settings.largeText': 'Large text',
  'settings.notifications': 'Notifications',
  'settings.disclaimer':
    'Protein values in the handbook are indicative. Verify against labels or with your dietitian.',
}

let currentLang: Lang = 'nl'

export function setLang(lang: Lang) {
  currentLang = lang
}

export function getLang(): Lang {
  return currentLang
}

export function t(key: StringKey): string {
  if (currentLang === 'en') return en[key] ?? nl[key]
  return nl[key]
}

export const MEAL_LABELS: Record<string, StringKey> = {
  breakfast: 'meal.breakfast',
  lunch: 'meal.lunch',
  dinner: 'meal.dinner',
  snack: 'meal.snack',
}

export const MEAL_EMOJI: Record<string, string> = {
  breakfast: '☀️',
  lunch: '🌤️',
  dinner: '🌙',
  snack: '⚡',
}
