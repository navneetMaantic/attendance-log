document.addEventListener("DOMContentLoaded", () => {
  // Hardcoded XPath expression
  const presentXPath = "//span[@tooltip='Present']"; //multi elements
  const selectedMonthXPath = "//button[contains(@class,'active')]/span";
  const monthsXpath = "//div[@aria-label='months']/button"; //7 elements
  //button[@class='btn btn-link ng-star-inserted active']/span[@class='ng-star-inserted']"; 

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: getAllMonths,
      args: [monthsXpath]
    }, (results) => {
      const { buttonTexts } = results[0].result;

      // Dynamically create radio buttons for each span text
      const optionsContainer = document.getElementById("options");
      buttonTexts.forEach((text, index) => {
        const label = document.createElement("label");
        label.textContent = text;

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "spanTextOptions";
        radio.value = text;
        radio.id = `option-${index}`;
        // Add event listener to display a message when this option is selected
        radio.addEventListener("change", () => {
          // document.getElementById("message").textContent = `You selected: ${text}`;
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: clickMonth,
            args: [text]
          });

          // Introduce a delay before executing 'countPresent'
          setTimeout(() => {
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: countPresent,
              args: [presentXPath]
            }, async (results) => {
              const { count, textMonth } = await results[0].result;
              if (textMonth) {
                document.getElementById("result").textContent = `Total hrs for ${textMonth}: ${count * 8}`;
              } else {
                document.getElementById("message2").textContent = `Failed to fetch selected month`;
              }
            });
          }, 2000); // Delay of 5 seconds

        });

        label.prepend(radio);
        optionsContainer.appendChild(label);
        optionsContainer.appendChild(document.createElement("br"));
      });
    });
  });
});



function getAllMonths(monthsXpath) {
  // Pull text from monthsXpath buttons
  const monthEle = document.evaluate(monthsXpath, document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
  const buttonTexts = []; // Array to store the text of each monthsXpath
  let node;
  while ((node = monthEle.iterateNext())) {
    if (node.textContent) {
      buttonTexts.push(node.textContent.trim()); // Collect the text content of each button
    }
  }

  return { buttonTexts };
}

function clickMonth(strMonthSel) {
  buttonXPath = "//button[contains(@class,'btn btn-link')]/span[text()='" + strMonthSel + "']";
  // click on tab button of months
  const button = document.evaluate(buttonXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  button.click();
}


function countPresent(presentXPath) {
  return new Promise((resolve) => {
    // Define a function to retry fetching the selected month
    function getSelectedMonth() {
      const selectedMonthXPath2 = "//button[contains(@class,'active')]/span";
      const textElement = document.evaluate(selectedMonthXPath2, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      const textMonth = textElement ? textElement.textContent : null;

      if (textMonth) {
        // Once the month is found, count 'present' elements
        const iterator = document.evaluate(presentXPath, document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let count = 0;
        while (iterator.iterateNext()) {
          count++;
        }
        resolve({ count, textMonth });
      } else {
        // Retry after a short delay if the month isn't found yet
        setTimeout(getSelectedMonth, 500);
      }
    }

    // Initial call to fetch the selected month
    getSelectedMonth();
  });
}

