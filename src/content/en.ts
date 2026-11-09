import type {
  ColorEntry,
  LanguagePack,
  LetterEntry,
  NumberNames,
  SpokenPart,
  UiText,
  WordEntry,
} from './types';
import { numberClipId } from './clips';

/**
 * Phonics: `nameSpeech` is spelled so the device voice says the letter name,
 * `soundSpeech` approximates the letter sound.
 */
function letter(
  key: string,
  name: string,
  nameSpeech: string,
  soundText: string,
  soundSpeech: string,
): LetterEntry {
  const upper = key.toUpperCase();
  return {
    key,
    id: key,
    tileText: `${upper}${key}`,
    boxText: upper,
    name,
    nameSpeech,
    soundText,
    soundSpeech,
  };
}

const letters: LetterEntry[] = [
  letter('a', 'Ay', 'ay', '/a/', 'ah'),
  letter('b', 'Bee', 'bee', '/b/', 'buh'),
  letter('c', 'See', 'see', '/k/', 'kuh'),
  letter('d', 'Dee', 'dee', '/d/', 'duh'),
  letter('e', 'Ee', 'ee', '/e/', 'eh'),
  letter('f', 'Eff', 'eff', '/f/', 'fuh'),
  letter('g', 'Gee', 'jee', '/g/', 'guh'),
  letter('h', 'Aitch', 'aitch', '/h/', 'huh'),
  letter('i', 'Eye', 'eye', '/i/', 'ih'),
  letter('j', 'Jay', 'jay', '/j/', 'juh'),
  letter('k', 'Kay', 'kay', '/k/', 'kuh'),
  letter('l', 'El', 'ell', '/l/', 'luh'),
  letter('m', 'Em', 'em', '/m/', 'mm'),
  letter('n', 'En', 'en', '/n/', 'nn'),
  letter('o', 'Oh', 'oh', '/o/', 'aw'),
  letter('p', 'Pee', 'pee', '/p/', 'puh'),
  letter('q', 'Cue', 'cue', '/kw/', 'kwuh'),
  letter('r', 'Ar', 'are', '/r/', 'ruh'),
  letter('s', 'Ess', 'ess', '/s/', 'ss'),
  letter('t', 'Tee', 'tee', '/t/', 'tuh'),
  letter('u', 'You', 'you', '/u/', 'uh'),
  letter('v', 'Vee', 'vee', '/v/', 'vuh'),
  letter('w', 'Double you', 'double you', '/w/', 'wuh'),
  letter('x', 'Ex', 'ex', '/ks/', 'ks'),
  letter('y', 'Why', 'why', '/y/', 'yuh'),
  letter('z', 'Zee', 'zee', '/z/', 'zuh'),
];

/** `shown` may contain punctuation (X-ray); only its letters become slots. */
function word(id: string, shown: string, emoji: string): WordEntry {
  const slots = [...shown.toLowerCase()]
    .filter((char) => /[a-z]/.test(char))
    .map((char) => ({ text: char.toUpperCase(), key: char }));
  const firstSlot = slots[0];
  if (!firstSlot) throw new Error(`English word "${id}" has no letters`);
  return { id, startKey: firstSlot.key, shown, speech: shown, emoji, slots };
}

const words: WordEntry[] = [
  word('apple', 'Apple', '🍎'),
  word('ball', 'Ball', '⚽'),
  word('cat', 'Cat', '🐱'),
  word('dog', 'Dog', '🐶'),
  word('egg', 'Egg', '🥚'),
  word('fish', 'Fish', '🐟'),
  word('goat', 'Goat', '🐐'),
  word('hat', 'Hat', '🎩'),
  word('ice', 'Ice', '🧊'),
  word('jet', 'Jet', '✈️'),
  word('kite', 'Kite', '🪁'),
  word('lion', 'Lion', '🦁'),
  word('moon', 'Moon', '🌙'),
  word('nose', 'Nose', '👃'),
  word('owl', 'Owl', '🦉'),
  word('pig', 'Pig', '🐷'),
  word('queen', 'Queen', '👸'),
  word('rain', 'Rain', '🌧️'),
  word('sun', 'Sun', '☀️'),
  word('tree', 'Tree', '🌳'),
  word('umbrella', 'Umbrella', '☔'),
  word('van', 'Van', '🚐'),
  word('wolf', 'Wolf', '🐺'),
  word('xray', 'X-ray', '🩻'),
  word('yoyo', 'Yo-yo', '🪀'),
  word('zebra', 'Zebra', '🦓'),
];

