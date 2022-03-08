process.env.TZ = "America/Los_Angeles";
const express = require('express');
const app = express();
const fs = require("fs");
const md5 = require('md5');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const sharp = require('sharp');
sharp.cache(false);
const multer = require("multer");
const upload = multer({ dest: path.join(__dirname, "/public/upload") });
const dbconnection = require('./dbconnector');
var axios = require('axios');
const JWT_SECRET='some super secret...'
const recommendation_model_url=''
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(session({
    secret: "studymate.app",
    resave: false,
    saveUninitialized: false
}));

// fetch all exams, universities and courses
async function getInfo(params) {
    let sql = "";
    if (params.filter == "exams") {
        sql = "SELECT exam, abbr from `entrance_exams` WHERE is_active = 1 ORDER BY abbr";
    } else if (params.filter == "universities") {
        sql = "SELECT * from `universities` WHERE is_active = 1 ORDER BY university";
    } else if (params.filter == "degree_programs") {
        sql = "SELECT * from `degree_programs` WHERE is_active = 1 ORDER BY program";
    } else {
        sql = "SELECT * from `timezones` WHERE is_active = 1 ORDER BY abbr";
    }

    let result = await dbconnection.promise().query(sql);
    let status = { status: "success" };
    if (result) {
        result = Object.values(JSON.parse(JSON.stringify(result)));
        if (result.length > 0) {
            status['message'] = "data found";
            status['data'] = result[0];
        } else {
            status['message'] = "no data found";
            status['data'] = {};
        }
    }
    return status;
}

// fetch all student info various params such as for the given set of ids
async function fetchStudentData(params) {
    let sql = "SELECT * from `registered_user` JOIN `user_credentials` ON ru_id = reg_user_id ";
    if (Object.keys(params).length > 0) {
        sql += " WHERE is_active = 1 ";
        if (params.listOfIds.length > 0) {
            sql += " AND ru_id IN (" + params.listOfIds + ")";
        }
    }

    let result = await dbconnection.promise().query(sql);
    let status = { status: "success" };
    if (result) {
        result = Object.values(JSON.parse(JSON.stringify(result)));
        if (result.length > 0) {
            status['message'] = "data found";
            status['data'] = result[0];
        } else {
            status['message'] = "no data found";
            status['data'] = {};
        }
    }
    return status;
}

// check if user id is active & valid
async function checkIfUserActive(userId) {
    let sql = "SELECT email from `user_credentials` WHERE reg_user_id = " + userId + " and is_active = 1";
    let result = await dbconnection.promise().query(sql);
    let status = {};
    if (result) {
        result = Object.values(JSON.parse(JSON.stringify(result)));
        if (result[0].length > 0) {
            status['status'] = 'success';
            status['message'] = "User active";
            status['data'] = {};
        } else {
            status['status'] = 'failure';
            status['message'] = "Invalid student id or student account deactivated";
            status['data'] = {};
        }
    }
    return status;
}

// send study request to a user
async function sendUserStudyRequest(fromUser, toUser) { // create table pending for study request
    let sql = "SELECT id, from_user, to_user, request_status from `study_requests` WHERE (from_user = " + fromUser + " and to_user = " + toUser + ") OR (from_user = " + toUser + " and to_user = " + fromUser + ") AND request_status != 3";
    let result = await dbconnection.promise().query(sql);
    let status = {};
    if (result) {
        result = Object.values(JSON.parse(JSON.stringify(result)));
        if (result[0].length == 1) { // check status of requets if already present
            if (result[0][0].request_status == 1) {
                status['status'] = "failure";
                if (fromUser == result[0][0].from_user) {
                    status['message'] = "Already sent one request which is pending to get accepted from student";
                } else {
                    status['message'] = "This student has sent you a request. Please check study requests to accept";
                }
            } else if (result[0][0].request_status == 2) {
                status['status'] = "failure";
                status['message'] = "This student is already in your studymates list";
            } else {
                sql = "INSERT INTO `study_requests`(from_user, to_user, request_status) VALUES (" + fromUser + "," + toUser + ", 1)";// send study request
                status = await dbconnection.promise().query(sql, []).then(function (result) {
                    return { status: 'success', message: 'Study request sent' };
                }).catch(function (err) {
                    return { status: 'failure', message: err.message };
                });
            }
        } else if (result[0].length > 1) {
            status['status'] = "failure";
            status['message'] = "Cannot send requests to this user, contact site administrator";
        } else { // insert new request
            sql = "INSERT INTO `study_requests`(from_user, to_user, request_status) VALUES (" + fromUser + "," + toUser + ", 1)";// send study request
            status = await dbconnection.promise().query(sql, []).then(function (result) {
                return { status: 'success', message: 'Study request sent' };
            }).catch(function (err) {
                return { status: 'failure', message: err.message };
            });
        }
    }
    return status;
}

// destroy session / log-out user
function destroySession(req) {
    req.session.loggedIn = false;
    req.session.data = {};
    req.session.destroy((err) => { });
}

// load home page
app.get('/', function (req, res) {
    if (req.session.loggedIn) {
        res.render(path.join(__dirname, './public/html/index.ejs'), { activeClass: "home" });
    } else {
        res.render(path.join(__dirname, './public/html/index.ejs'), { activeClass: "home" });
    }
});

app.get('/log-in', function (req, res) {
    if (req.session.loggedIn) {
        const page_status = req.session.data.page_status;
        if (page_status == 0) {
            res.redirect('/basic-info');
        } else if (page_status == 1) {
            res.redirect('/academic-info');
        } else if (page_status == 2) {
            res.redirect('/study-criteria');
        } else {
            res.redirect('/study-mates');
            // res.redirect('/find-study-buddy');
        }
    }
    else {
        res.render(path.join(__dirname, './public/html/login.ejs'), { activeClass: "log-in" });
    }
});

app.get('/create-account', function (req, res) {
    res.render(path.join(__dirname, './public/html/register.ejs'), { activeClass: "create-account" });
});

app.get('/about-us', function (req, res) {
    res.render(path.join(__dirname, './public/html/aboutus.ejs'), { activeClass: "about-us" });
});

app.get('/contact-us', function (req, res) {
    res.render(path.join(__dirname, './public/html/contactus.ejs'), { activeClass: "contact-us" });
});

app.get('/study-mates', function (req, res) {
    if (req.session.loggedIn) {
        let data = {
            activeClass: "profile",
            subClass: "studymates",
            user_id: req.session.data.user_id,
            name: req.session.data.name,
            allStudyMates: {}
        };
        sql = "SELECT registered_user.ru_id, registered_user.name from `registered_user` JOIN user_credentials ON reg_user_id = ru_id WHERE is_active = 1 AND ru_id IN(SELECT mate1 from `study_mates` WHERE mate2 = " + data.user_id + " AND is_deleted = 0 UNION SELECT mate2  from `study_mates` WHERE mate1 = " + data.user_id + " AND is_deleted = 0) ORDER BY name";
        dbconnection.query(sql, (err, result) => {
            if (err) {
                data.status = 'failure';
                data.message = err;
            } else {
                if (result.length > 0) {
                    data.allStudyMates = result;
                } else {
                    data.status = 'success';
                    data.message = 'You dont have any study mates :(';
                }
            }
            res.render(path.join(__dirname, './public/html/studenthome.ejs'), data);
        });
    } else {
        res.redirect('/log-in');
    }
});

app.get('/study-requests', function (req, res) {
    if (req.session.loggedIn) {
        let data = {
            activeClass: "profile",
            subClass: "studyrequests",
            user_id: req.session.data.user_id,
            name: req.session.data.name,
            requestSent: {},
            requestReceived: {}
        };

        dbconnection.query('SELECT id, from_user, to_user, registered_user.name, registered_user.ru_id from study_requests JOIN registered_user ON to_user = ru_id where request_status = 1 AND from_user = ' + data.user_id, (err, result) => {
            if (err) {
                data['status'] = "failure";
                data['message'] = err;
            } else {
                data['status'] = "success";
                data['message'] = "Data fetched";
                if (result.length > 0) {
                    data.requestSent = result;
                }
                dbconnection.query('SELECT id, from_user, to_user, registered_user.name, registered_user.ru_id from study_requests JOIN registered_user ON from_user = ru_id where request_status = 1 AND to_user = ' + data.user_id, (err, result) => {
                    if (err) {
                        data['status'] = "failure";
                        data['message'] = err;
                    } else {
                        data['status'] = "success";
                        data['message'] = "Data fetched";
                        if (result.length > 0) {
                            data.requestReceived = result;
                        }
                    }
                    res.render(path.join(__dirname, './public/html/studentrequests.ejs'), data);
                });
            }
        });
    } else {
        res.redirect('/log-in');
    }
});

