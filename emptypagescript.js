// console.log("Content script is running!");

var coiLink = "https://www.coi.cz/pro-spotrebitele/rizikove-e-shopy/";

function msgResponse(msg){
    // alert("I have message");
    // console.log("message was sent to content script: ");
    console.log(msg);
    
    var urlElement = document.getElementById("page_url");
    urlElement.innerText = " "+msg.url;
    
    var reasonTextElement1 = document.getElementById("reason_text_1");
    var reasonTextElement2 = document.getElementById("reason_text_2");
    var badPagesElement = document.getElementById("bad_pages");
    var infoElement = document.getElementById("info");
    var coiLinkElement = document.getElementById("coi_link");
    var errorMessageElement = document.getElementById("error_message");

    if(msg.error !== ""){

      errorMessageElement.innerHTML = "<p>"+msg.error+"</p>"

    }else{

      if(msg.pages.length === 1)
        reasonTextElement1.innerText = "Požadovaná stránka:";
      else
        reasonTextElement1.innerText = "Požadovaná stránka a další jí podobné:";
    
      if(msg.pages.length === 1)
        reasonTextElement2.innerText = "byla označena jako riziková z důvodu:";
      else
        reasonTextElement2.innerText = "byly označeny jako rizikové z důvodu:";
    
      var pages = "";
      for(var i = 0; i < msg.pages.length-1; i++){
        pages += msg.pages[i]+"</br>";
      }
      pages += msg.pages[msg.pages.length-1];
      badPagesElement.innerHTML = "<p>"+pages+"</p>";
  
      infoElement.innerHTML = "<p>"+msg.reason+"</p><p>"+msg.date+"</p>";
  
      if(msg.postId !== null)
        coiLinkElement.href = coiLink + "#" + msg.postId;
      else
        coiLinkElement.href = coiLink;
    }
    
};
// );

window.onload = function(){

    document.getElementById("button").onclick = function(){
      if(window.history.length === 1){
        window.close();
      }else{
        window.history.back();
      }
    };

    var pageURL = new URL(window.location.href);
    var URLParam = pageURL.searchParams.get("url");

    browser.runtime.sendMessage(URLParam, function(response){
      msgResponse(response);
    });

}