var fbCachedWatchingList = {};

var fbInitHandlers = function() {
  console.log("init fb handlers");

  if (fbUser && fbDatabase) {
    fbDatabase.ref("watching/" + fbUser.uid).on("value", fbAdapterWatchingList);
    $("body").on("click", ".infoMarkFavorites", fbMarkValue);
    $("body").on("click", ".infoMarkWatching", fbMarkValue);
    $("body").on("click", ".infoMarkCompleted", fbMarkValue);
  }
};

var fbAdapterWatchingList = function(snapshot) {
  var data = snapshot.val();
  console.log("watching list", data);
  if (data !== null) {
    fbCachedWatchingList = data;
  }

  fbProcAdapterList();
};

var fbProcAdapterList = function() {
  for (var i in fbCachedWatchingList) {
    var blob = fbCachedWatchingList[i];
    for (var j in blob) {
      var color = "black-text";
      switch (j) {
        case "bookmarked":
          if (blob[j]) {
            color = "amber-text";
          }
          $(".infoMarkWatching[data-title='{0}']".format(i)).find("a").removeClass("black-text").addClass(color);
        break;
        case "completed":
          if (blob[j]) {
            color = "green-text";
          }
          $(".infoMarkCompleted[data-title='{0}']".format(i)).find("a").removeClass("black-text").addClass(color);
        break;
        case "favorite":
          if (blob[j]) {
            color = "pink-text";
          }
          $(".infoMarkFavorites[data-title='{0}']".format(i)).find("a").removeClass("black-text").addClass(color);
        break;
      }
    }
  }
};

var fbMarkValue = function(e) {
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
    $(this).find("a").removeClass("{0}-text".format(color)).addClass("black-text");
  }
  else {
    value = true;
    s1 = "Added";
    s2 = "to";
    $(this).find("a").addClass("{0}-text".format(color)).removeClass("black-text");
  }
  var title = lnGetBlobBySlug(titleSlug).title;
  Materialize.toast(toast.format(s1, title, s2), 2000);
  data[prefixedTitleSlug + suffixTarget] = value;
  fbDatabase.ref().update(data);
};
