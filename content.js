const historyUrl = 'youtube.com/feed/history';

// Function to inject a button after each section
const awaitTimeout = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

function anyButtonsOnSection(section) {
  const nextElement = section.nextElementSibling;
  return nextElement && nextElement.tagName === 'BUTTON' && nextElement.textContent.trim() === 'Clear row';
}

function anyDropDownButtonsLoaded() {
  return (
    Array.from(
      document.querySelectorAll(
        'ytd-reel-item-renderer:not([is-dismissed]) #dismissible ytd-menu-renderer yt-icon-button button'
      )
    ).length > 0
  );
}

function addButtonIntoSection(section) {
  if (anyButtonsOnSection(section)) {
    return;
  }
  section.parentNode
    .querySelectorAll('.button-placeholder-clear-youtube-history')
    .forEach((element) => element.remove());
  const button = document.createElement('button');
  button.textContent = 'Clear row';
  section.parentNode.insertBefore(button, section.nextSibling);

  button.addEventListener('click', handleClick); // Add click event listener to the button
}

function addButtonPlaceholderIntoSection(section) {
  if (anyButtonsOnSection(section)) {
    return;
  }
  section.parentNode
    .querySelectorAll('.button-placeholder-clear-youtube-history')
    .forEach((element) => element.remove());
  const button = document.createElement('div');
  button.textContent = 'Waiting for UI to load...';
  button.classList.add('button-placeholder-clear-youtube-history');
  section.parentNode.insertBefore(button, section.nextSibling);
}

function injectButton() {
  if(!location.href.includes(historyUrl)) {
    return;
  }
  const sections = document.querySelectorAll('h2.style-scope.ytd-reel-shelf-renderer');
  //dropdowns are loaded
  if (anyDropDownButtonsLoaded()) {
    sections.forEach(addButtonIntoSection);
    return;
  }
  sections.forEach(addButtonPlaceholderIntoSection);
  let timeoutCount = 0;
  const recursiveTimeout = () => {
    timeoutCount++;
    if (anyDropDownButtonsLoaded()) {
      sections.forEach(addButtonIntoSection);
      return;
    }
    if (timeoutCount < 120) {
      setTimeout(recursiveTimeout, 1000);
    }
  };
  setTimeout(recursiveTimeout, 1000);
}

// Function to handle button click
async function handleClick(event) {
  const clickedElement = event.target;
  const clearRowSegment = async () => {
    const closestShelfRenderer = clickedElement.closest('ytd-reel-shelf-renderer');
    var notDismissed = Array.from(
      closestShelfRenderer.querySelectorAll('ytd-reel-item-renderer:not([is-dismissed]) #dismissible')
    );
    if (notDismissed.length == 0) {
      return;
    }

    notDismissed = notDismissed.filter((item) => {
      const horizontalListRenderer = item.closest('yt-horizontal-list-renderer');
      const itemRect = item.getBoundingClientRect();
      const horizontalListRendererRect = horizontalListRenderer.getBoundingClientRect();
      return itemRect.left < horizontalListRendererRect.right;
    });

    for (const item of notDismissed) {
      if (!item) {
        continue;
      }
      let button = item.querySelector('ytd-menu-renderer yt-icon-button button');
      let count = 0;
      while (!button && count < 10) {
        item.scrollIntoView();
        await awaitTimeout(100);
        button = item.querySelector('ytd-menu-renderer yt-icon-button button');
        count++;
      }
      button.click();
      await awaitTimeout(100);
      Array.from(document.querySelectorAll('yt-formatted-string'))
        .find((e) => e.textContent === 'Remove from watch history')
        .click();
      await awaitTimeout(10);
    }
    const nextButtonShape = closestShelfRenderer.querySelector('#right-arrow yt-button-shape');
    if (nextButtonShape) {
      const firstButton = nextButtonShape.querySelector('button');
      if (firstButton) {
        firstButton.click();
        await awaitTimeout(100);
        clearRowSegment();
      }
    }
  };
  clearRowSegment();
}

function runExtension() {
  const intervalId = setInterval(() => {
    let anySectionsMissingButton = false;
    const sections = document.querySelectorAll('h2.style-scope.ytd-reel-shelf-renderer');
    for (const section of sections) {
      const buttons = section.querySelectorAll('button');
      const clearButton = Array.from(buttons).find((button) => button.textContent === 'Clear row');
      if (!clearButton) {
        anySectionsMissingButton = true;
        break;
      }
    }
    if (anySectionsMissingButton) {
      injectButton();
    } else {
      clearInterval(intervalId);
    }
  }, 1000);
}

let lastUrl = location.href;
// Run the extension when the page loads
if (lastUrl.includes(historyUrl)) {
  setTimeout(runExtension, 1000);
}

// Listen for URL changes
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    if (url.includes(historyUrl)) {
      runExtension();
    }
  }
}).observe(document, { subtree: true, childList: true });

// Event listener to handle newly loaded sections
window.addEventListener('scroll', injectButton, { passive: true });
