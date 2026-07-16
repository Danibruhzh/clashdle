from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
import time
import os

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
    "Ram",
    "Rider",
    "Decoy Goblin",
    "Runner",
    "Ghost",
    "General Gerry",
    "Turret",
    "Broken Cannon Cart",
    "Air Form",
    "Ground Form",
)

def get_card_info(url, retries: int, name: str):
    for attempt in range(retries + 1):
        try:
            driver.get(url)
            
            time.sleep(5)

            source = driver.page_source
            soup = BeautifulSoup(source, "html.parser")

            card_info = {}

            attrs = soup.find("table", class_="wikitable", id="unit-attributes-table")
            stats = soup.find("table", class_="wikitable", id="unit-statistics-table")

            # Get the attributes
            if attrs != None:
                attrs_header_row = attrs.find("tr")
                attr_row = attrs_header_row.find_next_sibling("tr").find_all("td")

                for index, th in enumerate(attrs_header_row.find_all("th")):
                    if th.text.strip() in ("Cost", "Target", "Type", "Rarity"):
                        card_info[th.text.strip()] = attr_row[index].text.strip()

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
                            if th == name + " Hitpoints" or th == "Max Hitpoints" or th == "Hitpoints":
                                card_info["Hitpoints"] = cells[index].text.strip()
                                continue

                            # Damage
                            if th == name + " Damage" or "Area Damage" in th:
                                card_info["Damage"] = cells[index].text.strip()
                                continue

                            # Stage Damage
                            if th == "Damage (Stage 3)":
                                card_info["Damage (Stage 3)"] = cells[index].text.strip()
                                continue
                            if th == "Damage (Stage 4)":
                                del card_info["Damage (Stage 3)"]
                                card_info["Damage (Stage 4)"] = cells[index].text.strip()
                                continue

                            # Damage per second
                            if th == name + " Damage per second" or th == name + " Damage Per Second" or th == " Damage per second" or th == " Damage Per Second":
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

    url = "https://clashroyale.fandom.com/wiki/Ice_Spirit"


    cards = get_card_info(url, 2, "Ice_Spirit") # 2 retries
    time.sleep(1)

    print(cards)

except Exception as e:
    print(f"Error scraping {url}: {e}")

finally:
    driver.quit()