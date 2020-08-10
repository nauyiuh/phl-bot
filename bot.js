const Discord = require("discord.js");
const glicko2 = require('glicko2');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const client = new Discord.Client();
require('dotenv-flow').config();
const disctoken = process.env.TOKEN;
const prefix = process.env.PREFIX;
const EncryptKey = process.env.ENCRPYTKEY
const SimpleCrypto = require("simple-crypto-js").default

const teams = {};
var ppLink;

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
// Load client secrets from a local file.


//setup glicko2
const defRating = 1500;
const defRd = 350;
const defVol = 0.06;
var settings = {
    tau: 0.5,
    rating: defRating,
    rd: defRd,
    vol: defVol,
};
var ranking = new glicko2.Glicko2(settings);


//bot load
client.on("ready", () => {
  console.log("PHL-Bot online");
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        authorize(JSON.parse(content), getTeams);
    });
});



client.on("message", (message) => {
    let args = message.content.substring(prefix.length).split(" ");

    if (message.webhookID) {
        message.delete();
        webhookCommands(message);
    } else if (message.content.startsWith(prefix)) {
        if (message.member.roles.cache.has('734966449764040725')) {
            staffCommands(message);
        }
        userCommands(message);
    }
});
   
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}


/**
 * googlesheet api functions
 */

function getTeams(auth) {
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.get({
        spreadsheetId: '1jUE2knsdUoJrMoJZtCfGa92TO-HYaLRcs_g8FYP0B5o',
        range: 'Teams!A2:K',
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
            for (const val of rows) {
                teams[val[0]] = val;
            }
            console.log("gapi.get successful");
        } else {
            console.log('No data found.');
        }
    });
}

//hiding updateRankings in here for async
function getMatches(auth) {
    var matches = [];
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.get({
        spreadsheetId: '1jUE2knsdUoJrMoJZtCfGa92TO-HYaLRcs_g8FYP0B5o',
        range: 'Matches!C2:G',
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
            for (const val of rows) {
                matches.push(val);
            }
            updateRanking(matches);
            console.log("gapi.get successful");
        } else {
            console.log('No data found.');
        }
    });
}

function addTeam(auth, values) {
    var body = { values: [...values]}
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.append({
        spreadsheetId: '1jUE2knsdUoJrMoJZtCfGa92TO-HYaLRcs_g8FYP0B5o',
        range: 'Teams!A2:K',
        valueInputOption: 'RAW',
        resource: body,
    }).then((response) => {
        console.log("gapi.append successful");
    });
};

function addMatch(auth, values) {
    var body = { values: [...values] }
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.append({
        spreadsheetId: '1jUE2knsdUoJrMoJZtCfGa92TO-HYaLRcs_g8FYP0B5o',
        range: 'Matches!A2:G',
        valueInputOption: 'RAW',
        resource: body,
    }).then((response) => {
        console.log("gapi.append successful");
    });
};

function addAbuse(auth, values) {
    var body = { values: [...values] }
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.append({
        spreadsheetId: '1_fXToGVptu5L4YrjGUwUtqtCvAMGT7p6LVTUQz1DGRg',
        range: 'NickAuthConn!A2:F',
        valueInputOption: 'RAW',
        resource: body,
    }).then((response) => {
        console.log("gapi.append successful");
    });
};

function addCancel(auth, values) {
    var body = { values: [...values] }
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.append({
        spreadsheetId: '1_fXToGVptu5L4YrjGUwUtqtCvAMGT7p6LVTUQz1DGRg',
        range: 'Cancels!A2:G',
        valueInputOption: 'RAW',
        resource: body,
    }).then((response) => {
        console.log("gapi.append successful");
    });
};

function teamsUpdate(auth, values) {
    var body = { values: [...values]}
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.update({
        spreadsheetId: '1jUE2knsdUoJrMoJZtCfGa92TO-HYaLRcs_g8FYP0B5o',
        range: 'Teams!A2:K',
        valueInputOption: 'RAW',
        resource: body
    }).then((response) => {
        var result = response.result;
        console.log(`gapi.update successful`)
    });

}

