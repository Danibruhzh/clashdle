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
    
    print("Driver started")
    time.sleep(2)

    url = "https://clashroyale.fandom.com/wiki/Inferno_Dragon/Evolution"
    driver.get(url)
    print("Page loaded")

    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "unit-statistics-table")))
    print("Sleep done")

    source = driver.page_source
    print("Got page source")

    soup = BeautifulSoup(source, "html.parser")

    card = {}

    attrs = soup.find("table", class_="wikitable", id="unit-attributes-table")
    stats = soup.find("table", class_="wikitable", id="unit-statistics-table")

    # Get the attributes
    attrs_header_row = attrs.find("tr")
    attr_row = attrs_header_row.find_next_sibling("tr").find_all("td")

    for index, th in enumerate(attrs_header_row.find_all("th")):
        if th.text.strip() in ("Cost", "Target", "Type", "Rarity"):
            card[th.text.strip()] = attr_row[index].text.strip()

    # Get the stats
    stats_header_row = stats.find("tr")
    stats_headers = []
    for th in stats_header_row.find_all("th"):
        stats_headers.append(th.text.strip())

    for row in stats.find("tbody").find_all("tr"):
        cells = row.find_all("td")
        if cells and cells[0].text == "11":
            for index, th in enumerate(stats_headers[1:], start=1):
                card[th] = cells[index].text.strip()
            break

    print(card)

except Exception as e:
    print(f"Error scraping {url}: {e}")

finally:
    driver.quit()