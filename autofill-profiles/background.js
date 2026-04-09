// background.js - Manages encrypted profile vault and keeps decrypted data only in memory while unlocked.
const LEGACY_STORAGE_KEY = 'profiles';
const VAULT_STORAGE_KEY = 'profilesVault';
const SESSION_STORAGE_KEY = 'vaultSessionProfiles';
const VAULT_VERSION = 1;
const PBKDF2_ITERATIONS = 250000;
const PROFILE_KEYS = [
  'firstName', 'middleName', 'lastName', 'fullName', 'nickName',
  'email', 'email2', 'phone', 'phone2',
  'company', 'jobTitle',
  'address1', 'address2', 'city', 'state', 'zip', 'country',
  'birthDate', 'nationalId', 'taxId', 'passportNumber', 'iban',
  'note'
];

let unlockedProfiles = null;
let unlockedAt = 0;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function emptyProfileData() {
  const data = {};
  for (const key of PROFILE_KEYS) data[key] = '';
  return data;
}

function normalizeProfile(profile, index) {
  if (!profile || typeof profile !== 'object') return null;

  const sourceData = profile.data && typeof profile.data === 'object' ? profile.data : {};
  const data = emptyProfileData();

  for (const key of PROFILE_KEYS) {
    data[key] = String(sourceData[key] ?? '').trim();
  }

  return {
    id: String(profile.id || `profile-${index + 1}`),
    label: String(profile.label || `Profil ${index + 1}`),
    data
  };
}

function normalizeProfiles(rawProfiles) {
  if (!Array.isArray(rawProfiles)) return [];
  return rawProfiles.map((profile, index) => normalizeProfile(profile, index)).filter(Boolean);
}

function uint8ArrayToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function deriveAesKey(passphrase, saltBytes, usages) {
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    usages
  );
}

async function encryptProfiles(profiles, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt, ['encrypt']);
  const payloadBytes = textEncoder.encode(JSON.stringify({ profiles }));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    payloadBytes
  );

  return {
    version: VAULT_VERSION,
    iterations: PBKDF2_ITERATIONS,
    salt: uint8ArrayToBase64(salt),
    iv: uint8ArrayToBase64(iv),
    cipherText: uint8ArrayToBase64(new Uint8Array(encrypted)),
    updatedAt: new Date().toISOString()
  };
}

async function decryptVault(vault, passphrase) {
  if (!vault || typeof vault !== 'object') {
    throw new Error('Vault is missing.');
  }

  const salt = base64ToUint8Array(vault.salt || '');
  const iv = base64ToUint8Array(vault.iv || '');
  const cipherBytes = base64ToUint8Array(vault.cipherText || '');
  const key = await deriveAesKey(passphrase, salt, ['decrypt']);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBytes
  );

  const payload = JSON.parse(textDecoder.decode(new Uint8Array(decrypted)));
  return normalizeProfiles(payload.profiles);
}

async function getVaultRecord() {
  const result = await chrome.storage.sync.get({ [VAULT_STORAGE_KEY]: null });
  return result[VAULT_STORAGE_KEY];
}

async function getLegacyProfiles() {
  const result = await chrome.storage.sync.get({ [LEGACY_STORAGE_KEY]: [] });
  return normalizeProfiles(result[LEGACY_STORAGE_KEY]);
}

async function clearLegacyProfiles() {
  await chrome.storage.sync.remove(LEGACY_STORAGE_KEY);
}

async function writeSessionProfiles(profiles) {
  await chrome.storage.session.set({ [SESSION_STORAGE_KEY]: normalizeProfiles(profiles) });
}

async function readSessionProfiles() {
  const result = await chrome.storage.session.get({ [SESSION_STORAGE_KEY]: null });
  const profiles = result[SESSION_STORAGE_KEY];
  if (!Array.isArray(profiles)) return null;
  return normalizeProfiles(profiles);
}

async function clearSessionProfiles() {
  await chrome.storage.session.remove(SESSION_STORAGE_KEY);
}

function touchUnlock() {
  unlockedAt = Date.now();
}

async function lockVaultInMemory() {
  unlockedProfiles = null;
  unlockedAt = 0;
  await clearSessionProfiles();
}

async function getUnlockedProfiles() {
  if (!Array.isArray(unlockedProfiles)) {
    unlockedProfiles = await readSessionProfiles();
  }

  if (!Array.isArray(unlockedProfiles)) return null;
  touchUnlock();
  return unlockedProfiles.map((profile) => ({
    ...profile,
    data: { ...profile.data }
  }));
}

