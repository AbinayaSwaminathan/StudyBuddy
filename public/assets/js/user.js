// update basic info
$(document).on('click', '#savebasicinfo', function () {
    $('.errorMsg').text('');
    $('.successMsg').text('');

    let name = $('#name').val().trim();
    if (name == '' || !validateName(name)) {
        $('#name').css('border', '1px solid red');
        return;
    } else {
        $('#name').css('border', '');
    }

    let contact = $('#contact').val().trim();
    if (contact == '' || contact.length != 10) {
        $('#contact').css('border', '1px solid red');
        return;
    } else {
        $('#contact').css('border', '');
    }

    let address = $('#address').val().trim();
    if (address.length == 0) {
        $('#address').css('border', '1px solid red');
        return;
    } else {
        $('#address').css('border', '');
    }

    let zipcode = $('#zipcode').val().trim();
    if (zipcode.length != 5) {
        $('#zipcode').css('border', '1px solid red');
        return;
    } else {
        $('#zipcode').css('border', '');
    }

    let gender = $('input[name="genderoption"]:checked').val().trim();
    if (gender == '') {
        gender = 'other';
    }

    $.ajax({
        url: url + 'updateBasicInfo',
        type: 'POST',
        crossDomain: true,
        data: {
            name: name,
            phone: contact,
            gender: gender,
            address: address,
            zipcode: zipcode,
        },
        success: function (response) {
            if (response.status == 'success') {
                $('#basicinfodiv .successMsg').text(response.message);
            } else {
                $('#basicinfodiv .errorMsg').text(response.message);
            }
        },
        error: function () {
            $('#basicinfodiv .errorMsg')
                .text('Something went wrong. Please try again!!!');
        }
    });
});

// update user profile picture
$(document).on('click', '#updatepicture', function () {
    const profile = $('#profilepicture')[0];
    const fd = new FormData(profile);
    alert("on click");
    $.ajax({
        url: url + 'updateProfilePicture',
        type: 'POST',
        crossDomain: true,
        data: fd,
        processData: false,
        contentType: false,
        beforeSend: function(){
            alert("going for call");
        },
        success: function (response) {
            if (response.status == 'success') {
                $('#pictureupdate .successMsg').text(response.message);
                // setTimeout(function () { // cancel modal after 2 seconds
                //     window.location.reload();
                // }, 2000);
                alert("on response received");
                
            } else {
                $('#pictureupdate .errorMsg').text(response.message);
            }
        },
        error: function () {
            $('#pictureupdate .errorMsg')
                .text('Something went wrong. Please try again!!!');
        },
    });
});

// update academic info
$(document).on('click', '#saveacademicinfo', function () {
    $('.errorMsg').text('');
    $('.successMsg').text('');

    let exams = $('#exams').val();
    let university = $('#university').val();
    let degree = $('#degree').val();
    let program = $('#programs').val();
    let gyear = $('#gyear').val();

    if (exams == null && (university == null || degree == null || program == null || gyear == null)) {
        $('.errorMsg').text("Please provide either exam or all university information you are studing in");
        return;
    }
    if (exams != null && Object.keys(exams).length > 5) {
        $('.errorMsg').text("You can provide maximum 5 exams");
        return;
    }
    let gpa = $('#gpa').val().trim();
    if (gpa != '' && (gpa > 5.0 || gpa < 0.0)) {
        $('#gpa').css('border', '1px solid red');
        $('.errorMsg').text("GPA should range from 0.0 to 5.0");
        return;
    } else {
        $('#gpa').css('border', '');
    }

    $.ajax({
        url: url + 'updateAcademicInfo',
        type: 'POST',
        crossDomain: true,
        data: {
            exams: exams,
            university: university,
            degree: degree,
            program: program,
            gyear: gyear,
            gpa: gpa
        },
        success: function (response) {
            if (response.status == 'success') {
                $('.successMsg').text(response.message);
            } else {
                $('.errorMsg').text(response.message);
            }
        },
        error: function () {
            $('.errorMsg')
                .text('Something went wrong. Please try again!!!');
        }
    });
});

