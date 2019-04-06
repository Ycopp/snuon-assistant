const tc = {
  settings: {
    speed: 1.0,
    rememberSpeed: false,
    startHidden: false,
    enableSeek: false,
    goYoutube: false,
    keyBindings: {
      display: { key: 86 }, // V
      slower: { key: 88, value: 0.1 }, // X
      faster: { key: 66, value: 0.1 }, // B
      rewind: { key: 37, value: 10 }, // ←
      advance: { key: 39, value: 10 }, // →
      reset: { key: 90 }, // Z
      fast: { key: 71, value: 1.8 }, // G
      pause: { key: 32 }, // Space
    },
  },
};

chrome.storage.sync.get(tc.settings, (storage) => {
  tc.settings = storage;
  initializeWhenReady(document);
});

const forEach = Array.prototype.forEach;

function defineVideoController() {
  tc.videoController = function (target, parent) {
    if (target.dataset.vscid) {
      return;
    }

    this.video = target;
    this.parent = target.parentElement || parent;
    this.document = target.ownerDocument;
    this.id = Math.random().toString(36).substr(2, 9);
    if (!tc.settings.rememberSpeed) {
      tc.settings.speed = 1.0;
    }
    this.initializeControls();

    target.addEventListener('play', () => {
      target.playbackRate = tc.settings.speed;
    });

    target.addEventListener('ratechange', (event) => {
      // Ignore ratechange events on unitialized videos.
      // 0 == No information is available about the media resource.
      if (event.target.readyState > 0) {
        const speed = this.getSpeed();
        this.speedIndicator.textContent = speed;
        tc.settings.speed = speed;
        chrome.storage.sync.set({ speed });
      }
    });

    target.playbackRate = tc.settings.speed;
  };

  tc.videoController.prototype.getSpeed = function () {
    return parseFloat(this.video.playbackRate).toFixed(2);
  };

  tc.videoController.prototype.remove = function () {
    this.parentElement.removeChild(this);
  };

  tc.videoController.prototype.initializeControls = function () {
    const document = this.document;
    const speed = parseFloat(tc.settings.speed).toFixed(2);
    const top = `${Math.max(this.video.offsetTop, 0)}px`;
    const left = `${Math.max(this.video.offsetLeft, 0)}px`;

    const wrapper = document.createElement('div');
    wrapper.classList.add('vsc-controller');
    wrapper.dataset.vscid = this.id;
    wrapper.addEventListener('pointerdown', e => e.stopPropagation());

    if (tc.settings.startHidden) {
      wrapper.classList.add('vsc-hidden');
    }

    const shadow = wrapper.attachShadow({ mode: 'open' });
    const shadowTemplate = `
        <style>
          @import "${chrome.runtime.getURL('shadow.css')}";
        </style>

        <div id="controller" style="top:${top}; left:${left}">
          <span data-action="drag" class="draggable">${speed}</span>
          <span id="controls">
            <button data-action="rewind" class="rw">«</button>
            <button data-action="slower">-</button>
            <button data-action="faster">+</button>
            <button data-action="advance" class="rw">»</button>
            <button data-action="display" class="hideButton">x</button>
          </span>
        </div>
      `;
    shadow.innerHTML = shadowTemplate;
    shadow.querySelector('.draggable').addEventListener('mousedown', (e) => {
      runAction(e.target.dataset.action, document, false, e);
    });

    forEach.call(shadow.querySelectorAll('button'), (button) => {
      button.onclick = (e) => {
        const action = e.target.dataset.action;
        runAction(action, document, tc.settings.keyBindings[action].value, e);
      };
    });

    this.speedIndicator = shadow.querySelector('span');
    const fragment = document.createDocumentFragment();
    fragment.appendChild(wrapper);

    this.video.dataset.vscid = this.id;

    this.parent.insertBefore(fragment, this.parent.firstChild);
  };
}

function initializeWhenReady(document) {
  escapeStringRegExp.matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
  function escapeStringRegExp(str) {
    return str.replace(escapeStringRegExp.matchOperatorsRe, '\\$&');
  }

  window.onload = () => {
    initializeNow(window.document);
  };
  if (document) {
    if (document.readyState === 'complete') {
      initializeNow(document);
    } else {
      document.onreadystatechange = () => {
        if (document.readyState === 'complete') {
          initializeNow(document);
        }
      };
    }
  }
}

