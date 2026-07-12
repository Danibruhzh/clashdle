from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
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

    cards_url = "https://clashroyale.fandom.com/wiki/Cards"
    driver.get(cards_url)
    print("Page loaded")

    source = driver.page_source
    print("Got page source")

    soup = BeautifulSoup(source, "html.parser")

    # Get the links for all the cards
    links = {}

    for i in range(1, 7):
        cards = soup.find("table", id=f"tpt-{i}").find("tbody").find_all("tr")
        for card in cards:
            link = card.find("a")
            links[link.text] = link["href"]

    # Get the links for all the Evos

    time.sleep(3)
    evos_url = "https://clashroyale.fandom.com/wiki/Card_Evolution"
    driver.get(evos_url)
    print("Page loaded")

    # Uncomment this if the CAPTCHA appears again
    # time.sleep(5)

    source = driver.page_source
    print("Got page source")

    soup = BeautifulSoup(source, "html.parser")

    evos = soup.find("table", class_="fandom-table").find("tbody").find_all("tr")
    print("done)")
    for evo in evos[1:]:
        link = evo.find("a")
        links["Evolution " + link.text] = link["href"]


    # Get all the links for the Heroes

    time.sleep(3)
    heroes_url = "https://clashroyale.fandom.com/wiki/Heroes"
    driver.get(heroes_url)
    print("Page loaded")

    # Uncomment this if the CAPTCHA appears again
    # time.sleep(5)

    source = driver.page_source
    print("Got page source")

    soup = BeautifulSoup(source, "html.parser")

    heroes = soup.find("table", class_="fandom-table").find("tbody").find_all("tr")
    print("done)")
    for hero in heroes[1:]:
        link = hero.find("a")
        links["Hero " + link.text] = link["href"]

    print(links)

    # card = {}

    # attrs = soup.find("table", class_="wikitable", id="unit-attributes-table")
    # stats = soup.find("table", class_="wikitable", id="unit-statistics-table")

    # # Get the attributes
    # attrs_header_row = attrs.find("tr")
    # attr_row = attrs_header_row.find_next_sibling("tr").find_all("td")

    # for index, th in enumerate(attrs_header_row.find_all("th")):
    #     if th.text.strip() in ("Cost", "Target", "Type", "Rarity"):
    #         card[th.text.strip()] = attr_row[index].text.strip()

    # # Get the stats
    # stats_header_row = stats.find("tr")
    # stats_headers = []
    # for th in stats_header_row.find_all("th"):
    #     stats_headers.append(th.text.strip())

    # for row in stats.find("tbody").find_all("tr"):
    #     cells = row.find_all("td")
    #     if cells and cells[0].text == "11":
    #         for index, th in enumerate(stats_headers[1:], start=1):
    #             card[th] = cells[index].text.strip()
    #         break

    # print(card)

except Exception as e:
    print(f"Error scraping {url}: {e}")

finally:
    driver.quit()