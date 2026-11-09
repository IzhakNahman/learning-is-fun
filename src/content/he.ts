import type {
  ColorEntry,
  FinalLetterEntry,
  LanguagePack,
  LetterEntry,
  NumberNames,
  SpokenPart,
  UiText,
  WordEntry,
} from './types';
import { numberClipId } from './clips';

const FINAL_TO_BASE: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };
const baseLetterOf = (char: string): string => FINAL_TO_BASE[char] ?? char;

const DAGESH = '\u05BC';
/** ב, כ and פ sound different with a dagesh (dot) than without, so each is two letters. */
const BET_WITH_DOT = `ב${DAGESH}`;
const KAF_WITH_DOT = `כ${DAGESH}`;
const PE_WITH_DOT = `פ${DAGESH}`;

/**
 * `name`/`sound` are shown on screen. `nameSpeech`/`soundSpeech` are what the device voice reads
 * when there is no recording: with ניקוד, so a letter name is not read as the word it spells
 * (דלת is "delet" the door, but "dalet" the letter).
 */
function letter(
  key: string,
  id: string,
  name: string,
  nameSpeech: string,
  sound: string,
  soundSpeech = sound,
): LetterEntry {
  return { key, id, tileText: key, boxText: key, name, nameSpeech, soundText: sound, soundSpeech };
}

const letters: LetterEntry[] = [
  letter('א', 'alef', 'אלף', 'אָלֶף', 'אָ'),
  letter(BET_WITH_DOT, 'bet', 'בֵּית', 'בֵּית', 'בָּ'),
  letter('ב', 'vet', 'בֵית', 'וֵית', 'בָ', 'וָ'),
  letter('ג', 'gimel', 'גימל', 'גִּימֶל', 'גָּ'),
  letter('ד', 'dalet', 'דלת', 'דָּלֶת', 'דָּ'),
  letter('ה', 'he', 'הא', 'הֵא', 'הָ'),
  letter('ו', 'vav', 'וו', 'וָו', 'וָ'),
  letter('ז', 'zayin', 'זין', 'זַיִן', 'זָ'),
  letter('ח', 'het', 'חית', 'חֵית', 'חָ'),
  letter('ט', 'tet', 'טית', 'טֵית', 'טָ'),
  letter('י', 'yod', 'יוד', 'יוֹד', 'יָ'),
  letter(KAF_WITH_DOT, 'kaf', 'כַּף', 'כַּף', 'כָּ'),
  letter('כ', 'khaf', 'כַף', 'חַף', 'כָ', 'חָ'),
  letter('ל', 'lamed', 'למד', 'לָמֶד', 'לָ'),
  letter('מ', 'mem', 'מם', 'מֵם', 'מָ'),
  letter('נ', 'nun', 'נון', 'נוּן', 'נָ'),
  letter('ס', 'samekh', 'סמך', 'סָמֶךְ', 'סָ'),
  letter('ע', 'ayin', 'עין', 'עַיִן', 'עָ'),
  letter(PE_WITH_DOT, 'pe', 'פֵּא', 'פֵּא', 'פָּ'),
  // The final ף spells this letter too; it is always "f", so the voice text uses it.
  letter('פ', 'fe', 'פֵא', 'ףֵא', 'פָ', 'ףָ'),
  letter('צ', 'tsadi', 'צדי', 'צָדִי', 'צָ'),
  letter('ק', 'qof', 'קוף', 'קוֹף', 'קָ'),
  letter('ר', 'resh', 'ריש', 'רֵישׁ', 'רָ'),
  letter('ש', 'shin', 'שין', 'שִׁין', 'שָׁ'),
  letter('ת', 'tav', 'תו', 'תָּו', 'תָּ'),
];

const finalLetters: FinalLetterEntry[] = Object.entries(FINAL_TO_BASE).map(([char, baseKey]) => ({
  char,
  baseKey,
}));

/**
 * `plain` is the spelling without niqqud (it decides the letter slots); a dagesh is written only
 * where it tells ב/כ apart. `shown` has the full niqqud.
 */