function initializeNow(document) {
  // enforce init-once due to redundant callers
  if (!document.body || document.body.classList.contains('vsc-initialized')) {
    return;
  }
  document.body.classList.add('vsc-initialized');

  if (tc.settings.enableSeek) {
    const s = document.createElement('script');
    s.textContent = "$(function(){jwplayer().off('seek')})";
    (document.head || document.documentElement).appendChild(s);
  }

  if (document === window.document) {
    defineVideoController();
  } else {
    const link = document.createElement('link');
    link.href = chrome.runtime.getURL('inject.css');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  document.addEventListener('keydown', (event) => {
    const keyCode = event.keyCode;

    // Ignore if following modifier is active.
    if (!event.getModifierState
            || event.getModifierState('Alt')
            || event.getModifierState('Control')
            || event.getModifierState('Fn')
            || event.getModifierState('Meta')
            || event.getModifierState('Hyper')
            || event.getModifierState('OS')) {
      return;
    }

    // Ignore keydown event if typing in an input box
    if (document.activeElement.nodeName === 'INPUT'
            || document.activeElement.nodeName === 'TEXTAREA'
            || document.activeElement.isContentEditable) {
      return;
    }

    // Ignore keydown event if typing in a page without vsc
    if (!document.querySelector('.vsc-controller')) {
      return;
    }

    let action;
    for (const item in tc.settings.keyBindings) {
      if (tc.settings.keyBindings[item].key === keyCode) {
        action = item;
      }
    }
    if (action) {
      runAction(action, document, tc.settings.keyBindings[action].value);
    }
  }, true);

  function checkForVideo(node, parent, added) {
    if (node.nodeName === 'VIDEO') {
      if (added) {
        new tc.videoController(node, parent);
      } else {
        const id = node.dataset.vscid;
        if (id) {
          const ctrl = document.querySelector(`div[data-vscid="${id}"]`);
          if (ctrl) {
            ctrl.remove();
          }
          delete node.dataset.vscid;
        }
      }
    } else if (node.children != null) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        checkForVideo(child, child.parentNode || parent, added);
      }
    }
  }

  const observer = new MutationObserver(((mutations) => {
    // Process the DOM nodes lazily
    requestIdleCallback(() => {
      mutations.forEach((mutation) => {
        forEach.call(mutation.addedNodes, (node) => {
          if (typeof node === 'function') {
            return;
          }
          checkForVideo(node, node.parentNode || mutation.target, true);
        });
        forEach.call(mutation.removedNodes, (node) => {
          if (typeof node === 'function') {
            return;
          }
          checkForVideo(node, node.parentNode || mutation.target, false);
        });
      });
    }, { timeout: 1000 });
  }));
  observer.observe(document, { childList: true, subtree: true });

  const videoTags = document.getElementsByTagName('video');
  forEach.call(videoTags, (video) => {
    new tc.videoController(video);
  });

  const frameTags = document.getElementsByTagName('iframe');
  forEach.call(frameTags, (frame) => {
    if (tc.settings.goYoutube) {
      const match = /youtube\.com\/(?:v|embed)\/([a-zA-Z0-9_-]+)/.exec(frame.src);
      if (match != null) {
        location.href = `https://youtube.com/watch?v=${match[1]}`;
      }
    }
  });
}

function runAction(action, document, value, e) {
  const videoTags = document.getElementsByTagName('video');
  videoTags.forEach = Array.prototype.forEach;

  videoTags.forEach((v) => {
    const id = v.dataset.vscid;
    const controller = document.querySelector(`div[data-vscid="${id}"]`);

    showController(controller);

    if (!v.classList.contains('vsc-cancelled')) {
      switch (action) {
        case 'rewind':
          v.currentTime -= value;
          break;
        case 'advance':
          v.currentTime += value;
          break;
        case 'faster': {
          // Maximum playback speed in Chrome is set to 16:
          // https://cs.chromium.org/chromium/src/third_party/WebKit/Source/core/html/media/HTMLMediaElement.cpp?l=168
          const s = Math.min((v.playbackRate < 0.1 ? 0.0 : v.playbackRate) + value, 16);
          v.playbackRate = Number(s.toFixed(2));
          break;
        }
        case 'slower': {
          // Video min rate is 0.0625:
          // https://cs.chromium.org/chromium/src/third_party/WebKit/Source/core/html/media/HTMLMediaElement.cpp?l=167
          const s = Math.max(v.playbackRate - value, 0.07);
          v.playbackRate = Number(s.toFixed(2));
          break;
        }
        case 'reset':
          v.playbackRate = 1.0;
          break;
        case 'display':
          controller.classList.add('vsc-manual');
          controller.classList.toggle('vsc-hidden');
          break;
        case 'drag':
          handleDrag(v, controller, e);
          break;
        case 'fast':
          v.playbackRate = Number(value.toFixed(2));
          break;
        case 'pause':
          if (v.paused) {
            v.play();
          } else {
            v.pause();
          }
          break;
      }
    }
  });
}

function handleDrag(video, controller, e) {
  const shadowController = controller.shadowRoot.querySelector('#controller');

  // Find nearest parent of same size as video parent.
  let parentElement = controller.parentElement;
  while (parentElement.parentNode
      && parentElement.parentNode.offsetHeight === parentElement.offsetHeight
      && parentElement.parentNode.offsetWidth === parentElement.offsetWidth) {
    parentElement = parentElement.parentNode;
  }

  video.classList.add('vcs-dragging');
  shadowController.classList.add('dragging');

  const initialMouseXY = [e.clientX, e.clientY];
  const initialControllerXY = [
    parseInt(shadowController.style.left),
    parseInt(shadowController.style.top),
  ];

  const startDragging = (ev) => {
    const style = shadowController.style;
    const dx = ev.clientX - initialMouseXY[0];
    const dy = ev.clientY - initialMouseXY[1];
    style.left = `${initialControllerXY[0] + dx}px`;
    style.top = `${initialControllerXY[1] + dy}px`;
  };

  const stopDragging = () => {
    parentElement.removeEventListener('mousemove', startDragging);
    parentElement.removeEventListener('mouseup', stopDragging);
    parentElement.removeEventListener('mouseleave', stopDragging);

    shadowController.classList.remove('dragging');
    video.classList.remove('vcs-dragging');
  };

  parentElement.addEventListener('mouseup', stopDragging);
  parentElement.addEventListener('mouseleave', stopDragging);
  parentElement.addEventListener('mousemove', startDragging);
}

let timer;
let animation = false;
function showController(controller) {
  controller.classList.add('vcs-show');

  if (animation) {
    clearTimeout(timer);
  }

  animation = true;
  timer = setTimeout(() => {
    controller.classList.remove('vcs-show');
    animation = false;
  }, 2000);
}
