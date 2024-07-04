// Function to inject a button after each section
const awaitTimeout = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

function addButtonIntoSection(section) {
  const nextElement = section.nextElementSibling;
  if (nextElement && nextElement.tagName === 'BUTTON' && nextElement.textContent.trim() === 'Clear row') {
    return; // Skip if the next element is already a button with "Clear row" text
  }
  const button = document.createElement('button');
  button.textContent = 'Clear row';
  section.parentNode.insertBefore(button, section.nextSibling);

  button.addEventListener('click', handleClick); // Add click event listener to the button
}

function injectButton() {
  const sections = document.querySelectorAll('h2.style-scope.ytd-reel-shelf-renderer');
  sections.forEach((section) => {
    addButtonIntoSection(section);
    // const intervalId = setInterval(() => {
    //   console.log('Checking if section is loaded');
    //   let isLoaded = false;
    //   const notDismissedItems = Array.from(section.querySelectorAll('ytd-reel-item-renderer:not([is-dismissed]) #dismissible'));
    //   console.log('Checking not dismissed', notDismissedItems);
    //   notDismissedItems.forEach((item) => {
    //     console.log('Checking if item is loaded inside section');
    //     const dropdown = item.querySelector('ytd-menu-renderer yt-icon-button button');
    //     isLoaded = isLoaded || !!dropdown;
    //   });
    //   if (isLoaded) {
        
    //     clearInterval(intervalId);
    //   }
    // }, 1000);
  });
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
  console.log('Running extension');
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
const historyUrl = 'youtube.com/feed/history';
// Run the extension when the page loads
if (lastUrl.includes(historyUrl)) {
  runExtension();
}

// Listen for URL changes
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    console.log('urls changed', url, lastUrl);
    lastUrl = url;
    if (url.includes(historyUrl)) {
      runExtension();
    }
  }
}).observe(document, { subtree: true, childList: true });

// Event listener to handle newly loaded sections
window.addEventListener('scroll', injectButton, { passive: true });