const numberNames = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
  'twenty-one',
  'twenty-two',
  'twenty-three',
  'twenty-four',
  'twenty-five',
  'twenty-six',
];

const colors: ColorEntry[] = [
  {
    id: 'red',
    hex: '#e53935',
    name: 'Red',
    nameSpeech: 'red',
    example: { emoji: '🍎', phrase: 'red apple', speech: 'red apple' },
  },
  {
    id: 'orange',
    hex: '#fb8c00',
    name: 'Orange',
    nameSpeech: 'orange',
    example: { emoji: '🥕', phrase: 'orange carrot', speech: 'orange carrot' },
  },
  {
    id: 'yellow',
    hex: '#fdd835',
    name: 'Yellow',
    nameSpeech: 'yellow',
    example: { emoji: '🐥', phrase: 'yellow chick', speech: 'yellow chick' },
  },
  {
    id: 'green',
    hex: '#43a047',
    name: 'Green',
    nameSpeech: 'green',
    example: { emoji: '🥒', phrase: 'green cucumber', speech: 'green cucumber' },
  },
  {
    id: 'blue',
    hex: '#1e88e5',
    name: 'Blue',
    nameSpeech: 'blue',
    example: { emoji: '🐳', phrase: 'blue whale', speech: 'blue whale' },
  },
  {
    id: 'purple',
    hex: '#8e24aa',
    name: 'Purple',
    nameSpeech: 'purple',
    example: { emoji: '🍇', phrase: 'purple grape', speech: 'purple grape' },
  },
  {
    id: 'pink',
    hex: '#f48fb1',
    name: 'Pink',
    nameSpeech: 'pink',
    example: { emoji: '🌸', phrase: 'pink flower', speech: 'pink flower' },
  },
  {
    id: 'brown',
    hex: '#795548',
    name: 'Brown',
    nameSpeech: 'brown',
    example: { emoji: '🐻', phrase: 'brown bear', speech: 'brown bear' },
  },
  {
    id: 'white',
    hex: '#ffffff',
    name: 'White',
    nameSpeech: 'white',
    example: { emoji: '☁️', phrase: 'white cloud', speech: 'white cloud' },
  },
  {
    id: 'black',
    hex: '#212121',
    name: 'Black',
    nameSpeech: 'black',
    example: { emoji: '🐈\u200d⬛', phrase: 'black cat', speech: 'black cat' },
  },
  {
    id: 'turquoise',
    hex: '#1ec8c8',
    name: 'Turquoise',
    nameSpeech: 'turquoise',
    example: { emoji: '🐬', phrase: 'turquoise dolphin', speech: 'turquoise dolphin' },
  },
  {
    id: 'gray',
    hex: '#9e9e9e',
    name: 'Gray',
    nameSpeech: 'gray',
    example: { emoji: '🐘', phrase: 'gray elephant', speech: 'gray elephant' },
  },
];

const numbers: NumberNames = {
  spoken: numberNames,
  shown: numberNames.map((name) => name.charAt(0).toUpperCase() + name.slice(1)),
};