function word(id: string, plain: string, shown: string, emoji: string): WordEntry {
  const slots: { text: string; key: string }[] = [];
  for (const char of plain) {
    const previous = slots[slots.length - 1];
    if (char === DAGESH && previous) {
      previous.text += DAGESH;
      previous.key += DAGESH;
      continue;
    }
    slots.push({ text: char, key: baseLetterOf(char) });
  }
  const firstSlot = slots[0];
  if (!firstSlot) throw new Error(`Hebrew word "${id}" is empty`);
  // Spoken with niqqud (the same text as `shown`) so the device voice does not guess the vowels.
  return { id, startKey: firstSlot.key, shown, speech: shown, emoji, slots };
}

const words: WordEntry[] = [
  word('aryeh', 'אריה', 'אַרְיֵה', '🦁'),
  word('bayit', `ב${DAGESH}ית`, 'בַּיִת', '🏠'),
  word('gamal', 'גמל', 'גָּמָל', '🐪'),
  word('dag', 'דג', 'דָּג', '🐟'),
  word('har', 'הר', 'הַר', '🏔️'),
  word('vered', 'ורד', 'וֶרֶד', '🌹'),
  word('zebra', 'זברה', 'זֶבְרָה', '🦓'),
  word('hatul', 'חתול', 'חָתוּל', '🐱'),
  word('tale', 'טלה', 'טָלֶה', '🐑'),
  word('yad', 'יד', 'יָד', '✋'),
  word('kelev', `כ${DAGESH}לב`, 'כֶּלֶב', '🐶'),
  word('lev', 'לב', 'לֵב', '❤️'),
  word('mayim', 'מים', 'מַיִם', '💧'),
  word('nahash', 'נחש', 'נָחָשׁ', '🐍'),
  word('sus', 'סוס', 'סוּס', '🐴'),
  word('ayin', 'עין', 'עַיִן', '👁️'),
  word('pil', `פ${DAGESH}יל`, 'פִּיל', '🐘'),
  word('tsav', 'צב', 'צָב', '🐢'),
  word('kof', 'קוף', 'קוֹף', '🐵'),
  word('rakevet', `רכ${DAGESH}בת`, 'רַכֶּבֶת', '🚂'),
  word('shemesh', 'שמש', 'שֶׁמֶשׁ', '☀️'),
  word('tapuah', `תפ${DAGESH}וח`, 'תַּפּוּחַ', '🍎'),
];

const colors: ColorEntry[] = [
  {
    id: 'red',
    hex: '#e53935',
    name: 'אדום',
    nameSpeech: 'אָדֹם',
    example: { emoji: '🍎', phrase: 'תפוח אדום', speech: 'תַּפּוּחַ אָדֹם' },
  },
  {
    id: 'orange',
    hex: '#fb8c00',
    name: 'כתום',
    nameSpeech: 'כָּתֹם',
    example: { emoji: '🥕', phrase: 'גזר כתום', speech: 'גֶּזֶר כָּתֹם' },
  },
  {
    id: 'yellow',
    hex: '#fdd835',
    name: 'צהוב',
    nameSpeech: 'צָהֹב',
    example: { emoji: '🐥', phrase: 'אפרוח צהוב', speech: 'אֶפְרוֹחַ צָהֹב' },
  },
  {
    id: 'green',
    hex: '#43a047',
    name: 'ירוק',
    nameSpeech: 'יָרֹק',
    example: { emoji: '🥒', phrase: 'מלפפון ירוק', speech: 'מְלָפְפוֹן יָרֹק' },
  },
  {
    id: 'blue',
    hex: '#1e88e5',
    name: 'כחול',
    nameSpeech: 'כָּחֹל',
    example: { emoji: '🌊', phrase: 'ים כחול', speech: 'יָם כָּחֹל' },
  },
  {
    id: 'purple',
    hex: '#8e24aa',
    name: 'סגול',
    nameSpeech: 'סָגֹל',
    example: { emoji: '🍇', phrase: 'ענב סגול', speech: 'עֵנָב סָגֹל' },
  },
  {
    id: 'pink',
    hex: '#f48fb1',
    name: 'ורוד',
    nameSpeech: 'וָרֹד',
    example: { emoji: '🌸', phrase: 'פרח ורוד', speech: 'פֶּרַח וָרֹד' },
  },
  {
    id: 'brown',
    hex: '#795548',
    name: 'חום',
    nameSpeech: 'חוּם',
    example: { emoji: '🐻', phrase: 'דוב חום', speech: 'דֹּב חוּם' },
  },
  {
    id: 'white',
    hex: '#ffffff',
    name: 'לבן',
    nameSpeech: 'לָבָן',
    example: { emoji: '☁️', phrase: 'ענן לבן', speech: 'עָנָן לָבָן' },
  },
  {
    id: 'black',
    hex: '#212121',
    name: 'שחור',
    nameSpeech: 'שָׁחֹר',
    example: { emoji: '🐈\u200d⬛', phrase: 'חתול שחור', speech: 'חָתוּל שָׁחֹר' },
  },
  {
    id: 'turquoise',
    hex: '#1ec8c8',
    name: 'טורקיז',
    nameSpeech: 'טוּרְקִיז',
    example: { emoji: '🐬', phrase: 'דולפין טורקיז', speech: 'דּוֹלְפִין טוּרְקִיז' },
  },
  {
    id: 'gray',
    hex: '#9e9e9e',
    name: 'אפור',
    nameSpeech: 'אָפֹר',
    example: { emoji: '🐘', phrase: 'פיל אפור', speech: 'פִּיל אָפֹר' },
  },
];

