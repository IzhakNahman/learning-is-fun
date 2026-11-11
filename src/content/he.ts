import type {
  ColorEntry,
  FinalLetterEntry,
  GameId,
  LanguagePack,
  LetterEntry,
  NiqqudEntry,
  NumberNames,
  LookalikeEntry,
  ShapeEntry,
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
  const strip = (text: string): string => text.replace(/[\u0591-\u05C7]/gu, '');
  // The name is shown with niqqud too, unless the voice text spells it differently (וֵית, חַף, ףֵא).
  const shownName = strip(name) === strip(nameSpeech) ? nameSpeech : name;
  return {
    key,
    id,
    tileText: key,
    boxText: key,
    name: shownName,
    nameSpeech,
    soundText: sound,
    soundSpeech,
  };
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
    name: 'אָדֹם',
    nameSpeech: 'אָדֹם',
    example: { emoji: '🍎', phrase: 'תַּפּוּחַ אָדֹם', speech: 'תַּפּוּחַ אָדֹם' },
  },
  {
    id: 'orange',
    hex: '#fb8c00',
    name: 'כָּתֹם',
    nameSpeech: 'כָּתֹם',
    example: { emoji: '🥕', phrase: 'גֶּזֶר כָּתֹם', speech: 'גֶּזֶר כָּתֹם' },
  },
  {
    id: 'yellow',
    hex: '#fdd835',
    name: 'צָהֹב',
    nameSpeech: 'צָהֹב',
    example: { emoji: '🐥', phrase: 'אֶפְרוֹחַ צָהֹב', speech: 'אֶפְרוֹחַ צָהֹב' },
  },
  {
    id: 'green',
    hex: '#43a047',
    name: 'יָרֹק',
    nameSpeech: 'יָרֹק',
    example: { emoji: '🥒', phrase: 'מְלָפְפוֹן יָרֹק', speech: 'מְלָפְפוֹן יָרֹק' },
  },
  {
    id: 'blue',
    hex: '#1e88e5',
    name: 'כָּחֹל',
    nameSpeech: 'כָּחֹל',
    example: { emoji: '🌊', phrase: 'יָם כָּחֹל', speech: 'יָם כָּחֹל' },
  },
  {
    id: 'purple',
    hex: '#8e24aa',
    name: 'סָגֹל',
    nameSpeech: 'סָגֹל',
    example: { emoji: '🍇', phrase: 'עֵנָב סָגֹל', speech: 'עֵנָב סָגֹל' },
  },
  {
    id: 'pink',
    hex: '#f48fb1',
    name: 'וָרֹד',
    nameSpeech: 'וָרֹד',
    example: { emoji: '🌸', phrase: 'פֶּרַח וָרֹד', speech: 'פֶּרַח וָרֹד' },
  },
  {
    id: 'brown',
    hex: '#795548',
    name: 'חוּם',
    nameSpeech: 'חוּם',
    example: { emoji: '🐻', phrase: 'דֹּב חוּם', speech: 'דֹּב חוּם' },
  },
  {
    id: 'white',
    hex: '#ffffff',
    name: 'לָבָן',
    nameSpeech: 'לָבָן',
    example: { emoji: '☁️', phrase: 'עָנָן לָבָן', speech: 'עָנָן לָבָן' },
  },
  {
    id: 'black',
    hex: '#212121',
    name: 'שָׁחֹר',
    nameSpeech: 'שָׁחֹר',
    example: { emoji: '🐈\u200d⬛', phrase: 'חָתוּל שָׁחֹר', speech: 'חָתוּל שָׁחֹר' },
  },
  {
    id: 'turquoise',
    hex: '#1ec8c8',
    name: 'טוּרְקִיז',
    nameSpeech: 'טוּרְקִיז',
    example: { emoji: '🐬', phrase: 'דּוֹלְפִין טוּרְקִיז', speech: 'דּוֹלְפִין טוּרְקִיז' },
  },
  {
    id: 'gray',
    hex: '#9e9e9e',
    name: 'אָפֹר',
    nameSpeech: 'אָפֹר',
    example: { emoji: '🐘', phrase: 'פִּיל אָפֹר', speech: 'פִּיל אָפֹר' },
  },
];

