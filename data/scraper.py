"""
This python script downloads all of the data we need to run steam diving bell.
Some of it comes from documented web APIs, some from undocumented APIs, and a small amount of data is from raw HTML scraping.
All of this is automated to allow the diving bell code to be automatically updated as new games come out, and game reviews/tags change.
"""
from datetime import datetime, timedelta
from pathlib import Path
from time import sleep
import json
import random
import sys

import bs4
import requests


headers = {
  'User-Agent': 'SteamDivingBell/3.0 (https://github.com/jbzdarkid/divingbell; https://github.com/jbzdarkid/divingbell/issues)',
}

## Helper methods ##

def load_json(file):
  file = Path(file)
  with file.open('r', encoding='utf-8') as f:
    contents = f.read()
    prefix = f'window.{file.stem} = '
    if contents.startswith(prefix):
      contents = contents[len(prefix):]
    return json.loads(contents)

def dump_js(data, file):
  file = Path(file)
  with file.open('w+', encoding='utf-8') as f:
    # Custom serialization which puts each top-level on its own line
    keys = [int(key) for key in data.keys()] # TODO: Assumed dict with integer keys? Is this OK?
    keys.sort()
    f.write(f'window.{file.stem} = {{\n')
    for key in keys:
      f.write(f'\t"{key}":')
      json.dump(data[str(key)], f, sort_keys=True, separators=(',', ':'))
      f.write(',\n' if key != keys[-1] else '\n') # No trailing commas allowed in JSON
    f.write('}')

def dump_json(data, file):
  file = Path(file)
  with file.open('w+', encoding='utf-8') as f:
    json.dump(data, f, sort_keys=True, separators=(',', ':'))

def get(url):
  r = requests.get(url, timeout=20, headers=headers)
  r.raise_for_status()
  return r.json()

def get_soup(url):
  r = requests.get(url, timeout=20, headers=headers)
  r.raise_for_status()
  return bs4.BeautifulSoup(r.text, 'html.parser')

## Official APIs ##

def download_app_list():
  """https://steamapi.xpaw.me/#ISteamApps/GetAppList"""
  latest_games = {}
  app_list = get('https://api.steampowered.com/ISteamApps/GetAppList/v2')['applist']['apps']
  for game_data in app_list:
    latest_games[str(game_data['appid'])] = game_data['name'].strip()

  game_names = load_json('game_names.js')
  print('Added games: ', sorted(set(latest_games.keys()) - set(game_names.keys())))
  game_names |= latest_games # Dict update operator from python 3.9
  dump_js(game_names, 'game_names.js')

## Unofficial APIs ##

tag_name_to_id = {}
def download_tags():
  """https://github.com/Revadike/InternalSteamWebAPI/wiki/Get-Categories-By-Tag"""
  tag_data = get('https://steamcommunity.com/sale/ajaxgetcategoriesbytag')

  latest_tags = {}
  for tag_id, name in tag_data['rgTagNames'].items():
    name = name.strip()
    latest_tags[tag_id] = {'name': name}
    global tag_name_to_id
    tag_name_to_id[name] = tag_id # Used by download_app_tags
  for tag_id, categories in tag_data['rgCategoriesByTag'].items():
    latest_tags[tag_id]['categories'] = categories

  tags = load_json('tags.js')
  tags |= latest_tags # Dict update operator from python 3.9
  dump_js(tags, 'tags.js')

def download_app_details(game_id):
  """https://github.com/Revadike/InternalSteamWebAPI/wiki/Get-App-Details"""
  try:
    app_details = get(f'https://store.steampowered.com/api/appdetails?appids={game_id}&cc=en')[game_id]
    # Some games redirect to other games -- if the game we get back is not the one we ask for, we should not list it in our system.
    if app_details['success'] and str(app_details['data']['steam_appid']) == game_id:
      dump_json(app_details['data'], f'app_details/{game_id}.json')
      return True
  except requests.exceptions.JSONDecodeError:
    pass # Treat invalid JSON as an invalid game

  # If the game was invalid, make a note of it in deleted_games so that we don't try to fetch it again.
  deleted_games = load_json('deleted_games.js')
  deleted_games[game_id] = datetime.now().timestamp()
  dump_js(deleted_games, 'deleted_games.js')
  return False

