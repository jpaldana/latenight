// variables
var SonarrEndpoint = "https://dev6-api.latenight.moe/latenight/api.php?endpoint=Listing";
var SonarrSeasonEndpoint = "https://dev6-api.latenight.moe/latenight/api.php?endpoint=Episodes";
var SonarrMediaEndpoint = "https://dev6-api.latenight.moe/latenight-media/index.php?host=sonarr&request=";
var RadarrMediaEndpoint = "https://dev6-api.latenight.moe/latenight-media/index.php?host=radarr&request=";
var SonarrEpisodeEndpoint = "https://dev6-api.latenight.moe/twilight/Thumbnail.php?host=sonarr&id=";
var LatenightApiEndpoint = "https://dev6-api.latenight.moe/api.php";
var TwilightApiEndpoint = "https://dev6-api.latenight.moe/twilight/Subtitle.php?host=sonarr&id=";

$(function(){
  // side nav
  $('.button-collapse').sideNav();
  // modal(s)
  $('.modal').modal();
  // character counter(s)
  $("#profileDisplayName").characterCounter();

  //lnDoGenerateListing(lnListingType);
  lnDoRefresh();
});

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
