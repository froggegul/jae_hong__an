#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'content', 'works.js');
const mediaDir = path.join(root, 'media');
const posterDir = path.join(root, 'assets', 'posters');

function cleanInputPath(value) {
  const raw = (value || '').trim();
  if (!raw) return '';
  const unquoted = raw.replace(/^['"]|['"]$/g, '');
  const unescaped = unquoted
    .replace(/\\ /g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\&/g, '&')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"');
  if (unescaped.startsWith('file://')) return fileURLToPath(unescaped);
  return path.resolve(unescaped);
}

async function loadWorks() {
  const code = await fs.readFile(manifestPath, 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox, { filename: manifestPath });
  if (!Array.isArray(sandbox.window.JAEHONG_WORKS)) {
    throw new Error('content/works.js must define window.JAEHONG_WORKS = [...]');
  }
  return sandbox.window.JAEHONG_WORKS;
}

function nextIndex(works) {
  const nums = works.map(w => Number.parseInt(w.idx, 10)).filter(Number.isFinite);
  return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, '0');
}

async function copyAsset(source, destinationDir, basename) {
  await fs.mkdir(destinationDir, { recursive: true });
  const ext = path.extname(source) || path.extname(basename) || '';
  const destination = path.join(destinationDir, basename.replace(/\.[^.]+$/, '') + ext);
  await fs.copyFile(source, destination);
  return path.relative(root, destination).split(path.sep).join('/');
}

async function writeWorks(works) {
  const header = [
    '// Jaehong An portfolio works manifest',
    '// Add new works by running "Add New Work.command" or editing this file directly.',
    'window.JAEHONG_WORKS = '
  ].join('\n');
  await fs.writeFile(manifestPath, `${header}${JSON.stringify(works, null, 2)};\n`, 'utf8');
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Usage: node tools/add-work.mjs');
    console.log('Prompts for a video, poster, and metadata, then updates content/works.js.');
    return;
  }

  const works = await loadWorks();
  const idx = nextIndex(works);
  const rl = readline.createInterface({ input, output });
  const ask = async (label, fallback = '') => {
    const suffix = fallback ? ` [${fallback}]` : '';
    const answer = await rl.question(`${label}${suffix}: `);
    return answer.trim() || fallback;
  };

  console.log(`\nAdding work N° ${idx}`);
  console.log('Tip: drag files into this Terminal window to paste their paths.\n');

  const videoSource = cleanInputPath(await ask('Video file path (.mp4)'));
  if (!videoSource) throw new Error('Video file path is required.');
  await fs.access(videoSource);

  const posterAnswer = await ask('Poster image path (.jpg/.png, optional)');
  const posterSource = cleanInputPath(posterAnswer);
  if (posterSource) await fs.access(posterSource);

  const title = await ask('Title', `Untitled Work ${idx}`);
  const year = await ask('Year', new Date().getFullYear().toString());
  const medium = await ask('Medium', '9:16 Video');
  const duration = await ask('Duration', 'looped');
  const caption = await ask('Short caption', title);
  const descEn = await ask('English description', '');
  const desc = await ask('Korean description', '');

  const video = await copyAsset(videoSource, mediaDir, `work-${idx}${path.extname(videoSource) || '.mp4'}`);
  const poster = posterSource
    ? await copyAsset(posterSource, posterDir, `work-${idx}${path.extname(posterSource) || '.jpg'}`)
    : `assets/posters/work-${idx}.jpg`;

  works.push({ idx, title, desc, descEn, year, medium, duration, caption, video, poster });
  await writeWorks(works);

  rl.close();
  console.log(`\nAdded N° ${idx}: ${title}`);
  console.log(`Video:  ${video}`);
  console.log(`Poster: ${poster}`);
  console.log('Refresh the portfolio page to see the new work.');
}

main().catch(err => {
  console.error(`\nCould not add work: ${err.message}`);
  process.exitCode = 1;
});