const shapes: ShapeEntry[] = [
  shape('circle', 'עִגּוּל'),
  shape('square', 'רִבּוּעַ'),
  shape('rectangle', 'מַלְבֵּן'),
  shape('triangle', 'מְשֻׁלָּשׁ'),
  shape('rhombus', 'מְעֻיָּן'),
  shape('oval', 'אֶלִּיפְּסָה'),
  shape('star', 'כּוֹכָב'),
  shape('heart', 'לֵב'),
];

function shape(id: string, name: string): ShapeEntry {
  return { id, name, nameSpeech: name };
}

/** The vowel marks, each shown on the letter מ and sounded like the same vowel after א. */
function niqqud(id: string, sample: string, name: string, soundText: string): NiqqudEntry {
  return { id, sample, name, nameSpeech: name, soundText, soundSpeech: soundText };
}

const niqqudMarks: NiqqudEntry[] = [
  niqqud('kamatz', 'מָ', 'קָמָץ', 'אָ'),
  niqqud('patach', 'מַ', 'פַּתַח', 'אַ'),
  niqqud('tzere', 'מֵ', 'צֵרֵי', 'אֵ'),
  niqqud('segol', 'מֶ', 'סֶגּוֹל', 'אֶ'),
  niqqud('hiriq', 'מִ', 'חִירִיק', 'אִ'),
  niqqud('holam', 'מֹ', 'חוֹלָם', 'אוֹ'),
  niqqud('shuruk', 'מוּ', 'שׁוּרוּק', 'אוּ'),
  niqqud('kubutz', 'מֻ', 'קֻבּוּץ', 'אֻ'),
  niqqud('shva', 'מְ', 'שְׁוָא', 'אֶ'),
];

function lookalike(id: string, emoji: string, shapeId: string, name: string): LookalikeEntry {
  return { id, emoji, shapeId, name, nameSpeech: name };
}

const lookalikes: LookalikeEntry[] = [
  lookalike('ball', '⚽', 'circle', 'כַּדּוּר'),
  lookalike('cookie', '🍪', 'circle', 'עוּגִיָּה'),
  lookalike('moon', '🌕', 'circle', 'יָרֵחַ'),
  lookalike('window', '🪟', 'square', 'חַלּוֹן'),
  lookalike('waffle', '🧇', 'square', 'וָפֶל'),
  lookalike('door', '🚪', 'rectangle', 'דֶּלֶת'),
  lookalike('phone', '📱', 'rectangle', 'טֵלֵפוֹן'),
  lookalike('chocolate', '🍫', 'rectangle', 'שׁוֹקוֹלָד'),
  lookalike('pizza', '🍕', 'triangle', 'פִּיצָה'),
  lookalike('tent', '⛺', 'triangle', 'אֹהֶל'),
  lookalike('cheese', '🧀', 'triangle', 'גְּבִינָה'),
  lookalike('kite', '🪁', 'rhombus', 'עֲפִיפוֹן'),
  lookalike('gem', '💎', 'rhombus', 'יַהֲלוֹם'),
  lookalike('egg', '🥚', 'oval', 'בֵּיצָה'),
  lookalike('avocado', '🥑', 'oval', 'אָבוֹקָדוֹ'),
  lookalike('rugby', '🏉', 'oval', 'כַּדּוּר רַגְבִּי'),
];

