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
var dbReady = false;
var arrayFull = false;
var db;
var youWonDiv;

var amountOfWords;

var languageList1 = [];
var languageList2 = [];

var amountOfTries = 0;
var amountOfError = 0;
var remainingPairs = 0;


var firstLanguage = "german";
var secondLanguage = "spanish";

function onDeviceReady() {
    // Cordova is now initialized. Have fun!
    amountOfWords = localStorage.getItem('amountOfWords');
    firstLanguage = localStorage.getItem('firstLanguage');
    secondLanguage = localStorage.getItem('secondLanguage');

    if(amountOfWords == null){
        amountOfWords = 10;
    }
    if(firstLanguage == null){
        firstLanguage = "german";
        localStorage.setItem('firstLanguage', firstLanguage);
    }
    if(secondLanguage == null){
        secondLanguage = "english";
        localStorage.setItem('secondLanguage', secondLanguage);
    }

    console.log(amountOfWords);
    //a way to see all databases created by IndexDBd
    indexedDB.databases().then(r => console.log(r));

    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);

    /* const one = document.getElementById("one");
     const two = document.getElementById("two");
     const three = document.getElementById("three") */



    /* one.onclick = clicked;
     two.onclick = clicked;
     three.onclick = clicked; */

    /*attachDragAndDropListener(one);
    attachDragAndDropListener(two);
    attachDragAndDropListener(three);*/
    //table.remove();

    handleDatabase();

    waitForDBAndFetchData(amountOfWords, firstLanguage, secondLanguage);

    /*setTimeout(function () {
        changeAmountOfWords(5);
    }, 5000);*/

    document.getElementById("optionButton").onclick = openOptions;
    document.getElementById("statsButton").onclick = openStats;
   
}



function waitForDBAndFetchData(vocabSize, firstLang, secondLang) {
    if (!dbReady) {
        setTimeout(function () {
            waitForDBAndFetchData(vocabSize, firstLang,secondLang);
        }, 500);
    } else {
   
        getTheData(vocabSize,firstLang,secondLang);
    }
}

function handleDatabase() {


    indexedDB.deleteDatabase("vocabulary");
    var openRequest = indexedDB.open("vocabulary", 1);

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

        store.transaction.oncomplete = function (event) {
            // Store values in the newly created objectStore.
            var store = db.transaction("vocabData", "readwrite").objectStore("vocabData");
            vocabData.forEach(function (vocab) {
                store.add(vocab);
            });
        };

    };



}


function getTheData(vocabSize, firstLang, secondLang) {
    console.log("fetching data");
    //get the data from the database
    const tx = db.transaction("vocabData");
    const store = tx.objectStore("vocabData");
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

    //check the amount of word in this vocab table
    var countRequest = store.count();

    countRequest.onsuccess = function () {
        dbSize = countRequest.result;
    
        for (var i = 0; i < arrayLength; i++) {
         
            //take at random a wordpair from the database
            var rndtest = Math.random();
            var rnd = Math.floor(rndtest * dbSize) + 1;

            const request = store.get(rnd.toString());


            request.onsuccess = function (event) {
            
                const matching = request.result;
                if (matching !== undefined) {
                    //if the id exists in the database and an entry is found
              
                    //get the requested results from the users selected first language and second language
                    languageList1.push(matching[firstLang]);
                    languageList2.push(matching[secondLang]);
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

}

function waitForArrayToFill() {
    
    if (!arrayFull) {
        setTimeout(function () {
            waitForArrayToFill();
        }, 50);
    } else {

        createTable(languageList1, languageList2);
    }
}

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
        checkButton.onclick = checkWordPair;
        //$(checkButton).buttonMarkup({icon: "check"});
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

function checkWordPair(e) {

    //get the tr of the button
    let tablerow = this.parentNode.parentNode;
    let td1 = tablerow.childNodes[0];
    let td2 = tablerow.childNodes[1];
    let td3 = tablerow.childNodes[2];
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
            btn.onclick = function () {
                console.log(amountOfWords);
                waitForDBAndFetchData(amountOfWords, firstLanguage,secondLanguage);
            }
        }, 1200);


    }
}

function disableDragable(item) {
    console.log(item.nodeName);
    item.draggable = "false";
}

function attachDragAndDropListener(e) {
    e.addEventListener('dragstart', dragStart);
    e.addEventListener('dragover', dragOver);
    e.addEventListener('dragenter', dragEnter);
    e.addEventListener('dragleave', dragLeave);
    e.addEventListener('drop', drop);
    e.addEventListener('dragend', dragEnd);
}

/* function clicked(id) {
    document.getElementById("para").innerHTML = this.id;

    if (this.id == "img1") {
        document.getElementById("para").innerHTML = "123" + this.id;

    }
} */


function dragStart(e) {
    e.dataTransfer.setData("text", e.target.id)
    e.target.style.backgroundColor = "yellow";

}

function dragEnd(e) {
    e.target.style.backgroundColor = "rgb(151, 209, 187)";
}

function dragEnter(e) {
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
        box.style.backgroundColor = colorCode1;
    }

}

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



function openOptions(){


 window.location = "options.html";
    
}


function openStats(){

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


