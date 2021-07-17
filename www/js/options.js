var db;
var vocab = [];
var vocabLoaded = false; //boolean to show the status for database if its completed all transactions etc.
var currentVocab = 0; //a pointer to the vocabulary that the user sees currently on the deletion screen
var customID = 0; //the id that becomes the primary key for custom vocabulary


window.onload = function () {
    //shows the correct status for the flipswitch depending if it was chosen by the user previously as on or off
    if (localStorage.getItem('saveStats') == "true") {
        $('#statsToggle').val('on').flipswitch('refresh');
    } else {
        $('#statsToggle').val('off').flipswitch('refresh');
    }
    customID = localStorage.getItem('customID');
    if (customID == null) {
        customID = 0;
        localStorage.setItem('customID', 0);
    }
    document.getElementById("submitOptionButton").onclick = function () {
        let lan1 = document.getElementById("lang1").value;
        let lan2 = document.getElementById("lang2").value;

        localStorage.setItem('firstLanguage', lan1);
        localStorage.setItem('secondLanguage', lan2);

        localStorage.setItem('amountOfWords', document.getElementById("slider").value);

        let toggleValue = document.getElementById("statsToggle").value;
        if (toggleValue == "off") {
            localStorage.setItem('saveStats', false);
            console.log("save stats: false");
        } else if (toggleValue == "on") {
            localStorage.setItem('saveStats', true);
            console.log("save stats: true");
        } else {
            console.log(toggleValue);
        }
    };

    handleDatabase();
    document.getElementById("previous").onclick = previousVocab;
    document.getElementById("next").onclick = nextVocab;
    document.getElementById("delete").onclick = deleteVocabEntry;


    document.getElementById("backToGameButton").onclick = openBackGame;

    document.getElementById("vocabAdd").onclick = addVocab;

    document.getElementById("removeVocab").onclick = function () {
        getVocabFromDB();
    }

    //when picking custom it disables the other language choice box
    $("#lang1").on('change', function () {
        if (document.getElementById("lang1").value == "custom") {
            $("#lang2").selectmenu("disable");
        } else {
            $("#lang2").selectmenu("enable");
        }

    });
    //same as above but for the second choice box
    $("#lang2").on('change', function () {
        if (document.getElementById("lang2").value == "custom") {
            $("#lang1").selectmenu("disable");
        } else {
            $("#lang1").selectmenu("enable");
        }

    });


}

//function to add new vocabulary to the database
function addVocab() {

    console.log(vocab.length);
    $("#addVocabPopup").popup("close");

    let tmpVocab1 = document.getElementById("inputLang1").value;
    let tmpVocab2 = document.getElementById("inputLang2").value;


    console.log("Input: " + tmpVocab1 + " " + tmpVocab2);


    //add it to the database
    const tx = db.transaction("customVocabData", "readwrite");
    const store = tx.objectStore("customVocabData");
    //get the customID from localStorage as int
    customID = parseInt(localStorage.getItem('customID'));


    let vocabToAdd = {
        id: customID,
        custom1: tmpVocab1,
        custom2: tmpVocab2,
    }
    localStorage.setItem('customID', customID + 1);
    let request = store.add(vocabToAdd);

    request.onsuccess = function () {
        console.log("Vocab added", request.result);
        setTimeout(popupAddedVocabSuccess, 200); //with a delay because it wouldnt work otherwise (multiple popups in jquerymobile error?)
    };

    request.onerror = function () {
        console.log("Error", request.error);
    };

}

function popupAddedVocabSuccess() {

    $("#confirmVocabAdd").popup("open");
}

function openBackGame() {

    window.location = "index.html";

}







