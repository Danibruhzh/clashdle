from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
import time
import os
import re

os.environ['WDM_LOCAL'] = '1'

options = Options()
options.add_argument("--disable-blink-features=AutomationControlled")
options.add_experimental_option("excludeSwitches", ["enable-automation"])
options.add_experimental_option("useAutomationExtension", False)
options.add_argument(r"--user-data-dir=C:\Users\danie\chrome-selenium-profile")

url = None
driver = None

SPECIAL_DAMAGE_LABELS = (
    "Charge ",
    "Dash ",
    "Spawn Damage",
    "Death Damage",
    "Crown Tower ",
    "Jump",
    "Reflected ",
    "Lightning Link ",
    "Royal Rescue ",
    "Melee ",
    "Explosive Escape ",
    "Impact ",
    "Tornado ",
    "Bonus ",
    "Big Spark ",
    "Power Shot ",
    "Ice Blast ",
    "Bounce ",
    "Pulse ",
    "Recoil ",
    "Rage ",
    "Axe Smash ",
    "Landing ",
    "Combo ",
    "Zap ",
    "Rocket Launcher ",
)
CHECK_LABELS = (
    "Bush Goblin",
    "Bush ",
    "Ram",
    "Rider",
    "Doctor",
    "Monster",
    "Decoy Goblin",
    "Runner",
    "Ghost",
    "General Gerry",
    "Turret",
    "Broken Cannon Cart",
    "Air Form",
    "Ground Form",
    "Goblin Brawler"
)
REQUIRED_STATS = (
    "Cost",
    "Type",
    "Rarity",
    "Target",
    "Hitpoints",
    "Damage",
    "Damage Per Second",
)

def get_name_variants(name):
    variants = {name, ""}
    base = name.removeprefix("Evolution ").removeprefix("Hero ")
    variants.add(base)
    if "Evolution" in name:
        variants.add("Evolved " + base)
    return variants

def build_targets(variants, suffixes):
    return {f"{v} {suf}".strip() for v in variants for suf in suffixes}

