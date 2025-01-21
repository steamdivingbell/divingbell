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
import requests

headers = {
  'User-Agent': 'SteamDivingBell/3.0 (https://github.com/jbzdarkid/divingbell; https://github.com/jbzdarkid/divingbell/issues)',
}

## Helper methods ##

def load_json(file):
  with open(file, 'r', encoding='utf-8') as f:
    return json.load(f)

def dump_json(data, file):
  with open(file, 'w+', encoding='utf-8') as f:
    json.dump(data, f, sort_keys=True, separators=(',', ':'))

def get(url):
  r = requests.get(url, timeout=20, headers=headers)
  r.raise_for_status()
  return r.json()

def between(string, before, after):
  start = string.index(before) + len(before)
  end = string.index(after, start)
  return string[start:end]

## Official APIs ##

def download_app_list():
  """https://steamapi.xpaw.me/#ISteamApps/GetAppList"""
  latest_games = {}
  app_list = get('https://api.steampowered.com/ISteamApps/GetAppList/v2')['applist']['apps']
  for game_data in app_list:
    latest_games[str(game_data['appid'])] = game_data['name']

  game_names = load_json('game_names.json')
  print('Added games: ', sorted(set(latest_games.keys()) - set(game_names.keys())))
  game_names |= latest_games # Dict update operator from python 3.9
  dump_json(game_names, 'game_names.json')

## Unofficial APIs ##

def download_tags():
  """https://github.com/Revadike/InternalSteamWebAPI/wiki/Get-Categories-By-Tag"""
  tag_data = get('https://steamcommunity.com/sale/ajaxgetcategoriesbytag')

  latest_tags = {}
  for tag_id, name in tag_data['rgTagNames'].items():
    latest_tags[tag_id] = {'id': tag_id, 'name': name}
  for tag_id, categories in tag_data['rgCategoriesByTag'].items():
    latest_tags[tag_id]['categories'] = categories

  tags = load_json('tags.json')
  tags |= latest_tags # Dict update operator from python 3.9
  dump_json(tags, 'tags.json')

def download_app_details(game_id):
  """https://github.com/Revadike/InternalSteamWebAPI/wiki/Get-App-Details"""
  app_details = get(f'https://store.steampowered.com/api/appdetails?appids={game_id}')[game_id]
  if not app_details['success']:
    deleted_games = load_json('deleted_games.json')
    deleted_games[game_id] = datetime.now().timestamp()
    dump_json(deleted_games, 'deleted_games.json')
    return False
  dump_json(app_details['data'], f'app_details/{game_id}.json')
  return True

def download_review_details(game_id):
  """https://github.com/Revadike/InternalSteamWebAPI/wiki/Get-App-Reviews"""
  app_reviews = get(f'https://store.steampowered.com/appreviews/{game_id}?json=1&filter=summary&language=all&purchase_type=all')

  reviews = load_json('reviews.json')
  reviews[game_id] = app_reviews['query_summary']
  dump_json(reviews, 'reviews.json')

## HTML scraping ##

def download_similar_games(game_id):
  r = requests.get(f'https://store.steampowered.com/recommended/morelike/app/{game_id}', timeout=20, headers=headers)
  basic_recommendations = between(r.text, '<h1 class="morelike_section_divider">Default</h1>', '<h2 class="morelike_section_divider">Upcoming Releases</h2>')

  # There's more than 9 recommended games in the code, idk use them all
  similar_to_this_game = []
  for line in basic_recommendations.split('\n'):
    if 'data-ds-appid' in line:
      similar_to_this_game.append(between(line, 'data-ds-appid="', '"'))

  similar_games = load_json('similar_games.json')
  similar_games[game_id] = similar_to_this_game
  dump_json(similar_games, 'similar_games.json')

if __name__ == '__main__':
  # Refresh static data only once per hour, when this script runs
  download_app_list()
  download_tags()

  all_games = set(load_json('game_names.json').keys())
  deleted_games = set(load_json('deleted_games.json').keys())
  fetched_games = set([path.name for path in Path('app_details').iterdir()])
  unfetched_games = all_games - fetched_games - deleted_games
  print(f'Fetched {len(fetched_games)} of {len(all_games)} ({len(deleted_games)} deleted)')

  # Randomly refresh until 1 minute before the hour to allow for some processing time (git push, etc)
  end_time = datetime.now().replace(minute=0, second=0) + timedelta(minutes=59)
  while datetime.now() < end_time:
    # For now, only sample from unfetched games.
    game_id = random.choice(list(unfetched_games))
    unfetched_games.remove(game_id)

    print(f'Downloading data for game {game_id}')
    if download_app_details(game_id):
      download_similar_games(game_id)
      download_review_details(game_id)

    # The throttling limit for app details is 40 calls per minute, this is a reasonably generous sleep.
    sleep(5)
