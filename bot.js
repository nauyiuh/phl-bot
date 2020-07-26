const Discord = require("discord.js");
const glicko2 = require('glicko2');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const client = new Discord.Client();
require('dotenv-flow').config();
const disctoken = process.env.TOKEN;
const PREFIX = process.env.PREFIX;
const EncryptKey = process.env.ENCRPYTKEY
const SimpleCrypto = require("simple-crypto-js").default

const teams = {};

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
// Load client secrets from a local file.


//setup glicko2
var settings = {
    tau: 0.5,
    rating: 1500,
    rd: 350,
    vol: 0.06
};
const defRating = 1500;
const defRd = 350;
const defVol = 0.06;
var ranking = new glicko2.Glicko2(settings);


//load teams on bot load
client.on("ready", () => {
  console.log("I am ready!");
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        authorize(JSON.parse(content), getTeams);
    });
});



client.on("message", (message) => {

    let args = message.content.substring(PREFIX.length).split(" ");

    if (message.webhookID) {
        var obj = JSON.parse(message);

        //ABUSE LOG
        if (obj.formtype == 'abuse') {
            const d = new Date(message.createdTimestamp);
            date = d.getHours() + ":" + d.getMinutes() + ", " + d.toDateString();
            var values = [[d, obj.location, obj.Name, obj.OldName, obj.Auth, obj.Conn]];
            fs.readFile('credentials.json', (err, content) => {
                if (err) return console.log('Error loading client secret file:', err);
                authorize(JSON.parse(content), (auth) => addAbuse(auth, values));
            });
            message.delete();
            return;
            //CANCEL LOG
        } else if (obj.formtype == 'cancelled-match') {
            const d = new Date(message.createdTimestamp);
            date = d.getHours() + ":" + d.getMinutes() + ", " + d.toDateString();
            var values = [[d, obj.location, obj.TeamOne, obj.TeamOneScore, obj.TeamTwo, obj.TeamTwoScore, obj.cancel]]
            fs.readFile('credentials.json', (err, content) => {
                if (err) return console.log('Error loading client secret file:', err);
                authorize(JSON.parse(content), (auth) => addCancel(auth, values));
            });
            message.delete();
            return;
            //FORFEIT LOG
        } else if (obj.formtype == 'forfeit-match') {
            const d = new Date(message.createdTimestamp);
            date = d.getHours() + ":" + d.getMinutes() + ", " + d.toDateString();
            const simpleCrypto = new SimpleCrypto(EncryptKey);
            const decipherOne = simpleCrypto.decrypt(teams[obj.TeamOne][10]);
            const decipherTwo = simpleCrypto.decrypt(teams[obj.TeamTwo][10]);
            if (teams.hasOwnProperty(obj.TeamOne) && teams.hasOwnProperty(obj.TeamTwo)) {
                if (decipherOne == obj.TeamOneSecret && decipherTwo == obj.TeamTwoSecret) {
                    var values = [[d, obj.location, obj.TeamOne, obj.TeamOneScore, obj.TeamTwo, obj.TeamTwoScore, obj.matchResult]];
                    fs.readFile('credentials.json', (err, content) => {
                        if (err) return console.log('Error loading client secret file:', err);
                        authorize(JSON.parse(content), (auth) => addMatch(auth, values));
                    });
                    message.delete();
                    var ffWin = obj.matchResult ? obj.TeamTwo : obj.TeamOne;
                    message.channel.send(`${ffWin} ${obj.forfeit} forfeited match. Score: ${obj.TeamOne} ${obj.TeamOneScore} - ${obj.TeamTwo} ${obj.TeamTwoScore}. Half ${obj.half} - Time ${obj.time}`);
                    return;
                } else {
                    message.channel.send(`cipher doesn't match-forfeit`);
                    return;
                }
            } else {
                message.channel.send(`team not found-forfeit`)
                return;
            }
            //OCCUPY LOG
        } else if (obj.formtype == 'occupy') {
            message.delete();
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
            return;
        //COMPLETED MATCH LOG
        } else if (obj.formtype == 'completed-match') {
            const simpleCrypto = new SimpleCrypto(EncryptKey);
            const decipherOne = simpleCrypto.decrypt(teams[obj.TeamTwo][10]);
            const decipherTwo = simpleCrypto.decrypt(teams[obj.TeamOne][10]);
            if (teams.hasOwnProperty(obj.TeamOne) && teams.hasOwnProperty(obj.TeamTwo)) {
                if (obj.TeamOneSecret == decipherOne && obj.TeamTwoSecret == decipherTwo) {
                    //create values array, push match data into it
                    const d = new Date(message.createdTimestamp);
                    date = d.getHours() + ":" + d.getMinutes() + ", " + d.toDateString();
                    var values = [[d, obj.location, obj.TeamOne, obj.TeamOneScore, obj.TeamTwo, obj.TeamTwoScore, obj.matchResult]];
                    fs.readFile('credentials.json', (err, content) => {
                        if (err) return console.log('Error loading client secret file:', err);
                        authorize(JSON.parse(content), (auth) => addMatch(auth, values));
                    });
                    message.delete();
                    return;
                } else {
                    message.channel.send(`cipher's don't match`);
                    return;
                }
            } else {
                message.channel.send(`teams not found`);
                return;
            }
        }
    } else if (message.member.roles.cache.has('734966449764040725')) {
        switch (args[0]) {
            case "reload":
                for (var x in teams) if (teams.hasOwnProperty(x)) delete teams[x];
                fs.readFile('credentials.json', (err, content) => {
                    if (err) return console.log('Error loading client secret file:', err);
                    authorize(JSON.parse(content), getTeams);
                });
                message.channel.send("teams reloaded");
                break;
            case "links":
                //this command will set the links in the ladder room embed
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
                break;

            case "updateRanking":
                if (message.author.id == '325912511859916800') {
                    fs.readFile('credentials.json', (err, content) => {
                        if (err) return console.log('Error loading client secret file:', err);
                        authorize(JSON.parse(content), getMatches);
                    });
                    message.channel.send(`Updated team rankings`);
                }
                break;

            case "manualAdd":
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
                    message.delete();
                    message.channel.send(`manually added match between ${teams[obj.TeamOne][1]} and ${teams[obj.TeamTwo][1]}`)
                }
                break;

        case "register":
                if (args.length < 3) {
                message.channel.send("ERROR:  Not enough arguments.  USAGE: !register TeamCode(3 characters) TeamName");
                break;
            };
            // confirm first argument is a 3 character code
            if (args[1].length > 3) {
                message.channel.send("ERROR: TeamCode must be 3 characters or less");
                break;
            };

            var teamCode = args[1].toUpperCase();
            var teamName = args.slice(2).join(" ");

            // make sure the 3 char code isn't in use
            if (teamCode in teams) {
                message.channel.send(`ERROR: ${teamCode} already exists`);
                break;
            }

            // add team to teams array
            teams[teamCode] = [teamCode, teamName, 0, 0, 0, defRating, 0, defRd, defVol];

            // send to google sheets
            var values = [];
            values.push(teams[teamCode]);
            fs.readFile('credentials.json', (err, content) => {
                if (err) return console.log('Error loading client secret file:', err);
                authorize(JSON.parse(content), (auth) => addTeam(auth, values));
            });
            message.channel.send(`${teamCode} - ${teamName} added to teams database`);
            break;

        case "registerRoster":
            
            var teamCode = (args[1] ? args[1].toUpperCase() : null);
            if (!args[1] || args.length < 3) {
                message.channel.send(`ERROR:  Not enough arguments.  USAGE: !rosterEdit TeamCode Roster`);
                break;
            } else if (!teams.hasOwnProperty(teamCode)) {
                message.channel.send(`ERROR:  ${teamCode} doesn't exist.`);
                console.log(teams.hasOwnProperty(teamCode));
                break;
            } else {
                teams[teamCode][9] = args.slice(2).join(" ")
                message.channel.send(`${teamCode}'s roster updated.`)

                var values = [];
                for (const x in teams) {
                    teams[x][2] = parseInt(teams[x][2]);
                    teams[x][3] = parseInt(teams[x][3]);
                    teams[x][4] = parseInt(teams[x][4]);
                    teams[x][6] = parseFloat(teams[x][6]);
                    teams[x][5] = parseFloat(teams[x][5]);
                    teams[x][7] = parseFloat(teams[x][7]);
                    teams[x][8] = parseFloat(teams[x][8]);

                    values.push(teams[x]);
                }

                fs.readFile('credentials.json', (err, content) => {
                    if (err) return console.log('Error loading client secret file:', err);
                    authorize(JSON.parse(content), (auth) => teamsUpdate(auth, values));
                });

                message.delete();
                break;
            }
 
        case "registerSecret":
        var teamCode = (args[1] ? args[1].toUpperCase() : null);
        if (!args[1] || args.length < 3) {
            message.channel.send(`ERROR: Not enough arguments. USAGE: !rosterEdit TeamCode Password`);
            break;
        } else if (!teams.hasOwnProperty(teamCode)) {
            message.channel.send(`ERROR: ${teamCode} doesn't exist.`);
            console.log(teams.hasOwnProperty(teamCode));
            break;
        } else {
            const plainText = args.slice(2).join(" ");
            const simpleCrypto = new SimpleCrypto(EncryptKey);
            const cipherText = simpleCrypto.encrypt(plainText);
            teams[teamCode][10] = cipherText
            message.channel.send(`${teamCode}'s secret password updated.`)

            var values = [];
            for (const x in teams) {
                teams[x][2] = parseInt(teams[x][2]);
                teams[x][3] = parseInt(teams[x][3]);
                teams[x][4] = parseInt(teams[x][4]);
                teams[x][6] = parseFloat(teams[x][6]);
                teams[x][5] = parseFloat(teams[x][5]);
                teams[x][7] = parseFloat(teams[x][7]);
                teams[x][8] = parseFloat(teams[x][8]);

                values.push(teams[x]);
            }

            fs.readFile('credentials.json', (err, content) => {
                if (err) return console.log('Error loading client secret file:', err);
                authorize(JSON.parse(content), (auth) => teamsUpdate(auth, values));
            });




            message.delete();
        }
        default:
            break;
}
}
})
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
 * CONFIG STUFF HERE [SPREADSHEETID]
 * might not need to hide the spreadsheet ID
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


    //update google sheets
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Sheets API.
        authorize(JSON.parse(content), (auth) => teamsUpdate(auth, values));
    });
    //clean up
    matches.splice(0, matches.length);
}

client.login(disctoken);