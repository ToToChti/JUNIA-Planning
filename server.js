/*
 *        _             _                       
 *       (_)           (_)                      
 *        _ _   _ _ __  _  __ _                 
 *       | | | | | '_ \| |/ _` |                
 *       | | |_| | | | | | (_| |                
 *       | |\__,_|_| |_|_|\__,_|  _             
 *      _/ | | |                 (_)            
 *     |__/_ | | __ _ _ __  _ __  _ _ __   __ _ 
 *     | '_ \| |/ _` | '_ \| '_ \| | '_ \ / _` |
 *     | |_) | | (_| | | | | | | | | | | | (_| |
 *     | .__/|_|\__,_|_| |_|_| |_|_|_| |_|\__, |
 *     | |                                 __/ |
 *     |_|                                |___/ 
 *
 *
 *    This code has been produced by Arsial (GitHub: ToToChti)
 *    ---> https://github.com/ToToChti/junia-planning
 * 
 *    Some parts of the code might have been produced by ChatGPT (OpenAI)
 *    but most of the code is hand-written
 *
*/


/* ----------- npm modules import ----------- */
const fetch       = require('node-fetch');
const express     = require('express');
const fs          = require('fs');
const bodyParser  = require('body-parser');
const readline    = require('readline');

/* --------- Constant definitions --------- */
const DEBUG_MODE = false;
const planningList = [
  { url: "plannings/planning_apprenants_02_12_2024.csv", length: 10, date: new Date("2024-12-02T00:00:00.000Z") },
  { url: "plannings/planning_apprenants_25_11_2024.csv", length: 10, date: new Date("2024-11-25T00:00:00.000Z") },
  { url: "plannings/planning_apprenants_18_11_2024.csv", length: 10, date: new Date("2024-11-18T00:00:00.000Z") }
]

var app = express();

// Set the view engine to ejs
app.set('view engine', 'ejs');

// Set different module to user for the app
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json())
app.use(express.static('public'))

/* ----------- ROUTING ----------- */

// Index page
app.get('/', function (req, res) {
  res.render('pages/index', { error: "" });
});


// Return statistics for the page
app.get('/stats', (req, res) => {

  let logs = JSON.parse(fs.readFileSync("./userLogs.json"));
  let stats = {
    "nbVisits": 0,
    "differentVisitor": Object.keys(logs).length,
    "newUsersPerDay": {},
    "nbVisitsPerDay": {},
    "nbDifferentVisitorPerDay": {}
  }

  Object.keys(logs).forEach(key => {

    let alreadyVisited = false;
    let firstVisitDate = new Date(logs[key].visits[0]);
    firstVisitDate.setHours(0, 0, 0, 0);

    if (!stats.newUsersPerDay[firstVisitDate.getTime()]) stats.newUsersPerDay[firstVisitDate.getTime()] = 0;

    stats.newUsersPerDay[firstVisitDate.getTime()]++;

    logs[key].visits.forEach(visit => {
      let visitDate = new Date(visit);
      visitDate.setHours(0, 0, 0, 0);

      if (!stats.nbVisitsPerDay[visitDate.getTime()]) stats.nbVisitsPerDay[visitDate.getTime()] = 0;

      stats.nbVisitsPerDay[visitDate.getTime()]++;
      stats.nbVisits++;

    })

    let visitDates = []

    logs[key].visits.forEach(visit => {
      let visitDate = new Date(visit);
      visitDate.setHours(0, 0, 0, 0);

      if(!visitDates.find(date => date == visitDate.getTime())) {
        visitDates.push(visitDate.getTime())
      }
    })

    visitDates.forEach(date => {
      if(!stats.nbDifferentVisitorPerDay[date]) {
        stats.nbDifferentVisitorPerDay[date] = 1;
      }
      else {
        stats.nbDifferentVisitorPerDay[date]++;
      }
    })    
  })

  res.render('pages/stats', { stats: JSON.stringify(stats, false, 2) });
})


app.get('/getPlanning', (req, res) => {
  const mails = JSON.parse(fs.readFileSync("mails.json"));

  let foundEmail = Object.values(mails).find(mail => req.query.email.toLowerCase() == mail)
  
  if (!req.query || !req.query.email || !foundEmail) {
      return res.render("pages/index", { error: "Email not found" });
  }

  let email = req.query.email.toLowerCase();
  let name = Object.keys(mails).find(key => mails[key] == email);

  getStudentInfo(req.query.email.toLowerCase(), res);


  // LOGGING SYSTEM
  let logs = JSON.parse(fs.readFileSync("./userLogs.json"));

  logs[email] = logs[email] || {
    email,
    name,
    visits: []
  }

  logs[email].visits.push(new Date().getTime());

  fs.writeFileSync("./userLogs.json", JSON.stringify(logs, false, 4));

})

