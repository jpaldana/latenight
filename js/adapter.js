var fbCachedWatchingList = false;
var fbCachedStatsList = false;
var fbCachedTrackingList = false;
var fbCachedUsersList = false;
var fbCachedStatsName = false;

var fbInitHandlers = function() {
  console.log("init fb handlers");

  if (fbUser && fbDatabase) {
    fbDatabase.ref("watching/" + fbUser.uid).on("value", fbAdapterWatchingList);
    fbDatabase.ref("users").on("value", fbAdapterUsersList);
    $("body").on("click", ".infoMarkFavorites", fbMarkValue);
    $("body").on("click", ".infoMarkWatching", fbMarkValue);
    $("body").on("click", ".infoMarkCompleted", fbMarkValue);
  }
  // qTriggerFirebaseLoaded(); should be called in fbAdapterWatchingList
};

var fbAdapterUsersList = function(snapshot) {
  var data = snapshot.val();
  if (data !== null) {
    fbCachedUsersList = data;
  }
};
var fbAdapterWatchingList = function(snapshot) {
  var data = snapshot.val();
  console.log("watching list - fbAdapterWatchingList", data);
  if (data !== null) {
    fbCachedWatchingList = data;
    fbProcAdapterList();
  }
  qTriggerFirebaseLoaded(); // only call trigger now.
};
var fbAdapterStatsList = function(snapshot) {
  var data = snapshot.val();
  if (data !== null) {
    console.log("watching list - fbAdapterStatsList", data);
    fbCachedStatsList = data;
    qTriggerFirebaseLoaded(); // re-trigger
  }
  //lnProcQueue();
};

var fbProcAdapterList = function() {
  for (var i in fbCachedWatchingList) {
    var blob = fbCachedWatchingList[i];
    for (var j in blob) {
      //var color = "black-text";
      color = "";
      switch (j) {
        case "bookmarked":
          if (blob[j]) {
            $(".infoMarkWatching[data-title='{0}']".format(i)).find("a").addClass("amber-text");
          }
        break;
        case "completed":
          if (blob[j]) {
            $(".infoMarkCompleted[data-title='{0}']".format(i)).find("a").addClass("green-text");
          }
        break;
        case "favorite":
          if (blob[j]) {
            $(".infoMarkFavorites[data-title='{0}']".format(i)).find("a").addClass("pink-text");
          }
        break;
      }
    }
  }
};

var fbMarkValue = function(e) {
  if (!fbLoggedIn || fbUser.isAnonymous) {
    Materialize.toast("You must be logged in to do this.", 2000);
    e.preventDefault();
    return;
  }
  e.preventDefault();

  var titleSlug = false;

  if ($(this).is("[data-title]")) {
    titleSlug = $(this).attr("data-title");
  }
  else {
    titleSlug = lnActiveInfo.titleSlug;
  }

  var key = false;
  var toast = "";
  var color = "";
  if ($(this).hasClass("infoMarkFavorites")) {
    key = "favorite";
    toast = "{0} {1} {2} your favorites.";
    color = "pink";
  }
  else if ($(this).hasClass("infoMarkWatching")) {
    key = "bookmarked";
    toast = "{0} {1} {2} your watching list.";
    color = "amber";
  }
  else if ($(this).hasClass("infoMarkCompleted")) {
    key = "completed";
    toast = "{0} {1} {2} your completed.";
    color = "green";
  }
  if (!key) {
    console.log("unknown key");
    return;
  }

  var data = {};
  var prefixedTitleSlug = "watching/" + fbUser.uid + "/" + titleSlug;
  var suffixTarget = "/" + key + "/";
  var value = false;
  var s1 = "";
  var s2 = "";
  if (typeof fbCachedWatchingList == "object" && fbCachedWatchingList.hasOwnProperty(titleSlug) && fbCachedWatchingList[titleSlug][key]) {
    value = false;
    s1 = "Removed";
    s2 = "from";
    $(this).find("a").removeClass("{0}-text".format(color));
  }
  else {
    value = true;
    s1 = "Added";
    s2 = "to";
    $(this).find("a").addClass("{0}-text".format(color)).removeClass("amber-text green-text pink-text");
  }
  var title = lnGetBlobBySlug(titleSlug).title;
  Materialize.toast(toast.format(s1, title, s2), 2000);
  data[prefixedTitleSlug + suffixTarget] = value;
  fbDatabase.ref().update(data);
};