app.get('/basic-info', function (req, res) {
    if (req.session.loggedIn) {
        let data = {
            activeClass: "profile",
            subClass: "basicinfo",
            user_id: req.session.data.user_id,
            name: req.session.data.name
        };

        const fetchdata = "SELECT email, gender, phone, address, zipcode,is_basicinfo, status  from `registered_user` where ru_id = " + data.user_id;
        dbconnection.query(fetchdata, (err, result) => {
            if (err) {
                data['status'] = "failure";
                data['message'] = err;
            } else {
                data['status'] = "success";
                data['message'] = "Data fetched";
                data['email'] = result[0]['email'];
                data['gender'] = result[0]['gender'];
                data['phone'] = result[0]['phone'];
                data['address'] = result[0]['address'];
                data['zipcode'] = result[0]['zipcode'];
            }
            res.render(path.join(__dirname, './public/html/basicinfo.ejs'), data);
        });
    } else {
        res.redirect('/log-in');
    }
});

app.get('/academic-info', async function (req, res) {
    if (req.session.loggedIn) {
        const exams = await getInfo({ filter: "exams" });
        const universities = await getInfo({ filter: "universities" });
        const programs = await getInfo({ filter: "degree_programs" });
        const curryear = new Date().getFullYear();
        let data = {
            activeClass: "profile",
            subClass: "academicinfo",
            user_id: req.session.data.user_id,
            name: req.session.data.name,
            exam: exams.data,
            universities: universities.data,
            programs: programs.data,
            gyear: {
                0: curryear,
                1: curryear + 1,
                2: curryear + 2,
                3: curryear + 3,
                4: curryear + 4,
                5: curryear + 5
            }
        };

        const fetchdata = "SELECT exam_taking, university, degree, program, courses, gpa, graduating_year from `registered_user` where ru_id = " + data.user_id;
        dbconnection.query(fetchdata, (err, result) => {
            if (err) {
                data['status'] = "failure";
                data['message'] = err;
            } else {
                data['status'] = "success";
                data['message'] = "Data fetched";
                data['exam_taking'] = result[0]['exam_taking'].split(',');
                data['university'] = result[0]['university'];
                data['degree'] = result[0]['degree'];
                data['program'] = result[0]['program'];
                data['courses'] = result[0]['courses'];
                data['gpa'] = result[0]['gpa'];
                data['graduating_year'] = result[0]['graduating_year'];
            }
            // console.log(data);
            res.render(path.join(__dirname, './public/html/academicinfo.ejs'), data);
        });
    } else {
        res.redirect('/log-in');
    }
});

app.get('/study-criteria', async function (req, res) {
    if (req.session.loggedIn) {
        let timezone = await getInfo({ filter: "timezones" });
        timezone.data.unshift({
            timezone: '',
            abbr: 'Any',
            offset: '-'
        });
        let data = {
            activeClass: "profile",
            subClass: "studycriteria",
            user_id: req.session.data.user_id,
            name: req.session.data.name,
            genderarr: {
                0: 'Any',
                1: 'Male',
                2: 'Female',
                3: 'Other'
            },
            studymode: {
                0: 'Any',
                1: 'Online',
                2: 'Offline',
                3: 'Hybrid'
            },
            timezone: timezone.data
        };
        const fetchdata = "SELECT exam_taking, university, program, pref_gender, pref_timezone, pref_studymode, pref_exam, pref_university, pref_program, question1,  question2,  question3,  question4 from `registered_user` where ru_id = " + data.user_id;
        dbconnection.query(fetchdata, (err, result) => {
            if (err) {
                data['status'] = "failure";
                data['message'] = err;
            } else {
                data['status'] = "success";
                data['message'] = "Data fetched";
                data['pref_gender'] = result[0]['pref_gender'].split(',');
                data['pref_timezone'] = result[0]['pref_timezone'].split(',');
                data['pref_studymode'] = result[0]['pref_studymode'].split(',');
                data['pref_exam'] = result[0]['pref_exam'];
                data['pref_university'] = result[0]['pref_university'];
                data['pref_program'] = result[0]['pref_program'];
                data['exam_taking'] = result[0]['exam_taking'];
                data['university'] = result[0]['university'];
                data['program'] = result[0]['program'];
                data['question1'] = result[0]['question1'];
                data['question2'] = result[0]['question2'];
                data['question3'] = result[0]['question3'];
                data['question4'] = result[0]['question4'];
            }
            // console.log(data);   
            res.render(path.join(__dirname, './public/html/studycriteria.ejs'), data);
        });
    } else {
        res.redirect('/log-in');
    }
});

app.get('/account-settings', function (req, res) {
    if (req.session.loggedIn) {
        let data = {
            activeClass: "profile",
            subClass: "accsettings",
            user_id: req.session.data.user_id,
            name: req.session.data.name
        };
        res.render(path.join(__dirname, './public/html/accountsettings.ejs'), data);
    } else {
        res.redirect('/log-in');
    }
});

app.get('/view-student-profile/:userid', async function (req, res) {
    if (req.session.loggedIn) {
        let data = {
            activeClass: "profile",
            subClass: "studymates",
            user_id: req.session.data.user_id,
            name: req.session.data.name,
            studentInfo: {}
        };
        fetchStudentInfo = [req.params.userid];
        const studentInfo = await fetchStudentData({ 'listOfIds': fetchStudentInfo });
        data.status = studentInfo.status;
        data.message = studentInfo.message;
        data.studentInfo = studentInfo.data;
        res.render(path.join(__dirname, './public/html/studentprofile.ejs'), data);
    } else {
        res.redirect('/log-in');
    }
});

app.get('/find-study-buddy', async function (req, res) {
    if (req.session.loggedIn) {
        const exams = await getInfo({ filter: "exams" });
        const universities = await getInfo({ filter: "universities" });
        const programs = await getInfo({ filter: "degree_programs" });
        const timezone = await getInfo({ filter: "timezones" });
        let data = {
            activeClass: "studybuddy",
            user_id: req.session.data.user_id,
            name: req.session.data.name,
            email:req.session.data.email,
            exam: exams.data,
            universities: universities.data,
            programs: programs.data,
            timezone: timezone.data,
        };
        const filterapi=await axios.get(`http://127.0.0.1:5000/find-study-buddy?email=${data.email}`);
        //console.log(filterapi.data);
        result=filterapi.data
        let studentIds = result.map(({ Student_Id }) => Student_Id);
        //console.log(studentIds.slice(0,5));
        fetchStudentInfo = studentIds.slice(0,5);
        const ƒ = await fetchStudentData({ 'listOfIds': fetchStudentInfo });
        data.studentInfo = ƒ.data;
        //console.log(data)
        res.render(path.join(__dirname, './public/html/findstudybuddy.ejs'), data);
    } else {
        res.redirect('/log-in');
    }
});

app.get('/my-groups-messages', function (req, res) {
    if (req.session.loggedIn) {
        let data = {
            activeClass: "groupsmsg",
            user_id: req.session.data.user_id,
            name: req.session.data.name
        };
        res.render(path.join(__dirname, './public/html/mygroupsmessages.ejs'), data);
    } else {
        res.redirect('/log-in');
    }
});

// load logout page
app.get('/log-out', async function (req, res) {
    await destroySession(req)
    res.redirect('/');
});