// Returning planning
app.get('/planning', function (req, res) {

  let db = JSON.parse(fs.readFileSync("mails.json"));
  let foundEmail = Object.values(db).find(mail => req.query.email.toLowerCase() == mail)

  if (!req.query || !req.query.email || !foundEmail)
    return res.render("pages/index", { error: "Email not found" });

  res.render('pages/planning', { email: req.query.email.toLowerCase() });

  return;
});

app.listen(3000);
console.log('Server is listening on port 3000');


function getDateOfURL(url) {

  let dateRaw = url.split(".")[0].split("_").slice(2, 5);

  return new Date(`${dateRaw[1]}/${parseInt(dateRaw[0]) + 1}/${dateRaw[2]}`);

}

function getDateFromPlanning(dateString) {

  let dateRaw = dateString.split(' ')[0].split("/");

  return new Date(`${dateRaw[1]}/${parseInt(dateRaw[0]) + 1}/${dateRaw[2]}`);
}

getDateOfURL(planningList[0].url)


// Returns an array from a CSV file
function parseCSV(urls) {

  console.log("Updating datas...")

  urls.sort((urlA, urlB) => {
    return getDateOfURL(urlB) - getDateOfURL(urlA)
  })

  let startTime = new Date().getTime();
  let endedTreatment = 0;

  const finalData = {
    indexes: [],
    data: []
  };


  urls.forEach((url, index) => {

    let urlDateTime = index == 0 ? 1731061965062000 : getDateOfURL(urls[index - 1]).getTime();
    let indexesLength = fs.readFileSync(url).toString().split('\n')[0].split(";").length

    const readInterface = readline.createInterface({
      input: fs.createReadStream(url),
    });

    readInterface.on('line', function (line) {

      let raw = line.split(";");

      if (raw.length <= 2) {
        if (finalData.data.length > 1) {
          let a = finalData.data[finalData.data.length - 1];
          a[a.length - 1] += '\n' + line;
        }
      }

      else {

        if (getDateFromPlanning(raw[5]).getTime() < urlDateTime) {
          finalData.data.push(raw);
        }
      }
    })

    // Afficher le contenu une fois la lecture terminée
    readInterface.on('close', function () {

      simplifyData(finalData.data);

      console.log("At URL " + index + ", operation took " + ((new Date().getTime() - startTime) / 1000) + "s")

      endedTreatment++;

      if (endedTreatment == urls.length) {
        console.log("--> UPDATE DONE <--")
      }
    });

  })


  fs.writeFileSync('data.json', JSON.stringify(finalData, false, 4));
}


function simplifyData(datas) {

  console.log("Simplifying data...");
  let startTime = new Date().getTime();

  // let datas = JSON.parse(fs.readFileSync("data.json")).data;

  let finalData = {};
  let counter = 0;

  let mails = JSON.parse(fs.readFileSync('mails.json'));

  datas.forEach(data => {

    // counter++;

    if (data[1] == '') {
      data[1] = mails[data[0]];
    }

    finalData[data[1]] = finalData[data[1]] || {
      name: data[0],
      email: data[1],
      subjects: []
    }

    let dataToPush = {
      courseName: data[2],
      date: data[5].split(" ")[0],
      room: data[7],
      type: data[3],
      beginTime: data[5].split(" ")[1],
      endTime: data[6].split(" ")[1],
      intervenant: data[8],
      description: data[9],
    };

    if (!finalData[data[1]].subjects.find(subject => {
      return JSON.stringify(subject).toLowerCase() == JSON.stringify(dataToPush).toLowerCase()
    })) {
      finalData[data[1]].subjects.push(dataToPush)
    }
  })


  fs.writeFileSync("finalData.json", JSON.stringify(finalData, false, 4))

  console.log("Successfully simplified in " + ((new Date().getTime() - startTime) / 1000) + "s")
}




