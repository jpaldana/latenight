// Initialize Firebase
var config = {
  apiKey: "AIzaSyCF2vR7VZZR2AbAF3ozl9_PROWEDI5Bcik",
  authDomain: "after-mirror.firebaseapp.com",
  databaseURL: "https://after-mirror.firebaseio.com",
  projectId: "after-mirror",
  storageBucket: "",
  messagingSenderId: "53354187057"
};
firebase.initializeApp(config);

var fbDatabase = false;
var fbLoggedIn = false;
var fbUser = false;
var fbReady = false;

var elsFbLogout = $("[data-fb-logout]");
var elsDisplayName = $("[data-fb-user]");
var elsDisplayProfileImage = $("[data-fb-profile-image]");
var elsDisplayEmail = $("[data-fb-email]");
var elsRequireLogin = $("[data-fb-login-required]");
var elsRequireEmailVerification = $("[data-fb-email-verification-required]");
var elsVisibleLogin = $("[data-fb-login-visible]");

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    if (user.isAnonymous) {
      console.log("auth success (anon)", user);
      fbLoggedIn = false;
      elsVisibleLogin.hide();
    }
    else {
      console.log("auth success", user);
      fbHookSignedIn();
      fbLoggedIn = true;
      elsVisibleLogin.show();
    }
    fbUser = user;
    fbFillUser(user);
    fbDatabase = firebase.database();
    fbInitHandlers();
    lnProcHash();
    Materialize.Toast.removeAll();
    fbReady = true;
    fbSyncData();
    //qTriggerFirebaseLoaded(); // should be in fbInitHandlers();
  }
  else {
    if (fbUser == false) {
      elsVisibleLogin.hide();
      console.log("auth fail - now using anon login");
      firebase.auth().signInAnonymously().catch(function(error) {
        console.log("anon auth fail");
      });
      $("body").on("click", "[data-fb-login-required]", fbInterceptLoginRequired);
    }
    else {
      location.href = "?";
    }
  }
});

var fbFillUser = function(user) {
  if (!fbLoggedIn || fbUser.isAnonymous) {
    return;
  }
  var displayName = user.email;
  if (typeof user.displayName == "string") {
    displayName = user.displayName;
  }
  uiReplace(elsDisplayName, displayName, "text");
  uiReplace(elsDisplayEmail, user.email, "text");
  if (typeof user.photoURL == "string") {
    uiReplace(elsDisplayProfileImage, user.photoURL, "profile-image");
  }

  if (user.emailVerified) {
    $("#statusEmailVerifyBtn").hide();
    $("#statusEmailVerified").attr("checked", true);
  }
  else {
    $("#statusEmailVerifyBtn").show();
    $("#statusEmailVerified").attr("checked", false);
    elsRequireEmailVerification.attr("disabled", true);
  }

  $("#profileStatsBtn").attr("href", "#!stats/" + user.uid);

  Materialize.updateTextFields();
};

var fbHookSignedIn = function() {
  $("li.group-login a").attr("href", "#account");
  $("#nav-mobile li.group-login a").text("My Account");
  if ($("#login").is(":visible")) {
    $("#login").modal("close");
  }
};

var fbHookSignedOut = function() {
  $("li.group-login a").attr("href", "#login");
  $("#nav-mobile li.group-login a").text("Login / Register");
  if ($("#account").is(":visible")) {
    $("#account").modal("close");
  }
};

var fbDoRegister = function(e) {
  e.preventDefault();
  var email = $("#formRegisterEmail").val();
  var password = $("#formRegisterPassword").val();

  firebase.auth().createUserWithEmailAndPassword(email, password).catch(function(error) {
    fbToastError(error);
  });  
};
var fbDoLogin = function(e) {
  e.preventDefault();
  var email = $("#formLoginEmail").val();
  var password = $("#formLoginPassword").val();

  firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
    fbToastError(error);
  });
};
var fbDoLogout = function() {
  firebase.auth().signOut().then(function() {
    fbHookSignedOut();
  }).catch(function(error) {
    fbToastError(error);
  });
};
var fbDoUpdate = function(args) {
  if (!fbLoggedIn || fbUser.isAnonymous) {
    return;
  }
  fbUser.updateProfile(args).then(function() {
    fbUser = firebase.auth().currentUser;
    fbFillUser(fbUser);
    Materialize.toast("Updated profile successfully.", 2000);
    fbSyncData();
  }).catch(function(error) {
    fbToastError(error);
  });
};

