var badPagesURL = "https://www.coi.cz/userdata/files/dokumenty-ke-stazeni/open-data/rizikove.csv";
var badPagesInfoURL = "https://www.coi.cz/pro-spotrebitele/rizikove-e-shopy/";
var badPages = null;
var badPagesInfo = null;

const LAST_UPDATE_KEY = "last_update";
const WAS_UPDATED_KEY = "was_updated";
const PAGES_KEY = "pages";
const PAGES_INFO = "pages_info";

var pages;
var pagesArray;

var beginTime = new Date().getTime();

  
function downloadBadPages(){
    var request = new XMLHttpRequest();
    request.responseType = 'text';
    request.open('get', badPagesURL, true);
    request.setRequestHeader("Set-Cookie", "SameSite=strict");
    
    request.addEventListener('readystatechange', function(e) {
        if(request.readyState == 4) {
            console.log("Suspicious web pages downloaded.");
            console.log("Seznam stažen za čas: "+(new Date().getTime()-beginTime));
            saveBadPages(request.response);
        }
    });
    request.send();
}

function saveBadPages(pagesString){
    badPages = quickSortComparable(pagesString.split("\n"));
    browser.storage.local.set({PAGES_KEY:badPages, LAST_UPDATE_KEY: new Date().getTime(), WAS_UPDATED_KEY: true }, function(){
        console.log("Seznam uložen za čas: "+(new Date().getTime()-beginTime));
        downloadBadPagesInfo();
    });
}

function downloadBadPagesInfo(){
    var request = new XMLHttpRequest();
    request.responseType = 'text';
    request.open('get', badPagesInfoURL, true);
    request.setRequestHeader("Set-Cookie", "SameSite=strict");
    
    request.addEventListener('readystatechange', function(e) {
        if(request.readyState == 4) {
            console.log("Suspicious web pages info downloaded.");
            console.log("Důvod stažen za čas: "+(new Date().getTime()-beginTime));
            // console.log(request.response);
            saveBadPagesInfo(request.response);
        }
    });
    
    request.send();
}

function saveBadPagesInfo(htmlString){

    //najít všechny article.information-row
    var infoRows = [];
    var articleEnds = [];
    var searchInfoRow = true;

    for(var i = 0; i < htmlString.length; i++){
        if(searchInfoRow){
            if(checkWordInString("information-row", htmlString, i)){
                infoRows.push(i);
                searchInfoRow = false;
            }
        }else{
            if(checkWordInString("</article>", htmlString, i)){
                articleEnds.push(i);
                searchInfoRow = true;
            }
        }
    }

    if(infoRows.length !== articleEnds.length) console.log("Error while parsing information from coi.cz/pro-spotrebitele/rizikove-e-shopy")

    var infoList = [];

    for(var i = 0; i < infoRows.length; i++){
        
        var ps = [];
        var postId = "";
        
        var pBegin = 0, pEnd = infoRows[i];
        for(var k = 0; k < 3; k++){ //3 opakování, protože ve 4. <p> je jen ---------------
            pBegin = searchWordInString(">", htmlString, searchWordInString("<p", htmlString, pEnd, infoRows[i] + articleEnds[i]), infoRows[i] + articleEnds[i])+1;
            pEnd = searchWordInString("</p>", htmlString, pBegin, infoRows[i] + articleEnds[i]);
            var inTagName = false;
            var text = "";
            for(var j = pBegin; j < pEnd; j++){
                if(htmlString.charAt(j) === "<") {
                    inTagName = true;
                    continue;
                }
                if(htmlString.charAt(j) === ">") {
                    inTagName = false;
                    continue;
                }
                if(inTagName) continue;
                text += htmlString.charAt(j);
            }
            ps.push(text.trim());
        }

        var tagEndPos = searchWordInString(">", htmlString, infoRows[i], infoRows[i] + articleEnds[i]);
        var idPos = searchWordInString("id", htmlString, infoRows[i], tagEndPos);
        
        if(idPos !== -1){
            var j = idPos;
            var uvozovkyPos = [];
            while(j < tagEndPos){
                if(htmlString.charAt(j) === "\"")
                    uvozovkyPos.push(j);
                j++;
            }
            postId = htmlString.substring(uvozovkyPos[0]+1, uvozovkyPos[1]);
        }

        var pairs = ps[0].split("\n");
        for(var j = pairs.length-1; j >= 0; j--){
            pairs[j] = pairs[j].trim();
            if(pairs[j] === "") pairs.splice(j,1);
        }
        for(var j = 0; j < pairs.length; j++){
            var pairedPages = [];
            for(var k = 0; k < pairs.length; k++){
                pairedPages.push(pairs[k]);
            }
            infoList.push({url: urlBase(pairs[j]), reason: ps[1], date: ps[2], pages: pairedPages, postId: postId});
        }
    }

    infoList = quickSortObject(infoList, "url");
    console.log(infoList);
    badPagesInfo = infoList;
    console.log("Důvod parsován za čas: "+(new Date().getTime()-beginTime));
    // return;
    browser.storage.local.set({PAGES_INFO:infoList}, function(){
        console.log("Důvod uložen za čas: "+(new Date().getTime()-beginTime));
        triggerInfoReady();
    });
}

function triggerInfoReady(){
    console.log("triggerInfoReady() is not ready");
}

