var lnCache = false;
var lnQueue = [];
var lnStart = 156;
var lnLimit = 12;
var lnListingType = "latest";
var lnSeasonCache = false;
var lnHashCache = "";
var lnActiveInfo = false;
var lnReady = false;

var lnAwaitFileId = false;

var elBody = $("body");
var elWelcome = $("#welcome");
var elListing = $("#listing");
var elPosters = $("#posters");
var elPagination = $("#pagination");
var elInfo = $("#info");
var elSeasons = $("#seasons");
var elEpisodes = $("#episodes");

var elsActiveTitle = $("[data-ln-active-title]");
var elsActivePoster = $("[data-ln-active-poster]");
var elsActiveBackground = $("[data-ln-active-background]");
var elsActiveOverview = $("[data-ln-active-overview]");

var $masonryGrid;
var $masonryEpisodeGrid;
var videojsPlayer;

var lnTimer = function() {
  if (lnQueue.length > 0) {
    lnProcQueue();
  }
};

var lnFnQueue = function(fn) {
  // don't allow dupes
  for (var i in lnQueue) {
    var qfn = lnQueue[i];
    if (qfn.name == fn.name) {
      lnLog("** fn already in queue, not adding", fn.name);
      return;
    }
  }
  lnQueue.push(fn);
  lnLog("* pushing fn to queue", fn.name);
};

var lnLog = function(text) {
  var stack = [];
  for (var i = 0; i < arguments.length; i++) {
    stack.push(arguments[i]);
  }
  console.log.apply(null, stack);
};
var lnProcQueue = function() {
  if (lnQueue.length > 0) {
    //while (lnQueue.length > 0) {
    for (var i = 0; i < lnQueue.length; i++) {
      var fn = lnQueue.shift();
      if (typeof fn == "function") {
        lnLog("deferred call fn", fn.name);
        fn();
      }
      else {
        lnLog("queue has a non-function", typeof fn, fn);
      }
    }
  }
};

var lnDoRefresh = function() {
  $.get(SonarrEndpoint, lnProcRefresh);
};

var lnProcRefresh = function(data) {
  lnCache = data;
  lnReady = true;
  lnProcQueue();
};

var lnDoGenerateListing = function(type) {
  var fn = false;
  if (type == "watching") {
    fn = lnDoGenerateListingWatching;
  }
  else if (type == "latest") {
    fn = lnDoGenerateListingLatest;
  }
  else if (type == "popular") {
    fn = lnDoGenerateListingPopular;
  }
  else if (type == "alphabet") {
    fn = lnDoGenerateListingAlphabet;
  }
  else if (type == "stats") {
    fn = lnDoGenerateListingStats;
  }
  if (typeof fn == "function") {
    lnListingType = type;
    if (!lnReady) {
      lnFnQueue(fn);
      return;
    }
    else {
      fn();
    }
  }
  else {
    lnLog("lnDoGenerateListing: unknown type", type, typeof fn);
  }
};

