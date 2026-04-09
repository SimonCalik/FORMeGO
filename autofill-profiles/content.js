// content.js - Shows secure profile picker and requests decrypted profile data only on explicit user action.
(() => {
  const OVERWRITE_EXISTING = false;
  const FOCUS_SELECTOR = 'input, textarea';
  const FIELD_SELECTOR = 'input, textarea, select';
  const TEXT_INPUT_TYPES = new Set(['', 'text', 'email', 'tel', 'search', 'url', 'number', 'date']);
  const SKIP_INPUT_TYPES = new Set(['password', 'file', 'hidden', 'submit', 'button', 'reset']);

  let popoverEl = null;
  let lastFocusedEl = null;
  let rafScheduled = false;
  let openRequestId = 0;

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

  function normalizeText(value) {
    return String(value || '').toLowerCase().trim();
  }

  function normalizeSpaces(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function autocompleteTokens(el) {
    return normalizeText(el.getAttribute('autocomplete') || '')
      .split(/\s+/)
      .filter(Boolean);
  }

  function isFocusableTarget(el) {
    if (!(el instanceof HTMLElement)) return false;
    if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
    if (!(el instanceof HTMLInputElement)) return false;

    const type = normalizeText(el.type);
    if (SKIP_INPUT_TYPES.has(type) || !TEXT_INPUT_TYPES.has(type)) return false;
    return !el.readOnly && !el.disabled;
  }

  function isUsableField(el) {
    if (!(el instanceof HTMLElement)) return false;
    if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
    if (el instanceof HTMLSelectElement) return !el.disabled;
    if (!(el instanceof HTMLInputElement)) return false;

    const type = normalizeText(el.type);
    if (SKIP_INPUT_TYPES.has(type) || !TEXT_INPUT_TYPES.has(type)) return false;
    return !el.readOnly && !el.disabled;
  }

  function getElementLabelText(el) {
    const parts = [];

    if (el.id) {
      const labels = Array.from(document.querySelectorAll('label[for]'));
      for (const label of labels) {
        if ((label.getAttribute('for') || '') === el.id) {
          parts.push(label.textContent || '');
        }
      }
    }

    const wrappingLabel = el.closest('label');
    if (wrappingLabel) parts.push(wrappingLabel.textContent || '');

    return normalizeText(parts.join(' '));
  }

  function getFieldHintText(el) {
    const attrs = [
      el.getAttribute('name') || '',
      el.getAttribute('id') || '',
      el.getAttribute('placeholder') || '',
      el.getAttribute('aria-label') || '',
      el.getAttribute('data-testid') || '',
      el.getAttribute('data-test') || '',
      el.getAttribute('data-qa') || '',
      el.getAttribute('data-field') || ''
    ];
    return normalizeText(`${attrs.join(' ')} ${getElementLabelText(el)}`);
  }

  function includesAny(text, tokens) {
    return tokens.some((token) => text.includes(token));
  }

  function getFieldType(el) {
    const auto = autocompleteTokens(el);

    if (auto.includes('given-name')) return 'firstName';
    if (auto.includes('additional-name')) return 'middleName';
    if (auto.includes('family-name')) return 'lastName';
    if (auto.includes('nickname')) return 'nickName';
    if (auto.includes('name')) return 'fullName';
    if (auto.includes('email')) return 'email';
    if (auto.includes('tel')) return 'phone';
    if (auto.includes('organization')) return 'company';
    if (auto.includes('organization-title')) return 'jobTitle';
    if (auto.includes('street-address') || auto.includes('address-line1')) return 'address1';
    if (auto.includes('address-line2')) return 'address2';
    if (auto.includes('address-level2')) return 'city';
    if (auto.includes('address-level1')) return 'state';
    if (auto.includes('postal-code')) return 'zip';
    if (auto.includes('country') || auto.includes('country-name')) return 'country';
    if (auto.includes('bday')) return 'birthDate';

    const hint = getFieldHintText(el);

    if (includesAny(hint, ['alternate email', 'secondary email', 'email2', 'backup email'])) return 'email2';
    if (includesAny(hint, ['alternate phone', 'secondary phone', 'phone2', 'backup phone'])) return 'phone2';
    if (includesAny(hint, ['middle name', 'second name', 'druhe meno', 'druhe meno', 'middle'])) return 'middleName';
    if (includesAny(hint, ['nickname', 'nick name', 'nick', 'prezyvka', 'prezyvka'])) return 'nickName';
    if (includesAny(hint, ['birth date', 'date of birth', 'dob', 'naroden', 'birthday', 'bday'])) return 'birthDate';
    if (includesAny(hint, ['passport'])) return 'passportNumber';
    if (includesAny(hint, ['iban', 'bank account', 'ucet', 'ucet'])) return 'iban';
    if (includesAny(hint, ['vat', 'tax id', 'dic', 'ico', 'ic dph'])) return 'taxId';
    if (includesAny(hint, ['national id', 'id number', 'birth number', 'rodne'])) return 'nationalId';
    if (includesAny(hint, ['company', 'firma', 'organization'])) return 'company';
    if (includesAny(hint, ['job title', 'position', 'pozicia', 'title'])) return 'jobTitle';
    if (includesAny(hint, ['address2', 'address line 2', 'line2', 'apt', 'suite', 'unit', 'floor'])) return 'address2';
    if (includesAny(hint, ['state', 'region', 'kraj', 'okres'])) return 'state';
    if (includesAny(hint, ['country', 'krajina', 'stat'])) return 'country';
    if (includesAny(hint, ['note', 'poznamka', 'comment', 'remark'])) return 'note';

    if (includesAny(hint, ['first name', 'firstname', 'given name', 'forename', 'krstne meno'])) return 'firstName';
    if (includesAny(hint, ['last name', 'lastname', 'family name', 'surname', 'priezvisko'])) return 'lastName';
    if (includesAny(hint, ['full name', 'fullname', 'cele meno'])) return 'fullName';
    if (includesAny(hint, ['e-mail', 'email', 'mail'])) return 'email';
    if (includesAny(hint, ['phone', 'mobile', 'telephone', 'tel', 'telef', 'kontakt'])) return 'phone';
    if (includesAny(hint, ['address', 'street', 'ulica', 'adresa', 'line1', 'address1'])) return 'address1';
    if (includesAny(hint, ['city', 'town', 'mesto', 'obec'])) return 'city';
    if (includesAny(hint, ['zip', 'postal', 'post code', 'postcode', 'psc'])) return 'zip';

    return null;
  }

  function getNativeValueSetter(el) {
    if (el instanceof HTMLTextAreaElement) {
      return Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set || null;
    }
    if (el instanceof HTMLInputElement) {
      return Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set || null;
    }
    return null;
  }

  function setTextLikeValue(el, value) {
    const setter = getNativeValueSetter(el);
    if (setter) setter.call(el, value);
    else el.value = value;

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setSelectValue(selectEl, targetValue) {
    const normalizedTarget = normalizeText(targetValue);
    if (!normalizedTarget) return false;

    const options = Array.from(selectEl.options || []);
    if (options.length === 0) return false;

    let matched = options.find((opt) => normalizeText(opt.value) === normalizedTarget);
    if (!matched) matched = options.find((opt) => normalizeText(opt.textContent) === normalizedTarget);
    if (!matched) {
      matched = options.find((opt) => {
        const text = normalizeText(opt.textContent);
        const value = normalizeText(opt.value);
        return text.includes(normalizedTarget) || (text && normalizedTarget.includes(text)) || value.includes(normalizedTarget);
      });
    }
    if (!matched) return false;

    selectEl.value = matched.value;
    selectEl.dispatchEvent(new Event('input', { bubbles: true }));
    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function buildDerivedProfileData(profileData) {
    const next = { ...(profileData || {}) };
    if (!normalizeSpaces(next.fullName || '')) {
      next.fullName = normalizeSpaces(`${next.firstName || ''} ${next.middleName || ''} ${next.lastName || ''}`);
    }
    return next;
  }

  function getProfileValue(profileData, key) {
    return normalizeSpaces(profileData?.[key] || '');
  }

  function fieldHasUserValue(el) {
    return normalizeText(el.value) !== '';
  }

  function getNearestContainerScope(anchorEl) {
    const roleForm = anchorEl.closest('[role="form"]');
    if (roleForm) return roleForm;

    let current = anchorEl.parentElement;
    while (current && current !== document.body && current !== document.documentElement) {
      if (current.matches('div, section, article, main, fieldset')) {
        const count = current.querySelectorAll(FOCUS_SELECTOR).length;
        if (count >= 2) return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  function resolveFillScope(anchorEl) {
    const form = anchorEl.closest('form');
    if (form) return form;

    const container = getNearestContainerScope(anchorEl);
    if (container) return container;

    return document;
  }

  function getFillableFields(scope) {
    return Array.from(scope.querySelectorAll(FIELD_SELECTOR)).filter(isUsableField);
  }

  function isLikelySearchField(el) {
    if (!(el instanceof HTMLElement)) return false;

    const type = normalizeText(el.getAttribute('type') || '');
    const auto = autocompleteTokens(el);
    const hint = getFieldHintText(el);
    const name = normalizeText(el.getAttribute('name') || '');

    if (type === 'search') return true;
    if (auto.includes('search')) return true;
    if (name === 'q' || name === 'query' || name === 'search') return true;

    return includesAny(hint, ['search', 'hladat', 'vyhladat', 'find']);
  }

  function shouldOfferAutofill(anchorEl) {
    if (isLikelySearchField(anchorEl)) return false;

    const scope = anchorEl.closest('form') || getNearestContainerScope(anchorEl);
    if (!scope) return false;

    const fields = getFillableFields(scope);
    if (fields.length < 2) return false;

    let recognizedCount = 0;
    let hasAnotherRecognizedField = false;

    for (const field of fields) {
      const fieldType = getFieldType(field);
      if (!fieldType) continue;

      recognizedCount += 1;
      if (field !== anchorEl) hasAnotherRecognizedField = true;

      if (recognizedCount >= 2 && hasAnotherRecognizedField) {
        return true;
      }
    }

    return false;
  }

  function fillFromProfile(profile) {
    const anchorEl = lastFocusedEl;
    if (!anchorEl || !document.contains(anchorEl) || !profile) return false;

    const profileData = buildDerivedProfileData(profile.data || {});
    const scope = resolveFillScope(anchorEl);
    const fields = getFillableFields(scope);
    let changes = 0;

    for (const field of fields) {
      if (!OVERWRITE_EXISTING && fieldHasUserValue(field)) continue;

      const fieldType = getFieldType(field);
      if (!fieldType) continue;

      const value = getProfileValue(profileData, fieldType);
      if (!value) continue;

      let didSet = false;
      if (field instanceof HTMLSelectElement) {
        if (fieldType === 'city' || fieldType === 'country' || fieldType === 'state') {
          didSet = setSelectValue(field, value);
        }
      } else {
        setTextLikeValue(field, value);
        didSet = true;
      }

      if (didSet) changes += 1;
    }

    return changes > 0;
  }

  function closePopover() {
    if (popoverEl) {
      popoverEl.remove();
      popoverEl = null;
    }
  }

  function scheduleReposition() {
    if (!popoverEl || !lastFocusedEl || rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      repositionPopover();
    });
  }

  function repositionPopover() {
    if (!popoverEl || !lastFocusedEl || !document.body.contains(lastFocusedEl)) return;

    const rect = lastFocusedEl.getBoundingClientRect();
    const margin = 8;
    const width = popoverEl.offsetWidth || 220;
    let left = rect.right - width;
    let top = rect.bottom + margin;

    if (left < margin) {
      left = Math.min(rect.left, window.innerWidth - width - margin);
    }

    const height = popoverEl.offsetHeight || 130;
    if (top + height > window.innerHeight - margin) {
      const above = rect.top - height - margin;
      top = above >= margin ? above : Math.max(margin, window.innerHeight - height - margin);
    }

    popoverEl.style.left = `${Math.round(left)}px`;
    popoverEl.style.top = `${Math.round(top)}px`;
  }

  function renderStateMessage(listEl, text) {
    const empty = document.createElement('div');
    empty.className = 'profile-autofiller-empty';
    empty.textContent = text;
    listEl.appendChild(empty);
  }

  async function openPopoverFor(el) {
    const requestId = ++openRequestId;
    lastFocusedEl = el;
    closePopover();

    const popover = document.createElement('div');
    popover.className = 'profile-autofiller-popover';

    const head = document.createElement('div');
    head.className = 'profile-autofiller-head';

    const title = document.createElement('div');
    title.className = 'profile-autofiller-title';
    title.textContent = 'Vyber profil';

    const editBtn = document.createElement('button');
    editBtn.className = 'profile-autofiller-edit';
    editBtn.type = 'button';
    editBtn.title = 'Upraviť profily';
    editBtn.setAttribute('aria-label', 'Upraviť profily');
    editBtn.textContent = '✎';
    editBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      try {
        await sendRuntimeMessage({ type: 'OPEN_OPTIONS_PAGE' });
      } catch (_error) {
        window.open(chrome.runtime.getURL('options.html'), '_blank', 'noopener');
      }

      closePopover();
    });

    head.append(title, editBtn);

    const list = document.createElement('div');
    list.className = 'profile-autofiller-list';

    popover.append(head, list);
    document.documentElement.appendChild(popover);
    popoverEl = popover;
    repositionPopover();

    let vaultStatus;
    try {
      const statusResponse = await sendRuntimeMessage({ type: 'GET_VAULT_STATUS' });
      vaultStatus = statusResponse.status;
    } catch (_error) {
      vaultStatus = null;
    }

    if (requestId !== openRequestId || lastFocusedEl !== el || !popoverEl) return;

    if (!vaultStatus) {
      renderStateMessage(list, 'Vault nie je dostupný. Klikni ✎ a otvor nastavenia.');
      repositionPopover();
      return;
    }

    if (!vaultStatus.hasVault && !vaultStatus.hasLegacyPlain) {
      renderStateMessage(list, 'Bezpečný vault nie je nastavený. Klikni ✎ a vytvor heslo.');
      repositionPopover();
      return;
    }

    if (!vaultStatus.unlocked) {
      renderStateMessage(list, 'Vault je zamknutý. Klikni ✎ a odomkni profily.');
      repositionPopover();
      return;
    }

    const profilesResponse = await sendRuntimeMessage({ type: 'GET_PROFILE_SUMMARIES' }).catch(() => ({ profiles: null }));
    if (requestId !== openRequestId || lastFocusedEl !== el || !popoverEl) return;

    const profiles = Array.isArray(profilesResponse.profiles) ? profilesResponse.profiles : [];
    if (profiles.length === 0) {
      renderStateMessage(list, 'Žiadne profily. Klikni ✎ a pridaj.');
      repositionPopover();
      return;
    }

    for (const profile of profiles) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'profile-autofiller-btn';
      btn.textContent = profile.label;
      btn.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        try {
          const response = await sendRuntimeMessage({ type: 'GET_PROFILE_DATA', id: profile.id });
          fillFromProfile(response.profile);
        } catch (_error) {
          await sendRuntimeMessage({ type: 'OPEN_OPTIONS_PAGE' }).catch(() => {
            window.open(chrome.runtime.getURL('options.html'), '_blank', 'noopener');
          });
        }

        closePopover();
      });

      list.appendChild(btn);
    }

    repositionPopover();
  }

  function onFocusIn(event) {
    const el = event.target;
    if (popoverEl && popoverEl.contains(el)) return;

    if (!isFocusableTarget(el) || !shouldOfferAutofill(el)) {
      closePopover();
      return;
    }

    openPopoverFor(el).catch(() => {
      closePopover();
    });
  }

  function onPointerDown(event) {
    const target = event.target;
    if (!popoverEl) return;

    if (popoverEl.contains(target)) return;
    if (lastFocusedEl && lastFocusedEl === target) return;

    closePopover();
  }

  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('scroll', scheduleReposition, true);
  window.addEventListener('resize', scheduleReposition, true);
})();
