# AutoQA

Automatically generates comprehension questions for any webpage you read:

- 📃 When you read an article, after each section you can click a button to generate questions
- ❓ The questions are multiple choice and test your understanding of the section
- 🧠 Get reminders to review the questions you generated and better remember what you read!

It use the [Mistral API](https://mistral.ai/) to generate questions and the corresponding answers, and [Orbit](https://withorbit.com/) to display them on the page and allow you to answer them.

## Installation

AutoQA works as a userscript that runs in your web browser.

To install it, first install the [Tampermonkey](https://www.tampermonkey.net/) extension for your browser.

Then, open the Tampermonkey Dashboard and click the button to create a new script.

Delete the template and copy the contents of `userscript.js` into the script editor.

**Important**: Modify the Mistral API key value in the script with your own key (go [here](https://console.mistral.ai/) to obtain one).

Save the script, and you're done!

## Usage

By default, AutoQA will modify ALL the webpages you visit to include buttons that generate comprehension questions after a long enough section.

Whenever you want to do the QA, click on the "Generate Flashcards" button to generate questions for that section. This will call the Mistral API to generate the questions (this will take a few seconds, and cost you a few credits).

An Orbit widget will appear with the questions and multiple choice answers.
For each question, think about what the answer is, then click "Show Answer" to reveal the correct answer.
Depending on your answer, you can click "Remembered" or "Forgotten" to indicate if you got it right or wrong.
Note that the questions are generated based on the content of the section, so they may not always be perfect. If you think a question is irrelevant or incorrect, simply click "Skip".

If you register an account on Orbit, you will get email reminders to review the questions you generated, to help you remember the content better!

## TODOs

- Improve the prompt that generates questions
- Improve how sections are picked
- Limit the maximum length of the section to generate questions for (both for cost and performance reasons)