var lnDoGenerateListingContainer = function() {
  $masonryGrid.masonry("remove", $masonryGrid.find(".col"));
  elWelcome.hide();
  elPosters.empty();
  elPagination.empty();
  elListing.show();
};
var lnDoGenerateListingStats = function() {
  if (!fbCachedStatsList) {
    lnQueue.push(lnDoGenerateListingStats);
    lnLog("deferring stats listing");
    return;
  }

  lnSorted = [];
  for (var slug in fbCachedStatsList) {
    var watchingBlob = fbCachedStatsList[slug];
    for (var i in lnCache) {
      var blob = lnCache[i];
      if (blob.titleSlug == slug) {
        lnSorted.push(blob);
      }
    }
  }
  
  lnSorted.sort(function(a, b) {
    var aVal = (typeof a.previousAiring == "undefined") ? ((typeof a.inCinemas == "undefined") ? "0000" : a.inCinemas) : a.previousAiring;
    var bVal = (typeof b.previousAiring == "undefined") ? ((typeof b.inCinemas == "undefined") ? "0000" : b.inCinemas) : b.previousAiring;
    return -aVal.localeCompare(bVal);
  });

  lnDoGeneratePosters();
};
var lnDoGenerateListingWatching = function() {
  if (!fbCachedWatchingList) {
    lnQueue.push(lnDoGenerateListingWatching);
    lnLog("deferring watching listing");
    return;
  }
  //lnSorted = lnCache; // TODO
  lnSorted = [];
  for (var slug in fbCachedWatchingList) {
    var watchingBlob = fbCachedWatchingList[slug];
    if (!watchingBlob.bookmarked) {
      continue;
    }
    for (var i in lnCache) {
      var blob = lnCache[i];
      if (blob.titleSlug == slug) {
        lnSorted.push(blob);
      }
    }
  }
  
  lnSorted.sort(function(a, b) {
    var aVal = (typeof a.previousAiring == "undefined") ? ((typeof a.inCinemas == "undefined") ? "0000" : a.inCinemas) : a.previousAiring;
    var bVal = (typeof b.previousAiring == "undefined") ? ((typeof b.inCinemas == "undefined") ? "0000" : b.inCinemas) : b.previousAiring;
    return -aVal.localeCompare(bVal);
  });

  lnDoGeneratePosters();
};
var lnDoGenerateListingLatest = function() {
  lnSorted = lnCache;
  lnSorted.sort(function(a, b) {
    var aVal = (typeof a.previousAiring == "undefined") ? ((typeof a.inCinemas == "undefined") ? "0000" : a.inCinemas) : a.previousAiring;
    var bVal = (typeof b.previousAiring == "undefined") ? ((typeof b.inCinemas == "undefined") ? "0000" : b.inCinemas) : b.previousAiring;
    return -aVal.localeCompare(bVal);
  });
  lnDoGeneratePosters();
};
var lnDoGenerateListingPopular = function() {
  lnSorted = lnCache;
  lnSorted.sort(function(a, b) {
    var aVal = (a.ratings.votes).toString();
    var bVal = (b.ratings.votes).toString();
    return -aVal.localeCompare(bVal);
  });
  lnDoGeneratePosters();
};
var lnDoGenerateListingAlphabet = function() {
  lnSorted = lnCache;
  lnSorted.sort(function(a, b) {
    return a.sortTitle.localeCompare(b.sortTitle);
  });
  lnDoGeneratePosters();
};

var lnDoGeneratePosters = function() {
  lnDoGenerateListingContainer();
  var lnSlice = lnSorted.slice(lnStart, lnStart + lnLimit);
  for (var i in lnSlice) {
    var blob = lnSlice[i];
    //lnLog(i, blob);
    lnDoGeneratePoster(blob);
  }

  $(".tooltipped").tooltip({delay: 50});
  $masonryGrid.imagesLoaded().progress(function() {
    $masonryGrid.masonry("layout");
  });

  lnStart = Math.min(lnStart + lnLimit, lnCache.length);
  fbProcAdapterList();
  lnDoGeneratePagination();
};
var lnDoGeneratePoster = function(blob) {
  var thumbnail = lnApiImage(blob, "poster").replace("poster.jpg", "poster-500.jpg");
  var timeAgo = moment(blob.previousAiring).fromNow();

  var details = "<ul class='collection'>" + 
    "<li class='collection-item'><div>{0}<a class='secondary-content'><i class='material-icons'>update</i></a></div></li>".format(timeAgo) + 
    "<li class='collection-item'><div>{0}<a class='secondary-content'><i class='material-icons'>date_range</i></a></div></li>".format(blob.status) + 
    "<li class='collection-item'><div class='row center-align' style='margin-bottom: 0;'><div class='col s4 infoMarkFavorites tooltipped' data-tooltip='Add to favorites' data-title='{0}'><a href='#' data-fb-login-required><i class='material-icons'>favorite</i></a></div><div class='col s4 infoMarkWatching tooltipped' data-tooltip='Bookmark' data-title='{0}'><a href='#' data-fb-login-required><i class='material-icons'>bookmark</i></a></div><div class='col s4 infoMarkCompleted tooltipped' data-tooltip='Mark as watched' data-title='{0}'><a href='#' data-fb-login-required><i class='material-icons'>done</i></a></div></li>".format(blob.titleSlug) + 
  "</ul>";

  var poster =
    "<div class='col s12 m6 l4 xl3 grid'>" +
      "<div class='card'>" +
        "<div class='card-image'>" +
          "<img src='{0}' class='activator'>".format(thumbnail) +
          "<span class='card-title ellipsis'>{0}</span>".format(blob.title) +
          "<a class='btn-floating halfway-fab waves-effect waves-light light-blue' href='#!info/{0}'><i class='material-icons'>play_arrow</i></a>".format(blob.titleSlug) +
        "</div>" +
        "<div class='card-content'>" +
          "{0}".format(details) +
        "</div>" +
        "<div class='card-reveal scroll'>" +
          "<span class='card-title white black-text'>{0}<i class='material-icons right'>close</i></span>".format(blob.title) +
          "<p>{0}</p>".format(blob.overview) +
        "</div>" +
      "</div>" +
    "</div>";
  
  //elPosters.append(poster);
  elPosters.append(poster);
  $masonryGrid.masonry("reloadItems");
};
var lnDoGeneratePagination = function() {
  var page = (lnStart / lnLimit);
  for (var i = 1; i < (lnSorted.length / lnLimit); i++) {
    if (i == page) {
      elPagination.append("<li class='active light-blue'><a href='#!list/{1}/{0}'>{0}</a></li>".format(i, lnListingType));
    }
    else {
      elPagination.append("<li class='waves-effect'><a href='#!list/{1}/{0}'>{0}</a></li>".format(i, lnListingType));
    }
  }
};

