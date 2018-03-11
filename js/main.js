// variables
var SonarrEndpoint = "https://dev6-api.latenight.moe/latenight/api.php?endpoint=Listing";
var SonarrSeasonEndpoint = "https://dev6-api.latenight.moe/latenight/api.php?endpoint=Episodes";
var SonarrMediaEndpoint = "https://dev6-api.latenight.moe/latenight-media/index.php?host=sonarr&request=";
var RadarrMediaEndpoint = "https://dev6-api.latenight.moe/latenight-media/index.php?host=radarr&request=";
var SonarrEpisodeEndpoint = "https://dev6-api.latenight.moe/twilight/Thumbnail.php?host=sonarr&id=";
var RadarrMovieEndpoint = "https://dev6-api.latenight.moe/twilight/Thumbnail.php?host=radarr&id=";
var LatenightApiEndpoint = "https://dev6-api.latenight.moe/api.php";
var TwilightApiEndpoint = "https://dev6-api.latenight.moe/twilight/Subtitle.php?host=sonarr&id=";
var GithubApiEndpoint = "https://api.github.com/repos/jpaldana/latenight/commits?per_page=1";
var MeiEndpoint = "https://mei.aldana.io";

var evLatenightReady = false;
var evFirebaseReady = false;

$(function(){
  // side nav
  $('.button-collapse').sideNav();
  // modal(s)
  $('.modal').modal();
  // character counter(s)
  $("#profileDisplayName").characterCounter();

  //lnDoGenerateListing(lnListingType);
  lnDoRefresh();
  ghDoRequest();
  $("#editor-text").on("keyup", function() {
    var html = marked($(this).val());
    console.log(html);
    $("#editor-res").html(html);
  });

  //elLoader.attr("aria-hidden", "false");
  textLoader("Refreshing sources...");
  qWaitAllLoaded(hideLoader);
});
var showLoader = function(noAutoLoad) {
  if (loaderStatus == 1) {
    elLoader.attr("aria-hidden", "false");
    if (typeof noAutoLoad == "boolean" && noAutoLoad) {
      loaderStatus = 2;
      return;
    }
    loaderStatus = 0;
    qWaitAllLoaded(hideLoader);
  }
};
var showLoaderForce = function() {
  showLoader(true);
};
var hideLoader = function(force) {
  if (loaderStatus == 0 || (typeof force == "boolean" && force)) {
    loaderStatus = 1;
    elLoader.attr("aria-hidden", "true");
  }
};
var hideLoaderForce = function() {
  hideLoader(true);
};
var textLoader = function(text) {
  elLoaderText.text(text);
};
var loaderStatus = 0;
/*
0 = shown
1 = hidden
2 = shown (forced)
 */

// First, checks if it isn't implemented yet.
// @https://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}
function bytesToSize(bytes) {
  var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes == 0) return '0 B';
  var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
};
function escapeHtml(unsafe) {
  return unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
}