def get_card_info(url, retries: int, name: str):
    for attempt in range(retries + 1):
        try:
            driver.get(url)
            
            #time.sleep(5)

            source = driver.page_source
            soup = BeautifulSoup(source, "html.parser")

            card_info = {}


            attrs_tables_all = soup.find_all("table", class_="wikitable", style=re.compile(r"width:\s*100%;\s*text-align:\s*center;"))
            titles_all = soup.find_all("h3", style=re.compile(r"display:\s*block;\s*text-align:\s*center;\s*color:\s*white;"))
            stats = soup.find("table", class_="wikitable", id="unit-statistics-table")

            #print(soup.find_all("table", class_="wikitable", style=re.compile(r"width:\s*100%;\s*text-align:\s*center;")))
            #print(len(attrs_tables))
            #print(titles)
            #print(titles_all)
            #print(len(titles_all))
            #print(len(attrs_tables_all))

            attrs_tables = []
            titles = []
            for index, table in enumerate(attrs_tables_all):
                print(table.find("th").text.strip())
                if table.find("th").text.strip() == "Level":
                    print("found")
                    break
                print("append")
                attrs_tables.append(table)
                titles.append(titles_all[index])

            print(titles)

            # once per card, before the row loop that contains this block
            name_variants = get_name_variants(name)
            print(name_variants)
            hitpoint_targets = build_targets(name_variants, ["Hitpoints"]) | {"Max Hitpoints"}
            print(hitpoint_targets)
            damage_targets = build_targets(name_variants, ["Damage"]) | {"Single Target Damage"}
            print(damage_targets)
            dps_targets = build_targets(name_variants, ["Damage per second", "Damage Per Second", "Damage per Second"])
            print(dps_targets)

            # Get the attributes
            i = 0
            for attrs in attrs_tables:
                attrs_header_row = attrs.find("tr")
                attr_row = attrs_header_row.find_next_sibling("tr").find_all("td")
                #print(attrs_header_row)
                for index, th in enumerate(attrs_header_row.find_all("th")):
                    label = th.text.strip()
                    if label in ("Cost", "Target", "Type", "Rarity"):
                        key = label
                        print(key)
                        while key in card_info:
                            print(i)
                            key = f"{titles[i].find("span").text.removesuffix("Attributes")}{label}"
                        card_info[key] = attr_row[index].text.strip()
                i += 1

            # Get the stats
            if stats != None:
                stats_header_row = stats.find("tr")
                stats_headers = []
                for th in stats_header_row.find_all("th"):
                    stats_headers.append(th.text.strip())

                for row in stats.find("tbody").find_all("tr"):
                    cells = row.find_all("td")
                    if cells and cells[0].text == "11":
                        special_damage_exact = None
                        special_damage_candidate = None
                        for index, th in enumerate(stats_headers[1:], start=1):

                            # Hitpoints
                            if th in hitpoint_targets:
                                card_info["Hitpoints"] = cells[index].text.strip()
                                continue

                            # Damage
                            if th in damage_targets or "Area Damage" in th:
                                card_info["Damage"] = cells[index].text.strip()
                                continue

                            # Stage Damage
                            if th == "Damage (Stage 3)":
                                card_info["Damage (Stage 3)"] = cells[index].text.strip()
                                continue
                            if th == "4 stage Damage":
                                del card_info["Damage (Stage 3)"]
                                card_info["Damage (Stage 4)"] = cells[index].text.strip()
                                continue

                            # Damage per second
                            if th in dps_targets:
                                card_info["Damage Per Second"] = cells[index].text.strip()
                                continue

                            # Shields
                            if th == "Shield Hitpoints":
                                card_info["Hitpoints"] = str(int(card_info["Hitpoints"].replace(",", "")) + int(cells[index].text.strip()))
                                continue

                            # Special Damage
                            match = next((x for x in SPECIAL_DAMAGE_LABELS if x in th), None)
                            if match:
                                if th.startswith(name + " ") and special_damage_exact is None:
                                    special_damage_exact = (th, cells[index].text.strip())
                                elif special_damage_candidate is None:
                                    special_damage_candidate = (th, cells[index].text.strip())
                                continue

                            # Check these later
                            pity = next((y for y in CHECK_LABELS if y in th), None)
                            if pity and ("lost per second" not in th and "lost per Second" not in th):
                                card_info[th] = cells[index].text.strip()

                        chosen = special_damage_exact or special_damage_candidate
                        if chosen:
                            card_info[f"Special Damage ({chosen[0]})"] = chosen[1]
                        else:
                            card_info["Special Damage"] = "N/A"

                        for stat in REQUIRED_STATS:
                            if stat not in card_info:
                                card_info[stat] = "N/A"

                        break

            return card_info
        except Exception as e:
            if attempt == retries:
                raise
            print(f"Retry {attempt + 1} for {url}: {e}")
            time.sleep(2)
    
try:
    driver = webdriver.Chrome(service=Service(r"C:\Users\danie\.wdm\drivers\chromedriver\win64\150.0.7871.115\chromedriver-win64\chromedriver.exe"), options=options)
    
    driver.execute_cdp_cmd("Network.enable", {})
    driver.execute_cdp_cmd("Network.setBlockedURLs", {"urls": [
        "*.doubleclick.net*",
        "*.googlesyndication.com*",
        "*.googletagmanager.com*",
        "*.googletagservices.com*",
        "*.amazon-adsystem.com*",
        "*.adnxs.com*",
        "*.ads.yahoo.com*",
        "*.moatads.com*",
        "*.scorecardresearch.com*",
        "*.quantserve.com*",
        "*.fandom.com/wikia.php*",
        "*.jpg",
        "*.jpeg",
        "*.png",
        "*.gif",
        "*.webp",
        "*.svg",
        "*.woff",
        "*.woff2",
        "*.mp4",
        "*.mp3"
    ]})
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": """
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            })
        """
    })
    
    print("Driver started")

    url = "https://clashroyale.fandom.com/wiki/Battle_Ram/Evolution"


    cards = get_card_info(url, 2, "Evolution Battle Ram") # 2 retries
    time.sleep(1)

    print(cards)

except Exception as e:
    print(f"Error scraping {url}: {e}")

finally:
    driver.quit()