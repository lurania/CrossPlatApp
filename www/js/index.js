/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Wait for the deviceready event before using any of Cordova's device APIs.
// See https://cordova.apache.org/docs/en/latest/cordova/events/events.html#deviceready
document.addEventListener('deviceready', onDeviceReady, false);



import {
    vocabData
} from './vocabData.js';

var table;
var dbReady = false; //boolean to wait for DB to finish exchanging data etc.
var arrayFull = false; //boolean to check if the array used in creating the table has filled with enough vocabulary
var db; //the database
var youWonDiv;

var amountOfWords;

var languageList1 = [];
var languageList2 = [];

var amountOfTries = 0;
var amountOfError = 0;
var remainingPairs = 0;


var firstLanguage;
var secondLanguage;
var saveStats; //boolean that is used to see if the user wants to save the stats or not
var checkForbidden = false; //boolean that forbids the user to spam the check button
var firstConfig; //boolean to check if the user started the game for the first time or no config is found in DB

function onDeviceReady() {

    // Cordova is now initialized. Have fun!
    amountOfWords = localStorage.getItem('amountOfWords');
    firstLanguage = localStorage.getItem('firstLanguage');
    secondLanguage = localStorage.getItem('secondLanguage');
    let firstConf = localStorage.getItem('firstConfiguration');
    saveStats = localStorage.getItem('saveStats');
    console.log("Saving stats?: " + saveStats);

    if (firstConf == "false") {
        firstConfig = false;
    } else {
        firstConfig = true;
    }

    if (amountOfWords == null) {

        firstConfigPopup();

    }
    if (firstLanguage == null) {

        firstConfigPopup();

    }
    if (secondLanguage == null) {
        firstConfigPopup();

    }

    if (saveStats == null) {
        saveStats = false;
    }

    if (!firstConfig) {
        console.log(amountOfWords);
        //a way to see all databases created by IndexDBd
        indexedDB.databases().then(r => console.log(r));

        console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);


        handleDatabase();
        waitForDBAndFetchData(amountOfWords, firstLanguage, secondLanguage);
    }

    document.getElementById("optionButton").onclick = openOptions;
    document.getElementById("statsButton").onclick = openStats;

    document.getElementById("submitConfig").onclick = function () {
        let languageChoice1 = document.getElementById("lang1").value;
        let languageChoice2 = document.getElementById("lang2").value;
        let wordsAmountChoice = document.getElementById("slider").value;
        localStorage.setItem('firstLanguage', languageChoice1);
        localStorage.setItem('secondLanguage', languageChoice2);
        console.log(document.getElementById("slider").value);
        localStorage.setItem('amountOfWords', wordsAmountChoice);
        localStorage.setItem('firstConfiguration', "false")
        amountOfWords = wordsAmountChoice;
        firstLanguage = languageChoice1;
        secondLanguage = languageChoice2;
        firstConfig = false;
        $("#popupConfig").popup("close");
        handleDatabase();
        waitForDBAndFetchData(amountOfWords, firstLanguage, secondLanguage);
    };


}

function firstConfigPopup() {
    firstConfig = true;
    $("#popupConfig").popup("open");


}
//a function to wait for the database to open / fill with needed vocab on updates
function waitForDBAndFetchData(vocabSize, firstLang, secondLang) {
    if (!dbReady) {
        setTimeout(function () {
            waitForDBAndFetchData(vocabSize, firstLang, secondLang);
        }, 500);
    } else {

        getTheData(vocabSize, firstLang, secondLang);
    }
}

