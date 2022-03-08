//LOGIN API
$(document).on("click", "#userlogin", function () {
    $('.errorMsg').text('');
    let email = $("#useremail").val();
    if (!validateEmail(email)) {
        $("#useremail").css('border', '1px solid red');
        return;
    } else {
        $("#useremail").css('border', '');
    }
    let password = $("#userPassword").val();
    if (password.length < 6 && password.length > 12) {
        $("#userPassword").css('border', '1px solid red');
        return;
    } else {
        $("#userPassword").css('border', '');
    }

    $.ajax({
        url: url + "loginAPI",
        type: "POST",
        crossDomain: true,
        data: {
            email: email,
            password: password
        },
        success: function (response) {
            if (response.status == "success") {
                window.location.href = 'log-in';
            } else {
                $('.errorMsg').text(response.message);
            }
        },
        error: function () {
            $('.errorMsg').text("Something went wrong. Please try again!!!");
        }
    });
});
// create user account validation and api call
$(document).on("click", "#createAccount", function () {
    $('.errorMsg').text('');
    $('.successMsg').text('');
    let email = $("#useremail").val().trim();
    if (email == '' || !validateEmail(email)) {
        $("#useremail").css('border', '1px solid red');
        return;
    } else {
        $("#useremail").css('border', '');
    }

    let name = $("#name").val().trim();
    if(name == '' || !validateName(name)) {
        $("#name").css('border', '1px solid red');
        return;
    } else {
        $("#name").css('border', '');
    }

    let contact = $("#contact").val().trim();
    if(contact == '' || contact.length != 10) {
        $("#contact").css('border', '1px solid red');
        return;
    } else {
        $("#contact").css('border', '');
    }

    let address = $("#address").val().trim();
    if(address.length == 0) {
        $("#address").css('border', '1px solid red');
        return;
    } else {
        $("#address").css('border', '');
    }

    let zipcode = $("#zipcode").val().trim();
    if(zipcode.length != 5) {
        $("#zipcode").css('border', '1px solid red');
        return;
    } else {
        $("#zipcode").css('border', '');
    }

    let password = $("#userPassword").val();
    // console.log(password);
    if (password.length < 6 || password.length > 12) {
        $("#userPassword").css('border', '1px solid red');
        return;
    } else {
        $("#userPassword").css('border', '');
    }

    let gender = $('input[name="genderoption"]:checked').val().trim();
    if(gender == "") {
        gender = "other";
    }

    $.ajax({
        url: url + "registerUser",
        type: "POST",
        crossDomain: true,
        data: {
            email: email,
            name: name,
            phone: contact,
            gender: gender,
            password: password,
            address: address,
            zipcode: zipcode
        },
        success: function (response) {
            if (response.status == "success") {
                $('.successMsg').text(response.message);
                $("#useremail").val('');
                $("#name").val('');
                $("#contact").val('');
                $("#address").val('');
                $("#zipcode").val('');
                $("#userPassword").val('');
            } else {
                $('.errorMsg').text(response.message);
            }
        },
        error: function () {
            $('.errorMsg').text("Something went wrong. Please try again!!!");
        }
    });
});

//submit query from contact us
$(document).on("click", "#sendQuery", function () {
    $('.errorMsg').text('');
    $('.successMsg').text('');

    let name = $("#name").val().trim();
    if(name == '' || !validateName(name)) {
        $("#name").css('border', '1px solid red');
        return;
    } else {
        $("#name").css('border', '');
    }

    let email = $("#useremail").val().trim();
    if (email == '' || !validateEmail(email)) {
        $("#useremail").css('border', '1px solid red');
        return;
    } else {
        $("#useremail").css('border', '');
    }

    let contact = $("#contact").val().trim();
    if(contact == '' || contact.length != 10) {
        $("#contact").css('border', '1px solid red');
        return;
    } else {
        $("#contact").css('border', '');
    }

    let query = $("#query").val().trim();
    if(query.length == 0) {
        $("#query").css('border', '1px solid red');
        return;
    } else {
        $("#query").css('border', '');
    }

    $.ajax({
        url: url + "submitUserQuery",
        type: "POST",
        crossDomain: true,
        data: {
            email: email,
            name: name,
            phone: contact,
            query: query
        },
        success: function (response) {
            if (response.status == "success") {
                $('.successMsg').text(response.message);
                $("#useremail").val('');
                $("#name").val('');
                $("#contact").val('');
                $("#query").val('');
            } else {
                $('.errorMsg').text(response.message);
            }
        },
        error: function () {
            $('.errorMsg').text("Something went wrong. Please try again!!!");
        }
    });
});

// validate email
function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// validate name
function validateName(name) {
    const re = /^[a-zA-Z ]+$/
    return re.test(String(name).toLowerCase());
}

// google log in
function onSignIn(googleUser) {
    var profile = googleUser.getBasicProfile();
    // The ID token you need to pass to your backend:
    var id_token = googleUser.getAuthResponse().id_token;

    $.ajax({
        url: url + "googleLoginSignup",
        type: "POST",
        crossDomain: true,
        data: {
            name: profile.getName(),
            image: profile.getImageUrl(),
            email: profile.getEmail(),
            id: id_token
        },
        success: function (response) {
            console.log("resposnse");
            console.log(response);
            if (response.status == "success") {
                window.location.href = 'log-in';
            } else {
                $('.errorMsg').text(response.message);
            }
        },
        error: function () {
            $('.errorMsg').text("Something went wrong. Please try again!!!");
        }
    });
}