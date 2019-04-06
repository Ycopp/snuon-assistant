document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#config').addEventListener('click', () => {
    window.open(chrome.runtime.getURL('options.html'));
  });

  document.querySelector('#about').addEventListener('click', () => {
    window.open('https://www.facebook.com/permalink.php?story_fbid=127490438357751&id=100032903859782');
  });
});
