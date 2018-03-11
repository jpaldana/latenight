var elGroup = $("#group");
var elGroupChatMessage = $("#group-chat-message");
var elGroupChatContainer = $("#chat-container");
var elGroupUsers = $("#group-users");

var elsGroupTitle = $("[data-group-title]");

var kaGroupId = false;
var kaTimeSyncTimer = false;
var kaActiveEpisodeId = false;

var kaDoGroupWatch = function(e) {
  e.preventDefault();
  Materialize.toast("Creating group instance...", 2000);
  var group = fbUser.uid; //"g0test";
  kaFbResetRoom(group);
  var hash = "#!group/{0}/{1}/{2}".format(group, lnActiveInfo.titleSlug, $(this).attr("data-episode"));
  lnLog("group hash", hash);
  //kaLoadGroupWatch(group, lnActiveInfo.titleSlug, $(this).attr("data-episode"));
  location.hash = hash;
};
var kaLoadGroupWatch = function(groupId, titleSlug, episodeId) {
  // reset
  elGroupUsers.empty();
  elGroupChatContainer.empty();

  Materialize.toast("Entering group instance...", 2000);
  elGroup.attr("aria-hidden", "false");
  elBody.addClass("noscroll");

  kaGroupId = groupId;

  elGroupChatMessage.off("keyup").on("keyup", kaHandleGroupChatMessage);

  // cache all users (for name + photo)
  kbInitFbPullGroupChatMessage(kaGroupId);
  if (kaTimeSyncTimer) {
    clearInterval(kaTimeSyncTimer);
  }
  kaTimeSyncTimer = setInterval(kaTimeSync, 30000);
  lnDoGenerateInfo(titleSlug);
  // defer episode load
  qLatenightLoaded = false;
  kaActiveEpisodeId = episodeId;
  qWaitLatenightLoaded(kaEpisodeLoad);
};

var kaHandleGroupChatMessage = function(e) {
  //console.log("key code", e.which);
  if (e.which == 13) {
    kaPushGroupChatMessage(fbUser.uid, $(this).val());
    $(this).val("");
  }
};

var kaPushGroupChatMessage = function(sender, message) {
  kaFbPushGroupChatMessage(kaGroupId, sender, message, "message");
};
var kaPullGroupChatMessage = function(data) {
  kaProcGroupChatMessage(data.sender, data.message, data.lastSync);
};
var kaPullGroupStatusMessage = function(data) {
  kaProcGroupStatusMessage(data.sender, data.event, data.lastSync, data.currentTime);
};
var kaPullGroupHeartbeatMessage = function(data) {
  console.log("data", data);
  for (var i in data) {
    var dat = data[i];
    kaProcGroupHeartbeatMessage(dat.sender, dat.event, dat.lastSync);
  }
};

var kaProcGroupChatMessage = function(senderUid, message, lastSync) {
  var sender = "Unknown User";
  var photoURL = "img/blank-episode.jpg";
  if (typeof senderUid == "string" && typeof fbCachedUsersList[senderUid] == "object") {
    sender = fbCachedUsersList[senderUid].displayName;
    if (fbCachedUsersList[senderUid].photoURL) {
      photoURL = fbCachedUsersList[senderUid].photoURL;
    }
  }

  var chatMessage = "<li><div class='chip'><img src='{3}' alt='{0}' />{0}</div><span><span class='group-chat-date grey-text' data-time='{2}'></span> {1}</span></li>".format(sender, escapeHtml(message), lastSync, photoURL);
  elGroupChatContainer.prepend(chatMessage);
  kaTimeSync();
};

var kaTimeSync = function() {
  $("#chat-container span[data-time]").each(function() {
    var timeAgo = moment($(this).attr("data-time")).fromNow();
    $(this).text(timeAgo);
  });
};

var kaEpisodeLoad = function() {
  console.log("deferred ka episode load");

  for (var i in lnSeasonCache) {
    var blob = lnSeasonCache[i];
    var episodeId = "s{0}e{1}".format(blob.seasonNumber, blob.episodeNumber);
    if (episodeId == kaActiveEpisodeId) {
      if (blob.hasFile) {
        elsGroupTitle.text("{0}x{1}. {2}".format(blob.seasonNumber, blob.episodeNumber, blob.title));
        
        lnAwaitFileId = blob.id;
        lnAwaitFilePath = blob.episodeFile.path;
        var file = blob.episodeFile.relativePath;
        file = file.substring(file.lastIndexOf("/") + 1);
        file = encodeURIComponent(file);
        $.post(LatenightApiEndpoint, {
          "gdrive-file": file
        }, kaProcGdriveFile);
      }
    }
  }
};
var kaProcGdriveFile = function(data) {
  Materialize.toast("Episode loaded successfully!", 2000);

  lnLog("[ka] got file", data);

  var srcs = [
    { src: data.file, type: "video/mp4" }
  ];
  if (data.file == "") {
    console.log("not on gd, use mei instead", srcs);
    srcs = [
      { src: MeiEndpoint + lnAwaitFilePath, type: "video/mp4" }
    ];
  }
  
  console.log("srcs", srcs);
  groupVideojsPlayer.poster(data.poster);
  groupVideojsPlayer.src(srcs);
  // remove prior text tracks
  if (groupVideojsPlayer.remoteTextTracks().length > 0) {
    groupVideojsPlayer.removeRemoteTextTrack(groupVideojsPlayer.remoteTextTracks().tracks_[0]);
  }

  groupVideojsPlayer.addRemoteTextTrack({
    kind: "captions",
    srclang: "en",
    label: "English",
    src: TwilightApiEndpoint + lnAwaitFileId,
    manualCleanup: true
  });
  kaHookEvents();
};

