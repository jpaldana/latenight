var qQueueLatenightLoaded = [];
var qQueueFirebaseLoaded = [];
var qQueueAllLoaded = [];
var qLatenightLoaded = false;
var qFirebaseLoaded = false;

var qTriggerLatenightLoaded = function() {
  console.log("* trigger latenight");
  qLatenightLoaded = true;
  qRunProc(qQueueLatenightLoaded, qLatenightLoaded);
  if (qFirebaseLoaded) {
    console.log("* also trigger firebase");
    qRunProc(qQueueFirebaseLoaded, qFirebaseLoaded);
    qRunProc(qQueueAllLoaded, true);
    hideLoader();
  }
};
var qTriggerFirebaseLoaded = function() {
  console.log("* trigger firebase");
  qFirebaseLoaded = true;
  qRunProc(qQueueFirebaseLoaded, qFirebaseLoaded);
  if (qLatenightLoaded) {
    console.log("* also trigger latenight");
    qRunProc(qQueueLatenightLoaded, qLatenightLoaded);
    qRunProc(qQueueAllLoaded, true);
    hideLoader();
  }
};
var qTriggerAllLoaded = function() {
  console.log("* trigger all");
  qLatenightLoaded = true;
  qFirebaseLoaded = true;
  qRunProc(qQueueLatenightLoaded, qLatenightLoaded);
  qRunProc(qQueueFirebaseLoaded, qFirebaseLoaded);
  qRunProc(qQueueAllLoaded, true);
  hideLoader();
};
var qWaitLatenightLoaded = function(fn) {
  if (qSafeProc(fn, qQueueLatenightLoaded, qLatenightLoaded)) {
    qRunProc(qQueueLatenightLoaded, qLatenightLoaded);
  }
  else {
    showLoader();
  }
};
var qWaitFirebaseLoaded = function(fn) {
  if (qSafeProc(fn, qQueueFirebaseLoaded, qFirebaseLoaded)) {
    qRunProc(qQueueFirebaseLoaded, qFirebaseLoaded);
  }
  else {
    showLoader();
  }
};
var qWaitAllLoaded = function(fn) {
  var qAllLoaded = qLatenightLoaded && qFirebaseLoaded;
  if (qSafeProc(fn, qQueueAllLoaded, qAllLoaded)) {
    qRunProc(qQueueAllLoaded, qAllLoaded);
  }
  else {
    showLoader();
  }
};
var qRunProc = function(queue, check) {
  if (!check) {
    return;
  }
  //console.log("queue", queue);
  //while (queue.length > 0) { // infinite loop on recursive
  if (queue.length <= 0) {
    return;
  }
  else {
    console.log("* triggering", queue.length, "fns", queue);
  }
  for (var i = 0; i < queue.length; i++) {
    var fn = queue.shift();
    console.log("trigger", fn.name);
    if (typeof fn == "function") {
      fn();
    }
    else {
      lnLog("fn is not a function", fn);
    }
  }
};
var qSafeProc = function(fn, queue, check) {
  if (typeof fn !== "function" || typeof queue !== "object" || typeof check !== "boolean") {
    lnLog("Invalid parameters for qProc", typeof fn, typeof queue, typeof check);
    return;
  }
  if (check) {
    lnLog("check", check, "is ready; immediately executing");
    fn();
    return true;
  }
  else {
    lnLog("check", check, "not yet ready; adding to queue", fn);
    queue.push(fn);
    return false;
  }
};

//var qLimit = 10;

// kyu'd functions
var qLnProcHash = function() {
  qWaitAllLoaded(lnProcHash);
};
