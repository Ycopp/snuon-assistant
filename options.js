const tcDefaults = {
  speed: 1.0,
  rememberSpeed: false,
  startHidden: false,
  enableSeek: false,
  goYoutube: false,
  keyBindings: {
    display: { key: 65 }, // A
    slower: { key: 88, value: 0.1 }, // X
    faster: { key: 67, value: 0.1 }, // C
    rewind: { key: 37, value: 10 }, // ←
    advance: { key: 39, value: 10 }, // →
    reset: { key: 90 }, // Z
    fast: { key: 86, value: 1.8 }, // V
    pause: { key: 32 }, // Space
  },
};

let keyBindings = {};

const keyCodeAliases = {
  0: '지정 안 됨',
  null: '지정 안 됨',
  undefined: '지정 안 됨',
  32: 'Space',
  37: '←',
  38: '↑',
  39: '→',
  40: '↓',
  96: 'Num 0',
  97: 'Num 1',
  98: 'Num 2',
  99: 'Num 3',
  100: 'Num 4',
  101: 'Num 5',
  102: 'Num 6',
  103: 'Num 7',
  104: 'Num 8',
  105: 'Num 9',
  106: 'Num *',
  107: 'Num +',
  109: 'Num -',
  110: 'Num .',
  111: 'Num /',
  186: ';',
  188: '<',
  189: '-',
  187: '+',
  190: '>',
  191: '/',
  192: '~',
  219: '[',
  220: '\\',
  221: ']',
  222: '\'',
};

function recordKeyPress(e) {
  if (
    (e.keyCode >= 48 && e.keyCode <= 57) // Numbers 0-9
    || (e.keyCode >= 65 && e.keyCode <= 90) // Letters A-Z
    || keyCodeAliases[e.keyCode] // Other character keys
  ) {
    e.target.value = keyCodeAliases[e.keyCode] || String.fromCharCode(e.keyCode);
    e.target.keyCode = e.keyCode;

    e.preventDefault();
    e.stopPropagation();
  } else if (e.keyCode === 229 && /^Key[A-Z]$/.test(e.code)) { // Hangul
    e.target.value = e.code[3];
    e.target.keyCode = e.code.charCodeAt(3);

    e.preventDefault();
    e.stopPropagation();
  } else if (e.keyCode === 8 || e.keyCode === 27) { // Clear input
    e.target.value = '지정 안 됨';
    e.target.keyCode = null;
  }
}

function setStatus(text) {
  const status = document.getElementById('status');
  status.textContent = text;
  setTimeout(() => {
    status.textContent = '';
  }, 1000);
}

function inputFocus(e) {
  e.target.value = '';
}

function inputBlur(e) {
  e.target.value = keyCodeAliases[e.target.keyCode] || String.fromCharCode(e.target.keyCode);
}

function updateShortcutInputText(inputId, keyCode) {
  document.getElementById(inputId).value = keyCodeAliases[keyCode] || String.fromCharCode(keyCode);
  document.getElementById(inputId).keyCode = keyCode;
}

function createKeyBindings(item) {
  const action = item.id;
  const key = item.keyCode;
  const valueInput = document.getElementById(`${action}Value`);
  let value;
  if (valueInput) {
    value = Number(valueInput.value);
  }
  keyBindings[action] = { key, value };
}

// Saves options to chrome.storage
function saveOptions() {
  keyBindings = {};
  Array.from(document.querySelectorAll('.key')).forEach(createKeyBindings);

  const rememberSpeed = document.getElementById('rememberSpeed').checked;
  const startHidden = document.getElementById('startHidden').checked;
  const enableSeek = document.getElementById('enableSeek').checked;
  const goYoutube = document.getElementById('goYoutube').checked;

  chrome.storage.sync.set({
    rememberSpeed,
    startHidden,
    keyBindings,
    enableSeek,
    goYoutube,
  }, () => {
    setStatus('설정이 저장되었습니다.');
  });
}

// Restores options from chrome.storage
function restoreOptions() {
  chrome.storage.sync.get(tcDefaults, (storage) => {
    document.getElementById('rememberSpeed').checked = storage.rememberSpeed;
    document.getElementById('startHidden').checked = storage.startHidden;
    document.getElementById('enableSeek').checked = storage.enableSeek;
    document.getElementById('goYoutube').checked = storage.goYoutube;

    for (const action in storage.keyBindings) {
      const item = storage.keyBindings[action];
      updateShortcutInputText(action, item.key);
      const valueInput = document.getElementById(`${action}Value`);
      if (valueInput) {
        valueInput.value = item.value;
      }
    }
  });
}

function restoreDefaults() {
  chrome.storage.sync.set(tcDefaults, () => {
    restoreOptions();
    setStatus('설정이 초기화되었습니다.');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();

  document.getElementById('save').addEventListener('click', saveOptions);
  document.getElementById('restore').addEventListener('click', restoreDefaults);

  function eventCaller(event, className, funcName) {
    if (event.target.classList.contains(className)) {
      funcName(event);
    }
  }

  document.addEventListener('focus', (event) => {
    eventCaller(event, 'key', inputFocus);
  }, true);
  document.addEventListener('blur', (event) => {
    eventCaller(event, 'key', inputBlur);
  }, true);
  document.addEventListener('keydown', (event) => {
    eventCaller(event, 'key', recordKeyPress);
  });
});
