document.addEventListener('DOMContentLoaded', function () {
  document.querySelector('#config').addEventListener('click', function() {
    window.open(chrome.runtime.getURL("options.html"));
  });

  document.querySelector('#about').addEventListener('click', function() {
    window.open("https://www.facebook.com/permalink.php?story_fbid=127490438357751&id=100032903859782");
  });
});
