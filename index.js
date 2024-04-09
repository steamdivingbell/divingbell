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
  } else {
    elem.setAttribute(key, value)
  }
}

function setImageCard(loc, gameId) {
  if (games[gameId]) set(loc + '-title', 'innerText', games[gameId]['name'])
  set(loc + '-title', 'href', 'https://store.steampowered.com/app/' + gameId)
  set(loc + '-image', 'src', 'https://cdn.akamai.steamstatic.com/steam/apps/' + gameId + '/header.jpg')
}

    
function loadImages() {
  setImageCard('tl', '670750')
  setImageCard('tm', '243220')
  setImageCard('tr', '512790')
  setImageCard('ml', '866440')
  setImageCard('mm', '210970')
  setImageCard('mr', '258520')
  setImageCard('bl', '383870')
  setImageCard('bm', '251110')
  setImageCard('br', '624270')
}