var lnDoGenerateInfo = function(slug) {
  var blob = lnGetBlobBySlug(slug);
  lnActiveInfo = blob;
  lnLog("info", blob);
  var poster = lnApiImage(blob, "poster").replace("poster.jpg", "poster-500.jpg");
  var background = lnApiImage(blob, "fanart");
  elsActiveTitle.text(blob.title);
  elsActivePoster.attr("src", poster);
  elsActiveBackground.css("background-image", "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%,rgba(0,0,0,0.8) 100%), url({0})".format(background));
  elsActiveOverview.text(blob.overview);
  elSeasons.empty();
  elSeasons.append("<option value='' disabled selected>Choose a season</option>");
  for (var i in blob.seasons) {
    var season = blob.seasons[i];
    var seasonTitle = "Season {0}".format(season.seasonNumber);
    if (season.seasonNumber == 0) {
      seasonTitle = "Extras";
    }
    for (var j in blob.alternateTitles) {
      var alt = blob.alternateTitles[j];
      if (i == alt.sceneSeasonNumber) {
        seasonTitle = alt.title;
      }
    }
    elSeasons.append("<option value='{0}'>{0}. {1} ({2}/{3})</option>".format(
      season.seasonNumber,
      seasonTitle,
      season.statistics.episodeCount,
      season.statistics.totalEpisodeCount
    ));
  }
  elSeasons.material_select();
  lnDoGenerateSeason(blob.id);
  elEpisodes.empty();
  $masonryEpisodeGrid.masonry("reloadItems");
};

var lnDoGenerateSeason = function(id) {
  $.post(SonarrSeasonEndpoint, {id: id}, lnProcGenerateSeason);
};

var lnProcGenerateSeason = function(data) {
  lnLog("season data", data);
  lnSeasonCache = data;
};

