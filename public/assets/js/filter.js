$(document).ready(function () {
    // $('.collapse').collapse();
})

function clearAllErrors() {
    $('.errorMsgResult').text('');
    $('.successMsgResult').text('');
    $('.errorMsg').text('');
    $('.successMsg').text('');
}

$(document).on('click', '#searchStudyPartners', function () {
    clearAllErrors();
    let filters = {};
    let filterValue = [], i = 0;
    if ($('input[name=genderFilter]:checked').length > 0) {
        $('input[name=genderFilter]:checked').each(function () {
            filterValue[i] = $(this).val();
            i++;
        });
        filters['gender'] = filterValue;
        filterValue = [], i = 0;
        // console.log(filters['gender']);
    } else {
        filters['gender'] = [];
    }
    if ($('input[name=studyModeFilter]:checked').length > 0) {
        $('input[name=studyModeFilter]:checked').each(function () {
            filterValue[i] = $(this).val();
            i++;
        });
        filters['studymode'] = filterValue;
        filterValue = [], i = 0;
    } else {
        filters['studymode'] = [];
    }
    if ($('input[name=timezoneFilter]:checked').length > 0) {
        $('input[name=timezoneFilter]:checked').each(function () {
            filterValue[i] = $(this).val();
            i++;
        });
        filters['timezone'] = filterValue;
        filterValue = [], i = 0;
    } else {
        filters['timezone'] = [];
    }
    if ($('input[name=examFilter]:checked').length > 0) {
        $('input[name=examFilter]:checked').each(function () {
            filterValue[i] = $(this).val();
            i++;
        });
        filters['exam'] = filterValue;
        filterValue = [], i = 0;
    } else {
        filters['exam'] = [];
    }
    if ($('input[name=universityFilter]:checked').length > 0) {
        $('input[name=universityFilter]:checked').each(function () {
            filterValue[i] = $(this).val();
            i++;
        });
        filters['university'] = filterValue;
        filterValue = [], i = 0;
    } else {
        filters['university'] = [];
    }
    if ($('input[name=programFilter]:checked').length > 0) {
        $('input[name=programFilter]:checked').each(function () {
            filterValue[i] = $(this).val();
            i++;
        });
        filters['program'] = filterValue;
        filterValue = [], i = 0;
    } else {
        filters['program'] = [];
    }

    if (Object.keys(filters).length > 0) {
        $.ajax({
            url: url + 'searchStudyPartner',
            type: 'POST',
            crossDomain: true,
            data: {
                gender: filters['gender'],
                studymode: filters['studymode'],
                timezone: filters['timezone'],
                exam: filters['exam'],
                university: filters['university'],
                program: filters['program'],
            },
            success: function (response) {
                if (response.status == 'success') {

                    if (Object.keys(response.data.data).length > 0) {
                        let html = "";
                        $.each((response.data.data), function (key, value) {
                            html += '<div class="col-md-3 profiletile" user-id = "' + value.ru_id + '"><div class="col-md-12 profileimage"><img src="../assets/images/userProfile/' + value.ru_id + '.jpg" alt="profile picture" class="img-fluid"></div><div class="col-md-12 profiletitle"><a class="" target = "_blank" href="view-student-profile/' + value.ru_id + '">' + value.name + '</a></div><div class="col-md-12" style="text-align: center;"><button class="btn btn-danger btn-sm btn-block sendrequets">Send Request</button></div></div>';
                        });
                        $("#filteringResults").html(html);
                    } else {
                        $("#filteringResults").html(response.message)
                    }
                    $('.successMsgResult').text(Object.keys(response.data.data).length + " result/s found");
                } else {
                    $('.errorMsg').text(response.message);
                }
            },
            error: function () {
                $('.errorMsg')
                    .text('Something went wrong. Please try again!!!');
            }
        });
    } else {
        $('.errorMsg').text('Please select filters!!');
    }
});

$(document).on('click', '.sendrequets', function () {
    clearAllErrors();
    const obj = $(this)
    const userId = obj.closest('.profiletile').attr('user-id');
    $.ajax({
        url: url + 'sendUserRequest',
        type: 'POST',
        crossDomain: true,
        data: {
            userId: userId,
        },
        success: function (response) {
            if (response.status == 'success') {
                $('.successMsgResult').text(response.message);
                obj.remove();
            } else {
                $('.errorMsgResult').text(response.message);
            }
        },
        error: function () {
            $('.errorMsgResult')
                .text('Something went wrong. Please try again!!!');
        }
    });
});