//a function to open request on indexDB and fill it up with vocabulary on updates / changes to the vocabulary
function handleDatabase() {

    var openRequest = indexedDB.open("vocabularyGameDB", 1);


    openRequest.onerror = function (event) {
        console.log("error" + event.target.errorCode);
        console.log(openRequest.errorCode);
    };

    openRequest.onsuccess = function (event) {
        console.log("success");
        db = openRequest.result;
        dbReady = true;


    };

    openRequest.onupgradeneeded = function (event) {
        console.log("update");
        var db = event.target.result;
        db.onerror = function () {
            console.log(db.errorCode);
        };



        var store = db.createObjectStore("vocabData", {
            keyPath: "id"
        });
        const english = store.createIndex("english", "english");
        const german = store.createIndex("german", "german");
        const spanish = store.createIndex("spanish", "spanish");

        var storeCustom = db.createObjectStore("customVocabData", {
            keyPath: "id"
        });
        const custom1 = storeCustom.createIndex("custom1", "custom1");
        const custom2 = storeCustom.createIndex("custom2", "custom2");


        var storeStats = db.createObjectStore("userStatistics", {
            keyPath: "id"
        });
        const timeStamp = storeStats.createIndex("timeStamp", "timeStamp");
        const date = storeStats.createIndex("date", "date");
        const amountOfErrorStat = storeStats.createIndex("amountOfErrorStat", "amountOfErrorStat");
        const amountOfTriesStat = storeStats.createIndex("amountOfTriesStat", "amountOfTriesStat");
        const amountOfWordsStat = storeStats.createIndex("amountOfWordsStat", "amountOfWordsStat");


        store.transaction.oncomplete = function (event) {
            // Store values in the newly created objectStore.
            console.log("adding vocab data");
            var store = db.transaction("vocabData", "readwrite").objectStore("vocabData");
            vocabData.forEach(function (vocab) {
                store.add(vocab);
            });

            console.log("statsUpdate");
            //need to chain the transactions completion because of the (lack of?) concurrency of the database
            storeStats.transaction.oncomplete = function (event) {

                console.log("storeStats created");

                storeCustom.transaction.oncomplete = function (event) {

                    console.log("customVocabData created");
                    dbReady = true;
                };
            };


        };



    };



}


//function that gets the vocabulary data at random and with the given word range for the table
function getTheData(vocabSize, firstLang, secondLang) {

    let dbSize = 0;

    //set the size and arrays to 0
    let arrayLength = 0;
    languageList1 = [];
    languageList2 = [];
    arrayFull = false;
    amountOfError = 0;
    amountOfTries = 0;
    document.getElementById("errors").innerHTML = "Amount of errors: " + amountOfError;
    document.getElementById("tries").innerHTML = "Amount of tries: " + amountOfTries;

    if (youWonDiv !== undefined) {
        youWonDiv.remove();
    }

    if (vocabSize <= 0) {
        arrayLength = 10;
    } else {
        arrayLength = vocabSize;
    }

    //no custom vocabulary is selected
    if (firstLang != "custom" && secondLang != "custom") {
        console.log("fetching data");
        //get the data from the database
        const tx = db.transaction("vocabData");
        const store = tx.objectStore("vocabData");



        //check the amount of word in this vocab table
        var countRequest = store.count();

        countRequest.onsuccess = function () {
            dbSize = countRequest.result;

            for (var i = 0; i < arrayLength; i++) {

                //take at random a wordpair from the database
                var rndtest = Math.random();
                var rnd = Math.floor(rndtest * dbSize) + 1;
                console.log("getting id: " + rnd.toString());

                const request = store.get(rnd.toString());


                request.onsuccess = function (event) {

                    const matching = request.result;
                    if (matching !== undefined) {
                        //if the id exists in the database and an entry is found

                        //get the requested results from the users selected first language and second language
                        languageList1.push(matching[firstLang]);
                        languageList2.push(matching[secondLang]);
                        //check if the required word/vocabulary amount is reached
                        if (languageList2.length == arrayLength && languageList1.length == arrayLength) {
                            arrayFull = true;
                        }
                    } else {
                        //no such entry in the database for this id
                        console.log("undefined");
                    }
                };
            }
        }
        waitForArrayToFill();
        //custom vocabulary
    } else {

        const tx = db.transaction("customVocabData");
        const store = tx.objectStore("customVocabData");
        //getting all the keys to pick one later at random
        let request = store.getAllKeys();

        request.onerror = function () {
            console.err("error fetching data");
        };
        request.onsuccess = function () {
            //setting keys into a temporary array
            let tmpHolder = [];
            request.result.forEach(
                function (item) {
                    tmpHolder.push(item);
                }
            );
            console.log(tmpHolder);
            for (var i = 0; i < tmpHolder.length; i++) {
                //take at random a wordpair from the database
                var rndtest = Math.random();
                var rnd = Math.floor(rndtest * tmpHolder.length);


                const request = store.get(tmpHolder[rnd]);
                console.log("getting id: " + tmpHolder[rnd]);
                request.onsuccess = function (event) {

                    const matching = request.result;
                    if (matching !== undefined) {
                        //if the id exists in the database and an entry is found
                        //get the requested results from the custom language
                        languageList1.push(matching["custom1"]);
                        languageList2.push(matching["custom2"]);
                        //check if the required word/vocabulary amount is reached
                        if (languageList2.length == arrayLength && languageList1.length == arrayLength) {
                            arrayFull = true;
                        }
                    } else {
                        //no such entry in the database for this id
                        console.log("undefined");
                    }
                }
            }



        }
        waitForArrayToFill();

    }

}