// update study preferences
$(document).on('click', '#studypreferencesupdate', function () {
    $('.errorMsg').text('');
    $('.successMsg').text('');

    let gender = $('#gender').val();
    if (gender == null) {
        $('.errorMsg').text('Select gender preference');
        return;
    }

    let timezone = $('#timezone').val();
    if (timezone == null) {
        $('.errorMsg').text('Select timezone preference');
        return;
    } else {
        if (Object.keys(timezone).length > 5) {
            $('.errorMsg').text("You can provide maximum 5 time zones or select all");
            return;
        }
    }

    let studymode = $('#studymode').val();
    if (studymode == null) {
        $('.errorMsg').text('Select study mode preference');
        return;
    }
    let exams = $('#exam').val();
    if (exams == '') {
        $('.errorMsg').text('Select exam preference');
        return;
    }
    let university = $('#university').val();
    if (university == '') {
        $('.errorMsg').text('Select university preference');
        return;
    }
    let program = $('#program').val();
    if (program == '') {
        $('.errorMsg').text('Select program preference');
        return;
    }

    $.ajax({
        url: url + 'updateStudyPreference',
        type: 'POST',
        crossDomain: true,
        data: {
            exam: exams,
            university: university,
            gender: gender,
            program: program,
            studymode: studymode,
            timezone: timezone,
            question1: $('input[name=question1]:checked').val(),
            question2: $('input[name=question2]:checked').val(),
            question3: $('input[name=question3]:checked').val(),
            question4: $('input[name=question4]:checked').val()
        },
        success: function (response) {
            if (response.status == 'success') {
                $('.successMsg').text(response.message);
            } else {
                $('.errorMsg').text(response.message);
            }
        },
        error: function () {
            $('.errorMsg')
                .text('Something went wrong. Please try again!!!');
        }
    });
});

//unselect other select options on selecting ANY option
$(document).on('change', '#gender, #studymode, #timezone', function () {
    let data = $(this).val();
    let selects = $(this);
    if (data != null && data.indexOf("Any") >= 0) {
        //unselect other options
        $.each(selects.find("option:selected"), function () {
            if (!($(this).val() == "Any")) {
                $(this).prop("selected", false);
            }
        });
        selects.formSelect();
    }
});

// update user account password
$(document).on('click', '#updatepassword', function () {
    $('.errorMsg').text('');
    $('.successMsg').text('');

    let pwd1 = $('#password1').val();
    let pwd2 = $('#password2').val();

    if (pwd1.length < 6 || pwd1.length > 12) {
        $("#password1").css('border', '1px solid red');
        return;
    } else {
        $("#password1").css('border', '');
    }

    if (pwd2 != pwd1) {
        $("#password2").css('border', '1px solid red');
        return;
    } else {
        $("#password2").css('border', '');
    }

    $.ajax({
        url: url + 'updateAccountSettings',
        type: 'POST',
        crossDomain: true,
        data: {
            type: 1,
            password1: pwd1,
            password2: pwd2
        },
        success: function (response) {
            if (response.status == 'success') {
                $('.successMsg').text(response.message);
            } else {
                $('.errorMsg').text(response.message);
            }
        },
        error: function () {
            $('.errorMsg').text('Something went wrong. Please try again!!!');
        }
    });
});

// deactivate user account
$(document).on('click', '#deactivateAcc', function () {
    $('.errorMsg').text('');
    $('.successMsg').text('');

    $.ajax({
        url: url + 'updateAccountSettings',
        type: 'POST',
        crossDomain: true,
        data: {
            type: 2
        },
        success: function (response) {
            if (response.status == 'success') {
                $('#deactivateAccModal').modal('hide');
                $('.successMsg').text(response.message);
                setTimeout(function () { // redirect to login after 2 seconds
                    window.location.href = 'log-in';
                }, 2000);
            } else {
                $('.errorMsg').text(response.message);
            }
        },
        error: function () {
            $('.errorMsg').text('Something went wrong. Please try again!!!');
        }
    });
});

// on click of cancel request button
$(document).on('click', '.cancelrequets', function () {
    const reqid = $(this).attr('requestid');
    $('#confirmCancelReq').attr('requestid', reqid);
});

// on click of reject request
$(document).on('click', '.rejectrequets', function () { 
    const reqid = $(this).attr('requestid');
    $('#confirmRejectReq').attr('requestid', reqid);
});

// on click of accept request
$(document).on('click', '.acceptRequest', function () { 
    const reqid = $(this).attr('requestid');
    $('#confirmAcceptReq').attr('requestid', reqid);
    const userid = $(this).attr('user');
    $('#confirmAcceptReq').attr('userid', userid);
});

// on click of remove mate
$(document).on('click', '.removeMate', function () { 
    const reqid = $(this).attr('user');
    $('#confirmRemoveMate').attr('userid', reqid);
});

// on click of sned message
$(document).on('click', '.sendMessage', function () { 
    const reqid = $(this).attr('user');
    $('#confirmSendMessage').attr('userid', reqid);
});

