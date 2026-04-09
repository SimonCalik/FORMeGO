// options.js - Unlocks encrypted vault and manages profiles through background messaging only.
(() => {
  const FIELD_KEYS = [
    'firstName', 'middleName', 'lastName', 'fullName', 'nickName',
    'email', 'email2', 'phone', 'phone2',
    'company', 'jobTitle',
    'address1', 'address2', 'city', 'state', 'zip', 'country',
    'birthDate', 'nationalId', 'taxId', 'passportNumber', 'iban',
    'note'
  ];

  const els = {
    authView: document.getElementById('authView'),
    authTitle: document.getElementById('authTitle'),
    authDescription: document.getElementById('authDescription'),
    authStatus: document.getElementById('authStatus'),
    setupForm: document.getElementById('setupForm'),
    setupPassphrase: document.getElementById('setupPassphrase'),
    setupPassphraseConfirm: document.getElementById('setupPassphraseConfirm'),
    unlockForm: document.getElementById('unlockForm'),
    unlockPassphrase: document.getElementById('unlockPassphrase'),
    appView: document.getElementById('appView'),
    list: document.getElementById('profileList'),
    form: document.getElementById('profileForm'),
    appStatus: document.getElementById('appStatus'),
    addBtn: document.getElementById('addProfile'),
    delBtn: document.getElementById('deleteProfile'),
    lockBtn: document.getElementById('lockVault'),
    label: document.getElementById('label')
  };

  let profiles = [];
  let selectedId = null;
  let unlockedPassphrase = '';
  let vaultStatus = null;

  function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response || !response.ok) {
            reject(new Error(response?.error || 'Unknown extension error.'));
            return;
          }

          resolve(response);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function showAuthStatus(text, isError = false) {
    els.authStatus.textContent = text;
    els.authStatus.style.color = isError ? '#ff9ba8' : '#b6c2d8';
  }

  function showAppStatus(text, isError = false) {
    els.appStatus.textContent = text;
    els.appStatus.style.color = isError ? '#ff9ba8' : '#b6c2d8';
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

  function getFieldEl(key) {
    return document.getElementById(key);
  }

  function getSelectedProfile() {
    return profiles.find((profile) => profile.id === selectedId) || null;
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
      msg.textContent = 'Vo vault-e zatial nie su ziadne profily.';
      msg.style.color = '#b6c2d8';
      msg.style.margin = '0';
      els.list.appendChild(msg);
      return;
    }

    for (const profile of profiles) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `profile-item${profile.id === selectedId ? ' active' : ''}`;
      btn.textContent = profile.label;
      btn.addEventListener('click', () => {
        selectedId = profile.id;
        renderList();
        fillForm(profile);
        showAppStatus('');
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

  function renderAuthView() {
    els.appView.hidden = true;
    els.authView.hidden = false;
    els.setupForm.hidden = true;
    els.unlockForm.hidden = true;

    if (!vaultStatus) {
      els.authTitle.textContent = 'Nacitavam bezpecnostne nastavenia';
      els.authDescription.textContent = 'Kontrolujem, ci uz mas vytvoreny sifrovany vault.';
      return;
    }

    if (!vaultStatus.hasVault) {
      els.authTitle.textContent = 'Vytvor sifrovany vault';
      els.authDescription.textContent = vaultStatus.hasLegacyPlain
        ? 'Nasli sa starsie nezasifrovane profily. Nastav heslo a premigrujeme ich do sifrovaneho vaultu.'
        : 'Nastav heslo, ktorym sa budu profily sifrovat pred ulozenim.';
      els.setupForm.hidden = false;
      return;
    }

    els.authTitle.textContent = 'Vault je zamknuty';
    els.authDescription.textContent = 'Zadaj heslo, aby sa profily nacitali do bezpecnej relacie iba v pamati rozsirrenia.';
    els.unlockForm.hidden = false;
  }

  function renderAppView() {
    els.authView.hidden = true;
    els.appView.hidden = false;
    renderList();
    fillForm(getSelectedProfile());
  }

  async function refreshVaultState() {
    const response = await sendRuntimeMessage({ type: 'GET_VAULT_STATUS' });
    vaultStatus = response.status;

    if (vaultStatus.unlocked) {
      const profilesResponse = await sendRuntimeMessage({ type: 'GET_PROFILES' });
      profiles = Array.isArray(profilesResponse.profiles) ? profilesResponse.profiles : [];
      selectFirstIfNeeded();
      renderAppView();
      return;
    }

    profiles = [];
    selectedId = null;
    unlockedPassphrase = '';
    renderAuthView();
  }

  async function onSetupSubmit(event) {
    event.preventDefault();

    const passphrase = els.setupPassphrase.value;
    const confirm = els.setupPassphraseConfirm.value;

    if (passphrase.length < 8) {
      showAuthStatus('Heslo musi mat aspon 8 znakov.', true);
      return;
    }

    if (passphrase !== confirm) {
      showAuthStatus('Hesla sa nezhoduju.', true);
      return;
    }

    showAuthStatus('Vytvaram sifrovany vault...');

    try {
      await sendRuntimeMessage({ type: 'INIT_VAULT', passphrase });
      unlockedPassphrase = passphrase;
      els.setupForm.reset();
      showAuthStatus('Vault bol vytvoreny a odomknuty.');
      await refreshVaultState();
    } catch (error) {
      showAuthStatus(String(error.message || error), true);
    }
  }

  async function onUnlockSubmit(event) {
    event.preventDefault();
    const passphrase = els.unlockPassphrase.value;

    if (!passphrase) {
      showAuthStatus('Zadaj heslo pre odomknutie.', true);
      return;
    }

    showAuthStatus('Odomykam vault...');

    try {
      await sendRuntimeMessage({ type: 'UNLOCK_VAULT', passphrase });
      unlockedPassphrase = passphrase;
      els.unlockForm.reset();
      showAuthStatus('');
      await refreshVaultState();
    } catch (error) {
      showAuthStatus('Odomknutie zlyhalo. Skontroluj heslo.', true);
    }
  }

  function onAddProfile() {
    selectedId = null;
    fillForm(null);
    els.label.focus();
    renderList();
    showAppStatus('Novy profil: vypln udaje a klikni Ulozit.');
  }

  async function onSaveProfile(event) {
    event.preventDefault();

    const label = String(els.label.value || '').trim();
    if (!label) {
      showAppStatus('Nazov profilu je povinny.', true);
      els.label.focus();
      return;
    }

    if (!unlockedPassphrase) {
      showAppStatus('Vault uz nie je odomknuty. Odomkni ho znova.', true);
      await refreshVaultState();
      return;
    }

    const profile = {
      id: selectedId || generateId(label),
      label,
      data: collectFormData()
    };

    try {
      const response = await sendRuntimeMessage({
        type: 'SAVE_PROFILE',
        profile,
        passphrase: unlockedPassphrase
      });

      profiles = Array.isArray(response.profiles) ? response.profiles : profiles;
      selectedId = profile.id;
      renderList();
      fillForm(getSelectedProfile());
      showAppStatus('Profil bol zasifrovane ulozeny.');
    } catch (error) {
      unlockedPassphrase = '';
      showAppStatus(String(error.message || error), true);
      await refreshVaultState();
    }
  }

  async function onDeleteProfile() {
    const profile = getSelectedProfile();
    if (!profile) {
      showAppStatus('Najprv vyber profil na zmazanie.', true);
      return;
    }

    if (!unlockedPassphrase) {
      showAppStatus('Vault uz nie je odomknuty. Odomkni ho znova.', true);
      await refreshVaultState();
      return;
    }

    try {
      const response = await sendRuntimeMessage({
        type: 'DELETE_PROFILE',
        id: profile.id,
        passphrase: unlockedPassphrase
      });

      profiles = Array.isArray(response.profiles) ? response.profiles : [];
      selectedId = profiles[0]?.id || null;
      renderList();
      fillForm(getSelectedProfile());
      showAppStatus('Profil bol odstraneny z vaultu.');
    } catch (error) {
      unlockedPassphrase = '';
      showAppStatus(String(error.message || error), true);
      await refreshVaultState();
    }
  }

  async function onLockVault() {
    try {
      await sendRuntimeMessage({ type: 'LOCK_VAULT' });
      unlockedPassphrase = '';
      showAppStatus('');
      await refreshVaultState();
    } catch (error) {
      showAppStatus(String(error.message || error), true);
    }
  }

  async function init() {
    renderAuthView();

    try {
      await refreshVaultState();
    } catch (error) {
      showAuthStatus(String(error.message || error), true);
    }
  }

  els.setupForm.addEventListener('submit', onSetupSubmit);
  els.unlockForm.addEventListener('submit', onUnlockSubmit);
  els.addBtn.addEventListener('click', onAddProfile);
  els.form.addEventListener('submit', onSaveProfile);
  els.delBtn.addEventListener('click', onDeleteProfile);
  els.lockBtn.addEventListener('click', onLockVault);

  init();
})();