function updateRanking(matches) {

    //using teams, create teamList which is an object whose properties are player objects for glicko2
    //[x] is team name, [x][5] is team rating, [x][7] is team rd, teams [x][8] is team vol
    var teamList = {};
    for (const x in teams) {
        teamList[x] = ranking.makePlayer(teams[x][5], teams[x][7], teams[x][8]);
    }

    //using matches, create matchList which is an array of arrays to pass through to glicko2
    //teamList[m[0]] is team one player object, teamList[m[2]] is team two player object, m[4] is game result
    //also we increment wins/losses with each match
    //if you were going to add GF/GA it would be here
    var matchList = [];
    matches.forEach(function (m) {
        matchList.push([teamList[m[0]], teamList[m[2]], m[4]])
        if (m[4] == 1) {
            teams[m[0]][3] = parseInt(teams[m[0]][3]) + 1;
            teams[m[2]][4] = parseInt(teams[m[2]][4]) + 1;
        } else {
            teams[m[0]][4] = parseInt(teams[m[0]][4]) + 1;
            teams[m[2]][3] = parseInt(teams[m[2]][3]) + 1;

        }
    });

    //glicko2
    ranking.updateRatings(matchList);

    //update teams array, push teams array to values array
    var values = [];
    for (const x in teams) {
        teams[x][2] = parseInt(teams[x][3]) + parseInt(teams[x][4]);
        teams[x][3] = parseInt(teams[x][3]);
        teams[x][4] = parseInt(teams[x][4]);
        teams[x][6] = teamList[x].getRating() - parseFloat(teams[x][5]);
        teams[x][5] = parseFloat(teamList[x].getRating());
        teams[x][7] = parseFloat(teamList[x].getRd());
        teams[x][8] = parseFloat(teamList[x].getVol());

        values.push(teams[x]);
    }

    //sort teams by rating
    values.sort((a, b) => (a[5] > b[5]) ? -1 : 1);
    //update google sheets
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        authorize(JSON.parse(content), (auth) => teamsUpdate(auth, values));
    });
    //clean up
    matches.splice(0, matches.length);
}

/*
 * WEBHOOK COMMANDS AND FUNCTIONS
 */
function webhookCommands(message) {
    var obj = JSON.parse(message);
    message.delete();
    switch (obj.formtype) {
        case "abuse":
            logAbuse(obj);
            break;
        case "cancelled-match":
            logCancelledMatch(obj);
            break;
        case "forfeit-match":
            logForfeit(obj);
            break;
        case "occupy":
            updateOccupy(obj);
            break;
        case "completed-match":
            logCompletedMatch(obj);
            break;
    }
}

function logAbuse(obj) {
    const d = new Date();
    var date = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
    var values = [[date, obj.location, obj.Name, obj.OldName, obj.Auth, obj.Conn]];
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        authorize(JSON.parse(content), (auth) => addAbuse(auth, values));
    });
}

function logCancelledMatch(obj) {
    const d = new Date();
    var date = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
    var values = [[date, obj.location, obj.TeamOne, obj.TeamOneScore, obj.TeamTwo, obj.TeamTwoScore, obj.cancel]]
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        authorize(JSON.parse(content), (auth) => addCancel(auth, values));
    });
}

function logForfeit(obj) {
    if (teams.hasOwnProperty(obj.TeamOne) && teams.hasOwnProperty(obj.TeamTwo)) {
        const simpleCrypto = new SimpleCrypto(EncryptKey);
        const decipherOne = simpleCrypto.decrypt(teams[obj.TeamTwo][10]);
        const decipherTwo = simpleCrypto.decrypt(teams[obj.TeamOne][10]);
        if (decipherOne == obj.TeamOneSecret && decipherTwo == obj.TeamTwoSecret) {
            const d = new Date();
            var date = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
            var values = [[date, obj.location, obj.TeamOne, obj.TeamOneScore, obj.TeamTwo, obj.TeamTwoScore, obj.matchResult]];
            fs.readFile('credentials.json', (err, content) => {
                if (err) return console.log('Error loading client secret file:', err);
                authorize(JSON.parse(content), (auth) => addMatch(auth, values));
            });
            var ffWin = obj.matchResult ? obj.TeamTwo : obj.TeamOne;
            message.channel.send(`${ffWin} ${obj.forfeit} forfeited match. Score: ${obj.TeamOne} ${obj.TeamOneScore} - ${obj.TeamTwo} ${obj.TeamTwoScore}. Half ${obj.half} - Time ${obj.time}`);
        } else {
            message.channel.send(obj.stringify());
            message.channel.send(`cipher doesn't match-forfeit`)
        }
    } else {
        message.channel.send(obj.stringify());
        message.channel.send(`teams don't match-forfeit`);
    }
}

