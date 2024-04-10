// This should be a database.
var games = {}
window.onload = function() {
  // For local development, run chrome with --allow-file-access-from-files
  fetch('bin/html5/bin/data/v2/titles.tsv')
  .then(r => r.text())
  .then(r => {
    for (var line of r.split('\n')) {
      var [gameId, gameName] = line.split('\t')
      games[gameId] = {'name': gameName}
    }
  })
  .then(r => loadImages())
}


function set(id, key, value) {
  var elem = document.getElementById(id)
  if (key == 'innerText') {
    elem.innerText = value
  } else if (key == 'style') {
    elem.style = value
  } else {
    elem.setAttribute(key, value)
  }
}

var styles = {
  'Hidden Gem': 'background: blue; color: white; font-weight: bold',
  'Similar tags': 'background: green; color: white; font-weight: bold',
  'Reverse match': 'background: purple; color: white; font-weight: bold',
  'Loose match': 'background: brown; color: white; font-weight: bold',
  'Selected': 'background: white; color: black; font-weight: bold',
}

function setImageCard(loc, gameId, recommender, note) {
  set(loc + '-cell', 'style', styles[recommender])
  set(loc + '-title', 'innerText', recommender)
  set(loc + '-title', 'href', 'https://store.steampowered.com/app/' + gameId)
  if (note != null) set(loc + '-note', 'innerText', note)
  set(loc + '-image', 'src', 'https://cdn.akamai.steamstatic.com/steam/apps/' + gameId + '/header.jpg')
}

function loadImages() {
  setImageCard('tl', '670750', 'Hidden Gem', '62%')
  setImageCard('tm', '243220', 'Hidden Gem', '62%')
  setImageCard('tr', '512790', 'Similar tags', '80%')
  setImageCard('mr', '258520', 'Similar tags', '65%')
  setImageCard('ml', '866440', 'Reverse match')
  setImageCard('bl', '383870', 'Reverse match')
  setImageCard('bm', '251110', 'Loose match')
  setImageCard('br', '624270', 'Loose match')
  setImageCard('mm', '210970', 'Selected')
  
  set('game-title', 'innerText', games['210970']['name'])
}