var fbDoPreviewProfileImage = function(e) {
  var input = e.target;
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {
      $("#profileUploadImage").attr("src", e.target.result);
      fbDoCropperProfileImage();
    };
    reader.readAsDataURL(input.files[0]);
  }
};
var fbDoCropperProfileImage = function() {
  $("#profileUploadImage").cropper({
    aspectRatio: 1
  });
  $("#profileUploadImageSave").attr("aria-hidden", "false");
};
var fbDoPreviewProfileImageSave = function() {
  if (!fbLoggedIn || fbUser.isAnonymous) {
    return;
  }
  var canvas = $("#profileUploadImage").cropper("getCroppedCanvas");

  $.post(LatenightApiEndpoint, {
    imageblob: canvas.toDataURL("image/jpeg")
  }, function(data) {
    console.log("done", data);
    fbDoUpdate({
      photoURL: data.file
    });
  });
};
var fbDoDisplayNameSave = function() {
  if (!fbLoggedIn || fbUser.isAnonymous) {
    return;
  }
  if ($("#profileDisplayName").val().length <= 32 && $("#profileDisplayName").val().length > 0) {
    fbDoUpdate({
      displayName: $("#profileDisplayName").val()
    });
  }
  else {
    Materialize.toast("Invalid name entered.", 2000);
  }
};

var fbDoSendVerificationEmail = function() {
  if (!fbLoggedIn || fbUser.isAnonymous) {
    return;
  }
  if (!fbUser.emailVerified) {
    fbUser.sendEmailVerification().then(function() {
      Materialize.toast("Verification email sent.", 2000);
    }).catch(function(error) {
      fbToastError(error);
    });
  }
};

var fbDoUpdatePassword = function() {
  if (!fbLoggedIn || fbUser.isAnonymous) {
    return;
  }
  var newPassword = $("#statusPassword").val();
  if (newPassword.length == 0) {
    Materialize.toast("Invalid password.");
    return;
  }
  fbUser.updatePassword(newPassword).then(function() {
    Materialize.toast("Password updated.", 2000);
  }).catch(function(error) {
    fbToastError(error);
  });
};

var fbSyncData = function() {
  if (!fbLoggedIn || fbUser.isAnonymous) {
    return;
  }
  var prefixString = "users/" + fbUser.uid + "/";
  var data = {};

  data[prefixString + "displayName"] = fbUser.displayName;
  data[prefixString + "photoURL"] = fbUser.photoURL;
  fbDatabase.ref().update(data);
};

var fbInterceptLoginRequired = function(e) {
  if (fbLoggedIn && !fbUser.isAnonymous) {
    return;
  }
  e.preventDefault();
  e.stopPropagation();

  Materialize.toast("You must be logged in to use this feature.", 2000);
};

var fbToastError = function(error) {
  var errorCode = error.code;
  var errorMessage = error.message;
  console.log("error", errorCode, errorMessage);
  Materialize.toast(error.message, 2000);
};

var uiReplace = function(els, value, type) {
  if (type == "text") {
    els.each(function() {
      if ($(this).is("[value]")) {
        $(this).val(value);
      }
      else {
        $(this).text(value);
      }
    });
  }
  else if (type == "profile-image") {
    els.each(function() {
      if ($(this).is("[src]")) {
        $(this).attr("src", value);
      }
      else {
        $(this).css("background-image", "url({0})".format(value)).addClass("bg-fix profile-circle z-depth-2").empty();
      }
    });
  }
}

$(function() {
  $("#formLoginSubmit").on("click", fbDoLogin);
  $("#formRegisterSubmit").on("click", fbDoRegister);
  $("#profileUploadImageDialogBtn").on("click", function() {
    $("#profileUploadImageDialog").click();
  });
  $("#profileDisplayNameSaveBtn").on("click", fbDoDisplayNameSave);
  $("#profileDisplayName").on("keydown", function() {
    $("#profileDisplayNameSaveBtn").attr("aria-hidden", "false");
  });
  $("#profileUploadImageDialog").on("change", fbDoPreviewProfileImage);
  $("#profileUploadImageSave").on("click", fbDoPreviewProfileImageSave);
  $("#statusEmailVerifyBtn").on("click", fbDoSendVerificationEmail);
  $("#statusUpdatePasswordDialog").on("click", function() {
    $(this).hide();
    $(".group-password").show();
  });
  $("#statusUpdatePasswordBtn").on("click", fbDoUpdatePassword);
  $(".group-password").hide();
  elsFbLogout.on("click", fbDoLogout);
});
