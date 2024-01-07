//if we are on the youtube history page then show the option to clear the shorts
//if we click the button then we inject the button next to the shorts logo:
//<button style="margin-left: 20px">Clear shorts from row</button>
//when we click the button we clear the shorts from the row


chrome.alarms.onAlarm.addListener(function() {
  chrome.browserAction.setBadgeText({text: ''});
  chrome.notifications.create({
    type: 'basic',
    title: 'Stretch Reminder',
    iconUrl: 'stretch.jpg',
    message: 'Time to stretch and relax',
    requireInteraction: true
  })
});