async function getStudentInfo(email, res) {
  let startTime = new Date().getTime();
  let userData = []
  let nextLineInData = false;
  let size = 0;
  let operationCount = 0;

  let searchEmail = email;
  let mails = JSON.parse(fs.readFileSync("mails.json"));
  let searchName = Object.keys(mails).find(key => mails[key] == searchEmail);

  planningList.forEach((planningInfo, index) => {
    let partialTime = new Date().getTime();

    const readInterfacee = readline.createInterface({
      input: fs.createReadStream(planningInfo.url),
    });
    const reachSize = planningInfo.length;

    readInterfacee.on('line', function (line) {

      if (nextLineInData) {

        userData[userData.length - 1] += '\n' + line;

        size += line.split(";").length - 1;

        if (size >= reachSize) {
          nextLineInData = false;
        }

      }

      if (line.startsWith(searchName)) {

        userData.push({
          line,
          dateIdx: index
        })

        let raw = line.split(";");
        size = raw.length;

        if (size < reachSize) {
          nextLineInData = true;
        }
      }
    })


    readInterfacee.on('close', function () {

      // console.log("Operation took " + ((new Date().getTime() - partialTime) / 1000) + "s");

      operationCount++;

      if (operationCount == planningList.length) {
        if (userData.length === 0) {
          return res.render("pages/index", { error: "Email not found" });
        }

        // console.log("All operations ended in " + ((new Date().getTime() - startTime) / 1000) + "s" + "... JSONifying data...")

        return jsonify(userData, res);
      }
    });
  })
}

function jsonify(userDataArr, res) {

  let startTime = new Date().getTime();

  let firstLineSplit = userDataArr[0].line.split(";");

  let name = firstLineSplit[0];
  let email = firstLineSplit[1];

  const subjects = [];

  userDataArr.forEach(line => {

    let lineSplit = line.line.split(";");

    let subject = {
      courseName: lineSplit[2],
      type: lineSplit[3],
      courseCode: lineSplit[4],
      date: lineSplit[5].split(' ')[0],
      beginTime: lineSplit[5].split(' ')[1],
      endTime: lineSplit[6].split(' ')[1],
      room: lineSplit[7],
      intervenant: lineSplit[8],
      description: lineSplit[9],
    }

    let sameSubj = subjects.find(subj => {

      let same = true;

      if (subj.courseName != subject.courseName) same = false;
      if (subj.type != subject.type) same = false;
      if (subj.date != subject.date) same = false;
      if (subj.beginTime != subject.beginTime) same = false;
      if (subj.endTime != subject.endTime) same = false;
      if (subj.room != subject.room) same = false;
      if (subj.description != subject.description) same = false;
      if (subj.intervenant != subject.intervenant) same = false;

      return same;
      // Can put false here for some tests

    });

    let tooOld = false;

    if (!sameSubj) {

      let dateSplit = subject.date.split('/');
      let date = new Date(dateSplit[2] + '-' + dateSplit[1] + '-' + dateSplit[0] + 'T00:00:00.000Z');

      if (line.dateIdx > 0 && date.getTime() >= planningList[line.dateIdx - 1].date.getTime()) {
        tooOld = true;
      }
    }

    if (!tooOld && !sameSubj) {
      subjects.push(subject);
    };

  })


  let user = {
    name,
    email,
    subjects
  }

  // console.log("JSONifying took " + ((new Date().getTime() - startTime) / 1000) + "s");
  startTime = new Date().getTime();

  res.json(user);

  // console.log("Response sent to user in " + ((new Date().getTime() - startTime) / 1000) + "s")

}


function editCSV(url) {

  let file = fs.readFileSync(url).toString();
  let newFile = "";

  // console.log(file)

  const readInterface = readline.createInterface({
    input: fs.createReadStream(url),
  });
  const mails = JSON.parse(fs.readFileSync("mails.json"))

  readInterface.on('line', function (line) {

    let splitted = line.split("");

    if (splitted[splitted.length - 1] == ";") splitted[splitted.length - 1] = "";

    // if(mails[splitted[0]]) {
    //   splitted[1] = mails[splitted[0]];
    // }

    newFile += splitted.join("") + `\n`;

  })


  readInterface.on('close', function () {

    fs.writeFileSync(url, newFile);

    console.log("File successfully edited!")
  })

}




function combineJSON() {
  let firstFile = JSON.parse(fs.readFileSync("userLogs.json"));
  let secondFile = JSON.parse(fs.readFileSync("logs.json"));

  Object.keys(secondFile).forEach(key => {
    if(firstFile[key]) {
      firstFile[key].visits = firstFile[key].visits.concat(secondFile[key].visits);
    }
    else {
      firstFile[key] = secondFile[key];
    }
  })

  fs.writeFileSync("userLogs.json", JSON.stringify(firstFile, false, 4));
}