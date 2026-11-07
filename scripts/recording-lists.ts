import { mkdirSync, writeFileSync } from 'node:fs';
import { LANGUAGE_ORDER, listRecordingItems, packs } from '../src/content';

/** Writes docs/recording-list.<language>.md from the same data the app uses. */
mkdirSync('docs', { recursive: true });
for (const code of LANGUAGE_ORDER) {
  const pack = packs[code];
  const items = listRecordingItems(pack);
  const groups = [...new Set(items.map((item) => item.group))];
  const lines = [
    `# Recording list – ${pack.nativeName}`,
    '',
    `${items.length} short clips. Save each as <clip id>.mp3 (m4a/wav also fine) into public/audio/${code}/`,
    `and list the ids in public/audio/${code}/manifest.json. Clips that are missing fall back to the device voice.`,
    '',
  ];
  for (const group of groups) {
    lines.push(`## ${group}`, '', '| clip id | say |', '|---|---|');
    for (const item of items.filter((entry) => entry.group === group)) {
      lines.push(`| ${item.clipId} | ${item.speech} |`);
    }
    lines.push('');
  }
  writeFileSync(`docs/recording-list.${code}.md`, lines.join('\n'));
  console.log(`${code}: ${items.length} clips`);
}
