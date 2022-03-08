// logout user
function signOut() {
    if(gapi.auth2) {
        var auth2 = gapi.auth2.getAuthInstance();
        auth2.signOut().then(function () {
            console.log("google log out here");
            window.location.href = 'log-out';
        });
    } else {
        window.location.href = 'log-out';
    }
}