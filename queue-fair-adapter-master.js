function defineQueueFair() {
window.QueueFair = class {

	reported=0;

	isLocal=false;
	debug=false;
	parsing=false;

	protocol="https";

	cookieNameBase="QueueFair-Pass-";
	
	log = function() {};
	
	redirectLoc=null;

	adapterResult=null;
	adapterQueue=null;
	settings=null;
	clientName=null;

	oldHref = document.location.href;

	passed = Array();

    extra=null;
    scriptSrc=null;
    
    queueDomain = null;
  
    includes(haystack, needle) {
       return (haystack.indexOf(needle)!=-1)
    }
  
    startsWith(haystack, needle) {
     	return (haystack.indexOf(needle)===0);
    }

    endsWith(haystack, needle) {
	return(haystack.indexOf(needle) != -1 
	    && haystack.indexOf(needle) == haystack.length-needle.length);
    }

	reset() {
		this.parsing = false;
		this.passed = Array();
		this.redirectLoc=null;
		this.adapterResult=null;
		this.adapterQueue=null;
	}

	extractClientName() {
		let scriptTags=document.getElementsByTagName("script");
		for(let i=0; i<scriptTags.length; i++) {
			let t=scriptTags[i];
			let a = t.dataset;
			let clientName=a["queueFairClient"];
			if(!clientName) {
				continue;
			}
			this.clientName=clientName;
			let debugState=a["queueFairDebug"];
			if(debugState) {
				this.debug=true;
			}
			let qs = a["queueFairDomain"];
			if(qs) {
			    this.queueDomain = qs;
			}
			this.extra=a["queueFairExtra"];
			this.scriptSrc = t.getAttribute("src");
			break;
		}
		if(this.debug) {
			this.log=console.log.bind(window.console);
		}
	}
	
	extractClientNameFromDataLayer() {
	    if(typeof dataLayer === "undefined" || !dataLayer) {
	        return;
	    }
	    for(var i in dataLayer) {
	        let o=dataLayer[i];
	        if(typeof o.g === "undefined") {
	            continue;
	        }
	        let clientName = o.g.queueFairClient;
	        if(!clientName) {
	            continue;
	        }
	        this.clientName = clientName;
	        let debugState=o.g.queueFairDebug;
			if(debugState && debugState !== "false") {
				this.debug=true;
			}
			let qs = o.g.queueFairDomain;
			if(qs) {
			    this.queueDomain = qs;
			}
			let extra=o.g.queueFairExtra;
			if(extra) {
    			this.extra=extra;
			}
			break;
	    }
 	    if(this.debug) {
			this.log=console.log.bind(window.console);
		}
	}

	isMatch(queue) {
		if(!queue || !queue.activation || !queue.activation.rules) {
                        return false;
                }
		return this.isMatchArray(queue.activation.rules);
	}
	
	isMatchArray(arr)
    {
        if (!arr) {
            return false;
        }

        var firstOp = true;
        var state = false;

        var lim = arr.length;
        for (var i = 0; i < lim; i++) {
            var rule = arr[i];

            if (!firstOp && rule.operator) {
                if ((rule.operator == "And") && !state) {
                    return false;
                } else if((rule.operator == "Or") && state) {
                    return true;
                }
            }

            var ruleMatch = this.isRuleMatch(rule);

            if (firstOp) {
                state = ruleMatch;
                firstOp = false;
                this.log("  Rule 1: " + ((ruleMatch) ? "true" : "false"));
            } else {
                this.log("  Rule " + (i+1) + ": " + ((ruleMatch) ? "true" : "false"));
                
                if (rule.operator == "And") {
                    state = (state && ruleMatch);
                    if (!state) {
                        break;
                    }
                } else if (rule.operator == "Or") {
                    state = (state || ruleMatch);
                    if (state) {
                        break;
                    }
                }
            }
        }

        this.log("Final result is " + ((state) ? "true" : "false"));

        return state;
    }
	
	isRuleMatch(rule) {
		let comp=""+window.location;
		this.log("Loc is "+comp);
		if(rule.component=="Domain") {
			comp=comp.replace('http://','').replace('https://','')
			    .split(/[/?#]/)[0];
		} else if(rule.component=="Path") {
			let domain=comp.replace('http://','').replace('https://','')
			    .split(/[/?#]/)[0];
			comp=comp.substring(comp.indexOf(domain)+domain.length);
				
			let i=0;
			if(this.startsWith(comp,":")) {
				//We have a port
				i=comp.indexOf("/");
				if(i !=-1 ) {
					comp=comp.substring(i);
				} else {
				    comp="";
				}
			}
			i=comp.indexOf("#");
			if(i!=-1) {
				comp=comp.substring(0,i);
			}
			i=comp.indexOf("?");
			if(i!=-1) {
				comp=comp.substring(0,i);
			}

			if(!comp) {
				comp="/";
			}
		} else if(rule.component=="Query") {
			let i = comp.indexOf('?');
			if (i == -1) {
				comp = "";
			} else if(comp == "?") {
				comp="";
			} else {
				comp = comp.substring(i+1);
			}
		} else if(rule.component=="Cookie") {
			comp=this.getCookie(rule.name);	
		}

		let test=rule.value;

		if(rule.caseSensitive===false) {
			comp=comp.toLowerCase();
			if(test) {
			    test=test.toLowerCase();
			}
		}
	  	this.log("Testing "+rule.component+" "+test+" against "+comp);

		let ret=false;

		if(rule.match=="Equal" && comp == test) {
			ret=true;
		} else if(rule.match=="Contain" && comp!==null 
		    && this.includes(comp,test)) {
			ret=true;
		} else if(rule.match=="Exist") {
			if(typeof comp == 'undefined' || comp===null || ""===comp) {
				ret=false;
            } else {
				ret=true;
            }
		} else if (rule.match == "RegExp") {
		    if(typeof comp == 'undefined' || comp === null) {
				comp = "";
            }
            let r = new RegExp(test);  
            ret = r.test(comp);
		}
		
		if(rule.negate) {
			ret=!ret;
		}

		return ret;
	}

	onMatch(queue) {
		if(this.isPassed(queue)) {
			this.log("Already passed "+queue.name+".");
			if(this.extra == "CLEAR") {
			    let val=this.getCookie(this.cookieNameBase+queue.name);
			    this.log("Clear receieved - cookie is "+val);
			    if(""!==val) {
			        this.setCookie(queue.name, val, 20, queue.cookieDomain);
			    } else {
			        return true;
			    }
			} else {
			    return true;
			}
		}
		this.log("Checking at server "+queue.displayName);	
		this.consultAdapter(queue);
		return false;
	}

	isPassed(queue) {
		if(this.passed[queue.name]) {
			this.log("Queue "+queue.name+" marked as passed already.");
			return true;
		}
		let queueCookie=this.getCookie(this.cookieNameBase+queue.name);	
		if(!queueCookie || queueCookie==="") {
			this.log("No cookie found for queue "+queue.name);
			return false;
		}
		if(!this.includes(queueCookie,queue.name)) {
			this.log("Cookie value is invalid for "+queue.name);
			return false;
		}
		this.log("Got a queueCookie for "+queue.name+" "+queueCookie);
		return true;
	}

	getCookie(cname) {
		if(!cname) {
			return "";
		}
		try {
      		let co = document.cookie;
    		if(!co) {
	    	    return "";
		    }
	
      		let name = cname + "=";
  	    	let decodedCookie = co;
  		    try {
  		        decodedCookie = decodeURIComponent(co);
  		    } catch (err) {
                try {
                    decodedCookie = unescape(co)
                } catch (err) {
                }
  		    }
  		    let ca = decodedCookie.split(';');
  		    for(let i = 0; i <ca.length; i++) {
    			let c = ca[i];
    			while (c.charAt(0) == ' ') {
      				c = c.substring(1);
    			}
    			if (c.indexOf(name) === 0) {
      				return c.substring(name.length, c.length);
    		    }
  		    }
		} catch (err) {
		    this.errorHandler(err);
		}
	    return "";
	}

	gotSettings() {
		try {
			this.log("Got client settings."); 
			this.checkQueryString();

			this.parseSettings();
		} catch(err) {
			this.log("QF Error ");
			this.log(err);
			this.errorHandler(err);
		}
	}


	parseSettings() {
		if(!this.settings) {
			this.log("ERROR: Settings not set.");
			return;
		}
		let queues=this.settings.queues;
		if(!queues || !queues[0]) {
			this.log("No queues found.");
			return;
		}
		this.parsing=true;
		this.log("Running through queue rules");
		for(let i=0; i<queues.length; i++) {
			let queue=queues[i];
			if(this.passed[queue.name]) {
				this.log("Already passed " + queue.displayName 
				    + " "+this.passed[queue.name]);
				continue;
			}
			this.log("Checking "+queue.displayName);
			if(this.isMatch(queue)) {
				this.log("Got a match "+queue.displayName);
				if(!this.onMatch(queue)) {
					this.log("Found matching unpassed queue "
					 + queue.displayName);
					return;
				}
			} else {
				this.log("Rules did not match "+queue.displayName);
			}
		}
		this.log("All queues checked.");
		this.parsing=false;
		if(typeof qfOnJSAdapterComplete !== "undefined") {
		  qfOnJSAdapterComplete();
		}
	}

	consultAdapter(queue) {
		this.adapterQueue = queue;
        let queueTag = document.createElement('script');
		let src = this.protocol + "://" + queue.adapterServer + "/adapterjs/"
		    + queue.name + "?qfa=" + this.clientName + "&ts=" 
		    + (new Date().getTime());
		src = this.appendExtra(queue, src);
		this.log("Checking adapter "+src);
		queueTag.src=src;
		document.getElementsByTagName('head')[0].appendChild(queueTag);
	}

    appendQueryOrAmp(redirectLoc) {
		if(redirectLoc.indexOf('?') != -1) {
			redirectLoc+="&";
		} else {
			redirectLoc+="?";
		}
		return redirectLoc;
    }
    
	appendVariant(queue, redirectLoc) {
		this.log("Looking for variant");
		if(!queue) {
		    return redirectLoc;
		}
		let variant=this.getVariant(queue);
		if(!variant) {
			this.log("No Variant Found");
			return redirectLoc;
		}
		this.log("Found variant "+variant);
        
        redirectLoc=this.appendQueryOrAmp(redirectLoc);
        
		redirectLoc+="qfv="+encodeURIComponent(variant);
		return redirectLoc;
	}
	
	appendExtra(queue, redirectLoc) {
        if(!this.extra) {
            return redirectLoc;
        }
	    if(!queue) {
		    return redirectLoc;
		}
        redirectLoc=this.appendQueryOrAmp(redirectLoc);
        redirectLoc+="qfx="+encodeURIComponent(this.extra);
        return redirectLoc;
	}
	
	getVariant(queue) {
		this.log("Getting variants for "+queue.name);
		if(!queue.activation) {
			return null;	
		}	
		let variantRules=queue.activation.variantRules;
		if(!variantRules) {
			return null;
		}
		this.log("Got variant rules for "+queue.name);
		for(let i=0; i<variantRules.length; i++) {
                        let variant=variantRules[i];
			let variantName=variant.variant;
			let rules=variant.rules;
		    let ret = this.isMatchArray(rules);		
			this.log("Variant match "+variantName+" "+ret);
			if(ret) {
				return variantName;
			}
        }
	
		return null;
	}
	
	restoreAdapterQueue() {
	    if(this.adapterQueue) {
	        //All good.
	        return null;
	    }
	    if(!this.settings) {
		    return "No adapterQueue and no settings!";
	    }
		if(!this.settings.queues) {
			return "No adapterQueue and no queues!";
	    }
	    let sqs = this.settings.queues;
	    if(!this.adapterResult.queue) {
	        return "No adapaterQueue and no queue in result!";
	    }
	    let q = this.adapterResult.queue;
		if(sqs.length === 0) {
	        return "adapterQueue "+q+" not in empty settings!";
	    }
	    for(let i=0; i< sqs.length; i++) {
	        let queue = sqs[i];
	        if(queue.name === q) {
	            this.adapterQueue = queue;
        	    return null;
	        }
	    }
	    return "adapterQueue "+q+" not found.";
	}

	gotAdapter() {
		try {
		    let ar = this.adapterResult;
			this.log("Got from adapter "+JSON.stringify(ar));
			if(!ar) {
				this.log("ERROR: onAdapter() called without result"); 
				return;
			}
			if(!ar.action) {
				this.log("ERROR: onAdapter() called without result action"); 
			}
			
			if(ar.action=="SendToQueue") {
				this.log("Sending to queue server.");
				
                let st = this.restoreAdapterQueue(ar);
                var dynamicTarget = "enabled";
			    if(st) {
			        this.log("Recoverable Error - no adapterQueue for "+JSON.stringify(ar));
			    } else {
			        dynamicTarget = this.adapterQueue.dynamicTarget;
			    }
				let queryParams="";
				let winLoc = ""+window.location;
				if(dynamicTarget != "disabled") {
					queryParams+="target=";
					queryParams+=encodeURIComponent(winLoc);
				} 
				let redirectLoc = ar.location;
			    
				if(this.queueDomain) {
				    let qd = this.queueDomain;
				    this.log("Using queueDomain "+qd+" on "+redirectLoc);
				    let i = redirectLoc.indexOf("//");
				    if(i!=-1) {
				        i+=2;
				        let colPos = redirectLoc.indexOf(":",i);
				        let slashPos = redirectLoc.indexOf("/",i);
				        if(colPos==-1) {
				            //no colon
				            if(slashPos==-1) {
				                //https://some.domain
				                redirectLoc= redirectLoc.substring(0,i)+qd;
				            } else {
				                //https://some.domain/path
				                redirectLoc= redirectLoc.substring(0,i)+qd+redirectLoc.substring(slashPos);
				            }
				        } else {
				            //has a colon
				            if(slashPos == -1) { 
				                //colon no slash
				                //https://some.domain:8080
				                redirectLoc= redirectLoc.substring(0,i)+qd+redirectLoc.substring(colPos);
				            } else if(colPos < slashPos) {
    				                //https://some.domain:8080/path
				                redirectLoc= redirectLoc.substring(0,i)+qd+redirectLoc.substring(colPos);
				            } else {
    		                    //https://some.domain/path?param=:
	    		                redirectLoc= redirectLoc.substring(0,i)+qd+redirectLoc.substring(slashPos);
				            }
				        }
				    }
				    this.log("queueDomain applied "+redirectLoc);
				}
				
				if(queryParams!=="") {
					redirectLoc=redirectLoc+"?"+queryParams;
				}
				let aq = this.adapterQueue;
				redirectLoc=this.appendVariant(aq, redirectLoc);
				redirectLoc=this.appendExtra(aq, redirectLoc);
				
				this.log("Redirecting to "+redirectLoc);
				this.redirectLoc=redirectLoc;
				setTimeout(queueFair.redirect,100);
				return;
			}
			//Remain on page.
			
			if(ar.action=="CLEAR") {
			    this.log("CLEAR received for "+ar.queue);
			    this.passed[ar.queue]=true;
			    if(this.parsing) {
			        this.parseSettings();
			    }
			    return;
			}

			//SafeGuard etc 
			let st = this.restoreAdapterQueue();
			if(st) {
			    throw new Error(st);
			}
			let aq = this.adapterQueue;
			this.setCookie(ar.queue,
			ar.validation, 
			aq.passedLifetimeMinutes*60, 
			aq.cookieDomain);
		
			this.log("Marking "+ar.queue+" as passed by adapter.");
			this.passed[ar.queue]=true;

			if(this.parsing) {
				this.parseSettings();
			}
		} catch (err) {
			this.log("QF Error "+JSON.stringify(err));
			this.errorHandler(err);
		}	
	}

	redirect() {
	    queueFair.log("Redirecting to "+queueFair.redirectLoc);
		window.location=queueFair.redirectLoc;
	}

	setCookie(queueName, value, lifetimeSeconds, cookieDomain) {
		this.log("Setting cookie for " + queueName + " to " + value
		    + " on " + cookieDomain);
		
		let cookieName=this.cookieNameBase+queueName;
		
		let date=new Date();

		date.setTime(date.getTime()+lifetimeSeconds*1000);
	    var  theCookie=cookieName+"="+value;
	    if(typeof cookieDomain === 'undefined' || cookieDomain===null 
	        || ""===cookieDomain) {
	    } else {
	        theCookie+="; domain="+cookieDomain;
	    }
	    theCookie+="; path=/;expires="+date.toUTCString();
	    if(!this.startsWith(""+document.location,"https://")) {
	        //do nothing
	    } else {
	        theCookie+="; Secure; SameSite=None";
	    }
	    
	    this.log("Setting cookie "+theCookie);
		document.cookie = theCookie;
	}


	loadSettings() {
		let settingsTag = document.createElement('script');
		let src = this.clientName+"/queue-fair-settings.js";
		if(!this.isLocal) {
		    let fromTag=false;
		    let s = this.scriptSrc;
		    if(s != null) {
		        let i = s.indexOf("://");
		        if(i!=-1) {
		            i+=3;
		            let j = s.indexOf("/",i);
		            if(j != -1) {
		                src = this.protocol+"://"+s.substring(i,j)+"/"+src;
		                fromTag = true;
		            }
		        }
		    } 
		    if(!fromTag) {
			    src=this.protocol+"://files.queue-fair.net/"+src;
		    }
		}
		settingsTag.src=src;
		document.getElementsByTagName('head')[0].appendChild(settingsTag);
	}

	checkQueryString() {
		let urlParams = ""+window.location.search;
		let q=urlParams.indexOf("qfqid=");
		if(q==-1) {
			return;
		}

		let i=urlParams.indexOf("qfq=");
		if(i==-1)
			return;
		let j=urlParams.indexOf("&",i);

		let queueName=urlParams.substring(i+"qfq=".length,j);
		
		let sqs = this.settings.queues;
		for(let i=0; i<sqs.length; i++) {
			let queue=sqs[i];
			if(queue.name != queueName) {
				continue;
			}

			this.log("Found queue for querystring "+queueName);
			let value=""+urlParams;
			value=value.substring(value.indexOf("qfqid"));
			this.setCookie(queueName, value, queue.passedLifetimeMinutes*60,
			    queue.cookieDomain);

			this.log("Marking "+queueName+" as passed by queryString");
			this.passed[queueName]=true;

			let loc=""+document.location;
            
            let j = loc.lastIndexOf("#");
            var savedFragment = null;
            if(j!=-1) {
                savedFragment = loc.substring(j);
            }
            loc=loc.substring(0,loc.indexOf("qfqid=")-1);
            if(savedFragment != null) {
                loc += savedFragment;
            }
            window.history.replaceState({}, document.title, loc);

		}
	}

	onLocChange() {
		try {
			this.reset();
			this.parseSettings();
		} catch(err) {
            this.log("QF Error on Loc Change");
            this.log(err);
            this.errorHandler(err);
        }
	}

	locWatch() {
	    var bodyList = document.querySelector("body");

	    var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (queueFair.oldHref != document.location.href) {
        	        queueFair.oldHref = document.location.href;
			        queueFair.log("Location changed to "+queueFair.oldHref);
			        queueFair.onLocChange();
	            }
            });
        });
	
    	var config = {childList: true, subtree: true };
    	observer.observe(bodyList, config);
	}

	errorHandler(err) {
		try {
			console.log(err);
			if(this.reported > 5) {
				//Reported too many errors.
				return;
			}
			this.reported++;		
            var errorData={ "name": err.name,
                			"message": err.message,
                			"url": document.location.href,
                			"stack": err.stack };
        	let errorTag = document.createElement('script');
        	let res = {};
        	res.err = err;
        	res.errorData = errorData;
        	res.parsing = this.parsing;
        	res.protocol = this.protocol;
            res.redirectLoc = this.redirectLoc;
            res.adapterResult = this.adapterResult;
            res.adapterQueue = this.adapterQueue;
            res.hasSettings = (this.settings !== null);
            res.clientName = this.clientName;
            
            let src = this.protocol+"://quality.queue-fair.net/onerror?err="+encodeURIComponent(JSON.stringify(res));
		    errorTag.src = src;
		    document.getElementsByTagName('head')[0].appendChild(errorTag);
        } catch (err) {
        	console.log("Error in handler");
        	console.log(err)
        }
	}

	go() {
		try {
		    if((""+window.location).indexOf("QFDEBUG")!=-1) {
		        this.debug=true;
		    }
			window.addEventListener("load",function() {
				queueFair.locWatch();
			});
    		this.extractClientName();
			if(!this.clientName) {
			    try {
			        this.extractClientNameFromDataLayer();
			    } catch (err) {
			        this.errorHandler(err);
			    }
			}
			if(!this.clientName) {
				console.log("ERROR Queue-Fair couldn't find the client name. Please check the data-queue-fair-client parameter in the script tag on your page or tag manager.");
				return;
			}
			this.loadSettings();
		} catch (err) {
			console.log("QF Error "+err.message);
			this.errorHandler(err);
		}
		
	}
}
}

var queueFair;

if(typeof window.QueueFair === "undefined") {
    defineQueueFair();
    queueFair=new QueueFair();
    queueFair.go();
}
