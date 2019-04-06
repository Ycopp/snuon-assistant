var tcDefaults = {
  speed: 1.0,
  rememberSpeed: false,
  startHidden: false,
  enableSeek: false,
  goYoutube: false,
  keyBindings: {
    display: {key: 86},            // V
    slower: {key: 88, value: 0.1}, // X
    faster: {key: 66, value: 0.1}, // B
    rewind: {key: 37, value: 10},  // ←
    advance: {key: 39, value: 10}, // →
    reset: {key: 90},              // Z
    fast: {key: 71, value: 1.8},   // G
    pause: {key: 32}               // Space
  }
};

var keyBindings = {};

var keyCodeAliases = {
  0: 'null',
  null: 'null',
  undefined: 'null',
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
}

function recordKeyPress(e) {
  if (
    (e.keyCode >= 48 && e.keyCode <= 57)    // Numbers 0-9
    || (e.keyCode >= 65 && e.keyCode <= 90) // Letters A-Z
    || keyCodeAliases[e.keyCode]            // Other character keys
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
    e.target.value = 'null';
    e.target.keyCode = null;
  }
};

function inputFilterNumbersOnly(e) {
  var char = String.fromCharCode(e.keyCode);
  if (!/[\d\.]$/.test(char) || !/^\d+(\.\d*)?$/.test(e.target.value + char)) {
    e.preventDefault();
    e.stopPropagation();
  }
};

function setStatus(text) {
  var status = document.getElementById('status');
  status.textContent = text;
  setTimeout(function() {
    status.textContent = '';
  }, 1000);
}

function inputFocus(e) {
   e.target.value = "";
};

function inputBlur(e) {
  e.target.value = keyCodeAliases[e.target.keyCode] || String.fromCharCode(e.target.keyCode);
};

function updateShortcutInputText(inputId, keyCode) {
  document.getElementById(inputId).value = keyCodeAliases[keyCode] || String.fromCharCode(keyCode);
  document.getElementById(inputId).keyCode = keyCode;
}

function createKeyBindings(item) {
  var action = item.id;
  var key = item.keyCode;
  var valueInput = document.getElementById(action + "Value");
  var value;
  if (valueInput) {
    value = Number(valueInput.value);
  }
  keyBindings[action] = {key: key, value: value};
}

// Saves options to chrome.storage
function save_options() {
  keyBindings = {};
  Array.from(document.querySelectorAll(".key")).forEach(createKeyBindings); // Remove added shortcuts

  var rememberSpeed = document.getElementById('rememberSpeed').checked;
  var startHidden = document.getElementById('startHidden').checked;
  var enableSeek = document.getElementById('enableSeek').checked;
  var goYoutube = document.getElementById('goYoutube').checked;

  chrome.storage.sync.set({
    rememberSpeed: rememberSpeed,
    startHidden: startHidden,
    keyBindings: keyBindings,
    enableSeek: enableSeek,
    goYoutube: goYoutube
  }, function() {
    setStatus('설정이 저장되었습니다.');
  });
}

// Restores options from chrome.storage
function restore_options() {
  chrome.storage.sync.get(tcDefaults, function(storage) {
    document.getElementById('rememberSpeed').checked = storage.rememberSpeed;
    document.getElementById('startHidden').checked = storage.startHidden;
    document.getElementById('enableSeek').checked = storage.enableSeek;
    document.getElementById('goYoutube').checked = storage.goYoutube;

    for (var action in storage.keyBindings) {
      var item = storage.keyBindings[action];
      updateShortcutInputText(action, item["key"]);
      var valueInput = document.getElementById(action + "Value");
      if (valueInput) {
        valueInput.value = item["value"];
      }
    }
  });
}

function restore_defaults() {
  chrome.storage.sync.set(tcDefaults, function() {
    restore_options();
    setStatus('설정이 초기화되었습니다.');
  });
}

function initShortcutInput(inputId) {
  document.getElementById(inputId).addEventListener('focus', inputFocus);
  document.getElementById(inputId).addEventListener('blur', inputBlur);
  document.getElementById(inputId).addEventListener('keydown', recordKeyPress);
}

document.addEventListener('DOMContentLoaded', function () {
  restore_options();

  document.getElementById('save').addEventListener('click', save_options);
  document.getElementById('restore').addEventListener('click', restore_defaults);

  function eventCaller(event, className, funcName) {
    if (!event.target.classList.contains(className)) {
      return
    }
    funcName(event);
  }

  document.addEventListener('keypress', (event) => {
    eventCaller(event, "customValue", inputFilterNumbersOnly)
  });
  document.addEventListener('focus', (event) => {
    eventCaller(event, "key", inputFocus)
  }, true);
  document.addEventListener('blur', (event) => {
    eventCaller(event, "key", inputBlur)
  }, true);
  document.addEventListener('keydown', (event) => {
    eventCaller(event, "key", recordKeyPress)
  });
})
