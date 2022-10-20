"use strict";function _defineProperty(e,t,i){return t in e?Object.defineProperty(e,t,{value:i,enumerable:!0,configurable:!0,writable:!0}):e[t]=i,e}function defineQueueFair(){window.QueueFair=class{constructor(){_defineProperty(this,"reported",0),_defineProperty(this,"isLocal",!1),_defineProperty(this,"debug",!1),_defineProperty(this,"parsing",!1),_defineProperty(this,"protocol","https"),_defineProperty(this,"cookieNameBase","QueueFair-Pass-"),_defineProperty(this,"log",(function(){})),_defineProperty(this,"redirectLoc",null),_defineProperty(this,"adapterResult",null),_defineProperty(this,"adapterQueue",null),_defineProperty(this,"settings",null),_defineProperty(this,"clientName",null),_defineProperty(this,"oldHref",document.location.href),_defineProperty(this,"passed",Array()),_defineProperty(this,"extra",null),_defineProperty(this,"scriptSrc",null),_defineProperty(this,"queueDomain",null)}includes(e,t){return-1!=e.indexOf(t)}startsWith(e,t){return 0===e.indexOf(t)}endsWith(e,t){return-1!=e.indexOf(t)&&e.indexOf(t)==e.length-t.length}reset(){this.parsing=!1,this.passed=Array(),this.redirectLoc=null,this.adapterResult=null,this.adapterQueue=null}extractClientName(){let e=document.getElementsByTagName("script");for(let t=0;t<e.length;t++){let i=e[t],r=i.dataset;console.log(r);let n=r.queueFairClient;if(!n)continue;this.clientName=n,r.queueFairDebug&&(this.debug=!0);let s=r.queueFairDomain;s&&(this.queueDomain=s),this.extra=r.queueFairExtra,this.scriptSrc=i.getAttribute("src");break}this.debug&&(this.log=console.log.bind(window.console))}extractClientNameFromDataLayer(){if("undefined"!=typeof dataLayer&&dataLayer){for(var e in dataLayer){let t=dataLayer[e];if(void 0===t.g)continue;let i=t.g.queueFairClient;if(!i)continue;this.clientName=i;let r=t.g.queueFairDebug;r&&"false"!==r&&(this.debug=!0);let n=t.g.queueFairDomain;n&&(this.queueDomain=n);let s=t.g.queueFairExtra;s&&(this.extra=s);break}this.debug&&(this.log=console.log.bind(window.console))}}isMatch(e){return!!(e&&e.activation&&e.activation.rules)&&this.isMatchArray(e.activation.rules)}isMatchArray(e){if(!e)return!1;for(var t=!0,i=!1,r=e.length,n=0;n<r;n++){var s=e[n];if(!t&&s.operator){if("And"==s.operator&&!i)return!1;if("Or"==s.operator&&i)return!0}var a=this.isRuleMatch(s);if(t)i=a,t=!1,this.log("  Rule 1: "+(a?"true":"false"));else if(this.log("  Rule "+(n+1)+": "+(a?"true":"false")),"And"==s.operator){if(!(i=i&&a))break}else if("Or"==s.operator&&(i=i||a))break}return this.log("Final result is "+(i?"true":"false")),i}isRuleMatch(e){let t=""+window.location;if(this.log("Loc is "+t),"Domain"==e.component)t=t.replace("http://","").replace("https://","").split(/[/?#]/)[0];else if("Path"==e.component){let e=t.replace("http://","").replace("https://","").split(/[/?#]/)[0];t=t.substring(t.indexOf(e)+e.length);let i=0;this.startsWith(t,":")&&(i=t.indexOf("/"),t=-1!=i?t.substring(i):""),i=t.indexOf("#"),-1!=i&&(t=t.substring(0,i)),i=t.indexOf("?"),-1!=i&&(t=t.substring(0,i)),""==t&&(t="/")}else if("Query"==e.component){let e=t.indexOf("?");t=-1==e||"?"==t?"":t.substring(e+1)}else"Cookie"==e.component&&(t=this.getCookie(e.name));let i=e.value;!1===e.caseSensitive&&(t=t.toLowerCase(),i&&(i=i.toLowerCase())),this.log("Testing "+e.component+" "+i+" against "+t);let r=!1;if("Equal"==e.match&&t==i)r=!0;else if("Contain"==e.match&&null!==t&&this.includes(t,i))r=!0;else if("Exist"==e.match)r=null!=t&&""!==t;else if("RegExp"==e.match){null==t&&(t=""),r=new RegExp(i).test(t)}return e.negate&&(r=!r),r}onMatch(e){if(this.isPassed(e)){if(this.log("Already passed "+e.name+"."),"CLEAR"!=this.extra)return!0;{let t=this.getCookie(this.cookieNameBase+e.name);if(this.log("Clear receieved - cookie is "+t),""===t)return!0;this.setCookie(e.name,t,20,e.cookieDomain)}}return this.log("Checking at server "+e.displayName),this.consultAdapter(e),!1}isPassed(e){if(this.passed[e.name])return this.log("Queue "+e.name+" marked as passed already."),!0;let t=this.getCookie(this.cookieNameBase+e.name);return t&&""!==t?this.includes(t,e.name)?(this.log("Got a queueCookie for "+e.name+" "+t),!0):(this.log("Cookie value is invalid for "+e.name),!1):(this.log("No cookie found for queue "+e.name),!1)}getCookie(e){if(!e)return"";try{let t=document.cookie;if(!t)return"";let i=e+"=",r=t;try{r=decodeURIComponent(t)}catch(e){try{r=unescape(t)}catch(e){}}let n=r.split(";");for(let e=0;e<n.length;e++){let t=n[e];for(;" "==t.charAt(0);)t=t.substring(1);if(0===t.indexOf(i))return t.substring(i.length,t.length)}}catch(e){this.errorHandler(e)}return""}gotSettings(){try{this.log("Got client settings."),this.checkQueryString(),this.parseSettings()}catch(e){this.log("QF Error "),this.log(e),this.errorHandler(e)}}parseSettings(){if(!this.settings)return void this.log("ERROR: Settings not set.");let e=this.settings.queues;if(e&&e[0]){this.parsing=!0,this.log("Running through queue rules");for(let t=0;t<e.length;t++){let i=e[t];if(this.passed[i.name])this.log("Already passed "+i.displayName+" "+this.passed[i.name]);else if(this.log("Checking "+i.displayName),this.isMatch(i)){if(this.log("Got a match "+i.displayName),!this.onMatch(i))return void this.log("Found matching unpassed queue "+i.displayName)}else this.log("Rules did not match "+i.displayName)}this.log("All queues checked."),this.parsing=!1,"undefined"!=typeof qfOnJSAdapterComplete&&qfOnJSAdapterComplete()}else this.log("No queues found.")}consultAdapter(e){this.adapterQueue=e;let t=document.createElement("script"),i=this.protocol+"://"+e.adapterServer+"/adapterjs/"+e.name+"?qfa="+this.clientName+"&ts="+(new Date).getTime();i=this.appendExtra(e,i),this.log("Checking adapter "+i),t.src=i,document.getElementsByTagName("head")[0].appendChild(t)}appendQueryOrAmp(e){return-1!=e.indexOf("?")?e+="&":e+="?",e}appendVariant(e,t){if(this.log("Looking for variant"),!e)return t;let i=this.getVariant(e);return i?(this.log("Found variant "+i),t=this.appendQueryOrAmp(t),t+="qfv="+encodeURIComponent(i)):(this.log("No Variant Found"),t)}appendExtra(e,t){return this.extra&&e?(t=this.appendQueryOrAmp(t),t+="qfx="+encodeURIComponent(this.extra)):t}getVariant(e){if(this.log("Getting variants for "+e.name),!e.activation)return null;let t=e.activation.variantRules;if(!t)return null;this.log("Got variant rules for "+e.name);for(let e=0;e<t.length;e++){let i=t[e],r=i.variant,n=i.rules,s=this.isMatchArray(n);if(this.log("Variant match "+r+" "+s),s)return r}return null}restoreAdapterQueue(){if(this.adapterQueue)return null;if(!this.settings)return"No adapterQueue and no settings!";if(!this.settings.queues)return"No adapterQueue and no queues!";let e=this.settings.queues;if(!this.adapterResult.queue)return"No adapaterQueue and no queue in result!";let t=this.adapterResult.queue;if(0===e.length)return"adapterQueue "+t+" not in empty settings!";for(let i=0;i<e.length;i++){let r=e[i];if(r.name===t)return this.adapterQueue=r,null}return"adapterQueue "+t+" not found."}gotAdapter(){try{let t=this.adapterResult;if(this.log("Got from adapter "+JSON.stringify(t)),!t)return void this.log("ERROR: onAdapter() called without result");if(t.action||this.log("ERROR: onAdapter() called without result action"),"SendToQueue"==t.action){this.log("Sending to queue server.");let i=this.restoreAdapterQueue(t);var e="enabled";i?this.log("Recoverable Error - no adapterQueue for "+JSON.stringify(t)):e=this.adapterQueue.dynamicTarget;let r="",n=""+window.location;"disabled"!=e&&(r+="target=",r+=encodeURIComponent(n));let s=t.location;if(this.queueDomain){let e=this.queueDomain;this.log("Using queueDomain "+e+" on "+s);let t=s.indexOf("//");if(-1!=t){t+=2;let i=s.indexOf(":",t),r=s.indexOf("/",t);s=-1==i?-1==r?s.substring(0,t)+e:s.substring(0,t)+e+s.substring(r):-1==r||i<r?s.substring(0,t)+e+s.substring(i):s.substring(0,t)+e+s.substring(r)}this.log("queueDomain applied "+s)}""!==r&&(s=s+"?"+r);let a=this.adapterQueue;return s=this.appendVariant(a,s),s=this.appendExtra(a,s),this.log("Redirecting to "+s),this.redirectLoc=s,void setTimeout(queueFair.redirect,100)}if("CLEAR"==t.action)return this.log("CLEAR received for "+t.queue),this.passed[t.queue]=!0,void(this.parsing&&this.parseSettings());let i=this.restoreAdapterQueue();if(i)throw new Error(i);let r=this.adapterQueue;this.setCookie(t.queue,t.validation,60*r.passedLifetimeMinutes,r.cookieDomain),this.log("Marking "+t.queue+" as passed by adapter."),this.passed[t.queue]=!0,this.parsing&&this.parseSettings()}catch(e){this.log("QF Error "+JSON.stringify(e)),this.errorHandler(e)}}redirect(){queueFair.log("Redirecting to "+queueFair.redirectLoc),window.location=queueFair.redirectLoc}setCookie(e,t,i,r){this.log("Setting cookie for "+e+" to "+t+" on "+r);let n=this.cookieNameBase+e,s=new Date;s.setTime(s.getTime()+1e3*i);var a=n+"="+t;null==r||""===r||(a+="; domain="+r),a+="; path=/;expires="+s.toUTCString(),this.startsWith(""+document.location,"https://")&&(a+="; Secure; SameSite=None"),this.log("Setting cookie "+a),document.cookie=a}loadSettings(){let e=document.createElement("script"),t=this.clientName+"/queue-fair-settings.js";if(!this.isLocal){let e=!1,i=this.scriptSrc;if(null!=i){let r=i.indexOf("://");if(-1!=r){r+=3;let n=i.indexOf("/",r);-1!=n&&(t=this.protocol+"://"+i.substring(r,n)+"/"+t,e=!0)}}e||(t=this.protocol+"://files.queue-fair.net/"+t)}e.src=t,document.getElementsByTagName("head")[0].appendChild(e)}checkQueryString(){let e=""+window.location.search;if(-1==e.indexOf("qfqid="))return;let t=e.indexOf("qfq=");if(-1==t)return;let i=e.indexOf("&",t),r=e.substring(t+"qfq=".length,i),n=this.settings.queues;for(let t=0;t<n.length;t++){let i=n[t];if(i.name!=r)continue;this.log("Found queue for querystring "+r);let a=""+e;a=a.substring(a.indexOf("qfqid")),this.setCookie(r,a,60*i.passedLifetimeMinutes,i.cookieDomain),this.log("Marking "+r+" as passed by queryString"),this.passed[r]=!0;let o=""+document.location,u=o.lastIndexOf("#");var s=null;-1!=u&&(s=o.substring(u)),o=o.substring(0,o.indexOf("qfqid=")-1),null!=s&&(o+=s),window.history.replaceState({},document.title,o)}}onLocChange(){try{this.reset(),this.parseSettings()}catch(e){this.log("QF Error on Loc Change"),this.log(e),this.errorHandler(e)}}locWatch(){var e=document.querySelector("body");new MutationObserver((function(e){e.forEach((function(e){queueFair.oldHref!=document.location.href&&(queueFair.oldHref=document.location.href,queueFair.log("Location changed to "+queueFair.oldHref),queueFair.onLocChange())}))})).observe(e,{childList:!0,subtree:!0})}errorHandler(e){try{if(console.log(e),this.reported>5)return;this.reported++;var t={name:e.name,message:e.message,url:document.location.href,stack:e.stack};let i=document.createElement("script"),r={};r.err=e,r.errorData=t,r.parsing=this.parsing,r.protocol=this.protocol,r.redirectLoc=this.redirectLoc,r.adapterResult=this.adapterResult,r.adapterQueue=this.adapterQueue,r.hasSettings=null!==this.settings,r.clientName=this.clientName;let n=this.protocol+"://quality.queue-fair.net/onerror?err="+encodeURIComponent(JSON.stringify(r));i.src=n,document.getElementsByTagName("head")[0].appendChild(i)}catch(e){console.log("Error in handler"),console.log(e)}}go(){try{if(-1!=(""+window.location).indexOf("QFDEBUG")&&(this.debug=!0),window.addEventListener("load",(function(){queueFair.locWatch()})),this.extractClientName(),!this.clientName)try{this.extractClientNameFromDataLayer()}catch(e){this.errorHandler(e)}if(!this.clientName)return void console.log("ERROR Queue-Fair couldn't find the client name. Please check the data-queue-fair-client parameter in the script tag on your page or tag manager.");this.loadSettings()}catch(e){console.log("QF Error "+e.message),this.errorHandler(e)}}}}var queueFair;void 0===window.QueueFair&&(defineQueueFair(),(queueFair=new QueueFair).go());