function logCompletedMatch(obj) {
    if (teams.hasOwnProperty(obj.TeamOne) && teams.hasOwnProperty(obj.TeamTwo)) {
        const simpleCrypto = new SimpleCrypto(EncryptKey);
        const decipherOne = simpleCrypto.decrypt(teams[obj.TeamTwo][10]);
        const decipherTwo = simpleCrypto.decrypt(teams[obj.TeamOne][10]);
        if (obj.TeamOneSecret == decipherOne && obj.TeamTwoSecret == decipherTwo) {
            //create values array, push match data into it
            const d = new Date();
            var date = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
            var values = [[date, obj.location, obj.TeamOne, obj.TeamOneScore, obj.TeamTwo, obj.TeamTwoScore, obj.matchResult]];
            fs.readFile('credentials.json', (err, content) => {
                if (err) return console.log('Error loading client secret file:', err);
                authorize(JSON.parse(content), (auth) => addMatch(auth, values));
            });
            return;
        } else {
            message.channel.send(obj.stringify());
            message.channel.send(`cipher's don't match`);
            return;
        }
    } else {
        message.channel.send(obj.stringify());
        message.channel.send(`teams not found`);
        return;
    }
}

function updateOccupy(obj) {
    client.channels.cache.get('733611167502827551').messages.fetch('735034347287216151')
        .then((message) => {
            const oldEmbed = message.embeds[0];
            const newEmbed = new Discord.MessageEmbed(oldEmbed)
            switch (obj.location) {
                case "Arruda's Arena":
                    newEmbed.fields[0].value = obj.players.join(', ');
                    break;
                case "Maod's Arboretum":
                    newEmbed.fields[1].value = obj.players.join(', ');
                    break;
                case "Donovan's Domain":
                    newEmbed.fields[2].value = obj.players.join(', ');
                    break;
                case "Froz3n Island":
                    newEmbed.fields[3].value = obj.players.join(', ');
                    break;
            }
            message.edit(newEmbed);
        })
        .catch(console.error);
}

/*
 * STAFF COMMANDS AND FUNCTIONS
 */
function staffCommands(message) {
    var args = message.content.substring(prefix.length).split(" ");
    switch (args[0]) {
        case "reload":
            reloadTeams(message);
            break;
        case "links":
            updateRoomLinks(message);
            break;
        case "updateRanking":
            updateLadder(message);
            break;
        case "manualAdd":
            manualAdd(message);
            break;
        case "register":
            register(message);
            break;
        case "pubLink":
            pubLink(message);
            break;
    }
}

function reloadTeams(message) {
    var args = message.content.substring(prefix.length).split(" ");
    for (var x in teams) if (teams.hasOwnProperty(x)) delete teams[x];
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        authorize(JSON.parse(content), getTeams);
    });
    message.reply(`reloaded teams from db`);
    message.delete();
}

function updateRoomLinks(message) {
    var args = message.content.substring(prefix.length).split(" ");
    client.channels.cache.get('733611167502827551').messages.fetch('735034347287216151')
        .then((message) => {
            const oldEmbed = message.embeds[0];
            const newEmbed = new Discord.MessageEmbed(oldEmbed)
            newEmbed.fields[0].name = `Arruda's Arena ${args[1]}`;
            newEmbed.fields[1].name = `Maod's Arboretum ${args[2]}`;
            newEmbed.fields[2].name = `Donovan's Domain ${args[3]}`;
            newEmbed.fields[3].name = `Froz3n Island ${args[4]}`;
            message.edit(newEmbed);
        })
        .catch(console.error);
    message.reply(`updated room links`);
    message.delete();
}

function updateLadder(message) {
    var args = message.content.substring(prefix.length).split(" ");
        fs.readFile('credentials.json', (err, content) => {
            if (err) return console.log('Error loading client secret file:', err);
            authorize(JSON.parse(content), getMatches);
        });
    message.reply(`updated ladder`);
    message.delete();
}

