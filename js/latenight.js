var lnCache = false;
var lnQueue = [];
var lnStart = 156;
var lnLimit = 12;
var lnListingType = "latest";
var lnSeasonCache = false;
var lnHashCache = "";
var lnActiveInfo = false;
var lnReady = false;

var lnAwaitFilePath = false;
var lnAwaitFileId = false;

var elBody = $("body");
var elWelcome = $("#welcome");
var elListing = $("#listing");
var elListingTitle = $("#listing-title");
var elPosters = $("#posters");
var elPagination = $("#pagination");
var elInfo = $("#info");
var elSeasons = $("#seasons");
var elSeasonsContainer = $("#seasons-container");
var elEpisodes = $("#episodes");
var elLoader = $("#loader");
var elLoaderText = $("#loader-text");

var elsActiveTitle = $("[data-ln-active-title]");
var elsActivePoster = $("[data-ln-active-poster]");
var elsActiveBackground = $("[data-ln-active-background]");
var elsActiveOverview = $("[data-ln-active-overview]");
var elsActiveGenres = $("[data-ln-active-genres]");

var $masonryGrid;
var $masonryEpisodeGrid;
var videojsPlayer;
var groupVideojsPlayer;

/*
var lnTimer = function() {
  console.log("*** DEPRECATED - lnTimer called");
  return;
  if (lnQueue.length > 0) {
    lnProcQueue();
  }
};
*/

/*
var lnFnQueue = function(fn) {
  console.log("*** DEPRECATED - lnFnQueue called");
  return;
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
*/

var lnLog = function(text) {
  var stack = [];
  for (var i = 0; i < arguments.length; i++) {
    stack.push(arguments[i]);
  }
  console.log.apply(null, stack);
};

/*
var lnProcQueue = function() {
  console.log("*** DEPRECATED - lnProcQueue called");
  return;
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
*/

var lnDoRefresh = function() {
  $.get(SonarrEndpoint, lnProcRefresh);
};

var lnProcRefresh = function(data) {
  lnCache = data;
  //lnReady = true;
  //lnProcQueue();
  qTriggerLatenightLoaded();
};

var lnDoGenerateListing = function(type) {
  var fn = false;
  if (type == "watching") {
    fn = lnDoGenerateListingWatching;
    elListingTitle.text("My List");
  }
  else if (type == "latest") {
    fn = lnDoGenerateListingLatest;
    elListingTitle.text("Latest");
  }
  else if (type == "popular") {
    fn = lnDoGenerateListingPopular;
    elListingTitle.text("Popular");
  }
  else if (type == "alphabet") {
    fn = lnDoGenerateListingAlphabet;
    elListingTitle.text("All (Alphabetical)");
  }
  else if (type == "stats") {
    fn = lnDoGenerateListingStats;
  }
  if (typeof fn == "function") {
    lnListingType = type;
    qWaitLatenightLoaded(fn);
    /*
    if (!lnReady) {
      //lnFnQueue(fn);
      qWaitLatenightLoaded(fn);
      return;
    }
    else {
      fn();
    }
    */
  }
  else {
    lnLog("lnDoGenerateListing: unknown type", type, typeof fn);
  }
};

