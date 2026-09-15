import { readFile } from 'node:fs/promises';

const required = ['LINE_CHANNEL_ACCESS_TOKEN', 'LIFF_HEALTH_URL', 'LIFF_CARE_URL', 'LIFF_PROFILE_URL', 'LIFF_SYMPTOM_URL'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const headers = { Authorization: `Bearer ${token}` };
const template = await readFile(new URL('./rich-menu.template.json', import.meta.url), 'utf8');
const menu = template
  .replace('__LIFF_HEALTH_URL__', process.env.LIFF_HEALTH_URL)
  .replace('__LIFF_CARE_URL__', process.env.LIFF_CARE_URL)
  .replace('__LIFF_PROFILE_URL__', process.env.LIFF_PROFILE_URL)
  .replace('__LIFF_SYMPTOM_URL__', process.env.LIFF_SYMPTOM_URL);

const create = await fetch('https://api.line.me/v2/bot/richmenu', {
  method: 'POST',
  headers: { ...headers, 'content-type': 'application/json' },
  body: menu,
});
if (!create.ok) throw new Error(`Create rich menu failed: ${create.status} ${await create.text()}`);
const { richMenuId } = await create.json();

const image = await readFile(new URL('./rich-menu.jpg', import.meta.url));
const upload = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
  method: 'POST',
  headers: { ...headers, 'content-type': 'image/jpeg' },
  body: image,
});
if (!upload.ok) throw new Error(`Upload rich menu image failed: ${upload.status} ${await upload.text()}`);

const setDefault = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
  method: 'POST',
  headers,
});
if (!setDefault.ok) throw new Error(`Set default rich menu failed: ${setDefault.status} ${await setDefault.text()}`);

console.log(`Rich menu ${richMenuId} is now the default menu.`);