//another function to ensure the code "waits" for the database to execute the requests first before continuing
function waitForArrayToFill() {

    if (!arrayFull) {
        setTimeout(function () {
            waitForArrayToFill();
        }, 50);
    } else {

        createTable(languageList1, languageList2);
    }
}

//the function that dynamically creates the html for the table
function createTable(languageList1, languageList2) {
    console.log("creating Table");
    //if a table already exists, remove it first
    if (table !== undefined) {
        table.remove();
    }
    table = document.createElement('table');
    var tableDiv = document.getElementById("tableDiv");
    remainingPairs = 0;
    table.classList.add("contentTable");


    for (var i = 0; i < languageList1.length; i++) {
        var tr = document.createElement('tr');
        var tdFirst = document.createElement('td');
        tdFirst.id = "firstTable" + i;
        tdFirst.innerHTML = languageList1[i];

        var tdSecond = document.createElement('td');
        var tdEntry = document.createElement('p');
        tdEntry.innerHTML = languageList2[i];
        tdSecond.childNodes.forEach(disableDragable);
        tdSecond.id = "secondTable" + i;
        tdSecond.draggable = "true";
        tdSecond.appendChild(tdEntry)
        attachDragAndDropListener(tdSecond);

        var checkButtonTD = document.createElement('td');
        var checkButton = document.createElement('img');
        checkButton.classList.add("checkButton");
        checkButton.setAttribute("id", "checkButton" + i);
        checkButton.src = "./img/checkMarkGrey.png";
        checkButtonTD.onclick = checkWordPair;
        checkButtonTD.appendChild(checkButton);

        tr.appendChild(tdFirst);
        tr.appendChild(tdSecond);
        tr.appendChild(checkButtonTD);
        table.appendChild(tr);
    }
    remainingPairs = languageList1.length;
    tableDiv.appendChild(table);
    scrambleOrderInTable(table);

}


//the function that checks if a word pair is correctly ordered
function checkWordPair(e) {

    let tablerow;
    let td1;
    let td2;
    let td3;


    if (!checkForbidden) {
        checkForbidden = true;
        tablerow = this.parentNode;
        td1 = tablerow.childNodes[0];
        td2 = tablerow.childNodes[1];
        td3 = tablerow.childNodes[2];


        amountOfTries++;
        document.getElementById("tries").innerHTML = "Amount of tries: " + amountOfTries;
        //check if they have the same index in languageList1 and 2
        if (languageList1.indexOf(td1.innerHTML) == languageList2.indexOf(td2.childNodes[0].innerHTML)) {
            //display the green checkmark if they do
            tablerow.childNodes[2].childNodes[0].src = "./img/checkMarkGreen.png";
            console.log("match");
            remainingPairs--;
            changeColorOfBoxAndThenDestroy(td1, 2);
            changeColorOfBoxAndThenDestroy(td2, 2);
            changeColorOfBoxAndThenDestroy(td3, 2);
            checkForWinCondition();

        } else {
            //display the red x if they do not for x second
            tablerow.childNodes[2].childNodes[0].src = "./img/checkMarkRed.png";
            amountOfError++;
            //table row is blinkin in a red color 
            changeColorOfBox(td1, 2, getComputedStyle(td1).backgroundColor.toString(), "rgb(255, 127, 112)");
            changeColorOfBox(td2, 2, getComputedStyle(td2).backgroundColor.toString(), "rgb(255, 127, 112)");
            changeColorOfBox(td3, 2, getComputedStyle(td3).backgroundColor.toString(), "rgb(255, 127, 112)");
            document.getElementById("errors").innerHTML = "Amount of errors: " + amountOfError;
            setTimeout(function () {
                tablerow.childNodes[2].childNodes[0].src = "./img/checkMarkGrey.png";
            }, 1500);

        }
    }

}


