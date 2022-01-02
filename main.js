
const express = require("express");
const session = require("express-session");
const app = express();
const fs = require("fs");
const { JSDOM } = require('jsdom');

// static path mappings
app.use("/js", express.static("public/js"));
app.use("/css", express.static("public/css"));
app.use("/img", express.static("public/image"));

app.use(session(
  {
      secret: "PremierLeague",
      name: "PLSessionID",
      resave: false,
      saveUninitialized: true })
);



app.get("/", function (req, res) {

    if(req.session.loggedIn) {
        res.redirect("/profile");
    } else {
        let doc = fs.readFileSync("./app/html/index.html", "utf8");

        res.set("2021-2022", "PL");
        res.set("Sponsored-By", "Barclays");
        res.send(doc);
    }

});


app.get("/profile", function(req, res) {
    // check for a session first!
    if(req.session.loggedIn) {
        var mysql = require('mysql2');
        var connection = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "",
            database: "premierleague"
        });
        connection.connect();

        var profile = fs.readFileSync("./app/html/profile.html", "utf8");
        var profileDOM = new JSDOM(profile);

        profileDOM.window.document.getElementsByTagName("title")[0].innerHTML
            = req.session.name + "'s Premier League Page";
        profileDOM.window.document.getElementById("welcomeHeader").innerHTML
            = "Welcome! " + req.session.name;

        connection.query("SELECT * FROM user WHERE email = 'dkoh8@my.bcit.ca'", function(error, results, fields) {
            if (error) {
                console.log(error);
            }
            profileDOM.window.document.getElementById("userhere").innerHTML = `
            <table id="usertable">
                <tr>
                    <th>User ID</th>
                    <td>${results[0].id}</td>
                </tr>
                <tr>
                    <th>Name</th>
                    <td>${results[0].name}</td>
                </tr>
                <tr>
                    <th>Email</th>
                    <td>${results[0].email}</td>
                </tr>
                <tr>
                    <th>Password</th>
                    <td>${results[0].password}</td>
                </tr>
                <tr>
                    <th>Address</th>
                    <td>${results[0].address}</td>
                </tr>
                <tr>
                    <th>Favorite</th>
                    <td>${results[0].favorite}</td>
                </tr>
            </table>
            `;
        });

        connection.query("SELECT * FROM leaguetable", function(error, results, fields) {
            if (error) {
                console.log(error);
            }

            function leaguetablerow(i) {
                return `
                <tr>
                <th>${results[i].position}</th>
                <td>${results[i].club}</td>
                <td>${results[i].played}</td>
                <td>${results[i].won}</td>
                <td>${results[i].drawn}</td>
                <td>${results[i].lost}</td>
                <td>${results[i].points}</td>
                </tr>
                `;
            }

            var leaguetable = `
            <h2>League Table</h2>
            <table id="leaguehere">
            <tr>
                <th>Position</th>
                <th>Club</th>
                <th>Played</th>
                <th>Won</th>
                <th>Drawn</th>
                <th>Lost</th>
                <th>Points</th>
            </tr>
            `;
            for (var i = 0; i < results.length; i++) {
              leaguetable += leaguetablerow(i);
            };
            leaguetable += `</table>`;

            profileDOM.window.document.getElementById("league-table").innerHTML = leaguetable;
        });

        connection.query("SELECT * FROM playerstats", function(error, results, fields) {
            if (error) {
                console.log(error);
            }

            function playerstatsrow(i) {
                return `
                <tr>
                <th>${results[i].rank}</th>
                <td>${results[i].player}</td>
                <td>${results[i].club}</td>
                <td>${results[i].nationality}</td>
                <td>${results[i].goals}</td>
                <td>${results[i].assists}</td>
                <td>${results[i].played}</td>
                </tr>
                `;
            }

            var statstable = `
            <h2>Players Stats</h2>
            <table id="statshere">
            <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Club</th>
                <th>Nationality</th>
                <th>Goals</th>
                <th>Assists</th>
                <th>Played</th>
            </tr>
            `;
            for (var i = 0; i < results.length; i++) {
                statstable += playerstatsrow(i);
            };
            statstable += `</table>`;

            profileDOM.window.document.getElementById("players-stats").innerHTML = statstable;
            res.set("2021-2022", "PL");
            res.set("Sponsored-By", "Barclays");
            res.send(profileDOM.serialize());
        });
    } else {
        // not logged in => redirect to root
        res.redirect("/");
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Notice that this is a "POST"
app.post("/login", function(req, res) {
    res.setHeader("Content-Type", "application/json");


    console.log("What was sent", req.body.email, req.body.password);


    let results = authenticate(req.body.email, req.body.password,
        function(userRecord) {
            if(userRecord == null) {
                res.send({ status: "fail", msg: "Invalid Email or Password." });
            } else {
                // authenticate the user, create a session
                req.session.loggedIn = true;
                req.session.email = userRecord.email;
                req.session.name = userRecord.name;
                req.session.save(function(err) {
                    // session saved for analytics
                });
                res.send({ status: "success", msg: "Logged in." });
            }
    });

});

app.get("/logout", function(req,res){

    if (req.session) {
        req.session.destroy(function(error) {
            if (error) {
                res.status(400).send("Unable to log out")
            } else {
                // session deleted, redirect to root
                res.redirect("/");
            }
        });
    }
});

function authenticate(email, pwd, callback) {

    const mysql = require("mysql2");
    const connection = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "premierleague"
    });
    connection.connect();
    connection.query(
      "SELECT * FROM user WHERE email = ? AND password = ?", [email, pwd],
      function(error, results, fields) {
          console.log("Results from DB", results, "and the # of records returned", results.length);

          if (error) {
              console.log(error);
          }
          if(results.length > 0) {
              // email and password found
              return callback(results[0]);
          } else {
              // user not found
              return callback(null);
          }

      }
    );

}