function manualAdd(message) {
    var args = message.content.substring(prefix.length).split(" ");
    var obj = JSON.parse(args.slice(1).join(" "));
    if (teams.hasOwnProperty(obj.TeamOne) && teams.hasOwnProperty(obj.TeamTwo)) {
        //create values array, push match data into it
        const d = new Date(message.createdTimestamp);
        date = d.getHours() + ":" + d.getMinutes() + ", " + d.toDateString();
        var values = [[d, obj.location, obj.TeamOne, obj.TeamOneScore, obj.TeamTwo, obj.TeamTwoScore, obj.matchResult]];
        fs.readFile('credentials.json', (err, content) => {
            if (err) return console.log('Error loading client secret file:', err);
            authorize(JSON.parse(content), (auth) => addMatch(auth, values));
        });
        message.reply(`match manually added between ${TeamOne} and ${TeamTwo}`);
        message.delete();
    }
}

function register(message) {
    //USAGE: !register {"code": "", "name": "", "roster":"", "secret": ""}
    var args = message.content.substring(prefix.length).split(" ");
    if (!args[1]) {
        message.reply(`USAGE: !register { "code": "", "name": "", "roster": "", "secret": "" }`);
        message.delete();
        return;
    }

    try {
        JSON.parse(args.slice(1).join(" "));
    }
    catch (e) {
        message.reply(`USAGE: !register { "code": "", "name": "", "roster": "", "secret": "" }`);
        message.delete();
        return;
    }
    var obj = JSON.parse(args.slice(1).join(" "));
    
    //check to make sure object has required properties
    if (obj.hasOwnProperty("name") && obj.hasOwnProperty("code") && obj.hasOwnProperty("roster") && obj.hasOwnProperty("secret")) {
        //validate properties are correctly formatted
        if (obj.code.length > 3) {
            message.reply(`Team code should be 3 characters or less`)
            message.reply(`${obj.stringify}`)
            message.delete();
            return;
        }
        //make sure code isn't in use
        var teamCode = obj.code.toUpperCase();

        if (teamCode in teams) {
            message.reply(`ERROR: ${teamCode} already exists`);
            message.delete();
            return;
        }
        //append to google sheets and add to team array
        teams[teamCode] = [teamCode, obj.name, 0, 0, 0, defRating, 0, defRd, defVol, obj.roster, obj.secret];
        var values = [];
        values.push(teams[teamCode]);
        fs.readFile('credentials.json', (err, content) => {
            if (err) return console.log('Error loading client secret file:', err);
            authorize(JSON.parse(content), (auth) => addTeam(auth, values));
        });
        message.reply(`${teamCode} - ${obj.name} added to teams database`);
        message.delete();
        return;
    } else {
        message.reply(`Incorrect syntax.  Please pass an object with the following properties: name, team code, roster, secret code`);
        message.reply(`"Usage template: {"code":"","name":"","roster":"","secret":""}"`)
        message.delete();
        return;
    }
}

function pubLink(message) {
    var args = message.content.substring(prefix.length).split(" ");
    ppLink = args[1];
    message.reply(`updated pub link to ${ppLink}`);
    message.delete();
}

/*
 * GENERAL USE COMMANDS
 */
function userCommands(message) {
    var args = message.content.substring(prefix.length).split(" ");
    switch (args[0]) {
        case "pp":
            message.guild.roles.fetch('737894403435135036')
                .then(roles => privatePub(message, roles.members.size))
                .catch(console.error);
            break;
        default:
            break;
    }
}


//client.channels.cache.get('733611167502827551').messages.fetch('735034347287216151')
async function privatePub(message, memberCount) {
    var args = message.content.substring(prefix.length).split(" ");
    switch (args[1]) {
        case "on":
            if (memberCount < 8) {
                message.reply(`you've been added to private-pub list. There are ${memberCount} people in the queue.`);
            } else if (memberCount = 8) {
                message.reply(`<@&${roleID}> ${memberCount} players have joined queue.  ${ppLink}`);
            } else if (memberCount > 8) {
                message.reply(`${memberCount} players are in queue.  ${ppLink}`);

            }
            message.member.roles.add("741809077331689484");
            message.delete();
            
            break;
        case "off":
            message.member.roles.remove("741809077331689484");
            message.delete();
            break;
        default:
            message.reply("USAGE: !pp on to add yourself to private-pub list, !pp off to remove yourself from private-pub list");
            message.delete();
    }
    //case arg
    //arg on
        // # of users in role is under 8 OR # of users in room is under 8
        // add user to gathers role
        // # of users will be 8 or # of users in room will be 8
        // add user to gathers role -> ping role
        // # of users is 8+ or room will be 8+
        // add user to gathers role -> reply to user w/ room link
    //arg off
        // remove user from gathers role
    //default return usage
}

client.login(disctoken);