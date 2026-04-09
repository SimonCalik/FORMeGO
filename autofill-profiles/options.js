// options.js - CRUD and migration for extended profile data stored in chrome.storage.sync.
(() => {
  const STORAGE_KEY = 'profiles';
  const FIELD_KEYS = [
    'firstName', 'middleName', 'lastName', 'fullName', 'nickName',
    'email', 'email2', 'phone', 'phone2',
    'company', 'jobTitle',
    'address1', 'address2', 'city', 'state', 'zip', 'country',
    'birthDate', 'nationalId', 'taxId', 'passportNumber', 'iban',
    'note'
  ];

  const els = {
    list: document.getElementById('profileList'),
    form: document.getElementById('profileForm'),
    status: document.getElementById('status'),
    addBtn: document.getElementById('addProfile'),
    delBtn: document.getElementById('deleteProfile'),
    label: document.getElementById('label')
  };

  let profiles = [];
  let selectedId = null;

  function showStatus(text, isError = false) {
    els.status.textContent = text;
    els.status.style.color = isError ? '#ff9ba8' : '#b6c2d8';
  }

  function emptyData() {
    const data = {};
    for (const key of FIELD_KEYS) data[key] = '';
    return data;
  }

  function generateId(label) {
    const base = String(label || 'profil')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'profil';
    return `${base}-${Date.now().toString(36)}`;
  }

  function normalizeProfile(profile, index) {
    if (!profile || typeof profile !== 'object') return null;

    const baseData = emptyData();
    const srcData = (profile.data && typeof profile.data === 'object') ? profile.data : {};

    for (const key of FIELD_KEYS) {
      baseData[key] = String(srcData[key] ?? '').trim();
    }

    return {
      id: String(profile.id || `profile-${index + 1}`),
      label: String(profile.label || `Profil ${index + 1}`),
      data: baseData
    };
  }

  async function loadProfiles() {
    const result = await chrome.storage.sync.get({ [STORAGE_KEY]: [] });
    const raw = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
    profiles = raw.map((p, idx) => normalizeProfile(p, idx)).filter(Boolean);

    const rawJson = JSON.stringify(raw);
    const normalizedJson = JSON.stringify(profiles);
    if (rawJson !== normalizedJson) {
      await chrome.storage.sync.set({ [STORAGE_KEY]: profiles });
    }
  }

  async function saveProfiles() {
    await chrome.storage.sync.set({ [STORAGE_KEY]: profiles });
  }

  function getSelectedProfile() {
    return profiles.find((p) => p.id === selectedId) || null;
  }

  function getFieldEl(key) {
    return document.getElementById(key);
  }

  function fillForm(profile) {
    if (!profile) {
      els.form.reset();
      els.label.value = '';
      for (const key of FIELD_KEYS) {
        const input = getFieldEl(key);
        if (input) input.value = '';
      }
      return;
    }

    els.label.value = profile.label || '';
    for (const key of FIELD_KEYS) {
      const input = getFieldEl(key);
      if (input) input.value = String(profile.data?.[key] || '');
    }
  }

  function renderList() {
    els.list.textContent = '';

    if (profiles.length === 0) {
      const msg = document.createElement('p');
      msg.textContent = 'Zatiaľ nemáš žiadne profily.';
      msg.style.color = '#b6c2d8';
      msg.style.margin = '0';
      els.list.appendChild(msg);
      return;
    }

    for (const profile of profiles) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'profile-item' + (profile.id === selectedId ? ' active' : '');
      btn.textContent = profile.label;
      btn.addEventListener('click', () => {
        selectedId = profile.id;
        renderList();
        fillForm(profile);
        showStatus('');
      });
      els.list.appendChild(btn);
    }
  }

  function collectFormData() {
    const data = emptyData();
    for (const key of FIELD_KEYS) {
      const input = getFieldEl(key);
      data[key] = String(input?.value || '').trim();
    }
    return data;
  }

  function selectFirstIfNeeded() {
    if (!selectedId && profiles.length > 0) {
      selectedId = profiles[0].id;
    }
  }

  function onAddProfile() {
    selectedId = null;
    fillForm(null);
    els.label.focus();
    renderList();
    showStatus('Nový profil: vyplň údaje a klikni Uložiť.');
  }

  async function onSaveProfile(event) {
    event.preventDefault();

    const label = String(els.label.value || '').trim();
    if (!label) {
      showStatus('Názov profilu je povinný.', true);
      els.label.focus();
      return;
    }

    const data = collectFormData();

    if (!selectedId) {
      const id = generateId(label);
      profiles.push({ id, label, data });
      selectedId = id;
    } else {
      const idx = profiles.findIndex((p) => p.id === selectedId);
      if (idx === -1) {
        profiles.push({ id: selectedId, label, data });
      } else {
        profiles[idx] = { ...profiles[idx], label, data };
      }
    }

    await saveProfiles();
    renderList();
    showStatus('Profil bol uložený.');
  }

  async function onDeleteProfile() {
    const profile = getSelectedProfile();
    if (!profile) {
      showStatus('Najprv vyber profil na zmazanie.', true);
      return;
    }

    profiles = profiles.filter((p) => p.id !== profile.id);
    selectedId = profiles[0]?.id || null;
    await saveProfiles();

    renderList();
    fillForm(getSelectedProfile());
    showStatus('Profil bol zmazaný.');
  }

  async function init() {
    try {
      await loadProfiles();
      selectFirstIfNeeded();
      renderList();
      fillForm(getSelectedProfile());
      showStatus('');
    } catch (error) {
      showStatus(`Chyba pri načítaní: ${String(error)}`, true);
    }
  }

  els.addBtn.addEventListener('click', onAddProfile);
  els.form.addEventListener('submit', onSaveProfile);
  els.delBtn.addEventListener('click', onDeleteProfile);

  init();
})();