var lnDoGenerateEpisodes = function() {
  var seasonNum = elSeasons.val();
  lnLog("load season data for season num", seasonNum);
  elEpisodes.empty();

  for (var i in lnSeasonCache) {
    var blob = lnSeasonCache[i];
    if (blob.seasonNumber == seasonNum) {
      var thumbnail = SonarrEpisodeEndpoint + blob.id;
      var title = "<b>{1}</b> - {0}".format(blob.title, blob.episodeNumber);
      if (typeof blob.absoluteEpisodeNumber == "number" && blob.episodeNumber !== blob.absoluteEpisodeNumber) {
        title = "{1} ({2}) - {0}".format(blob.title, blob.episodeNumber, blob.absoluteEpisodeNumber);
      }

      var timeAgo = moment(blob.airDateUtc).fromNow();
      var epStatus = "not available";
      var direct = "#!";
      if (blob.hasFile) {
        epStatus = "{0} / {1}".format(blob.episodeFile.quality.quality.name, bytesToSize(blob.episodeFile.size));
        direct = "https://local-media.latenight.moe" + blob.episodeFile.path;
      }
      var details = "<ul class='collection'>" + 
        "<li class='collection-item ellipsis tooltipped' data-tooltip=\"{1}\">{0}</li>".format(title, blob.title) + 
        "<li class='collection-item'><div>{0}<a class='secondary-content'><i class='material-icons'>update</i></a></div></li>".format(timeAgo) + 
        "<li class='collection-item'><div>{0}<a class='secondary-content'><i class='material-icons'>date_range</i></a></div></li>".format(epStatus);
      if (blob.hasFile) {
        details += "<li class='collection-item'><a href=\"{0}\" class='btn full waves-effect'>Direct Link (local)</a></li>".format(direct);
      }
      else {
        details += "<li class='collection-item'>&mdash;</li>"
      }
      details += "</ul>";

      if (!blob.hasFile) {
        thumbnail = "img/blank-episode.jpg";
        var poster =
          "<div class='col s12 m6 l6 xl4 grid'>" +
            "<div class='card'>" +
              "<div class='card-image'>" +
                "<img src='{0}'>".format(thumbnail) +
                "<a class='btn-floating halfway-fab waves-effect waves-light red lighten-2'><i class='material-icons'>close</i></a>" +
              "</div>" +
              "<div class='card-content'>" +
                "{0}".format(details) +
              "</div>" +
            "</div>" +
          "</div>";
      }
      else {
        var file = blob.episodeFile.relativePath;
        file = file.substring(file.lastIndexOf("/") + 1);
        file = encodeURIComponent(file);
        var poster =
          "<div class='col s12 m6 l6 xl4 grid'>" +
            "<div class='card'>" +
              "<div class='card-image'>" +
                "<img src='{0}' class='activator'>".format(thumbnail) +
                "<a class='btn-floating halfway-fab waves-effect waves-light light-blue lighten-2' data-file=\"{0}\" data-file-id='{1}' href='#!' data-fb-login-required><i class='material-icons'>play_arrow</i></a>".format(file, blob.id) +
              "</div>" +
              "<div class='card-content'>" +
                "{0}".format(details) +
              "</div>" +
              "<div class='card-reveal scroll'>" +
                "<span class='card-title white black-text'>{0}<i class='material-icons right'>close</i></span>".format(title) +
                "<p>{0}</p>".format(blob.overview) +
              "</div>" +
            "</div>" +
          "</div>";
      }

      elEpisodes.append(poster);
    }
  }

  $masonryEpisodeGrid.imagesLoaded().progress(function() {
    $masonryEpisodeGrid.masonry("layout");
  });
  $masonryEpisodeGrid.masonry("reloadItems");
  $(".tooltipped").tooltip({delay: 50});
};

var lnApiImage = function(blob, type) {
  var reserve = false;
  var mediaEndpoint = typeof blob.tvdbId == "undefined" ? RadarrMediaEndpoint : SonarrMediaEndpoint;
  for (var i in blob.images) {
    var img = blob.images[i];
    if (img.coverType == type) {
      return mediaEndpoint + img.url;
    }
    else {
      if (!reserve) {
        reserve = img.url;
      }
    }
  }
  if (!reserve) {
    lnLog("no images in blob");
    return "#";
  }
  lnLog("did not find type", type, "in blob images, falling back to reserve");
  return mediaEndpoint + reserve;
};