app.get('/saveData', function (req, res) {

    const timezones = {
        "0": {
            "abbr": "GMT",
            "timezone": "Greenwich Mean Time",
            "offset": "UTC"
        },
        "1": {
            "abbr": "IBST",
            "timezone": "International Business Standard Time",
            "offset": "UTC"
        },
        "2": {
            "abbr": "WET",
            "timezone": "Western European Time",
            "offset": "UTC"
        },
        "3": {
            "abbr": "Z",
            "timezone": "Zulu Time (Coordinated Universal Time)",
            "offset": "UTC"
        },
        "4": {
            "abbr": "EGST",
            "timezone": "Eastern Greenland Summer Time",
            "offset": "UTC+00"
        },
        "5": {
            "abbr": "BST",
            "timezone": "British Summer Time",
            "offset": "UTC+01"
        },
        "6": {
            "abbr": "CET",
            "timezone": "Central European Time",
            "offset": "UTC+01"
        },
        "7": {
            "abbr": "DFT",
            "timezone": "AIX specific equivalent of Central European Time",
            "offset": "UTC+01"
        },
        "8": {
            "abbr": "IST",
            "timezone": "Irish Standard Time",
            "offset": "UTC+01"
        },
        "9": {
            "abbr": "MET",
            "timezone": "Middle European Time Same zone as CET",
            "offset": "UTC+01"
        },
        "10": {
            "abbr": "WAT",
            "timezone": "West Africa Time",
            "offset": "UTC+01"
        },
        "11": {
            "abbr": "WEDT",
            "timezone": "Western European Daylight Time",
            "offset": "UTC+01"
        },
        "12": {
            "abbr": "WEST",
            "timezone": "Western European Summer Time",
            "offset": "UTC+01"
        },
        "13": {
            "abbr": "CAT",
            "timezone": "Central Africa Time",
            "offset": "UTC+02"
        },
        "14": {
            "abbr": "CEDT",
            "timezone": "Central European Daylight Time",
            "offset": "UTC+02"
        },
        "15": {
            "abbr": "CEST",
            "timezone": "Central European Summer Time",
            "offset": "UTC+02"
        },
        "16": {
            "abbr": "EET",
            "timezone": "Eastern European Time",
            "offset": "UTC+02"
        },
        "17": {
            "abbr": "HAEC",
            "timezone": "Heure Avancée d Europe Centrale francised name for CEST",
            "offset": "UTC+02"
        },
        "18": {
            "abbr": "IST Israel",
            "timezone": "Israel Standard Time",
            "offset": "UTC+02"
        },
        "19": {
            "abbr": "MEST",
            "timezone": "Middle European Summer Time Same zone as CEST",
            "offset": "UTC+02"
        },
        "20": {
            "abbr": "SAST",
            "timezone": "South African Standard Time",
            "offset": "UTC+02"
        },
        "21": {
            "abbr": "USZ1",
            "timezone": "Kaliningrad Time",
            "offset": "UTC+02"
        },
        "22": {
            "abbr": "WAST",
            "timezone": "West Africa Summer Time",
            "offset": "UTC+02"
        },
        "23": {
            "abbr": "AST Arabia",
            "timezone": "Arabia Standard Time",
            "offset": "UTC+03"
        },
        "24": {
            "abbr": "EAT",
            "timezone": "East Africa Time",
            "offset": "UTC+03"
        },
        "25": {
            "abbr": "EEDT",
            "timezone": "Eastern European Daylight Time",
            "offset": "UTC+03"
        },
        "26": {
            "abbr": "EEST",
            "timezone": "Eastern European Summer Time",
            "offset": "UTC+03"
        },
        "27": {
            "abbr": "FET",
            "timezone": "Further-eastern European Time",
            "offset": "UTC+03"
        },
        "28": {
            "abbr": "IDT",
            "timezone": "Israel Daylight Time",
            "offset": "UTC+03"
        },
        "29": {
            "abbr": "IOT",
            "timezone": "Indian Ocean Time",
            "offset": "UTC+03"
        },
        "30": {
            "abbr": "MSK",
            "timezone": "Moscow Time",
            "offset": "UTC+03"
        },
        "31": {
            "abbr": "SYOT",
            "timezone": "Showa Station Time",
            "offset": "UTC+03"
        },
        "32": {
            "abbr": "IRST",
            "timezone": "Iran Standard Time",
            "offset": "UTC+03:30"
        },
        "33": {
            "abbr": "AMT Armenia",
            "timezone": "Armenia Time",
            "offset": "UTC+04"
        },
        "34": {
            "abbr": "AZT",
            "timezone": "Azerbaijan Time",
            "offset": "UTC+04"
        },
        "35": {
            "abbr": "GET",
            "timezone": "Georgia Standard Time",
            "offset": "UTC+04"
        },
        "36": {
            "abbr": "GST Gulf",
            "timezone": "Gulf Standard Time",
            "offset": "UTC+04"
        },
        "37": {
            "abbr": "MUT",
            "timezone": "Mauritius Time",
            "offset": "UTC+04"
        },
        "38": {
            "abbr": "RET",
            "timezone": "Réunion Time",
            "offset": "UTC+04"
        },
        "39": {
            "abbr": "SAMT",
            "timezone": "Samara Time",
            "offset": "UTC+04"
        },
        "40": {
            "abbr": "SCT",
            "timezone": "Seychelles Time",
            "offset": "UTC+04"
        },
        "41": {
            "abbr": "VOLT",
            "timezone": "Volgograd Time",
            "offset": "UTC+04"
        },
        "42": {
            "abbr": "AFT",
            "timezone": "Afghanistan Time",
            "offset": "UTC+04:30"
        },
        "43": {
            "abbr": "IRDT",
            "timezone": "Iran Daylight Time",
            "offset": "UTC+04:30"
        },
        "44": {
            "abbr": "HMT",
            "timezone": "Heard and McDonald Islands Time",
            "offset": "UTC+05"
        },
        "45": {
            "abbr": "MAWT",
            "timezone": "Mawson Station Time",
            "offset": "UTC+05"
        },
        "46": {
            "abbr": "MVT",
            "timezone": "Maldives Time",
            "offset": "UTC+05"
        },
        "47": {
            "abbr": "ORAT",
            "timezone": "Oral Time",
            "offset": "UTC+05"
        },
        "48": {
            "abbr": "PKT",
            "timezone": "Pakistan Standard Time",
            "offset": "UTC+05"
        },
        "49": {
            "abbr": "TFT",
            "timezone": "Indian/Kerguelen",
            "offset": "UTC+05"
        },
        "50": {
            "abbr": "TJT",
            "timezone": "Tajikistan Time",
            "offset": "UTC+05"
        },
        "51": {
            "abbr": "TMT",
            "timezone": "Turkmenistan Time",
            "offset": "UTC+05"
        },
        "52": {
            "abbr": "UZT",
            "timezone": "Uzbekistan Time",
            "offset": "UTC+05"
        },
        "53": {
            "abbr": "YEKT",
            "timezone": "Yekaterinburg Time",
            "offset": "UTC+05"
        },
        "54": {
            "abbr": "IST Indian",
            "timezone": "Indian Standard Time",
            "offset": "UTC+05:30"
        },
        "55": {
            "abbr": "SLST",
            "timezone": "Sri Lanka Standard Time",
            "offset": "UTC+05:30"
        },
        "56": {
            "abbr": "NPT",
            "timezone": "Nepal Time",
            "offset": "UTC+05:45"
        },
        "57": {
            "abbr": "BDT Bangladesh",
            "timezone": "Bangladesh Daylight Time",
            "offset": "UTC+06"
        },
        "58": {
            "abbr": "BIOT",
            "timezone": "British Indian Ocean Time",
            "offset": "UTC+06"
        },
        "59": {
            "abbr": "BST Bangladesh",
            "timezone": "Bangladesh Standard Time",
            "offset": "UTC+06"
        },
        "60": {
            "abbr": "BTT",
            "timezone": "Bhutan Time",
            "offset": "UTC+06"
        },
        "61": {
            "abbr": "KGT",
            "timezone": "Kyrgyzstan time",
            "offset": "UTC+06"
        },
        "62": {
            "abbr": "OMST",
            "timezone": "Omsk Time",
            "offset": "UTC+06"
        },
        "63": {
            "abbr": "VOST",
            "timezone": "Vostok Station Time",
            "offset": "UTC+06"
        },
        "64": {
            "abbr": "CCT",
            "timezone": "Cocos Islands Time",
            "offset": "UTC+06:30"
        },
        "65": {
            "abbr": "MMT",
            "timezone": "Myanmar Time",
            "offset": "UTC+06:30"
        },
        "66": {
            "abbr": "MST Myanmar",
            "timezone": "Myanmar Standard Time",
            "offset": "UTC+06:30"
        },
        "67": {
            "abbr": "CXT",
            "timezone": "Christmas Island Time",
            "offset": "UTC+07"
        },
        "68": {
            "abbr": "DAVT",
            "timezone": "Davis Time",
            "offset": "UTC+07"
        },
        "69": {
            "abbr": "HOVT",
            "timezone": "Khovd Time",
            "offset": "UTC+07"
        },
        "70": {
            "abbr": "ICT",
            "timezone": "Indochina Time",
            "offset": "UTC+07"
        },
        "71": {
            "abbr": "KRAT",
            "timezone": "Krasnoyarsk Time",
            "offset": "UTC+07"
        },
        "72": {
            "abbr": "THA",
            "timezone": "Thailand Standard Time",
            "offset": "UTC+07"
        },
        "73": {
            "abbr": "WIT",
            "timezone": "Western Indonesian Time",
            "offset": "UTC+07"
        },
        "74": {
            "abbr": "ACT",
            "timezone": "ASEAN Common Time",
            "offset": "UTC+08"
        },
        "75": {
            "abbr": "AWST",
            "timezone": "Australian Western Standard Time",
            "offset": "UTC+08"
        },
        "76": {
            "abbr": "BDT",
            "timezone": "Brunei Time",
            "offset": "UTC+08"
        },
        "77": {
            "abbr": "CHOT",
            "timezone": "Choibalsan",
            "offset": "UTC+08"
        },
        "78": {
            "abbr": "CIT",
            "timezone": "Central Indonesia Time",
            "offset": "UTC+08"
        },
        "79": {
            "abbr": "CST China",
            "timezone": "China Standard Time",
            "offset": "UTC+08"
        },
        "80": {
            "abbr": "CT",
            "timezone": "China time",
            "offset": "UTC+08"
        },
        "81": {
            "abbr": "HKT",
            "timezone": "Hong Kong Time",
            "offset": "UTC+08"
        },
        "82": {
            "abbr": "IRKT",
            "timezone": "Irkutsk Time",
            "offset": "UTC+08"
        },
        "83": {
            "abbr": "MST Malaysia",
            "timezone": "Malaysia Standard Time",
            "offset": "UTC+08"
        },
        "84": {
            "abbr": "MYT",
            "timezone": "Malaysia Time",
            "offset": "UTC+08"
        },
        "85": {
            "abbr": "PST Philippine",
            "timezone": "Philippine Standard Time",
            "offset": "UTC+08"
        },
        "86": {
            "abbr": "SGT",
            "timezone": "Singapore Time",
            "offset": "UTC+08"
        },
        "87": {
            "abbr": "SST",
            "timezone": "Singapore Standard Time",
            "offset": "UTC+08"
        },
        "88": {
            "abbr": "ULAT",
            "timezone": "Ulaanbaatar Time",
            "offset": "UTC+08"
        },
        "89": {
            "abbr": "WST",
            "timezone": "Western Standard Time",
            "offset": "UTC+08"
        },
        "90": {
            "abbr": "CWST",
            "timezone": "Central Western Standard Time (Australia)",
            "offset": "UTC+08:45"
        },
        "91": {
            "abbr": "AWDT",
            "timezone": "Australian Western Daylight Time",
            "offset": "UTC+09"
        },
        "92": {
            "abbr": "EIT",
            "timezone": "Eastern Indonesian Time",
            "offset": "UTC+09"
        },
        "93": {
            "abbr": "JST",
            "timezone": "Japan Standard Time",
            "offset": "UTC+09"
        },
        "94": {
            "abbr": "KST",
            "timezone": "Korea Standard Time",
            "offset": "UTC+09"
        },
        "95": {
            "abbr": "TLT",
            "timezone": "Timor Leste Time",
            "offset": "UTC+09"
        },
        "96": {
            "abbr": "YAKT",
            "timezone": "Yakutsk Time",
            "offset": "UTC+09"
        },
        "97": {
            "abbr": "ACST",
            "timezone": "Australian Central Standard Time",
            "offset": "UTC+09:30"
        },
        "98": {
            "abbr": "CST Australia Central",
            "timezone": "Central Standard Time (Australia)",
            "offset": "UTC+09:30"
        },
        "99": {
            "abbr": "AEST",
            "timezone": "Australian Eastern Standard Time",
            "offset": "UTC+10"
        },
        "100": {
            "abbr": "ChST",
            "timezone": "Chamorro Standard Time",
            "offset": "UTC+10"
        },
        "101": {
            "abbr": "CHUT",
            "timezone": "Chuuk Time",
            "offset": "UTC+10"
        },
        "102": {
            "abbr": "DDUT",
            "timezone": "Dumont d Urville Time",
            "offset": "UTC+10"
        },
        "103": {
            "abbr": "EST Australia",
            "timezone": "Eastern Standard Time (Australia)",
            "offset": "UTC+10"
        },
        "104": {
            "abbr": "PGT",
            "timezone": "Papua New Guinea Time",
            "offset": "UTC+10"
        },
        "105": {
            "abbr": "VLAT",
            "timezone": "Vladivostok Time",
            "offset": "UTC+10"
        },
        "106": {
            "abbr": "ACDT",
            "timezone": "Australian Central Daylight Savings Time",
            "offset": "UTC+10:30"
        },
        "107": {
            "abbr": "CST Australia Central Summer",
            "timezone": "Central Summer Time (Australia)",
            "offset": "UTC+10:30"
        },
        "108": {
            "abbr": "LHST",
            "timezone": "Lord Howe Standard Time",
            "offset": "UTC+10:30"
        },
        "109": {
            "abbr": "AEDT",
            "timezone": "Australian Eastern Daylight Savings Time",
            "offset": "UTC+11"
        },
        "110": {
            "abbr": "BST Bougainville",
            "timezone": "Bougainville Standard Time",
            "offset": "UTC+11"
        },
        "111": {
            "abbr": "KOST",
            "timezone": "Kosrae Time",
            "offset": "UTC+11"
        },
        "112": {
            "abbr": "LHST Lord Howe Summer",
            "timezone": "Lord Howe Summer Time",
            "offset": "UTC+11"
        },
        "113": {
            "abbr": "MIST",
            "timezone": "Macquarie Island Station Time",
            "offset": "UTC+11"
        },
        "114": {
            "abbr": "NCT",
            "timezone": "New Caledonia Time",
            "offset": "UTC+11"
        },
        "115": {
            "abbr": "PONT",
            "timezone": "Pohnpei Standard Time",
            "offset": "UTC+11"
        },
        "116": {
            "abbr": "SAKT",
            "timezone": "Sakhalin Island time",
            "offset": "UTC+11"
        },
        "117": {
            "abbr": "SBT",
            "timezone": "Solomon Islands Time",
            "offset": "UTC+11"
        },
        "118": {
            "abbr": "SRET",
            "timezone": "Srednekolymsk Time",
            "offset": "UTC+11"
        },
        "119": {
            "abbr": "VUT",
            "timezone": "Vanuatu Time",
            "offset": "UTC+11"
        },
        "120": {
            "abbr": "NFT",
            "timezone": "Norfolk Time",
            "offset": "UTC+11:00"
        },
        "121": {
            "abbr": "FJT",
            "timezone": "Fiji Time",
            "offset": "UTC+12"
        },
        "122": {
            "abbr": "GILT",
            "timezone": "Gilbert Island Time",
            "offset": "UTC+12"
        },
        "123": {
            "abbr": "MAGT",
            "timezone": "Magadan Time",
            "offset": "UTC+12"
        },
        "124": {
            "abbr": "MHT",
            "timezone": "Marshall Islands",
            "offset": "UTC+12"
        },
        "125": {
            "abbr": "NZST",
            "timezone": "New Zealand Standard Time",
            "offset": "UTC+12"
        },
        "126": {
            "abbr": "PETT",
            "timezone": "Kamchatka Time",
            "offset": "UTC+12"
        },
        "127": {
            "abbr": "TVT",
            "timezone": "Tuvalu Time",
            "offset": "UTC+12"
        },
        "128": {
            "abbr": "WAKT",
            "timezone": "Wake Island Time",
            "offset": "UTC+12"
        },
        "129": {
            "abbr": "CHAST",
            "timezone": "Chatham Standard Time",
            "offset": "UTC+12:45"
        },
        "130": {
            "abbr": "NZDT",
            "timezone": "New Zealand Daylight Time",
            "offset": "UTC+13"
        },
        "131": {
            "abbr": "PHOT",
            "timezone": "Phoenix Island Time",
            "offset": "UTC+13"
        },
        "132": {
            "abbr": "TKT",
            "timezone": "Tokelau Time",
            "offset": "UTC+13"
        },
        "133": {
            "abbr": "TOT",
            "timezone": "Tonga Time",
            "offset": "UTC+13"
        },
        "134": {
            "abbr": "CHADT",
            "timezone": "Chatham Daylight Time",
            "offset": "UTC+13:45"
        },
        "135": {
            "abbr": "LINT",
            "timezone": "Line Islands Time",
            "offset": "UTC+14"
        },
        "136": {
            "abbr": "AZOST",
            "timezone": "Azores Standard Time",
            "offset": "UTC-01"
        },
        "137": {
            "abbr": "CVT",
            "timezone": "Cape Verde Time",
            "offset": "UTC-01"
        },
        "138": {
            "abbr": "EGT",
            "timezone": "Eastern Greenland Time",
            "offset": "UTC-01"
        },
        "139": {
            "abbr": "BRST",
            "timezone": "Brasilia Summer Time",
            "offset": "UTC-02"
        },
        "140": {
            "abbr": "FNT",
            "timezone": "Fernando de Noronha Time",
            "offset": "UTC-02"
        },
        "141": {
            "abbr": "GST",
            "timezone": "South Georgia and the South Sandwich Islands",
            "offset": "UTC-02"
        },
        "142": {
            "abbr": "PMDT",
            "timezone": "Saint Pierre and Miquelon Daylight time",
            "offset": "UTC-02"
        },
        "143": {
            "abbr": "UYST",
            "timezone": "Uruguay Summer Time",
            "offset": "UTC-02"
        },
        "144": {
            "abbr": "NDT",
            "timezone": "Newfoundland Daylight Time",
            "offset": "UTC-02:30"
        },
        "145": {
            "abbr": "ADT",
            "timezone": "Atlantic Daylight Time",
            "offset": "UTC-03"
        },
        "146": {
            "abbr": "AMST",
            "timezone": "Amazon Summer Time (Brazil)",
            "offset": "UTC-03"
        },
        "147": {
            "abbr": "ART",
            "timezone": "Argentina Time",
            "offset": "UTC-03"
        },
        "148": {
            "abbr": "BRT",
            "timezone": "Brasilia Time",
            "offset": "UTC-03"
        },
        "149": {
            "abbr": "CLST",
            "timezone": "Chile Summer Time",
            "offset": "UTC-03"
        },
        "150": {
            "abbr": "FKST",
            "timezone": "Falkland Islands Standard Time",
            "offset": "UTC-03"
        },
        "151": {
            "abbr": "FKST Falkland Islands Summer",
            "timezone": "Falkland Islands Summer Time",
            "offset": "UTC-03"
        },
        "152": {
            "abbr": "GFT",
            "timezone": "French Guiana Time",
            "offset": "UTC-03"
        },
        "153": {
            "abbr": "PMST",
            "timezone": "Saint Pierre and Miquelon Standard Time",
            "offset": "UTC-03"
        },
        "154": {
            "abbr": "PYST",
            "timezone": "Paraguay Summer Time (South America)",
            "offset": "UTC-03"
        },
        "155": {
            "abbr": "ROTT",
            "timezone": "Rothera Research Station Time",
            "offset": "UTC-03"
        },
        "156": {
            "abbr": "SRT",
            "timezone": "Suriname Time",
            "offset": "UTC-03"
        },
        "157": {
            "abbr": "UYT",
            "timezone": "Uruguay Standard Time",
            "offset": "UTC-03"
        },
        "158": {
            "abbr": "NST",
            "timezone": "Newfoundland Standard Time",
            "offset": "UTC-03:30"
        },
        "159": {
            "abbr": "NT",
            "timezone": "Newfoundland Time",
            "offset": "UTC-03:30"
        },
        "160": {
            "abbr": "AMT",
            "timezone": "Amazon Time (Brazil)",
            "offset": "UTC-04"
        },
        "161": {
            "abbr": "AST",
            "timezone": "Atlantic Standard Time",
            "offset": "UTC-04"
        },
        "162": {
            "abbr": "BOT",
            "timezone": "Bolivia Time",
            "offset": "UTC-04"
        },
        "163": {
            "abbr": "CDT Cuba",
            "timezone": "Cuba Daylight Time",
            "offset": "UTC-04"
        },
        "164": {
            "abbr": "CLT",
            "timezone": "Chile Standard Time",
            "offset": "UTC-04"
        },
        "165": {
            "abbr": "COST",
            "timezone": "Colombia Summer Time",
            "offset": "UTC-04"
        },
        "166": {
            "abbr": "ECT",
            "timezone": "Eastern Caribbean Time",
            "offset": "UTC-04"
        },
        "167": {
            "abbr": "EDT",
            "timezone": "Eastern Daylight Time (North America)",
            "offset": "UTC-04"
        },
        "168": {
            "abbr": "FKT",
            "timezone": "Falkland Islands Time",
            "offset": "UTC-04"
        },
        "169": {
            "abbr": "GYT",
            "timezone": "Guyana Time",
            "offset": "UTC-04"
        },
        "170": {
            "abbr": "PYT",
            "timezone": "Paraguay Time (South America)",
            "offset": "UTC-04"
        },
        "171": {
            "abbr": "VET",
            "timezone": "Venezuelan Standard Time",
            "offset": "UTC-04:30"
        },
        "172": {
            "abbr": "ACT Acre",
            "timezone": "Acre Time",
            "offset": "UTC-05"
        },
        "173": {
            "abbr": "CDT",
            "timezone": "Central Daylight Time (North America)",
            "offset": "UTC-05"
        },
        "174": {
            "abbr": "COT",
            "timezone": "Colombia Time",
            "offset": "UTC-05"
        },
        "175": {
            "abbr": "CST Cuba",
            "timezone": "Cuba Standard Time",
            "offset": "UTC-05"
        },
        "176": {
            "abbr": "EASST",
            "timezone": "Easter Island Standard Summer Time",
            "offset": "UTC-05"
        },
        "177": {
            "abbr": "ECT Ecuador",
            "timezone": "Ecuador Time",
            "offset": "UTC-05"
        },
        "178": {
            "abbr": "EST",
            "timezone": "Eastern Standard Time (North America)",
            "offset": "UTC-05"
        },
        "179": {
            "abbr": "PET",
            "timezone": "Peru Time",
            "offset": "UTC-05"
        },
        "180": {
            "abbr": "CST",
            "timezone": "Central Standard Time (North America)",
            "offset": "UTC-06"
        },
        "181": {
            "abbr": "EAST",
            "timezone": "Easter Island Standard Time",
            "offset": "UTC-06"
        },
        "182": {
            "abbr": "GALT",
            "timezone": "Galapagos Time",
            "offset": "UTC-06"
        },
        "183": {
            "abbr": "MDT",
            "timezone": "Mountain Daylight Time (North America)",
            "offset": "UTC-06"
        },
        "184": {
            "abbr": "MST",
            "timezone": "Mountain Standard Time (North America)",
            "offset": "UTC-07"
        },
        "185": {
            "abbr": "PDT",
            "timezone": "Pacific Daylight Time (North America)",
            "offset": "UTC-07"
        },
        "186": {
            "abbr": "AKDT",
            "timezone": "Alaska Daylight Time",
            "offset": "UTC-08"
        },
        "187": {
            "abbr": "CIST",
            "timezone": "Clipperton Island Standard Time",
            "offset": "UTC-08"
        },
        "188": {
            "abbr": "PST",
            "timezone": "Pacific Standard Time (North America)",
            "offset": "UTC-08"
        },
        "189": {
            "abbr": "AKST",
            "timezone": "Alaska Standard Time",
            "offset": "UTC-09"
        },
        "190": {
            "abbr": "GAMT",
            "timezone": "Gambier Islands",
            "offset": "UTC-09"
        },
        "191": {
            "abbr": "GIT",
            "timezone": "Gambier Island Time",
            "offset": "UTC-09"
        },
        "192": {
            "abbr": "HADT",
            "timezone": "Hawaii-Aleutian Daylight Time",
            "offset": "UTC-09"
        },
        "193": {
            "abbr": "MART",
            "timezone": "Marquesas Islands Time",
            "offset": "UTC-09:30"
        },
        "194": {
            "abbr": "MIT",
            "timezone": "Marquesas Islands Time",
            "offset": "UTC-09:30"
        },
        "195": {
            "abbr": "CKT",
            "timezone": "Cook Island Time",
            "offset": "UTC-10"
        },
        "196": {
            "abbr": "HAST",
            "timezone": "Hawaii-Aleutian Standard Time",
            "offset": "UTC-10"
        },
        "197": {
            "abbr": "HST",
            "timezone": "Hawaii Standard Time",
            "offset": "UTC-10"
        },
        "198": {
            "abbr": "TAHT",
            "timezone": "Tahiti Time",
            "offset": "UTC-10"
        },
        "199": {
            "abbr": "NUT",
            "timezone": "Niue Time",
            "offset": "UTC-11"
        },
        "200": {
            "abbr": "SST Samoa",
            "timezone": "Samoa Standard Time",
            "offset": "UTC-11"
        },
        "201": {
            "abbr": "BIT",
            "timezone": "Baker Island Time",
            "offset": "UTC-12"
        }
    }

    let actquerry = "INSERT INTO `timezones` (abbr, timezone, offset) VALUES ";
    let size = Object.keys(timezones).length - 1;
    for (let idx in timezones) {
        if (size == 0) {
            actquerry += "('" + timezones[idx]['abbr'] + "', '" + timezones[idx]['timezone'] + "', '" + timezones[idx]['offset'] + "')";
        } else {
            actquerry += "('" + timezones[idx]['abbr'] + "', '" + timezones[idx]['timezone'] + "', '" + timezones[idx]['offset'] + "'),";
            size--;
        }
    }
    dbconnection.query(actquerry, (err, result) => {
        if (err) {
            res.send({ status: "failure", message: err });
        } else {
            res.send({ status: "success", message: "Data inserted" });
        }
    });
});

