# Brainstorming

1. mobilná aplikácia na pripomínanie pitného režimu (android flutter app**)**
    1. náročnosť = mierne 
    2. notifikácie, moderné grafické prvky
    3. pitný režim
    4. použivatela príde notifikácia, že by sa mal napiť, ked sa napije tak kliknutím na to upozornenie alebo kliknutím na apku, v apke flasu naplní vodou že kolko ml vypil.
2. dopĺnač osobných informácií do formulárov na základe “konta”
    1. náročnosť = mierne (overiť či sa to dá)
    2. zaujímavosť = 
    3. prínos = 
3. oinbvcas
    1. náročnosť = 
    2. zaujímavosť = 
    3. prínos

1. vytvor mi kompletný popis projektu mobilnej aplikácie vo fluttery, ktorá bude ako inventár. používatel odfotí vec, prídá názov, vyberie si typ popríde sa vytvorí nový typ, miesto kde to je schované ( tiež si môže vybrať z predefinovyných alebo sa vytvorí nové), stav a poznámky. uloží to do sqli databázy. bude tam vyhladávanie, podla typu, miesta alebo názvu, bude si mocť vybrať čo chce vyhladať, napríklad podla typu tak sa mu zobrazia všetky typy a on si klikne. ( aby sa nestalo to že používatel to zle napíše a nenájde mu nič.) typ môže byť elektronika, textil, a iné + to čo používateľ napíše. používateľ bude mocť editovať položky. chcem stránky kde sa vypíšu všetky položky, vyhladávanie, detail položky. admin konto ktoré bude mať kompletné CRUD na všetkým ( krásne oddelené na podstránky veci, typy, názvy a podobne.

## 1) Cieľ projektu

Vytvoriť mobilnú aplikáciu – **inventár osobných vecí**. Používateľ pridá položku tým, že:

- **odfotí vec**
- doplní **názov**
- vyberie alebo vytvorí **typ/kategóriu**
- vyberie alebo vytvorí **miesto uloženia**
- nastaví **stav**
- doplní **poznámky**
- uloží položku do **lokálnej SQLite databázy**

Aplikácia umožní:

- prehľad všetkých položiek
- detail položky
- editáciu a mazanie položiek
- vyhľadávanie bez chýb z preklepov: filtrovacie výbery cez zoznamy (typ, miesto) + textové vyhľadávanie názvu
- admin režim s oddeleným CRUD pre všetko (položky, typy, miesta, stavy, používatelia)

---

## 2) Používateľské roly a oprávnenia

### 2.1 Bežný používateľ (User)

- CRUD pre **položky** (create, read, update, delete) – len položky, ktoré patria jemu (ak sa rieši multi-user)
- môže **vytvárať nové typy a miesta** priamo pri pridávaní položky (alebo v samostatnej časti „Správa“ ak to povolíš)
- vyhľadávanie a filtrovanie položiek

### 2.2 Admin účet (Admin)

- kompletné CRUD **nad všetkým**
- samostatné admin obrazovky (oddelené podstránky):
    - Položky
    - Typy
    - Miesta
    - Stavy
    - Používatelia (voliteľné, ak chceš prihlásenie)
- admin môže upraviť/odstrániť typy a miesta (s pravidlami, čo sa stane s položkami – viď nižšie)

---

## 3) Funkčné požiadavky (čo aplikácia musí vedieť)

### 3.1 Položka inventára

Každá položka obsahuje:

- fotku (uloženú ako cesta k súboru v úložisku telefónu)
- názov (povinné)
- typ (povinné – výber z existujúcich + možnosť pridať nový)
- miesto (povinné – výber z existujúcich + možnosť pridať nové)
- stav (povinné – výber)
- poznámky (nepovinné)
- dátum vytvorenia + poslednej úpravy

### 3.2 Pridanie položky

- krok: **foto** (kamera, prípadne galéria – voliteľné)
- formulár: názov, typ, miesto, stav, poznámky
- pri type/mieste: možnosť **„+ Pridať nové“**
- validácie: názov nesmie byť prázdny; typ/miesto/stav musia byť zvolené; dĺžkové limity (napr. názov 1–80, poznámky do 500)

### 3.3 Prehľad položiek

- zoznam/karty s mini fotkou, názvom, typom, miestom, stavom
- triedenie: najnovšie, názov A–Z, typ, miesto (aspoň 2 režimy)
- klik → detail položky

### 3.4 Detail položky

- veľká fotka
- všetky údaje v prehľadnom layoute
- tlačidlá: **Upraviť**, **Zmazať**

### 3.5 Editácia položky

- rovnaký formulár ako pri pridávaní
- možnosť zmeniť fotku
- zmena typu/miesta/stavu cez výber zo zoznamu (bez preklepov)

### 3.6 Vyhľadávanie / filtrovanie (kľúčová časť)

Používateľ si vyberie režim vyhľadávania:

- **Podľa názvu** – textové vyhľadávanie (contains)
- **Podľa typu** – zobrazí sa zoznam typov → klik na typ → zobrazí položky
- **Podľa miesta** – zoznam miest → klik → položky
- (voliteľné) kombinované filtre: typ + miesto + stav + text

Dôležité: pri type/mieste sa nepíše text ručne, ale vyberá sa zo zoznamu → minimalizácia „nenájde nič lebo preklep“.

### 3.7 Admin správa

Admin má sekciu „Admin panel“:

- **Admin → Položky**: zoznam všetkých položiek + filter + detail + edit + delete
- **Admin → Typy**: zoznam typov + pridať/upraviť/zmazať
- **Admin → Miesta**: zoznam miest + pridať/upraviť/zmazať
- **Admin → Stavy**: správa stavov (pridať/upraviť/zmazať)
- **Admin → Používatelia** (voliteľné): správa účtov

---

## 4) Ne-funkčné požiadavky

- Aplikácia funguje **offline** (lokálna SQLite)
- Rýchle vyhľadávanie aj pri stovkách položiek (indexy v DB)
- Fotky sa neukladajú do DB ako blob (kvôli veľkosti), ale ako **path**
- UI prehľadné, jednoduché, konzistentné (Material 3)
- Ošetrené chyby: chýbajúce oprávnenia na kameru/úložisko, zmazaná fotka z disku, konflikty pri mazaní typov/miest

---

## 5) Návrh databázy (SQLite)

### 5.1 Tabuľky

**users** (voliteľné, ak chceš prihlásenie)

- id INTEGER PK
- username TEXT UNIQUE NOT NULL
- password_hash TEXT NOT NULL
- role TEXT NOT NULL // 'admin' | 'user'
- created_at TEXT NOT NULL

**types**

- id INTEGER PK
- name TEXT UNIQUE NOT NULL
- created_by_user_id INTEGER NULL (FK users.id) // ak chceš vedieť kto vytvoril
- created_at TEXT NOT NULL

**locations**

- id INTEGER PK
- name TEXT UNIQUE NOT NULL
- created_by_user_id INTEGER NULL
- created_at TEXT NOT NULL

**conditions** (stav)

- id INTEGER PK
- name TEXT UNIQUE NOT NULL // napr. Nové, Používané, Poškodené, Na opravu…
- created_at TEXT NOT NULL

**items**

- id INTEGER PK
- name TEXT NOT NULL
- photo_path TEXT NULL
- type_id INTEGER NOT NULL (FK types.id)
- location_id INTEGER NOT NULL (FK locations.id)
- condition_id INTEGER NOT NULL (FK conditions.id)
- notes TEXT NULL
- owner_user_id INTEGER NULL (FK users.id) // ak multi-user
- created_at TEXT NOT NULL
- updated_at TEXT NOT NULL

### 5.2 Indexy (kvôli výkonu)

- index na `items(name)`
- index na `items(type_id)`
- index na `items(location_id)`
- index na `items(condition_id)`
- (ak multi-user) index na `items(owner_user_id)`

### 5.3 Pravidlá mazania (dôležité)

Pri mazaní **typu / miesta / stavu**:

- buď zakázať zmazanie, ak je použitý (a zobraziť hlášku „Používa sa v X položkách“),
- alebo povoliť s tým, že admin musí vybrať „presunúť položky do iného typu/miesta/stavu“.

Odporúčanie: **zakázať pri použití**, je to najjednoduchšie a bezpečné.

---

## 6) Obrazovky a navigácia

### 6.1 Bežná časť aplikácie (User)

1. **Home / Zoznam položiek**
- AppBar: názov aplikácie + ikona vyhľadávania + (voliteľne) filter
- FloatingActionButton: „+“ pridaj položku
- ListView/GridView: karty položiek
1. **Vyhľadávanie**
- prepínač režimu: Názov / Typ / Miesto (príp. Stav)
- Názov: text field + výsledky
- Typ: zoznam typov + klik → položky v tomto type
- Miesto: zoznam miest + klik → položky v mieste
1. **Detail položky**
- obrázok (ak nie je, placeholder)
- názov, typ, miesto, stav, poznámky
- tlačidlá: Upraviť / Zmazať
1. **Pridať / Upraviť položku (Form)**
- foto sekcia: „Odfotiť“ + „Vybrať z galérie“ (voliteľné)
- názov: TextFormField
- typ: Dropdown + tlačidlo „Pridať nový typ“
- miesto: Dropdown + „Pridať nové miesto“
- stav: Dropdown
- poznámky: multiline
- uložiť

### 6.2 Admin časť (Admin panel)

1. **Admin Dashboard**
- dlaždice: Položky / Typy / Miesta / Stavy / Používatelia
1. **Admin → Položky**
- tabuľkový/zoznamový prehľad všetkých položiek
- filter: typ, miesto, stav, názov
- CRUD akcie
1. **Admin → Typy**
- zoznam typov
- pridať / upraviť / zmazať (s pravidlami o použití)
1. **Admin → Miesta**
- zoznam miest
- pridať / upraviť / zmazať
1. **Admin → Stavy**
- zoznam stavov
- pridať / upraviť / zmazať
1. **Admin → Používatelia** (ak implementuješ login)
- zoznam používateľov
- zmena roly, reset hesla, vytvoriť účet

---

## 7) UX detaily (aby to bolo „použiteľné“)

- **Typy**: preddefinované napr. `Elektronika`, `Textil`, `Iné` + používateľské
- **Miesta**: preddefinované napr. `Skrinka`, `Pivnica`, `Garáž`, `Šuplík`, `Krabica`, `Polica`
- Pri pridávaní nového typu/miesta:
    - okamžite sa pridá do DB
    - automaticky sa vyberie v aktuálnom formulári
    - zabrán duplicitám (case-insensitive porovnanie)
- Pri vyhľadávaní podľa typu/miesta:
    - zobraz najprv zoznam (s počtom položiek v zátvorke: „Elektronika (12)“)
- Mazanie položky:
    - potvrdenie dialógom
    - voliteľne zmazať aj fotku zo storage (alebo ponechať)

---

## 8) Technický návrh vo Flutteri

### 8.1 Odporúčané balíčky

- `sqflite` + `path_provider` (SQLite + cesta k DB)
- `image_picker` (foto z kamery/galérie)
- `path` (práca s cestami)
- (voliteľné) `flutter_secure_storage` (ak chceš lokálne uložiť session / token / rolu)
- (voliteľné) `crypto` (hash hesla, ak robíš login)
- stav manažment: `provider` alebo `riverpod` (ľahko udržíš filtre a zoznamy)

### 8.2 Architektúra (prehľadná a obhájiteľná)

Odporúčaná vrstvová štruktúra:

- `data/`
    - `db/` (DatabaseHelper, migrácie)
    - `repositories/` (ItemRepository, TypeRepository…)
    - `models/` (Item, Type, Location, Condition, User)
- `logic/`
    - `providers/` alebo `controllers/` (stav, filtre, načítanie)
- `ui/`
    - `screens/` (list, search, detail, form, admin…)
    - `widgets/` (item_card, dropdown_selector, image_picker_widget)

### 8.3 Tok dát

- UI zavolá Provider/Controller
- ten zavolá Repository
- repository číta/zapisuje SQLite
- výsledok sa vracia späť do UI a prekreslí sa zoznam

---

## 9) CRUD operácie – čo presne znamenajú v appke

### Položky (Items)

- Create: vytvoriť nový záznam v `items` + uložiť fotku do storage
- Read: list + detail (join s types/locations/conditions)
- Update: aktualizovať údaje + updated_at
- Delete: zmazať záznam (a voliteľne aj fotku)

### Typy / Miesta / Stavy

- Create: pridať názov (unikátny)
- Read: zoznam + počty použití
- Update: upraviť názov (ak neporuší unique)
- Delete: len ak nie je použitý (alebo s presunom)

---

## 10) SQL dopyty (logika vyhľadávania)

- **Zoznam položiek** (s joinom):
    - items JOIN types JOIN locations JOIN conditions, sort podľa nastavenia
- **Vyhľadávanie názvom**:
    - `WHERE items.name LIKE '%query%'`
- **Filtrovanie podľa typu**:
    - `WHERE items.type_id = ?`
- **Filtrovanie podľa miesta**:
    - `WHERE items.location_id = ?`
- **Počty položiek pre zoznam typov/miest**:
    - `SELECT type_id, COUNT(*) FROM items GROUP BY type_id`