/*
 * Function that connects to the DBMS and checks if the DB exists,
 * if not creates it, then populates it with a couple of records.
 */
async function init() {

    const mysql = require("mysql2/promise");
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      multipleStatements: true
    });
    const createDBAndTables = `CREATE DATABASE IF NOT EXISTS premierleague;
        use premierleague;
        CREATE TABLE IF NOT EXISTS user (
            id int NOT NULL AUTO_INCREMENT,
            name varchar(30),
            email varchar(30),
            password varchar(30),
            address varchar(50),
            favorite varchar(30),
            PRIMARY KEY (id));
        
        CREATE TABLE IF NOT EXISTS leaguetable (
            id int NOT NULL AUTO_INCREMENT,
            position tinyint(30),
            club varchar(30),
            played tinyint(40),
            won tinyint(40),
            drawn tinyint(40),
            lost tinyint(40),
            points tinyint(150),
            PRIMARY KEY (id));

        CREATE TABLE IF NOT EXISTS playerstats (
            id int NOT NULL AUTO_INCREMENT,
            rank tinyint(30),
            player varchar(40),
            club varchar(30),
            nationality varchar(30),
            goals tinyint(50),
            assists tinyint(50),
            played tinyint(40),
            PRIMARY KEY (id)
        );`;
    await connection.query(createDBAndTables);

    const [userrows, userfields] = await connection.query("SELECT * FROM user");
    if(userrows.length == 0) {
        // no records => add records
        let userRecords = "insert into user (name, email, password, address, favorite) values ?";
        let userValues = [
          ["Chan", "dkoh8@my.bcit.ca", "123456", "4200 Willingdon Avenue", "Manchester United"],
        ];
        await connection.query(userRecords, [userValues]);
    }

    const [leaguerows, leaguefields] = await connection.query("SELECT * FROM leaguetable");
    if(leaguerows.length == 0) {
        // no records => add records
        let leaguetableRecords = "insert into leaguetable (position, club, played, won, drawn, lost, points) values ?";
        let tableValues = [
            [1, "Chelsea", 12, 9, 2, 1, 29],
            [2, "Manchester City", 12, 8, 2, 2, 26],
            [3, "Liverpool", 12, 7, 4, 1, 25],
            [4, "West Ham United", 12, 7, 2, 3, 23],
            [5, "Arsenal", 12, 6, 2, 4, 20],
            [6, "Wolverhampton Wanderers", 12, 6, 1, 5, 19],
            [7, "Tottenham Hotspur", 12, 6, 1, 5, 19],
            [8, "Manchester United", 12, 5, 2, 5, 17],
            [9, "Brighton and Hove Albion", 12, 4, 5, 3, 17],
            [10, "Crystal Palace", 12, 3, 7, 2, 17],
            [11, "Everton", 12, 4, 3, 5, 15],
            [12, "Leicester City", 12, 4, 3, 5, 15],
            [13, "Southhampton", 12, 3, 5, 4, 14],
            [14, "Brentford", 12, 3, 4, 5, 13],
            [15, "Aston Villa", 12, 4, 1, 7, 13],
            [16, "Watford", 12, 4, 1, 7, 13],
            [17, "Leeds United", 12, 2, 5, 5, 11],
            [18, "Burnley", 12, 1, 6, 5, 9],
            [19, "Norwich City", 12, 2, 2, 8, 8],
            [20, "Newcastle United", 12, 0, 6, 6, 6]
        ];
        await connection.query(leaguetableRecords, [tableValues]);
    }

    const [playerrows, playerfields] = await connection.query("SELECT * FROM playerstats");
    if(playerrows.length == 0) {
        // no records => add records
        let playerstatsRecords = "insert into playerstats (rank, player, club, nationality, goals, assists, played) values ?";
        let playerValues = [
            [1, "Mohamed Salah", "Liverpool", "Egypt", 11, 7, 12],
            [2, "Sadio Mane", "Liverpool", "Senegal", 7, 1, 12],
            [2, "Jamie Vardy", "Leicester City", "England", 7, 1, 12],
            [4, "Michail Antonio", "West Ham Unitied", "Jamaica", 6, 3, 11],
            [5, "Maxwel Cornet", "Burnley", "Cote D'Ivoire", 5, 0, 7],
            [5, "Raphinha", "Leeds United", "Brazil", 5, 0, 10],
            [5, "Ismaila Sarr", "Watford", "Senegal", 5, 0, 12],
            [5, "Diogo Jota", "Liverpool", "Portugal", 5, 1, 11],
            [9, "Pierre-Emerick Aubameyang", "Arsenal", "Gabon", 4, 1, 11],
            [9, "Roberto Firmino", "Liverpool", "Brazil", 4, 1, 10],
            [9, "Christian Benteke", "Crystal Palace", "Belgium", 4, 0, 10],
            [9, "Bruno Fernandes", "Manchester United", "Portugal", 4, 3, 12],
            [9, "Emmanuel Dennis", "Watford", "Nigeria", 4, 5, 12],
            [9, "Cristiano Ronaldo", "Manchester United", "Portugal", 4, 4, 9],
            [9, "Pablo Fornals", "West Ham United", "Spain", 4, 1, 11],
            [9, "Conor Gallagher", "Crystal Palace", "England", 4, 1, 10],
            [9, "Mason Greenwood", "Manchester United", "England", 4, 0, 10],
            [9, "Hwang Hee-Chan", "Wolverhampton Wanderers", "South Korea", 4, 0, 9],
            [9, "Reece James", "Chelsea", "England", 4, 4, 9],
            [9, "Joshua King", "Watford", "Norway", 4, 2, 10]
        ];
        await connection.query(playerstatsRecords, [playerValues]);
    }
    console.log("Listening on port " + port + "!");
}

// Run Server
let port = 8000;
app.listen(port, init);
