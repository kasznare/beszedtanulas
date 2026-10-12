// Private stories are stored on this browser only. No network requests or sync.
const DATABASE = 'beszedtanulas.private-audiobooks.v1';
const STORE = 'stories';
const MAX_AUDIO = 32 * 1024 * 1024;
const MAX_FILE = 46 * 1024 * 1024;

export async function parsePrivateAudiobook(file) {
  if (!file || file.size > MAX_FILE) throw Error('A mesefájl túl nagy (legfeljebb 46 MB lehet).');
  let bundle;
  try { bundle = JSON.parse(await file.text()); }
  catch { throw Error('Ez nem olvasható mesefájl. Válaszd a .mese.json fájlt!'); }
  const { story, audio } = bundle || {};
  if (bundle?.format !== 'beszedtanulas-private-audiobook' || bundle.version !== 1 ||
      typeof story?.title !== 'string' || !story.title.trim() || story.title.length > 200 ||
      (story.author !== undefined && (typeof story.author !== 'string' || story.author.length > 200)) ||
      typeof story.text !== 'string' || !story.text.trim() || story.text.length > 100000 ||
      !Number.isFinite(story.duration) || story.duration <= 0 || story.duration > 7200 ||
      !Number.isInteger(story.bytes) || story.bytes <= 0 || story.bytes > MAX_AUDIO ||
      !/^[a-f0-9]{64}$/.test(story.sha256) || audio?.mime !== 'audio/mpeg' ||
      typeof audio.base64 !== 'string' || audio.base64.length > Math.ceil(MAX_AUDIO / 3) * 4) {
    throw Error('A mesefájl formátuma nem megfelelő.');
  }
  let bytes;
  try { bytes = Uint8Array.from(atob(audio.base64), character => character.charCodeAt(0)); }
  catch { throw Error('A mesefájl hangja sérült.'); }
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (bytes.length !== story.bytes || sha256 !== story.sha256) throw Error('A mesefájl hangja hiányos vagy sérült.');
  return { id: `local-${sha256}`, title: story.title.trim(), text: story.text,
    ...(story.author?.trim() ? { author: story.author.trim(), kind: 'Saját mese' } : {}),
    duration: story.duration, bytes: bytes.length, sha256, emoji: '📖', local: true,
    audio: new Blob([bytes], { type: 'audio/mpeg' }) };
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(Error('A böngészőn nincs elérhető helyi tárhely.')); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(Error('A böngésző helyi tárhelye nem érhető el.'));
    request.onblocked = () => reject(Error('Zárd be a többi játékablakot, majd próbáld újra!'));
  });
}

async function stored(mode, operation) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = operation(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = transaction.onabort = () => reject(Error('A mesét nem sikerült a böngésző tárhelyén kezelni. Ellenőrizd a szabad helyet!'));
    });
  } finally { database.close(); }
}

const metadata = ({ audio, ...story }) => story;
export async function importPrivateAudiobook(file) {
  const story = await parsePrivateAudiobook(file);
  // ArrayBuffer storage also works in WebKit versions where cloning a Blob
  // into IndexedDB fails. Existing saved Blobs remain readable below.
  const audio = await story.audio.arrayBuffer();
  await stored('readwrite', store => store.put({ ...story, audio }));
  return metadata(story);
}
export async function loadLocalAudiobooks() {
  return (await stored('readonly', store => store.getAll())).map(metadata);
}
export async function resolveLocalAudiobookSource(story) {
  const saved = await stored('readonly', store => store.get(story.id));
  if (!saved?.audio || saved.sha256 !== story.sha256) throw Error('A saját mese nem található ezen az eszközön. Importáld újra a fájlból!');
  const audio = saved.audio instanceof Blob ? saved.audio : new Blob([saved.audio], { type: 'audio/mpeg' });
  if (audio.size !== story.bytes) throw Error('A saját mese hangja sérült. Importáld újra a fájlból!');
  return { url: URL.createObjectURL(audio), blob: true };
}
export async function deleteLocalAudiobook(id) {
  if (!id.startsWith('local-')) throw Error('Csak saját mesét lehet eltávolítani.');
  await stored('readwrite', store => store.delete(id));
}
