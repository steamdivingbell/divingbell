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
  .then(r => setupButtons())
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
  'Hidden Gem': 'background: deepskyblue; color: white; font-weight: bold; font-size: 20px',
  'Similar tags': 'background: darkgreen; color: white; font-weight: bold; font-size: 20px',
  'Reverse match': 'background: darkmagenta; color: white; font-weight: bold; font-size: 20px',
  'Loose match': 'background: sienna; color: white; font-weight: bold; font-size: 20px',
  'Selected': 'background: white; color: black; font-weight: bold; font-size: 20px',
}

function setImageCard(loc, gameId, recommender, note) {
  set(loc + '-cell', 'style', styles[recommender])
  set(loc + '-title', 'innerText', recommender)
  set(loc + '-title', 'href', 'https://store.steampowered.com/app/' + gameId) // wait what?
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
  
  // Consider: https://store.steampowered.com/widget/210970
  // Consider: steam://store/210970 ("Open in steam")
  
  set('open-web', 'href', 'https://store.steampowered.com/app/' + '210970' + '?utm_campaign=divingbell')
  set('open-app', 'href', 'steam://store/' + '210970')

  fetch('bin/html5/bin/data/v2/app_details/210970.txt')
  .then(r => r.json())
  .then(r => r[210970].data)
  .then(r => {
    set('short-description', 'innerText', r.short_description)
    set('price', 'innerText', r.price_overview.final_formatted)
    // description += '<br><strong>Tags:</strong>'
    // description += '<br><strong>Genres:</strong>'
    // description += '<br><strong>Platforms:</strong>'
    // description += '<br><strong>Categories:</strong>  Single-player, Steam Achievements, Captions available, Partial Controller Support, Steam Cloud
    // set('rating', wtf where does this information come from)
    set('video', 'src', r.movies[0].webm.max)
    set('photo-1', 'src', r.screenshots[0].path_full)
    set('photo-2', 'src', r.screenshots[1].path_full)
    set('photo-3', 'src', r.screenshots[2].path_full)
  })
}

function setupButtons() {
  document.getElementById('gems').onpointerdown = function() {
    if (this.className === 'toggle') {
      this.className = 'toggle-off'
    } else {
      this.className = 'toggle'
    }
  }

  document.getElementById('tags').onpointerdown = function() {
    if (this.className === 'toggle') {
      this.className = 'toggle-off'
    } else {
      this.className = 'toggle'
    }
  }

  document.getElementById('loose').onpointerdown = function() {
    if (this.className === 'toggle') {
      this.className = 'toggle-off'
    } else {
      this.className = 'toggle'
    }
  }
  
  document.getElementById('reverse').onpointerdown = function() {
    if (this.className === 'toggle') {
      this.className = 'toggle-off'
    } else {
      this.className = 'toggle'
    }
  }
}