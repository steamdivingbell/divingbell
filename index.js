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
  
  set('open-web', 'href', 'https://store.steampowered.com/app/' + '210970' + '?utm_campaign=divingbell')
  set('open-app', 'href', 'steam://store/' + '210970')

  fetch('bin/html5/bin/data/v2/app_details/210970.txt')
  .then(r => r.json())
  .then(r => r[210970].data)
  .then(r => {
    set('short-description', 'innerText', r.short_description)
    set('price', 'innerText', r.price_overview.final_formatted)
    set('genres', 'innerText', r.genres.map(g => g.description).join(', '))
    var platforms = []
    if (r.platforms.windows) platforms.push('Windows')
    if (r.platforms.mac)     platforms.push('Mac')
    if (r.platforms.linux)   platforms.push('Linux')
    set('platforms', 'innerText', platforms.join(', '))
    set('categories', 'innerText', r.categories.map(c => c.description).join(', '))
    set('video', 'src', r.movies[0].webm.max)
    set('photo-1', 'src', r.screenshots[0].path_full)
    set('photo-2', 'src', r.screenshots[1].path_full)
    set('photo-3', 'src', r.screenshots[2].path_full)
  })

  // Sigh. I'm pretty sure this shouldn't be a separate database, so I'm keeping it inline (although I'm sure it's a perf loss)
  fetch('bin/html5/bin/data/v2/reviews/raw.tsv')
  .then(r => r.text())
  .then(r => {
    for (var line of r.split('\n')) {
      var [gameId, positive, total] = line.split('\t')
      if (gameId == '210970') {
        set('rating', 'innerText', ratingText(positive, total))
        return
      }
    }
  })
  
  // Tags are here but I'm lazy:
  // 1718 bin/html5/bin/data/v2/tags/all.tsv:1606:210970     45,123,6,57,33,172,41,97,34,29,262,304,141,144,173,185,44,240,42,65
}

function ratingText(positive, total) {
  var perc = positive / total
  
  // Rating names according to https://reddit.com/r/Steam/comments/ivz45n/
  var ratingNames = []
  if (total < 50)       ratingNames = [[0.80, 'Positive'],      [0.70, 'Mostly Positive'], [0.40, 'Mixed'], [0.20, 'Mostly Negative'], [0.00, 'Negative']]
  else if (total < 500) ratingNames = [[0.80, 'Very Positive'], [0.70, 'Mostly Positive'], [0.40, 'Mixed'], [0.20, 'Mostly Negative'], [0.00, 'Very Negative']]
  else                  ratingNames = [[0.95, 'Overwhelmingly Positive'], [0.80, 'Very Positive'], [0.70, 'Mostly Positive'], [0.40, 'Mixed'], [0.20, 'Mostly Negative'], [0.00, 'Overwhelmingly Negative']]
  var ratingName = ratingNames.find(x => x[0] < perc)[1]
  
  return `${ratingName} (${Math.trunc(100 * perc)}% ---- ${total} ratings)`
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