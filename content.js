const historyUrl = 'youtube.com/feed/history';
const rowContainerElementName = 'ytd-reel-shelf-renderer';
const rowElementName = "yt-horizontal-list-renderer";
const rowItemElementName = 'ytm-shorts-lockup-view-model';
const notDismissedRowItemSelector = `${rowItemElementName}:not(.dismissed)`;
const dropDownButtonClassSelector = `${rowItemElementName} .yt-spec-button-shape-next`;
const dropDownButtonImageClassSelector = `${dropDownButtonClassSelector} .yt-icon-shape svg`;
const buttonPlaceholderClass= 'button-placeholder-clear-youtube-history';
const buttonPlaceholderClassSelector = '.' + buttonPlaceholderClass;
const shelfRowHeaderSelector = 'h2.style-scope.' + rowContainerElementName;
const allDropDownButtonsSelector = `${rowElementName} ${dropDownButtonClassSelector}`;
const removeButtonSelector = '.yt-core-attributed-string';
const deleteAllButtonClass = 'delete-all-youtube-shorts-button';
const deleteAllButtonSelector = `.${deleteAllButtonClass}`;

function deleteAll() {
  const scrollAndClearShorts = async () => {
    let previousCount = 0;
    let unchangedIterations = 0;
    let previousScrollY = window.scrollY;
    
    // We use a flag to control the loop instead of setInterval ID
    let isRunning = true;

    const deleteAllButton = document.querySelector(deleteAllButtonSelector);
    let spinner = null;
    if (deleteAllButton) {
      // Create a spinner element
      spinner = document.createElement('div');
      spinner.classList.add('spinner');
      spinner.style.width = '24px';
      spinner.style.height = '24px';
      spinner.style.border = '4px solid #f3f3f3';
      spinner.style.borderTop = '4px solid #3498db';
      spinner.style.borderRadius = '50%';
      spinner.style.animation = 'spin 1s linear infinite';
      spinner.style.margin = '0 auto';

      // Insert the spinner after the deleteAllButton
      deleteAllButton.parentNode.insertBefore(spinner, deleteAllButton.nextSibling);

      // Add keyframes for spinner animation
      const style = document.createElement('style');
      style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      `;
      document.head.appendChild(style);

      deleteAllButton.parentNode.removeChild(deleteAllButton);
    }

    const resetButton = () => {
      isRunning = false; // Stop the loop
      if (spinner && deleteAllButton) {
        // Only re-insert if removed
        if (spinner.parentNode) {
             spinner.parentNode.insertBefore(deleteAllButton, spinner);
             spinner.parentNode.removeChild(spinner);
        }
      }
    };

    // Use a while loop instead of setInterval for robust sequential execution
    while (isRunning) {
      let actionTaken = false;

      // 1. Find a container that HAS the button ready. This prevents selecting loading skeletons.
      const allContainers = document.querySelectorAll(rowContainerElementName);
      const targetContainer = Array.from(allContainers).find(container => {
        const btn = container.querySelector('button');
        return btn && btn.textContent.trim() === 'Clear row';
      });

      if (targetContainer) {
        const clearRowButton = targetContainer.querySelector('button');
        
        // Scroll the specific row into view
        targetContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await awaitTimeout(500);
        
        // CRITICAL FIX: Update scroll position tracking immediately so we don't abort
        previousScrollY = window.scrollY;

        clearRowButton.click();
        
        // Mark that we did work, so we don't scroll the page down this iteration
        actionTaken = true;

        const startTime = Date.now();
        // Wait for removal, but with a shorter timeout to prevent permanent hanging
        while (document.body.contains(targetContainer) && (Date.now() - startTime) < 10000) {
           await awaitTimeout(500);
        }
      }

      // 2. If we didn't delete anything, Scroll the page down to load more
      if (!actionTaken) {
        window.scrollBy(0, window.innerHeight);
        await awaitTimeout(2000); // Allow time for YouTube to load new rows

        const currentCount = document.querySelectorAll("ytd-video-renderer").length;
        console.log(`Current count of videos: ${currentCount}`);
        console.log('Scrolling and checking for new videos...');

        const currentScrollY = window.scrollY;
        
        // Check for manual user interrupt (scrolling up significantly)
        // We add a small buffer (10px) to ignore minor browser adjustments
        if (currentScrollY < previousScrollY - 20) {
          console.log("User scrolled up, stopping.");
          resetButton();
          break;
        }

        if (currentScrollY > previousScrollY) {
            // We moved down successfully
            previousScrollY = currentScrollY;
            unchangedIterations = 0;
        } else if (currentCount !== previousCount) {
             // We didn't move (maybe end of page) but content count changed
             previousCount = currentCount;
             unchangedIterations = 0;
        } else {
             // No movement, no new content
             unchangedIterations++;
             if (unchangedIterations >= 10) {
                 resetButton();
                 break;
             }
        }
      } else {
          // If we took an action, reset the "stuck" counter
          unchangedIterations = 0;
      }
    }
  };

  scrollAndClearShorts();
}

function waitForActionsRenderer() {
  const checkInterval = setInterval(() => {
    const actionsRenderer = document.querySelector('ytd-browse-feed-actions-renderer');
    if (actionsRenderer) {
      clearInterval(checkInterval);
      insertDeleteAllButton(actionsRenderer);
    }
  }, 500);
}

function insertDeleteAllButton(actionsRenderer) {
  const deleteAllButton = document.createElement('button');
  deleteAllButton.textContent = 'Delete All YouTube Shorts (beta)';
  deleteAllButton.classList.add(deleteAllButtonClass);
  deleteAllButton.style.background = '#ff4d4f';
  deleteAllButton.style.color = '#fff';
  deleteAllButton.style.border = 'none';
  deleteAllButton.style.borderRadius = '4px';
  deleteAllButton.style.padding = '8px 16px';
  deleteAllButton.style.margin = '8px 0';
  deleteAllButton.style.cursor = 'pointer';
  deleteAllButton.style.fontWeight = 'bold';
  deleteAllButton.style.fontSize = '14px';
  deleteAllButton.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
  deleteAllButton.style.transition = 'background 0.2s';
  deleteAllButton.onmouseover = () => deleteAllButton.style.background = '#d9363e';
  deleteAllButton.onmouseout = () => deleteAllButton.style.background = '#ff4d4f';
  deleteAllButton.addEventListener('click', deleteAll);

  actionsRenderer.appendChild(deleteAllButton);
}

waitForActionsRenderer();

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
  button.style.background = '#ff4d4f';
  button.style.color = '#fff';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.padding = '8px 16px';
  button.style.margin = '8px 0';
  button.style.cursor = 'pointer';
  button.style.fontWeight = 'bold';
  button.style.fontSize = '14px';
  button.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
  button.style.transition = 'background 0.2s';
  button.onmouseover = () => button.style.background = '#d9363e';
  button.onmouseout = () => button.style.background = '#ff4d4f';
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
      closestRowContainer.remove();
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
      const removeButton = Array.from(document.querySelectorAll(removeButtonSelector))
        .find((e) => e.textContent === 'Remove from watch history');
      if (removeButton) {
        removeButton.click();
        await awaitTimeout(10);
        item.classList.add('dismissed');
        createDeletedOverlay(item);

      } else {
        console.warn('Remove button not found.');
      }
    }
    const nextButtonShape = closestRowContainer.querySelector('#right-arrow yt-button-shape');
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