//function that checks if all word pairs have been found and displays the winning screen
//it also initialises the stat saving
function checkForWinCondition() {
    if (remainingPairs == 0) {
        setTimeout(function () {
            youWonDiv = document.createElement('div');
            let p = document.createElement('p');
            let btn = document.createElement('button');
            let mainWindow = document.getElementById("deviceready");
            btn.innerHTML = "PLAY AGAIN";
            p.innerHTML = "YOU WON";
            p.classList.add("endScreen");
            btn.classList.add("playAgainButton");
            changeColorOfBox(p, 20, "rgb(52, 235, 128)", "rgb(214, 52, 235", 300);
            mainWindow.appendChild(youWonDiv);
            youWonDiv.appendChild(p);
            youWonDiv.appendChild(btn);
            if (saveStats == "true") {
                savingStatsToDB();
            } else {
                console.log("not saving stats");
            }
            btn.onclick = function () {
                console.log(amountOfWords);
                waitForDBAndFetchData(amountOfWords, firstLanguage, secondLanguage);
            }
        }, 1200);


    }
}

//fucntion that gets all the needed statistics and saves it in the database (if enabled)
//also gets the timestamp and date
function savingStatsToDB() {
    let date = new Date();
    let time = checkTime(date.getHours()) + ":" + checkTime(date.getMinutes() + ":" + checkTime(date.getSeconds()));
    let dateformated = date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear();


    let stats = {
        id: date.getFullYear() + "." + (date.getMonth() + 1) + "." + date.getDate() + " " + time,
        timeStamp: time,
        date: dateformated,
        amountOfErrorStat: amountOfError,
        amountOfTriesStat: amountOfTries,
        amountOfWordsStat: amountOfWords,
    };
    console.log(stats);

    const tx = db.transaction("userStatistics", "readwrite");
    const statsDB = tx.objectStore("userStatistics");

    let request = statsDB.add(stats);

    request.onsuccess = function () {
        console.log("Stats added", request.result);
    };

    request.onerror = function () {
        console.log("Error", request.error);
    };
}

