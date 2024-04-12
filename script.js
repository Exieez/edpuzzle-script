var base_url;
if (typeof document.dev_env != "undefined") {
    base_url = document.dev_env;
} else {
    // Get resources off of GitHub to not inflate the jsdelivr stats
    base_url = "https://raw.githubusercontent.com/ading2210/edpuzzle-answers/main";
}

function createHtmlElement(elementType, attributes = {}, textContent = '') {
    const element = document.createElement(elementType);
    Object.keys(attributes).forEach(attribute => {
        element.setAttribute(attribute, attributes[attribute]);
    });
    element.textContent = textContent;
    return element;
}

function appendChildren(parent, children) {
    children.forEach(child => {
        parent.appendChild(child);
    });
}

function init() {
    if (window.location.hostname == "edpuzzle.hs.vc") {
        alert("To use this, drag this button into your bookmarks bar. Then, run it when you're on an Edpuzzle assignment.");
    } else if ((/https{0,1}:\/\/edpuzzle.com\/assignments\/[a-f0-9]{1,30}\/watch/).test(window.location.href)) {
        getAssignment();
    } else if (window.canvasReadyState) {
        handleCanvasURL();
    } else if (window.schoologyMoreLess) {
        handleSchoologyURL();
    } else {
        alert("Please run this script on an Edpuzzle assignment. For reference, the URL should look like this:\nhttps://edpuzzle.com/assignments/{ASSIGNMENT_ID}/watch");
    }
}

function handleCanvasURL() {
    let location_split = window.location.href.split("/");
    let url = `/api/v1/courses/${location_split[4]}/assignments/${location_split[6]}`;
    http_get(url, function () {
        let data = JSON.parse(this.responseText);
        let url2 = data.url;

        http_get(url2, function () {
            let data = JSON.parse(this.responseText);
            let url3 = data.url;

            alert(`Please re-run this script in the newly opened tab. If nothing happens, then allow popups on Canvas and try again.`);
            open(url3);
        });
    });
}

function handleSchoologyURL() {
    let assignment_id = window.location.href.split("/")[4];
    let url = `/external_tool/${assignment_id}/launch/iframe`;
    http_get(url, function () {
        alert(`Please re-run this script in the newly opened tab. If nothing happens, then allow popups on Schoology and try again.`);

        //strip js tags from response and add to dom
        let html = this.responseText.replace(/<script[\s\S]+?<\/script>/, "");
        let div = document.createElement("div");
        div.innerHTML = html;
        let form = div.querySelector("form");

        let input = document.createElement("input")
        input.setAttribute("type", "hidden");
        input.setAttribute("name", "ext_submit");
        input.setAttribute("value", "Submit");
        form.append(input);
        document.body.append(div);

        //submit form in new tab
        form.setAttribute("target", "_blank");
        form.submit();
        div.remove();
    });
}

function getAssignment(callback) {
    var assignment_id = window.location.href.split("/")[4];
    if (typeof assignment_id == "undefined") {
        alert("Error: Could not infer the assignment ID. Are you on the correct URL?");
        return;
    }
    var url1 = "https://edpuzzle.com/api/v3/assignments/" + assignment_id;

    http_get(url1, function () {
        var assignment = JSON.parse(this.responseText);
        if (("" + this.status)[0] == "2") {
            openPopup(assignment);
        } else {
            alert(`Error: Status code ${this.status} received when attempting to fetch the assignment data.`)
        }
    });
}

