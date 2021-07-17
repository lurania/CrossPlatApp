var db;
var stats = [];
var statsLoaded = false;
var currentStat = 0;


window.onload = function () {


    document.getElementById("gameButton").onclick = openBackGame;
    document.getElementById("optionButton").onclick = openOptions;
    document.getElementById("date").innerHTML = "Loading...";
    handleDatabase();
    document.getElementById("previous").onclick = previousStat;
    document.getElementById("next").onclick = nextStat;
    document.getElementById("delete").onclick = deleteStatEntry;
    document.getElementById("deleteAll").onclick = deleteAllEntries;



}

//deletes all the stat entries, only called after the user confirms deletion in the pop up dialog 
function deleteAllEntries() {
    const tx = db.transaction("userStatistics", "readwrite");
    const statsDB = tx.objectStore("userStatistics");
    var request = statsDB.clear();
    request.onsuccess = function () {
        //display that there is no stats to display
        document.getElementById("statsDiv").style.display = 'none';
        document.getElementById("noDisplay").style.display = 'block';
    }
    request.onerror = function () {
        console.log("Error", request.error);
    };
}


//deletes the stat entry that the user clicked the delete button on (for a single entry)
function deleteStatEntry() {

    //opens the transaction
    const tx = db.transaction("userStatistics", "readwrite");
    const statsDB = tx.objectStore("userStatistics");
    const statToDel = stats[currentStat];
    const id = statToDel["id"];
    console.log("id to delete: " + id);

    //request a deletion and deletes entry from database on success
    let request = statsDB.delete(id);

    request.onsuccess = function () {

        //removing the entry from stats array as well
        stats.splice(currentStat, 1);
        console.log(currentStat + "stat");

        //if there is multiple entries just display the next one
        if (stats.length > 1) {
            //if its the stat at the end of the array currentStat pointer has to be moved by one
            //!its stats.length and not stats.length-1 because we already spliced the array!
            if (currentStat == (stats.length)) {
                currentStat--;
            }
            console.log("Displaying:" + currentStat + " length: " + (stats.length));
            displayStat(currentStat);

        } else {
            //in case its the last entry
            if (stats.length == 1) {
                currentStat = 0;
                displayStat(currentStat);

            } else {
                //in case nothing is there to display
                deletingAll = false;
                document.getElementById("statsDiv").style.display = 'none';
                document.getElementById("noDisplay").style.display = 'block';
            }

        }
        console.log("stat" + currentStat);
    };

    request.onerror = function () {
        console.log("Error", request.error);
    };

}

function previousStat() {
    if (currentStat != 0) {

        currentStat--;
        displayStat(currentStat);
        console.log("currentStat is: " + currentStat);
    }

}

function nextStat() {
    if (currentStat != stats.length - 1) {

        currentStat++;
        displayStat(currentStat);
        console.log("currentStat is: " + currentStat);
    }
}


//waits for the database to finish loading the data
function waitForStatsLoading() {
    if (!statsLoaded) {
        setTimeout(function () {
            waitForStatsLoading();
        }, 500);
    } else {
        //depending on if there is already stats or not:
        //display the stats
        if (stats.length != 0) {
            currentStat = stats.length - 1;
            displayStat(stats.length - 1);
            //display dialog that there are no stats to display
        } else {
            document.getElementById("statsDiv").style.display = 'none';
            document.getElementById("noDisplay").style.display = 'block';
        }

    }
}

function getStatsFromDB() {
    console.log("fetching statistics");
    //get the data from the database
    const tx = db.transaction("userStatistics");
    const store = tx.objectStore("userStatistics");
    stats = [];
    statsLoaded = false;

    //check the amount of stat entries 
    var countRequest = store.count();
    waitForStatsLoading();

    countRequest.onsuccess = function () {
        let dbSize = countRequest.result;
        const request = store.getAll();

        request.onsuccess = function (event) {
            for (let i = 0; i < dbSize; i++) {
                //fill a stats array as a buffer to not constantly poll the database while being on the stats screen
                const matching = request.result;
                let res = request.result[i];
                stats.push(res);


            };
            statsLoaded = true;

        }

    }
}

function displayStat(i) {
    var obj = stats[i];
    document.getElementById("date").innerHTML = obj["date"] + " " + obj["timeStamp"];
    document.getElementById("words").innerHTML = "Words: " + obj["amountOfWordsStat"];
    document.getElementById("tries").innerHTML = "Tries: " + obj["amountOfTriesStat"];
    document.getElementById("errors").innerHTML = "Errors: " + obj["amountOfErrorStat"];
    document.getElementById("percent").innerHTML = "Grade: " + Math.floor((100 - (obj["amountOfErrorStat"] / obj["amountOfTriesStat"]) * 100)) + "%";
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
        getStatsFromDB();



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

function openBackGame() {


    window.location = "index.html";

}


function openOptions() {


    window.location = "options.html";

}