// cancel study request 
$(document).on('click', '#confirmCancelReq, #confirmRejectReq', function () {
    $('.errorMsg').text('');
    $('.successMsg').text('');

    const reqid = $(this).attr('requestid');
    const reqtype = $(this).attr('requesttype');
    if (reqid > 0) {
        $.ajax({
            url: url + 'updateRequestStatus',
            type: 'POST',
            crossDomain: true,
            data: {
                type: reqtype,
                reqid: reqid
            },
            success: function (response) {
                if (response.status == 'success') {
                    $('.successMsg').text(response.message);
                    setTimeout(function () { // cancel modal after 2 seconds
                        $('#cancelReqModal').modal('hide');
                        window.location.reload();
                    }, 2000);
                } else {
                    $('.errorMsg').text(response.message);
                }
            },
            error: function () {
                $('.errorMsg').text('Something went wrong. Please try again!!!');
            }
        });
    } else {
        $('.errorMsg').text('Please log in again and try to cancel/reject the request!');
    }
});

// accept study request 
$(document).on('click', '#confirmAcceptReq', function () {
    $('.errorMsg').text('');
    $('.successMsg').text('');

    const reqid = $(this).attr('requestid');
    const user = $(this).attr('userid');

    if (reqid > 0) {
        $.ajax({
            url: url + 'updateRequestStatus',
            type: 'POST',
            crossDomain: true,
            data: {
                type: 2,
                reqid: reqid,
                fromUser: user
            },
            success: function (response) {
                if (response.status == 'success') {
                    $('.successMsg').text(response.message);
                    setTimeout(function () { // cancel modal after 2 seconds
                        $('#acceptReqModal').modal('hide');
                        window.location.reload();
                    }, 2000);
                } else {
                    $('.errorMsg').text(response.message);
                }
            },
            error: function () {
                $('.errorMsg').text('Something went wrong. Please try again!!!');
            }
        });
    } else {
        $('.errorMsg').text('Please log in again and try to accept the request!');
    }
});

// remove study mate 
$(document).on('click', '#confirmRemoveMate', function () {
    $('.errorMsg').text('');
    $('.successMsg').text('');

    const user = $(this).attr('userid');

    if (user > 0) {
        $.ajax({
            url: url + 'updateRequestStatus',
            type: 'POST',
            crossDomain: true,
            data: {
                type: 4,
                removeUser: user
            },
            success: function (response) {
                if (response.status == 'success') {
                    $('.successMsg').text(response.message);
                    setTimeout(function () { // cancel modal after 2 seconds
                        $('#removeMate').modal('hide');
                        window.location.reload();
                    }, 2000);
                } else {
                    $('.errorMsg').text(response.message);
                }
            },
            error: function () {
                $('.errorMsg').text('Something went wrong. Please try again!!!');
            }
        });
    } else {
        $('.errorMsg').text('Please log in again and try to accept the request!');
    }
});

// send user message 
$(document).on('click', '#confirmSendMessage', function () {
    $('.errorMsg').text('');
    $('.successMsg').text('');

    const user = $(this).attr('userid');
    const usermessage = $("#firstMessage").val().trim();
    if(usermessage.length == 0) {
        $("#firstMessage").css('border', '1px solid red');
        return;
    } else {
        $("#firstMessage").css('border', '');
    }
    if (user > 0 && usermessage.length > 0) {

        $.ajax({
            url: url + 'sendFirstMessage',
            type: 'POST',
            crossDomain: true,
            data: {
                touser: user,
                message: usermessage
            },
            success: function (response) {
                if (response.status == 'success') {
                    $('.successMsg').text(response.message);
                    setTimeout(function () { // cancel modal after 2 seconds
                        $('#sendMessage').modal('hide');
                    }, 2000);
                } else {
                    $('.errorMsg').text(response.message);
                }
            },
            error: function () {
                $('.errorMsg').text('Something went wrong. Please try again!!!');
            }
        });
    } else {
        $('.errorMsg').text('Please log in again and try to accept the request!');
    }
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

// on load google
function onLoad() {
    gapi.load('auth2', function () {
        gapi.auth2.init();
    });
}
//send email for forgot password module
function sendEmail(email, token) {
 
    var email = email;
    var token = token;
 
    var mail = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'studymatetesting@gmail', // Your email id
            pass: 'studymate2022#' // Your password
        }
    });
 
    var mailOptions = {
        from: 'tutsmake@gmail.com',
        to: email,
        subject: 'Reset Password Link - Tutsmake.com',
        html: '<p>You requested for reset password, kindly use this <a href="http://localhost:4000/reset-password?token=' + token + '">link</a> to reset your password</p>'
 
    };
 
    mail.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(1)
        } else {
            console.log(0)
        }
    });
}