def download_review_details(game_id):
  """https://github.com/Revadike/InternalSteamWebAPI/wiki/Get-App-Reviews"""
  app_reviews = get(f'https://store.steampowered.com/appreviews/{game_id}?json=1&filter=summary&language=all&purchase_type=all')

  reviews = load_json('reviews.js')
  reviews[game_id] = app_reviews['query_summary']
  dump_js(reviews, 'reviews.js')

## HTML scraping ##

def download_similar_games(game_id):
  soup = get_soup(f'https://store.steampowered.com/recommended/morelike/app/{game_id}')

  # The graphics only show 9 recommendations, but the raw code has more; we take them all.
  similar_to_this_game = []
  for item in soup.find_all('div', {'class': 'similar_grid_item'}):
    similar_to_this_game.append(item.find('a', {'class': 'similar_grid_capsule'}).get('data-ds-appid'))

  similar_games = load_json('similar_games.js')
  similar_games[game_id] = similar_to_this_game
  dump_js(similar_games, 'similar_games.js')

def download_app_tags(game_id):
  soup = get_soup(f'https://store.steampowered.com/app/{game_id}')
  
  tags_for_this_game = []
  soup.find('div', {'class': 'popular_tags'})
  for item in soup.find_all('a', {'class': 'app_tag'}):
    # These tag IDs are in english; convert them before saving
    global tag_name_to_id
    tag_name = item.contents[0].strip()
    tags_for_this_game.append(tag_name_to_id[tag_name])
    
  game_tags = load_json('game_tags.js')
  game_tags[game_id] = tags_for_this_game
  dump_js(game_tags, 'game_tags.js')

def refresh_game(game_id):
  print(f'Downloading data for game {game_id}')
  try:
    if download_app_details(game_id):
      download_app_tags(game_id)
      download_similar_games(game_id)
      download_review_details(game_id)
  except requests.exceptions.RequestException:
    pass # Any kind of network error should be considered transient -- skip this game and we'll come back later.

  # The throttling limit for app details is 40 calls per minute, so this is a reasonably generous sleep.
  sleep(5)

if __name__ == '__main__':
  if len(sys.argv) > 0:
    for game in sys.argv:
      refresh_game(game)
    exit()

  # The job should run until 2 minutes before the next job, to allow for some processing time (git push, etc)
  end_time = datetime.now()
  while end_time.minute != 40:
    end_time += timedelta(minutes=1)

  # Refresh static data only once per hour, when this script runs
  download_app_list()
  download_tags()

  all_games = set(load_json('game_names.js').keys())
  deleted_games = set(load_json('deleted_games.js').keys())
  fetched_games = set((path.stem for path in Path('app_details').glob('*.json')))
  unfetched_games = all_games - fetched_games - deleted_games

  print(f'Fetched {len(fetched_games)} of {len(all_games)} ({len(deleted_games)} deleted)')

  # Start with refreshing unfetched games
  for game in unfetched_games:
    refresh_game(game)
    if datetime.now() >= end_time:
      exit()

  # Then, refresh games in order from where we left off
  ordered_games = sorted(list(all_games))
  with Path('last_fetched.txt').open('r') as f:
    last_fetched = f.read()
    index = ordered_games.find(last_fetched)

  while datetime.now() < end_time:
    if index >= len(ordered_games):
      index = 0 # If we get through all the games, restart from the beginning

    game = ordered_games[index]
    with Path('last_fetched.txt').open('w') as f:
      f.write(game)

    if game in deleted_games: # If a game is deleted, it cannot be un-deleted (I think)
      continue
    if game in unfetched_games: # We already fetched these above
      continue

    refresh_game(game)
