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

    url = "https://clashroyale.fandom.com/wiki/Lumberjack/Evolution"
    driver.get(url)
    print("Page loaded")

    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "unit-statistics-table")))
    print("Sleep done")

    source = driver.page_source
    print("Got page source")

    soup = BeautifulSoup(source, "html.parser")
    table = soup.find("table", class_="wikitable", id="unit-statistics-table")

    header_row = table.find("tr")

    headers = []
    for th in header_row.find_all("th"):
        headers.append(th.text.strip())

    row11 = {}

    for row in table.find("tbody").find_all("tr"):
        cells = row.find_all("td")
        if cells and cells[0].text == "11":
            for i in range(len(headers)):
                row11[headers[i]] = cells[i].text.strip()
            break

    print(row11)

except Exception as e:
    print(f"Error scraping {url}: {e}")

finally:
    driver.quit()