function openPopup(assignment) {
    var media = assignment.medias[0];
    var teacher_assignment = assignment.teacherAssignments[0];
    var assigned_date = new Date(teacher_assignment.preferences.startDate);
    var date = new Date(media.createdAt);
    thumbnail = media.thumbnailURL;
    if (thumbnail.startsWith("/")) {
        thumbnail = "https://" + window.location.hostname + thumbnail;
    }

    var deadline_text;
    if (teacher_assignment.preferences.dueDate == "") {
        deadline_text = "no due date"
    } else {
        deadline_text = "due on " + (new Date(teacher_assignment.preferences.dueDate)).toDateString();
    }

    const baseDiv = createHtmlElement('div', { id: 'popup_container' });

    const headerDiv = createHtmlElement('div', { id: 'header_div' });
    const thumbnailImg = createHtmlElement('img', { src: thumbnail, height: '108px' });
    const titleDiv = createHtmlElement('div', { id: 'title_div' });
    const titleHeader = createHtmlElement('p', { style: 'font-size: 16px' }, `<b>${media.title}</b>`);
    const uploadedByP = createHtmlElement('p', { style: 'font-size: 12px' }, `Uploaded by ${media.user.name} on ${date.toDateString()}`);
    const assignedOnP = createHtmlElement('p', { style: 'font-size: 12px' }, `Assigned on ${assigned_date.toDateString()}, ${deadline_text}`);
    const correctChoicesP = createHtmlElement('p', { style: 'font-size: 12px' }, `Correct choices are <u>underlined</u>.`);
    const skipVideoButton = createHtmlElement('input', { id: 'skipper', type: 'button', value: 'Skip Video', onclick: 'skip_video();', disabled: true });
    const answerQuestionsButton = createHtmlElement('input', { id: 'answers_button', type: 'button', value: 'Answer Questions', onclick: 'answer_questions();', disabled: true });
    const speedContainerDiv = createHtmlElement('div', { id: 'speed_container', hidden: true });
    const speedLabel = createHtmlElement('label', { style: 'font-size: 12px', for: 'speed_dropdown' }, 'Video speed:');
    const speedDropdown = createHtmlElement('select', { name: 'speed_dropdown', id: 'speed_dropdown', onchange: 'video_speed()' });
    ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2', '-1'].forEach(value => {
        const option = createHtmlElement('option', { value: value }, value);
        if (value === '1') option.setAttribute('selected', 'selected');
        speedDropdown.appendChild(option);
    });
    const customSpeedLabel = createHtmlElement('label', { id: 'custom_speed_label', style: 'font-size: 12px', for: 'custom_speed' });
    const customSpeedInput = createHtmlElement('input', { type: 'range', id: 'custom_speed', name: 'custom_speed', value: '1', min: '0.1', max: '16', step: '0.1', oninput: 'video_speed()', hidden: true });
    const optionsContainerDiv = createHtmlElement('div', { id: 'options_container' });
    const pauseOnFocusLabel = createHtmlElement('label', { for: 'pause_on_focus', style: 'font-size: 12px' }, `Don't pause on unfocus:`);
    const pauseOnFocusCheckbox = createHtmlElement('input', { type: 'checkbox', id: 'pause_on_focus', name: 'pause_on_focus', onchange: 'toggle_unfocus();' });

    appendChildren(headerDiv, [thumbnailImg, titleDiv]);
    appendChildren(titleDiv, [titleHeader, uploadedByP, assignedOnP, correctChoicesP, skipVideoButton, answerQuestionsButton, speedContainerDiv, optionsContainerDiv]);
    appendChildren(speedContainerDiv, [speedLabel, speedDropdown, customSpeedLabel, customSpeedInput]);
    appendChildren(optionsContainerDiv, [pauseOnFocusLabel, pauseOnFocusCheckbox]);

    const contentDiv = createHtmlElement('div', { id: 'content' });
    const loadingTextP = createHtmlElement('p', { style: 'font-size: 12px', id: 'loading_text' });

    appendChildren(baseDiv, [headerDiv, createHtmlElement('hr'), contentDiv, createHtmlElement('hr'), createHtmlElement('p', { style: 'font-size: 12px' }, `Made by: <a target="_blank" href="https://dibash.com">dibash</a>  | How To Use: <a target="_blank" href="dibash.com/edpuzzle">dibash.com/edpuzzle</a>`), createHtmlElement('p', { style: 'font-size: 12px' }, `Note: This is for educational purposes, This is not used to abuse the Edpuzzle API`), createHtmlElement('p', { style: 'font-size: 12px' }, `There is no support for this, there is no clue on when this will be fixed, also huge thanks to ading2210  <i> There will be an update where Open Ended Questions will done by complete AI's so stay tuned. </i>`)]);

    document.body.appendChild(baseDiv);

    getMedia(assignment);
}