var fbAdapterReceiveUserData = function(snapshot) {
  var data = snapshot.val();
  fbCachedStatsName = data.displayName;
  elListingTitle.text("{0}'s List".format(data.displayName));
  $("[data-tooltip-stats-name]").each(function() {
    $(this).attr("data-tooltip", fbCachedStatsName + $(this).attr("data-tooltip"));
  });
  $("[data-tooltip-stats-name]").tooltip({delay: 50});
};

var fbAdapterTrackingList = function(snapshot) {
  // called only once after season selected
  var data = snapshot.val();
  fbCachedTrackingList = data;
  if (typeof data == "object") {
    for (var episodeId in data) {
      if (data[episodeId]) {
        $(".infoTrackEpisode[data-episode='{0}']".format(episodeId)).addClass("green-text");
      }
    }
  }
};

var fbAdapterTrackEpisode = function(e) {
  var data = {};
  var episodeId = $(this).attr("data-episode");
  var value = false;
  if ($(this).hasClass("infoTrackEpisodeOneWay")) {
    // don't prevent default
    // only change to true (no toggle)
    $(".infoTrackEpisode[data-episode='{0}']".format(episodeId)).addClass("green-text");
    value = true;
  }
  else {
    e.preventDefault();
    if ($(this).hasClass("green-text")) {
      $(this).removeClass("green-text");
    }
    else {
      $(this).addClass("green-text");
      value = true;
    }
  }
  
  data["tracker/" + fbUser.uid + "/" + lnActiveInfo.titleSlug + "/" + episodeId] = value;
  fbDatabase.ref().update(data);
};

var ghDoRequest = function() {
  $.get(GithubApiEndpoint, ghProcRequest);
};

var ghProcRequest = function(data) {
  var hash = data[0].sha.substring(0, 8);
  var message = data[0].commit.message;
  var timeSince = moment(data[0].commit.author.date).fromNow();
  $("[data-gh-commit]").html("-{0} <a href='{2}'>{1}</a> {3}".format(hash, message, data[0].html_url, timeSince));
  $("[data-gh-commit-short]").text("-{0} ({1})".format(hash, timeSince));
};

var kaFbResetRoom = function(groupId) {
  var prefixString = "group/" + groupId;
  var data = {};

  data[prefixString] = null;
  fbDatabase.ref().update(data);
};
var kaFbPushGroupChatMessage = function(groupId, sender, message, type) {
  var prefixString = "group/" + groupId + "/chat/";
  var data = {};

  data[prefixString + "sender"] = sender;
  data[prefixString + "message"] = message;
  data[prefixString + "type"] = type;
  data[prefixString + "lastSync"] = moment().format(); 
  fbDatabase.ref().update(data);
}
var kbInitFbPullGroupChatMessage = function(groupId) {
  fbDatabase.ref("group/" + groupId + "/chat").on("value", kbFbPullGroupChatMessage);
  fbDatabase.ref("group/" + groupId + "/status").on("value", kaFbPullGroupStatusMessage);
  fbDatabase.ref("group/" + groupId + "/users").on("value", kaFbPullGroupHeartbeatMessage);
};
var kbFbPullGroupChatMessage = function(snapshot) {
  var data = snapshot.val();
  if (data !== null) {
    if (data.type == "message") {
      kaPullGroupChatMessage(data);
    }
  }
};
var kaFbPushGroupStatusMessage = function(groupId, sender, status, currentTime) {
  var prefixString = "group/" + groupId + "/status/";
  var data = {};

  data[prefixString + "sender"] = sender;
  data[prefixString + "event"] = status;
  data[prefixString + "currentTime"] = currentTime;
  data[prefixString + "lastSync"] = moment().format();
  fbDatabase.ref().update(data);
}
var kaFbPullGroupStatusMessage = function(snapshot) {
  var data = snapshot.val();
  if (data !== null) {
    kaPullGroupStatusMessage(data);
  }
};
var kaFbPushGroupHeartbeatMessage = function(groupId, sender, status) {
  var prefixString = "group/" + groupId + "/users/" + sender + "/";
  var data = {};

  data[prefixString + "sender"] = sender;
  data[prefixString + "event"] = status;
  data[prefixString + "lastSync"] = moment().format();
  fbDatabase.ref().update(data);
}
var kaFbPullGroupHeartbeatMessage = function(snapshot) {
  var data = snapshot.val();
  if (data !== null) {
    kaPullGroupHeartbeatMessage(data);
  }
};