/** Counting form (feminine): אחת, שתיים, שלוש… */
const numbers: NumberNames = {
  /** With niqqud so the device voice says שְׁמוֹנֶה (shmone), not shmona. */
  spoken: [
    '',
    'אַחַת',
    'שְׁתַּאִים',
    'שָׁלוֹשׁ',
    'אַרְבַּע',
    'חָמֵשׁ',
    'שֵׁשׁ',
    'שֶׁבַע',
    'שְׁמוֹנֶה',
    'תֵּשַׁע',
    'עֶשֶׂר',
    'אַחַת עֶשְׂרֵה',
    'שְׁתֵּים עֶשְׂרֵה',
    'שְׁלוֹשׁ עֶשְׂרֵה',
    'אַרְבַּע עֶשְׂרֵה',
    'חֲמֵשׁ עֶשְׂרֵה',
    'שֵׁשׁ עֶשְׂרֵה',
    'שְׁבַע עֶשְׂרֵה',
    'שְׁמוֹנֶה עֶשְׂרֵה',
    'תְּשַׁע עֶשְׂרֵה',
    'עֶשְׂרִים',
    'עֶשְׂרִים וְאַחַת',
    'עֶשְׂרִים וּשְׁתַּיִם',
  ],
  shown: [
    '',
    'אַחַת',
    'שְׁתַּיִם',
    'שָׁלוֹשׁ',
    'אַרְבַּע',
    'חָמֵשׁ',
    'שֵׁשׁ',
    'שֶׁבַע',
    'שְׁמוֹנֶה',
    'תֵּשַׁע',
    'עֶשֶׂר',
    'אַחַת עֶשְׂרֵה',
    'שְׁתֵּים עֶשְׂרֵה',
    'שְׁלוֹשׁ עֶשְׂרֵה',
    'אַרְבַּע עֶשְׂרֵה',
    'חֲמֵשׁ עֶשְׂרֵה',
    'שֵׁשׁ עֶשְׂרֵה',
    'שְׁבַע עֶשְׂרֵה',
    'שְׁמוֹנֶה עֶשְׂרֵה',
    'תְּשַׁע עֶשְׂרֵה',
    'עֶשְׂרִים',
    'עֶשְׂרִים וְאַחַת',
    'עֶשְׂרִים וּשְׁתַּיִם',
  ],
};