//converts the time stamp to a format with leading 0
function checkTime(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

//function to make elements not dragable
function disableDragable(item) {
    console.log(item.nodeName);
    item.draggable = "false";
}


//function that adds the neccessary listeners to enable drag and drop to an element
function attachDragAndDropListener(e) {
    e.addEventListener('dragstart', dragStart);
    e.addEventListener('dragover', dragOver);
    e.addEventListener('dragenter', dragEnter);
    e.addEventListener('dragleave', dragLeave);
    e.addEventListener('drop', drop);
    e.addEventListener('dragend', dragEnd);
}




function dragStart(e) {
    //set the id previously chosen (secondTable0 etc.) for the dataTransfer that is used to determine which box is moved
    e.dataTransfer.setData("text", e.target.id);
    e.target.style.backgroundColor = "yellow";

}

function dragEnd(e) {
    e.target.style.backgroundColor = "rgb(151, 209, 187)";
}

function dragEnter(e) {
    //change the style and color of the box (should be applied no matter over what element in the box you hover)
    if (e.target.nodeName == "TD") {
        e.target.style.border = "dashed #fc0303";
        const id = e.dataTransfer.getData("text");
        if (id != e.target.id) {
            e.target.style.backgroundColor = "rgb(141, 242, 107)"
        }
        e.preventDefault();
    }
    if (e.target.nodeName == "P") {
        e.target.parentNode.style.border = "dashed #fc0303";
        const id = e.dataTransfer.getData("text");
        if (id != e.target.parentNode.id) {
            e.target.parentNode.style.backgroundColor = "rgb(141, 242, 107)"
        }
        e.preventDefault();
    }


}

function dragLeave(e) {
    //reset the style
    if (e.target.nodeName == "TD") {
        e.target.style.border = "dotted black";
        const id = e.dataTransfer.getData("text");
        if (id != e.target.id) {
            e.target.style.backgroundColor = "rgb(151, 209, 187)";
        }

        e.preventDefault();
    }


}

function dragOver(e) {
    //change the style and color of the box (should be applied no matter over what element in the box you hover)
    if (e.target.nodeName == "TD") {
        e.target.style.border = "dashed #fc0303";
        const id = e.dataTransfer.getData("text");
        if (id != e.target.id) {
            e.target.style.backgroundColor = "rgb(141, 242, 107)"
        }
        e.preventDefault();

    }
    if (e.target.nodeName == "P") {
        e.target.parentNode.style.border = "dashed #fc0303";
        const id = e.dataTransfer.getData("text");
        if (id != e.target.parentNode.id) {
            e.target.parentNode.style.backgroundColor = "rgb(141, 242, 107)";
        }
        e.preventDefault();
    }




}

function drop(e) {

    e.preventDefault();
    const id = e.dataTransfer.getData("text");
    const draggedObject = document.getElementById(id);

    //if what is being dropped has data attached to it / dragStart as an EventListener 
    if (draggedObject != null) {
        //change the style and color of the box (should be applied no matter in what element in the box you drop)
        if (e.target.nodeName == "TD") {
            const targetText = e.target.innerHTML;
            e.target.innerHTML = draggedObject.innerHTML;
            draggedObject.innerHTML = targetText;
            e.target.style.border = "dotted black";
            e.target.style.backgroundColor = "rgb(151, 209, 187)";
            changeColorOfBox(e.target, 2, "rgb(151, 209, 187)", "rgb(42, 241, 245)");
            changeColorOfBox(draggedObject, 2, "rgb(151, 209, 187)", "rgb(42, 241, 245)");
        }
        if (e.target.nodeName == "P") {
            const targetText = e.target.parentNode.innerHTML;
            changeColorOfBox(e.target.parentNode, 2, "rgb(151, 209, 187)", "rgb(42, 241, 245)");
            changeColorOfBox(draggedObject, 2, "rgb(151, 209, 187)", "rgb(42, 241, 245)");
            e.target.parentNode.style.border = "dotted black";
            e.target.parentNode.style.backgroundColor = "rgb(151, 209, 187)";
            e.target.parentNode.innerHTML = draggedObject.innerHTML;
            draggedObject.innerHTML = targetText;


        }



    }
}

function changeColorOfBoxAndThenDestroy(box, amountToRepeat) {
    box.style.backgroundColor = "rgb(136, 252, 3)";
    setTimeout(function () {
        setColorBackThenDestroy(box, amountToRepeat);
    }, 150);
}

function setColorBackThenDestroy(box, amountToRepeat) {
    if (amountToRepeat > 0) {

        amountToRepeat--;
        box.style.backgroundColor = "rgb(40, 212, 71)";
        setTimeout(function () {
            changeColorOfBoxAndThenDestroy(box, amountToRepeat);
        }, 150);

    } else {
        checkForbidden = false;
        box.remove();

    }

}

function changeColorOfBox(box, amountToRepeat, colorCode1, colorCode2, speed = 150) {


    box.style.backgroundColor = colorCode1;
    setTimeout(function () {
        setColorBack(box, amountToRepeat, colorCode1, colorCode2, speed = 150);
    }, speed);

}

function setColorBack(box, amountToRepeat, colorCode1, colorCode2, speed = 150) {
    if (amountToRepeat > 0) {

        amountToRepeat--;
        box.style.backgroundColor = colorCode2;
        setTimeout(function () {
            changeColorOfBox(box, amountToRepeat, colorCode1, colorCode2, speed = 150);
        }, speed);

    } else {
        checkForbidden = false;
        box.style.backgroundColor = colorCode1;
    }

}


//function that allows the vocabulary to not be ordered next to each other
function scrambleOrderInTable(table) {

    table.childNodes.forEach(function (tablerows) {

        //roll a random number between 0 and tablerow amount - 1
        //swap the innerHtml of the second column of this random tablerow with the current one in the forEach()
        let rnd = Math.floor(Math.random() * (table.childNodes.length) - 1) + 1;
        let swapWith = table.childNodes[rnd].childNodes[1].innerHTML; //the random row html
        let currentOne = tablerows.childNodes[1].innerHTML; //the current row html

        table.childNodes[rnd].childNodes[1].innerHTML = currentOne; //set the random one to currentOne
        tablerows.childNodes[1].innerHTML = swapWith; //set the current one with the random one
    });
}



function openOptions() {


    window.location = "options.html";

}


function openStats() {

    window.location = "stats.html";

}

//this function adds the "blue" color to the navbarelement "Game" back after switching pages
$(function () {
    $("[data-role='navbar']").navbar();
});
$(document).on("pagecontainerchange", function () {

    var current = $(".ui-page-active").jqmData("title");
    $("[data-role='navbar'] a").each(function () {
        if ($(this).text() === current) {
            $(this).addClass("ui-btn-active");
        }
    });
});