async function persistProfiles(profiles, passphrase) {
  const normalized = normalizeProfiles(profiles);
  const vault = await encryptProfiles(normalized, passphrase);
  await chrome.storage.sync.set({ [VAULT_STORAGE_KEY]: vault });
  await clearLegacyProfiles();
  unlockedProfiles = normalized;
  await writeSessionProfiles(normalized);
  touchUnlock();
  return normalized;
}

async function getVaultStatus() {
  const unlocked = await getUnlockedProfiles();
  const [vault, legacyProfiles] = await Promise.all([getVaultRecord(), getLegacyProfiles()]);

  return {
    hasVault: Boolean(vault),
    hasLegacyPlain: legacyProfiles.length > 0,
    unlocked: Array.isArray(unlocked),
    profileCount: Array.isArray(unlocked) ? unlocked.length : 0,
    unlockedAt
  };
}

async function initVault(passphrase) {
  if (!passphrase || passphrase.length < 8) {
    throw new Error('Passphrase must have at least 8 characters.');
  }

  const existingVault = await getVaultRecord();
  if (existingVault) {
    throw new Error('Vault already exists.');
  }

  const legacyProfiles = await getLegacyProfiles();
  const profiles = legacyProfiles.length > 0 ? legacyProfiles : [];
  await persistProfiles(profiles, passphrase);

  return getVaultStatus();
}

async function unlockVault(passphrase) {
  if (!passphrase) throw new Error('Passphrase is required.');

  const vault = await getVaultRecord();
  if (!vault) {
    throw new Error('Vault is not initialized.');
  }

  const profiles = await decryptVault(vault, passphrase);
  unlockedProfiles = profiles;
  await writeSessionProfiles(profiles);
  touchUnlock();

  return getVaultStatus();
}

async function saveProfile(profile, passphrase) {
  const profiles = await getUnlockedProfiles();
  if (!profiles) throw new Error('Vault is locked.');
  if (!passphrase) throw new Error('Passphrase is required for saving.');

  const normalized = normalizeProfile(profile, profiles.length);
  if (!normalized) throw new Error('Profile is invalid.');

  const existingIndex = profiles.findIndex((item) => item.id === normalized.id);
  if (existingIndex === -1) {
    profiles.push(normalized);
  } else {
    profiles[existingIndex] = normalized;
  }

  const saved = await persistProfiles(profiles, passphrase);
  return saved;
}

async function deleteProfile(profileId, passphrase) {
  const profiles = await getUnlockedProfiles();
  if (!profiles) throw new Error('Vault is locked.');
  if (!passphrase) throw new Error('Passphrase is required for deleting.');

  const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
  const saved = await persistProfiles(nextProfiles, passphrase);
  return saved;
}

chrome.runtime.onStartup.addListener(() => {
  lockVaultInMemory().catch(() => {});
});

chrome.runtime.onInstalled.addListener(() => {
  lockVaultInMemory().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (!message || typeof message.type !== 'string') {
      throw new Error('Invalid message.');
    }

    switch (message.type) {
      case 'OPEN_OPTIONS_PAGE':
        await chrome.runtime.openOptionsPage();
        sendResponse({ ok: true });
        return;

      case 'GET_VAULT_STATUS':
        sendResponse({ ok: true, status: await getVaultStatus() });
        return;

      case 'INIT_VAULT':
        sendResponse({ ok: true, status: await initVault(String(message.passphrase || '')) });
        return;

      case 'UNLOCK_VAULT':
        sendResponse({ ok: true, status: await unlockVault(String(message.passphrase || '')) });
        return;

      case 'LOCK_VAULT':
        await lockVaultInMemory();
        sendResponse({ ok: true, status: await getVaultStatus() });
        return;

      case 'GET_PROFILES': {
        const profiles = await getUnlockedProfiles();
        sendResponse({ ok: true, profiles });
        return;
      }

      case 'GET_PROFILE_SUMMARIES': {
        const profiles = await getUnlockedProfiles();
        const summaries = profiles ? profiles.map((profile) => ({ id: profile.id, label: profile.label })) : null;
        sendResponse({ ok: true, profiles: summaries });
        return;
      }

      case 'GET_PROFILE_DATA': {
        const profiles = await getUnlockedProfiles();
        const profile = profiles ? profiles.find((item) => item.id === String(message.id || '')) || null : null;
        sendResponse({ ok: true, profile });
        return;
      }

      case 'SAVE_PROFILE': {
        const profiles = await saveProfile(message.profile, String(message.passphrase || ''));
        sendResponse({ ok: true, profiles });
        return;
      }

      case 'DELETE_PROFILE': {
        const profiles = await deleteProfile(String(message.id || ''), String(message.passphrase || ''));
        sendResponse({ ok: true, profiles });
        return;
      }

      default:
        throw new Error(`Unsupported message: ${message.type}`);
    }
  })().catch((error) => {
    sendResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  });

  return true;
});
