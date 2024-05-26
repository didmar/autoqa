// ==UserScript==
// @name         AutoQA Flashcards Generator
// @version      2024-05-26
// @description  Generates flashcards for each section of an article, using Mistral AI's API and Orbit (https://github.com/andymatuschak/orbit)
// @author       Didier Marin
// @match        http://*/*
// @match        https://*/*
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

// Replace the API key with your own
const apiKey = 'YOUR_API_KEY_HERE';
const apiEndpoint = 'https://api.mistral.ai/v1/chat/completions';
const model = 'mistral-small-latest';

// Define the minimum average section length to determine
// the optimal heading level for flashcard generation
const minAvgSectionLength = 1024;

// Define the minimum length for a section to be considered for
// flashcard generation
const minSectionLength = 512;

const prompt = `
Please generate a few comprehension questions and their answers for the following text.
The output should be a JSON object like this:
{"flashcards":[{"question": "<generated question>", "answer": "<corresponding answer>"}]}.
Here is the text: {textContent}
`

// Custom CSS for the spinner
customCSS = `
  .flashcards-generator-spinner {
    border: 16px solid #f3f3f3;
    border-radius: 50%;
    border-top: 16px solid #3498db;
    width: 60px;
    height: 60px;
    animation: flashcards-generator-spin 2s linear infinite;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  @keyframes flashcards-generator-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

/**
 * When the button is clicked, send a request to the Mistral API to generate flashcards for the section's content
 * and display them using the Orbit Web Component
 * @param {*} textContent The text content of the section
 */
function onClick(textContent) {
    // Hide the button and show a spinner instead
    this.style.display = 'none';
    const spinner = document.createElement('div');
    spinner.className = 'flashcards-generator-spinner';
    this.insertAdjacentElement('afterbegin', spinner);

    // Check if the Orbit Web Component script has been loaded
    const orbitScriptURL = "https://js.withorbit.com/orbit-web-component.js"
    const orbitScriptLoaded = document.querySelector(`script[src="${orbitScriptURL}"]`);
    if (!orbitScriptLoaded) {
      console.log('Orbit script not loaded. Loading it now...');
      GM_xmlhttpRequest({
        method : "GET",
        url : orbitScriptURL,
        onload : (ev) =>
        {
          let e = document.createElement('script');
          e.innerText = ev.responseText;
          document.head.appendChild(e);
        }
      });
    }

    const requestBody = {
      model,
      messages: [
          {
              role: "user",
              content: prompt.replace('{textContent}', textContent)
          }
      ],
      response_format: {
          type: "json_object"
      },
      temperature: 0.1,
      top_p: 1,
      max_tokens: 512,
      stream: false,
      safe_prompt: false,
      random_seed: 1337
    };

    GM_xmlhttpRequest({
        method: "POST",
        url: apiEndpoint,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        data: JSON.stringify(requestBody),
        onload: (response) => {
            const responseData = JSON.parse(response.responseText);
            console.log('responseData:', responseData);
            const messageData = JSON.parse(responseData.choices[0].message.content)
            console.log('messageData:', messageData);
            const flashcards = messageData.flashcards || [];
            let flashcardsHtml = '';

            flashcards.forEach(flashcard => {
                flashcardsHtml += `
                    <orbit-prompt
                        question="${flashcard.question}"
                        answer="${flashcard.answer}"
                    ></orbit-prompt>
                `;
            });

            const newContent = `
                <orbit-reviewarea color="brown">
                    ${flashcardsHtml}
                </orbit-reviewarea>
            `;

            // Replace the spinner with the flashcards
            spinner.remove();
            this.outerHTML = newContent;
        },
        onerror: (error) => {
            console.error('Error:', error);
            // Remove the spinner in case of error
            spinner.remove();
        }
    });
}

function getSectionContent(headingElement) {
  let content = '';
  let sibling = headingElement.nextElementSibling;
  while (sibling && !/^H[1-6]$/.test(sibling.tagName)) {
    content += sibling.textContent.trim() + ' ';
    sibling = sibling.nextElementSibling;
  }
  return content.trim();
}

function insertButtonAfterLastChild(headingElement, button) {
  let lastSibling = headingElement.nextElementSibling;
  let previousSibling = headingElement;

  while (lastSibling && !/^H[1-6]$/.test(lastSibling.tagName)) {
    previousSibling = lastSibling;
    lastSibling = lastSibling.nextElementSibling;
  }

  previousSibling.insertAdjacentElement('afterend', button);
}

/**
 * Determine the optimal heading level at which to generate flashcards.
 * The optimal heading level is the highest level that satisfies the minimum
 * average section length requirement.
 * @returns The optimal heading level (1, 2, ...)
 */
function determineOptimalHeadingLevel() {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const headingLevels = headings.map(heading => ({ element: heading, level: parseInt(heading.tagName.substr(1)) }));

  // Will return the highest heading level that satisfies the criteria
  for (let level = 6; level >= 1; level--) {
    const sections = headingLevels.filter(heading => heading.level === level);
    // If there are no sections at this level, continue to the next level
    if (sections.length === 0) {
      continue;
    }
    // Calculate the average length of sections at this level
    const totalLength = sections.reduce((total, section) =>
      total + getSectionContent(section.element).length,
      0
    );
    const averageLength = totalLength / sections.length;
    console.log(`Level ${level}: Average length = ${averageLength}`);
    if (averageLength >= minAvgSectionLength) {
      return level;
    }
  }

  return 1;
}

window.addEventListener('load', () => {
    // Inject CSS for the spinner
    const style = document.createElement('style');
    style.textContent = customCSS
    document.head.appendChild(style);

    // First determine at which heading level to generate flashcards
    const optimalHeadingLevel = determineOptimalHeadingLevel();
    console.log(`Optimal Heading Level: h${optimalHeadingLevel}`);

    // For each section at the optimal heading level, if the section length is sufficient,
    // add a button to generate flashcards for that section
    const sections = document.querySelectorAll(`h${optimalHeadingLevel}`);
    sections.forEach((section, index) => {
        const textContent = getSectionContent(section);
        if (textContent.length < minSectionLength) {
          console.log(`Skipping section ${index + 1} due to insufficient length`);
          return;
        }

        const button = document.createElement('button');
        button.id = `flashcardsButton-${index}`;
        button.textContent = "Generate Flashcards";
        
        button.addEventListener('click', function() {
            onClick.call(this, textContent);
        });
        insertButtonAfterLastChild(section, button);
    });
});