var kaHookEvents = function() {
  $("#group-media-player .vjs-play-control").on("click", kaEventUserPlayPause);
  $("#group-media-player .vjs-progress-control").on("mouseup", kaEventUserSeeked);
  groupVideojsPlayer.on("canplay", kaEventPlayerCanPlay);
  groupVideojsPlayer.on("playing", kaEventPlayerPlaying);
  groupVideojsPlayer.on("pause", kaEventPlayerPaused);
  groupVideojsPlayer.on("play", kaEventPlayerPlay);
  // css stuff
  $("#group-media-player .vjs-big-play-button").css("display", "none");
  $("#group-media-player .vjs-control-bar").css("display", "flex");
};
var kaEventUserPlayPause = function() {
  if (groupVideojsPlayer.paused()) {
    console.log("[user] pause");
    kaFbPushGroupStatusMessage(kaGroupId, fbUser.uid, "pause", groupVideojsPlayer.currentTime());
  }
  else {
    console.log("[user] play");
    kaFbPushGroupStatusMessage(kaGroupId, fbUser.uid, "play", groupVideojsPlayer.currentTime());
  }
};
var kaEventUserSeeked = function() {
  console.log("[user] {0}".format(groupVideojsPlayer.currentTime()))
  kaFbPushGroupStatusMessage(kaGroupId, fbUser.uid, "seek", groupVideojsPlayer.currentTime());
};
/*
var kaPullEvent = function(data) {
  kaProcEvent(data.sender, data.message, data.lastSync);
};
var kaProcEvent = function(senderUid, event, lastSync) {
  switch (event) {
    case "play":
      if (groupVideojsPlayer.paused()) {
        groupVideojsPlayer.play();
      }
    break;
    case "pause":
      groupVideojsPlayer.pause();
    break;
    case "seek": // @
    break;
  }
  console.log("recv event", senderUid, event, lastSync);
};
*/
var kaEventPlayerCanPlay = function() {
  kaFbPushGroupHeartbeatMessage(kaGroupId, fbUser.uid, "canplay");
};
var kaEventPlayerPlaying = function() {
  kaFbPushGroupHeartbeatMessage(kaGroupId, fbUser.uid, "playing");
};
var kaEventPlayerPaused = function() {
  kaFbPushGroupHeartbeatMessage(kaGroupId, fbUser.uid, "paused");
};
var kaEventPlayerPlay = function() {
  kaFbPushGroupHeartbeatMessage(kaGroupId, fbUser.uid, "play");
};
/*
var kaPullStatus = function(data) {
  kaProcStatus(data.sender, data.message, data.lastSync);
};
var kaProcStatus = function(senderUid, event, lastSync) {
  switch (event) {
    case "canplay":
      //kaProcGroupChatMessage(senderUid, "[status] Ready.", lastSync);
    break;
    case "playing":
      //kaProcGroupChatMessage(senderUid, "[status] Playing.", lastSync);
    break;
    case "paused":
      //kaProcGroupChatMessage(senderUid, "[status] Paused.", lastSync);
    break;
    case "play":
    break;
  }
  console.log("recv event", senderUid, event, lastSync);
};
*/

var kaProcGroupStatusMessage = function(senderUid, event, lastSync, currentTime) {
  console.log("receive event", event);
  switch (event) {
    case "play":
      if (groupVideojsPlayer.paused()) {
        groupVideojsPlayer.play();
      }
    break;
    case "pause":
      groupVideojsPlayer.pause();
      //groupVideojsPlayer.currentTime(currentTime);
    break;
    case "seek": // @
      groupVideojsPlayer.pause();
      groupVideojsPlayer.currentTime(currentTime);
    break;
  }
};
var kaProcGroupHeartbeatMessage = function(senderUid, event, lastSync) {
  var target = $("#group-users div[data-user='{0}']".format(senderUid));
  if (target.length == 0) {
    var sender = "Unknown User";
    var photoURL = "img/blank-episode.jpg";
    if (typeof senderUid == "string" && typeof fbCachedUsersList[senderUid] == "object") {
      sender = fbCachedUsersList[senderUid].displayName;
      if (fbCachedUsersList[senderUid].photoURL) {
        photoURL = fbCachedUsersList[senderUid].photoURL;
      }
    }

    elGroupUsers.append("<div class='chip grey darken-4 white-text' data-user='{2}'><img src='{1}' alt='{0}' />{0} <span class='group-status-text'></span></div>".format(sender, photoURL, senderUid));
  }

  var status = event;
  var color = "green-text";
  switch (event) {
    case "canplay":
      status = "ready";
    break;
    case "playing":
      status = "playing";
    break;
    case "paused":
      status = "paused";
      color = "amber-text";
    break;
    case "play":
      //status = "<i class='material-icons'>play_arrow</i>";
      return;
    break;
  }
  $("#group-users div[data-user='{0}'] .group-status-text".format(senderUid)).text(status).removeClass("green-text amber-text").addClass(color);
};

$("body").on("click", ".infoGroupWatch[data-episode]", kaDoGroupWatch);