const AVAILABLE_GAMES: readonly GameId[] = [
  'numbers',
  'colors',
  'shapes',
  'lookalike',
  'letters',
  'count',
  'trace',
  'mix',
  'words',
  'starts',
  'add',
  'sky',
  'niqqud',
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

const GAME_NAMES: Record<GameId, string> = {
  numbers: 'הַכָּרַת הַמִּסְפָּרִים',
  colors: 'הַכָּרַת הַצְּבָעִים',
  shapes: 'הַכָּרַת הַצּוּרוֹת',
  lookalike: 'מוֹצְאִים צוּרָה',
  letters: 'הַכָּרַת הָאוֹתִיּוֹת',
  count: 'כַּמָּה יֵשׁ?',
  trace: 'כְּתִיבַת אוֹתִיּוֹת',
  mix: 'עוֹרְבִים צְבָעִים',
  words: 'אוֹצַר מִלִּים',
  starts: 'אוֹת הַתְּחָלָה',
  add: 'מְחַבְּרִים',
  sky: 'מִשְׂחַק הַמִּלִּים',
  niqqud: 'הַכָּרַת הַנִּקּוּד',
};

const ui: UiText = {
  appName: 'לוֹמְדִים בְּכֵיף',
  aboutButton: 'אוֹדוֹת',
  guide: { label: 'בּוֹאוּ נְשַׂחֵק!', speech: 'בּוֹאוּ נְשַׂחֵק!' },
  credit: 'נוֹצַר עַל־יְדֵי יִצְחָק נַחְמָן · כָּל הַזְּכֻיּוֹת שְׁמוּרוֹת ©',
  nextGame: 'לַמִּשְׂחָק הַבָּא',
  gameNames: GAME_NAMES,
  gameNameSpeech: GAME_NAMES,
  numbers: { placeholder: 'לִחְצוּ עַל מִסְפָּר', placeholderSpeech: 'לִחְצוּ עַל מִסְפָּר' },
  colors: { placeholder: 'לִחְצוּ עַל צֶבַע', placeholderSpeech: 'לִחְצוּ עַל צֶבַע' },
  shapes: { placeholder: 'לִחְצוּ עַל צוּרָה', placeholderSpeech: 'לִחְצוּ עַל צוּרָה' },
  lookalike: {
    placeholder: 'גִּרְרוּ אֶת הַתְּמוּנָה לַצּוּרָה שֶׁדּוֹמָה לָהּ',
    placeholderSpeech: 'גִּרְרוּ אֶת הַתְּמוּנָה לַצּוּרָה שֶׁדּוֹמָה לָהּ',
  },
  count: {
    placeholder: 'גִּרְרוּ אֶת הַמִּסְפָּר הַנָּכוֹן',
    placeholderSpeech: 'גִּרְרוּ אֶת הַמִּסְפָּר הַנָּכוֹן',
  },
  mix: {
    placeholder: 'גִּרְרוּ אֶת הַצֶּבַע שֶׁיּוֹצֵא',
    placeholderSpeech: 'גִּרְרוּ אֶת הַצֶּבַע שֶׁיּוֹצֵא',
  },
  starts: {
    placeholder: 'גִּרְרוּ אֶת הַתְּמוּנָה לָאוֹת שֶׁבָּהּ הִיא מַתְחִילָה',
    placeholderSpeech: 'גִּרְרוּ אֶת הַתְּמוּנָה לָאוֹת שֶׁבָּהּ הִיא מַתְחִילָה',
  },
  add: {
    placeholder: 'גִּרְרוּ אֶת הַתּוֹצָאָה לַתַּרְגִּיל',
    placeholderSpeech: 'גִּרְרוּ אֶת הַתּוֹצָאָה לַתַּרְגִּיל',
  },
  niqqud: { placeholder: 'לִחְצוּ עַל נִקּוּד', placeholderSpeech: 'לִחְצוּ עַל נִקּוּד' },
  phrases: { plus: 'וְעוֹד', equals: 'שָׁוֶה', makes: 'יוֹצֵא' },
  letters: {
    placeholder: 'לִחְצוּ עַל אוֹת',
    placeholderSpeech: 'לִחְצוּ עַל אוֹת',
    finalSuffix: 'סוֹפִית',
    finalSuffixSpeech: 'סוֹפִית',
  },
  trace: {
    placeholder: 'בִּחְרוּ אוֹת לִכְתִיבָה',
    placeholderSpeech: 'בִּחְרוּ אוֹת לִכְתִיבָה',
    groupLabel: 'קְבוּצָה',
    baseLegend: 'צוּרַת הַבָּסִיס',
    additionLegend: 'הַתּוֹסֶפֶת',
    next: 'הָאוֹת הַבָּאָה',
  },
  words: {
    stepLetterName: 'שֵׁם הָאוֹת',
    stepLetter: 'הָאוֹת',
    stepSound: 'הַצְּלִיל',
    stepWord: 'הַמִּלָּה',
  },
  sky: {
    quit: '✖ סִיּוּם',
    endTitle: '🎉 כָּל הַכָּבוֹד! 🎉',
    countHint: '👆 לִחְצוּ עַל כָּל מִלָּה כְּדֵי לִסְפֹּר',
    again: '↻ עוֹד פַּעַם',
    rotatePhone: 'סוֹבְבוּ אֶת הַטֶּלֶפוֹן לְרֹחַב',
    confirm: '✔ OK',
    wellDone: 'כָּל הַכָּבוֹד!',
    wellDoneSpeech: 'כָּל הַכָּבוֹד!',
  },
  voice: {
    found: '🔊 נִמְצָא קוֹל בְּעִבְרִית בַּמַּכְשִׁיר',
    missing:
      '⚠️ לֹא נִמְצָא קוֹל בְּעִבְרִית בַּמַּכְשִׁיר הַזֶּה – בַּגִּרְסָה הָאֲמִתִּית נַקְלִיט קִבְצֵי שֶׁמַע.',
  },
  about: {
    title: 'אוֹדוֹת "לוֹמְדִים בְּכֵיף"',
    intro:
      '"לוֹמְדִים בְּכֵיף" הוּא אוֹסֵף מִשְׂחָקִים קְצָרִים, בְּלִי הַרְשָׁמָה וּבְלִי שְׁמִירַת מֵידָע, שֶׁנּוֹעַד לִילְדֵי גַּן. הַמִּשְׂחָקִים מְלַמְּדִים אוֹתִיּוֹת, צְלִילִים, מִסְפָּרִים וּסְפִירָה, וּמְתַרְגְּלִים שְׁלִיטָה בִּשְׁתֵּי הַיָּדַיִם כְּמוֹ בְּמִשְׂחֲקֵי מַחְשֵׁב אֲמִתִּיִּים. אֶפְשָׁר לַעֲבֹר בֵּין עִבְרִית לְאַנְגְּלִית בְּכַפְתּוֹר הַשָּׂפָה בַּמָּסָךְ הָרָאשִׁי.',
    sections: [
      {
        icon: '🔢',
        game: 'numbers',
        body: 'הַיֶּלֶד מַכִּיר אֶת הַמִּסְפָּרִים 1–20: אֵיךְ הֵם נִרְאִים, אֵיךְ הֵם נִשְׁמָעִים וְאֵיךְ כּוֹתְבִים אוֹתָם בְּמִלִּים. הַכַּדּוּרִים הַצִּבְעוֹנִיִּים, בִּשׁוּרוֹת שֶׁל חֲמִשָּׁה, מַרְאִים אֶת הַכַּמּוּת עַצְמָהּ, וְהַסְּפִירָה בְּקוֹל מְחַבֶּרֶת בֵּין הַסִּימָן, הַשֵּׁם וְהַכַּמּוּת.',
      },
      {
        icon: '🔤',
        game: 'letters',
        body: 'שְׁמוֹת הָאוֹתִיּוֹת וְהַצְּלִיל שֶׁל כָּל אוֹת (הָעִצּוּר). בְּעִבְרִית כּוֹלֵל הָאוֹתִיּוֹת הַסּוֹפִיּוֹת, וּבִשְׁלוֹשׁ הָאוֹתִיּוֹת ב, כ וּפ יֵשׁ שְׁנֵי צְלִילִים (עִם נְקֻדָּה וּבְלִי) וְלָכֵן הֵן מוֹפִיעוֹת פַּעֲמַיִם. הַיֶּלֶד שׁוֹמֵעַ וְרוֹאֶה אֶת הָאוֹת שׁוּב וָשׁוּב בַּקֶּצֶב שֶׁלּוֹ.',
      },
      {
        icon: '🧺',
        game: 'count',
        body: 'בַּמָּסָךְ מוֹפִיעָה קְבוּצָה שֶׁל חֲפָצִים, וְהַיֶּלֶד סוֹפֵר אוֹתָם (לְחִיצָה עַל חֵפֶץ סוֹפֶרֶת בְּקוֹל) וְגוֹרֵר אֶת הַמִּסְפָּר הַנָּכוֹן אֶל הַקְּבוּצָה. מַתְחִילִים בְּמִסְפָּרִים קְטַנִּים עַד 5, וְאַחַר כָּךְ עַד 10. טָעוּת פָּשׁוּט מַחְזִירָה אֶת הַמִּסְפָּר, וְאַחֲרֵי שְׁתֵּי טָעֻיּוֹת הַמִּסְפָּר הַנָּכוֹן נִדְלָק.',
      },
      {
        icon: '✏️',
        game: 'trace',
        body: 'הַיֶּלֶד כּוֹתֵב אֶת הָאוֹת בְּעַצְמוֹ: הוּא גּוֹרֵר עִגּוּל לְאֹרֶךְ הַקַּו, מִלְמַעְלָה לְמַטָּה אוֹ מִשְּׂמֹאל לְיָמִין. הָאוֹתִיּוֹת מְחֻלָּקוֹת לִקְבוּצוֹת, וּלְכָל קְבוּצָה צוּרַת בָּסִיס אַחַת שֶׁמִּתְרַגְּלִים קֹדֶם וְאַחַר כָּךְ מוֹסִיפִים לָהּ תּוֹסָפוֹת כְּדֵי לִיצֹר אֶת הָאוֹתִיּוֹת. צוּרַת הַבָּסִיס צְבוּעָה בְּצֶבַע הַקְּבוּצָה, וְהַתּוֹסֶפֶת בְּצֶבַע אַחֵר. בְּסוֹף כָּל אוֹת שׁוֹמְעִים אֶת שְׁמָהּ וְאֶת הַצְּלִיל שֶׁלָּהּ.',
      },
      {
        icon: '🌈',
        game: 'mix',
        body: 'שְׁנֵי צְבָעִים מוֹפִיעִים בְּצַד אֶחָד שֶׁל הַלּוּחַ, וְהַיֶּלֶד גּוֹרֵר אֶת הַצֶּבַע שֶׁיּוֹצֵא כְּשֶׁעוֹרְבִים אוֹתָם (לְמָשָׁל אָדֹם וְעוֹד צָהֹב – יוֹצֵא כָּתֹם).',
      },
      {
        icon: '🎨',
        game: 'colors',
        body: 'הַיֶּלֶד לוֹחֵץ עַל צֶבַע, רוֹאֶה אוֹתוֹ בְּגָדוֹל, שׁוֹמֵעַ אֶת שְׁמוֹ וּמְקַבֵּל דֻּגְמָה לְחֵפֶץ בַּצֶּבַע הַזֶּה (לְמָשָׁל אָדֹם – תַּפּוּחַ). כָּךְ לוֹמְדִים אֶת עֲשֶׂרֶת הַצְּבָעִים הַבְּסִיסִיִּים בַּקֶּצֶב שֶׁל הַיֶּלֶד.',
      },
      {
        icon: '🔷',
        game: 'shapes',
        body: 'הַיֶּלֶד לוֹחֵץ עַל צוּרָה, רוֹאֶה אוֹתָהּ בְּגָדוֹל, וְשׁוֹמֵעַ אֶת שְׁמָהּ.',
      },
      {
        icon: '🍕',
        game: 'lookalike',
        body: 'מוֹפִיעָה תְּמוּנָה (לְמָשָׁל פִּיצָה) וְהַיֶּלֶד גּוֹרֵר אוֹתָהּ לַצּוּרָה שֶׁהִיא דּוֹמָה לָהּ (מְשֻׁלָּשׁ). בַּהַתְחָלָה יֵשׁ שְׁתֵּי צוּרוֹת לִבְחִירָה, אַחַר כָּךְ שָׁלוֹשׁ, וְגַם צוּרוֹת דּוֹמוֹת כְּמוֹ רִבּוּעַ וּמַלְבֵּן. לְחִיצָה עַל הַתְּמוּנָה אוֹמֶרֶת אֶת שְׁמָהּ, וְאַחֲרֵי תְּשׁוּבָה נְכוֹנָה שׁוֹמְעִים אֶת הַתְּמוּנָה וְאֶת הַצּוּרָה.',
      },
      {
        icon: '🖼️',
        game: 'words',
        body: 'מִלָּה אַחַת לְכָל אוֹת, עִם תְּמוּנָה (וּבְעִבְרִית גַּם נִקּוּד). כָּל לְחִיצָה מְנַגֶּנֶת רֶצֶף קָבוּעַ: שֵׁם הָאוֹת ← הָאוֹת ← הַצְּלִיל ← הַמִּלָּה. כָּךְ הַיֶּלֶד לוֹמֵד לְקַשֵּׁר בֵּין הַצְּלִיל הַפּוֹתֵחַ שֶׁל מִלָּה לְבֵין הָאוֹת שֶׁלָּהּ, וְהוּא הַבָּסִיס לִקְרִיאָה.',
      },
      {
        icon: '🔠',
        game: 'starts',
        body: 'תְּמוּנָה מוֹפִיעָה, וְהַיֶּלֶד גּוֹרֵר אוֹתָהּ אֶל הָאוֹת שֶׁבָּהּ הַמִּלָּה מַתְחִילָה. אַחֲרֵי הַתְּשׁוּבָה הַנְּכוֹנָה שׁוֹמְעִים אֶת הַמִּלָּה וְאֶת הַצְּלִיל שֶׁל הָאוֹת.',
      },
      {
        icon: '➕',
        game: 'add',
        body: 'שְׁלוֹשָׁה תַּרְגִּילֵי חִבּוּר בְּעֶזְרַת חֲפָצִים (לְמָשָׁל שְׁנַיִם וְעוֹד אֶחָד) וּשְׁלוֹשָׁה סְכוּמִים. הַיֶּלֶד גּוֹרֵר כָּל סְכוּם אֶל הַתַּרְגִּיל שֶׁלּוֹ. מַתְחִילִים בִּסְכוּמִים עַד 5 וְאַחַר כָּךְ עַד 10, וְכָל תַּרְגִּיל נִשְׁמָע בְּקוֹל.',
      },
      {
        icon: '🎁',
        game: 'sky',
        body: "מִשְׂחַק תִּרְגּוּל בְּעוֹלָם תְּלַת־מִמַּדִּי בַּשָּׁמַיִם. בְּיַד שְׂמֹאל הַיֶּלֶד מֵזִיז אֶת הַדְּמוּת (גּ'וֹיְסְטִיק בַּמָּסָךְ, אוֹ W A S D בַּמִּקְלֶדֶת), וּבְיַד יָמִין הוּא מַכֶּה בַּקֻּפְסָה (כַּפְתּוֹר בַּמָּסָךְ, אוֹ K). עָלָיו לְחַפֵּשׂ אֶת הַקֻּפְסָה עִם הָאוֹת הַנְּכוֹנָה כְּדֵי לְהַשְׁלִים מִלָּה. כָּל קֻפְסָה נִשְׁבֶּרֶת אַחֲרֵי 3 אֶגְרוֹפִים וּשְׁלוֹשׁ נְקֻדּוֹת עַל הַקֻּפְסָה מַרְאוֹת כַּמָּה אֶגְרוֹפִים נִשְׁאֲרוּ. אַחֲרֵי כָּל אוֹת הַמִּשְׂחָק עוֹצֵר וְאוֹמֵר אֶת שֵׁם הָאוֹת וְהַצְּלִיל שֶׁלָּהּ, וּבְסוֹף כָּל מִלָּה מַצִּיג תְּמוּנָה וְאוֹמֵר אֶת הַמִּלָּה. הַזְּמַן עוֹצֵר בִּזְמַן הַהַקְשָׁבָה, וְטָעוּת לֹא מַעֲנִישָׁה: גַּם אוֹת לֹא נְכוֹנָה נִשְׁבֶּרֶת וּמְקַבֶּלֶת הֶסְבֵּר. בַּסִּיּוּם הַיֶּלֶד סוֹפֵר אֶת הַמִּלִּים שֶׁהִשִּׂיג.",
      },
      {
        icon: '◌ָ',
        game: 'niqqud',
        body: 'הַיֶּלֶד לוֹחֵץ עַל סִימָן נִקּוּד, רוֹאֶה אוֹתוֹ עַל אוֹת, שׁוֹמֵעַ אֶת שְׁמוֹ וְאֶת הַצְּלִיל שֶׁהוּא נוֹתֵן לָאוֹת. הַמִּשְׂחָק קַיָּם בְּעִבְרִית בִּלְבַד.',
      },
    ],
    skills:
      'הַמִּשְׂחָק מְתַרְגֵּל: זִהוּי אוֹתִיּוֹת וּצְלִילִים, קֶשֶׁב וְרִכּוּז, סְפִירָה, קוֹאוֹרְדִּינַצְיָה בֵּין שְׁתֵּי הַיָּדַיִם, וּבְחִירָה מְהִירָה בֵּין כַּמָּה אֶפְשָׁרֻיּוֹת.',
    tipsTitle: '💡 טִיפִּים לַהוֹרִים',
    tips: [
      'מֻמְלָץ לְשַׂחֵק יַחַד עִם הַיֶּלֶד, לְהַפְעִיל קוֹל, וּבַטֶּלֶפוֹן לְהַחֲזִיק לְרֹחַב.',
      'מֻמְלָץ לְהַתְחִיל בִּשְׁלוֹשֶׁת הַמִּשְׂחָקִים הָרִאשׁוֹנִים (הַכָּרַת הַמִּסְפָּרִים, הַכָּרַת הָאוֹתִיּוֹת וְאוֹצַר מִלִּים) וְרַק אַחַר כָּךְ לַעֲבֹר לְמִשְׂחַק הַמִּלִּים.',
    ],
    voiceNote:
      'הַקְרָיָנוּת כָּרֶגַע בְּקוֹל שֶׁל הַמַּכְשִׁיר. בַּגִּרְסָה הַבָּאָה נַקְלִיט קְרָיָנוּת אֲמִתִּית כְּדֵי שֶׁהַצְּלִילִים יִשָּׁמְעוּ מְדֻיָּקִים.',
    close: '✖ סְגִירָה',
  },
};

/** First letter plus its vowel marks / dagesh, then the rest of the word. */
function splitFirstLetter(shown: string): [string, string] {
  const match = shown.match(/^([א-ת][֑-ׇ]*)(.*)$/u);
  if (!match) return [shown.slice(0, 1), shown.slice(1)];
  return [match[1] ?? '', match[2] ?? ''];
}

function gameOverText(wordCount: number): string {
  const amount = wordCount === 1 ? 'מִלָּה אַחַת' : `${wordCount} מִלִּים`;
  return `הַמִּשְׂחָק הִסְתַּיֵּם · הִשַּׂגְתָּ ${amount}`;
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
  nativeName: 'עִבְרִית',
  dir: 'rtl',
  speechLang: 'he-IL',
  ui,
  letters,
  finalLetters,
  words,
  colors,
  shapes,
  lookalikes,
  niqqud: niqqudMarks,
  availableGames: AVAILABLE_GAMES,
  numbers,
  maxCount: 22,
  splitFirstLetter,
  gameOverText,
  gameOverParts,
};