//deletes the vocab entry that the user clicked the delete button on (for a single entry)
function deleteVocabEntry() {
    //opens the transaction
    const tx = db.transaction("customVocabData", "readwrite");
    const statsDB = tx.objectStore("customVocabData");
    const vocabToDel = vocab[currentVocab];
    const id = vocabToDel["id"];
    console.log("id to delete: " + id);

    //request a deletion and deletes entry from database on success
    let request = statsDB.delete(id);

    request.onsuccess = function () {
        //removing the entry from vocab array as well
        vocab.splice(currentVocab, 1);
        console.log(currentVocab + "stat");

        //if there is multiple entries just display the next one
        if (vocab.length > 1) {
            //if its the vocab at the end of the array currentVocab pointer has to be moved by one
            if (currentVocab == (vocab.length)) {
                currentVocab--;

            }
            console.log("Displaying:" + currentVocab + " length: " + (vocab.length));
            displayVocab(currentVocab);

        } else {
            //in case its the last entry
            if (vocab.length == 1) {
                currentVocab = 0;
                displayVocab(currentVocab);

            } else {
                //in case nothing is there to display
                document.getElementById("statsDiv").style.display = 'none';
                document.getElementById("noDisplay").style.display = 'block';
            }

        }

    };

    request.onerror = function () {
        console.log("Error", request.error);
    };

}

function previousVocab() {
    if (currentVocab != 0) {

        currentVocab--;
        displayVocab(currentVocab);

    }

}

function nextVocab() {
    if (currentVocab != vocab.length - 1) {

        currentVocab++;
        displayVocab(currentVocab);

    }
}


//waits for the database to finish loading the data
function waitForVocabLoading() {
    if (!vocabLoaded) {
        setTimeout(function () {
            waitForVocabLoading();
        }, 500);
    } else {

        //depending on if there is already vocab or not:
        //display the vocab
        console.log("vocabLength:" + vocab.length);
        if (vocab.length != 0) {
            currentVocab = vocab.length - 1;
            displayVocab(vocab.length - 1);
            console.log(vocab);
            document.getElementById("statsDiv").style.display = 'block';
            document.getElementById("noDisplay").style.display = 'none';
            //display dialog that there are no vocab to display
        } else {
            document.getElementById("statsDiv").style.display = 'none';
            document.getElementById("noDisplay").style.display = 'block';
        }

    }
}

function getVocabFromDB() {
    console.log("fetching vocab data");
    //get the data from the database
    const tx = db.transaction("customVocabData");
    const store = tx.objectStore("customVocabData");
    vocab = [];
    vocabLoaded = false;

    //check the amount of vocab entries 
    var countRequest = store.count();
    waitForVocabLoading();

    countRequest.onsuccess = function () {
        let dbSize = countRequest.result;
        const request = store.getAll();

        request.onsuccess = function (event) {
            for (let i = 0; i < dbSize; i++) {
                //fill a vocab array as a buffer to not constantly poll the database while being on the vocab screen
                const matching = request.result;
                let res = request.result[i];
                vocab.push(res);


            };
            vocabLoaded = true;

        }

    }
}

function displayVocab(i) {

    var obj = vocab[i];
    console.log("displaying: " + obj["custom1"] + " " + obj["custom2"]);
    document.getElementById("language1").innerHTML = obj["custom1"];
    document.getElementById("language2").innerHTML = obj["custom2"];

}


//opens the database and updates the data if needed, same as in index.js
function handleDatabase() {

    var openRequest = indexedDB.open("vocabularyGameDB", 1);


    openRequest.onerror = function (event) {
        console.log("error" + event.target.errorCode);
        console.log(openRequest.errorCode);
    };

    openRequest.onsuccess = function (event) {
        console.log("success");
        db = openRequest.result;
        getVocabFromDB();



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
            storeStats.transaction.oncomplete = function (event) {
                // Store values in the newly created objectStore.
                console.log("storeStats created");

                storeCustom.transaction.oncomplete = function (event) {
                    // Store values in the newly created objectStore.
                    console.log("customVocabData created");
                    dbReady = true;
                };
            };


        };



    };



}