const ui: UiText = {
  appName: 'לומדים בכיף',
  chooseGame: 'בחרו משחק',
  aboutButton: 'אודות',
  credit: 'נוצר ע"י יצחק נחמן · כל הזכויות שמורות ©',
  gameNames: {
    numbers: 'הכרת המספרים',
    letters: 'הכרת האותיות',
    trace: 'כתיבת אותיות',
    colors: 'הכרת הצבעים',
    words: 'אוצר מילים',
    sky: 'משחק המילים',
  },
  gameNameSpeech: {
    numbers: 'הֶכֵּרַת הַמִּסְפָּרִים',
    letters: 'הֶכֵּרַת הָאוֹתִיּוֹת',
    trace: 'כְּתִיבַת אוֹתִיּוֹת',
    colors: 'הֶכֵּרַת הַצְּבָעִים',
    words: 'אוֹצַר מִלִּים',
    sky: 'מִשְׂחַק הַמִּלִּים',
  },
  numbers: { placeholder: 'לחצו על מספר', placeholderSpeech: 'לִחְצוּ עַל מִסְפָּר' },
  colors: { placeholder: 'לחצו על צבע', placeholderSpeech: 'לִחְצוּ עַל צֶבַע' },
  letters: {
    placeholder: 'לחצו על אות',
    placeholderSpeech: 'לִחְצוּ עַל אוֹת',
    finalSuffix: 'סופית',
    finalSuffixSpeech: 'סוֹפִית',
  },
  trace: {
    placeholder: 'בחרו אות לכתיבה',
    placeholderSpeech: 'בִּחְרוּ אוֹת לִכְתִיבָה',
    groupLabel: 'קבוצה',
    baseLegend: 'צורת הבסיס',
    additionLegend: 'התוספת',
    restart: 'מההתחלה',
    next: 'האות הבאה',
  },
  words: {
    stepLetterName: 'שם האות',
    stepLetter: 'האות',
    stepSound: 'הצליל',
    stepWord: 'המילה',
  },
  sky: {
    quit: '✖ סיום',
    endTitle: '🎉 כל הכבוד! 🎉',
    countHint: '👆 לחצו על כל מילה כדי לספור',
    again: '↻ עוד פעם',
    rotatePhone: 'סובבו את הטלפון לרוחב',
    confirm: '✔ OK',
    wellDone: 'כל הכבוד!',
    wellDoneSpeech: 'כָּל הַכָּבוֹד!',
  },
  voice: {
    found: '🔊 נמצא קול בעברית במכשיר',
    missing: '⚠️ לא נמצא קול בעברית במכשיר הזה – בגרסה האמיתית נקליט קבצי שמע.',
  },
  about: {
    title: 'אודות "לומדים בכיף"',
    intro:
      '"לומדים בכיף" הוא אוסף משחקים קצרים, בלי הרשמה ובלי שמירת מידע, שנועד לילדי גן. המשחקים מלמדים אותיות, צלילים, מספרים וספירה, ומתרגלים שליטה בשתי הידיים כמו במשחקי מחשב אמיתיים. אפשר לעבור בין עברית לאנגלית בכפתור השפה במסך הראשי.',
    sections: [
      {
        icon: '🔢',
        game: 'numbers',
        body: 'הילד מכיר את המספרים 1–20: איך הם נראים, איך הם נשמעים ואיך כותבים אותם במילים. הכדורים הצבעוניים, בשורות של חמישה, מראים את הכמות עצמה, והספירה בקול מחברת בין הסימן, השם והכמות.',
      },
      {
        icon: '🔤',
        game: 'letters',
        body: 'שמות האותיות והצליל של כל אות (העיצור). בעברית כולל האותיות הסופיות, ובשלוש האותיות ב, כ ופ יש שני צלילים (עם נקודה ובלי) ולכן הן מופיעות פעמיים. הילד שומע ורואה את האות שוב ושוב בקצב שלו.',
      },
      {
        icon: '✏️',
        game: 'trace',
        body: 'הילד כותב את האות בעצמו: הוא גורר עיגול לאורך הקו, מלמעלה למטה או משמאל לימין. האותיות מחולקות לקבוצות, ולכל קבוצה צורת בסיס אחת שמתרגלים קודם ואחר כך מוסיפים לה תוספות כדי ליצור את האותיות. צורת הבסיס צבועה בצבע הקבוצה, והתוספת בצבע אחר. בסוף כל אות שומעים את שמה ואת הצליל שלה.',
      },
      {
        icon: '🎨',
        game: 'colors',
        body: 'הילד לוחץ על צבע, רואה אותו בגדול, שומע את שמו ומקבל דוגמה לחפץ בצבע הזה (למשל אדום – תפוח). כך לומדים את עשרת הצבעים הבסיסיים בקצב של הילד.',
      },
      {
        icon: '🖼️',
        game: 'words',
        body: 'מילה אחת לכל אות, עם תמונה (ובעברית גם ניקוד). כל לחיצה מנגנת רצף קבוע: שם האות ← האות ← הצליל ← המילה. כך הילד לומד לקשר בין הצליל הפותח של מילה לבין האות שלה, והוא הבסיס לקריאה.',
      },
      {
        icon: '🎁',
        game: 'sky',
        body: "משחק תרגול בעולם תלת־ממדי בשמיים. ביד שמאל הילד מזיז את הדמות (ג'ויסטיק במסך, או W A S D במקלדת), וביד ימין הוא מכה בקופסה (כפתור במסך, או K). עליו לחפש את הקופסה עם האות הנכונה כדי להשלים מילה. כל קופסה נשברת אחרי 3 אגרופים ושלוש נקודות על הקופסה מראות כמה אגרופים נשארו. אחרי כל אות המשחק עוצר ואומר את שם האות והצליל שלה, ובסוף כל מילה מציג תמונה ואומר את המילה. הזמן עוצר בזמן ההקשבה, וטעות לא מענישה: גם אות לא נכונה נשברת ומקבלת הסבר. בסיום הילד סופר את המילים שהשיג.",
      },
    ],
    skills:
      'המשחק מתרגל: זיהוי אותיות וצלילים, קשב וריכוז, ספירה, קואורדינציה בין שתי הידיים, ובחירה מהירה בין כמה אפשרויות.',
    tipsTitle: '💡 טיפים להורים',
    tips: [
      'מומלץ לשחק יחד עם הילד, להפעיל קול, ובטלפון להחזיק לרוחב.',
      'מומלץ להתחיל בשלושת המשחקים הראשונים (הכרת המספרים, הכרת האותיות ואוצר מילים) ורק אחר כך לעבור למשחק המילים.',
    ],
    voiceNote:
      'הקריינות כרגע בקול של המכשיר. בגרסה הבאה נקליט קריינות אמיתית כדי שהצלילים יישמעו מדויקים.',
    close: '✖ סגירה',
  },
};

