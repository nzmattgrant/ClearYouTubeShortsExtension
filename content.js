const historyUrl = 'youtube.com/feed/history';
const rowContainerElementName = 'ytd-reel-shelf-renderer';
const rowElementName = "yt-horizontal-list-renderer";
const rowItemElementName = 'ytm-shorts-lockup-view-model';
const notDismissedRowItemSelector = `${rowItemElementName}:not(.dismissed)`;
const dropDownButtonClassSelector = `${rowItemElementName} .yt-spec-button-shape-next`;
const dropDownButtonImageClassSelector = `${dropDownButtonClassSelector} yt-icon .yt-icon-shape svg`;
const buttonPlaceholderClass= 'button-placeholder-clear-youtube-history';
const buttonPlaceholderClassSelector = '.' + buttonPlaceholderClass;
const shelfRowHeaderSelector = 'h2.style-scope.' + rowContainerElementName;
const allDropDownButtonsSelector = `${rowElementName} ${dropDownButtonClassSelector}`;
const removeButtonSelector = '.yt-core-attributed-string';


function createDeletedOverlay(targetElement) {
  // Create the overlay div
  const overlay = document.createElement('div');
  
  // Style the overlay
  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.fontSize = '24px';
  overlay.style.fontWeight = 'bold';
  overlay.style.color = 'black';
  
  // Set the text content
  overlay.textContent = 'DELETED';
  
  // Make sure the target element has position: relative
  targetElement.style.position = 'relative';
  
  // Append the overlay to the target element
  targetElement.appendChild(overlay);
}

// Function to inject a button after each section
const awaitTimeout = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

function anyButtonsOnSection(section) {
  const nextElement = section.nextElementSibling;
  return nextElement && nextElement.tagName === 'BUTTON' && nextElement.textContent.trim() === 'Clear row';
}

function anyDropDownButtonsLoaded() {
  return (
    Array.from(
      document.querySelectorAll(dropDownButtonImageClassSelector)
    ).length > 0
  );
}

function addButtonIntoSection(section) {
  if (anyButtonsOnSection(section)) {
    return;
  }
  section.parentNode
    .querySelectorAll(buttonPlaceholderClassSelector)
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
    .querySelectorAll(buttonPlaceholderClassSelector)
    .forEach((element) => element.remove());
  const button = document.createElement('div');
  button.textContent = 'Waiting for UI to load...';
  button.classList.add(buttonPlaceholderClass);
  section.parentNode.insertBefore(button, section.nextSibling);
}

function injectButton() {
  if(!location.href.includes(historyUrl)) {
    return;
  }
  const sections = document.querySelectorAll(shelfRowHeaderSelector);
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

async function handleClick(event) {
  const clickedElement = event.target;
  const clearRowSegment = async () => {
    const closestRowContainer = clickedElement.closest(rowContainerElementName);
    var rowItems = Array.from(
      closestRowContainer.querySelectorAll(notDismissedRowItemSelector)
    );
    if (rowItems.length == 0) {
      return;
    }
      
    const visibleItemFilter = (item) => {
      const rowContainer = item.closest(rowContainerElementName);
      const itemRect = item.getBoundingClientRect();
      const rowContainerRendererRect = rowContainer.getBoundingClientRect();
      return itemRect.left < rowContainerRendererRect.right;
    };

    rowItems = rowItems.filter(visibleItemFilter);

    for (const item of rowItems) {
      if (!item) {
        continue;
      }
      let button = item.querySelector(dropDownButtonClassSelector);
      let count = 0;
      while (!button && count < 10) {
        item.scrollIntoViewIfNeeded();
        await awaitTimeout(100);
        button = item.querySelector(dropDownButtonClassSelector);
        count++;
      }
      button.click();
      await awaitTimeout(100);
      Array.from(document.querySelectorAll(removeButtonSelector))
        .find((e) => e.textContent === 'Remove from watch history')
        .click();
      await awaitTimeout(10);
      item.classList.add('dismissed');
      createDeletedOverlay(item);
    }
    const nextButtonShape = closestRowContainer.querySelector('#right-arrow yt-button-shape');
    if (nextButtonShape) {
      // const stillVisibleRowElements = closestRowContainer.querySelectorAll(rowItemElementName).filter(visibleItemFilter);
      // if(stillVisibleRowElements.length > 0) {
      //   clearRowSegment();
      //   return;
      // }
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
    const sections = document.querySelectorAll(shelfRowHeaderSelector);
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