const ui: UiText = {
  appName: 'Learning is Fun',
  chooseGame: 'Pick a game',
  aboutButton: 'About',
  credit: 'Created by Izhak Nachman · All rights reserved ©',
  gameNames: {
    numbers: 'Meet the Numbers',
    letters: 'Meet the Letters',
    trace: 'Write the Letters',
    colors: 'Meet the Colours',
    words: 'Word Treasure',
    sky: 'Word Game',
  },
  gameNameSpeech: {
    numbers: 'Meet the Numbers',
    letters: 'Meet the Letters',
    trace: 'Write the Letters',
    colors: 'Meet the Colours',
    words: 'Word Treasure',
    sky: 'Word Game',
  },
  numbers: { placeholder: 'Tap a number', placeholderSpeech: 'Tap a number' },
  colors: { placeholder: 'Tap a colour', placeholderSpeech: 'Tap a colour' },
  letters: {
    placeholder: 'Tap a letter',
    placeholderSpeech: 'Tap a letter',
    finalSuffix: '',
    finalSuffixSpeech: '',
  },
  trace: {
    placeholder: 'Pick a letter to write',
    placeholderSpeech: 'Pick a letter to write',
    groupLabel: 'Group',
    baseLegend: 'First stroke',
    additionLegend: 'Next strokes',
    restart: 'Again',
    next: 'Next letter',
  },
  words: {
    stepLetterName: 'Letter name',
    stepLetter: 'Letter',
    stepSound: 'Sound',
    stepWord: 'Word',
  },
  sky: {
    quit: '✖ Finish',
    endTitle: '🎉 Well done! 🎉',
    countHint: '👆 Tap each word to count it',
    again: '↻ Again',
    rotatePhone: 'Turn your phone sideways',
    confirm: '✔ OK',
    wellDone: 'Very good!',
    wellDoneSpeech: 'Very good!',
  },
  voice: {
    found: '🔊 An English voice was found on this device',
    missing:
      '⚠️ No English voice was found on this device – the real version will use recorded audio.',
  },
  about: {
    title: 'About "Learning is Fun"',
    intro:
      '"Learning is Fun" is a set of short games for young children, with no sign-up and no data saved. The games teach letters, sounds, numbers and counting, and practise using both hands the way real video games do. You can switch between Hebrew and English with the language button on the home screen.',
    sections: [
      {
        icon: '🔢',
        game: 'numbers',
        body: 'Children get to know the numbers 1–20: how they look, how they sound and how they are written as words. Colourful balls in rows of five show the quantity itself, and counting out loud links the symbol, the name and the amount.',
      },
      {
        icon: '🔤',
        game: 'letters',
        body: 'The name and the sound of every letter. In English the sound is the phonics sound used for reading. Children see and hear each letter again and again at their own pace.',
      },
      {
        icon: '✏️',
        game: 'trace',
        body: 'The child writes the letter themselves by dragging a dot along the line, from the top down or from left to right. Capital letters are grouped by stroke type, in the same order handwriting programmes use: straight lines first, then curves, then diagonals. Each group starts with its basic shape to practise, and the first stroke is coloured by group and the next strokes in another colour. After each letter the child hears its name and sound.',
      },
      {
        icon: '🎨',
        game: 'colors',
        body: 'The child taps a colour, sees it big, hears its name and gets an example of something in that colour (for example red – apple). This is how the ten basic colours are learned at the child’s own pace.',
      },
      {
        icon: '🖼️',
        game: 'words',
        body: 'One word and picture for every letter. Each tap plays a fixed sequence: letter name, letter, sound, word. This helps children connect the first sound of a word with its letter, which is the foundation of reading.',
      },
      {
        icon: '🎁',
        game: 'sky',
        body: 'A practice game in a 3D sky world. With the left hand the child moves the character (an on-screen joystick, or W A S D on a keyboard), and with the right hand punches a box (an on-screen button, or K). The child looks for the box with the right letter to complete a word. Every box breaks after 3 punches and three dots on the box show how many punches are left. After every letter the game pauses and says the letter name and its sound, and after every word it shows the picture and says the word. The timer stops while the child listens, and mistakes are never punished: a wrong letter still breaks and is explained. At the end the child counts the words they collected.',
      },
    ],
    skills:
      'The game practises letter and sound recognition, attention, counting, coordination between both hands, and making quick choices.',
    tipsTitle: '💡 Tips for parents',
    tips: [
      'Play together with your child, turn the sound on, and hold the phone sideways.',
      'Start with the first three games (Meet the Numbers, Meet the Letters, Word Treasure) and move on to the Word Game afterwards.',
    ],
    voiceNote:
      'The voice currently comes from your device. A later version will use real recorded audio so the sounds are exact.',
    close: '✖ Close',
  },
};

function splitFirstLetter(shown: string): [string, string] {
  return [shown.slice(0, 1), shown.slice(1)];
}

function gameOverText(wordCount: number): string {
  const amount = wordCount === 1 ? '1 word' : `${wordCount} words`;
  return `Game over · You got ${amount}`;
}

function gameOverParts(wordCount: number): SpokenPart[] {
  const intro: SpokenPart = { clipId: 'phrase-game-over', speech: 'Game over! You got' };
  if (wordCount === 0) return [intro, { clipId: 'phrase-0-words', speech: 'zero words' }];
  if (wordCount === 1) return [intro, { clipId: 'phrase-1-word', speech: 'one word' }];
  return [
    intro,
    { clipId: numberClipId(wordCount), speech: numbers.spoken[wordCount] ?? String(wordCount) },
    { clipId: 'phrase-words', speech: 'words' },
  ];
}

export const englishPack: LanguagePack = {
  code: 'en',
  nativeName: 'English',
  dir: 'ltr',
  speechLang: 'en-US',
  ui,
  letters,
  finalLetters: [],
  words,
  colors,
  numbers,
  maxCount: 26,
  splitFirstLetter,
  gameOverText,
  gameOverParts,
};