// APIs

// Register a user
app.post('/registerUser', urlencodedParser, function (req, res) {
    const checkisuserexists = "SELECT * from `registered_user` where email = '" + req.body.email + "'";
    dbconnection.query(checkisuserexists, (err, res1) => {
        if (err) {
            res.send({ status: "failure", message: err, data: {} });
        } else {
            if (res1.length > 0) {
                res.send({ status: "failure", message: "User already exists", data: {} });
            } else {
                const sql = "INSERT INTO `registered_user`(email, name, gender, phone, address, zipcode, status) VALUES ('" + req.body.email + "','" + req.body.name + "','" + req.body.gender + "','" + req.body.phone + "','" + req.body.address + "'," + req.body.zipcode + ", 1)"; // basic info provided
                dbconnection.query(sql, (err, result) => {
                    if (err) {
                        res.send({ status: "failure", message: err, data: {} });
                    } else {
                        const sql2 = "INSERT INTO `user_credentials`(reg_user_id, email, password) VALUES (" + result.insertId + ",'" + req.body.email + "','" + md5(req.body.password) + "');";
                        dbconnection.query(sql2, (err2, result2) => {

                            if (err2) {
                                res.send({ status: "failure", message: err2, data: {} });
                            } else {
                                fs.readFile(path.join(__dirname, './public/assets/images/userProfile/' + req.body.gender.toLowerCase() + '.jpg'), function (err, data) {
                                    if (err) {
                                        res.send({ status: "failure", message: "User Registered but cannot create profile picture. Log in to find study buddies and more!", data: {} });
                                    } else {
                                        fs.writeFile(path.join(__dirname, './public/assets/images/userProfile/' + result.insertId + '.jpg'), data, function (err) {
                                            if (err) {
                                                res.send({ status: "failure", message: "User Registered but cannot create profile picture. Log in to find study buddies and more!", data: {} });
                                            } else {
                                                res.send({ status: "success", message: "User Registered. Log in to find study buddies and more!", data: {} });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }
    });
});

// Login to the app
app.post('/loginAPI', urlencodedParser, function (req, res) {
    //get username and password
    const email = req.body.email;
    const password = md5(req.body.password);
    function checkuserExists() {
        const checkisuserexists = "SELECT user_credentials.*, name, status from user_credentials join registered_user on registered_user.ru_id = user_credentials.reg_user_id where user_credentials.email = '" + email + "'";
        return new Promise(resolve => {
            dbconnection.query(checkisuserexists, (err, res1) => {
                if (err) {
                    res.send({ status: "failure", message: err, data: {} });
                } else {
                    resolve(res1);
                }
            });
        });
    }
    checkuserExists().then(res1 => {
        return new Promise(resolve => {
            if (res1.length == 0) {
                res.send({ status: "failure", message: "User does not exists", data: {} });
            } else if (res1.length == 1) {
                if (res1[0].is_active == 0) {
                    res.send({ status: "failure", message: "User account deactivated. Contact admin to activate account!", data: {} });
                } else if (res1[0].password == password) {
                    resolve(res1);
                } else {
                    res.send({ status: "failure", message: "Incorrect password", data: {} });
                }
            } else {
                res.send({ status: "failure", message: "Multiple users found. Please contact site administrator", data: {} });
            }
        });
    }).then(data => {
        return new Promise(resolve => {
            if (data.length > 0) {
                req.session.loggedIn = true;
                req.session.data = {
                    name: data[0]['name'],
                    email: data[0]['email'],
                    user_id: data[0]['reg_user_id'],
                    page_status: data[0]['status']
                };
                req.session.save(function (err) {
                    if (err) {
                        resolve("failure");
                    } else {
                        resolve("success");
                    }
                });
            } else {
                resolve("failure");
            }
        });
    }).then(status => {
        // console.log(req.session.data);
        if (status == "success") {
            res.send({ status: "success", message: "Log in successful", data: {} });
        } else {
            res.send({ status: "failure", message: "No user data found", data: {} });
        }
    });
});

// submit user query - contect us
app.post('/submitUserQuery', urlencodedParser, function (req, res) {
    const sql = "INSERT INTO `contactus`(name, email, phone, query) VALUES ('" + req.body.email + "','" + req.body.name + "','" + req.body.phone + "','" + req.body.query + "')";
    dbconnection.query(sql, (err, result) => {
        if (err) {
            res.send({ status: "failure", message: err, data: {} });
        } else {
            res.send({ status: "success", message: "Thank you for your query. We will get back to you soon!", data: {} });
        }
    });
});

// update basic info
app.post('/updateBasicInfo', urlencodedParser, function (req, res) {
    if (req.session.loggedIn) {
        let sql = "UPDATE `registered_user` SET name = '" + req.body.name + "', gender ='" + req.body.gender + "', phone ='" + req.body.phone + "', address = '" + req.body.address + "', zipcode = '" + req.body.zipcode + "', is_basicinfo = 1, date_updated = NOW()";
        if (req.session.data.page_status == 0) {
            sql += " , status = 1";
            req.session.data.status = 1;
        }
        sql += " WHERE ru_id = " + req.session.data.user_id;
        dbconnection.query(sql, (err, result) => {
            if (err) {
                res.send({ status: "failure", message: err, data: {} });
            } else {
                // console.log(req.session.data);
                res.send({ status: "success", message: "Basic information updated!!!", data: {} });
            }
        });
    } else {
        res.send({ status: "failure", message: "Please log in update basic information", data: {} });
    }
});

// update profile picture
app.post('/updateProfilePicture', upload.single("picture"), function (req, res) {
    if (req.session.loggedIn) {
        if (req.file) {
            const source_file = req.file.path;
            const dest_dir = path.join(__dirname, "/public/assets/images/userProfile");
            const dest_file = path.join(
                __dirname,
                "/public/assets/images/userProfile",
                req.session.data.user_id + "-og.jpg"
            );
            fs.exists(dest_dir, function (exists) {
                if (exists) {
                    fs.rename(source_file, dest_file, function (err) {
                        if (err) {
                            res.send({ status: "failure", message: "fail to update profile", data: err });
                        } else {
                            //res.send({ status: "success", message: "profile picture updated", data: '' });
                            sharp(dest_file).resize({ height: 300, width: 300 }).toFile(path.join(
                                __dirname,
                                "/public/assets/images/userProfile",
                                req.session.data.user_id + ".jpg"
                            ), (err, info) => {
                                if (err) {
                                    res.send({ status: "failure", message: "fail to resize profile", data: err });
                                } else {
                                    fs.unlinkSync(dest_file);
                                    res.send({ status: "success", message: "profile picture updated", data: '' });
                                }
                            });
                        }
                    });
                } else {
                    fs.mkdir(dest_dir, 0777, function (err) {
                        if (err) {
                            res.send({ status: "failure", message: "fail to update profile", data: err });
                        } else {
                            fs.rename(source_file, dest_file, function (err) {
                                if (err) {
                                    res.send({ status: "failure", message: "fail to update profile", data: err });
                                } else {
                                    res.send({ status: "success", message: "profile picture updated", data: '' });
                                    sharp(dest_file).resize({ height: 300, width: 300 }).toFile(path.join(
                                        __dirname,
                                        "/public/assets/images/userProfile",
                                        req.session.data.user_id + ".jpg"
                                    ), (err, info) => {
                                        if (err) {
                                            res.send({ status: "failure", message: "fail to resize profile", data: err });
                                        } else {
                                            fs.unlinkSync(dest_file);
                                            res.send({ status: "success", message: "profile picture updated", data: '' });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        } else {
            res.send({ status: "failure", message: "Image not found", data: {} });
        }
    } else {
        res.send({ status: "failure", message: "Please log in update basic information", data: {} });
    }
});

// update academic info
app.post('/updateAcademicInfo', urlencodedParser, function (req, res) {
    if (req.session.loggedIn) {
        // console.log(req.body);
        let exams = '';
        if (req.body['exams[]'] && req.body['exams[]'].length > 0) {
            if (typeof req.body['exams[]'] == 'object') {
                for (let name in req.body['exams[]']) {
                    exams += ',' + req.body['exams[]'][name];
                }
                exams = exams.replace(',', '');
            } else {
                exams = req.body['exams[]'];
            }
        }
        let sql = "UPDATE `registered_user` SET exam_taking = '" + exams + "', university ='" + req.body.university + "', degree ='" + req.body.degree + "', program = '" + req.body.program + "', courses = '', gpa = '" + req.body.gpa + "', graduating_year = '" + req.body.gyear + "', is_academicinfo = 1, date_updated = NOW()";
        if (req.session.data.page_status == 1) {
            sql += " , status = 2";
            req.session.data.status = 2;
        }
        if (exams != '') {
            sql += " , pref_exam = 'Any'";
        }
        if (req.body.university != '') {
            sql += " , pref_university = 'Any', pref_program = 'Any'";
        }
        if (req.body.program != '') {
            sql += ", pref_program = 'Any'";
        }
        sql += " WHERE ru_id = " + req.session.data.user_id;
        dbconnection.query(sql, (err, result) => {
            if (err) {
                res.send({ status: "failure", message: err, data: {} });
            } else {
                // console.log(req.session.data);
                res.send({ status: "success", message: "Academic information updated!!!", data: {} });
            }
        });
    } else {
        res.send({ status: "failure", message: "Please log in update academic information", data: {} });
    }
});

// update study preferences
app.post('/updateStudyPreference', urlencodedParser, function (req, res) {
    if (req.session.loggedIn) {
        // console.log(req.body);
        let gender = '';
        if (req.body['gender[]'] && req.body['gender[]'].length > 0) {
            if (typeof req.body['gender[]'] == 'object') {
                for (let name in req.body['gender[]']) {
                    gender += ',' + req.body['gender[]'][name];
                }
                gender = gender.replace(',', '');
            } else {
                gender = req.body['gender[]'];
            }
        }
        let timezone = '';
        if (req.body['timezone[]'] && req.body['timezone[]'].length > 0) {
            if (typeof req.body['timezone[]'] == 'object') {
                for (let name in req.body['timezone[]']) {
                    timezone += ',' + req.body['timezone[]'][name];
                }
                timezone = timezone.replace(',', '');
            } else {
                timezone = req.body['timezone[]'];
            }
        }
        let studymode = '';
        if (req.body['studymode[]'] && req.body['studymode[]'].length > 0) {
            if (typeof req.body['studymode[]'] == 'object') {
                for (let name in req.body['studymode[]']) {
                    studymode += ',' + req.body['studymode[]'][name];
                }
                studymode = studymode.replace(',', '');
            } else {
                studymode = req.body['studymode[]'];
            }
        }
        let sql = "UPDATE `registered_user` SET pref_gender = '" + gender + "', pref_timezone ='" + timezone + "', pref_studymode ='" + studymode + "', pref_program = '" + req.body.program + "', pref_university = '" + req.body.university + "', pref_exam = '" + req.body.exam + "', is_studypreferences = 1, date_updated = NOW()";
        if (req.session.data.page_status == 2) {
            sql += " , status = 3";
            req.session.data.status = 3;
        }
        sql += ", question1 = " + req.body.question1 + ", question2 = " + req.body.question2 + ", question3 = " + req.body.question3 + ", question4 = " + req.body.question4 + ", avgrating = " + ((parseInt(req.body.question1) + parseInt(req.body.question2) + parseInt(req.body.question3) + parseInt(req.body.question4)) / 4);
        sql += " WHERE ru_id = " + req.session.data.user_id;
        dbconnection.query(sql, (err, result) => {
            if (err) {
                res.send({ status: "failure", message: err, data: {} });
            } else {
                // console.log(req.session.data);
                res.send({ status: "success", message: "Study preferences updated!!!", data: {} });
            }
        });
    } else {
        res.send({ status: "failure", message: "Please log in update study preferences", data: {} });
    }
});

// update account settings - update password, deactivate/ delete account
app.post('/updateAccountSettings', urlencodedParser, function (req, res) {
    if (req.session.loggedIn) {
        if (req.body.type == 1) { //change password
            if (req.body.password1 != req.body.password2) {
                res.send({ status: "failure", message: "Password do not match", data: {} });
            } else {
                let sql = "UPDATE `user_credentials` SET password = '" + md5(req.body.password1) + "'";
                sql += " WHERE reg_user_id = " + req.session.data.user_id;
                dbconnection.query(sql, (err, result) => {
                    if (err) {
                        res.send({ status: "failure", message: err, data: {} });
                    } else {
                        res.send({ status: "success", message: "Password Updated", data: {} });
                    }
                });
            }
        } else if (req.body.type == 2) { //deactivate account
            let sql = "UPDATE `user_credentials` SET is_active = 0";
            sql += " WHERE reg_user_id = " + req.session.data.user_id;
            dbconnection.query(sql, async (err, result) => {
                if (err) {
                    res.send({ status: "failure", message: err, data: {} });
                } else {
                    await destroySession(req);
                    res.send({ status: "success", message: "Account deactivated", data: {} });
                }
            });
        } else if (req.body.type == 3) { // delete account

        } else { // incorrect option
            res.send({ status: "failure", message: "Please try again", data: {} });
        }
    } else {
        res.send({ status: "failure", message: "Please log in update study preferences", data: {} });
    }
});

// either sign up/ login user using google API
app.post('/googleLoginSignup', urlencodedParser, function (req, res) {
    const checkisuserexists = "SELECT user_credentials.*, name, status from user_credentials join registered_user on registered_user.ru_id = user_credentials.reg_user_id where user_credentials.email = '" + req.body.email + "'";
    dbconnection.query(checkisuserexists, (err, res1) => {
        if (err) {
            res.send({ status: "failure", message: err, data: {} });
        } else {
            if (res1.length > 0) {
                req.session.loggedIn = true;
                req.session.data = {
                    name: res1[0]['name'],
                    email: res1[0]['email'],
                    user_id: res1[0]['reg_user_id'],
                    page_status: res1[0]['status']
                };
                req.session.save(function (err) {
                    if (err) {
                        res.send({ status: "failure", message: err, data: {} });
                    } else {
                        res.send({ status: "success", message: err, data: {} });
                    }
                });
            } else {
                const sql = "INSERT INTO `registered_user`(email, name, is_basicinfo, status) VALUES ('" + req.body.email + "','" + req.body.name + "', 0, 0)"; // no user info available
                dbconnection.query(sql, (err, result) => {
                    if (err) {
                        res.send({ status: "failure", message: err, data: {} });
                    } else {
                        const sql2 = "INSERT INTO `user_credentials`(reg_user_id, email) VALUES (" + result.insertId + ",'" + req.body.email + "')";
                        dbconnection.query(sql2, (err2, result2) => {
                            if (err2) {
                                res.send({ status: "failure", message: err2, data: {} });
                            } else {
                                // console.log("image: " + req.body.image);
                                fs.readFile(path.join(__dirname, './public/assets/images/userProfile/other.jpg'), function (err, data) {
                                    if (err) {
                                        res.send({ status: "failure", message: "User Registered but cannot create profile picture.", data: {} });
                                    } else {
                                        fs.writeFile(path.join(__dirname, './public/assets/images/userProfile/' + result.insertId + '.jpg'), data, function (err) {
                                            if (err) {
                                                res.send({ status: "failure", message: "User Registered but cannot create profile picture.", data: {} });
                                            } else {
                                                res.send({ status: "success", message: "User Registered.", data: {} });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }
    });
});


app.get('/forgot-password',(req,res,next)=>{
    res.render('forgot-password')
})
app.post('/forgot-password',(req,res,next)=>{
    const {email} = req.body;
    if(email !=user.email){
        res.send("User not registered!");
        return;
    }
    const secret=JWT_SECRET + data.password
    const payload={
        email:data.email,
        id:data.id
    }
    const token=jwt.sign(payload,secret,{expiresIn:'15m'})
})
app.get('/reset-password',(req,res,next)=>{

})
app.post('/reset-password',(req,res,next)=>{

})

/* send reset password link in email */
app.post('/reset-password-email', function(req, res) {
 
    var email = req.body.email;
 
    //console.log(sendEmail(email, fullUrl));
    
    connection.query("SELECT user_credentials.* from user_credentials where user_credentials.email = '" + req.body.email + "'", function(err, result) {
        if (err) throw err;
        var type = ''
        var msg = ''
        console.log(result[0]);     
        if (result[0].email.length > 0) {
           var token = randtoken.generate(20);
           var sent = sendEmail(email, token);
             if (sent != '0') {
                var data = {
                    token: token
                }
                connection.query(  "UPDATE `user_credentials` SET ? WHERE email = '" + email + "'", data, function(err, result) {
                    if(err) throw err
                })
                type = 'success';
                msg = 'The reset password link has been sent to your email address';
            } else {
                type = 'error';
                msg = 'Something goes to wrong. Please try again';
            }
        } else {
            console.log('2');
            type = 'error';
            msg = 'The Email is not registered with us';
        }
        req.flash(type, msg);
        res.redirect('/');
    });
})

/* update password to database */
app.post('/update-password', function(req, res) {
    //var token = req.body.token;
    var password = req.body.password;
    connection.query('SELECT user_credentials.* from user_credentials where password ="' + password + '"', function(err, result) {
        if (err) throw err; 
        var type
        var msg
        if (result.length > 0) {                
              var saltRounds = 10;             
            bcrypt.genSalt(saltRounds, function(err, salt) {
                  bcrypt.hash(password, salt, function(err, hash) {
                   var data = {
                        password: hash
                    }
                    connection.query('UPDATE `user_credentials` SET ? WHERE email ="' + result[0].email + '"', data, function(err, result) {
                        if(err) throw err                   
                    }); 
                  });
              }); 
            type = 'success';
            msg = 'Your password has been updated successfully';              
        } else {
            console.log('2');
            type = 'success';
            msg = 'Invalid link; please try again'; 
            } 
        req.flash(type, msg);
        res.redirect('/');
    });
})

// fetch list of study partners based on user selected filters
app.post('/searchStudyPartner', urlencodedParser, async function (req, res) {
    if (req.session.loggedIn) {
            const exams = await getInfo({ filter: "exams" });
            const universities = await getInfo({ filter: "universities" });
            const programs = await getInfo({ filter: "degree_programs" });
            const timezone = await getInfo({ filter: "timezones" });
            let data = {
                activeClass: "studybuddy",
                user_id: req.session.data.user_id,
                name: req.session.data.name,
                email:req.session.data.email,
                exam: exams.data,
                universities: universities.data,
                programs: programs.data,
                timezone: timezone.data,
            };
            
            if (Object.keys(req.body).length > 0) {
            const filterarray={}
            if (req.body['gender[]'] && req.body['gender[]'].length > 0) { 
                filterarray["gender"]=req.body['gender[]']
            } else{
                filterarray["gender"]='None'
            }
            if (req.body['studymode[]'] && req.body['studymode[]'].length > 0) { 
                filterarray["studymode"]=req.body['studymode[]']

            } else{
                filterarray["studymode"]='None'
            }
            if (req.body['timezone[]'] && req.body['timezone[]'].length > 0) { 
                filterarray["timezone"]=req.body['timezone[]']
            } else{
                filterarray["timezone"]='None'
            }

            if (req.body['exam[]'] && req.body['exam[]'].length > 0) { 
                filterarray["exam"]=req.body['exam[]']
            } 
            else{
                filterarray["exam"]='None'
            }
            if (req.body['university[]'] && req.body['university[]'].length > 0) { 
                filterarray["university"]=req.body['university[]']
            } 
            else{
                filterarray["university"]='None'
            }
            if (req.body['program[]'] && req.body['program[]'].length > 0) { 
                filterarray["program"]=req.body['program[]']
            } 
            else{
                filterarray["program"]='None'
            }
            console.log(filterarray)
            const filterapi=await axios.get(`http://127.0.0.1:5000/find-study-buddy?email=${data.email}&${filterarray}`);
            //console.log(filterapi.data)
            let studentids=[]
            let result=filterapi.data
            
            

            let studentIds = result.map(({ Student_Id }) => Student_Id);
            fetchStudentInfo = studentIds;
            const studentInfo = await fetchStudentData({ 'listOfIds': fetchStudentInfo });
            res.send({ status: "success", message: "Data fetched", data: studentInfo });
        } else {
            res.send({ status: "failure", message: "Please select filters!!", data: {} });
        }
    } else {
        res.send({ status: "failure", message: "Please log in and search for study partner", data: {} });
    }
});

// send user study request
app.post('/sendUserRequest', urlencodedParser, async function (req, res) {
    if (req.session.loggedIn) {
        const userId = req.body.userId;
        if (userId > 0) {
            const curr = await checkIfUserActive(userId);
            if (curr.status == 'success') {
                const currStatus = await sendUserStudyRequest(req.session.data.user_id, userId);
                res.send({ status: currStatus.status, message: currStatus.message, data: {} });
            } else {
                res.send({ status: "failure", message: "Cannot send request since student has deactivated the account", data: {} });
            }
        } else {
            res.send({ status: "failure", message: "Invalid student request ", data: {} });
        }
    } else {
        res.send({ status: "failure", message: "Please log in and send study request", data: {} });
    }
});

// update study request status
app.post('/updateRequestStatus', urlencodedParser, async function (req, res) {
    if (req.session.loggedIn) {
        const reqid = req.body.reqid;
        const reqtype = req.body.type;
        if (reqtype == 1 || reqtype == 3) { // cancel -1  / reject -3 the request
            let sql = "UPDATE `study_requests` SET request_status = 3, date_updated = NOW() WHERE id = " + reqid;
            dbconnection.query(sql, (err, result) => {
                if (err) {
                    res.send({ status: "failure", message: err.message, data: {} });
                } else {
                    res.send({ status: "success", message: "Request canceled/rejected", data: {} });
                }
            });
        } else if (reqtype == 2) { // accept request
            const fromUser = req.body.fromUser;
            // check if they were study mates before, if not then insert else update existing row
            let sql = "SELECT id, is_deleted from `study_mates` WHERE (mate1 = " + req.session.data.user_id + " AND mate2 = " + fromUser + ") OR (mate1 = " + fromUser + " AND mate2 = " + req.session.data.user_id + ")";
            dbconnection.query(sql, async (err, result) => {
                if (err) {
                    res.send({ status: "failure", message: err });
                } else {
                    let status = {}
                    if (result.length == 1) { // update existing data
                        sql = "UPDATE `study_mates` SET is_deleted = 0 WHERE id = " + result[0].id;
                        status = await dbconnection.promise().query(sql, []).then(function (result) {
                            return { status: 'success', message: 'data updated' };
                        }).catch(function (err) {
                            return { status: 'failure', message: err.message };
                        });
                    } else if (result.length > 0) {
                        status = { status: 'failure', message: 'Please contact site admin to resolve this query' };
                    } else { // insert new data
                        sql = "INSERT INTO `study_mates`(mate1, mate2) VALUES (" + fromUser + "," + req.session.data.user_id + ")";
                        status = await dbconnection.promise().query(sql, []).then(function (result) {
                            return { status: 'success', message: 'data inserted' };
                        }).catch(function (err) {
                            return { status: 'failure', message: err.message };
                        });
                    }
                    if (status.status == 'failure') {
                        res.send(status);
                    } else {
                        sql = "UPDATE `study_requests` SET request_status = 2, date_updated = NOW() WHERE id = " + reqid;
                        dbconnection.query(sql, (err, result) => {
                            if (err) {
                                res.send({ status: 'failure', message: err.message });
                            } else {
                                res.send({ status: "success", message: "Request accepted", data: {} });
                            }
                        });
                    }
                }
            });
        } else if (reqtype == 4) { // remove from study mate list
            const removeUser = req.body.removeUser;
            let sql = "SELECT id, is_deleted from `study_mates` WHERE (mate1 = " + req.session.data.user_id + " AND mate2 = " + removeUser + ") OR (mate1 = " + removeUser + " AND mate2 = " + req.session.data.user_id + ")";
            dbconnection.query(sql, async (err, result) => {
                if (err) {
                    res.send({ status: "failure", message: err });
                } else {
                    let status = {}
                    if (result.length == 1) {
                        sql = "UPDATE `study_mates` SET is_deleted = 1 WHERE id = " + result[0].id;
                        status = await dbconnection.promise().query(sql, []).then(function (result) {
                            return { status: 'success', message: 'data updated' };
                        }).catch(function (err) {
                            return { status: 'failure', message: err.message };
                        });
                    } else if (result.length > 0) {
                        status = { status: 'failure', message: 'Please contact site admin to resolve this query' };
                    } else {
                        status = { status: 'failure', message: 'You cannot remove someone who is not your study mate' };
                    }
                    if (status.status == 'failure') {
                        res.send(status);
                    } else {
                        sql = "SELECT id from `study_requests` WHERE request_status = 2 AND (from_user = " + req.session.data.user_id + " AND to_user = " + removeUser + ") OR (from_user = " + removeUser + " AND to_user = " + req.session.data.user_id + ")";
                        dbconnection.query(sql, (err, result) => {
                            if (err) {
                                res.send({ status: 'failure', message: err.message });
                            } else {
                                if (result.length == 1) {
                                    sql = "UPDATE `study_requests` SET request_status = 3, date_updated = NOW() WHERE id = " + result[0].id;
                                    dbconnection.query(sql, (err, result) => {
                                        if (err) {
                                            res.send({ status: 'failure', message: err.message });
                                        } else {
                                            res.send({ status: "success", message: "Study Mate Removed", data: {} });
                                        }
                                    });
                                } else {
                                    res.send({ status: 'failure', message: 'Please contact site admin to resolve this query' });
                                }
                            }
                        });
                    }
                }
            });
        } else {
            res.send({ status: "failure", message: "Invalid request", data: {} });
        }
    } else {
        res.send({ status: "failure", message: "Please log in to take action for the request", data: {} });
    }
});

// send user message for first time
app.post('/sendFirstMessage', urlencodedParser, function (req, res) {
    if (req.session.loggedIn) {
        const touser = req.body.touser;
        const message = req.body.message;
        if (touser > 0 && message.length > 0) {
            if (touser == req.session.data.user_id) {
                res.send({ status: "failure", message: "You cannot send messsage to yourself", data: {} });
            } else {
                let sql = "", identifier = "";
                if (touser > req.session.data.user_id) {
                    identifier = req.session.data.user_id + ":" + touser;
                    sql = "INSERT INTO `user_messages` (from_user, to_user, identifier, message) VALUES (" + req.session.data.user_id + "," + touser + ", '" + identifier + "','" + message + "')";
                } else {
                    identifier = touser + ":" + req.session.data.user_id;
                    sql = "INSERT INTO `user_messages` (from_user, to_user, identifier, message) VALUES (" + req.session.data.user_id + "," + touser + ", '" + identifier + "','" + message + "')";
                }
                dbconnection.query(sql, (err, result) => {
                    if (err) {
                        res.send({ status: "failure", message: err, data: {} });
                    } else {
                        res.send({ status: "success", message: "Message Sent", data: {} });
                    }
                });
            }
        } else {
            res.send({ status: "failure", message: "Either empty message or please log in and try again", data: {} });
        }
    } else {
        res.send({ status: "failure", message: "Please log in to take action for the request", data: {} });
    }
});

app.listen(3000, console.log("Server running on 3000 since " + new Date().toString()));