function getMedia(assignment) {
    var text = document.getElementById("loading_text");
    text.innerHTML = `Fetching assignments...`;

    var media_id = assignment.teacherAssignments[0].contentId;
    var url2 = `https://edpuzzle.com/api/v3/media/${media_id}`;

    fetch(url2, { credentials: "omit" })
        .then(response => {
            if (!response.ok) {
                var content = document.getElementById("content");
                content.innerHTML += `Error: Status code ${response.status} received when attempting to fetch the answers.`;
            } else return response.json();
        })
        .then(media => {
            parseQuestions(media.questions);
        })
}

function parseQuestions(questions) {
    var text = document.getElementById("loading_text");
    var content = document.getElementById("content");

    if (questions == null) {
        content.innerHTML += `<p style="font-size: 12px">Error: Could not get the media for this assignment. </p>`;
        return;
    }

    var question;
    var counter = 0;
    var counter2 = 0;
    for (let i = 0; i < questions.length; i++) {
        for (let j = 0; j < questions.length - i - 1; j++) {
            if (questions[j].time > questions[j + 1].time) {
                let question_old = questions[j];
                questions[j] = questions[j + 1];
                questions[j + 1] = question_old;
            }
        }
    }

    for (let i = 0; i < questions.length; i++) {
        question = questions[i];
        let choices_lines = [];

        if (typeof question.choices != "undefined") {
            let min = Math.floor(question.time / 60).toString();
            let secs = Math.floor(question.time % 60).toString();
            if (secs.length == 1) {
                secs = "0" + secs;
            }
            let timestamp = min + ":" + secs;
            let question_content;
            if (question.body[0].text != "") {
                question_content = `<p>${question.body[0].text}</p>`;
            } else {
                question_content = question.body[0].html;
            }

            let answer_exists = false;
            for (let j = 0; j < question.choices.length; j++) {
                let choice = question.choices[j];
                if (typeof choice.body != "undefined") {
                    counter++;
                    let item_html;
                    if (choice.body[0].text != "") {
                        item_html = `<p>${choice.body[0].text}</p>`;
                    } else {
                        item_html = `${choice.body[0].html}`;
                    }
                    if (choice.isCorrect == true) {
                        choices_lines.push(`<li class="choice choice-correct">${item_html}</li>`);
                        answer_exists = true;
                    } else {
                        choices_lines.push(`<li class="choice">${item_html}</li>`);
                    }
                }
            }
            if (!answer_exists) continue;

            let choices_html = choices_lines.join("\n");
            let table = ``
            if (counter2 != 0) {
                table += `<hr>`;
            }
            table += `
      <table>
        <tr class="header no_vertical_margin">
          <td class="timestamp_div no_vertical_margin">
            <p>[${timestamp}]</p>
          </td>
          <td class="question">
            ${question_content}
          </td>
        </tr>
        <tr>
          <td></td>
          <td>
            <ul style="margin-top: 6px; margin-bottom: 0px; padding-left: 18px;">
              ${choices_html}
            </ul>
          </td>
        </tr>
      </table>
      `;

            content.innerHTML += table;
            counter2++;
        }
    }
    document.getElementById("skipper").disabled = false;
    if (counter == 0 || counter2 == 0) {
        content.innerHTML += `<p style="font-size: 12px">No valid multiple choice questions were found.</p>`;
    } else {
        document.getElementById("answers_button").disabled = false;
    }
}

init();
