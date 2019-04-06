  var tc = {
    settings: {
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
    }
  };

  chrome.storage.sync.get(tc.settings, function (storage) {
    tc.settings = storage;
    initializeWhenReady(document);
  });

  var forEach = Array.prototype.forEach;

  function defineVideoController() {
    tc.videoController = function(target, parent) {
      if (target.dataset['vscid']) {
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

      target.addEventListener('play', function(event) {
        target.playbackRate = tc.settings.speed;
      });

      target.addEventListener('ratechange', function(event) {
        // Ignore ratechange events on unitialized videos.
        // 0 == No information is available about the media resource.
        if (event.target.readyState > 0) {
          var speed = this.getSpeed();
          this.speedIndicator.textContent = speed;
          tc.settings.speed = speed;
          chrome.storage.sync.set({'speed': speed});
        }
      }.bind(this));

      target.playbackRate = tc.settings.speed;
    };

    tc.videoController.prototype.getSpeed = function() {
      return parseFloat(this.video.playbackRate).toFixed(2);
    }

    tc.videoController.prototype.remove = function() {
      this.parentElement.removeChild(this);
    }

    tc.videoController.prototype.initializeControls = function() {
      var document = this.document;
      var speed = parseFloat(tc.settings.speed).toFixed(2),
        top = Math.max(this.video.offsetTop, 0) + "px",
        left = Math.max(this.video.offsetLeft, 0) + "px";

      var wrapper = document.createElement('div');
      wrapper.classList.add('vsc-controller');
      wrapper.dataset['vscid'] = this.id;
      wrapper.addEventListener('pointerdown', e => e.stopPropagation());

      if (tc.settings.startHidden) {
        wrapper.classList.add('vsc-hidden');
      }

      var shadow = wrapper.attachShadow({ mode: 'open' });
      var shadowTemplate = `
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
        runAction(e.target.dataset['action'], document, false, e);
      });

      forEach.call(shadow.querySelectorAll('button'), function(button) {
        button.onclick = (e) => {
          var action = e.target.dataset['action'];
          runAction(action, document, tc.settings.keyBindings[action].value, e);
        }
      });

      this.speedIndicator = shadow.querySelector('span');
      var fragment = document.createDocumentFragment();
      fragment.appendChild(wrapper);

      this.video.dataset['vscid'] = this.id;

      this.parent.insertBefore(fragment, this.parent.firstChild);
    }
  }

  function initializeWhenReady(document) {
    escapeStringRegExp.matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
    function escapeStringRegExp(str) {
      return str.replace(escapeStringRegExp.matchOperatorsRe, '\\$&');
    }

    window.onload = () => {
      initializeNow(window.document)
    };
    if (document) {
      if (document.readyState === "complete") {
        initializeNow(document);
      } else {
        document.onreadystatechange = () => {
          if (document.readyState === "complete") {
            initializeNow(document);
          }
        }
      }
    }
  }
  function inIframe () {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }
  function initializeNow(document) {
      // enforce init-once due to redundant callers
      if (!document.body || document.body.classList.contains('vsc-initialized')) {
        return;
      }
      document.body.classList.add('vsc-initialized');

      if (tc.settings.enableSeek) {
        var s = document.createElement('script');
        s.textContent = "$(function(){jwplayer().off('seek')})";
        (document.head || document.documentElement).appendChild(s);
      }

      if (document === window.document) {
        defineVideoController();
      } else {
        var link = document.createElement('link');
        link.href = chrome.runtime.getURL('inject.css');
        link.type = 'text/css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      var docs = Array(document)
      try {
        if (inIframe())
          docs.push(window.top.document);
      } catch (e) {
      }

      docs.forEach(function(doc) {
        doc.addEventListener('keydown', function(event) {
          var keyCode = event.keyCode;

          // Ignore if following modifier is active.
          if (!event.getModifierState
              || event.getModifierState("Alt")
              || event.getModifierState("Control")
              || event.getModifierState("Fn")
              || event.getModifierState("Meta")
              || event.getModifierState("Hyper")
              || event.getModifierState("OS")) {
            return;
          }

          // Ignore keydown event if typing in an input box
          if (document.activeElement.nodeName === 'INPUT'
              || document.activeElement.nodeName === 'TEXTAREA'
              || document.activeElement.isContentEditable) {
            return false;
          }

          // Ignore keydown event if typing in a page without vsc
          if (!document.querySelector(".vsc-controller")) {
            return false;
          }

          var action;
          for (var item in tc.settings.keyBindings) {
            if (tc.settings.keyBindings[item].key === keyCode) {
              action = item;
            }
          }
          if (action) {
            runAction(action, document, tc.settings.keyBindings[action].value);
          }

          return false;
        }, true);
      });

      function checkForVideo(node, parent, added) {
        if (node.nodeName === 'VIDEO') {
          if (added) {
            new tc.videoController(node, parent);
          } else {
            let id = node.dataset['vscid'];
            if (id) {
              let ctrl = document.querySelector(`div[data-vscid="${id}"]`)
              if (ctrl) {
                ctrl.remove();
              }
              delete node.dataset['vscid'];
            }
          }
        } else if (node.children != undefined) {
          for (var i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            checkForVideo(child, child.parentNode || parent, added);
          }
        }
      }

      var observer = new MutationObserver(function(mutations) {
        // Process the DOM nodes lazily
        requestIdleCallback(_ => {
          mutations.forEach(function(mutation) {
            forEach.call(mutation.addedNodes, function(node) {
              if (typeof node === "function")
                return;
              checkForVideo(node, node.parentNode || mutation.target, true);
            });
            forEach.call(mutation.removedNodes, function(node) {
              if (typeof node === "function")
                return;
              checkForVideo(node, node.parentNode || mutation.target, false);
            });
          });
        }, {timeout: 1000});
      });
      observer.observe(document, { childList: true, subtree: true });

      var videoTags = document.getElementsByTagName('video');
      forEach.call(videoTags, function(video) {
        new tc.videoController(video);
      });

      var frameTags = document.getElementsByTagName('iframe');
      forEach.call(frameTags, function(frame) {
        if (tc.settings.goYoutube) {
          var match = /youtube\.com\/(?:v|embed)\/([a-zA-Z0-9_-]+)/.exec(frame.src);
          if (match != null) {
              location.href = 'https://youtube.com/watch?v=' + match[1];
          }
        }

        // Ignore frames we don't have permission to access (different origin).
        try { var childDocument = frame.contentDocument } catch (e) { return }
        initializeWhenReady(childDocument);
      });
  }

  function runAction(action, document, value, e) {
    var videoTags = document.getElementsByTagName('video');
    videoTags.forEach = Array.prototype.forEach;

    videoTags.forEach(function(v) {
      var id = v.dataset['vscid'];
      var controller = document.querySelector(`div[data-vscid="${id}"]`);

      showController(controller);

      if (!v.classList.contains('vsc-cancelled')) {
        if (action === 'rewind') {
          v.currentTime -= value;
        } else if (action === 'advance') {
          v.currentTime += value;
        } else if (action === 'faster') {
          // Maximum playback speed in Chrome is set to 16:
          // https://cs.chromium.org/chromium/src/third_party/WebKit/Source/core/html/media/HTMLMediaElement.cpp?l=168
          var s = Math.min((v.playbackRate < 0.1 ? 0.0 : v.playbackRate) + value, 16);
          v.playbackRate = Number(s.toFixed(2));
        } else if (action === 'slower') {
          // Video min rate is 0.0625:
          // https://cs.chromium.org/chromium/src/third_party/WebKit/Source/core/html/media/HTMLMediaElement.cpp?l=167
          var s = Math.max(v.playbackRate - value, 0.07);
          v.playbackRate = Number(s.toFixed(2));
        } else if (action === 'reset') {
          v.playbackRate = 1.0;
        } else if (action === 'display') {
          controller.classList.add('vsc-manual');
          controller.classList.toggle('vsc-hidden');
        } else if (action === 'drag') {
          handleDrag(v, controller, e);
        } else if (action === 'fast') {
          v.playbackRate = Number(s.toFixed(2));
        } else if (action === 'pause') {
          if (v.paused) {
            v.play()
          } else {
            v.pause();
          }
        }
      }
    });
  }

  function handleDrag(video, controller, e) {
    const shadowController = controller.shadowRoot.querySelector('#controller');

    // Find nearest parent of same size as video parent.
    var parentElement = controller.parentElement;
    while (parentElement.parentNode &&
      parentElement.parentNode.offsetHeight === parentElement.offsetHeight &&
      parentElement.parentNode.offsetWidth === parentElement.offsetWidth) {
      parentElement = parentElement.parentNode;
    }

    video.classList.add('vcs-dragging');
    shadowController.classList.add('dragging');

    const initialMouseXY = [e.clientX, e.clientY];
    const initialControllerXY = [
      parseInt(shadowController.style.left),
      parseInt(shadowController.style.top)
    ];

    const startDragging = (e) => {
      let style = shadowController.style;
      let dx = e.clientX - initialMouseXY[0];
      let dy = e.clientY -initialMouseXY[1];
      style.left = (initialControllerXY[0] + dx) + 'px';
      style.top  = (initialControllerXY[1] + dy) + 'px';
    }

    const stopDragging = () => {
      parentElement.removeEventListener('mousemove', startDragging);
      parentElement.removeEventListener('mouseup', stopDragging);
      parentElement.removeEventListener('mouseleave', stopDragging);

      shadowController.classList.remove('dragging');
      video.classList.remove('vcs-dragging');
    }

    parentElement.addEventListener('mouseup',stopDragging);
    parentElement.addEventListener('mouseleave',stopDragging);
    parentElement.addEventListener('mousemove', startDragging);
  }

  var timer;
  var animation = false;
  function showController(controller) {
    controller.classList.add('vcs-show');

    if (animation)
      clearTimeout(timer);

    animation = true;
    timer = setTimeout(function() {
      controller.classList.remove('vcs-show');
      animation = false;
    }, 2000);
  }