/** First letter plus its vowel marks / dagesh, then the rest of the word. */
function splitFirstLetter(shown: string): [string, string] {
  const match = shown.match(/^([א-ת][֑-ׇ]*)(.*)$/u);
  if (!match) return [shown.slice(0, 1), shown.slice(1)];
  return [match[1] ?? '', match[2] ?? ''];
}

function gameOverText(wordCount: number): string {
  const amount = wordCount === 1 ? 'מילה אחת' : `${wordCount} מילים`;
  return `המשחק הסתיים · השגת ${amount}`;
}

function gameOverParts(wordCount: number): SpokenPart[] {
  const intro: SpokenPart = {
    clipId: 'phrase-game-over',
    speech: 'הַמִּשְׂחָק הִסְתַּיֵּם, הִשַּׂגְתָּ',
  };
  if (wordCount === 0) return [intro, { clipId: 'phrase-0-words', speech: 'אֶפֶס מִלִּים' }];
  if (wordCount === 1) return [intro, { clipId: 'phrase-1-word', speech: 'מִלָּה אַחַת' }];
  if (wordCount === 2) return [intro, { clipId: 'phrase-2-words', speech: 'שְׁתֵּי מִלִּים' }];
  return [
    intro,
    { clipId: numberClipId(wordCount), speech: numbers.spoken[wordCount] ?? String(wordCount) },
    { clipId: 'phrase-words', speech: 'מִלִּים' },
  ];
}

export const hebrewPack: LanguagePack = {
  code: 'he',
  nativeName: 'עברית',
  dir: 'rtl',
  speechLang: 'he-IL',
  ui,
  letters,
  finalLetters,
  words,
  colors,
  numbers,
  maxCount: 22,
  splitFirstLetter,
  gameOverText,
  gameOverParts,
};