function quickSortObject(origArray, key){
    if (origArray.length <= 1) { 
		return origArray;
	} else {
		var left = [];
		var right = [];
		var newArray = [];
		var pivot = origArray.pop();
		var length = origArray.length;
		for (var i = 0; i < length; i++) {
            // console.log(origArray[i][key]);
			if (origArray[i][key] <= pivot[key]) {
				left.push(origArray[i]);
			} else {
				right.push(origArray[i]);
			}
		}
		return newArray.concat(quickSortObject(left, key), pivot, quickSortObject(right, key));
	}
}

function quickSortComparable(origArray) {
	if (origArray.length <= 1) { 
		return origArray;
	} else {
		var left = [];
		var right = [];
		var newArray = [];
		var pivot = origArray.pop();
		var length = origArray.length;
		for (var i = 0; i < length; i++) {
			if (origArray[i] <= pivot) {
				left.push(origArray[i]);
			} else {
				right.push(origArray[i]);
			}
		}
		return newArray.concat(quickSortComparable(left), pivot, quickSortComparable(right));
	}
}

function searchWordInString(word, source, position){
    return searchWordInString(word, source, position, source.length);
}

function searchWordInString(word, source, position, maxPosition){
    var maxSearchLength = source.length - word.length;
    maxSearchLength = (maxSearchLength < maxPosition ? maxSearchLength : maxPosition);
    for(var i = position; i < maxSearchLength; i++){
        if(checkWordInString(word, source, i)) return i;
    }
    return -1;
}

function checkWordInString(word, source, position){
    if(word.length + position > source.length) return false;
    for(var j = 0; j < word.length; j++){
        if(source[position+j] !== word[j]){
            return false;
        }
    }
    return true;
}

function binarySearchUrl(url){
    var left = 0;
    var right = badPages.length-1;
    var mid;
    while (left <= right){
        mid = Math.floor((right+left)/2);
        var midPage = badPages[mid].trim();
        if(midPage < url){
            left = mid + 1;
        }else if(midPage === url){
            return mid;
        }else{
            right = mid - 1;
        }
    }
    return -1;
}

function binarySearchPageInfo(url){
    // console.log(badPagesInfo);
    var left = 0;
    var right = badPagesInfo.length-1;
    var mid;
    while (left <= right){
        mid = Math.floor((right+left)/2);
        var midObj = badPagesInfo[mid];
        var midObjUrl = urlBase(midObj.url);
        // console.log("Comparing: "+url+" <> "+midObjUrl);
        if(midObjUrl < url){
            left = mid + 1;
        }else if(midObjUrl === url){
            return mid;
        }else{
            right = mid - 1;
        }
    }
    return -1;
}

function urlBase(url){
    if(url.includes("//")){
        url = url.substring(url.match("//").index+2);
    }
    var lomitkoIndex = -1;
    for(var i = 0; i < url.length; i++){
        if(url.charAt(i) === "/"){
            lomitkoIndex = i;
            break;
        }
    }
    if(lomitkoIndex === -1) lomitkoIndex = url.length;

    var i = lomitkoIndex;
    var beginIndex = -1;
    var dotContained = false;
    while(i > 0){
        if(url.charAt(--i) === "."){
            if(dotContained){
                beginIndex = i+1;
                break;
            }else{
                dotContained = true;
            }
        }
    }
    return url.substring(beginIndex, lomitkoIndex);
}

function getMessage(url){

    var doErrorMsg = false;
    var msg = {
        url: url,
        pages: "",
        reason: "",
        date: "",
        postId: "",
        error: ""
    }

    if(badPagesInfo !== null){
        var infoIndex = binarySearchPageInfo(urlBase(url));
        if(infoIndex !== -1){
            var badPage = badPagesInfo[infoIndex];
            msg.pages = badPage.pages;
            msg.reason = badPage.reason;
            msg.date = badPage.date;
            msg.postId = badPage.postId;
        }else{
            doErrorMsg = true;
        }
    }else{
        doErrorMsg = true;
    }


    if(doErrorMsg){
        msg.error = "Jejda! Něco se pokazilo při načítání důvodu, proč byla tato stránka blokována! Pravděpodobně jsme tyto informace ještě nestačili stáhnout ze stránek České obchodní inspekce. Doporučujeme chvíli počkat a znovu načíst tuto stránku nebo rovnou tuto stránku rovnou opustit.";
    }

    return msg;
    
}

browser.storage.local.get([LAST_UPDATE_KEY, WAS_UPDATED_KEY, PAGES_KEY, PAGES_INFO], function(result){
    var time = new Date().getTime();
    if(result.was_update == null || result.last_update == null){
        console.log("Downloading all informations. They weren't downloaded yet.")
        downloadBadPages();
    }else if((time - result.last_update)>(1000*60*60*24)){
        console.log("Downloading all informations. They are older then 24 hours.")
        downloadBadPages();
    }else{
        badPages = result.pages;
        badPagesInfo = result.pages_info;
    }
    
});

browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    sendResponse(getMessage(message));
});

browser.webRequest.onBeforeRequest.addListener(
    function(requestInfo){

        var beforeSearchTime = new Date().getTime();
        var pageIndex = binarySearchUrl(urlBase(requestInfo.url));
        console.log("Time to search: "+(new Date().getTime()-beforeSearchTime));
        if(pageIndex !== -1){
            var page = browser.runtime.getURL("rizikovyweb.html") + "?url="+urlBase(requestInfo.url);
            return {redirectUrl: page}
        }
    },
    {
        urls:["http://*/*","https://*/*"],
        types: ["main_frame", "sub_frame"]
    },
    ["blocking"]
);