var lnProcHash = function(e) {
  if (!lnReady || !fbReady) {
    lnFnQueue(lnProcHash);
    return;
  }
  var target;
  if (typeof e == "undefined") {
    target = location.hash;
  }
  else if (typeof e == "object") {
    target = $(this).attr("href");
    e.preventDefault();
  }
  else if (typeof e == "number") {
    if (e == 0) {
      Materialize.toast("Something went wrong.", 2000);
      console.log("reached e=0 for proc hash with number arg");
      return;
    }
    target = location.hash;
  }
  if (target.substring(0, 2) !== "#!") {
    lnLog("ignoring non-#! href", target);
    return;
  }
  if (lnHashCache == target) {
    //lnLog("ignoring double hash event", target);
    //return;
  }

  var hash = target.substring(2).replace("#", "").split("/");
  lnLog("handle #!", hash);

  var hashSwitch = hash.shift();
  switch (hashSwitch) {
    case "list":
      elInfo.attr("aria-hidden", "true");
      elBody.removeClass("noscroll");

      lnListingType = hash[0];
      lnStart = (parseInt(hash[1], 10) - 1) * lnLimit;
      lnLog("hash: list (re)load", lnListingType, lnStart);
      lnDoGenerateListing(lnListingType);
    break;
    case "info":
      elInfo.attr("aria-hidden", "true");
      elBody.removeClass("noscroll");

      var slug = hash[0];
      elInfo.attr("aria-hidden", "false");
      elBody.addClass("noscroll");
      lnDoGenerateInfo(slug);
    break;
    case "close-info":
      elInfo.attr("aria-hidden", "true");
      elBody.removeClass("noscroll");
      return;
    break;
    case "stats":
      if (!fbUser) {
        if (typeof e == "number") {
          if (e == 1) {
            Materialize.toast("You must be logged in to view others' stats.");
          }
          else {
            lnQueue.push(function() { lnProcHash(e-1); });
          }
        }
        else {
          lnQueue.push(function() { lnProcHash(2); });
        }
        return;
      }
      elInfo.attr("aria-hidden", "true");
      elBody.removeClass("noscroll");
      lnListingType = "stats";
      lnStart = 0;

      var uid = hash[0];
      fbDatabase.ref("watching/" + uid).on("value", fbAdapterStatsList);

      lnLog("hash: list (re)load - stats", lnListingType, lnStart);
      lnDoGenerateListing(lnListingType);
    break;
  }

  lnHashCache = target;
  location.hash = target;
};

var lnGetBlobBySlug = function(slug) {
  for (var i in lnCache) {
    var blob = lnCache[i];
    if (blob.titleSlug == slug) {
      return blob;
    }
  }
  return false;
};

var lnProcFile = function(e) {
  if (!fbUser) {
    return;
  }
  e.preventDefault();

  var file = $(this).attr("data-file");
  lnAwaitFileId = $(this).attr("data-file-id");
  lnLog("proc file", file);
  $.post(LatenightApiEndpoint, {
    "gdrive-file": file
  }, lnProcGdriveFile);
  Materialize.toast("Loading episode...", 2000);
};

var lnProcGdriveFile = function(data) {
  lnLog("got file", data);
  $("#mediaPlayer").modal("open");

  //$("#media").attr("poster", data.poster);
  //$("#media source").attr("src", data.file);
  videojsPlayer.poster(data.poster);
  videojsPlayer.src({
    type: "video/mp4",
    src: data.file
  });
  // remove prior text tracks
  if (videojsPlayer.remoteTextTracks().length > 0) {
    videojsPlayer.removeRemoteTextTrack(videojsPlayer.remoteTextTracks().tracks_[0]);
  }

  videojsPlayer.addRemoteTextTrack({
    kind: "captions",
    srclang: "en",
    label: "English",
    src: TwilightApiEndpoint + lnAwaitFileId,
    manualCleanup: true
  });
};

//$("body").on("click", "a[href^='#!']", lnProcHash);
$("body").on("click", "a[data-file]", lnProcFile);
elSeasons.on("change", lnDoGenerateEpisodes);
$(function() {
  if (location.hash.length > 0) {
    lnQueue.push(lnProcHash);
  }
  $masonryGrid = elPosters.masonry({
    itemSelector: ".grid",
    columnWidth: function(cw) {
      return cw / 4;
    }()
  });
  $masonryEpisodeGrid = elEpisodes.masonry({
    itemSelector: ".grid",
    columnWidth: function(cw) {
      return cw / 4;
    }()
  });
  $("select").material_select();
  videojsPlayer = videojs("media-player");
  setInterval(lnTimer, 1000);
});

window.onhashchange = function() {
  console.log("hash change");
  lnProcHash();
};