var lnDoGenerateListingContainer = function() {
  $masonryGrid.masonry("remove", $masonryGrid.find(".col"));
  elWelcome.attr("aria-hidden", "true");
  elPosters.empty();
  elPagination.empty();
  elListing.attr("aria-hidden", "false");
};
var lnDoGenerateListingStats = function() {
  if (!fbCachedStatsList) {
    //lnQueue.push(lnDoGenerateListingStats);
    //lnLog("deferring stats listing");
    qFirebaseLoaded = false;
    qWaitAllLoaded(lnDoGenerateListingStats);
    return;
  }

  lnSorted = [];
  for (var slug in fbCachedStatsList) {
    var watchingBlob = fbCachedStatsList[slug];
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

  lnDoGenerateStatsPosters();
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

var lnDoGenerateStatsPosters = function() {
  lnDoGenerateListingContainer();
  //var lnSlice = lnSorted.slice(lnStart, lnStart + lnLimit);
  for (var i in lnSorted) { // don't paginate.
    var blob = lnSorted[i];
    blob.stats = fbCachedStatsList[blob.titleSlug];
    //lnLog(i, blob);
    lnDoGeneratePoster(blob);
  }

  $(".tooltipped").tooltip({delay: 50});
  showLoader(true);
  textLoader("Loading posters...");
  $masonryGrid.imagesLoaded().progress(function() {
    $masonryGrid.masonry("layout");
  }).always(hideLoaderForce);

  lnStart = Math.min(lnStart + lnLimit, lnCache.length);
  fbProcAdapterList();
  //lnDoGeneratePagination();
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
  showLoader(true);
  textLoader("Loading posters...");
  $masonryGrid.imagesLoaded().progress(function() {
    $masonryGrid.masonry("layout");
  }).always(hideLoaderForce);

  lnStart = Math.min(lnStart + lnLimit, lnCache.length);
  fbProcAdapterList();
  lnDoGeneratePagination();
};
var lnDoGeneratePoster = function(blob) {
  var thumbnail = lnApiImage(blob, "poster").replace("poster.jpg", "poster-500.jpg");
  var timeAgo = typeof blob.previousAiring == "string" ? moment(blob.previousAiring).fromNow() : (typeof blob.inCinemas == "string" ? moment(blob.inCinemas).fromNow() : "&mdash;");
  var mediaType = typeof blob.tmdbId == "number" ? " (movie)" : " (series)";

  var details = "<ul class='collection'>" + 
    "<li class='collection-item'><div>{0}<a class='secondary-content'><i class='material-icons'>update</i></a></div></li>".format(timeAgo) + 
    "<li class='collection-item'><div>{0}{1}<a class='secondary-content'><i class='material-icons'>date_range</i></a></div></li>".format(blob.status, mediaType);

  if (typeof blob.stats == "object") {
    var favorite = "";
    var bookmark = "";
    var watched = "";
    var favorite_tt = "'";
    var bookmark_tt = "'";
    var watched_tt = "'";
    var name = fbCachedStatsName ? fbCachedStatsName : "";
    if (blob.stats.favorite) {
      favorite = "pink-text";
      favorite_tt = " tooltipped' data-tooltip='{0} likes this' data-tooltip-stats-name".format(name);
    }
    if (blob.stats.bookmarked) {
      bookmark = "amber-text";
      bookmark_tt = " tooltipped' data-tooltip='{0} bookmarked this' data-tooltip-stats-name".format(name);
    }
    if (blob.stats.completed) {
      watched = "green-text";
      watched_tt = " tooltipped' data-tooltip='{0} watched this' data-tooltip-stats-name".format(name);
    }
    details += "<li class='collection-item'><div class='row center-align' style='margin-bottom: 0;'><div class='col s4'><a href='#!' class='{0}{3}><i class='material-icons'>favorite</i></a></div><div class='col s4'><a href='#!' class='{1}{4}><i class='material-icons'>bookmark</i></a></div><div class='col s4'><a href='#!' class='{2}{5}><i class='material-icons'>check_circle</i></a></div></li>".format(favorite, bookmark, watched, favorite_tt, bookmark_tt, watched_tt);
  }
  else {
    details += "<li class='collection-item'><div class='row center-align' style='margin-bottom: 0;'><div class='col s4 infoMarkFavorites tooltipped' data-tooltip='Add to favorites' data-title='{0}'><a href='#!' data-fb-login-required><i class='material-icons'>favorite</i></a></div><div class='col s4 infoMarkWatching tooltipped' data-tooltip='Bookmark' data-title='{0}'><a href='#!' data-fb-login-required><i class='material-icons'>bookmark</i></a></div><div class='col s4 infoMarkCompleted tooltipped' data-tooltip='Mark as watched' data-title='{0}'><a href='#!' data-fb-login-required><i class='material-icons'>check_circle</i></a></div></li>".format(blob.titleSlug);
  }

  details += "</ul>";

  var poster =
    "<div class='col s6 l4 xl3 grid'>" +
      "<div class='card'>" +
        "<div class='card-image'>" +
          "<img src='{0}' class='activator'>".format(thumbnail) +
          "<span class='card-title ellipsis tooltipped' data-tooltip=\"{0}\">{0}</span>".format(blob.title) +
          "<a class='btn-floating middle-fab waves-effect waves-light light-blue z-depth-2' href='#!info/{0}'><i class='material-icons'>play_arrow</i></a>".format(blob.titleSlug) +
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
  if (typeof blob.tmdbId == "number") {
    // movie stuff
    elSeasonsContainer.attr("aria-hidden", "true");
    elEpisodes.empty().css("height", "0");
    lnDoGenerateMovieEpisode(blob);
    $masonryEpisodeGrid.imagesLoaded().progress(function() {
      $masonryEpisodeGrid.masonry("layout");
    }).always(hideLoaderForce);
    $masonryEpisodeGrid.masonry("reloadItems");
  }
  else {
    elSeasonsContainer.attr("aria-hidden", "false");
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
    elEpisodes.empty().css("height", "0");
    $masonryEpisodeGrid.masonry("reloadItems");
  }

  // genres
  elsActiveGenres.empty();
  for (var i in blob.genres) {
    var genre = blob.genres[i];
    elsActiveGenres.append("<div class='chip'>{0}</div> ".format(genre));
  }
};

var lnDoGenerateMovieEpisode = function(blob) {
  var thumbnail = RadarrMovieEndpoint + blob.id;
  var title = blob.title;

  var timeAgo = "not yet released";
  if (typeof blob.inCinemas == "string") {
    timeAgo = moment(blob.inCinemas).fromNow();
  }
  var epStatus = "not available";
  var direct = "#!";
  if (blob.hasFile) {
    epStatus = "{0} / {1}".format(blob.movieFile.quality.quality.name, bytesToSize(blob.movieFile.size));
    if (fbLoggedIn && !fbUser.isAnonymous) {
      direct = MeiEndpoint + blob.path + "/" + blob.movieFile.relativePath;
    }
  }
  var episodeId = "m";
  var details = "<ul class='collection'>" + 
    "<li class='collection-item ellipsis tooltipped' data-tooltip=\"{0}\">{0}</li>".format(title) + 
    "<li class='collection-item'><div>{0}<a class='secondary-content'><i class='material-icons'>update</i></a></div></li>".format(timeAgo) + 
    "<li class='collection-item'><div>{0}<a class='secondary-content'><i class='material-icons'>equalizer</i></a></div></li>".format(epStatus);
  if (blob.hasFile) {
    details += "<li class='collection-item center row'><div class='col s6 m4'><a href=\"{0}\" class='tooltipped infoTrackEpisodeOneWay' data-episode='{1}' data-tooltip='Direct Link'><i class='material-icons'>link</i></a></div><div class='col s6 m4'><a href='#' class='infoTrackEpisode tooltipped' data-tooltip='Mark as watched' data-episode='{1}'><i class='material-icons'>visibility</i></a></div><div class='col m4 hide-on-small-only'><a href='#' class='infoGroupWatch tooltipped' data-tooltip='Watch with others' data-episode='{1}'><i class='material-icons'>group</i></a></div></li>".format(direct, episodeId);
  }
  else {
    details += "<li class='collection-item'>&mdash;</li>";
  }
  details += "</ul>";

  if (!blob.hasFile) {
    thumbnail = "img/blank-episode.jpg";
    var poster =
      "<div class='col s12 m6 l6 xl4 grid'>" +
        "<div class='card'>" +
          "<div class='card-image'>" +
            "<img src='{0}'>".format(thumbnail) +
            "<a class='btn-floating middle-fab waves-effect waves-light red lighten-2 z-depth-2'><i class='material-icons'>close</i></a>" +
          "</div>" +
          "<div class='card-content'>" +
            "{0}".format(details) +
          "</div>" +
        "</div>" +
      "</div>";
  }
  else {
    var poster =
      "<div class='col s12 m6 l6 xl4 grid'>" +
        "<div class='card'>" +
          "<div class='card-image'>" +
            "<img src='{0}' class='activator'>".format(thumbnail) +
            "<a class='btn-floating middle-fab waves-effect waves-light light-blue lighten-2 z-depth-2 infoTrackEpisodeOneWay' data-direct-file=\"{0}\" data-direct-poster=\"{1}\" href='#!' data-fb-login-required data-ignore-hash><i class='material-icons'>play_arrow</i></a>".format(direct, thumbnail) +
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

var lnDoGenerateSeason = function(id) {
  $.post(SonarrSeasonEndpoint, {id: id}, lnProcGenerateSeason);
};

var lnProcGenerateSeason = function(data) {
  lnLog("season data", data);
  lnSeasonCache = data;
  qTriggerLatenightLoaded();
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

      var timeAgo = "not yet released";
      if (typeof blob.airDateUtc == "string") {
        timeAgo = moment(blob.airDateUtc).fromNow();
      }
      var epStatus = "not available";
      var direct = "#!";
      if (blob.hasFile) {
        epStatus = "{0} / {1}".format(blob.episodeFile.quality.quality.name, bytesToSize(blob.episodeFile.size));
        if (fbLoggedIn && !fbUser.isAnonymous) {
          direct = MeiEndpoint + blob.episodeFile.path;
        }
      }
      var episodeId = "s{0}e{1}".format(seasonNum, blob.episodeNumber);
      var details = "<ul class='collection'>" + 
        "<li class='collection-item ellipsis tooltipped' data-tooltip=\"{1}\">{0}</li>".format(title, blob.title) + 
        "<li class='collection-item'><div>{0}<a class='secondary-content'><i class='material-icons'>update</i></a></div></li>".format(timeAgo) + 
        "<li class='collection-item'><div>{0}<a class='secondary-content'><i class='material-icons'>equalizer</i></a></div></li>".format(epStatus);
      if (blob.hasFile) {
        details += "<li class='collection-item center row'><div class='col s6 m4'><a href=\"{0}\" class='tooltipped infoTrackEpisodeOneWay' data-episode='{1}' data-tooltip='Direct Link'><i class='material-icons'>link</i></a></div><div class='col s6 m4'><a href='#' class='infoTrackEpisode tooltipped' data-tooltip='Mark as watched' data-episode='{1}'><i class='material-icons'>visibility</i></a></div><div class='col m4 hide-on-small-only'><a href='#' class='infoGroupWatch tooltipped' data-tooltip='Watch with others' data-episode='{1}'><i class='material-icons'>group</i></a></div></li>".format(direct, episodeId);
      }
      else {
        details += "<li class='collection-item'>&mdash;</li>";
      }
      details += "</ul>";

      if (!blob.hasFile) {
        thumbnail = "img/blank-episode.jpg";
        var poster =
          "<div class='col s12 m6 l6 xl4 grid'>" +
            "<div class='card'>" +
              "<div class='card-image'>" +
                "<img src='{0}'>".format(thumbnail) +
                "<a class='btn-floating middle-fab waves-effect waves-light red lighten-2 z-depth-2'><i class='material-icons'>close</i></a>" +
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
                "<a class='btn-floating middle-fab waves-effect waves-light light-blue lighten-2 z-depth-2 infoTrackEpisodeOneWay' data-episode='{2}' data-file-path=\"{3}\"  data-file=\"{0}\" data-file-id='{1}' href='#!' data-fb-login-required data-ignore-hash><i class='material-icons'>play_arrow</i></a>".format(file, blob.id, episodeId, blob.episodeFile.path) +
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

  showLoader(true);
  textLoader("Loading episodes...");
  $masonryEpisodeGrid.imagesLoaded().progress(function() {
    $masonryEpisodeGrid.masonry("layout");
  }).always(hideLoaderForce);
  $masonryEpisodeGrid.masonry("reloadItems");
  $(".tooltipped").tooltip({delay: 50});

  // add episode watch list after page has loaded
  if (fbLoggedIn && !fbUser.isAnonymous) {
    $(".infoTrackEpisode").on("click", fbAdapterTrackEpisode);
    $(".infoTrackEpisodeOneWay").one("click", fbAdapterTrackEpisode);
    fbDatabase.ref("tracker/" + fbUser.uid + "/" + lnActiveInfo.titleSlug).once("value").then( fbAdapterTrackingList);
  }
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
  // lnProcHash should only be called within qAllLoaded, ignore checks.
  /*
  if (!lnReady || !fbReady) {
    //lnFnQueue(lnProcHash);
    return;
  }
  */
  var target;
  if (typeof e == "undefined") {
    target = location.hash;
  }
  else if (typeof e == "object") {
    if ($(this).is("[data-ignore-hash]")) {
      // do not proc/prevent default
      console.log("* ignore hash click");
      return;
    }
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
  console.log("lnProcHash:", target, e);
  if (target.substring(0, 2) !== "#!") {
    lnLog("ignoring non-#! href", target);
    return;
  }
  if (target.length == 2) {
    // handle #! as do nothing links
    console.log("doing nothing", target);
    return;
  }
  if (target == lnHashCache) {
    console.log("suppressing repeated lnProcHash call");
    return;
  }

  var hash = target.substring(2).replace("#", "").split("/");

  console.log("lnProcHash split:", hash);
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
    case "close-group":
      elGroup.attr("aria-hidden", "true");
      elBody.removeClass("noscroll");
      return;
    break;
    case "stats":
      elInfo.attr("aria-hidden", "true");
      elBody.removeClass("noscroll");
      lnListingType = "stats";
      lnStart = 0;

      var uid = hash[0];
      fbDatabase.ref("watching/" + uid).on("value", fbAdapterStatsList);
      fbDatabase.ref("users/" + uid).on("value", fbAdapterReceiveUserData);

      lnLog("hash: list (re)load - stats", lnListingType, lnStart);
      lnDoGenerateListing(lnListingType);
    break;
    case "group":
      kaLoadGroupWatch(hash[0], hash[1], hash[2]);
      console.log("group triggered");
    break;
    case "main":
      elWelcome.attr("aria-hidden", "false");
      elInfo.attr("aria-hidden", "true");
      elListing.attr("aria-hidden", "true");
    break;
  }

  //lnHashCache = target;
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
  if (!fbLoggedIn || fbUser.isAnonymous) {
    Materialize.toast("You must be logged in to do this action.", 2000);
    return;
  }
  e.preventDefault();

  var file = $(this).attr("data-file");
  lnAwaitFilePath = $(this).attr("data-file-path");
  lnAwaitFileId = $(this).attr("data-file-id");
  lnLog("proc file", file);
  $.post(LatenightApiEndpoint, {
    "gdrive-file": file
  }, lnProcGdriveFile);
  Materialize.toast("Loading episode...", 2000);
  showLoader(true);
  textLoader("Loading episode...");
};

var lnProcGdriveFile = function(data) {
  lnLog("got file", data);
  $("#mediaPlayer").modal("open");

  //$("#media").attr("poster", data.poster);
  //$("#media source").attr("src", data.file);
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
  videojsPlayer.poster(data.poster);
  videojsPlayer.src(srcs);
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
  hideLoaderForce();
};

var lnProcDirectFile = function(e) {
  if (!fbLoggedIn || fbUser.isAnonymous) {
    Materialize.toast("You must be logged in to do this action.", 2000);
    return;
  }
  e.preventDefault();
  Materialize.toast("Notice: Some movies may not play in a browser");

  $("#mediaPlayer").modal("open");
  var srcs = [
    { src: $(this).attr("data-direct-file"), type: "video/mp4" }
  ];
  videojsPlayer.poster($(this).attr("data-direct-poster"));
  videojsPlayer.src(srcs);
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
  hideLoaderForce();
}

$("body").on("click", "a[href^='#!']", lnProcHash);
$("body").on("click", "a[data-file]", lnProcFile);
$("body").on("click", "a[data-direct-file]", lnProcDirectFile);
elSeasons.on("change", lnDoGenerateEpisodes);
$(function() {
  if (location.hash.length > 0) {
    //lnQueue.push(lnProcHash);
    qLnProcHash();
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
  groupVideojsPlayer = videojs("group-media-player");
  //setInterval(lnTimer, 1000);
});

window.onhashchange = function() {
  console.log("hash change");
  //lnProcHash();
  qLnProcHash();
};
