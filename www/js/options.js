

window.onload = function(){
    document.getElementById("submitOptionButton").onclick = function(){
    localStorage.setItem('firstLanguage', document.getElementById("lang1").value);
    localStorage.setItem('secondLanguage', document.getElementById("lang2").value);
    console.log(document.getElementById("slider").value);
    localStorage.setItem('amountOfWords', document.getElementById("slider").value);
    };
    


    document.getElementById("backToGameButton").onclick = openBackGame;

}

function openBackGame(){


    window.location = "index.html";
       
}





