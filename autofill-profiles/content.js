// content.js - Fills nearest form scope from extended profiles using heuristic field matching.
(() => {
  const STORAGE_KEY = 'profiles';
  const OVERWRITE_EXISTING = false;
  const FOCUS_SELECTOR = 'input, textarea';
  const FIELD_SELECTOR = 'input, textarea, select';
  const TEXT_INPUT_TYPES = new Set(['', 'text', 'email', 'tel', 'search', 'url', 'number', 'date']);
  const SKIP_INPUT_TYPES = new Set(['password', 'file', 'hidden', 'submit', 'button', 'reset']);
  const DATA_KEYS = [
    'firstName', 'middleName', 'lastName', 'fullName', 'nickName',
    'email', 'email2', 'phone', 'phone2',
    'company', 'jobTitle', 'address1', 'address2', 'city', 'state', 'zip', 'country',
    'birthDate', 'nationalId', 'taxId', 'passportNumber', 'iban', 'note'
  ];

  let popoverEl = null;
  let lastFocusedEl = null;
  let profilesCache = null;
  let previewItems = [];
  let rafScheduled = false;
  let openRequestId = 0;

  function openOptionsPageFromContent() {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response && response.ok) {
            resolve(true);
            return;
          }

          reject(new Error(response?.error || 'Failed to open options page.'));
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
    const labelText = getElementLabelText(el);
    return normalizeText(attrs.join(' ') + ' ' + labelText);
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
    if (includesAny(hint, ['middle name', 'second name', 'druhe meno', 'druh� meno', 'middle'])) return 'middleName';
    if (includesAny(hint, ['nickname', 'nick name', 'nick', 'prezyvka', 'prez�vka'])) return 'nickName';
    if (includesAny(hint, ['birth date', 'date of birth', 'dob', 'naroden', 'birthday', 'bday'])) return 'birthDate';
    if (includesAny(hint, ['passport'])) return 'passportNumber';
    if (includesAny(hint, ['iban', 'bank account', 'ucet', '�cet'])) return 'iban';
    if (includesAny(hint, ['vat', 'tax id', 'dic', 'dic', 'ico', 'ico', 'ic dph', 'ic dph'])) return 'taxId';
    if (includesAny(hint, ['national id', 'id number', 'birth number', 'rodne', 'rodn�'])) return 'nationalId';
    if (includesAny(hint, ['company', 'firma', 'organization'])) return 'company';
    if (includesAny(hint, ['job title', 'position', 'pozicia', 'poz�cia', 'title'])) return 'jobTitle';
    if (includesAny(hint, ['address2', 'address line 2', 'line2', 'apt', 'suite', 'unit', 'floor'])) return 'address2';
    if (includesAny(hint, ['state', 'region', 'kraj', 'okres'])) return 'state';
    if (includesAny(hint, ['country', 'krajina', 'stat', '�t�t'])) return 'country';
    if (includesAny(hint, ['note', 'poznamka', 'pozn�mka', 'comment', 'remark'])) return 'note';

    if (includesAny(hint, ['first name', 'firstname', 'given name', 'forename', 'krstne meno', 'krstn� meno'])) return 'firstName';
    if (includesAny(hint, ['last name', 'lastname', 'family name', 'surname', 'priezvisko'])) return 'lastName';
    if (includesAny(hint, ['full name', 'fullname', 'cele meno', 'cel� meno'])) return 'fullName';
    if (includesAny(hint, ['e-mail', 'email', 'mail'])) return 'email';
    if (includesAny(hint, ['phone', 'mobile', 'telephone', 'tel', 'telef', 'kontakt'])) return 'phone';
    if (includesAny(hint, ['address', 'street', 'ulica', 'adresa', 'line1', 'address1'])) return 'address1';
    if (includesAny(hint, ['city', 'town', 'mesto', 'obec'])) return 'city';
    if (includesAny(hint, ['zip', 'postal', 'post code', 'postcode', 'psc', 'psc'])) return 'zip';

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

  function emptyData() {
    const data = {};
    for (const key of DATA_KEYS) data[key] = '';
    return data;
  }

  function normalizeProfile(profile, index) {
    if (!profile || typeof profile !== 'object') return null;

    const srcData = (profile.data && typeof profile.data === 'object') ? profile.data : {};
    const data = emptyData();
    for (const key of DATA_KEYS) {
      data[key] = normalizeSpaces(srcData[key] ?? '');
    }

    return {
      id: String(profile.id || `profile-${index + 1}`),
      label: String(profile.label || `Profil ${index + 1}`),
      data
    };
  }

  function buildDerivedProfileData(profileData) {
    const next = { ...(profileData || {}) };
    const explicitFullName = normalizeSpaces(next.fullName || '');

    if (!explicitFullName) {
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

    return includesAny(hint, ['search', 'hladat', 'h\u013eada', 'vyhladat', 'vyh\u013eada', 'find']);
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
  function getFieldPreviewLabel(fieldType, field) {
    const labelText = normalizeSpaces(getElementLabelText(field));
    const placeholder = normalizeSpaces(field.getAttribute('placeholder') || '');
    const ariaLabel = normalizeSpaces(field.getAttribute('aria-label') || '');

    return labelText || placeholder || ariaLabel || fieldType;
  }

  function getFillPlan(profile, anchorEl = lastFocusedEl) {
    if (!anchorEl || !document.contains(anchorEl)) return [];

    const normalized = normalizeProfile(profile, 0);
    if (!normalized) return [];

    const profileData = buildDerivedProfileData(normalized.data);
    const scope = resolveFillScope(anchorEl);
    const fields = getFillableFields(scope);
    const seen = new Set();
    const plan = [];

    for (const field of fields) {
      if (!OVERWRITE_EXISTING && fieldHasUserValue(field)) continue;

      const fieldType = getFieldType(field);
      if (!fieldType || seen.has(fieldType)) continue;

      const value = getProfileValue(profileData, fieldType);
      if (!value) continue;

      seen.add(fieldType);
      plan.push({
        field,
        fieldType,
        label: getFieldPreviewLabel(fieldType, field),
        value
      });
    }

    return plan;
  }

  function getProfilePreviewText(profile, anchorEl = lastFocusedEl) {
    const plan = getFillPlan(profile, anchorEl);
    if (plan.length === 0) return 'V tomto formulari nie su ziadne doplnitelne udaje.';

    return plan
      .slice(0, 8)
      .map((entry) => `${entry.label}: ${entry.value}`)
      .join('\n');
  }

  function clearFieldPreview() {
    for (const item of previewItems) {
      item.overlay.remove();
    }
    previewItems = [];
  }

  function positionFieldPreview(item) {
    if (!document.contains(item.field)) {
      item.overlay.style.display = 'none';
      return;
    }

    const rect = item.field.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      item.overlay.style.display = 'none';
      return;
    }

    item.overlay.style.display = 'flex';
    item.overlay.style.left = `${Math.round(rect.left)}px`;
    item.overlay.style.top = `${Math.round(rect.top)}px`;
    item.overlay.style.width = `${Math.round(rect.width)}px`;
    item.overlay.style.height = `${Math.round(rect.height)}px`;
  }

  function showFieldPreview(profile, anchorEl = lastFocusedEl) {
    clearFieldPreview();

    const plan = getFillPlan(profile, anchorEl);
    for (const entry of plan) {
      const overlay = document.createElement('div');
      overlay.className = 'profile-autofiller-field-preview';
      overlay.textContent = entry.value;
      overlay.title = `${entry.label}: ${entry.value}`;

      const styles = window.getComputedStyle(entry.field);
      overlay.style.paddingTop = styles.paddingTop;
      overlay.style.paddingRight = styles.paddingRight;
      overlay.style.paddingBottom = styles.paddingBottom;
      overlay.style.paddingLeft = styles.paddingLeft;
      overlay.style.borderRadius = styles.borderRadius;
      overlay.style.font = styles.font;
      overlay.style.lineHeight = styles.lineHeight;
      overlay.style.letterSpacing = styles.letterSpacing;
      overlay.style.textAlign = styles.textAlign;
      overlay.style.whiteSpace = entry.field instanceof HTMLTextAreaElement ? 'pre-wrap' : 'nowrap';
      overlay.style.alignItems = entry.field instanceof HTMLTextAreaElement ? 'flex-start' : 'center';

      document.documentElement.appendChild(overlay);
      const item = { field: entry.field, overlay };
      previewItems.push(item);
      positionFieldPreview(item);
    }
  }

  function repositionFieldPreview() {
    for (const item of previewItems) {
      positionFieldPreview(item);
    }
  }
  function fillFromProfile(profile) {
    const anchorEl = lastFocusedEl;
    if (!anchorEl || !document.contains(anchorEl)) return false;

    const normalized = normalizeProfile(profile, 0);
    if (!normalized) return false;

    const profileData = buildDerivedProfileData(normalized.data);
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
    clearFieldPreview();
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
      repositionFieldPreview();
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

  async function loadProfiles() {
    if (profilesCache !== null) return profilesCache;

    const result = await chrome.storage.sync.get({ [STORAGE_KEY]: [] });
    const raw = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
    const normalized = raw.map((p, idx) => normalizeProfile(p, idx)).filter(Boolean);

    profilesCache = normalized;
    return profilesCache;
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
    editBtn.title = 'Upravi\u0165 profily';
    editBtn.setAttribute('aria-label', 'Upravi\u0165 profily');
    editBtn.textContent = '\u270e';
    editBtn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      try {
        await openOptionsPageFromContent();
      } catch (_error) {
        const optionsUrl = chrome.runtime.getURL('options.html');
        window.open(optionsUrl, '_blank', 'noopener');
      }

      closePopover();
    });

    head.append(title, editBtn);

    const list = document.createElement('div');
    list.className = 'profile-autofiller-list';

    const profiles = await loadProfiles();
    if (requestId !== openRequestId || lastFocusedEl !== el) return;

    if (profiles.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'profile-autofiller-empty';
      empty.textContent = '\u017diadne profily. Klikni \u270e a pridaj.';
      list.appendChild(empty);
    } else {
      for (const profile of profiles) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'profile-autofiller-btn';
        btn.textContent = profile.label;
        btn.addEventListener('mouseenter', () => {
          showFieldPreview(profile, el);
        });
        btn.addEventListener('mouseleave', () => {
          clearFieldPreview();
        });
        btn.addEventListener('focus', () => {
          showFieldPreview(profile, el);
        });
        btn.addEventListener('blur', () => {
          clearFieldPreview();
        });
        btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          fillFromProfile(profile);
          closePopover();
        });
        list.appendChild(btn);
      }
    }

    popover.append(head, list);
    document.documentElement.appendChild(popover);
    popoverEl = popover;
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

  function onStorageChanged(changes, area) {
    if (area !== 'sync' || !changes[STORAGE_KEY]) return;

    const next = Array.isArray(changes[STORAGE_KEY].newValue) ? changes[STORAGE_KEY].newValue : [];
    profilesCache = next.map((p, idx) => normalizeProfile(p, idx)).filter(Boolean);
  }

  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('scroll', scheduleReposition, true);
  window.addEventListener('resize', scheduleReposition, true);
  chrome.storage.onChanged.addListener(onStorageChanged);
})();
